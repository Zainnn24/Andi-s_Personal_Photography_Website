"""Create faithful, metadata-free sRGB derivatives. Requires Pillow.

python scripts/prepare-image.py /path/to/photo.jpg work-slug image-id
Writes web assets and prints an image object to add to content/works.json.
"""
import argparse
import io
import json
from pathlib import Path
from PIL import Image, ImageOps, ImageCms

def prepare(source, slug, image_id):
    for value in (slug, image_id):
        if not value or any(c not in "abcdefghijklmnopqrstuvwxyz0123456789-" for c in value):
            raise ValueError("Use lowercase letters, numbers and hyphens for IDs.")
    photo = ImageOps.exif_transpose(Image.open(source))
    profile = photo.info.get("icc_profile")
    if profile:
        photo = ImageCms.profileToProfile(
            photo, ImageCms.ImageCmsProfile(io.BytesIO(profile)),
            ImageCms.createProfile("sRGB"), outputMode="RGB")
    else:
        photo = photo.convert("RGB")
    folder = Path("public/images") / slug
    folder.mkdir(parents=True, exist_ok=True)
    widths = sorted({min(w, photo.width) for w in (480, 960, 1600, 2400)})
    variants = []
    for width in widths:
        height = round(photo.height * width / photo.width)
        resized = photo.resize((width, height), Image.Resampling.LANCZOS)
        # Copy pixels into a fresh image so EXIF, GPS, XMP, and device metadata cannot carry over.
        clean = Image.frombytes("RGB", resized.size, resized.tobytes())
        stem = f"{image_id}-{width}"
        clean.save(folder / (stem + ".jpg"), quality=86, subsampling=0, optimize=True)
        clean.save(folder / (stem + ".webp"), quality=86, method=6)
        variants.append({
            "width": width, "height": height,
            "jpeg": f"images/{slug}/{stem}.jpg",
            "webp": f"images/{slug}/{stem}.webp",
        })
    largest = variants[-1]
    return {
        "id": image_id, "src": largest["jpeg"],
        "width": largest["width"], "height": largest["height"],
        "alt": "", "caption": "", "variants": variants,
    }

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("slug")
    parser.add_argument("image_id")
    args = parser.parse_args()
    print(json.dumps(prepare(args.source, args.slug, args.image_id), indent=2))
