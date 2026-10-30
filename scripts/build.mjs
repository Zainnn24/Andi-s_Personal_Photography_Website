import { mkdirSync, writeFileSync, readFileSync, copyFileSync, existsSync, rmSync, lstatSync } from 'node:fs';
import { resolve, dirname, sep } from 'node:path';
import { root, site, works, ordered, featured, more, url, canonical, escape as e } from './config.mjs';
import { validateData } from './validate.mjs';

validateData();
const out = resolve(root, 'dist');
// Only replace this project's generated directory. Never follow a linked output directory.
if (out !== resolve(root, 'dist') || !out.startsWith(root.endsWith(sep) ? root : root + sep)) {
  throw new Error('Output must stay inside the project');
}
if (existsSync(out) && lstatSync(out).isSymbolicLink()) throw new Error('Refusing a linked output directory');
if (existsSync(out)) rmSync(out, { recursive: true });
mkdirSync(out, { recursive: true });
function write(path, text) {
  const target = resolve(out, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, text);
}
function copy(from, to) {
  const target = resolve(out, to);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(resolve(root, from), target);
}
const cover = work => work.images.find(i => i.id === work.coverImageId);
const firstImage = cover(featured[0]);
const year = new Date().getUTCFullYear();
const assetVersion = '5';

function arrowIcon(direction = 'external') {
  const paths = {
    left: 'M19 12H5m7 7-7-7 7-7',
    right: 'M5 12h14m-7-7 7 7-7 7',
    external: 'M7 17 17 7M7 7h10v10',
  };
  return `<svg class="icon-arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${paths[direction]}"/></svg>`;
}

function picture(image, { sizes = '(max-width: 600px) calc(100vw - 40px), (max-width: 1000px) calc((100vw - 64px) / 2), calc((min(100vw, 1536px) - 176px) / 3)', eager = false } = {}) {
  const fallback = image.variants.find(v => v.width >= 960) ?? image.variants.at(-1);
  const set = type => image.variants.map(v => `${url(v[type])} ${v.width}w`).join(', ');
  return `<picture>
    <source type="image/webp" srcset="${e(set('webp'))}" sizes="${e(sizes)}">
    <img src="${e(url(fallback.jpeg))}" srcset="${e(set('jpeg'))}" sizes="${e(sizes)}"
      width="${image.width}" height="${image.height}" alt="${e(image.alt)}"
      loading="${eager ? 'eager' : 'lazy'}" decoding="async" draggable="false"${eager ? ' fetchpriority="high"' : ''}>
  </picture>`;
}

function awardLine(a) {
  return `${a.organization} · ${a.distinction}${a.category ? ` · ${a.category}` : ''} · ${a.year}`;
}
function header(active) {
  return `<a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header container">
    <a class="wordmark" href="${url()}" aria-label="Andi Lin — home">Andi Lin</a>
    <nav aria-label="Main navigation">
      <a href="${url()}"${active === 'work' ? ' aria-current="page"' : ''}>Work</a>
      <a href="${url('about/')}"${active === 'about' ? ' aria-current="page"' : ''}>About</a>
      <a href="${url('about/#contact')}">Contact</a>
    </nav>
  </header>`;
}
function footer() {
  return `<footer class="site-footer container"><span>© ${year} Andi Lin</span><a href="${url('about/#contact')}">Contact</a></footer>`;
}
function layout({ title, description = site.description, path = '', active = 'work', image = firstImage, body, viewer = false, noindex = false }) {
  const share = image.variants.find(v => v.width >= 960) ?? image.variants.at(-1);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${e(title)}</title>
  <meta name="description" content="${e(description)}">
  ${noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${e(canonical(path))}">`}
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Andi Lin — Photography">
  <meta property="og:title" content="${e(title)}">
  <meta property="og:description" content="${e(description)}">
  <meta property="og:url" content="${e(canonical(path))}">
  <meta property="og:image" content="${e(canonical(share.jpeg))}">
  <meta property="og:image:width" content="${share.width}">
  <meta property="og:image:height" content="${share.height}">
  <meta property="og:image:alt" content="${e(image.alt)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${e(title)}">
  <meta name="twitter:description" content="${e(description)}">
  <meta name="twitter:image" content="${e(canonical(share.jpeg))}">
  <link rel="icon" href="${url('favicon.svg')}" type="image/svg+xml">
  <link rel="stylesheet" href="${url(`assets/style.css?v=${assetVersion}`)}">
  <script src="${url(`assets/site.js?v=${assetVersion}`)}" defer></script>
</head>
<body>
${header(active)}
${body}
${footer()}
${viewer ? viewerMarkup() : ''}
</body>
</html>`;
}
function card(work, { lead = false, highlight = false, opening = false } = {}) {
  const image = cover(work);
  const sizes = opening
    ? '(max-width: 600px) calc(100vw - 40px), (max-width: 1000px) calc((100vw - 96px) / 2), min(500px, calc((100svh - 230px) * .565))'
    : highlight ? '(max-width: 600px) calc(100vw - 40px), (max-width: 1000px) calc((100vw - 64px) / 2), calc((min(100vw, 1536px) - 136px) / 2)' : undefined;
  const secondary = highlight ? awardLine(work.awards[0]) : site.categories[work.primaryCategory];
  return `<article class="work-card${lead ? ' lead-work' : ''}" data-category="${e(work.primaryCategory)}">
    <a class="work-link" href="${url(`work/${work.slug}/`)}" aria-labelledby="title-${e(work.id)}" draggable="false">
      ${picture(image, { sizes, eager: opening })}
      <div class="card-caption">
        <div class="caption-title"><h${lead ? '1' : '3'} id="title-${e(work.id)}">${e(work.title)}</h${lead ? '1' : '3'}></div>
        <p>${e(secondary)}${work.kind === 'series' ? `<span class="series-label">${work.images.length} photographs</span>` : ''}</p>
      </div>
    </a>
  </article>`;
}
function home() {
  return layout({ title: site.title, body: `<main id="main" class="container home">
    <section aria-label="Selected work" class="selected-work">
      <div class="lead-pair">${featured.slice(0, 2).map((w, i) => card(w, { lead: i === 0, highlight: true, opening: true })).join('\n')}</div>
      <div class="section-label"><h2>Selected Work</h2><span>${String(featured.length).padStart(2, '0')} works</span></div>
      <div class="featured-grid">${featured.slice(2).map(w => card(w, { highlight: true })).join('\n')}</div>
    </section>
    <section id="more-work" aria-labelledby="more-heading" class="more-work">
      <div class="more-heading"><h2 id="more-heading">More Work</h2>
        <div class="filters" role="group" aria-label="Filter more work" hidden>
          <button type="button" data-filter="all" aria-pressed="true">All</button>
          ${Object.entries(site.categories).filter(([key]) => more.some(w => w.primaryCategory === key)).map(([key, name]) =>
            `<button type="button" data-filter="${e(key)}" aria-pressed="false">${e(name)}</button>`).join('')}
        </div>
      </div>
      <p class="sr-only" id="filter-status" role="status" aria-live="polite"></p>
      <div class="more-grid">${more.map(w => card(w)).join('\n')}</div>
    </section>
  </main>` });
}
function viewerMarkup() {
  return `<dialog class="viewer" aria-label="Photograph viewer">
    <div class="viewer-toolbar"><p class="viewer-title" id="viewer-title"></p><button type="button" class="viewer-close" autofocus aria-label="Close photograph viewer">Close <span aria-hidden="true">×</span></button></div>
    <div class="viewer-stage"><img class="viewer-image" alt="" draggable="false"><p class="viewer-error" role="status" hidden>The photograph could not load. Close the viewer to return to the work.</p></div>
    <div class="viewer-bottom">
      <button type="button" class="viewer-prev" aria-label="Previous photograph">${arrowIcon('left')} <span>Previous</span></button>
      <p class="viewer-count" role="status" aria-live="polite"></p>
      <button type="button" class="viewer-next" aria-label="Next photograph"><span>Next</span> ${arrowIcon('right')}</button>
    </div>
  </dialog>`;
}
function detail(work, index) {
  const previous = ordered[(index - 1 + ordered.length) % ordered.length];
  const next = ordered[(index + 1) % ordered.length];
  const sourceUrls = new Set(work.awards.map(a => a.url).filter(Boolean));
  if (work.descriptionSourceUrl) sourceUrls.add(work.descriptionSourceUrl);
  return layout({
    title: `${work.title} — Andi Lin`, path: `work/${work.slug}/`, image: cover(work), viewer: true,
    description: work.description || `${work.title}. A photograph by Andi Lin.`,
    body: `<main id="main" class="container work-page">
      <div class="work-topline"><a class="quiet-link all-work" href="${url('#more-work')}">${arrowIcon('left')} All work</a><span>${String(index + 1).padStart(2, '0')} / ${String(works.length).padStart(2, '0')}</span></div>
      <div class="work-introduction">
        <div><h1>${e(work.title)}</h1>${work.location ? `<p class="location">${e(work.location)}</p>` : ''}
          ${work.kind === 'series' ? `<p class="location">A series of ${work.images.length} photographs</p>` : ''}
        </div>
        <div class="work-copy">${work.description ? `<p${work.poem ? ' class="poem"' : ''}>${e(work.description)}</p>` : ''}
          ${work.awards.length ? `<ul class="work-awards">${work.awards.map(a => `<li>${e(awardLine(a))}</li>`).join('')}</ul>` : ''}
          ${[...sourceUrls].map((source, i) => `<a class="text-link" href="${e(source)}" target="_blank" rel="noopener noreferrer">${i ? 'Source' : 'Award entry'} ${arrowIcon()}<span class="sr-only"> (opens in a new tab)</span></a>`).join('')}
        </div>
      </div>
      <div class="work-images${work.kind === 'series' ? ' series-images' : ''}">
        ${work.images.map((image, pos) => `<figure class="detail-figure" style="--photo-ratio:${image.width / image.height}">
          <a class="image-open" href="${url(image.src)}" data-viewer-image data-full="${url(image.src)}" data-title="${e(work.title)}" aria-label="Open photograph ${pos + 1}: ${e(image.alt)}" draggable="false">
            ${picture(image, { sizes: '(max-width: 600px) calc(100vw - 40px), (max-width: 1000px) 85vw, 760px', eager: pos === 0 })}
          </a>
          ${work.kind === 'series' ? `<figcaption>${String(pos + 1).padStart(2, '0')} / ${String(work.images.length).padStart(2, '0')}</figcaption>` : ''}
        </figure>`).join('\n')}
      </div>
      <nav class="work-pagination" aria-label="Browse works">
        <a href="${url(`work/${previous.slug}/`)}"><span>${arrowIcon('left')} Previous work</span><strong>${e(previous.title)}</strong></a>
        <a class="all-work text-link" href="${url()}">All work</a>
        <a href="${url(`work/${next.slug}/`)}"><span>Next work ${arrowIcon('right')}</span><strong>${e(next.title)}</strong></a>
      </nav>
    </main>`,
  });
}
function about() {
  return layout({ title: 'About — Andi Lin', path: 'about/', active: 'about', body: `
  <main id="main" class="container about-page">
    <section class="about-intro" aria-labelledby="about-heading">
      <div><p class="eyebrow">About</p><h1 id="about-heading">Youyuan<br>(Andi) Lin</h1><p class="about-role">Photography & architecture</p></div>
      <div class="biography">${site.biography.map(p => `<p>${e(p)}</p>`).join('')}</div>
    </section>
    <section class="about-row" aria-labelledby="education-heading"><h2 id="education-heading">Education</h2>
      <div>${site.education.map(x => `<div class="education-entry"><div><h3>${e(x.school)}</h3><p>${e(x.degree)}</p></div><span>${e(x.dates)}</span></div>`).join('')}</div>
    </section>
    <section class="about-row" aria-labelledby="recognition-heading"><h2 id="recognition-heading">Selected recognition</h2>
      <ol class="recognition-list">${site.recognition.map(r => `<li><span class="recognition-year">${r.year}</span><div><h3>${r.url ? `<a href="${e(r.url)}" target="_blank" rel="noopener noreferrer">${e(r.title)} ${arrowIcon()}<span class="sr-only"> (opens in a new tab)</span></a>` : e(r.title)}</h3><p>${e(r.organization)} · ${e(r.detail)}</p></div></li>`).join('')}</ol>
    </section>
    <section id="contact" class="about-row contact" aria-labelledby="contact-heading"><h2 id="contact-heading">Contact</h2>
      <div><p>For conversations, collaborations, or a hello.</p><a class="contact-email" href="mailto:${e(site.email)}">${e(site.email)} ${arrowIcon()}</a></div>
    </section>
  </main>` });
}

write('index.html', home());
ordered.forEach((w, i) => write(`work/${w.slug}/index.html`, detail(w, i)));
write('about/index.html', about());
write('404.html', layout({ title: 'Page not found — Andi Lin', path: '404.html', active: '', noindex: true,
  body: `<main id="main" class="container not-found"><p class="eyebrow">404</p><h1>This page is out of frame.</h1><p>Return to the photographs to find your way.</p><a class="text-link" href="${url()}">Back to Work ${arrowIcon('right')}</a></main>` }));
for (const file of ['style.css', 'site.js']) copy(`src/${file}`, `assets/${file}`);
copy('public/favicon.svg', 'favicon.svg');
for (const work of works) for (const image of work.images) for (const v of image.variants) {
  for (const format of ['jpeg', 'webp']) copy(`public/${v[format]}`, v[format]);
}
const routes = ['', 'about/', ...ordered.map(w => `work/${w.slug}/`)];
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routes.map(p => `<url><loc>${e(canonical(p))}</loc></url>`).join('')}</urlset>\n`);
write('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${canonical('sitemap.xml')}\n`);
write('.nojekyll', '');
console.log(`Built ${routes.length + 1} static pages; ${works.length} works, ${works.reduce((n, w) => n + w.images.length, 0)} photographs.`);
