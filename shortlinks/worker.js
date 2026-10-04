// Short-link subdomains for isthere.
//   isthereanmcpforit.biratdatta.tech/github  ->  https://isthere.biratdatta.tech/mcp/github
//   isthereaskillforit.biratdatta.tech/        ->  https://isthere.biratdatta.tech/skills
// Deploy: npx wrangler deploy --config shortlinks/wrangler.jsonc

const SITE = 'https://isthere.biratdatta.tech';

const HOSTS = {
  isthereaskillforit: 'skills',
  isthereanmcpforit: 'mcp',
  isthereamcpforit: 'mcp',
  isthereapluginforit: 'plugins',
  isthereapromptforit: 'prompts',
  isthereanagentforit: 'agents',
};

export default {
  fetch(request) {
    const url = new URL(request.url);
    const kind = HOSTS[url.hostname.split('.')[0]];
    if (!kind) return Response.redirect(SITE, 302);

    let slug = url.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
    try {
      slug = decodeURIComponent(slug);
    } catch {}
    let target = `${SITE}/${kind}`;
    if (slug && /^[a-z0-9-]{1,80}$/.test(slug)) target += `/${slug}`;
    else if (slug) target += `?q=${encodeURIComponent(slug)}`;
    if (url.search && !target.includes('?')) target += url.search;

    return new Response(null, {
      status: 301,
      headers: { location: target, 'cache-control': 'public, max-age=86400' },
    });
  },
};
