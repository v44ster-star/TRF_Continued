# TriFecta

TriFecta is a small monorepo scaffold to launch three fast Astro-based sites on Cloudflare Pages + D1:

- `swankyboyz` — men's lifestyle affiliate site (SwankyBoyz.com)
- `vaughnsterlingtours` — travel + relocation journal and affiliate offers
- `vaughnsterling` — personal brand & freelance services landing page

This repo includes:

- D1 migration SQL (`migrations/001_init.sql`)
- Content generator using OpenAI (`scripts/generate.js`)
- Seed content for 25 starter articles (`seeds/seed_articles.json`)
- Per-app skeletons under `apps/`
- Quick scripts: `npm run seed`, `npm run generate`, `npm run db:migrate`

Quick 4–6 hour internet café checklist
- Copy `.env.example` -> `.env` and fill required keys: `OPENAI_API_KEY`, `CF_*`, `AMAZON_*` (optional), `CONTACT_EMAIL`.
- Run `npm install` at the repo root to get helper scripts (small deps).
- Run `npm run seed` to create markdown files under each app's `content/` folder.
- Optionally run `npm run generate` to auto-generate more articles (consumes OpenAI credits).
- Create a Cloudflare Pages project for each app (link to this repo) and set build output directory to the app's built output. Bind the D1 database and set environment vars in the Pages UI.

Deployment notes (fast, free-tier friendly)
- Use Cloudflare Pages for static hosting. Each app can be connected to this Git repository and deployed from the Pages UI. Add environment variables in Pages settings.
- Use Cloudflare D1 for the database (free tier). Run the SQL in `migrations/001_init.sql` via the D1 UI or `wrangler d1` commands.
- Use Cloudflare Workers (via `wrangler`) for contact form and light serverless endpoints if needed.

How content and automation work
- `scripts/seed.js` writes starter markdown articles from `seeds/seed_articles.json` into `apps/<app>/content/`.
- `scripts/generate.js` uses the OpenAI API to generate long-form articles from `seeds/generate_topics.json` and writes markdown files into the apps' content folders. Update `OPENAI_API_KEY` before running.
- Product sync: placeholder hooks and product schema are included in `migrations/001_init.sql`. The repository contains sample code and clear instructions to plug in Amazon Product Advertising API keys.

Cloudflare & D1
- `migrations/001_init.sql` contains the D1 schema. Use `wrangler d1` or D1 UI to run the SQL.

Costs & Projections (realistic, conservative)
- Cloudflare Pages + D1: Free tier available — initial cost R0.
- OpenAI: initial credits $5; beyond that costs depend on generation volume — keep generation conservative at start. Use seed content first.
- Domain renewals: you already have 8 months remaining.

Week 1 goals (launch)
- Seed content published (25 articles) across sites.
- Basic affiliate links added as placeholders; implement your Amazon associate tag in `.env`.
- Newsletter signup hooked to D1 via a small Worker endpoint (instructions included).

Next steps after launch
- Optimize best-performing posts for higher conversions.
- Add more AI-generated content gradually (monitor OpenAI spend).
- Implement affiliate product sync using Amazon PA-API credentials when available.

Files created by scaffold
- `package.json` — root scripts
- `scripts/` — helpers: generator, seed, migrations helper
- `migrations/001_init.sql` — D1 schema
- `seeds/` — seed content and generator topics
- `apps/` — three app skeletons

If you want, I can now:
- Set up a Cloudflare Pages deploy config for one site (example) and a sample `wrangler.toml` for Workers/D1.
- Add a lightweight search/index and sitemap generator script.

---
If you're ready, tell me which site you want to deploy first (SwankyBoyz recommended for fastest affiliate focus). I can then generate final Cloudflare Pages instructions and a one-command deploy flow.

Oh Yeah
