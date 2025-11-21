#!/usr/bin/env node
"use strict";
// Generate sitemap.xml for a given site using public/content/index.json
// Usage: node scripts/generate_sitemap.js swankyboyz https://swankyboyz.com

const fs = require('fs');
const path = require('path');

const site = process.argv[2] || 'swankyboyz';
const base = process.argv[3] || `https://${site}.com`;

const indexPath = path.join(__dirname, '..', 'apps', site, 'public', 'content', 'index.json');
if (!fs.existsSync(indexPath)) { console.error('Missing index.json at', indexPath); process.exit(1); }
const items = JSON.parse(fs.readFileSync(indexPath, 'utf8'));

let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n`;
xml += `<url><loc>${base}/</loc></url>\n`;
for (const it of items) {
  xml += `<url><loc>${base}/articles/${it.slug}.html</loc></url>\n`;
}
xml += '</urlset>';

const outPath = path.join(__dirname, '..', 'apps', site, 'public', 'sitemap.xml');
fs.writeFileSync(outPath, xml);
console.log('Wrote', outPath);
