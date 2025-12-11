const fs = require('fs');
const path = require('path');

const seedsPath = path.resolve(__dirname, '../seeds/seed_articles.json');
const outDir = path.resolve(__dirname, '../public');

function slugify(s){
  return s.toString().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
}

if (!fs.existsSync(seedsPath)){
  console.error('Missing seed file:', seedsPath);
  process.exit(1);
}

const raw = fs.readFileSync(seedsPath,'utf8');
const data = JSON.parse(raw);

const index = [];
Object.keys(data).forEach(site => {
  data[site].forEach((a, i) => {
    const slug = slugify(a.title || `item-${i+1}`);
    const base = (process.env.BASE_URL || 'https://example.com').replace(/\/$/,'');
    const url = `${base}/${site}/${slug}`;
    index.push({
      id: `${site}-${i+1}`,
      site,
      title: a.title || '',
      excerpt: a.excerpt || '',
      content: a.content || '',
      url,
      slug
    });
  });
});

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'search_index.json');
fs.writeFileSync(outPath, JSON.stringify(index, null, 2));
console.log('Wrote', outPath);
