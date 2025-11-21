// Cloudflare Worker: Newsletter signup / contact handler
// Also injects affiliate tags into HTML responses dynamically
// Expects binding `DB` (Cloudflare D1) configured in wrangler.toml

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, {status:204, headers: corsHeaders()});

    // Newsletter/contact endpoint
    if (url.pathname === '/.netlify/functions/newsletter' || url.pathname === '/api/newsletter') {
      if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
      try {
        const body = await request.json();
        const email = (body.email || '').toLowerCase().trim();
        const site = body.site || 'swankyboyz';
        if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return new Response(JSON.stringify({ error: 'invalid_email' }), { status: 400, headers: corsHeaders() });

        // Insert into D1
        const id = crypto.randomUUID();
        const stmt = env.DB.prepare('INSERT OR IGNORE INTO subscribers (id, email, site) VALUES (?, ?, ?)');
        await stmt.bind(id, email, site).run();

        // Log analytics event
        const aid = crypto.randomUUID();
        const astmt = env.DB.prepare('INSERT INTO analytics (id, site, path, event, meta) VALUES (?, ?, ?, ?, ?)');
        await astmt.bind(aid, site, '/api/newsletter', 'subscribe', JSON.stringify({ email })).run();

        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders() });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders() });
      }
    }

    // Affiliate link rewriter (for HTML responses)
    if (url.pathname.endsWith('.html') || url.pathname.endsWith('/')) {
      const response = await env.ASSETS.fetch(request);
      if (response.status === 200 && response.headers.get('content-type')?.includes('text/html')) {
        let html = await response.text();
        const tag = env.AMAZON_ASSOCIATE_TAG || 'your-affiliate-tag-20';
        // Inject tag into script blocks for affiliate links
        html = html.replace('<script>', `<script>window.AMAZON_TAG='${tag}';</script><script>`);
        return new Response(html, {
          status: response.status,
          headers: new Headers(response.headers)
        });
      }
      return response;
    }

    return new Response('Not Found', { status: 404 });
  }
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}
