# Andi Lin — Photography

A quiet, English-language photography portfolio with real static pages for each work, a ten-photograph series, an About page, and email contact.

Website: https://zainnn24.github.io/Andi-s_Personal_Photography_Website/

## Run locally

Use Node.js 22 or later (developed with Node 22.21.0). There are no npm dependencies and no install step.

```sh
npm run build
npm run validate
npm run preview
```

Open the **Local** URL printed by the preview server. Stop it with Ctrl+C.

## Edit content

- `content/site.json`: biography, contact email, education, selected recognition, category labels, and canonical hosting configuration.
- `content/works.json`: titles, descriptions, recognition attached to each work, photographs, and sequencing.
- `src/style.css`: layout and typography.
- `src/site.js`: progressively enhanced category filters and image viewer.

`order` controls the work navigation sequence and the More Work order. `featuredOrder` controls the large Selected Work sequence. Set `featured` to `true` only for a work with verified recognition. The featured and More Work groups are disjoint.

One work can be a `single` photograph or a `series`. Keep a series in one object, list its photographs in sequence, and set `coverImageId` to one of its image IDs. IDs, slugs, photo IDs, and order values must be unique. `primaryCategory` must match one of the centrally defined categories.

For an unnamed photograph, use `Untitled` with a short visible-subject label in parentheses. Do not infer locations, dates, clients, or artist intentions. `captureYear`, if later supplied, is independent of an award's `year`.

## Add a photograph

Keep your original outside this public repository. Install Pillow locally only when preparing new photographs:

```sh
python -m pip install Pillow
python scripts/prepare-image.py "/path/to/original.jpg" new-work new-work-01
```

The helper creates JPEG and WebP derivatives at up to 480, 960, 1600, and 2400 pixels wide, without enlarging the original. It respects orientation, converts embedded profiles to sRGB, and strips location/device metadata. It prints an image object to paste into `content/works.json`; fill in an accurate English `alt`, an `order`, and an optional `caption`. Add a work object using an existing work as a model.

The input format must be supported by Pillow. For HEIC, register `pillow_heif` before calling the helper, or export a faithful JPEG locally first. Do not crop, recolor, or replace an awarded frame with a nearby exposure.

Run `npm run build` and `npm run validate` after edits. The build publishes only referenced web derivatives, so removing a work also removes its photographs from the deployed site on the next build.

## Deploy

Push changes to `main`. The **Deploy photography portfolio** workflow builds and validates the site, uploads only `dist/`, and deploys it to GitHub Pages. It can also be started manually from the repository's Actions tab. In repository Settings → Pages, the source must be **GitHub Actions**.

The workflow derives `BASE_PATH` and `SITE_ORIGIN` from GitHub Pages metadata. Local defaults live in `content/site.json`. To test root hosting or a different project path, set `BASE_PATH` for all three commands (build, validate, preview).

PowerShell example:

```powershell
$env:BASE_PATH = '/portfolio'
npm run build
npm run validate
npm run preview
# After stopping the server:
Remove-Item Env:BASE_PATH
```

Real `index.html` files are generated for `/about/` and every `/work/<slug>/`. Refresh and direct links work without a client-side router. Core photographs, captions, biography, and navigation remain available with JavaScript disabled.

## Review and privacy

Original masters, CVs, PDFs, extracted text, comparison images, curation notes, and local browser screenshots stay in the ignored `.local/` directory or outside this repository. They are not part of the public source or the website. Only selected web derivatives and public content are committed.

The initial contact address is `y.lin-57@student.tudelft.nl`; change `email` in `content/site.json` to update it everywhere.

The code is a static portfolio implementation. All photographs and written artwork materials remain copyright Andi Lin. No license to reuse the photographs is granted.
