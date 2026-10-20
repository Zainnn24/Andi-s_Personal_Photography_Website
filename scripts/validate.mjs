import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { root, site, works, featured, more, basePath, origin, canonical } from './config.mjs';

const unique = (values, label) => assert.equal(new Set(values).size, values.length, `Duplicate ${label}`);
const fail = (condition, message) => assert.ok(condition, message);
const allowedId = value => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
function jpegSize(bytes) {
  let offset = 2;
  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) throw new Error('Invalid JPEG');
    const marker = bytes[offset + 1];
    const length = bytes.readUInt16BE(offset + 2);
    fail(marker !== 0xe1, 'Public JPEG contains EXIF or XMP metadata');
    if ([0xc0, 0xc1, 0xc2].includes(marker)) {
      return { height: bytes.readUInt16BE(offset + 5), width: bytes.readUInt16BE(offset + 7) };
    }
    offset += length + 2;
  }
  throw new Error('JPEG dimensions not found');
}
export function validateData() {
  fail(site.name === 'Andi Lin', 'Unexpected public identity');
  fail(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(site.email), 'Invalid email');
  fail(works.length > 0 && featured.length > 0, 'Missing works');
  unique(works.map(w => w.id), 'work IDs');
  unique(works.map(w => w.slug), 'slugs');
  unique(works.map(w => w.order), 'work order');
  unique(featured.map(w => w.featuredOrder), 'feature order');
  unique([...featured, ...more].map(w => w.id), 'homepage cards');
  unique(works.flatMap(w => w.images.map(i => i.id)), 'image IDs');
  const photoHashes = [];
  for (const work of works) {
    fail(allowedId(work.id) && allowedId(work.slug), 'Invalid work ID or slug');
    fail(work.title?.trim(), 'Empty title');
    fail(['single', 'series'].includes(work.kind), 'Unknown work kind');
    fail(Object.hasOwn(site.categories, work.primaryCategory), 'Unknown category');
    fail(Number.isInteger(work.order) && work.order > 0, 'Invalid order');
    fail(work.images.length >= (work.kind === 'single' ? 1 : 2), 'Wrong image count');
    if (work.kind === 'single') fail(work.images.length === 1, 'Single work has multiple images');
    fail(work.images.some(i => i.id === work.coverImageId), 'Cover is not a series member');
    if (work.featured) fail(work.awards.length > 0, 'Featured work lacks recognition');
    for (const award of work.awards) {
      fail(award.organization && award.distinction && Number.isInteger(award.year), 'Invalid award');
      fail(award.scope === work.kind, 'Award scope does not match work');
      if (award.url) fail(new URL(award.url).protocol === 'https:', 'Non-HTTPS award URL');
    }
    unique(work.images.map(i => i.order), 'image sequence');
    for (const image of work.images) {
      fail(allowedId(image.id) && image.alt?.trim(), 'Invalid image ID or missing alt');
      fail(image.width > 0 && image.height > 0, 'Invalid dimensions');
      fail(image.variants.length > 0, 'Missing responsive images');
      fail(image.src === image.variants.at(-1).jpeg, 'Full image must use largest variant');
      unique(image.variants.map(v => v.width), 'image widths');
      let lastWidth = 0;
      for (const variant of image.variants) {
        fail(variant.width > lastWidth && variant.width <= image.width, 'Variants must increase without upscaling');
        lastWidth = variant.width;
        fail(Math.abs(variant.height - image.height * variant.width / image.width) <= 1.5, 'Image ratio changed');
        for (const format of ['jpeg', 'webp']) {
          const path = variant[format];
          fail(/^images\/[a-z0-9-]+\/[a-z0-9-]+\.(jpg|webp)$/.test(path), 'Invalid image path');
          fail(existsSync(resolve(root, 'public', path)), `Missing asset ${path}`);
        }
        const bytes = readFileSync(resolve(root, 'public', variant.jpeg));
        const dimensions = jpegSize(bytes);
        assert.deepEqual(dimensions, { width: variant.width, height: variant.height }, `Wrong dimensions: ${variant.jpeg}`);
      }
      photoHashes.push(createHash('sha256').update(readFileSync(resolve(root, 'public', image.src))).digest('hex'));
    }
  }
  unique(photoHashes, 'photograph content');
}
function walk(path) {
  return readdirSync(path, { withFileTypes: true }).flatMap(entry => {
    fail(!entry.isSymbolicLink(), 'Symlinks are not allowed in the build');
    const full = resolve(path, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}
export function validateBuild() {
  const dist = resolve(root, 'dist');
  const files = walk(dist);
  const htmls = files.filter(file => file.endsWith('.html'));
  fail(htmls.length === works.length + 3, 'Missing or extra generated pages');
  for (const file of files) {
    const name = relative(dist, file).replaceAll('\\', '/');
    fail(/(?:\.(?:html|css|js|jpg|webp|svg|xml|txt)|^\.nojekyll)$/.test(name), `Unexpected public file: ${name}`);
  }
  for (const file of htmls) {
    const html = readFileSync(file, 'utf8');
    const path = relative(dist, file).replaceAll('\\', '/').replace(/index\.html$/, '');
    fail(html.includes('lang="en"') && html.includes('<title>'), 'Missing language or title');
    fail(!/David Lin|TBD|TODO|localhost|sourceFilename|imageMatch|awardEvidence|\.pdf|\.local/i.test(html), `Private or placeholder content in ${path}`);
    if (!path.endsWith('404.html')) fail(html.includes(`rel="canonical" href="${canonical(path)}"`), 'Incorrect canonical URL');
    for (const tag of html.matchAll(/<img\b[^>]*>/g)) {
      if (tag[0].includes('class="viewer-image"')) continue;
      fail(/alt="[^"]+"/.test(tag[0]), 'Missing alt text');
      fail(/width="\d+"/.test(tag[0]) && /height="\d+"/.test(tag[0]), 'Missing intrinsic dimensions');
    }
    // Viewer image starts empty and receives its accessible text on opening.
    const references = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map(m => m[1]);
    for (const set of html.matchAll(/srcset="([^"]+)"/g)) {
      references.push(...set[1].split(',').map(x => x.trim().split(/\s+/)[0]));
    }
    for (const ref of references) {
      if (/^(https:|mailto:)/.test(ref)) continue;
      const resolved = new URL(ref, `${origin}${basePath}/${path}`);
      fail(resolved.pathname.startsWith(basePath + '/'), `Base path escaped: ${ref}`);
      let asset = decodeURIComponent(resolved.pathname.slice(basePath.length + 1));
      if (!asset || asset.endsWith('/')) asset += 'index.html';
      const target = resolve(dist, asset);
      fail(existsSync(target), `Broken internal link from ${path}: ${ref}`);
      if (resolved.hash && target.endsWith('.html')) {
        fail(readFileSync(target, 'utf8').includes(`id="${decodeURIComponent(resolved.hash.slice(1))}"`), `Missing anchor ${ref}`);
      }
    }
  }
  const sitemap = readFileSync(resolve(dist, 'sitemap.xml'), 'utf8');
  fail([...sitemap.matchAll(/<loc>/g)].length === works.length + 2, 'Sitemap missing pages');
  console.log(`Validated ${htmls.length} pages, all internal links, responsive image sizes, unique photos, metadata, and deployment base path.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  validateData();
  validateBuild();
}
