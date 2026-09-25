import { queryAll } from './notion.js';
import { buildHallOfFame } from './transform.js';

const DATA_KEY = 'hof:data';
const LOCK_KEY = 'hof:bootstrap-lock';

// ---------------------------------------------------------------------------
// Sincronización Notion → KV (solo desde el Cron, /api/refresh o el arranque
// en frío con KV vacío). Las visitas normales nunca llaman a Notion.
// ---------------------------------------------------------------------------
export async function sync(env) {
  if (!env.NOTION_TOKEN) throw new Error('Falta el secret NOTION_TOKEN');
  // Todos los clientes, sin filtrar por Estado (los de baja siguen visibles).
  // Las filas del Hall of Fame se leen de una vez y se agrupan por cliente:
  // 1–2 peticiones en vez de una por cliente, y sin el límite de 25 relaciones.
  const [clientPages, hofPages] = await Promise.all([
    queryAll(env.NOTION_TOKEN, env.NOTION_CLIENTES_DB),
    queryAll(env.NOTION_TOKEN, env.NOTION_HOF_DB, {
      sorts: [{ property: 'Fecha', direction: 'descending' }],
    }),
  ]);
  const data = buildHallOfFame(clientPages, hofPages, {
    minMedals: Number(env.MIN_MEDALS ?? 1),
    nameFormat: env.NAME_FORMAT,
  });
  await env.HOF_KV.put(DATA_KEY, JSON.stringify(data));
  return data;
}

async function bootstrapOnce(env) {
  // KV vacío (primer despliegue): una única sincronización, protegida por un lock.
  if (await env.HOF_KV.get(LOCK_KEY)) return;
  await env.HOF_KV.put(LOCK_KEY, '1', { expirationTtl: 120 });
  try {
    await sync(env);
  } catch (err) {
    console.error('bootstrap sync failed', err);
  }
}

// ---------------------------------------------------------------------------

const json = (body, init = {}) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=60',
      ...init.headers,
    },
  });

// JSON seguro dentro de <script>.
const inlineJson = (obj) =>
  JSON.stringify(obj).replace(/</g, '\\u003c');

async function loadAssetsConfig(env, request) {
  try {
    const res = await env.ASSETS.fetch(new URL('/config/assets.json', request.url));
    if (res.ok) return await res.json();
  } catch {}
  return {};
}

async function renderPage(request, env, ctx) {
  const [raw, assetsConfig, page] = await Promise.all([
    env.HOF_KV.get(DATA_KEY),
    loadAssetsConfig(env, request),
    env.ASSETS.fetch(new URL('/index.html', request.url)),
  ]);
  if (!raw) ctx.waitUntil(bootstrapOnce(env));

  const payload = `window.__HOF__=${inlineJson({ data: raw ? JSON.parse(raw) : null, assets: assetsConfig })};`;
  const rewritten = new HTMLRewriter()
    .on('script#hof-data', { element: (el) => el.setInnerContent(payload, { html: true }) })
    .transform(page);

  const headers = new Headers(rewritten.headers);
  headers.set('content-type', 'text/html; charset=utf-8');
  headers.set('cache-control', 'public, max-age=60');
  headers.delete('etag');
  return new Response(rewritten.body, { status: 200, headers });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/' || url.pathname === '/index.html') {
      return renderPage(request, env, ctx);
    }

    if (url.pathname === '/api/hall-of-fame') {
      const raw = await env.HOF_KV.get(DATA_KEY);
      if (!raw) {
        ctx.waitUntil(bootstrapOnce(env));
        return json({ data: null }, { status: 503, headers: { 'retry-after': '30', 'cache-control': 'no-store' } });
      }
      return new Response(raw, {
        headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=60' },
      });
    }

    // Refresco manual opcional: curl -X POST -H "Authorization: Bearer $REFRESH_TOKEN" …/api/refresh
    if (url.pathname === '/api/refresh') {
      if (!env.REFRESH_TOKEN) return json({ error: 'disabled' }, { status: 404 });
      if (request.method !== 'POST') return json({ error: 'method' }, { status: 405 });
      if (request.headers.get('authorization') !== `Bearer ${env.REFRESH_TOKEN}`) {
        return json({ error: 'unauthorized' }, { status: 401 });
      }
      try {
        const data = await sync(env);
        return json({ ok: true, updatedAt: data.updatedAt, athletes: data.stats.athletes }, { headers: { 'cache-control': 'no-store' } });
      } catch (err) {
        return json({ ok: false, error: String(err.message || err) }, { status: 502, headers: { 'cache-control': 'no-store' } });
      }
    }

    // Resto de rutas bajo /api → 404; cualquier otra cosa, estático.
    if (url.pathname.startsWith('/api/')) return json({ error: 'not found' }, { status: 404 });
    return env.ASSETS.fetch(request);
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      sync(env).then(
        (d) => console.log(`Hall of Fame sync OK: ${d.stats.athletes} atletas, ${d.stats.medals} medallas`),
        (err) => {
          // Si falla, KV conserva la última versión buena.
          console.error('Hall of Fame sync failed', err);
          throw err;
        },
      ),
    );
  },
};
