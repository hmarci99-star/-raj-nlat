import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ugyfelAjanlatHtml, belsoOsszesitoHtml, datumSzoveg, hozzaadNap, fajlnev } from '../src/sablonok.js';
import { ajanlat } from '../src/arak.js';

const munkadij = {
  sorok: [{ tetel: 'WC felszerelés', egyseg: 'db', egysegar: 20000, mennyiseg: 2, osszeg: 40000, megjegyzes: '' }],
  osszesen: 40000,
};
const anyagSorok = [{ cikk: 'Rehau PX 20 T-idom', egyseg: 'db', mennyiseg: 2 }];
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

test('e-mail az ügyfélnek: címzett, tárgy, összesítés, érvényesség, aláírás', async () => {
  const { ugyfelLevel, mailtoLink } = await import('../src/sablonok.js');
  const l = ugyfelLevel(a, {
    ...adatok,
    vallalkozo: { ...adatok.vallalkozo, telefon: '+36 30 123 4567' },
    ugyfel: { nev: 'Kovács Anna', cim: 'Szeged', email: ' anna@example.com ' },
  });
  assert.equal(l.cimzett, 'anna@example.com');
  assert.equal(l.targy, 'Árajánlat – 2026/012 – Szeged');
  assert.match(l.szoveg, /^Tisztelt Kovács Anna!/);
  assert.match(l.szoveg, /Munkadíj: 40 000 Ft/);
  assert.match(l.szoveg, /Anyag: 4 200 Ft/);
  assert.match(l.szoveg, /Fizetendő végösszeg: 44 200 Ft/);
  assert.match(l.szoveg, /2026\. december 10-ig érvényes/);
  assert.match(l.szoveg, /Üdvözlettel:\nMinta Szerelő\n\+36 30 123 4567$/);
  const m = mailtoLink(l);
  assert.ok(m.startsWith('mailto:anna@example.com?subject='));
  assert.equal(decodeURIComponent(m.split('&body=')[1]), l.szoveg);
  assert.match(ugyfelLevel(a, {}).szoveg, /^Tisztelt Megrendelő!/);
});

test('Google Naptár link: felmérés időpontra, kivitelezés egész napos', async () => {
  const { naptarLink, foglalasiLinkHibas } = await import('../src/sablonok.js');
  const adatok = { ugyfel: { nev: 'Kiss Anna', cim: 'Szeged, Fő u. 1.' }, ajanlat: { idopontTipus: 'felmeres', idopont: '2026-12-03T16:30', idotartam: 1.5, szam: 'A-12' } };
  const u = new URL(naptarLink(adatok, 1250000));
  assert.equal(u.searchParams.get('text'), 'Felmérés – Kiss Anna');
  assert.equal(u.searchParams.get('dates'), '20261203T163000/20261203T180000');
  assert.equal(u.searchParams.get('ctz'), 'Europe/Budapest');
  assert.equal(u.searchParams.get('location'), 'Szeged, Fő u. 1.');
  assert.match(u.searchParams.get('details'), /Végösszeg: 1\s250\s000 Ft/);
  const k = new URL(naptarLink({ ...adatok, ajanlat: { idopontTipus: 'kivitelezes', idopont: '2026-12-30T07:00', idotartam: 3 } }));
  assert.equal(k.searchParams.get('dates'), '20261230/20270102');
  assert.equal(k.searchParams.get('ctz'), null);
  assert.equal(naptarLink({ ajanlat: {} }), null);
  assert.ok(foglalasiLinkHibas('https://calendar.google.com/calendar/u/0/r/appointment?hl=hu&pli=1'));
  assert.ok(!foglalasiLinkHibas('https://calendar.app.google/AbC123'));
});

test('foglalási link az ügyfél levelében és PDF-jében, a hibás szerkesztőoldal-link nem', async () => {
  const { ugyfelLevel, ugyfelAjanlatHtml } = await import('../src/sablonok.js');
  const jo = { vallalkozo: { nev: 'Szerelő', foglalas: 'https://calendar.app.google/AbC123' }, ugyfel: {}, ajanlat: {} };
  assert.match(ugyfelLevel(a, jo).szoveg, /Időpontot itt foglalhat.*calendar\.app\.google\/AbC123/);
  const rossz = { ...jo, vallalkozo: { foglalas: 'https://calendar.google.com/calendar/u/0/r/appointment' } };
  assert.doesNotMatch(ugyfelLevel(a, rossz).szoveg, /foglalhat/);
  assert.match(ugyfelAjanlatHtml(a, jo), /Időpontfoglalás/);
});

test('foglalási üzenet az ügyfélnek', async () => {
  const { foglalasUzenet } = await import('../src/sablonok.js');
  const u = foglalasUzenet({ nev: 'Szerelő Sanyi', telefon: '+36 30 123 4567', foglalas: 'https://calendar.app.google/AbC' }, 'Kiss Anna');
  assert.match(u, /^Tisztelt Kiss Anna!/);
  assert.match(u, /időpontot a helyszíni felméréshez: https:\/\/calendar\.app\.google\/AbC/);
  assert.match(u, /Szerelő Sanyi\n\+36 30 123 4567$/);
  assert.match(foglalasUzenet({ foglalas: 'x' }), /^Jó napot kívánok!/);
});

test('saját foglalási üzenet: sablonná alakítás és visszatöltés más ügyfélre', async () => {
  const { foglalasSablonba, foglalasSablonbol } = await import('../src/sablonok.js');
  const link = 'https://calendar.app.google/AbC';
  const atirt = `Tisztelt Kiss Anna!\n\nKérem, itt foglaljon időpontot: ${link}\nKöszönöm!`;
  const sablon = foglalasSablonba(atirt, link, 'Kiss Anna');
  assert.equal(sablon, 'Tisztelt {nev}!\n\nKérem, itt foglaljon időpontot: {link}\nKöszönöm!');
  assert.equal(foglalasSablonbol(sablon, 'https://x.y/z', 'Nagy Béla'), 'Tisztelt Nagy Béla!\n\nKérem, itt foglaljon időpontot: https://x.y/z\nKöszönöm!');
  assert.match(foglalasSablonbol(sablon, link, ''), /^Jó napot kívánok!/);
  // név nélkül írt szöveg: a "Jó napot kívánok!" megszólítás névre cserélhető marad
  assert.equal(foglalasSablonba(`Jó napot kívánok!\n${link}`, link, ''), 'Tisztelt {nev}!\n{link}');
});
