#!/usr/bin/env node
"use strict";
// Interactive installer to prepare deployment for TriFecta sites (fast café use)
// - Prompts for Cloudflare & API keys
// - Writes `.env` from `.env.example` with provided values
// - Optionally runs `npm install`, `npm run seed`, builds indexes, generates articles, sitemap
// - Generates `apps/<site>/wrangler.toml` for Worker deploy

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline/promises');
const os = require('os');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function safeExit(code=0){ rl.close(); process.exit(code); }

async function ask(prompt, def=''){
  const r = await rl.question(`${prompt}${def?` (${def})`:''}: `);
  return (r || def).trim();
}

function writeEnvFromExample(values){
  const src = path.join(process.cwd(), '.env.example');
  const dst = path.join(process.cwd(), '.env');
  let content = '';
  if (fs.existsSync(src)) content = fs.readFileSync(src,'utf8');
  // Replace known keys
  for (const k of Object.keys(values)){
    const re = new RegExp(`^${k}=.*$`,'m');
    if (re.test(content)){
      content = content.replace(re, `${k}=${values[k]}`);
    } else {
      content += os.EOL + `${k}=${values[k]}`;
    }
  }
  fs.writeFileSync(dst, content);
  console.log('Wrote', dst);
}

function writeWrangler(site, cfg){
  const dir = path.join(process.cwd(), 'apps', site);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive:true });
  const dst = path.join(dir, 'wrangler.toml');
  const txt = `name = "${cfg.name || site}-worker"
main = "workers/newsletter/index.js"
type = "javascript"

[env.production]
account_id = "${cfg.account_id}"
route = "${cfg.route || ''}"

[[d1_databases]]
binding = "DB"
database_name = "${cfg.database_name}"

[vars]
AMAZON_ASSOCIATE_TAG = "${cfg.amazon_tag}"
CONTACT_EMAIL = "${cfg.contact_email}"
`;
  fs.writeFileSync(dst, txt);
  console.log('Wrote', dst);
}

async function main(){
  console.log('\nTriFecta Interactive Installer — Quick deployment setup (Cloudflare Pages + D1)');
  console.log('Note: This script is designed for speed at an internet café.');

  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.includes('-n');

  const choice = await ask('Which site to prepare? (swankyboyz | vaughnsterlingtours | vaughnsterling | all)', 'swankyboyz');
  const sites = choice === 'all' ? ['swankyboyz','vaughnsterlingtours','vaughnsterling'] : [choice];

  // Global prompts (asked once)
  const CF_ACCOUNT_ID = await ask('Enter Cloudflare Account ID (from dashboard)', process.env.CF_ACCOUNT_ID || '');
  const CF_API_TOKEN = await ask('Enter Cloudflare API Token (Pages + D1 permissions)', process.env.CF_API_TOKEN || '');
  const useSameD1 = (await ask('Use the same D1 database for all sites? (Y/n)', 'Y')).toLowerCase() !== 'n';
  let D1_DATABASE_NAME = await ask('Enter D1 database name (create one in dashboard first)', process.env.D1_DATABASE_ID || 'trifecta_d1');
  const AMAZON_ASSOCIATE_TAG = await ask('Amazon Associate Tag (example: yourtag-20)', process.env.AMAZON_ASSOCIATE_TAG || 'yourtag-20');
  const OPENAI_API_KEY = await ask('OpenAI API key (optional, leave blank to skip generation)', process.env.OPENAI_API_KEY || '');
  const CONTACT_EMAIL = await ask('Contact email for forms', process.env.CONTACT_EMAIL || 'you@example.com');

  // Prepare values to write to .env (global)
  const globalEnv = {
    CF_ACCOUNT_ID,
    CF_API_TOKEN,
    D1_DATABASE_ID: D1_DATABASE_NAME,
    AMAZON_ASSOCIATE_TAG,
    OPENAI_API_KEY,
    CONTACT_EMAIL
  };

  if (dryRun) console.log('\n-- DRY RUN MODE (no files will be written) --\n');

  // If dry-run, prepare to show what would be written
  if (!dryRun) writeEnvFromExample(globalEnv);
  else console.log('Would write the following .env updates:', globalEnv);

  for (const site of sites){
    let dbName = D1_DATABASE_NAME;
    if (!useSameD1){
      dbName = await ask(`D1 database name for ${site}`, `${D1_DATABASE_NAME}_${site}`);
    }
    const wranglerCfg = {
      name: site,
      account_id: CF_ACCOUNT_ID,
      route: '',
      database_name: dbName,
      amazon_tag: AMAZON_ASSOCIATE_TAG,
      contact_email: CONTACT_EMAIL
    };

    if (dryRun){
      console.log(`\n--- Would create apps/${site}/wrangler.toml with:`);
      console.log(JSON.stringify(wranglerCfg, null, 2));
    } else {
      writeWrangler(site, wranglerCfg);
    }
  }

  // Optionally run install and build steps
  const runInstall = (await ask('Run `npm install` now at repo root? (y/N)', 'N')).toLowerCase() === 'y';
  if (runInstall){
    if (dryRun) console.log('Would run: npm install');
    else {
      console.log('Running `npm install` (this may take a while)...');
      try{ execSync('npm install', { stdio:'inherit' }); } catch(e){ console.warn('npm install failed or interrupted'); }
    }
  }

  const doSeed = (await ask('Run seed to create starter markdown content? (y/N)','Y')).toLowerCase() === 'y';
  if (doSeed){
    if (dryRun) console.log('Would run: npm run seed');
    else {
      try{ execSync('npm run seed', { stdio:'inherit' }); } catch(e){ console.warn('Seed failed'); }
    }
  }

  const doBuildIndex = (await ask('Build content index and static articles now? (y/N)','Y')).toLowerCase() === 'y';
  if (doBuildIndex){
    for (const s of sites){
      if (dryRun) console.log(`Would run build/index/articles/sitemap for ${s}`);
      else {
        try{ execSync('npm run build:index:swanky', { stdio:'inherit' }); } catch(e){ console.warn('build index failed'); }
        try{ execSync('npm run build:articles:swanky', { stdio:'inherit' }); } catch(e){ console.warn('generate articles failed'); }
        try{ execSync('npm run sitemap:swanky', { stdio:'inherit' }); } catch(e){ console.warn('sitemap generation failed'); }
      }
    }
  }

  // Compact 4-6 hour café checklist
  console.log('\n--- Compact 4–6 hour café deploy checklist ---');
  console.log('- Ensure `.env` is written with required keys (CF, D1, OPENAI optional)');
  console.log('- Create D1 database in Cloudflare and run `migrations/001_init.sql`');
  console.log('- In Cloudflare Pages: connect repo, build cmd: `npm --prefix apps/swankyboyz run build`, publish dir: `apps/swankyboyz/dist`');
  console.log('- Deploy Worker: `cd apps/<site> && wrangler deploy` (ensure `wrangler` auth)');
  console.log('- Test: open /articles/index.html, submit newsletter signup, verify D1 subscriber row');
  console.log('--------------------------------------------\n');

  console.log('Summary:');
  console.log(`- Sites prepared: ${sites.join(', ')}`);
  console.log(`- .env path: ${path.join(process.cwd(), '.env')} ${dryRun? '(not written in dry-run)':''}`);
  console.log(`- Wrangler configs: ${sites.map(s=>`apps/${s}/wrangler.toml`).join(', ')} ${dryRun? '(not written in dry-run)':''}`);

  safeExit(0);
}

main().catch(e=>{ console.error('Installer error:', e); safeExit(1); });
