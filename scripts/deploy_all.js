#!/usr/bin/env node
"use strict";
// Deploy all three sites + workers to Cloudflare using Wrangler and Pages
// - Builds each app
// - Runs site-specific index/article generation for SwankyBoyz
// - Publishes Pages projects via `wrangler pages publish` (requires wrangler v2+)
// - Deploys Workers via `wrangler deploy`
// - Optionally runs D1 migration via `wrangler d1 execute`

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline/promises');
const os = require('os');
require('dotenv').config();

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
function safeExit(code=0){ rl.close(); process.exit(code); }
async function ask(q, def=''){
  const r = await rl.question(`${q}${def?` (${def})`:''}: `);
  return (r || def).trim();
}

const SITES = [
  { name: 'swankyboyz', dir: 'apps/swankyboyz' },
  { name: 'vaughnsterlingtours', dir: 'apps/vaughnsterlingtours' },
  { name: 'vaughnsterling', dir: 'apps/vaughnsterling' }
];

async function run(cmd, opts={}){
  console.log('> ', cmd);
  execSync(cmd, { stdio: 'inherit', ...opts });
}

async function main(){
  console.log('\nTriFecta: Deploy All Sites');
  const args = process.argv.slice(2);
  const dry = args.includes('--dry-run') || args.includes('-n');

  if (!process.env.CF_ACCOUNT_ID){
    console.log('Warning: CF_ACCOUNT_ID not set in environment. Installer can write it to .env if needed.');
  }

  // Get Cloudflare Pages project names per site
  const projects = {};
  for (const s of SITES){
    const envKey = `CF_PAGES_PROJECT_${s.name.toUpperCase()}`;
    projects[s.name] = process.env[envKey] || process.env.CF_PAGES_PROJECT || await ask(`Cloudflare Pages project name for ${s.name}`, `${s.name}-pages`);
  }

  // Confirm wrangler available
  let hasWrangler = true;
  try{ execSync('wrangler --version', { stdio: 'ignore' }); } catch(e){ hasWrangler = false; }
  if (!hasWrangler) console.log('Note: `wrangler` CLI not found. Install it for Worker/D1 and Pages publish commands. Proceeding in dry-run mode if not installed.');

  for (const s of SITES){
    console.log(`\n--- Building ${s.name} ---`);
    if (dry){
      console.log(`[dry] npm --prefix ${s.dir} run build`);
    } else {
      // Ensure per-app deps installed (skip if node_modules exists)
      const nm = path.join(s.dir, 'node_modules');
      if (!fs.existsSync(nm)){
        console.log(`Installing dependencies for ${s.name}...`);
        await run(`npm --prefix ${s.dir} install`);
      }
      await run(`npm --prefix ${s.dir} run build`);
    }

    // Special Swanky build steps
    if (s.name === 'swankyboyz'){
      if (dry){
        console.log('[dry] npm run build:index:swanky');
        console.log('[dry] npm run build:articles:swanky');
        console.log('[dry] npm run sitemap:swanky');
      } else {
        await run('npm run build:index:swanky');
        await run('npm run build:articles:swanky');
        await run('npm run sitemap:swanky');
      }
    }

    // Publish Pages (wrangler pages publish)
    const projectName = projects[s.name];
    const publishDir = path.join(s.dir, 'dist');
    if (dry){
      console.log(`[dry] wrangler pages publish ${publishDir} --project-name ${projectName}`);
    } else {
      if (!hasWrangler){
        console.warn('Skipping publish: wrangler not installed');
      } else {
        await run(`wrangler pages publish ${publishDir} --project-name ${projectName}`);
      }
    }

    // Deploy Worker if wrangler.toml exists in app dir
    const wranglerToml = path.join(s.dir, 'wrangler.toml');
    if (fs.existsSync(wranglerToml)){
      if (dry) console.log(`[dry] (cd ${s.dir} && wrangler deploy)`);
      else {
        if (!hasWrangler) console.warn('Skipping worker deploy (wrangler not installed)');
        else {
          await run(`cd ${s.dir} && wrangler deploy`);
        }
      }
    } else {
      console.log(`No worker config at ${wranglerToml}, skipping worker deploy for ${s.name}`);
    }
  }

  // Optionally run D1 migration
  const runD1 = (await ask('Run D1 migration now (migrations/001_init.sql)? (y/N)', 'N')).toLowerCase() === 'y';
  if (runD1){
    if (dry) console.log('[dry] wrangler d1 execute --database-name $D1_DATABASE_ID migrations/001_init.sql');
    else if (!hasWrangler) console.warn('Cannot run D1 migration: wrangler not installed');
    else {
      const dbName = process.env.D1_DATABASE_ID || await ask('D1 database name', 'trifecta_d1');
      await run(`wrangler d1 execute --database-name ${dbName} migrations/001_init.sql`);
    }
  }

  console.log('\nDeploy process finished. Verify Pages dashboard and worker routes.');
  safeExit(0);
}

main().catch(e=>{ console.error('Deploy error:', e); safeExit(1); });
