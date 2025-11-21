#!/usr/bin/env node
"use strict";
// Print D1 migration SQL and optionally write a local sqlite file for preview.

const fs = require('fs');
const path = require('path');

const sqlPath = path.join(__dirname, '..', 'migrations', '001_init.sql');
if (!fs.existsSync(sqlPath)) { console.error('Missing migration file', sqlPath); process.exit(1); }
const sql = fs.readFileSync(sqlPath, 'utf8');
console.log('\n--- MIGRATION SQL (for Cloudflare D1) ---\n');
console.log(sql);

console.log('\nTo apply this migration to Cloudflare D1:');
console.log('- Create a D1 database in Cloudflare dashboard.');
console.log('- Use `wrangler d1 execute --database-name <DB> migrations/001_init.sql` or use the D1 UI to run SQL.');
console.log('\nTo preview locally (requires sqlite3 CLI):');
console.log('  sqlite3 trifecta_preview.db < migrations/001_init.sql');
console.log('  sqlite3 trifecta_preview.db "SELECT name FROM sqlite_master WHERE type=\'table\'"');
