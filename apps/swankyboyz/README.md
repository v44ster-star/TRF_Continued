# SwankyBoyz (swankyboyz.com)

This app is an Astro + Tailwind skeleton for the SwankyBoyz affiliate site.

## Features

- **SEO-optimized static article pages** generated from Markdown
- **Runtime affiliate tag injection** (no rebuild needed to change tags)
- **Image optimization** with thumbnails (sharp)
- **Marked-powered Markdown** for professional rendering
- **Newsletter signup** integrated with D1 (Cloudflare database)
- **Affiliate link rewriting** with UTM tracking

## Quick Local Development

1. cd apps/swankyboyz
2. npm install
3. npm run dev

## Content & Build

Content is stored in `apps/swankyboyz/content/*.md` seeded by the root `npm run seed` script.

### Build steps (from repo root):

```bash
npm install                  # Install root helpers (marked, sharp, axios, openai)
npm run seed                 # Write seed articles to apps/swankyboyz/content/
npm run build:index:swanky   # Generate content index (JSON)
npm run build:articles:swanky # Convert markdown to static HTML pages in public/articles/
npm run sitemap:swanky       # Generate sitemap.xml
```

### Generated files:

- `apps/swankyboyz/public/articles/*.html` — static article pages (SEO-friendly, affiliate-linked)
- `apps/swankyboyz/public/articles/index.html` — article listing
- `apps/swankyboyz/public/content/index.json` — JSON index used by pages
- `apps/swankyboyz/public/sitemap.xml` — search engine sitemap


## Affiliate Setup (Runtime Injection)

The generated HTML includes a script that:
1. Reads your Amazon associate tag from `localStorage` or defaults to placeholder
2. Finds all `.affiliate-link` and `.affiliate-cta` elements
3. Injects your tag + UTM params at runtime (no rebuild needed)

**Setup:**

1. On first page load, set your tag in localStorage:
	 ```javascript
	 localStorage.setItem('amazon_tag', 'yourtag-20');
	 ```

2. Or update the Cloudflare Worker to serve your tag:
	 - Set `AMAZON_ASSOCIATE_TAG` in `wrangler.toml` under `[vars]`
	 - The Worker rewrites HTML to inject `window.AMAZON_TAG` into the page
	 - The client script reads that and applies it to all affiliate links

## Deployment: Cloudflare Pages + D1

### 1. Set up Cloudflare D1 database

- Create a D1 database in [Cloudflare dashboard](https://dash.cloudflare.com)
- Run the SQL migration via the D1 UI:
	```sql
	-- Paste contents of migrations/001_init.sql from repo root
	```
- Note the database ID and name for later

### 2. Create Cloudflare Pages project

- Go to [Cloudflare Pages](https://dash.cloudflare.com/pages)
- Connect your GitHub repo
- Choose production branch: `main`
- Build settings:
	- **Framework**: Astro
	- **Build command**: `npm --prefix apps/swankyboyz run build`
	- **Build output directory**: `apps/swankyboyz/dist`
	- **Root directory**: `/` (or leave blank)
- Environment variables (set in Pages > Settings > Environment variables):
	```
	AMAZON_ASSOCIATE_TAG=yourtag-20
	```

### 3. Deploy the Worker (newsletter + affiliate rewriter)

- Install Wrangler CLI: `npm install -g wrangler`
- Copy `apps/swankyboyz/wrangler.example.toml` to `apps/swankyboyz/wrangler.toml`
- Edit `wrangler.toml`:
	```toml
	name = "swankyboyz-worker"
	account_id = "YOUR_CF_ACCOUNT_ID"  # from Cloudflare dashboard
  
	[[d1_databases]]
	binding = "DB"
	database_name = "your-d1-database-name"
  
	[vars]
	AMAZON_ASSOCIATE_TAG = "yourtag-20"
	```
- Deploy:
	```bash
	cd apps/swankyboyz
	wrangler deploy
	```

### 4. Full local test before deploy

```bash
cd /repo/root
npm install
npm run seed
npm run build:index:swanky
npm run build:articles:swanky
npm run sitemap:swanky

cd apps/swankyboyz
npm install
npm run build
npm run preview
# Open http://localhost:3000/articles/
```

## Cost Summary

- **Cloudflare Pages**: Free (includes 1,000 builds/month, unlimited bandwidth on free plan)
- **D1**: Free tier (5GB storage, 1M read units/month)
- **Worker**: Free tier (100,000 requests/day)
- **Domain**: Registrar cost (you already own swankyboyz.com for 8 months)

## Next Steps

- Replace seed content with your own articles (Markdown format)
- Set your Amazon associate tag in localStorage or via Wrangler env vars
- Monitor affiliate clicks in D1 analytics table
- Generate more articles using `npm run generate` (uses OpenAI — monitor credits)

