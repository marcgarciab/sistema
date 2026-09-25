import { RANKS, resolveRank, nextRank } from './ranks.js';

// ---- Lectura de propiedades de Notion (API 2022-06-28) ----

export function plainText(prop) {
  if (!prop) return '';
  const arr = prop.title || prop.rich_text || [];
  return arr.map((t) => t.plain_text || '').join('').trim();
}

export function numberValue(prop) {
  if (!prop) return 0;
  if (prop.type === 'number') return prop.number ?? 0;
  if (prop.type === 'formula') {
    const f = prop.formula || {};
    if (f.type === 'number') return f.number ?? 0;
    if (f.type === 'string') return Number(f.string) || 0;
  }
  if (prop.type === 'rollup' && prop.rollup?.type === 'number') return prop.rollup.number ?? 0;
  return 0;
}

export function stringValue(prop) {
  if (!prop) return '';
  if (prop.type === 'formula') {
    const f = prop.formula || {};
    if (f.type === 'string') return f.string || '';
    if (f.type === 'number') return f.number == null ? '' : String(f.number);
  }
  if (prop.type === 'select') return prop.select?.name || '';
  return plainText(prop);
}

export function formatName(name, format) {
  if (format !== 'first_initial') return name;
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return name;
  return `${parts[0]} ${parts[1][0].toUpperCase()}.`;
}

// ---- Construcción del JSON que se guarda en KV ----

/**
 * @param {object[]} clientPages   páginas de la base Clientes
 * @param {object[]} hofPages      páginas de la base Hall of Fame
 * @param {{minMedals?: number, nameFormat?: string, now?: Date}} opts
 */
export function buildHallOfFame(clientPages, hofPages, opts = {}) {
  const minMedals = Number.isFinite(opts.minMedals) ? opts.minMedals : 1;
  const nameFormat = opts.nameFormat || 'full';

  // Agrupar logros por cliente (una fila puede apuntar a varios clientes).
  const byClient = new Map();
  for (const p of hofPages) {
    if (p.archived || p.in_trash) continue;
    const props = p.properties || {};
    const achievement = {
      id: p.id,
      title: plainText(props['Logro']) || 'Logro',
      category: props['Categoría']?.select?.name || null,
      date: props['Fecha']?.date?.start || null,
    };
    for (const rel of props['Cliente']?.relation || []) {
      const id = rel.id.replace(/-/g, '');
      if (!byClient.has(id)) byClient.set(id, []);
      byClient.get(id).push(achievement);
    }
  }

  const clients = [];
  for (const p of clientPages) {
    if (p.archived || p.in_trash) continue;
    const props = p.properties || {};
    const name = plainText(props['Nombre']);
    if (!name) continue;
    const total = Math.max(0, Math.round(numberValue(props['Total Medallas Club'])));
    if (total < minMedals) continue;

    const rank = resolveRank(stringValue(props['Rango Hall of Fame']), total);
    const achievements = (byClient.get(p.id.replace(/-/g, '')) || [])
      .slice()
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const next = nextRank(total);
    const rankIdx = rank ? RANKS.findIndex((r) => r.key === rank.key) : -1;
    // Tramo de progreso: desde el umbral del rango actual hasta el siguiente.
    const floor = rankIdx >= 0 ? RANKS[rankIdx].min : 0;

    clients.push({
      id: p.id,
      name: formatName(name, nameFormat),
      total,
      rank: rank ? { key: rank.key, name: rank.name } : null,
      // Rangos inferiores superados en el camino (de mayor a menor).
      passed: rankIdx > 0 ? RANKS.slice(0, rankIdx).reverse().map((r) => ({ key: r.key, name: r.name })) : [],
      next: next
        ? {
            key: next.key,
            name: next.name,
            remaining: next.min - total,
            progress: Math.min(1, Math.max(0, (total - floor) / (next.min - floor))),
          }
        : null,
      // Medallas de fidelidad: están en el total pero no como filas del Hall of Fame.
      loyalty: Math.max(0, total - achievements.length),
      achievements,
      lastDate: achievements[0]?.date || null,
    });
  }

  clients.sort(
    (a, b) =>
      b.total - a.total ||
      (b.rank ? 1 : 0) - (a.rank ? 1 : 0) ||
      a.name.localeCompare(b.name, 'es'),
  );

  // Ranking de competición: empates comparten posición (1, 2, 2, 4…).
  clients.forEach((c, i) => {
    c.position = i > 0 && clients[i - 1].total === c.total ? clients[i - 1].position : i + 1;
  });

  const totalMedals = clients.reduce((s, c) => s + c.total, 0);
  const top = clients[0]?.rank || null;

  return {
    version: 1,
    updatedAt: (opts.now || new Date()).toISOString(),
    stats: { athletes: clients.length, medals: totalMedals, topRank: top },
    clients,
  };
}
