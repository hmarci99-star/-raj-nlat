import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  KERDESEK, kerdesIndex, valaszErtelmez, parancs, szamKeres, igenNem, tobbAdat,
  kovetkezoIndex, elozoIndex, beallitasok, kerdesSzoveg, alapErtek,
} from '../src/hangos.js';
import { uresProjekt } from '../src/munkadij.js';

const k = (id) => KERDESEK[kerdesIndex(id)];
const projekt = (felulir = {}) => {
  const p = uresProjekt();
  return { ...p, ...felulir, kiallasok: { ...p.kiallasok, ...felulir.kiallasok }, szerelvenyek: { ...p.szerelvenyek, ...felulir.szerelvenyek } };
};

test('minden kérdés azonosítója egyedi, és a mezők léteznek a projektben', () => {
  const ids = KERDESEK.map((q) => q.id);
  assert.equal(new Set(ids).size, ids.length);
  const p = uresProjekt();
  for (const q of KERDESEK.filter((x) => x.mezo)) {
    const [a, b] = q.mezo.split('.');
    assert.ok(b ? b in p[a] : a in p, q.mezo);
  }
});

test('parancsok', () => {
  assert.equal(parancs('vissza'), 'vissza');
  assert.equal(parancs('hagyd ki ezt'), 'kihagy');
  assert.equal(parancs('Mennyi a végösszeg?'), 'osszeg');
  assert.equal(parancs('Vége utca 3', true), null); // névnél/címnél csak a teljes válasz parancs
  assert.equal(parancs('vége', true), 'stop');
  assert.equal(parancs('kettő'), null);
});

test('számok és igen/nem', () => {
  assert.equal(szamKeres('kettő'), 2);
  assert.equal(szamKeres('szerintem három lesz'), 3);
  assert.equal(szamKeres('két és fél méter'), 2.5);
  assert.equal(szamKeres('12 méter'), 12);
  assert.equal(igenNem('igen, kell'), true);
  assert.equal(igenNem('nem kell'), false);
  assert.equal(igenNem('talán'), null);
});

test('számos kérdés: szám, nincs, "jó" az alapértékkel', () => {
  const q = k('wc');
  assert.deepEqual(valaszErtelmez('három', q, 2), { ertek: 3 });
  assert.deepEqual(valaszErtelmez('nincs', q, 2), { ertek: 0 });
  assert.deepEqual(valaszErtelmez('egy sem', q, 2), { ertek: 0 });
  assert.deepEqual(valaszErtelmez('jó', q, 2), { ertek: 2 });
  assert.deepEqual(valaszErtelmez('jó', k('kiallas-kad'), null), { ismeretlen: true });
  assert.deepEqual(valaszErtelmez('vissza', q, 2), { parancs: 'vissza' });
});

test('választás: hőtermelő és mosdó típus', () => {
  assert.deepEqual(valaszErtelmez('gázkazán lesz', k('hotermelo')), { ertek: 'gaz' });
  assert.deepEqual(valaszErtelmez('vegyes tüzelésű', k('hotermelo')), { ertek: 'vegyes' });
  assert.deepEqual(valaszErtelmez('hőszivattyú', k('hotermelo')), { ertek: 'hoszivattyu' });
  assert.deepEqual(valaszErtelmez('nincs', k('hotermelo')), { ertek: 'nincs' });
  assert.deepEqual(valaszErtelmez('bútoros', k('mosdo-tipus')), { ertek: 'mosdo_butoros' });
  const p = projekt({ kiallasok: { mosdo: 2 } });
  assert.deepEqual(beallitasok(k('mosdo-tipus'), 'mosdo_butoros', p), [
    ['szerelvenyek.mosdo_sima', 0], ['szerelvenyek.mosdo_butoros', 2], ['szerelvenyek.mosdo_dupla', 0]]);
});

test('szabad szöveg: név nagybetűvel, "nincs" üres', () => {
  assert.deepEqual(valaszErtelmez('kovács anna', k('ugyfel-nev')), { ertek: 'Kovács anna' });
  assert.deepEqual(valaszErtelmez('nincs', k('ugyfel-cim')), { ertek: '' });
});

test('több adat egy mondatban', () => {
  assert.deepEqual(tobbAdat('két WC, egy mosógép, hat radiátor és két padlófűtés kör').map((x) => [x.mezo, x.ertek]), [
    ['kiallasok.wc_tartaly', 2], ['kiallasok.mosogep', 1], ['radiatorKiallas', 6], ['padlofutesKor', 2]]);
  assert.deepEqual(tobbAdat('három darab kádat').map((x) => [x.mezo, x.ertek]), [['kiallasok.kad', 3]]);
  assert.deepEqual(tobbAdat('kettő'), []);
});

test('a kérdések sora csak a releváns kérdéseket teszi fel', () => {
  const ures = projekt();
  const sorrend = (p, megv) => {
    const ids = [];
    for (let i = 0; i >= 0 && ids.length < 60; i = kovetkezoIndex(i, p, undefined, megv)) ids.push(KERDESEK[i].id);
    return ids;
  };
  const alap = sorrend(ures);
  assert.ok(!alap.includes('wc') && !alap.includes('kabin') && !alap.includes('puffer'));
  assert.ok(alap.includes('plusz-van') && alap.includes('ugyfel-nev'));
  assert.ok(!alap.includes('plusz-mondd'));

  const p = projekt({ kiallasok: { wc_tartaly: 2, zuhanyzo: 1 }, hotermelo: 'vegyes' });
  const teljes = sorrend(p);
  for (const id of ['wc', 'kabin', 'sullyesztett', 'csaptelep', 'puffer']) assert.ok(teljes.includes(id), id);

  // amit egy mondatból már megkaptunk, azt nem kérdezi újra
  const megv = new Set(['kiallasok.kad', 'radiatorKiallas']);
  const rovid = sorrend(p, megv);
  assert.ok(!rovid.includes('kiallas-kad') && !rovid.includes('radiator'));
});

test('elágazás a plusz tételeknél, és visszalépés', () => {
  const p = projekt();
  const i = kerdesIndex('plusz-van');
  assert.equal(KERDESEK[kovetkezoIndex(i, p, true)].id, 'plusz-mondd');
  assert.equal(KERDESEK[kovetkezoIndex(i, p, false)].id, 'ugyfel-nev');
  assert.equal(KERDESEK[kovetkezoIndex(kerdesIndex('plusz-meg'), p, true)].id, 'plusz-mondd');
  assert.equal(KERDESEK[elozoIndex(kerdesIndex('ugyfel-nev'), p)].id, 'plusz-van');
});

test('kérdés szövege és alapérték a már beírt értékkel', () => {
  const p = projekt({ kiallasok: { wc_tartaly: 2 }, radiatorKiallas: 5 });
  assert.equal(alapErtek(k('wc'), p), 2);
  assert.match(kerdesSzoveg(k('wc'), p), /Ha 2 darabot, mondd: jó/);
  assert.match(kerdesSzoveg(k('radiator'), p), /Most 5 van/);
  assert.equal(alapErtek(k('radiator'), p), 5);
});

test('hangos mód: a listából eltávolított tételre nem kérdez rá', async () => {
  const { KERDESEK, kovetkezoIndex } = await import('../src/hangos.js');
  const i = KERDESEK.findIndex((k) => k.mezo === 'kiallasok.mosdo');
  const p = { ...uresProjekt(), rejtett: ['kiallasok.konyha'] };
  const j = kovetkezoIndex(i, p);
  assert.notEqual(KERDESEK[j].mezo, 'kiallasok.konyha');
});
