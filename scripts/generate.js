#!/usr/bin/env node
"use strict";
// Simple content generator using OpenAI Chat API. Produces article markdown files
// Requires: OPENAI_API_KEY in env.

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const OPENAI_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_KEY) {
  console.error('ERROR: OPENAI_API_KEY not set. Copy .env.example -> .env and set it.');
  process.exit(1);
}

async function generateArticle(topic, site, outDir) {
  const prompt = `Write a long-form SEO-optimized article on the topic: "${topic}". Include a short meta description (150 chars), a 2-3 sentence excerpt, and a content body of around 1200-1800 words with H2/H3 headings. Output as JSON with keys: title, meta, excerpt, content.`;

  const resp = await axios.post('https://api.openai.com/v1/chat/completions', {
    model: 'gpt-4o-mini',
    messages: [{role: 'system', content: 'You are an expert content writer for affiliate blogs.'}, {role: 'user', content: prompt}],
    temperature: 0.6,
    max_tokens: 2500
  }, {
    headers: { Authorization: `Bearer ${OPENAI_KEY}` }
  });

  const raw = resp.data.choices[0].message.content;
  // We expect JSON, but be defensive
  let parsed;
  try { parsed = JSON.parse(raw); } catch (e) {
    // Attempt to extract JSON block
    const m = raw.match(/\{[\s\S]*\}/);
    parsed = m ? JSON.parse(m[0]) : { title: topic, meta: '', excerpt: '', content: raw };
  }

  const slug = parsed.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const filename = path.join(outDir, `${slug}.md`);
  const md = `---\ntitle: "${parsed.title.replace(/"/g, '\"')}"\nmeta: "${(parsed.meta||'').replace(/"/g,'\"')}"\nexcerpt: "${(parsed.excerpt||'').replace(/"/g,'\"')}"\nslug: "${slug}"\n---\n\n${parsed.content}\n`;

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(filename, md);

  console.log('Wrote', filename);
  return { slug, title: parsed.title };
}

async function main() {
  const topicsFile = path.join(__dirname, '..', 'seeds', 'generate_topics.json');
  if (!fs.existsSync(topicsFile)) {
    console.error('No topics seed found at', topicsFile);
    process.exit(1);
  }
  const topics = JSON.parse(fs.readFileSync(topicsFile, 'utf8'));

  for (const site of Object.keys(topics)) {
    const outDir = path.join(__dirname, '..', 'apps', site, 'content');
    for (const t of topics[site]) {
      try {
        await generateArticle(t, site, outDir);
        await new Promise(r=>setTimeout(r, 1200));
      } catch (e) {
        console.error('Error generating topic', t, e.message);
      }
    }
  }
}

main().catch(e=>{ console.error(e); process.exit(1); });
