const fs = require('fs');
const path = require('path');

const seedsPath = path.resolve(__dirname, '../seeds/seed_articles.json');
if (!fs.existsSync(seedsPath)){
  console.error('Missing seed file:', seedsPath);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(seedsPath,'utf8'));
const base = (process.env.BASE_URL || 'https://example.com').replace(/\/$/,'');

function slugify(s){
  return s.toString().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
}

const urls = new Set();
urls.add(base + '/');

Object.keys(data).forEach(site => {
  data[site].forEach(a => {
    const slug = slugify(a.title || 'item');
    urls.add(`${base}/${site}/${slug}`);
  });
});

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  [...urls].map(u => `  <url><loc>${u}</loc></url>`).join('\n') +
  `\n</urlset>`;

const outDir = path.resolve(__dirname, '../public');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'sitemap.xml');
fs.writeFileSync(outPath, sitemap);
console.log('Wrote', outPath);
