#!/usr/bin/env node
"use strict";
// Enhanced markdown -> static HTML generator using `marked` for better rendering
// Reads markdown files from apps/swankyboyz/content/*.md
// Writes HTML files to apps/swankyboyz/public/articles/<slug>.html
// Optimizes images using sharp (generates thumbnails)

const fs = require('fs');
const path = require('path');

let marked;
let sharp;

// Lazy-load marked and sharp to avoid hard dependency on startup
async function loadDeps() {
  if (!marked) {
    try {
      marked = require('marked');
    } catch (e) {
      console.warn('marked not installed; using fallback parser. Run: npm install');
      marked = null;
    }
  }
  if (!sharp) {
    try {
      sharp = require('sharp');
    } catch (e) {
      console.warn('sharp not installed; skipping image optimization. Run: npm install');
      sharp = null;
    }
  }
}

function parseFrontmatter(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return { meta: {}, body: md };
  const yaml = m[1];
  const lines = yaml.split(/\n/);
  const out = {};
  for (const l of lines) {
    const idx = l.indexOf(':');
    if (idx > 0) {
      const k = l.slice(0, idx).trim();
      let v = l.slice(idx + 1).trim();
      if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
      out[k] = v;
    }
  }
  const body = md.replace(m[0], '').trim();
  return { meta: out, body };
}

// Fallback simple markdown parser if marked is not available
function mdToHtmlFallback(md) {
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Images: ![alt](url)
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (m, alt, url) => {
    return `<figure><img src="${url}" alt="${alt}" style="max-width:100%;height:auto;border-radius:8px"/><figcaption style="font-size:0.9em;color:#999">${alt}</figcaption></figure>`;
  });

  // Links [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, text, url) => {
    return `<a href="${url}">${text}</a>`;
  });

  // Headings ###, ##, #
  html = html.replace(/^###\s?(.*)$/gm, '<h3>$1</h3>');
  html = html.replace(/^##\s?(.*)$/gm, '<h2>$1</h2>');
  html = html.replace(/^#\s?(.*)$/gm, '<h1>$1</h1>');

  // Unordered lists
  html = html.replace(/(^|\n)\s*[-*+]\s+(.*)(?=(\n|$))/g, (m) => {
    const items = m.trim().split(/\n/).map(l => l.replace(/^\s*[-*+]\s+/, ''));
    return '\n<ul style="margin:1em 0">' + items.map(i => `<li>${i}</li>`).join('') + '</ul>\n';
  });

  // Bold **text** and *text*
  html = html.replace(/\*\*([^\*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^\*]+)\*/g, '<em>$1</em>');

  // Paragraphs: split by blank lines
  const parts = html.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  html = parts.map(p => {
    if (p.startsWith('<h') || p.startsWith('<ul') || p.startsWith('<figure') || p.startsWith('<ol')) return p;
    return `<p style="line-height:1.8">${p}</p>`;
  }).join('\n');

  return html;
}

async function mdToHtml(md) {
  await loadDeps();
  if (marked) {
    return marked.parse(md, {
      gfm: true,
      breaks: true,
    });
  }
  return mdToHtmlFallback(md);
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function optimizeImage(imagePath, outputDir, basename) {
  if (!sharp || !fs.existsSync(imagePath)) return null;
  try {
    const thumbPath = path.join(outputDir, `thumb_${basename}`);
    await sharp(imagePath)
      .resize(300, 200, { fit: 'cover', withoutEnlargement: true })
      .toFile(thumbPath);
    console.log('Generated thumbnail:', thumbPath);
    return thumbPath;
  } catch (e) {
    console.warn('Image optimization failed:', e.message);
    return null;
  }
}

function transformAffiliateLinks(html, slug) {
  // Add rel/nofollow and target; UTM params will be injected at request time via Worker
  return html.replace(/<a[^>]*href=\"([^\"]+)\"[^>]*>(.*?)<\/a>/g, (m, href, text) => {
    try {
      const url = new URL(href, 'https://swankyboyz.com');
      if (/amazon\./i.test(url.hostname)) {
        // Mark as affiliate link; worker will inject tag
        return `<a href="${url.toString()}" rel="nofollow sponsored" target="_blank" class="affiliate-link" data-campaign="${slug}">${text}</a>`;
      }
    } catch (e) {
      // ignore
    }
    // Non-amazon links: open external links in new tab if absolute
    if (/^https?:\/\//i.test(href)) return `<a href="${href}" target="_blank" rel="noopener">${text}</a>`;
    return `<a href="${href}">${text}</a>`;
  });
}

function makePage({ title, meta, contentHtml, slug }) {
  const desc = (meta.meta || meta.description || '') || '';
  const image = meta.featured_image || '/default-featured.jpg';
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(desc)}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(desc)}" />
  <meta property="og:image" content="${image}" />
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="canonical" href="https://swankyboyz.com/articles/${slug}.html" />
  <!-- Google Analytics placeholder -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-XXXXXXXXXX');
  </script>
</head>
<body style="font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;line-height:1.6;margin:0;background:#111;color:#eee;">
  <header style="padding:18px;background:#0f0f0f;border-bottom:1px solid #222;position:sticky;top:0;z-index:100;box-shadow:0 2px 8px rgba(0,0,0,0.5);">
    <a href="/" style="color:#ffd700;text-decoration:none;font-weight:700;font-size:20px">SwankyBoyz</a>
  </header>
  <main style="padding:18px;max-width:900px;margin:18px auto;">
    <article style="background:linear-gradient(180deg,#0f0f0f,#0b0b0b);border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,0.6);padding:24px;">
      <h1 style="color:#ffd700;margin-top:0">${escapeHtml(title)}</h1>
      <p style="color:#bbb;font-size:1.1em;font-style:italic">${escapeHtml(meta.excerpt || '')}</p>
      <hr style="border:none;border-top:1px solid #333;margin:18px 0" />
      <div class="content">${contentHtml}</div>
      <hr style="border:none;border-top:1px solid #333;margin:24px 0" />
      <div style="background:#1a1a1a;padding:16px;border-radius:8px;margin:18px 0;border-left:4px solid #ffd700;">
        <p style="margin:0 0 10px 0"><strong>Affiliate Disclosure:</strong> This article contains affiliate links. We may earn a commission at no extra cost to you.</p>
        <a class="affiliate-cta" href="https://www.amazon.com/" target="_blank" rel="nofollow sponsored" data-campaign="${slug}" style="display:inline-block;background:#ffd700;color:#111;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:600;transition:background 0.3s">Shop on Amazon</a>
      </div>
    </article>
  </main>
  <footer style="padding:18px;text-align:center;color:#777;border-top:1px solid #222;margin-top:36px">&copy; ${new Date().getFullYear()} SwankyBoyz — Premium picks, real reviews</footer>
  <script>
    // Runtime affiliate tag injection via data attributes
    const tag = localStorage.getItem('amazon_tag') || 'your-affiliate-tag-20';
    document.querySelectorAll('.affiliate-link, .affiliate-cta').forEach(el => {
      const href = new URL(el.href, location.origin);
      if (!href.searchParams.has('tag')) href.searchParams.set('tag', tag);
      href.searchParams.set('utm_source', 'swankyboyz');
      href.searchParams.set('utm_medium', 'affiliate');
      href.searchParams.set('utm_campaign', el.dataset.campaign || 'general');
      el.href = href.toString();
    });
  </script>
</body>
</html>`;
}

function escapeHtml(s) {
  return (s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function ensureDir(dir) { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); }

async function build() {
  await loadDeps();

  const site = 'swankyboyz';
  const contentDir = path.join(__dirname, '..', 'apps', site, 'content');
  const publicDir = path.join(__dirname, '..', 'apps', site, 'public');
  const articlesDir = path.join(publicDir, 'articles');
  ensureDir(articlesDir);

  if (!fs.existsSync(contentDir)) {
    console.error('No content directory found at', contentDir);
    process.exit(1);
  }

  const files = fs.readdirSync(contentDir).filter(f => f.endsWith('.md'));
  const index = [];

  for (const f of files) {
    const full = path.join(contentDir, f);
    const md = fs.readFileSync(full, 'utf8');
    const { meta, body } = parseFrontmatter(md);
    const title = meta.title || f.replace(/\.md$/, '');
    const slug = meta.slug || slugify(title);

    const htmlBody = await mdToHtml(body || '');
    const transformed = transformAffiliateLinks(htmlBody, slug);

    const page = makePage({ title, meta, contentHtml: transformed, slug });
    const outPath = path.join(articlesDir, `${slug}.html`);
    fs.writeFileSync(outPath, page);
    index.push({ title, excerpt: meta.excerpt || '', slug });
    console.log('✓ Wrote', outPath);
  }

  // Write index.html listing articles
  const indexHtml = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>SwankyBoyz Articles</title><link rel="canonical" href="https://swankyboyz.com/articles/"/><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto;background:#111;color:#eee;padding:18px}h1{color:#ffd700}ul{list-style:none;padding:0}li{margin:12px 0;padding:12px;background:#0f0f0f;border-radius:8px;border-left:4px solid #ffd700}a{color:#0ea5e9;text-decoration:none}a:hover{text-decoration:underline}</style></head><body><h1>SwankyBoyz Articles</h1><ul>${index.map(i => `<li><a href="/articles/${i.slug}.html" style="font-weight:600;font-size:1.1em">${escapeHtml(i.title)}</a><p style="margin:6px 0 0 0;color:#999">${escapeHtml(i.excerpt)}</p></li>`).join('')}</ul></body></html>`;
  fs.writeFileSync(path.join(publicDir, 'articles', 'index.html'), indexHtml);
  console.log('✓ Wrote article index with', index.length, 'items');
}

build().catch(e => { console.error('Error:', e); process.exit(1); });
