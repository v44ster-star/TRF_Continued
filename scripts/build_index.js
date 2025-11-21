#!/usr/bin/env node
"use strict";
// Build a simple JSON index from markdown files under apps/<site>/content
// Usage: node scripts/build_index.js swankyboyz

const fs = require('fs');
const path = require('path');

function parseFrontmatter(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return {};
  const yaml = m[1];
  const lines = yaml.split(/\n/);
  const out = {};
  for (const l of lines) {
    const idx = l.indexOf(':');
    if (idx>0) {
      const k = l.slice(0, idx).trim();
      let v = l.slice(idx+1).trim();
      if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1,-1);
      out[k]=v;
    }
  }
  return out;
}

function build(site) {
  const contentDir = path.join(__dirname, '..', 'apps', site, 'content');
  const publicDir = path.join(__dirname, '..', 'apps', site, 'public', 'content');
  if (!fs.existsSync(contentDir)) { console.error('No content dir for', site); process.exit(1); }
  fs.mkdirSync(publicDir, { recursive: true });
  const files = fs.readdirSync(contentDir).filter(f=>f.endsWith('.md'));
  const index = [];
  for (const f of files) {
    const full = path.join(contentDir, f);
    const md = fs.readFileSync(full, 'utf8');
    const fm = parseFrontmatter(md);
    const slug = fm.slug || f.replace(/\.md$/, '');
    index.push({ title: fm.title || slug, excerpt: fm.excerpt || '', slug });
  }
  const outPath = path.join(publicDir, 'index.json');
  fs.writeFileSync(outPath, JSON.stringify(index, null, 2));
  console.log('Wrote', outPath, 'with', index.length, 'items');
}

const site = process.argv[2] || 'swankyboyz';
build(site);
