import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aiUzenet, aiUtofeldolgozas, hasznaltRendszerek, AI_SEMA } from '../src/ai.js';

const ismertek = new Map([
  ['Rehau Rautitan Stabil cső 20x2,9 mm', 'fm'],
  ['Rehau PX 20 könyök', 'db'],
  ['Pipelife KAEM lefolyócső 50/0,5 m', 'db'],
  ['Grohe Rapid SL WC-tartály (nyomólap nélkül)', 'db'],
]);

test('használt rendszerek a nevekből', () => {
  const r = hasznaltRendszerek([...ismertek.keys()]);
  assert.ok(r.includes('Rehau PX'));
  assert.ok(r.includes('Pipelife KAEM'));
  assert.ok(r.includes('Grohe'));
});

test('az üzenetben benne vannak a csomagok, a rendszerek és az elutasítottak', () => {
  const u = aiUzenet({
    leiras: 'Fürdő', projekt: ['WC-tartály: 1'],
    csomagok: [{ nev: 'WC-tartály', db: 1, anyag: [{ cikk: 'Rehau PX 20 könyök', mennyiseg: 2, egyseg: 'db' }] }],
    anyaglista: [], ismertNevek: [...ismertek].map(([cikk, egyseg]) => ({ cikk, egyseg })), elutasitott: ['Teflon szalag'],
  });
  assert.match(u, /WC-tartály × 1 – egy kiállás csomagja: Rehau PX 20 könyök 2 db/);
  assert.match(u, /Használt rendszerek és márkák:\n(- .*\n)*- Rehau PX/);
  assert.match(u, /Elutasított javaslatok \(ne javasold újra\):\n- Teflon szalag/);
});

test('utófeldolgozás: ismert névre igazít, elutasítottat kiszűr, duplát összevon, biztosat előre', () => {
  const v = aiUtofeldolgozas([
    { cikk: 'rehau 20-as cső', mennyiseg: 3, egyseg: 'm', indok: 'a', ismert: false, biztos: 'valoszinu' },
    { cikk: 'Rehau Rautitan Stabil cső 20x2,9 mm', mennyiseg: 2, egyseg: 'fm', indok: 'b', ismert: true, biztos: 'valoszinu' },
    { cikk: 'Teflon szalag', mennyiseg: 1, egyseg: 'db', indok: 'c', ismert: false, biztos: 'biztos' },
    { cikk: 'Geberit Sigma01 nyomólap', mennyiseg: 1, egyseg: 'db', indok: 'd', ismert: false, biztos: 'biztos' },
  ], ismertek, ['teflon szalag']);
  assert.deepEqual(v.map((x) => [x.cikk, x.mennyiseg, x.egyseg, x.ismert, x.biztos]), [
    ['Geberit Sigma01 nyomólap', 1, 'db', false, 'biztos'],
    ['Rehau Rautitan Stabil cső 20x2,9 mm', 5, 'fm', true, 'valoszinu'],
  ]);
});

test('a séma minden objektumnál tiltja a plusz mezőket (strukturált kimenet feltétele)', () => {
  assert.equal(AI_SEMA.additionalProperties, false);
  assert.equal(AI_SEMA.properties.javaslatok.items.additionalProperties, false);
});
