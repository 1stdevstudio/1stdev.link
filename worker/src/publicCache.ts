/** Public files only. Never use this helper for API, dashboard HTML, bio or redirects. */
export interface PublicCachePolicy {
  browserTtl: number;
  edgeTtl: number;
  contentType: RegExp;
  immutable?: boolean;
}

export const ASSET_CACHE: PublicCachePolicy = {
  browserTtl: 86400,
  edgeTtl: 2592000,
  immutable: true,
  contentType: /^(text\/css|(?:text|application)\/(?:javascript|x-javascript)|image\/|font\/|application\/(?:wasm|json|octet-stream|font-))/i,
};
export const MEDIA_CACHE_POLICY: PublicCachePolicy = {
  ...ASSET_CACHE,
  contentType: /^image\/(?:webp|jpeg|png)(?:;|$)/i,
};
export const SEO_CACHE: PublicCachePolicy = {
  browserTtl: 86400,
  edgeTtl: 2592000,
  contentType: /^(image\/|application\/(?:manifest\+json|json)|text\/plain)/i,
};
export const SITEMAP_CACHE: PublicCachePolicy = {
  browserTtl: 1800,
  edgeTtl: 3600,
  contentType: /^(?:application|text)\/xml(?:;|$)/i,
};

export function publicCacheControl(policy: PublicCachePolicy): string {
  return `public, max-age=${policy.browserTtl}, s-maxage=${policy.edgeTtl}${policy.immutable ? ', immutable' : ''}`;
}

function clientResponse(request: Request, response: Response, result: string): Response {
  const headers = new Headers(response.headers);
  headers.set('X-Edge-Cache', result);
  const etag = headers.get('etag');
  const condition = request.headers.get('if-none-match');
  const modifiedSince = request.headers.get('if-modified-since');
  const modified = headers.get('last-modified');
  const unchanged = condition
    ? condition.split(',').some((tag) => tag.trim() === '*' || (etag && tag.trim().replace(/^W\//, '') === etag.replace(/^W\//, '')))
    : modifiedSince && modified && Date.parse(modified) <= Date.parse(modifiedSince);
  if (response.status === 200 && unchanged) {
    headers.delete('content-length');
    return new Response(null, { status: 304, headers });
  }
  return new Response(request.method === 'HEAD' ? null : response.body, {
    status: response.status, statusText: response.statusText, headers,
  });
}

export async function cachedPublicResponse(
  request: Request,
  policy: PublicCachePolicy,
  load: () => Promise<Response>,
  waitUntil: (promise: Promise<unknown>) => void,
): Promise<Response> {
  // Credentials, partial content and non-read requests never enter this shared cache.
  const bypass = !['GET', 'HEAD'].includes(request.method) ||
    ['authorization', 'cookie', 'range', 'if-range'].some((name) => request.headers.has(name));
  const cache = typeof caches !== 'undefined' ? caches.default : undefined;
  // Versioned key prevents incompatible responses from an older cache policy being reused.
  const keyUrl = new URL(request.url);
  keyUrl.searchParams.set('__edgelink_public_cache', 'v1');
  const key = new Request(keyUrl.toString(), { method: 'GET' });
  if (!bypass && cache) {
    try {
      const hit = await cache.match(key);
      if (hit) return clientResponse(request, hit, 'HIT');
    } catch { /* A cache outage must not take public files offline. */ }
  }

  let response = await load();
  const headers = new Headers(response.headers);
  // Pages can return its SPA HTML for a missing file. Do not cache it as JavaScript/image.
  if (response.status === 200 && !policy.contentType.test(headers.get('content-type') || '')) {
    return clientResponse(request, new Response('Not found', {
      status: 404, headers: { 'Cache-Control': 'no-store', 'Content-Type': 'text/plain; charset=utf-8' },
    }), 'BYPASS');
  }
  const vary = (headers.get('vary') || '').split(',').map((name) => name.trim().toLowerCase()).filter(Boolean);
  const safe = !bypass && response.status === 200 && !headers.has('set-cookie') &&
    !/(?:^|[,\s])(?:private|no-store)(?:[,\s=]|$)/i.test(headers.get('cache-control') || '') &&
    vary.every((name) => name === 'accept-encoding');
  if (!safe) {
    headers.set('Cache-Control', 'no-store');
    response = new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    return clientResponse(request, response, 'BYPASS');
  }

  headers.set('Cache-Control', publicCacheControl(policy));
  // Upstream cache status describes Pages, not this cache. Never manufacture CF-Cache-Status.
  headers.delete('cf-cache-status');
  headers.delete('age');
  response = new Response(response.body, { status: 200, headers });
  if (cache) waitUntil(cache.put(key, response.clone()).catch(() => {}));
  return clientResponse(request, response, cache ? 'MISS' : 'BYPASS');
}
