// Rangos del Hall of Fame, de menor a mayor. `min` = medallas necesarias.
export const RANKS = [
  { key: 'atleta', name: 'Atleta 1%', min: 1 },
  { key: 'elite', name: 'Atleta de Élite', min: 3 },
  { key: 'leyenda', name: 'Leyenda 1%', min: 5 },
  { key: 'fundador', name: 'Fundador 1%', min: 7 },
];

const norm = (s) =>
  String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// El rango viene ya resuelto por la fórmula de Notion; aquí solo se identifica
// (tolerando emojis o espacios extra). Si no se reconoce, se deduce del total.
export function resolveRank(label, total) {
  const n = norm(label);
  // Del más alto al más bajo: "atleta de elite" contiene "atleta".
  for (const r of [...RANKS].reverse()) {
    if (n.includes(norm(r.name))) return r;
  }
  if (n.trim() && n.trim() !== '—' && n.trim() !== '-') {
    // Etiqueta desconocida: se mantiene el texto de Notion pero con el nivel por total.
    const byTotal = rankForTotal(total);
    return byTotal ? { ...byTotal, name: label.trim() } : null;
  }
  return null;
}

export function rankForTotal(total) {
  let found = null;
  for (const r of RANKS) if (total >= r.min) found = r;
  return found;
}

export function nextRank(total) {
  return RANKS.find((r) => total < r.min) || null;
}
