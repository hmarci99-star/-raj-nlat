import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ugyfelAjanlatHtml, belsoOsszesitoHtml, datumSzoveg, hozzaadNap, fajlnev } from '../src/sablonok.js';
import { ajanlat } from '../src/arak.js';

const munkadij = {
  sorok: [{ tetel: 'WC felszerelés', egyseg: 'db', egysegar: 20000, mennyiseg: 2, osszeg: 40000, megjegyzes: '' }],
  osszesen: 40000,
};
const anyagSorok = [{ cikk: 'Rehau PX 20 T-idom', egyseg: 'db', mennyiseg: 2, cikkszam: '' }];
const sz = (x) => new RegExp(x.replace(/ /g, '\\s'));
const a = ajanlat(munkadij, anyagSorok, { 'Rehau PX 20 T-idom|db': { bolti: 2100, kedvezmenyes: 1600 } });
const adatok = {
  vallalkozo: { nev: 'Minta Szerelő', cim: '1111 Budapest, Fő u. 1.', adoszam: '12345678-1-41' },
  ugyfel: { nev: 'Kovács <Anna>', cim: 'Szeged' },
  ajanlat: { datum: '2026-11-25', ervenyesNap: 15, szam: '2026/012' },
};

test('dátumok', () => {
  assert.equal(datumSzoveg('2026-11-25'), '2026. november 25.');
  assert.equal(hozzaadNap('2026-11-25', 15), '2026-12-10');
  assert.equal(hozzaadNap('', 15), '');
});

test('ügyfélajánlat: bolti ár és végösszeg, kedvezményes ár és haszon nélkül', () => {
  const h = ugyfelAjanlatHtml(a, adatok);
  assert.match(h, /Árajánlat/);
  assert.match(h, sz('4 200 Ft')); // anyag bolti áron
  assert.match(h, sz('44 200 Ft')); // végösszeg
  assert.match(h, /Alanyi adómentes/);
  assert.match(h, /Érvényes: 2026\. december 10-ig/);
  assert.match(h, /a 2026\. november 25-i bolti árak/);
  assert.doesNotMatch(h, /1\s600|3\s200|Haszon|kedvezm/i);
  assert.match(h, /Kovács &lt;Anna&gt;/);
});

test('belső összesítő: beszerzés és haszon', () => {
  const h = belsoOsszesitoHtml(a, adatok);
  assert.match(h, /Belső összesítő/);
  assert.match(h, sz('3 200 Ft')); // beszerzés
  assert.match(h, sz('1 000 Ft')); // haszon
  assert.match(h, sz('41 000 Ft')); // munkadíj + haszon
  assert.doesNotMatch(h, /Érvényes/);
});

test('fájlnév', () => {
  assert.equal(fajlnev('Arajanlat', { ugyfel: { nev: 'Kovács Anna' }, ajanlat: { datum: '2026-11-25' } }),
    'Arajanlat_Kovács_Anna_2026-11-25');
  assert.equal(fajlnev('Arajanlat', {}), 'Arajanlat');
});
