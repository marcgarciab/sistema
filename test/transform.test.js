import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHallOfFame } from '../src/transform.js';
import { resolveRank } from '../src/ranks.js';
import { client, hof } from './fixtures.js';

const A = '11111111-1111-1111-1111-111111111111';
const B = '22222222-2222-2222-2222-222222222222';
const C = '33333333-3333-3333-3333-333333333333';
const D = '44444444-4444-4444-4444-444444444444';

const clients = [
  client(A, 'Laura Gómez', 3),
  client(B, 'Pau Serra', 8, 'Inactivo'),
  client(C, 'Sin Medallas', 0),
  client(D, 'Marta Ruiz', 3),
];
const rows = [
  hof('r1', 'Primer 10K', A, 'Resistencia', '2026-03-01'),
  hof('r2', 'Sentadilla 1.5x BW', A, 'Fuerza', '2026-05-10'),
  hof('r3', 'Media maratón', B.replace(/-/g, ''), 'Resistencia', '2026-01-20'),
];

test('ordena por total, empates comparten posición, incluye inactivos', () => {
  const d = buildHallOfFame(clients, rows);
  assert.deepEqual(d.clients.map((c) => [c.name, c.position]), [
    ['Pau Serra', 1],
    ['Laura Gómez', 2],
    ['Marta Ruiz', 2],
  ]);
  assert.equal(d.stats.medals, 14);
  assert.equal(d.stats.topRank.key, 'fundador');
});

test('rango, rangos superados, siguiente rango y fidelidad', () => {
  const d = buildHallOfFame(clients, rows);
  const laura = d.clients.find((c) => c.name === 'Laura Gómez');
  assert.equal(laura.rank.name, 'Atleta de Élite');
  assert.deepEqual(laura.passed.map((r) => r.key), ['atleta']);
  assert.deepEqual([laura.next.name, laura.next.remaining], ['Leyenda 1%', 2]);
  assert.equal(laura.next.progress, 0);
  assert.equal(laura.loyalty, 1);
  assert.deepEqual(laura.achievements.map((a) => a.title), ['Sentadilla 1.5x BW', 'Primer 10K']);

  const pau = d.clients[0];
  assert.equal(pau.next, null);
  assert.deepEqual(pau.passed.map((r) => r.key), ['leyenda', 'elite', 'atleta']);
});

test('no filtra datos personales al JSON público', () => {
  const s = JSON.stringify(buildHallOfFame(clients, rows));
  assert.ok(!s.includes('example.com'));
  assert.ok(!s.includes('Inactivo'));
});

test('MIN_MEDALS=0 muestra todos; formato nombre + inicial', () => {
  const d = buildHallOfFame(clients, rows, { minMedals: 0, nameFormat: 'first_initial' });
  assert.equal(d.clients.length, 4);
  assert.ok(d.clients.some((c) => c.name === 'Laura G.'));
  const none = d.clients.find((c) => c.name === 'Sin M.');
  assert.equal(none.rank, null);
  assert.deepEqual([none.next.name, none.next.remaining], ['Atleta 1%', 1]);
});

test('resolveRank tolera emojis/acentos y "—"', () => {
  assert.equal(resolveRank('🏆 Fundador 1%', 7).key, 'fundador');
  assert.equal(resolveRank('Atleta de Elite', 3).key, 'elite');
  assert.equal(resolveRank('—', 0), null);
});
