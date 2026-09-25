const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

async function notionFetch(token, path, body, attempt = 0) {
  const res = await fetch(`${NOTION_API}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  // Límite de Notion: ~3 req/s. Reintento con Retry-After / backoff.
  if ((res.status === 429 || res.status >= 500) && attempt < 4) {
    const wait = Number(res.headers.get('Retry-After')) * 1000 || 500 * 2 ** attempt;
    await new Promise((r) => setTimeout(r, wait));
    return notionFetch(token, path, body, attempt + 1);
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Notion ${path} → ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

/** Devuelve todas las páginas de una base de datos (paginando de 100 en 100). */
export async function queryAll(token, databaseId, extra = {}) {
  const results = [];
  let cursor;
  do {
    const data = await notionFetch(token, `/databases/${databaseId}/query`, {
      page_size: 100,
      ...extra,
      ...(cursor ? { start_cursor: cursor } : {}),
    });
    results.push(...data.results);
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  return results;
}
