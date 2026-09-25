// Genera scripts/sample-data.json para desarrollo local (npm run seed:local).
import { writeFileSync } from 'node:fs';
import { buildHallOfFame } from '../src/transform.js';
import { client, hof } from '../test/fixtures.js';

const people = [
  ['Laura Gómez', 8], ['Pau Serra', 6], ['Marta Ruiz', 5], ['Jordi Vidal', 4],
  ['Carla Martín', 3], ['Álex Romero', 2], ['Nuria Pons', 2], ['Sergio Ortega', 1],
  ['Iván Soler', 0], ['Clara Bosch', 0], ['Óscar Ferrer', 0], ['Lucía Navarro', 0], ['Hugo Castells', 0],
];
const logros = [
  ['Primer 10K por debajo de 50\'', 'Resistencia'], ['Peso muerto 2x peso corporal', 'Fuerza'],
  ['Reto 30 días sin fallar', 'Retos'], ['-6 kg de grasa manteniendo fuerza', 'Composición física'],
  ['90 días registrando sueño', 'Hábitos'], ['Media maratón completada', 'Resistencia'],
  ['10 dominadas estrictas', 'Fuerza'], ['Hyrox Doubles', 'Retos'],
];
const clients = [];
const rows = [];
people.forEach(([name, total], i) => {
  const id = `0000000${i}-0000-0000-0000-000000000000`;
  clients.push(client(id, name, total));
  const n = total === 0 ? 0 : Math.max(0, total - (i % 3 === 0 ? 2 : 1)); // resto = fidelidad
  for (let k = 0; k < n; k++) {
    const [t, c] = logros[(i + k) % logros.length];
    const m = String(((i * 3 + k * 2) % 12) + 1).padStart(2, '0');
    rows.push(hof(`r${i}-${k}`, t, id, c, `2026-${m}-${String(3 + k * 3).padStart(2, '0')}`));
  }
});
writeFileSync(new URL('./sample-data.json', import.meta.url), JSON.stringify(buildHallOfFame(clients, rows, { minMedals: 0 }), null, 2));
console.log('sample-data.json listo');
