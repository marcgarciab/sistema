// Páginas simuladas con la forma exacta de la API de Notion 2022-06-28.
const title = (t) => ({ type: 'title', title: [{ plain_text: t }] });
const fNum = (n) => ({ type: 'formula', formula: { type: 'number', number: n } });
const fStr = (s) => ({ type: 'formula', formula: { type: 'string', string: s } });
const rankFor = (n) => (n >= 7 ? 'Fundador 1%' : n >= 5 ? 'Leyenda 1%' : n >= 3 ? 'Atleta de Élite' : n >= 1 ? 'Atleta 1%' : '—');

export function client(id, name, total, estado = 'Activo', rango = rankFor(total)) {
  return {
    object: 'page',
    id,
    archived: false,
    properties: {
      Nombre: title(name),
      Estado: { type: 'select', select: { name: estado } },
      'Total Medallas Club': fNum(total),
      'Rango Hall of Fame': fStr(rango),
      Email: { type: 'email', email: 'no-debe-salir@example.com' },
    },
  };
}

export function hof(id, logro, clientId, categoria, fecha) {
  return {
    object: 'page',
    id,
    archived: false,
    properties: {
      Logro: title(logro),
      Cliente: { type: 'relation', relation: [{ id: clientId }] },
      'Categoría': { type: 'select', select: categoria ? { name: categoria } : null },
      Fecha: { type: 'date', date: fecha ? { start: fecha, end: null } : null },
    },
  };
}
