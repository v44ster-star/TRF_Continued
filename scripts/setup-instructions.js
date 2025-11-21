#!/usr/bin/env node
"use strict";
console.log('\nQuick Setup Checklist (4-6 hours internet café)\n');
console.log('1) Clone repo and open here.');
console.log('2) Copy .env.example -> .env and set keys (OpenAI, Cloudflare).');
console.log('3) Run `npm install` at root to fetch small helper deps.');
console.log('4) Run `npm run seed` to write seeded articles to apps/*/content.');
console.log('5) Optionally run `npm run generate` to auto-generate articles with OpenAI (watch token usage).');
console.log('6) Set up Cloudflare Pages projects for each app and D1 database; upload migration SQL via Wrangler or UI.');
console.log('7) Deploy from Cloudflare Pages UI (link GitHub) or use `wrangler` for Workers.');
console.log('\nSee README.md for detailed steps.\n');
