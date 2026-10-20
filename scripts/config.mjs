import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const site = JSON.parse(readFileSync(resolve(root, 'content/site.json'), 'utf8'));
export const works = JSON.parse(readFileSync(resolve(root, 'content/works.json'), 'utf8'));
export const basePath = (process.env.BASE_PATH ?? site.basePath).replace(/\/+$/, '');
export const origin = (process.env.SITE_ORIGIN ?? site.origin).replace(/\/+$/, '');
if (basePath && !/^\/[A-Za-z0-9/_-]+$/.test(basePath)) throw new Error('Invalid base path');
if (new URL(origin).protocol !== 'https:') throw new Error('Canonical origin must use HTTPS');
export const url = (path = '') => `${basePath}/${path.replace(/^\/+/, '')}`;
export const canonical = (path = '') => `${origin}${url(path)}`;
export const ordered = [...works].sort((a, b) => a.order - b.order);
export const featured = ordered.filter(w => w.featured).sort((a, b) => a.featuredOrder - b.featuredOrder);
export const more = ordered.filter(w => !w.featured);
export const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[c]);
