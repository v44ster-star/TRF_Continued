#!/usr/bin/env node
"use strict";
// Seed local content from seeds/*.json into apps/*/content as markdown files.

const fs = require('fs');
const path = require('path');
function uuidv4(){
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function createMd(article) {
  const slug = (article.slug || article.title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g,'');
  return `---\nid: ${article.id || uuidv4()}\nsite: ${article.site}\nslug: ${slug}\ntitle: "${article.title.replace(/"/g,'\"')}"\nexcerpt: "${(article.excerpt||'').replace(/"/g,'\"')}"\n---\n\n${article.content || article.body || ''}\n`;
}

function seedSite(site, list) {
  const outDir = path.join(__dirname, '..', 'apps', site, 'content');
  fs.mkdirSync(outDir, { recursive: true });
  for (const a of list) {
    const md = createMd(Object.assign({}, a, { site }));
    const slug = (a.slug || a.title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g,'');
    const filename = path.join(outDir, `${slug}.md`);
    fs.writeFileSync(filename, md);
    console.log('Seeded', filename);
  }
}

function main() {
  const seedsDir = path.join(__dirname, '..', 'seeds');
  const topicsPath = path.join(seedsDir, 'seed_articles.json');
  if (!fs.existsSync(topicsPath)) { console.error('Missing seeds/seed_articles.json'); process.exit(1); }
  const data = JSON.parse(fs.readFileSync(topicsPath, 'utf8'));
  for (const site of Object.keys(data)) seedSite(site, data[site]);
}

main();
