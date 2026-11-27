import { parseMunkadijTabla } from './csv.js';
import { KIALLAS_TIPUSOK, SZERELVENY_KODOK, HOTERMELOK, szamolMunkadij, uresProjekt } from './munkadij.js';
import { parseKonyvtar, gyujtAnyaglista, anyaglistaSzoveg, gerincAlapAnyag } from './anyaglista.js';
import { boltValaszBeolvasas, ajanlat, tetelKulcs, parseSzam, nemTetelNev, anyagListaBeolvasas } from './arak.js';
import { bovitettKonyvtar, bennVanAzAlapban, konyvtarCsv, felulirtKonyvtar } from './konyvtar.js';
import { ugyfelAjanlatHtml, belsoOsszesitoHtml, fajlnev, ugyfelLevel, mailtoLink, naptarLink, foglalasiLinkHibas, foglalasUzenet, foglalasSablonbol, foglalasSablonba } from './sablonok.js';
import { pdfSzoveg } from './pdfszoveg.js';
import { diktaltTetelek, vanDiktalas, diktalas } from './diktalas.js';
import { hangosModInit } from './hangosfelulet.js';
import { ikon, MEZO_IKON } from './ikonok.js';
import { csempekInit, csempekFrissit } from './elrendezes.js';
import { hasonloNevek } from './nevek.js';
import { AI_RENDSZER, AI_SEMA, aiUzenet, aiUtofeldolgozas } from './ai.js';
import { osszevetes, memoriaRogzit, dragulasok, dragulasJel, becsles, mentesEsedekes } from './boltok.js';
import {
  ALLAPOTOK, SZUROK, allapotAdat, osszesites, szur, evek, profit, ujAzonosito, javasoltAllapot, exportAdat, importAdat,
} from './ajanlatok.js';

const MENTES_KULCS = 'arajanlat.projekt';
const ARAK_KULCS = 'arajanlat.arak';
const BOLTOK_KULCS = 'arajanlat.boltok';
const REJTETT_KULCS = 'arajanlat.rejtett-tetelek';
const FOGLALAS_SABLON_KULCS = 'arajanlat.foglalas-sablon';
const AI_KULCS = 'arajanlat.ai'; // { url, jelszo, modell } – csak ezen az eszközön, a mentésbe nem kerül
const AI_ELUTASITOTT_KULCS = 'arajanlat.ai-elutasitott'; // a be nem pipált javaslatok neve, hogy ne jöjjenek újra
const ARMEMORIA_KULCS = 'arajanlat.armemoria';
const MENTES_IDO_KULCS = 'arajanlat.utolso-mentes';
const MENTES_HALASZT_KULCS = 'arajanlat.mentes-halasztva';
const ADATOK_KULCS = 'arajanlat.adatok';
const PLUSZ_KULCS = 'arajanlat.plusz';
const PDF_MENNY_KULCS = 'arajanlat.pdf-mennyiseg';
const FELTOLTES_KULCS = 'arajanlat.feltoltesek';
const AJANLATOK_KULCS = 'arajanlat.ajanlatok';
const AKTUALIS_KULCS = 'arajanlat.aktualis-ajanlat';
// A munka adatai: ha ezek változnak és az ajánlat már el van mentve, magától frissül a mentés.
const MUNKA_KULCSOK = new Set([MENTES_KULCS, ARAK_KULCS, ADATOK_KULCS, PLUSZ_KULCS, PDF_MENNY_KULCS, FELTOLTES_KULCS]);
const BOVITES_KULCS = 'arajanlat.konyvtar-bovites';
const SAJAT_MUNKA_KULCS = 'arajanlat.sajat-munkak';
const KONYVTAR_FELULIR_KULCS = 'arajanlat.konyvtar-felulirasok';
const MUNKADIJ_FELULIR_KULCS = 'arajanlat.munkadij-felulirasok';
const GERINC_ANYAG_KULCS = 'arajanlat.gerinc-anyag';
const SAJAT_KIALLAS_KULCS = 'arajanlat.sajat-kiallasok';
const KIALLAS_NEV_KULCS = 'arajanlat.kiallas-nevek';
const KIALLAS_AR_KULCS = 'arajanlat.kiallas-arak';
const NEZET_KULCS = 'arajanlat.nezet';
const ft = new Intl.NumberFormat('hu-HU', { useGrouping: 'always' });
const $ = (id) => document.getElementById(id);
const form = $('projekt');

const allapot = {
  rejtett: [], // a listából eltávolított beépített tételek mezőnevei (pl. 'szerelvenyek.mosdo_dupla')
  boltok: [], // más boltok árajánlatai összevetéshez: [{ id, nev, fajl, arak: { kulcs: egységár }, datum }]
  armemoria: {}, // korábban látott árak: { kulcs: { bolti, kedvezmenyes, datum, elozo } }
  tabla: null,
  alapKonyvtar: null,
  konyvtar: null,
  bovitesek: [], // a könyvtárhoz a felületen hozzáadott sorok (az eszközön tárolva)
  // Egyéb (saját) munkák: { kod, tetel, egyseg, egysegar, megjegyzes, anyag: [{ cikk, mennyiseg, egyseg }] }
  sajatMunkak: [],
  konyvtarFelulirasok: {}, // a felületen szerkesztett kiállás-csomagok: { kiállás neve: [sorok] }
  munkadijFelulirasok: {}, // munkadíj-tételek módosítása: { kód: { tetel, egysegar, megjegyzes, anyag } }
  gerincAnyag: {}, // a gerinc anyaga 1 fm-re: { 16: [sorok], 20: [sorok] }
  sajatKiallasok: [], // a felületen felvett kiállástípusok: [{ kod, nev }]; csomagjuk a konyvtarFelulirasok-ban
  kiallasNevek: {}, // a beépített kiállások átnevezése: { kód: megjelenített név } (a csomag a régi néven marad)
  kiallasArak: {}, // kiállásonkénti saját munkadíj: { kód: Ft / kiállás } (alapból a vízszerelés alapszerelés ára)
  plusz: [], // az ajánlathoz kézzel vagy a bolt PDF-jéből hozzáadott tételek
  pdfMennyiseg: {}, // tétel -> a bolt PDF-je szerinti mennyiség, ha eltér a listától (ez az irányadó)
  // Feltöltésenként (bolti / kedvezmenyes / szoveg) mit írt be, hogy vissza lehessen vonni:
  // { fajl, mezok, arKulcsok, mennyisegek, pluszKulcsok, tetelek }
  feltoltesek: {},
  ajanlatok: [], // mentett ajánlatok
  aktualisId: null, // a most szerkesztett ajánlat azonosítója, ha el van mentve
  ajanlatSzuro: 'mind',
  ajanlatEv: 'mind',
  projekt: null,
  konyvtarbaNyitva: null,
  diktalt: [], // diktálással felismert, még fel nem vett tételek
  diktalasLeallit: null, // fut-e a diktálás (leállító függvény)
  diktalasUzenet: '',
  munkadij: null,
  anyag: { sorok: [], figyelmeztetesek: [] },
  arak: {},
  arTablaAlairas: '',
  adatok: {},
};

function escape(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}
const penz = (x) => (x === null || x === undefined ? '–' : `${ft.format(x)} Ft`);
const figyelmeztetesHtml = (lista) => lista.map((f) => `<p class="warn">${escape(f)}</p>`).join('');

function ment(kulcs, ertek) {
  try { localStorage.setItem(kulcs, JSON.stringify(ertek)); } catch { /* nem kötelező */ }
  if (MUNKA_KULCSOK.has(kulcs)) automentesUtemez();
}
function betoltMentett(kulcs) {
  try { return JSON.parse(localStorage.getItem(kulcs)); } catch { return null; }
}

// ---- Nézetek (lépések) ----

// Egyszerre egy lépés látszik: Projekt, Anyag, Árak, Ajánlat. A fülek és a
// "Tovább" gombok váltanak; az utoljára nyitott lépést megjegyzi.
const NEZETEK = ['projekt', 'anyag', 'arak', 'ajanlat', 'ajanlatok'];

function nezetValtas(nev, gorget = true) {
  if (!NEZETEK.includes(nev)) nev = 'projekt';
  for (const n of NEZETEK) $(`nezet-${n}`).hidden = n !== nev;
  for (const f of document.querySelectorAll('.ful')) {
    if (f.dataset.nezet === nev) f.setAttribute('aria-current', 'page');
    else f.removeAttribute('aria-current');
  }
  try { localStorage.setItem(NEZET_KULCS, nev); } catch { /* nem kötelező */ }
  if (gorget) window.scrollTo({ top: 0 });
}

function nezetek() {
  for (const f of document.querySelectorAll('.ful')) f.addEventListener('click', () => nezetValtas(f.dataset.nezet));
  for (const b of document.querySelectorAll('[data-ugras]')) b.addEventListener('click', () => nezetValtas(b.dataset.ugras));
  let mentett = null;
  try { mentett = localStorage.getItem(NEZET_KULCS); } catch { /* nincs */ }
  nezetValtas(mentett ?? 'projekt', false);
}

const kiir = (id, szoveg) => { const el = $(id); if (el) el.textContent = szoveg; };

// ---- Összecsukható mezőlisták ----

// A hosszú listákban (Szerelvények, Egyéb munkák) csukott állapotban csak a kitöltött sorok
// látszanak. Hogy szerkesztés közben ne tűnjön el egy sor, a becsukáskor kitöltött sorok
// ("marad") a következő becsukásig láthatók maradnak.
function listaAllitas(id, csukva) {
  const lista = $(id);
  const gomb = document.querySelector(`.tobb-gomb[data-lista="${id}"]`);
  if (!lista || !gomb) return;
  const sorok = [...lista.querySelectorAll(':scope > label')];
  if (csukva) for (const l of sorok) l.classList.toggle('marad', l.classList.contains('kitoltott'));
  lista.classList.toggle('csukva', csukva);
  const rejtett = sorok.filter((l) => !l.classList.contains('marad')).length;
  gomb.hidden = sorok.length === 0 || (csukva && rejtett === 0);
  gomb.setAttribute('aria-expanded', String(!csukva));
  const felirat = !csukva ? 'Kevesebb'
    : rejtett === sorok.length ? `${lista.dataset.cim} megadása (${sorok.length})` : `Továbbiak (${rejtett})`;
  gomb.innerHTML = `${escape(felirat)}<span class="nyil" aria-hidden="true"></span>`;
}

function listakCsukasa() {
  for (const id of ['kiallasok', 'futes-lista', 'gerinc-lista', 'szerelvenyek', 'egyeb']) listaAllitas(id, true);
}

// Egy (esetleg rejtett) mező megjelenítése, pl. a hangos kitöltésnél.
function mezoMutatasa(el) {
  const lista = el?.closest('.osszecsukhato.csukva');
  if (lista && !el.closest('label')?.classList.contains('marad')) listaAllitas(lista.id, false);
}

// ---- Egyéb (saját) munkák ----

// A munkadíj-táblázat a saját munkákkal kiegészítve.
function munkadijTabla() {
  const t = new Map(allapot.tabla);
  for (const [kod, f] of Object.entries(allapot.munkadijFelulirasok)) {
    const alap = t.get(kod);
    if (!alap) continue;
    t.set(kod, {
      ...alap,
      tetel: f.tetel || alap.tetel,
      egysegar: Number.isFinite(Number(f.egysegar)) && f.egysegar !== '' ? Number(f.egysegar) : alap.egysegar,
      megjegyzes: f.megjegyzes ?? alap.megjegyzes,
    });
  }
  // Kiállásonkénti saját munkadíj: külön sor "Vízszerelés alapszerelés – <kiállás>" néven.
  const alap = t.get('viz_alapszereles');
  for (const [kod, ar] of Object.entries(allapot.kiallasArak)) {
    const k = osszesKiallas().find((x) => x.kod === kod);
    if (!k || !alap) continue;
    t.set(`alapszereles:${kod}`, { kod: `alapszereles:${kod}`, tetel: `${alap.tetel} – ${kiallasCimke(k.nev)}`, egyseg: alap.egyseg, egysegar: Number(ar) || 0, megjegyzes: alap.megjegyzes ?? '' });
  }
  for (const m of allapot.sajatMunkak) {
    t.set(m.kod, { kod: m.kod, tetel: m.tetel, egyseg: m.egyseg, egysegar: Number(m.egysegar) || 0, megjegyzes: m.megjegyzes ?? '' });
  }
  return t;
}

const MUNKA_EGYSEGEK = ['db', 'óra', 'fm', 'm²', 'kör', 'alkalom', 'kiállás', 'nap'];
const ANYAG_EGYSEGEK = ['db', 'fm', 'pár', 'csomag', 'szett', 'kg', 'tekercs', 'doboz'];

// Az "Egyéb munkák" sorai a Projekt lépésben. ertekek: a megtartandó mennyiségek (alapból a mostaniak).
// A saját tételek kártyánként: egyéb munkák, fűtés, szerelvények, gerinc és külső szerelés.
const SAJAT_SZAKASZOK = {
  egyeb: { lista: 'egyeb', uj: 'Új munka', szerk: 'Munka szerkesztése', pelda: 'Pl. Hőcserélő csere', ikon: 'kalapacs' },
  futes: { lista: 'futes-lista', uj: 'Új fűtési tétel', szerk: 'Fűtési tétel szerkesztése', pelda: 'Pl. Termosztát bekötése', ikon: 'radiator' },
  szerelvenyek: { lista: 'szerelvenyek', uj: 'Új szerelvény', szerk: 'Szerelvény szerkesztése', pelda: 'Pl. Bidé csaptelep', ikon: 'csavarkulcs' },
  gerinc: { lista: 'gerinc-lista', uj: 'Új tétel', szerk: 'Tétel szerkesztése', pelda: 'Pl. Vízóraakna bekötés', ikon: 'cso' },
};
const munkaSzakasz = (m) => (SAJAT_SZAKASZOK[m?.szakasz] ? m.szakasz : 'egyeb');

// A saját tételek sorai a kártyájuk végén (a beépített sorok után). ertekek: a megtartandó mennyiségek.
function egyebFelepit(ertekek = olvas().egyeb) {
  for (const [szakasz, sz] of Object.entries(SAJAT_SZAKASZOK)) {
    const lista = $(sz.lista);
    if (!lista) continue;
    const voltCsukva = lista.classList.contains('csukva');
    lista.querySelectorAll(':scope > label[data-munka], :scope > .egyeb-ures').forEach((el) => el.remove());
    const sorok = allapot.sajatMunkak.filter((m) => munkaSzakasz(m) === szakasz).map((m) => `
    <label data-munka="${m.kod}"><span>${escape(m.tetel)}<small class="munka-ar">${ft.format(Number(m.egysegar) || 0)} Ft / ${escape(m.egyseg)}${
      m.anyag?.length ? ` · ${m.anyag.length} anyag` : ''}</small></span>
      <input type="number" min="0" step="any" name="egyeb.${m.kod}" value="${Number(ertekek?.[m.kod]) > 0 ? ertekek[m.kod] : ''}">
    </label>`).join('');
    if (sorok) lista.insertAdjacentHTML('beforeend', sorok);
    else if (szakasz === 'egyeb') lista.insertAdjacentHTML('beforeend', '<p class="muted egyeb-ures" style="margin:4px 0 0">Itt veheted fel a táblázatban nem szereplő munkákat (pl. hőcserélő csere) saját egységárral. Minden ajánlatnál használhatók.</p>');
    listaAllitas(sz.lista, voltCsukva);
  }
  leptetok();
  ikonozas();
  kitoltesJelolese();
  for (const sz of Object.values(SAJAT_SZAKASZOK)) {
    const lista = $(sz.lista);
    if (lista) listaAllitas(sz.lista, lista.classList.contains('csukva'));
  }
}

function ujMunkaKod(nev) {
  const alap = `sajat-${nev.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'munka'}`;
  let kod = alap;
  for (let i = 2; allapot.sajatMunkak.some((m) => m.kod === kod); i++) kod = `${alap}-${i}`;
  return kod;
}

// ---- Anyagsorok szerkesztése (egyéb munka és kiállás-csomag ablakában közös) ----

const anyagSor = (a = {}) => {
  const egysegek = ANYAG_EGYSEGEK.includes(a.egyseg ?? 'db') ? ANYAG_EGYSEGEK : [...ANYAG_EGYSEGEK, a.egyseg];
  return `<div class="anyag-sor">
      <input class="as-cikk" placeholder="Anyag megnevezése" aria-label="Anyag megnevezése" value="${escape(a.cikk ?? '')}">
      <input class="as-menny" type="number" min="0" step="any" aria-label="Mennyiség" value="${a.mennyiseg ?? 1}">
      <select class="as-egyseg" aria-label="Egység">${egysegek.map((e) => `<option${e === (a.egyseg ?? 'db') ? ' selected' : ''}>${escape(e)}</option>`).join('')}</select>
      <button type="button" class="kicsi button as-torles" aria-label="Anyag törlése">×</button>
    </div>`;
};

const anyagSzerkesztoHtml = (sorok) => `
      <div class="anyag-sorok">${sorok.map(anyagSor).join('')}</div>
      <div class="actions kicsi-gombok">
        <button type="button" class="kicsi button as-uj">+ Anyag</button>
        <label class="button kicsi fajl-gomb-kicsi" for="mu-pdf" data-ikon="feltolt">Anyag PDF-ből</label>
        <input type="file" id="mu-pdf" accept="application/pdf,.pdf" class="rejtett-fajl">
      </div>
      <p class="muted mu-pdf-uzenet" aria-live="polite"></p>`;

function anyagSorokOlvasasa(urlap) {
  return [...urlap.querySelectorAll('.anyag-sor')].map((sor) => ({
    cikk: sor.querySelector('.as-cikk').value.trim().replace(/\s+/g, ' '),
    mennyiseg: Number(sor.querySelector('.as-menny').value) || 0,
    egyseg: sor.querySelector('.as-egyseg').value,
  })).filter((a) => a.cikk && a.mennyiseg > 0);
}

// "+ Anyag", "×" és "Anyag PDF-ből" kezelése egy ablakban. Igaz, ha az eseményt kezelte.
function anyagSzerkesztoKattintas(ev, urlap) {
  if (ev.target.closest('.as-uj')) {
    urlap.querySelector('.anyag-sorok').insertAdjacentHTML('beforeend', anyagSor());
    urlap.querySelector('.anyag-sor:last-child .as-cikk').focus();
    return true;
  }
  if (ev.target.closest('.as-torles')) { ev.target.closest('.anyag-sor').remove(); return true; }
  return false;
}

function anyagPdfBekotes(urlap) {
  urlap.querySelector('#mu-pdf').addEventListener('change', async (ev) => {
    const fajl = ev.target.files?.[0];
    ev.target.value = '';
    if (!fajl) return;
    const uzenet = urlap.querySelector('.mu-pdf-uzenet');
    uzenet.textContent = `${fajl.name} beolvasása…`;
    try {
      const szoveg = await pdfSzoveg(fajl);
      const tetelek = anyagListaBeolvasas(szoveg);
      if (!tetelek.length) {
        uzenet.textContent = szoveg.trim()
          ? 'Nem találtam benne mennyiséggel megadott tételt (pl. „2 db”, „12 fm”).'
          : 'Ebben a PDF-ben nincs kiolvasható szöveg (valószínűleg szkennelt kép).';
        return;
      }
      const sorokEl = urlap.querySelector('.anyag-sorok');
      let uj = 0;
      for (const t of tetelek) {
        const egyseg = ANYAG_EGYSEGEK.includes(t.egyseg) ? t.egyseg : 'db';
        const meglevo = [...sorokEl.querySelectorAll('.anyag-sor')].find((sor) =>
          sor.querySelector('.as-cikk').value.trim().toLowerCase() === t.cikk.toLowerCase() && sor.querySelector('.as-egyseg').value === egyseg);
        if (meglevo) {
          const m = meglevo.querySelector('.as-menny');
          m.value = Math.round(((Number(m.value) || 0) + t.mennyiseg) * 1000) / 1000;
        } else {
          sorokEl.insertAdjacentHTML('beforeend', anyagSor({ ...t, egyseg }));
          uj += 1;
        }
      }
      uzenet.textContent = `${tetelek.length} tétel beolvasva (${uj} új sor). Nézd át, és ami nem kell, töröld az × gombbal.`;
    } catch (err) {
      uzenet.textContent = `A PDF nem olvasható be: ${err.message}`;
    }
  });
}

// ---- Munkadíj-tételek és gerinc szerkesztése ----

// A Projekt mezők és a munkadíj-táblázat kódjai.
const MEZO_KOD = {
  radiatorKiallas: 'radiator_kiallas', radiatorFelszereles: 'radiator_felszereles', padlofutesKor: 'padlofutes_kor',
  kulsoVizFm: 'kulso_viz', kulsoSzennyvizFm: 'kulso_szennyviz',
};
function mezoKod(nev) {
  if (nev.startsWith('szerelvenyek.')) return nev.split('.')[1];
  if (nev === 'hotermelo') return HOTERMELOK[form.elements.hotermelo.value] ?? null;
  return MEZO_KOD[nev] ?? null;
}

// ---- Beépített tételek eltávolítása a listából (visszaállítható) ----

async function tetelElrejtese(mezo, nev) {
  const v = await kerdes({
    cim: 'Törlés a listából',
    szoveg: `A(z) „${nev}” nem jelenik meg többé a listában (minden további ajánlatnál). A kártya alján az „Eltávolított tételek” gombbal bármikor visszaállítható.`,
    gombok: [{ felirat: 'Törlés', ertek: 'igen', stilus: 'veszelyes' }, { felirat: 'Vissza', ertek: 'vissza', stilus: 'masodlagos' }],
  });
  if (v !== 'igen') return false;
  const el = form.elements[mezo];
  if (el && Number(el.value) > 0) el.value = '';
  if (!allapot.rejtett.includes(mezo)) allapot.rejtett.push(mezo);
  ment(REJTETT_KULCS, allapot.rejtett);
  frissit();
  return true;
}

// A rejtett tételek sorai eltűnnek (így a csempék közül is), és kártyánként
// megjelenik az „Eltávolított tételek (n)” gomb a visszaállításhoz.
function rejtettAlkalmaz() {
  for (const label of form.querySelectorAll('.mezolista > label')) {
    const el = label.querySelector('input, select');
    // Ha egy (pl. régebbi) ajánlatban mégis van mennyisége, látszik, hogy ne számoljon láthatatlanul.
    label.hidden = Boolean(el?.name && allapot.rejtett.includes(el.name) && !(Number(el.value) > 0));
  }
  for (const kartya of form.querySelectorAll('.kartya')) {
    const rejtettek = [...kartya.querySelectorAll('.mezolista > label[hidden]')];
    let gomb = kartya.querySelector('.rejtett-gomb');
    if (!rejtettek.length) { gomb?.remove(); continue; }
    if (!gomb) {
      gomb = document.createElement('button');
      gomb.type = 'button';
      gomb.className = 'kicsi button rejtett-gomb';
      (kartya.querySelector('.actions') ?? kartya).append(gomb);
    }
    gomb.textContent = `Eltávolított tételek (${rejtettek.length})`;
  }
}

function rejtettVisszaallitas(kartya) {
  const sorok = [...kartya.querySelectorAll('.mezolista > label[hidden]')].map((l) => {
    const nevEl = l.querySelector('.mezo-nev')?.cloneNode(true);
    nevEl?.querySelector('small')?.remove();
    return { mezo: l.querySelector('input, select').name, nev: (nevEl?.textContent ?? '').trim() };
  });
  szerkesztoAblak({
    cim: 'Eltávolított tételek',
    leiras: 'Pipáld be, amelyiket vissza szeretnéd tenni a listába.',
    torzs: `<div class="rejtett-lista">${sorok.map((r) => `<label class="check"><input type="checkbox" name="vissza" value="${escape(r.mezo)}"><span>${escape(r.nev)}</span></label>`).join('')}</div>`,
    mentes: (urlap) => {
      const vissza = [...urlap.querySelectorAll('[name="vissza"]:checked')].map((x) => x.value);
      allapot.rejtett = allapot.rejtett.filter((m) => !vissza.includes(m));
      ment(REJTETT_KULCS, allapot.rejtett);
      return true;
    },
  });
}

// Egy szerkesztőablak váza (cím, magyarázat, mezők, Mentés / Visszaállítás / Mégse).
// mentes(urlap) és visszaallitas() a gombokhoz; a mezők HTML-je a torzs.
function szerkesztoAblak({ cim, leiras, torzs, modositott, mentes, visszaallitas, torles, elrejtes }) {
  const hatter = document.createElement('div');
  hatter.className = 'parbeszed-hatter';
  hatter.innerHTML = `<form class="parbeszed munka-urlap" role="dialog" aria-modal="true" aria-labelledby="sz-cim">
    <h2 id="sz-cim">${escape(cim)}</h2>
    ${leiras ? `<p class="muted" style="margin:0">${escape(leiras)}</p>` : ''}
    ${torzs}
    <div class="parbeszed-gombok">
      <button type="submit">Mentés</button>
      ${modositott ? '<button type="button" class="button ks-alap">Eredeti visszaállítása</button>' : ''}
      ${torles ? `<button type="button" class="veszelyes sz-torles">${escape(torles.felirat)}</button>` : ''}
      ${elrejtes ? '<button type="button" class="veszelyes sz-elrejt">Törlés a listából</button>' : ''}
      <button type="button" class="button mu-megse">Mégse</button>
    </div>
  </form>`;
  const urlap = hatter.querySelector('form');
  const zar = () => { hatter.remove(); document.removeEventListener('keydown', esc); };
  const esc = (ev) => { if (ev.key === 'Escape') zar(); };
  document.addEventListener('keydown', esc);
  const utana = () => { zar(); cimkekFrissitese(); frissit(); megjelenitPlusz(); megjelenitArTabla(true); };
  hatter.addEventListener('click', async (ev) => {
    if (!elrejtes || !ev.target.closest('.sz-elrejt')) return;
    hatter.hidden = true;
    if (await tetelElrejtese(elrejtes.mezo, elrejtes.nev)) zar();
    else hatter.hidden = false;
  });
  hatter.addEventListener('click', async (ev) => {
    if (!torles || !ev.target.closest('.sz-torles')) return;
    hatter.hidden = true;
    const v = await kerdes({
      cim: torles.felirat, szoveg: torles.kerdes,
      gombok: [{ felirat: 'Törlés', ertek: 'igen', stilus: 'veszelyes' }, { felirat: 'Vissza', ertek: 'vissza', stilus: 'masodlagos' }],
    });
    if (v !== 'igen') { hatter.hidden = false; return; }
    torles.vegrehajt();
    utana();
  });
  hatter.addEventListener('click', async (ev) => {
    if (ev.target === hatter || ev.target.closest('.mu-megse')) { zar(); return; }
    if (anyagSzerkesztoKattintas(ev, urlap)) return;
    if (ev.target.closest('.ks-alap')) {
      hatter.hidden = true;
      const v = await kerdes({
        cim: 'Eredeti visszaállítása',
        szoveg: 'A módosításaid törlődnek, és az alkalmazás eredeti beállítása érvényes újra.',
        gombok: [{ felirat: 'Visszaállítás', ertek: 'igen', stilus: 'veszelyes' }, { felirat: 'Vissza', ertek: 'vissza', stilus: 'masodlagos' }],
      });
      if (v !== 'igen') { hatter.hidden = false; return; }
      visszaallitas();
      utana();
    }
  });
  urlap.addEventListener('submit', (ev) => {
    ev.preventDefault();
    if (mentes(urlap) === false) return;
    utana();
  });
  if (urlap.querySelector('#mu-pdf')) anyagPdfBekotes(urlap);
  document.body.append(hatter);
  ikonozas();
  urlap.querySelector('input, button')?.focus();
}

// Egy munkadíj-tétel (szerelvény, fűtés, külső szerelés) módosítása: név, ár, megjegyzés, anyag.
function tetelSzerkeszto(kod) {
  const alap = allapot.tabla.get(kod);
  if (!alap) return;
  const f = allapot.munkadijFelulirasok[kod] ?? {};
  const most = munkadijTabla().get(kod);
  const mezoNev = [...form.elements].find((el) => el.name && el.type === 'number' && mezoKod(el.name) === kod)?.name;
  szerkesztoAblak({
    elrejtes: mezoNev ? { mezo: mezoNev, nev: most?.tetel ?? alap.tetel } : null,
    cim: alap.tetel,
    leiras: 'A változás minden további ajánlatra érvényes ezen az eszközön.',
    modositott: Boolean(allapot.munkadijFelulirasok[kod]),
    torzs: `
      <label class="mezo"><span>Megnevezés az ajánlaton</span><input name="tetel" required value="${escape(most.tetel)}"></label>
      <div class="ketoszlop">
        <label class="mezo"><span>Egységár (Ft)</span><input name="egysegar" type="number" min="0" step="any" inputmode="numeric" required value="${most.egysegar}"></label>
        <label class="mezo"><span>Egység</span><input value="${escape(alap.egyseg)}" disabled></label>
      </div>
      <label class="mezo"><span>Megjegyzés az ajánlaton</span><input name="megjegyzes" value="${escape(most.megjegyzes ?? '')}"></label>
      <div class="mezo"><span>Anyag ehhez a tételhez (nem kötelező) – 1 ${escape(alap.egyseg)}-ra számolva</span>${anyagSzerkesztoHtml(f.anyag ?? [])}</div>`,
    mentes: (urlap) => {
      const e = urlap.elements;
      const uj = {
        tetel: e.tetel.value.trim().replace(/\s+/g, ' '),
        egysegar: Number(e.egysegar.value),
        megjegyzes: e.megjegyzes.value.trim(),
        anyag: anyagSorokOlvasasa(urlap),
      };
      if (!uj.tetel || !(uj.egysegar >= 0)) return false;
      const valtozatlan = uj.tetel === alap.tetel && uj.egysegar === alap.egysegar && uj.megjegyzes === (alap.megjegyzes ?? '') && !uj.anyag.length;
      if (valtozatlan) delete allapot.munkadijFelulirasok[kod];
      else allapot.munkadijFelulirasok[kod] = uj;
      ment(MUNKADIJ_FELULIR_KULCS, allapot.munkadijFelulirasok);
      return true;
    },
    visszaallitas: () => {
      delete allapot.munkadijFelulirasok[kod];
      ment(MUNKADIJ_FELULIR_KULCS, allapot.munkadijFelulirasok);
    },
  });
}

// A gerinc anyaga 1 folyóméterre (alapból a cső és a csőhéj).
function gerincSzerkeszto(atmero) {
  szerkesztoAblak({
    elrejtes: { mezo: `gerinc.${atmero}`, nev: `Gerinc, ${atmero}-${atmero === '20' ? 'as' : 'os'} cső` },
    cim: `Gerinc, ${atmero}-${atmero === '20' ? 'as' : 'os'} cső – anyag`,
    leiras: '1 folyóméter gerincre számolva. A változás minden további ajánlatra érvényes ezen az eszközön.',
    modositott: Boolean(allapot.gerincAnyag[atmero]),
    torzs: `<div class="mezo">${anyagSzerkesztoHtml(allapot.gerincAnyag[atmero] ?? gerincAlapAnyag(atmero))}</div>`,
    mentes: (urlap) => {
      const uj = anyagSorokOlvasasa(urlap);
      if (azonosCsomag(uj, gerincAlapAnyag(atmero))) delete allapot.gerincAnyag[atmero];
      else allapot.gerincAnyag[atmero] = uj;
      ment(GERINC_ANYAG_KULCS, allapot.gerincAnyag);
      return true;
    },
    visszaallitas: () => {
      delete allapot.gerincAnyag[atmero];
      ment(GERINC_ANYAG_KULCS, allapot.gerincAnyag);
    },
  });
}


// A szerelvények feliratai a (módosított) munkadíj-táblázat szerint.
function cimkekFrissitese() {
  const t = munkadijTabla();
  for (const kod of SZERELVENY_KODOK) {
    const el = form.elements[`szerelvenyek.${kod}`]?.closest('label')?.querySelector('.mezo-nev');
    if (el && t.get(kod)) el.textContent = t.get(kod).tetel;
  }
  // A fűtés és a külső szerelés sorai: az eredeti felirat, vagy ha átnevezted, az új név.
  for (const [mezo, kod] of Object.entries(MEZO_KOD)) {
    const el = form.elements[mezo]?.closest('label')?.querySelector('.mezo-nev');
    if (!el) continue;
    el.dataset.eredeti ??= el.textContent;
    el.textContent = allapot.munkadijFelulirasok[kod]?.tetel || el.dataset.eredeti;
  }
}

// A módosított sorok ceruzája kiemelve.
function modositottJeloles() {
  for (const label of form.querySelectorAll('.mezolista > label')) {
    const el = label.querySelector('input, select');
    if (!el) continue;
    let mod = false;
    if (el.name.startsWith('kiallasok.')) {
      const nev = osszesKiallas().find((t) => `kiallasok.${t.kod}` === el.name)?.nev;
      const kod = el.name.split('.')[1];
      const beepitett = KIALLAS_TIPUSOK.some((t) => t.kod === kod);
      mod = beepitett && (Boolean(allapot.konyvtarFelulirasok[nev]) || allapot.bovitesek.some((b) => b.kiallas === nev)
        || Boolean(allapot.kiallasNevek[kod]) || allapot.kiallasArak[kod] !== undefined);
    } else if (el.name.startsWith('gerinc.')) {
      mod = Boolean(allapot.gerincAnyag[el.name.split('.')[1]]);
    } else if (!el.name.startsWith('egyeb.')) {
      const kod = mezoKod(el.name);
      mod = Boolean(kod && allapot.munkadijFelulirasok[kod]);
    }
    label.classList.toggle('modositott', mod);
  }
}

// Saját (új) kiállás felvétele vagy szerkesztése: név és anyagcsomag (egy kiállásra).
function sajatKiallasSzerkeszto(kod = null) {
  const k = allapot.sajatKiallasok.find((x) => x.kod === kod);
  const regiNev = k?.nev ?? '';
  szerkesztoAblak({
    cim: k ? 'Kiállás szerkesztése' : 'Új kiállás',
    leiras: 'Utána ugyanúgy használható, mint a többi kiállás; minden kiállás után vízszerelés alapszerelés jár.',
    torzs: `
      <label class="mezo"><span>Megnevezés</span><input name="nev" required placeholder="Pl. Bidé, Piszoár, Mosogatógép" value="${escape(regiNev)}"></label>
      ${kiallasArMezo(kod)}
      <div class="mezo"><span>Anyagcsomag – egy kiállásra számolva</span>${anyagSzerkesztoHtml(k ? allapot.konyvtar.get(regiNev) ?? [] : [])}</div>`,
    mentes: (urlap) => {
      const nev = urlap.elements.nev.value.trim().replace(/\s+/g, ' ');
      if (!nev) return false;
      if (osszesKiallas().some((t) => t.kod !== kod && (t.nev.toLowerCase() === nev.toLowerCase() || kiallasCimke(t.nev).toLowerCase() === nev.toLowerCase()))) {
        urlap.elements.nev.setCustomValidity('Már van ilyen nevű kiállás.');
        urlap.elements.nev.reportValidity();
        urlap.elements.nev.addEventListener('input', () => urlap.elements.nev.setCustomValidity(''), { once: true });
        return false;
      }
      const ertekek = olvas().kiallasok;
      if (k) {
        kiallasArMentese(urlap, kod);
        if (regiNev !== nev) delete allapot.konyvtarFelulirasok[regiNev];
        k.nev = nev;
      } else {
        let uj = `sajat-k-${nev.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'kiallas'}`;
        for (let i = 2; osszesKiallas().some((t) => t.kod === uj); i++) uj = uj.replace(/-\d+$/, '') + `-${i}`;
        allapot.sajatKiallasok.push({ kod: uj, nev });
        kiallasArMentese(urlap, uj);
      }
      allapot.konyvtarFelulirasok[nev] = anyagSorokOlvasasa(urlap);
      ment(SAJAT_KIALLAS_KULCS, allapot.sajatKiallasok);
      konyvtarFrissites();
      kiallasFelepit(ertekek);
      listaAllitas('kiallasok', false);
      return true;
    },
    torles: k ? {
      felirat: 'Kiállás törlése',
      kerdes: `Törlöd a(z) „${regiNev}” kiállást? A már elmentett ajánlatokban a mentett összegük megmarad.`,
      vegrehajt: () => {
        const ertekek = olvas().kiallasok;
        allapot.sajatKiallasok = allapot.sajatKiallasok.filter((x) => x.kod !== kod);
        delete allapot.kiallasArak[kod];
        ment(KIALLAS_AR_KULCS, allapot.kiallasArak);
        delete allapot.konyvtarFelulirasok[regiNev];
        ment(SAJAT_KIALLAS_KULCS, allapot.sajatKiallasok);
        konyvtarFrissites();
        delete ertekek[kod];
        kiallasFelepit(ertekek);
      },
    } : null,
  });
}

// Két anyaglista azonos-e (név, mennyiség, egység; sorrendtől függetlenül).
function azonosCsomag(a = [], b = []) {
  const kulcs = (l) => l.map((t) => `${String(t.cikk).trim()}|${Number(t.mennyiseg)}|${t.egyseg}`).sort().join('\n');
  return kulcs(a) === kulcs(b);
}

// A beépített kiállás eredeti csomagja (az alkalmazás könyvtára szerint).
const eredetiCsomag = (nev) => allapot.alapKonyvtar.get(nev) ?? [];

// A változtatás nélkül elmentett (az eredetivel azonos) felülírások törlése, hogy ne jelölje módosítottnak.
function feleslegesFelulirasokTorlese() {
  let valtozott = false;
  for (const t of KIALLAS_TIPUSOK) {
    const f = allapot.konyvtarFelulirasok[t.nev];
    if (f && azonosCsomag(f, eredetiCsomag(t.nev))) { delete allapot.konyvtarFelulirasok[t.nev]; valtozott = true; }
  }
  for (const atmero of Object.keys(allapot.gerincAnyag)) {
    if (azonosCsomag(allapot.gerincAnyag[atmero], gerincAlapAnyag(atmero))) { delete allapot.gerincAnyag[atmero]; valtozott = true; }
  }
  if (valtozott) { ment(KONYVTAR_FELULIR_KULCS, allapot.konyvtarFelulirasok); ment(GERINC_ANYAG_KULCS, allapot.gerincAnyag); }
  return valtozott;
}

// A kiállás munkadíja (Ft / kiállás): a saját ár, vagy a vízszerelés alapszerelés ára.
const alapszerelesAr = () => {
  const f = allapot.munkadijFelulirasok.viz_alapszereles;
  return Number.isFinite(Number(f?.egysegar)) && f?.egysegar !== '' && f ? Number(f.egysegar) : allapot.tabla.get('viz_alapszereles')?.egysegar ?? 0;
};
const kiallasAr = (kod) => allapot.kiallasArak[kod] ?? alapszerelesAr();
const kiallasArMezo = (kod) => `<label class="mezo"><span>Munkadíj (Ft / kiállás) – alapból ${ft.format(alapszerelesAr())} Ft</span>
  <input name="ar" type="number" min="0" step="any" inputmode="numeric" required value="${kod ? kiallasAr(kod) : alapszerelesAr()}"></label>`;
function kiallasArMentese(urlap, kod) {
  const ar = Number(urlap.elements.ar.value);
  if (!(ar >= 0) || ar === alapszerelesAr()) delete allapot.kiallasArak[kod];
  else allapot.kiallasArak[kod] = ar;
  ment(KIALLAS_AR_KULCS, allapot.kiallasArak);
}

// Egy kiállás anyagcsomagjának szerkesztése (pl. WC-tartály). Minden további ajánlatra érvényes.
function kiallasSzerkeszto(nev) {
  const sorok = allapot.konyvtar.get(nev) ?? [];
  const kod = KIALLAS_TIPUSOK.find((t) => t.nev === nev)?.kod;
  const felulirt = Boolean(allapot.konyvtarFelulirasok[nev] && !azonosCsomag(allapot.konyvtarFelulirasok[nev], eredetiCsomag(nev)))
    || allapot.bovitesek.some((b) => b.kiallas === nev) || Boolean(allapot.kiallasNevek[kod]) || allapot.kiallasArak[kod] !== undefined;
  const hatter = document.createElement('div');
  hatter.className = 'parbeszed-hatter';
  hatter.innerHTML = `<form class="parbeszed munka-urlap" role="dialog" aria-modal="true" aria-labelledby="ks-cim">
    <h2 id="ks-cim">Kiállás szerkesztése</h2>
    <p class="muted" style="margin:0">A változás minden további ajánlatra érvényes ezen az eszközön${
      felulirt ? '; ez a kiállás már módosítva van' : ''}.</p>
    <label class="mezo"><span>Megnevezés</span><input name="nev" required value="${escape(kiallasCimke(nev))}"></label>
    ${kiallasArMezo(kod)}
    <div class="mezo"><span>Anyagcsomag – egy kiállásra számolva</span>${anyagSzerkesztoHtml(sorok)}</div>
    <div class="parbeszed-gombok">
      <button type="submit">Mentés</button>
      ${felulirt ? '<button type="button" class="button ks-alap">Eredeti visszaállítása</button>' : ''}
      <button type="button" class="veszelyes ks-elrejt">Törlés a listából</button>
      <button type="button" class="button mu-megse">Mégse</button>
    </div>
  </form>`;
  const urlap = hatter.querySelector('form');
  const zar = () => { hatter.remove(); document.removeEventListener('keydown', esc); };
  const esc = (ev) => { if (ev.key === 'Escape') zar(); };
  document.addEventListener('keydown', esc);
  hatter.addEventListener('click', async (ev) => {
    if (!ev.target.closest('.ks-elrejt')) return;
    hatter.hidden = true;
    if (await tetelElrejtese(`kiallasok.${kod}`, kiallasCimke(nev))) zar();
    else hatter.hidden = false;
  });
  const kesz = () => {
    konyvtarFrissites();
    ment(KIALLAS_NEV_KULCS, allapot.kiallasNevek);
    zar();
    kiallasFelepit();
    frissit();
    megjelenitPlusz();
    megjelenitArTabla(true);
  };
  hatter.addEventListener('click', async (ev) => {
    if (ev.target === hatter || ev.target.closest('.mu-megse')) { zar(); return; }
    if (anyagSzerkesztoKattintas(ev, urlap)) return;
    if (ev.target.closest('.ks-alap')) {
      hatter.hidden = true;
      const v = await kerdes({
        cim: 'Eredeti visszaállítása',
        szoveg: `A(z) ${kiallasCimke(nev)} neve, munkadíja és anyagcsomagja visszaáll az alkalmazás eredetijére; a módosításaid törlődnek.`,
        gombok: [{ felirat: 'Visszaállítás', ertek: 'igen', stilus: 'veszelyes' }, { felirat: 'Vissza', ertek: 'vissza', stilus: 'masodlagos' }],
      });
      if (v !== 'igen') { hatter.hidden = false; return; }
      delete allapot.konyvtarFelulirasok[nev];
      delete allapot.kiallasNevek[kod];
      delete allapot.kiallasArak[kod];
      ment(KIALLAS_AR_KULCS, allapot.kiallasArak);
      allapot.bovitesek = allapot.bovitesek.filter((b) => b.kiallas !== nev);
      kesz();
    }
  });
  urlap.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const ujNev = urlap.elements.nev.value.trim().replace(/\s+/g, ' ');
    if (!ujNev) return;
    if (osszesKiallas().some((t) => t.nev !== nev && kiallasCimke(t.nev).toLowerCase() === ujNev.toLowerCase())) {
      urlap.elements.nev.setCustomValidity('Már van ilyen nevű kiállás.');
      urlap.elements.nev.reportValidity();
      urlap.elements.nev.addEventListener('input', () => urlap.elements.nev.setCustomValidity(''), { once: true });
      return;
    }
    if (ujNev === nev) delete allapot.kiallasNevek[kod];
    else allapot.kiallasNevek[kod] = ujNev;
    kiallasArMentese(urlap, kod);
    const ujCsomag = anyagSorokOlvasasa(urlap);
    if (azonosCsomag(ujCsomag, allapot.konyvtar.get(nev) ?? [])) {
      // a csomag nem változott: a meglévő állapot marad (nem lesz belőle "módosított")
    } else if (azonosCsomag(ujCsomag, eredetiCsomag(nev))) {
      delete allapot.konyvtarFelulirasok[nev];
      allapot.bovitesek = allapot.bovitesek.filter((b) => b.kiallas !== nev);
    } else {
      allapot.konyvtarFelulirasok[nev] = ujCsomag;
      // a korábbi "Könyvtárba…" bővítések ennél a kiállásnál már a csomag részei
      allapot.bovitesek = allapot.bovitesek.filter((b) => b.kiallas !== nev);
    }
    kesz();
  });
  anyagPdfBekotes(urlap);
  document.body.append(hatter);
  ikonozas();
  urlap.querySelector('.as-cikk, button')?.focus();
}

// Szerkesztőablak egy egyéb munkához (új vagy meglévő).
function munkaSzerkeszto(kod = null, ujSzakasz = 'egyeb') {
  const m = allapot.sajatMunkak.find((x) => x.kod === kod) ?? { tetel: '', egyseg: 'db', egysegar: '', megjegyzes: '', anyag: [], szakasz: ujSzakasz };
  const sz = SAJAT_SZAKASZOK[munkaSzakasz(m)];
  const hatter = document.createElement('div');
  hatter.className = 'parbeszed-hatter';
  hatter.innerHTML = `<form class="parbeszed munka-urlap" role="dialog" aria-modal="true" aria-labelledby="mu-cim">
    <h2 id="mu-cim">${kod ? sz.szerk : sz.uj}</h2>
    <label class="mezo"><span>Megnevezés</span><input name="tetel" required placeholder="${escape(sz.pelda)}" value="${escape(m.tetel)}"></label>
    <div class="ketoszlop">
      <label class="mezo"><span>Egységár (Ft)</span><input name="egysegar" type="number" min="0" step="any" required inputmode="numeric" value="${m.egysegar}"></label>
      <label class="mezo"><span>Egység</span><select name="egyseg">${MUNKA_EGYSEGEK.map((e) => `<option${e === m.egyseg ? ' selected' : ''}>${e}</option>`).join('')}</select></label>
    </div>
    <label class="mezo"><span>Megjegyzés az ajánlaton (nem kötelező)</span><input name="megjegyzes" placeholder="Pl. a régi hőcserélő elszállításával" value="${escape(m.megjegyzes ?? '')}"></label>
    <div class="mezo"><span>Anyag ehhez a munkához (nem kötelező) – egy munkára számolva</span>${anyagSzerkesztoHtml(m.anyag ?? [])}
    </div>
    <div class="parbeszed-gombok">
      <button type="submit">Mentés</button>
      ${kod ? '<button type="button" class="veszelyes mu-torles">Munka törlése</button>' : ''}
      <button type="button" class="button mu-megse">Mégse</button>
    </div>
  </form>`;
  const urlap = hatter.querySelector('form');
  const zar = () => { hatter.remove(); document.removeEventListener('keydown', esc); };
  const esc = (ev) => { if (ev.key === 'Escape') zar(); };
  document.addEventListener('keydown', esc);
  hatter.addEventListener('click', async (ev) => {
    if (ev.target === hatter || ev.target.closest('.mu-megse')) { zar(); return; }
    if (anyagSzerkesztoKattintas(ev, urlap)) return;
    if (ev.target.closest('.mu-torles')) {
      hatter.hidden = true;
      const v = await kerdes({
        cim: 'Munka törlése',
        szoveg: `Törlöd a(z) „${m.tetel}” munkát? A már elmentett ajánlatokban a mentett összegük megmarad.`,
        gombok: [{ felirat: 'Törlés', ertek: 'torles', stilus: 'veszelyes' }, { felirat: 'Vissza', ertek: 'vissza', stilus: 'masodlagos' }],
      });
      if (v !== 'torles') { hatter.hidden = false; return; }
      allapot.sajatMunkak = allapot.sajatMunkak.filter((x) => x.kod !== kod);
      ment(SAJAT_MUNKA_KULCS, allapot.sajatMunkak);
      zar();
      egyebFelepit();
      frissit();
    }
  });
  urlap.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const f = urlap.elements;
    const tetel = f.tetel.value.trim().replace(/\s+/g, ' ');
    const egysegar = Number(f.egysegar.value);
    if (!tetel || !(egysegar >= 0)) return;
    const anyag = anyagSorokOlvasasa(urlap);
    const adat = { tetel, egyseg: f.egyseg.value, egysegar, megjegyzes: f.megjegyzes.value.trim(), anyag };
    const ertekek = olvas().egyeb;
    if (kod) Object.assign(allapot.sajatMunkak.find((x) => x.kod === kod), adat);
    else allapot.sajatMunkak.push({ kod: ujMunkaKod(tetel), szakasz: munkaSzakasz(m), ...adat });
    ment(SAJAT_MUNKA_KULCS, allapot.sajatMunkak);
    zar();
    egyebFelepit(ertekek);
    listaAllitas(sz.lista, false); // az új/szerkesztett tétel látszódjon
    frissit();
  });
  anyagPdfBekotes(urlap);
  document.body.append(hatter);
  ikonozas();
  urlap.elements.tetel.focus();
}

// ---- Projekt űrlap ----

function szamMezo(nev, cimke) {
  return `<label><span>${escape(cimke)}</span><input type="number" min="0" name="${nev}"></label>`;
}

// Az összes kiállástípus: az alkalmazás kilenc típusa és a felületen felvettek.
const osszesKiallas = () => [...KIALLAS_TIPUSOK, ...allapot.sajatKiallasok];
// A kiállás neve a felületen (a beépítettek átnevezhetők; a csomagjuk az eredeti néven marad).
const kiallasCimke = (nev) => {
  const t = KIALLAS_TIPUSOK.find((x) => x.nev === nev);
  return (t && allapot.kiallasNevek[t.kod]) || nev;
};

// A kiállás-sorok (a saját kiállásokkal). ertekek: a megtartandó mennyiségek.
function kiallasFelepit(ertekek = olvas().kiallasok) {
  const voltCsukva = $('kiallasok').classList.contains('csukva');
  $('kiallasok').innerHTML = osszesKiallas().map((t) => `<label data-kiallas="${escape(t.nev)}"${KIALLAS_TIPUSOK.includes(t) ? '' : ` data-sajat="${t.kod}"`}>
    <span>${escape(kiallasCimke(t.nev))}${allapot.kiallasArak[t.kod] !== undefined
      ? `<small class="munka-ar">${ft.format(allapot.kiallasArak[t.kod])} Ft / kiállás</small>` : ''}</span>
    <input type="number" min="0" name="kiallasok.${t.kod}" value="${Number(ertekek?.[t.kod]) > 0 ? ertekek[t.kod] : ''}">
  </label>`).join('');
  leptetok();
  ikonozas();
  kitoltesJelolese();
  listaAllitas('kiallasok', voltCsukva);
}

function felepit() {
  kiallasFelepit({});
  $('szerelvenyek').innerHTML = SZERELVENY_KODOK
    .map((kod) => szamMezo(`szerelvenyek.${kod}`, allapot.tabla.get(kod).tetel)).join('');
  leptetok();
  ikonozas();
}

// Piktogramok: minden mezősor elé a tárgy ikonja, a kártyafejlécekbe és a gombokba
// a data-ikon szerinti ikon.
function ikonozas() {
  for (const label of form.querySelectorAll('.mezolista label')) {
    if (label.querySelector('.mezo-ikon')) continue;
    const mezo = label.querySelector('input, select');
    const nev = label.querySelector(':scope > span:not(.lepteto)');
    nev?.classList.add('mezo-nev');
    const sajatIkon = Object.values(SAJAT_SZAKASZOK).find((sz) => sz.lista === label.parentElement?.id)?.ikon ?? 'kalapacs';
    const ik = MEZO_IKON[mezo?.name] ?? (mezo?.name?.startsWith('egyeb.') ? sajatIkon : mezo?.name?.startsWith('kiallasok.') ? 'csaptelep' : null);
    if (ik) label.insertAdjacentHTML('afterbegin', `<span class="mezo-ikon">${ikon(ik)}</span>`);
  }
  for (const el of document.querySelectorAll('[data-ikon]')) {
    if (el.querySelector(':scope > .ikon, :scope > .fej-ikon')) continue;
    const svg = ikon(el.dataset.ikon);
    el.insertAdjacentHTML('afterbegin', el.tagName === 'H2' ? `<span class="fej-ikon">${svg}</span>` : svg);
  }
}

// A kitöltött sorok (nem nulla érték, kiválasztott hőtermelő) kiemelve.
function kitoltesJelolese() {
  for (const label of form.querySelectorAll('.mezolista label')) {
    const el = label.querySelector('input, select');
    if (!el) continue;
    const kitoltott = el.tagName === 'SELECT' ? el.value !== 'nincs' : Number(el.value) > 0;
    label.classList.toggle('kitoltott', kitoltott);
  }
}

// − és + gomb minden számmező mellé. A lépés a mező step értéke (alapból 1), nulla alá nem megy.
function leptetok() {
  for (const input of form.querySelectorAll('input[type=number]')) {
    if (input.parentElement.classList.contains('lepteto')) continue;
    const cimke = input.closest('label')?.querySelector('span')?.textContent ?? '';
    const doboz = document.createElement('span');
    doboz.className = 'lepteto';
    input.replaceWith(doboz);
    const gomb = (jel, irany, felirat) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'lepes';
      b.textContent = jel;
      b.setAttribute('aria-label', `${felirat}: ${cimke}`);
      b.addEventListener('click', (ev) => {
        ev.preventDefault();
        const lepes = Number(input.step) || 1;
        const uj = Math.max(0, Math.round(((Number(input.value) || 0) + irany * lepes) / lepes) * lepes);
        input.value = uj ? String(uj) : '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      return b;
    };
    doboz.append(gomb('−', -1, 'Csökkentés'), input, gomb('+', 1, 'Növelés'));
  }
}

function olvas() {
  const p = uresProjekt();
  for (const el of form.elements) {
    if (!el.name) continue;
    const ertek = el.type === 'checkbox' ? el.checked
      : el.type === 'number' ? Number(el.value || 0)
      : el.value;
    const [a, b] = el.name.split('.');
    if (b) p[a][b] = ertek; else p[a] = ertek;
  }
  return p;
}

function kitolt(p) {
  for (const el of form.elements) {
    if (!el.name) continue;
    const [a, b] = el.name.split('.');
    const ertek = b ? p[a]?.[b] : p[a];
    if (ertek === undefined) continue;
    if (el.type === 'checkbox') el.checked = Boolean(ertek);
    else if (el.type === 'number') el.value = ertek ? ertek : '';
    else el.value = ertek;
  }
}

// ---- Munkadíj ----

function munkadijHtml(e) {
  if (e.sorok.length === 0) return '<p class="muted">Adj meg legalább egy tételt.</p>';
  const sorok = e.sorok.map((s) => `
    <tr>
      <td>${escape(s.tetel)}${s.megjegyzes ? `<div class="muted">${escape(s.megjegyzes)}</div>` : ''}</td>
      <td class="num">${ft.format(s.mennyiseg)} ${escape(s.egyseg)}</td>
      <td class="num hide-sm">${ft.format(s.egysegar)}</td>
      <td class="num">${penz(s.osszeg)}</td>
    </tr>`).join('');
  return `
    <table>
      <thead><tr><th>Tétel</th><th class="num">Menny.</th><th class="num hide-sm">Egységár</th><th class="num">Összeg</th></tr></thead>
      <tbody>${sorok}</tbody>
      <tfoot><tr><td colspan="2">Munkadíj összesen</td><td class="hide-sm"></td><td class="num">${penz(e.osszesen)}</td></tr></tfoot>
    </table>`;
}

// ---- Lenyitható tétellisták ----

// A hosszú listák alapból csukva vannak; a sávon a darabszám és az összeg látszik.
// Ami nyitva van, újrarajzoláskor is nyitva marad (oldal-újratöltésig).
const nyitottListak = new Set();
const zartListak = new Set(); // amit a felhasználó kifejezetten becsukott

// alapNyitva: rövid listáknál alapból nyitva (amíg be nem csukják).
function lenyilo(kulcs, cim, osszegzes, tartalom, alapNyitva = false) {
  const nyitva = nyitottListak.has(kulcs) || (alapNyitva && !zartListak.has(kulcs));
  return `<div class="lenyilo">
    <button type="button" class="lenyilo-gomb" data-lenyilo="${kulcs}" aria-expanded="${nyitva}">
      <span class="nyil" aria-hidden="true"></span><span class="lenyilo-cim">${cim}</span>
      <span class="lenyilo-ossz">${osszegzes ?? ''}</span>
    </button>
    <div class="lenyilo-tartalom"${nyitva ? '' : ' hidden'}>${tartalom}</div>
  </div>`;
}

document.addEventListener('click', (ev) => {
  const b = ev.target.closest('.lenyilo-gomb');
  if (!b) return;
  const nyit = b.getAttribute('aria-expanded') !== 'true';
  b.setAttribute('aria-expanded', String(nyit));
  b.nextElementSibling.hidden = !nyit;
  if (nyit) { nyitottListak.add(b.dataset.lenyilo); zartListak.delete(b.dataset.lenyilo); }
  else { nyitottListak.delete(b.dataset.lenyilo); zartListak.add(b.dataset.lenyilo); }
});

// ---- Anyaglista ----

const levelSzoveg = (lista) => `Szia!

A következő tételekről szeretnék kérni árajánlatot.
Köszönöm szépen előre is.

${lista}
`;

function megjelenitAnyag() {
  const e = allapot.anyag;
  kiir('jelveny-anyag', e.sorok.length ? String(e.sorok.length) : '');
  const szoveg = anyaglistaSzoveg(e.sorok);
  $('email').href = `mailto:?subject=${encodeURIComponent('Árajánlatkérés – anyaglista')}`
    // A levelezők egy része csak a CRLF sortörést tartja meg (RFC 6068), különben egybefolyik a lista.
    + `&body=${encodeURIComponent(levelSzoveg(szoveg).replace(/\r?\n/g, '\r\n'))}`;
  $('anyag-gombok').hidden = e.sorok.length === 0;
  if (e.sorok.length === 0) {
    $('anyaglista').innerHTML = figyelmeztetesHtml(e.figyelmeztetesek)
      + '<p class="muted">Adj meg kiállást vagy gerincet.</p>';
    return;
  }
  const sorok = e.sorok.map((s) => `
    <tr>
      <td class="cikk-oszlop">${escape(s.cikk)}${s.plusz ? ` <span class="cimke">${s.forras === 'pdf' ? 'bolt' : 'plusz'}</span>` : ''}</td>
      <td class="num">${ft.format(s.mennyiseg)} ${escape(s.egyseg)}${s.listaMennyiseg !== undefined
        ? `<div class="muted">PDF szerint; lista: ${ft.format(s.listaMennyiseg)}</div>` : ''}</td>
      <td class="torles-oszlop">${s.plusz ? `<button type="button" class="sor-torles" data-plusz-torles="${escape(tetelKulcs(s))}"
        aria-label="Törlés: ${escape(s.cikk)}" title="Törlés">×</button>` : ''}</td>
    </tr>`).join('');
  $('anyaglista').innerHTML = figyelmeztetesHtml(e.figyelmeztetesek) + lenyilo('anyaglista', `Tételek (${e.sorok.length})`, '', `
    <table>
      <thead><tr><th>Cikk</th><th class="num">Mennyiség</th><th class="torles-oszlop"></th></tr></thead>
      <tbody>${sorok}</tbody>
    </table>`);
}

// Plusz tétel törlése közvetlenül az anyaglistából (× gomb).
document.addEventListener('click', async (ev) => {
  const b = ev.target.closest('[data-plusz-torles]');
  if (!b) return;
  const kulcs = b.dataset.pluszTorles;
  const t = allapot.plusz.find((x) => tetelKulcs(x) === kulcs);
  if (!t) return;
  const v = await kerdes({
    cim: 'Tétel törlése',
    szoveg: `Törlöd az anyaglistáról: „${t.cikk}” (${ft.format(t.mennyiseg)} ${t.egyseg})?`,
    gombok: [{ felirat: 'Törlés', ertek: 'torles', stilus: 'veszelyes' }, { felirat: 'Vissza', ertek: 'vissza', stilus: 'masodlagos' }],
  });
  if (v !== 'torles') return;
  allapot.plusz = allapot.plusz.filter((x) => tetelKulcs(x) !== kulcs);
  ment(PLUSZ_KULCS, allapot.plusz);
  frissit();
  megjelenitPlusz();
  megjelenitArTabla(true);
});

// ---- Árak ----

const arMezo = (kulcs, mezo, ertek) => `<input type="text" inputmode="decimal" class="ar"
  data-kulcs="${escape(kulcs)}" data-mezo="${mezo}" value="${ertek ?? ''}" aria-label="${mezo === 'bolti' ? 'Bolti ár' : 'Kedvezményes ár'}">`;

const dragJelHtml = (k, mezo, ar) => {
  const d = dragulasJel(allapot.armemoria[k], mezo, ar);
  return d ? `<div class="dragulas" title="korábban ${penz(d.elozo)}">▲ ${Math.round(d.arany * 100)}%</div>` : '';
};

// Csak akkor rajzolja újra, ha a tételek változtak, hogy gépelés közben ne vesszen el a fókusz.
function megjelenitArTabla(kenyszer = false) {
  const sorok = allapot.anyag.sorok;
  const alairas = sorok.map((s) => `${tetelKulcs(s)}=${s.mennyiseg}`).join('\n');
  if (!kenyszer && alairas === allapot.arTablaAlairas) return;
  allapot.arTablaAlairas = alairas;
  $('ar-szakasz').hidden = sorok.length === 0;
  $('ar-ures').hidden = sorok.length > 0;
  const arazott = sorok.filter((s) => Number.isFinite(allapot.arak[tetelKulcs(s)]?.bolti)).length;
  $('ar-tabla').innerHTML = lenyilo('artabla', `Tételek (${sorok.length})`, `${arazott}/${sorok.length} bolti ár`, `
    <table class="ar-tabla">
      <thead><tr><th>Cikk</th><th class="num">Bolti ár<br>(bruttó)</th><th class="num">Kedv. ár<br>(bruttó)</th></tr></thead>
      <tbody>${sorok.map((s) => {
        const k = tetelKulcs(s);
        const ar = allapot.arak[k] ?? {};
        return `<tr>
          <td>${escape(s.cikk)}<div class="muted">${ft.format(s.mennyiseg)} ${escape(s.egyseg)}${s.listaMennyiseg !== undefined
            ? ` (PDF szerint; lista: ${ft.format(s.listaMennyiseg)})` : ''}</div></td>
          <td class="num">${arMezo(k, 'bolti', ar.bolti)}${dragJelHtml(k, 'bolti', ar.bolti)}</td>
          <td class="num">${arMezo(k, 'kedvezmenyes', ar.kedvezmenyes)}${dragJelHtml(k, 'kedvezmenyes', ar.kedvezmenyes)}</td>
        </tr>`;
      }).join('')}</tbody>
    </table>`);
}

const MEZO_NEV = { bolti: 'bolti', kedvezmenyes: 'kedvezményes' };

// Beolvasott árak beírása. mezo: null (mindkét ár a szövegben) vagy 'bolti' / 'kedvezmenyes'.
function arakAtvetele(szoveg, mezo, fajl = '') {
  const forras = mezo ?? 'szoveg';
  // Ugyanabba a helyre új feltöltés: az előző hatását előbb visszavonjuk.
  if (allapot.feltoltesek[forras]) { visszavon(forras); frissit(); }
  if (allapot.anyag.sorok.length === 0) {
    return '<p class="warn">Még nincs anyaglista. Előbb add meg a kiállásokat, utána töltsd fel az árakat.</p>';
  }
  // A bolt válasza az irányadó: az árak mellett az eltérő mennyiségek és a
  // listán nem szereplő tételek is bekerülnek az ajánlatba.
  // A mennyiséget az eredeti listához hasonlítjuk (nem a másik PDF által már átírthoz),
  // így mindkét PDF nyilvántartja a saját eltérő mennyiségeit.
  const listaSorok = allapot.anyag.sorok.map((s) => (s.listaMennyiseg !== undefined ? { ...s, mennyiseg: s.listaMennyiseg } : s));
  const { arak, mennyisegek, jeloltek, nemIllesztett } = boltValaszBeolvasas(szoveg, listaSorok, mezo);
  allapot.feltoltesek[forras] = {
    fajl,
    mezok: mezo ? [mezo] : ['bolti', 'kedvezmenyes'],
    arKulcsok: [...arak.keys(), ...jeloltek.map(tetelKulcs)], // minden tétel, ami ebben a PDF-ben szerepel
    mennyisegek: Object.fromEntries(mennyisegek),
    pluszKulcsok: jeloltek.map(tetelKulcs),
    tetelek: arak.size + jeloltek.length,
  };
  ment(FELTOLTES_KULCS, allapot.feltoltesek);
  const eltero = [...mennyisegek].map(([k, m]) => {
    const s = allapot.anyag.sorok.find((x) => tetelKulcs(x) === k);
    return { cikk: s.cikk, egyseg: s.egyseg, lista: s.listaMennyiseg ?? s.mennyiseg, pdf: m };
  });
  const ujArak = Object.fromEntries([...arak, ...jeloltek.map((j) => [tetelKulcs(j), j.ar])]);
  const dragult = dragulasok(allapot.armemoria, ujArak);
  for (const [k, ar] of arak) arBeiras(k, ar);
  for (const [k, m] of mennyisegek) allapot.pdfMennyiseg[k] = m;
  armemoriaRogzites(ujArak);
  for (const j of jeloltek) pluszHozzaad({ ...j, forras: 'pdf' }, true);
  ment(ARAK_KULCS, allapot.arak);
  ment(PDF_MENNY_KULCS, allapot.pdfMennyiseg);
  frissit();
  megjelenitPlusz();
  megjelenitArTabla(true);
  megjelenitKimenetek();

  const hianyzik = (m) => allapot.anyag.sorok.filter((s) => !Number.isFinite(allapot.arak[tetelKulcs(s)]?.[m])).length;
  const hianyok = (mezo ? [mezo] : ['bolti', 'kedvezmenyes'])
    .map((m) => [m, hianyzik(m)]).filter(([, n]) => n > 0)
    .map(([m, n]) => `${n} tételnek még nincs ${MEZO_NEV[m]} ára.`).join(' ');
  const reszek = [];
  if (arak.size === 0 && jeloltek.length === 0) {
    reszek.push(`<p class="warn">Egy tétel árát sem találtam. Nézd meg a kiolvasott szöveget. Ha abban látszanak a tételek és az árak,
      küldd el a PDF-et, és hozzáigazítom a beolvasást.</p>`);
  } else {
    const tobbi = [
      jeloltek.length ? `${jeloltek.length} új tétel felvéve az ajánlatba.` : '',
      eltero.length ? `${eltero.length} tételnél a PDF szerinti mennyiséggel számolok.` : '',
    ].filter(Boolean).join(' ');
    reszek.push(`<p><strong>${arak.size + jeloltek.length} tétel</strong> ára beolvasva. ${tobbi}${hianyok ? ` ${hianyok}` : ''}</p>`);
  }
  // A részletek alapból csukva vannak, csak a darabszám látszik.
  if (jeloltek.length) reszek.push(`<details class="reszlet"><summary>Új tételek, felvéve (${jeloltek.length})</summary>
    <ul class="jeloltek">${jeloltek.map(jeloltHtml).join('')}</ul></details>`);
  if (eltero.length) reszek.push(`<details class="reszlet"><summary>Eltérő mennyiség (${eltero.length})</summary>
    <ul class="jeloltek">${eltero.map((e) => `<li><span><strong>${escape(e.cikk)}</strong><br>
      <span class="muted">PDF: ${ft.format(e.pdf)} ${escape(e.egyseg)}, a lista szerint ${ft.format(e.lista)}</span></span></li>`).join('')}</ul></details>`);
  if (dragult.length) reszek.push(`<details class="reszlet dragult"><summary>Drágult tételek (${dragult.length})</summary>
    <ul class="jeloltek">${dragult.map((d) => `<li><span><strong>${escape(cikkNev(d.kulcs))}</strong><br>
      <span class="muted">${MEZO_NEV[d.mezo]}: ${penz(d.regi)} → ${penz(d.uj)} (<span class="dragulas">+${Math.round(d.arany * 100)}%</span>)${d.datum ? `, előző: ${escape(datumRovid(d.datum))}` : ''}</span></span></li>`).join('')}</ul></details>`);
  if (nemIllesztett.length) reszek.push(`<details class="reszlet"><summary>Nem értelmezett sorok (${nemIllesztett.length})</summary>
    <ul class="nem-illesztett">${nemIllesztett.map((s) => `<li>${escape(s)}</li>`).join('')}</ul></details>`);
  return reszek.join('') + eltavolitGomb(forras);
}

const FORRAS_NEV = { bolti: 'bolti árak PDF', kedvezmenyes: 'kedvezményes árak PDF', szoveg: 'bemásolt szöveg' };
const eltavolitGomb = (forras) => `<div class="actions kicsi-gombok"><button type="button" class="kicsi button feltoltes-torles"
  data-forras="${forras}">${forras === 'szoveg' ? 'Beolvasás visszavonása' : 'PDF eltávolítása'}</button></div>`;

// Egy feltöltés hatásának visszavonása: az általa beírt árak (csak a saját oszlopában),
// mennyiségek és felvett tételek törlése. Amit a másik feltöltés is tartalmaz, megmarad.
function visszavon(forras) {
  const f = allapot.feltoltesek[forras];
  if (!f) return;
  delete allapot.feltoltesek[forras];
  const masok = Object.values(allapot.feltoltesek);
  for (const k of f.arKulcsok) {
    const ar = allapot.arak[k];
    if (!ar) continue;
    for (const m of f.mezok) delete ar[m];
    if (!Object.keys(ar).length) delete allapot.arak[k];
  }
  // A mennyiség: ha a másik PDF-ben is eltér, annak az értéke marad, különben vissza a listához.
  for (const k of Object.keys(f.mennyisegek ?? {})) {
    const masik = masok.find((o) => o.mennyisegek?.[k] !== undefined);
    if (masik) allapot.pdfMennyiseg[k] = masik.mennyisegek[k];
    else delete allapot.pdfMennyiseg[k];
  }
  // A felvett tétel csak akkor törlődik, ha a másik PDF-ben nem szerepel.
  allapot.plusz = allapot.plusz.filter((t) => !(t.forras === 'pdf' && f.pluszKulcsok.includes(tetelKulcs(t))
    && !masok.some((o) => o.arKulcsok.includes(tetelKulcs(t)))));
  ment(ARAK_KULCS, allapot.arak);
  ment(PDF_MENNY_KULCS, allapot.pdfMennyiseg);
  ment(PLUSZ_KULCS, allapot.plusz);
  ment(FELTOLTES_KULCS, allapot.feltoltesek);
}

// Újratöltés után a feltöltő helyén: melyik fájl van betöltve, és eltávolítható.
function feltoltesAllapotHtml(forras) {
  const f = allapot.feltoltesek[forras];
  if (!f) return '';
  return `${f.fajl ? `<p class="muted fajlnev">${escape(f.fajl)}</p>` : ''}
    <p>Betöltve: <strong>${f.tetelek} tétel</strong> ára (${FORRAS_NEV[forras]}).</p>${eltavolitGomb(forras)}`;
}

function arBeiras(kulcs, ar) {
  const uj = { ...allapot.arak[kulcs] };
  for (const [m, v] of Object.entries(ar)) if (v !== null && v !== undefined) uj[m] = v;
  allapot.arak[kulcs] = uj;
}

const cikkNev = (kulcs) => allapot.anyag.sorok.find((s) => tetelKulcs(s) === kulcs)?.cikk
  ?? allapot.plusz.find((t) => tetelKulcs(t) === kulcs)?.cikk ?? kulcs.split('|')[0];

function armemoriaRogzites(arak, datum = maISO()) {
  const uj = memoriaRogzit(allapot.armemoria, arak, datum);
  if (uj === allapot.armemoria) return;
  allapot.armemoria = uj;
  ment(ARMEMORIA_KULCS, allapot.armemoria);
}

// Becsült anyagköltség a korábbi árakból, és a hiányzó árak kitöltése belőlük.
function becslesAdat() {
  const sorok = allapot.anyag.sorok.map((s) => ({ kulcs: tetelKulcs(s), mennyiseg: s.mennyiseg }));
  return becsles(sorok, allapot.arak, allapot.armemoria, 'bolti');
}

function megjelenitBecsles() {
  const b = becslesAdat();
  const n = allapot.anyag.sorok.length;
  const anyagEl = $('anyag-becsles');
  if (anyagEl) {
    anyagEl.hidden = !n || (b.jelenlegi === 0 && b.korabbi === 0);
    anyagEl.innerHTML = `Becsült anyagköltség (bolti): <strong>~${penz(b.osszeg)}</strong>
      <span class="muted">· ${b.jelenlegi + b.korabbi}/${n} tételre van ár${b.korabbi ? `, ebből ${b.korabbi} korábbi ajánlatból` : ''}</span>`;
  }
  const arEl = $('ar-becsles');
  if (!arEl) return;
  const potolhato = allapot.anyag.sorok.filter((s) => {
    const k = tetelKulcs(s);
    const m = allapot.armemoria[k];
    return m && ['bolti', 'kedvezmenyes'].some((f) => !Number.isFinite(allapot.arak[k]?.[f]) && Number.isFinite(m[f]));
  }).length;
  arEl.hidden = potolhato === 0;
  arEl.innerHTML = potolhato ? `<p><strong>${potolhato} tételnek</strong> nincs még ára, de korábbról ismert.
    Becsült anyagköltség a korábbi árakkal: <strong>~${penz(b.osszeg)}</strong> (bolti).</p>
    <div class="actions kicsi-gombok"><button type="button" class="kicsi button" id="korabbi-arak">Korábbi árak beírása</button></div>` : '';
}

function korabbiArakBeirasa() {
  for (const s of allapot.anyag.sorok) {
    const k = tetelKulcs(s);
    const m = allapot.armemoria[k];
    if (!m) continue;
    const ar = { ...allapot.arak[k] };
    for (const f of ['bolti', 'kedvezmenyes']) if (!Number.isFinite(ar[f]) && Number.isFinite(m[f])) ar[f] = m[f];
    allapot.arak[k] = ar;
  }
  ment(ARAK_KULCS, allapot.arak);
  megjelenitArTabla(true);
  megjelenitKimenetek();
}

// ---- Más boltok összevetése ----

function boltOszlopok() {
  const kedv = Object.fromEntries(Object.entries(allapot.arak).map(([k, a]) => [k, a?.kedvezmenyes]));
  return [{ nev: 'Jelenlegi beszerzési ár', arak: kedv }, ...allapot.boltok];
}

function megjelenitBoltok() {
  const hol = $('bolt-osszevetes');
  if (!hol) return;
  if (!allapot.boltok.length) { hol.innerHTML = ''; return; }
  const sorok = allapot.anyag.sorok.map((s) => ({ kulcs: tetelKulcs(s), cikk: s.cikk, mennyiseg: s.mennyiseg, egyseg: s.egyseg }));
  const oszl = boltOszlopok();
  const e = osszevetes(sorok, oszl);
  const jelenlegi = e.osszesek[0];
  const nyeres = jelenlegi.osszeg - e.legolcsobbOsszeg;
  const kartyak = e.osszesek.map((o, i) => `<div class="bolt-kartya${i === 0 ? ' alap' : ''}">
      ${i === 0 ? `<strong>${escape(o.nev)}</strong>` : `<input class="bolt-nev" data-bolt="${allapot.boltok[i - 1].id}" value="${escape(o.nev)}" aria-label="Bolt neve">`}
      <div class="bolt-osszeg">${penz(o.osszeg)}</div>
      <div class="muted">${o.db}/${sorok.length} tétel${e.kozosDb && e.osszesek.length > 1 ? ` · közös ${e.kozosDb} tétel: ${penz(o.kozosOsszeg)}` : ''}</div>
      ${i === 0 ? '' : `<div class="actions kicsi-gombok">
        <button type="button" class="kicsi button" data-bolt-hasznal="${allapot.boltok[i - 1].id}">Ezt használom</button>
        <button type="button" class="kicsi button" data-bolt-torol="${allapot.boltok[i - 1].id}" aria-label="Eltávolítás: ${escape(o.nev)}">×</button></div>`}
    </div>`).join('');
  const fej = oszl.map((o, i) => `<th class="num">${escape(i === 0 ? 'Jelenlegi' : o.nev)}</th>`).join('');
  const tabla = e.tetelek.filter((t) => t.arak.some((a) => a !== null)).map((t) => `<tr>
      <td>${escape(t.cikk)}<div class="muted">${ft.format(t.mennyiseg)} ${escape(t.egyseg)}</div></td>
      ${t.arak.map((a, i) => `<td class="num${t.legolcsobb[i] ? ' legolcsobb' : ''}">${a === null ? '–' : ft.format(a)}</td>`).join('')}
    </tr>`).join('');
  hol.innerHTML = `<div class="bolt-kartyak">${kartyak}</div>
    <p>Ha minden tételt a legolcsóbb helyről veszel: <strong>${penz(e.legolcsobbOsszeg)}</strong> (${e.legolcsobbDb} tétel)${
      nyeres > 0 && jelenlegi.db ? `, <span class="ok-szoveg">${penz(nyeres)}-tal kevesebb</span>, mint a jelenlegi beszerzési áron` : ''}.</p>
    <div class="actions kicsi-gombok"><button type="button" class="kicsi" id="legolcsobb-arak">Legolcsóbb árak átvétele</button></div>
    ${lenyilo('boltok-tabla', `Tételenként (${e.tetelek.filter((t) => t.arak.some((a) => a !== null)).length})`, 'egységár, bruttó', `
      <div class="tabla-gorgeto"><table class="bolt-tabla"><thead><tr><th>Cikk</th>${fej}</tr></thead><tbody>${tabla}</tbody></table></div>`)}`;
}

// Mielőtt egy másik bolt árai felülírják a beszerzési árakat, a mostaniak külön oszlopba
// kerülnek ("Eredeti beszerzési ár"), így az összevetésben megmaradnak és visszaállíthatók.
function eredetiArakMegorzese() {
  if (allapot.boltok.some((b) => b.id === 'eredeti')) return;
  const arak = Object.fromEntries(Object.entries(allapot.arak).map(([k, a]) => [k, a?.kedvezmenyes]).filter(([, v]) => v > 0));
  if (!Object.keys(arak).length) return;
  allapot.boltok.unshift({ id: 'eredeti', nev: allapot.feltoltesek.kedvezmenyes?.fajl?.replace(/\.pdf$/i, '') || 'Eredeti beszerzési ár', arak, datum: maISO() });
  ment(BOLTOK_KULCS, allapot.boltok);
}

function boltArakAtvetele(arak) {
  const lista = new Set(allapot.anyag.sorok.map(tetelKulcs));
  const atvett = {};
  for (const [k, v] of Object.entries(arak)) {
    if (!lista.has(k) || !(v > 0)) continue;
    allapot.arak[k] = { ...allapot.arak[k], kedvezmenyes: v };
    atvett[k] = { kedvezmenyes: v };
  }
  ment(ARAK_KULCS, allapot.arak);
  armemoriaRogzites(atvett);
  megjelenitArTabla(true);
  megjelenitKimenetek();
  return Object.keys(atvett).length;
}

async function boltPdfFeltoltes(fajl) {
  const uz = $('bolt-uzenet');
  uz.innerHTML = `<p class="muted">${escape(fajl.name)} beolvasása…</p>`;
  try {
    const szoveg = await pdfSzoveg(fajl);
    if (!szoveg.trim()) { uz.innerHTML = '<p class="warn">Ebben a PDF-ben nincs kiolvasható szöveg.</p>'; return; }
    const listaSorok = allapot.anyag.sorok.map((s) => (s.listaMennyiseg !== undefined ? { ...s, mennyiseg: s.listaMennyiseg } : s));
    const { arak } = boltValaszBeolvasas(szoveg, listaSorok, 'kedvezmenyes');
    const boltArak = Object.fromEntries([...arak].map(([k, a]) => [k, a.kedvezmenyes]).filter(([, v]) => v > 0));
    if (!Object.keys(boltArak).length) { uz.innerHTML = '<p class="warn">Egy listatétel árát sem találtam ebben a PDF-ben.</p>'; return; }
    const nev = fajl.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').trim().slice(0, 40) || 'Másik bolt';
    allapot.boltok.push({ id: `b${Date.now().toString(36)}`, nev, fajl: fajl.name, arak: boltArak, datum: maISO() });
    ment(BOLTOK_KULCS, allapot.boltok);
    uz.innerHTML = `<p><strong>${Object.keys(boltArak).length} tétel</strong> ára beolvasva (${escape(fajl.name)}). A bolt nevét lent átírhatod.</p>`;
    megjelenitBoltok();
  } catch (err) {
    uz.innerHTML = `<p class="error">A PDF nem olvasható be: ${escape(err.message)}</p>`;
  }
}

function boltEsemenyek() {
  $('pdf-masik-bolt').addEventListener('change', (ev) => {
    const fajl = ev.target.files?.[0];
    ev.target.value = '';
    if (fajl) boltPdfFeltoltes(fajl);
  });
  $('bolt-osszevetes').addEventListener('change', (ev) => {
    const b = allapot.boltok.find((x) => x.id === ev.target.dataset?.bolt);
    if (!b) return;
    b.nev = ev.target.value.trim() || b.nev;
    ment(BOLTOK_KULCS, allapot.boltok);
    megjelenitBoltok();
  });
  $('bolt-osszevetes').addEventListener('click', async (ev) => {
    const hasznal = ev.target.closest('[data-bolt-hasznal]');
    const torol = ev.target.closest('[data-bolt-torol]');
    if (hasznal) {
      const b = allapot.boltok.find((x) => x.id === hasznal.dataset.boltHasznal);
      eredetiArakMegorzese();
      const n = boltArakAtvetele(b.arak);
      kiir('bolt-uzenet', `${n} tétel beszerzési ára átírva (${b.nev}).`);
    } else if (torol) {
      const b = allapot.boltok.find((x) => x.id === torol.dataset.boltTorol);
      const v = await kerdes({ cim: 'Eltávolítod?', szoveg: `${b.nev} árai kikerülnek az összevetésből. A már átvett beszerzési árak maradnak.`,
        gombok: [{ felirat: 'Mégse', ertek: 'nem', stilus: 'masodlagos' }, { felirat: 'Eltávolítás', ertek: 'igen', stilus: 'veszelyes' }] });
      if (v !== 'igen') return;
      allapot.boltok = allapot.boltok.filter((x) => x.id !== b.id);
      ment(BOLTOK_KULCS, allapot.boltok);
      megjelenitBoltok();
    } else if (ev.target.closest('#legolcsobb-arak')) {
      eredetiArakMegorzese();
      const legolcsobb = {};
      for (const s of allapot.anyag.sorok) {
        const k = tetelKulcs(s);
        const arak = allapot.boltok.map((b) => b.arak[k]).filter((v) => v > 0);
        const most = allapot.arak[k]?.kedvezmenyes;
        if (arak.length && (!Number.isFinite(most) || Math.min(...arak) < most)) legolcsobb[k] = Math.min(...arak);
      }
      const n = boltArakAtvetele(legolcsobb);
      kiir('bolt-uzenet', n ? `${n} tételnél olcsóbb beszerzési ár lett beírva.` : 'A jelenlegi beszerzési árak már a legolcsóbbak.');
    }
  });
}

// ---- Biztonsági mentés emlékeztető ----

const szamKulcs = (k) => { try { return Number(localStorage.getItem(k)) || 0; } catch { return 0; } };

function mentesEmlekezteto() {
  const sav = $('mentes-emlekezteto');
  if (!sav) return;
  const utolso = szamKulcs(MENTES_IDO_KULCS);
  const esedekes = mentesEsedekes({ vanAdat: allapot.ajanlatok.length > 0, utolso, halasztva: szamKulcs(MENTES_HALASZT_KULCS) });
  sav.hidden = !esedekes;
  if (esedekes) {
    kiir('mentes-emlekezteto-szoveg', utolso
      ? `Az utolsó biztonsági mentés ${Math.floor((Date.now() - utolso) / 86400000)} napja készült.`
      : 'Még nem készült biztonsági mentés az ajánlatokról.');
  }
}

function jeloltHtml(j) {
  const arak = Object.entries(j.ar).filter(([, v]) => v !== null)
    .map(([m, v]) => `${MEZO_NEV[m]} ${penz(v)}`).join(', ');
  return `<li>
    <span><strong>${escape(j.cikk)}</strong><br>
      <span class="muted">${ft.format(j.mennyiseg)} ${escape(j.egyseg)} · ${arak}</span></span>
  </li>`;
}

function beolvas() {
  $('beolvasas-eredmeny').innerHTML = arakAtvetele($('bolt-valasz').value, null);
}

async function pdfFeltoltes(mezo, fajl) {
  const el = $(`eredmeny-${mezo}`);
  el.innerHTML = `<p class="muted">${escape(fajl.name)} beolvasása…</p>`;
  try {
    const szoveg = await Promise.race([
      pdfSzoveg(fajl),
      new Promise((_, elutasit) => setTimeout(() => elutasit(new Error('40 másodperc alatt sem sikerült (lassú kapcsolat vagy túl nagy fájl).')), 40000)),
    ]);
    if (!szoveg.trim()) {
      el.innerHTML = '<p class="warn">Ebben a PDF-ben nincs kiolvasható szöveg (valószínűleg szkennelt kép). Írd be az árakat kézzel.</p>';
      return;
    }
    el.innerHTML = `<p class="muted fajlnev">${escape(fajl.name)}</p>${arakAtvetele(szoveg, mezo, fajl.name)}
      <details class="reszlet"><summary>Kiolvasott szöveg</summary><pre>${escape(szoveg)}</pre></details>`;
  } catch (err) {
    el.innerHTML = `<p class="error">A PDF nem olvasható be: ${escape(err.message)}</p>`;
  }
}

// ---- Plusz tételek és a könyvtár bővítése ----

const EGYSEG_VALASZTEK = ['db', 'fm', 'pár', 'csomag', 'szett', 'kg', 'tekercs'];

// mennyisegFrissit: ha már szerepel, a mennyiséget is átveszi (a bolt PDF-jéből újratöltéskor).
function pluszHozzaad(t, mennyisegFrissit = false) {
  const k = tetelKulcs(t);
  const meglevo = allapot.plusz.find((p) => tetelKulcs(p) === k);
  if (!meglevo) {
    allapot.plusz.push({ cikk: t.cikk, egyseg: t.egyseg, mennyiseg: t.mennyiseg, ...(t.forras && { forras: t.forras }) });
  } else if (mennyisegFrissit) {
    meglevo.mennyiseg = t.mennyiseg;
  }
  if (t.ar) arBeiras(k, t.ar);
  ment(PLUSZ_KULCS, allapot.plusz);
  ment(ARAK_KULCS, allapot.arak);
}

function kiallasDarab(nev) {
  const kod = osszesKiallas().find((t) => t.nev === nev)?.kod;
  return Number(allapot.projekt?.kiallasok?.[kod]) || 0;
}

function javasoltMennyiseg(t, kiallas) {
  const db = kiallasDarab(kiallas);
  return db > 0 ? Math.round((t.mennyiseg / db) * 100) / 100 : t.mennyiseg;
}

function megjelenitPlusz() {
  const sorok = allapot.plusz.map((t, i) => {
    const nyitva = allapot.konyvtarbaNyitva === i;
    const alapKiallas = osszesKiallas().find((k) => kiallasDarab(k.nev) > 0)?.nev ?? KIALLAS_TIPUSOK[0].nev;
    return `<li class="plusz-sor">
      <div class="plusz-fej">
        <span class="plusz-nev">${escape(t.cikk)}${t.forras === 'pdf' ? '<br><span class="muted">a bolt PDF-jéből</span>' : ''}</span>
        <span class="plusz-menny"><input type="number" min="0" step="any" class="plusz-mennyiseg" data-i="${i}"
          value="${t.mennyiseg}" aria-label="Mennyiség: ${escape(t.cikk)}"> ${escape(t.egyseg)}</span>
      </div>
      <div class="actions kicsi-gombok">
        <button type="button" class="kicsi button plusz-konyvtarba" data-i="${i}" aria-expanded="${nyitva}">Könyvtárba…</button>
        <button type="button" class="kicsi button plusz-torles" data-i="${i}">Törlés</button>
      </div>
      ${nyitva ? `<div class="konyvtarba">
        <label>Melyik kiálláshoz?
          <select id="kb-kiallas">${osszesKiallas().map((k) => `<option value="${escape(k.nev)}"${k.nev === alapKiallas ? ' selected' : ''}>${escape(kiallasCimke(k.nev))}</option>`).join('')}</select></label>
        <label>Mennyiség kiállásonként
          <span class="nowrap"><input id="kb-mennyiseg" type="number" min="0" step="any" value="${javasoltMennyiseg(t, alapKiallas)}"> ${escape(t.egyseg)}</span></label>
        <div class="actions">
          <button type="button" class="kicsi" id="kb-mentes" data-i="${i}">Mentés a könyvtárba</button>
          <button type="button" class="kicsi button" id="kb-megse">Mégse</button>
        </div>
      </div>` : ''}
    </li>`;
  }).join('');

  const bovitesek = allapot.bovitesek.map((b, i) => `<li>
      <span><strong>${escape(kiallasCimke(b.kiallas))}:</strong> ${escape(b.cikk)} – ${ft.format(b.mennyiseg)} ${escape(b.egyseg)}
        ${bennVanAzAlapban(allapot.alapKonyvtar, b) ? ' <span class="muted">(már benne van az alapkönyvtárban, törölhető)</span>' : ''}</span>
      <button type="button" class="kicsi button bovites-torles" data-i="${i}" aria-label="Törlés: ${escape(b.cikk)}">×</button>
    </li>`).join('');

  $('plusz').innerHTML = `
    <h2 class="kartya-fej"><span class="fej-ikon">${ikon('plusz')}</span>Plusz tételek</h2>
    ${allapot.plusz.length ? lenyilo('plusz', `Plusz tételek (${allapot.plusz.length})`, '', `<ul class="plusz-lista">${sorok}</ul>`, allapot.plusz.length <= 5)
      : '<p class="muted">A bolt PDF-jében talált új tételek, vagy amit kézzel adsz hozzá. A „Könyvtárba…” gombbal egy kiállás csomagjába is elmenthető, így legközelebb magától benne lesz.</p>'}
    <form id="plusz-uj" class="plusz-uj">
      <input id="plusz-uj-cikk" placeholder="Új tétel megnevezése" aria-label="Új tétel megnevezése" required>
      <input id="plusz-uj-menny" type="number" min="0" step="any" value="1" aria-label="Mennyiség">
      <select id="plusz-uj-egyseg" aria-label="Egység">${EGYSEG_VALASZTEK.map((e) => `<option>${e}</option>`).join('')}</select>
      <button type="submit" class="kicsi">Hozzáadás</button>
    </form>
    ${diktalasHtml()}
    <details class="bovitesek"${allapot.bovitesek.length ? '' : ' hidden'}>
      <summary>A könyvtárhoz hozzáadott tételek (${allapot.bovitesek.length})</summary>
      <p class="muted">Ezek csak ezen az eszközön vannak meg. Töltsd le a teljes könyvtárat, és küldd el, hogy bekerüljön az alkalmazásba, és minden eszközön meglegyen.</p>
      <ul class="bovites-lista">${bovitesek}</ul>
      <button type="button" class="kicsi" id="konyvtar-letoltes">Könyvtár letöltése (CSV)</button>
    </details>
    <p id="plusz-uzenet" class="muted" aria-live="polite"></p>`;
}

const MIKROFON = `<svg viewBox="0 0 24 24" aria-hidden="true" class="ikon"><rect x="9" y="3" width="6" height="11" rx="3"/>
  <path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>`;

function diktalasHtml() {
  const fut = Boolean(allapot.diktalasLeallit);
  const gomb = vanDiktalas()
    ? `<div class="diktalas">
        <button type="button" id="diktal" class="kicsi${fut ? ' fut' : ' button'}" aria-pressed="${fut}">
          ${MIKROFON}<span>${fut ? 'Leállítás' : 'Diktálás'}</span></button>
        <span id="diktal-allapot" class="muted" aria-live="polite">${escape(fut ? 'Hallgatlak… mondd a tételeket, pl. „teflonszalag két darab, golyóscsap fél col három darab”.' : allapot.diktalasUzenet)}</span>
      </div>`
    : '<p class="megj">Tipp: a telefon billentyűzetének mikrofon gombjával is diktálhatod a megnevezést.</p>';
  if (!allapot.diktalt.length) return gomb;
  const sorok = allapot.diktalt.map((t, i) => `<li>
      <span><strong>${escape(t.cikk)}</strong><br><span class="muted">${ft.format(t.mennyiseg)} ${escape(t.egyseg)}</span></span>
      <span class="nowrap">
        <button type="button" class="kicsi diktalt-hozzaad" data-i="${i}">+ Hozzáadás</button>
        <button type="button" class="kicsi button diktalt-javit" data-i="${i}" aria-label="Javítás: ${escape(t.cikk)}">Javítás</button>
      </span>
    </li>`).join('');
  return `${gomb}
    <div class="diktalt">
      <p class="muted">Felismert tételek. Nézd át, és vedd fel őket; a „Javítás” a fenti mezőkbe teszi, ott átírhatod.</p>
      <ul class="jeloltek">${sorok}</ul>
      <div class="actions kicsi-gombok">
        <button type="button" class="kicsi" id="diktalt-mind">Mind hozzáadása</button>
        <button type="button" class="kicsi button" id="diktalt-elvet">Elvetés</button>
      </div>
    </div>`;
}

function diktalasInditas() {
  if (allapot.diktalasLeallit) {
    allapot.diktalasLeallit();
    return;
  }
  allapot.diktalasUzenet = '';
  try {
    allapot.diktalasLeallit = diktalas({
      kozben: (szoveg) => { const el = $('diktal-allapot'); if (el) el.textContent = `„${szoveg}”`; },
      kesz: (szoveg) => {
        const uj = diktaltTetelek(szoveg);
        allapot.diktalt.push(...uj);
        allapot.diktalasUzenet = uj.length ? `Felismerve: „${szoveg}”` : `Nem találtam benne tételt: „${szoveg}”`;
      },
      hiba: (uzenet) => { allapot.diktalasUzenet = uzenet; },
      vege: () => { allapot.diktalasLeallit = null; megjelenitPlusz(); },
    });
  } catch (err) {
    allapot.diktalasLeallit = null;
    allapot.diktalasUzenet = `A diktálás nem indult el: ${err.message}`;
  }
  megjelenitPlusz();
}

function konyvtarFrissites() {
  allapot.konyvtar = felulirtKonyvtar(bovitettKonyvtar(allapot.alapKonyvtar, allapot.bovitesek), allapot.konyvtarFelulirasok);
  ment(BOVITES_KULCS, allapot.bovitesek);
  ment(KONYVTAR_FELULIR_KULCS, allapot.konyvtarFelulirasok);
}

function pluszEsemenyek() {
  const doboz = $('plusz');
  doboz.addEventListener('input', (ev) => {
    if (!ev.target.classList.contains('plusz-mennyiseg')) return;
    const t = allapot.plusz[Number(ev.target.dataset.i)];
    t.mennyiseg = Math.max(0, Number(ev.target.value) || 0);
    ment(PLUSZ_KULCS, allapot.plusz);
    frissit();
  });
  doboz.addEventListener('change', (ev) => {
    if (ev.target.id !== 'kb-kiallas') return;
    const t = allapot.plusz[allapot.konyvtarbaNyitva];
    if (t) $('kb-mennyiseg').value = javasoltMennyiseg(t, ev.target.value);
  });
  doboz.addEventListener('submit', (ev) => {
    if (ev.target.id !== 'plusz-uj') return;
    ev.preventDefault();
    const cikk = $('plusz-uj-cikk').value.trim().replace(/\s+/g, ' ');
    if (!cikk) return;
    pluszHozzaad({ cikk, mennyiseg: Math.max(0, Number($('plusz-uj-menny').value) || 1), egyseg: $('plusz-uj-egyseg').value });
    frissit();
    megjelenitPlusz();
    megjelenitArTabla(true);
  });
  doboz.addEventListener('click', (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    const i = Number(b.dataset.i);
    if (b.classList.contains('plusz-torles')) {
      allapot.plusz.splice(i, 1);
      allapot.konyvtarbaNyitva = null;
      ment(PLUSZ_KULCS, allapot.plusz);
      frissit();
      megjelenitPlusz();
    } else if (b.classList.contains('plusz-konyvtarba')) {
      allapot.konyvtarbaNyitva = allapot.konyvtarbaNyitva === i ? null : i;
      megjelenitPlusz();
    } else if (b.id === 'kb-megse') {
      allapot.konyvtarbaNyitva = null;
      megjelenitPlusz();
    } else if (b.id === 'kb-mentes') {
      const t = allapot.plusz[i];
      const kiallas = $('kb-kiallas').value;
      const mennyiseg = Number($('kb-mennyiseg').value);
      if (!(mennyiseg > 0)) { $('kb-mennyiseg').focus(); return; }
      allapot.bovitesek.push({ kiallas, cikk: t.cikk, mennyiseg, egyseg: t.egyseg });
      konyvtarFrissites();
      // Ha a projektben van ilyen kiállás, a tételt mostantól a csomag adja, plusz tételként már nem kell.
      const db = kiallasDarab(kiallas);
      if (db > 0) allapot.plusz.splice(i, 1);
      ment(PLUSZ_KULCS, allapot.plusz);
      allapot.konyvtarbaNyitva = null;
      frissit();
      megjelenitPlusz();
      $('plusz-uzenet').textContent = db > 0
        ? `Elmentve: ${kiallas} – ${t.cikk}. Az anyaglistán mostantól a csomag adja (${db} kiállás × ${ft.format(mennyiseg)} ${t.egyseg}).`
        : `Elmentve: ${kiallas} – ${t.cikk}. Ebben az ajánlatban plusz tételként marad, mert nincs ${kiallas} kiállás.`;
    } else if (b.classList.contains('bovites-torles')) {
      allapot.bovitesek.splice(i, 1);
      konyvtarFrissites();
      frissit();
      megjelenitPlusz();
      $('plusz').querySelector('details.bovitesek')?.setAttribute('open', '');
    } else if (b.id === 'diktal') {
      diktalasInditas();
    } else if (b.classList.contains('diktalt-hozzaad') || b.id === 'diktalt-mind') {
      const felvenni = b.id === 'diktalt-mind' ? allapot.diktalt.splice(0) : allapot.diktalt.splice(i, 1);
      for (const t of felvenni) pluszHozzaad(t);
      allapot.diktalasUzenet = `${felvenni.length} tétel hozzáadva.`;
      frissit();
      megjelenitPlusz();
      megjelenitArTabla(true);
    } else if (b.classList.contains('diktalt-javit')) {
      const [t] = allapot.diktalt.splice(i, 1);
      megjelenitPlusz();
      $('plusz-uj-cikk').value = t.cikk;
      $('plusz-uj-menny').value = t.mennyiseg;
      if (!EGYSEG_VALASZTEK.includes(t.egyseg)) $('plusz-uj-egyseg').append(new Option(t.egyseg));
      $('plusz-uj-egyseg').value = t.egyseg;
      $('plusz-uj-cikk').focus();
    } else if (b.id === 'diktalt-elvet') {
      allapot.diktalt = [];
      allapot.diktalasUzenet = '';
      megjelenitPlusz();
    } else if (b.id === 'konyvtar-letoltes') {
      const blob = new Blob(['\uFEFF', konyvtarCsv(allapot.konyvtar)], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'kiallas-konyvtar.csv';
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    }
  });

}

// ---- Kimenetek ----

// Ha már van bolti árajánlat (PDF vagy bemásolt szöveg), az az irányadó: a lista azon
// tételei, amiknek nincs bolti áruk (nem szerepelnek a bolt válaszában), kimaradnak az
// ajánlatból. Ha kézzel árat kapnak, visszakerülnek.
const boltiArVan = (s) => Number.isFinite(allapot.arak[tetelKulcs(s)]?.bolti);
const boltValaszVan = () => Boolean(allapot.feltoltesek.bolti || allapot.feltoltesek.szoveg);
function ajanlatSorok() {
  return boltValaszVan() ? allapot.anyag.sorok.filter(boltiArVan) : allapot.anyag.sorok;
}

// Az "E-mail az ügyfélnek" gomb címe: előre megírt levél az ügyfél címére.
// ---- Ismert tételnevek: javaslat gépeléskor, hogy ugyanaz a tétel ne legyen kétféle néven ----

// Minden név, ami már előfordult: könyvtár, plusz tételek, munkák és gerinc anyaga, anyaglista, ármemória.
function ismertNevek() {
  const m = new Map();
  const add = (cikk, egyseg) => { if (cikk && !m.has(cikk)) m.set(cikk, egyseg || 'db'); };
  for (const s of allapot.anyag?.sorok ?? []) add(s.cikk, s.egyseg);
  for (const sorok of allapot.konyvtar?.values() ?? []) for (const s of sorok) add(s.cikk, s.egyseg);
  for (const t of allapot.plusz) add(t.cikk, t.egyseg);
  for (const mu of allapot.sajatMunkak) for (const a of mu.anyag ?? []) add(a.cikk, a.egyseg);
  for (const f of Object.values(allapot.munkadijFelulirasok)) for (const a of f?.anyag ?? []) add(a.cikk, a.egyseg);
  for (const sorok of Object.values(allapot.gerincAnyag)) for (const a of sorok ?? []) add(a.cikk, a.egyseg);
  for (const k of Object.keys(allapot.armemoria)) { const [c, e] = k.split('|'); add(c, e); }
  return m;
}

function nevJavaslatBekotes() {
  const lista = document.createElement('datalist');
  lista.id = 'ismert-nevek';
  document.body.append(lista);
  const mezo = (el) => el?.matches?.('.as-cikk, #plusz-uj-cikk');
  const javaslatHely = (el) => el.closest('.anyag-sor') ?? el.closest('form');
  // Fókuszra: a böngésző saját listája (gépelés közben szűkül).
  document.addEventListener('focusin', (ev) => {
    if (!mezo(ev.target)) return;
    lista.innerHTML = [...ismertNevek().keys()].sort((a, b) => a.localeCompare(b, 'hu')).map((n) => `<option value="${escape(n)}">`).join('');
    ev.target.setAttribute('list', 'ismert-nevek');
  });
  let idozito = null;
  document.addEventListener('input', (ev) => {
    if (!mezo(ev.target)) return;
    clearTimeout(idozito);
    const el = ev.target;
    idozito = setTimeout(() => {
      const hely = javaslatHely(el);
      let doboz = hely.nextElementSibling?.classList.contains('nev-javaslat') ? hely.nextElementSibling : null;
      const ismertek = ismertNevek();
      const talalat = hasonloNevek(el.value, [...ismertek.keys()]);
      if (!talalat.length) { doboz?.remove(); return; }
      if (!doboz) {
        doboz = document.createElement('div');
        doboz.className = 'nev-javaslat';
        hely.after(doboz);
      }
      doboz.innerHTML = `<span>Már van hasonló a listában, így írd, hogy egynek számítson:</span>
        ${talalat.map((n) => `<button type="button" class="kicsi button" data-nev="${escape(n)}" data-egyseg="${escape(ismertek.get(n))}">${escape(n)}</button>`).join('')}`;
      doboz.javaslatMezo = el;
    }, 250);
  });
  document.addEventListener('click', (ev) => {
    const b = ev.target.closest('.nev-javaslat [data-nev]');
    if (!b) return;
    ev.preventDefault();
    const doboz = b.closest('.nev-javaslat');
    const el = doboz.javaslatMezo;
    if (!el) return;
    el.value = b.dataset.nev;
    // Az egység is igazodjon a meglévőhöz (különben két külön tétel lenne: db és fm).
    const egysegMezo = el.closest('.anyag-sor')?.querySelector('.as-egyseg') ?? (el.id === 'plusz-uj-cikk' ? $('plusz-uj-egyseg') : null);
    if (egysegMezo && b.dataset.egyseg) {
      if (![...egysegMezo.options].some((o) => o.value === b.dataset.egyseg)) egysegMezo.append(new Option(b.dataset.egyseg));
      egysegMezo.value = b.dataset.egyseg;
    }
    doboz.remove();
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

// ---- AI anyagjavaslat (a saját Cloudflare Workeren át; a kulcs ott van, nem az appban) ----

const AI_MODELLEK = [
  { kod: 'claude-opus-5-5', nev: 'Claude Opus 5.5 – a legalaposabb', ar: [4, 20] },
  { kod: 'claude-sonnet-5-5', nev: 'Claude Sonnet 5.5 – olcsóbb', ar: [2, 10] },
];
const aiBeallitas = () => ({ url: '', jelszo: '', modell: AI_MODELLEK[0].kod, ...betoltMentett(AI_KULCS) });
const FT_PER_DOLLAR = 370;

function aiBeallitasAblak(utana) {
  const b = aiBeallitas();
  szerkesztoAblak({
    cim: 'AI anyagjavaslat – beállítás',
    leiras: 'A Cloudflare Worker címe és a jelszó, amit ott APP_JELSZO néven adtál meg. Csak ezen a telefonon tárolódik.',
    torzs: `<label class="mezo"><span>Worker címe</span><input name="url" type="url" inputmode="url" required
        placeholder="https://ai-javaslat.….workers.dev" value="${escape(b.url)}"></label>
      <label class="mezo"><span>Jelszó</span><input name="jelszo" type="password" required autocomplete="off" value="${escape(b.jelszo)}"></label>
      <label class="mezo"><span>Modell</span><select name="modell">${AI_MODELLEK.map((m) => `<option value="${m.kod}"${m.kod === b.modell ? ' selected' : ''}>${escape(m.nev)}</option>`).join('')}</select></label>
      ${aiElutasitott().length ? `<label class="check"><input type="checkbox" name="felejt"><span>Elutasított javaslatok elfelejtése (${aiElutasitott().length}) – újra javasolhatja őket</span></label>` : ''}`,
    mentes: (urlap) => {
      const url = urlap.elements.url.value.trim().replace(/\/$/, '');
      if (!/^https:\/\//.test(url)) { urlap.elements.url.setCustomValidity('https:// kezdetű cím kell.'); urlap.elements.url.reportValidity(); return false; }
      ment(AI_KULCS, { url, jelszo: urlap.elements.jelszo.value, modell: urlap.elements.modell.value });
      if (urlap.elements.felejt?.checked) ment(AI_ELUTASITOTT_KULCS, []);
      setTimeout(() => utana?.(), 0);
      return true;
    },
  });
}

const aiElutasitott = () => (betoltMentett(AI_ELUTASITOTT_KULCS) ?? []).filter((x) => typeof x === 'string');

// A kéréshez csak a munka adatai mennek: kitöltött tételek, csomagok, anyaglista, ismert tételnevek, leírás.
function aiKeresAdat() {
  const p = olvas();
  const projekt = [];
  for (const label of form.querySelectorAll('.mezolista > label')) {
    const el = label.querySelector('input, select');
    if (!el) continue;
    const nevEl = label.querySelector('.mezo-nev')?.cloneNode(true);
    nevEl?.querySelector('small')?.remove();
    const nev = (nevEl?.textContent ?? el.name).trim();
    if (el.tagName === 'SELECT') { if (el.value !== 'nincs') projekt.push(`${nev}: ${el.selectedOptions[0]?.textContent}`); }
    else if (Number(el.value) > 0) projekt.push(`${nev}: ${el.value}`);
  }
  if (form.elements.puffer?.checked) projekt.push('Puffertartály: igen');
  const csomagok = osszesKiallas().filter((t) => Number(p.kiallasok?.[t.kod]) > 0)
    .map((t) => ({ nev: kiallasCimke(t.nev), db: Number(p.kiallasok[t.kod]), anyag: allapot.konyvtar.get(t.nev) ?? [] }));
  const munkak = (allapot.munkadij?.sorok ?? []).map((m) => ({
    nev: m.tetel, mennyiseg: m.mennyiseg, egyseg: m.egyseg,
    anyag: allapot.munkadijFelulirasok[m.kod]?.anyag ?? allapot.sajatMunkak.find((x) => x.kod === m.kod)?.anyag ?? [],
  })).filter((m) => m.anyag.length);
  for (const at of ['16', '20']) {
    if (Number(p.gerinc?.[at]) > 0) munkak.push({ nev: `Gerinc ${at}-os cső`, mennyiseg: Number(p.gerinc[at]), egyseg: 'fm', anyag: allapot.gerincAnyag[at] ?? gerincAlapAnyag(at) });
  }
  const adat = {
    leiras: $('ai-leiras').value,
    projekt,
    csomagok,
    munkak,
    anyaglista: allapot.anyag.sorok.map((s) => ({ cikk: s.cikk, mennyiseg: s.mennyiseg, egyseg: s.egyseg })),
    ismertNevek: [...ismertNevek()].slice(0, 500).map(([cikk, egyseg]) => ({ cikk, egyseg })),
    elutasitott: aiElutasitott(),
  };
  // A régi (1.) Worker-változat ezekből a mezőkből dolgozik; az újabb a rendszer/uzenet/sema mezőket használja.
  return { ...adat, rendszer: AI_RENDSZER, uzenet: aiUzenet(adat), sema: AI_SEMA, erofeszites: 'high' };
}

async function aiJavaslatKeres() {
  const b = aiBeallitas();
  if (!b.url || !b.jelszo) { aiBeallitasAblak(aiJavaslatKeres); return; }
  const hol = $('ai-eredmeny');
  const gomb = $('ai-keres');
  if (!allapot.anyag.sorok.length && !$('ai-leiras').value.trim()) {
    hol.innerHTML = '<p class="warn">Adj meg kiállást, munkát vagy írd le röviden a munkát.</p>';
    return;
  }
  gomb.disabled = true;
  hol.innerHTML = '<p class="muted">Az AI dolgozik rajta… (általában 20–60 másodperc)</p>';
  const megszakit = new AbortController();
  const idozito = setTimeout(() => megszakit.abort(), 150000);
  try {
    const v = await fetch(b.url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: megszakit.signal,
      body: JSON.stringify({ ...aiKeresAdat(), jelszo: b.jelszo, modell: b.modell }),
    });
    const adat = await v.json().catch(() => ({ hiba: `Váratlan válasz (HTTP ${v.status}).` }));
    if (!v.ok || adat.hiba) {
      hol.innerHTML = `<p class="error">${escape(adat.hiba ?? `HTTP ${v.status}`)}</p>${v.status === 401 ? '<p class="muted">Ellenőrizd a jelszót a Beállításnál.</p>' : ''}`;
      return;
    }
    const e = adat.eredmeny ?? adat; // a régi Worker közvetlenül adja vissza
    allapot.aiJavaslatok = aiUtofeldolgozas(e.javaslatok, ismertNevek(), aiElutasitott());
    allapot.aiRegiWorker = !adat.verzio;
    const m = AI_MODELLEK.find((x) => adat.modell?.startsWith(x.kod)) ?? AI_MODELLEK.find((x) => x.kod === b.modell);
    const t = adat.tokenek ?? {};
    const koltseg = m ? ((t.input_tokens ?? 0) * m.ar[0] + (t.output_tokens ?? 0) * m.ar[1]) / 1e6 * FT_PER_DOLLAR : 0;
    megjelenitAiJavaslat(e.megjegyzes, koltseg);
  } catch (err) {
    hol.innerHTML = `<p class="error">${err.name === 'AbortError' ? 'Túl sokáig tartott, próbáld újra.' : `Nem sikerült elérni a Workert: ${escape(err.message)}`}</p>
      <p class="muted">Nézd meg a Worker címét a Beállításnál, és hogy van-e internet.</p>`;
  } finally {
    clearTimeout(idozito);
    gomb.disabled = false;
  }
}

function megjelenitAiJavaslat(megjegyzes, koltseg) {
  const lista = allapot.aiJavaslatok ?? [];
  $('ai-eredmeny').innerHTML = `${megjegyzes ? `<p>${escape(megjegyzes)}</p>` : ''}
    ${lista.length ? `<ul class="ai-lista">${lista.map((j, i) => `<li>
        <input type="checkbox"${j.biztos === 'biztos' ? ' checked' : ''} data-ai-i="${i}" aria-label="Felvétel: ${escape(j.cikk)}">
        <span class="ai-nev">${escape(j.cikk)}${j.biztos === 'biztos' ? '<span class="ai-cimke">biztosan kell</span>' : '<span class="ai-cimke ai-talan">talán</span>'}${j.ismert ? '' : '<span class="ai-cimke">új tétel</span>'}</span>
        <span class="ai-menny"><input type="number" min="0" step="any" data-ai-menny="${i}" value="${j.mennyiseg}" aria-label="Mennyiség"> ${escape(j.egyseg)}</span>
        <span class="ai-indok">${escape(j.indok ?? '')}</span>
      </li>`).join('')}</ul>
      <p class="muted" style="font-size:.78rem;margin:0">A „talán” javaslatok nincsenek bepipálva. Ami bepipálatlan marad, azt az AI legközelebb nem javasolja.</p>
      <div class="actions"><button type="button" id="ai-felvesz">Kijelöltek felvétele</button></div>`
      : '<p class="ok-szoveg">Az AI szerint nem hiányzik semmi a listáról.</p>'}
    ${koltseg ? `<p class="muted" style="font-size:.78rem">A kérés becsült ára: kb. ${Math.max(1, Math.round(koltseg))} Ft.</p>` : ''}
    ${allapot.aiRegiWorker ? '<p class="warn" style="font-size:.82rem">A Cloudflare Worker még a régi kódot futtatja, ezért a javaslatok pontatlanabbak. Cseréld le a Worker kódját az új változatra.</p>' : ''}`;
}

// A munka leírásának diktálása: a felismert szöveg a meglévő után kerül; a Leállítás gomb zárja le.
function aiDiktalasBekotes() {
  const gomb = $('ai-diktal');
  const mezo = $('ai-leiras');
  const allapotEl = $('ai-diktal-allapot');
  if (!vanDiktalas()) return; // a billentyűzet mikrofonja továbbra is használható
  gomb.hidden = false;
  let leallit = null;
  const felirat = (fut) => {
    gomb.setAttribute('aria-pressed', String(fut));
    gomb.lastChild.textContent = fut ? 'Leállítás' : 'Diktálás';
  };
  gomb.addEventListener('click', () => {
    if (leallit) { leallit(); return; }
    const elotte = mezo.value.trim();
    const nagy = (s) => (s ? s[0].toLocaleUpperCase('hu') + s.slice(1) : s);
    const osszefuz = (s) => [elotte, nagy(s)].filter(Boolean).join(elotte && !/[.!?]$/.test(elotte) ? '. ' : ' ');
    allapotEl.hidden = false;
    allapotEl.textContent = 'Hallgatlak… mondd el a munkát, pl. „panel fürdőszoba, kád helyett zuhanykabin, a gerincet is cseréljük”. A végén nyomd meg a Leállítás gombot.';
    try {
      leallit = diktalas({
        kozben: (s) => { mezo.value = osszefuz(s); },
        kesz: (s) => { mezo.value = osszefuz(s); allapotEl.textContent = 'Kész. Átírhatod, vagy kérheted a javaslatot.'; },
        hiba: (u) => { allapotEl.textContent = u; },
        vege: () => { leallit = null; felirat(false); if (/Hallgatlak/.test(allapotEl.textContent)) allapotEl.hidden = true; },
      }, { folyamatos: true });
      felirat(true);
    } catch (err) {
      leallit = null;
      allapotEl.textContent = `A diktálás nem indult el: ${err.message}`;
    }
  });
}

function aiEsemenyek() {
  aiDiktalasBekotes();
  $('ai-keres').addEventListener('click', aiJavaslatKeres);
  $('ai-beallitas').addEventListener('click', () => aiBeallitasAblak());
  $('ai-eredmeny').addEventListener('click', (ev) => {
    if (!ev.target.closest('#ai-felvesz')) return;
    let n = 0;
    const elutasitott = aiElutasitott();
    for (const doboz of $('ai-eredmeny').querySelectorAll('[data-ai-i]')) {
      if (!doboz.checked) {
        const j = allapot.aiJavaslatok[Number(doboz.dataset.aiI)];
        if (j && !elutasitott.includes(j.cikk)) elutasitott.push(j.cikk);
        continue;
      }
      const j = allapot.aiJavaslatok[Number(doboz.dataset.aiI)];
      const menny = Number($('ai-eredmeny').querySelector(`[data-ai-menny="${doboz.dataset.aiI}"]`).value) || 0;
      if (!j || !(menny > 0)) continue;
      pluszHozzaad({ cikk: j.cikk.trim(), mennyiseg: menny, egyseg: j.egyseg || 'db' });
      n += 1;
    }
    ment(AI_ELUTASITOTT_KULCS, elutasitott.slice(-200));
    frissit();
    megjelenitPlusz();
    megjelenitArTabla(true);
    $('ai-eredmeny').innerHTML = `<p class="ok-szoveg">${n} tétel felvéve a plusz tételek közé.</p>`;
    allapot.aiJavaslatok = [];
  });
}

// ---- Foglalási link küldése az ügyfélnek (még ajánlat előtt, a felméréshez) ----

function foglalasKuldes() {
  const adatok = olvasAdatok();
  const link = (adatok.vallalkozo.foglalas ?? '').trim();
  const jo = /^https?:\/\//.test(link) && !foglalasiLinkHibas(link);
  const hatter = document.createElement('div');
  hatter.className = 'parbeszed-hatter';
  const sablon = betoltMentett(FOGLALAS_SABLON_KULCS);
  const ugyfelNev = adatok.ugyfel.nev ?? '';
  const uzenet = !jo ? '' : typeof sablon === 'string' && sablon.includes('{link}')
    ? foglalasSablonbol(sablon, link, ugyfelNev) : foglalasUzenet(adatok.vallalkozo, ugyfelNev);
  hatter.innerHTML = `<form class="parbeszed munka-urlap" role="dialog" aria-modal="true" aria-labelledby="fk-cim">
    <h2 id="fk-cim">Foglalási link küldése</h2>
    ${jo ? `<p class="muted" style="margin:0">Az ügyfél a linken kiválaszt egy szabad időpontot, és az bekerül a naptáradba. Az üzenet átírható.</p>
      <label class="mezo"><span>Üzenet</span><textarea name="uzenet" rows="8">${escape(uzenet)}</textarea></label>
      <div class="foglalas-gombok">
        ${navigator.share ? '<button type="button" data-fk="megoszt" data-ikon="level">Megosztás (Viber, Messenger…)</button>' : ''}
        <a class="button" data-fk="sms" href="#" data-ikon="level">SMS</a>
        <a class="button" data-fk="email" href="#" data-ikon="level">E-mail</a>
        <button type="button" class="button" data-fk="masol" data-ikon="masol">Másolás</button>
      </div>
      <p class="muted fk-uzenet" aria-live="polite" style="margin:0">${typeof sablon === 'string' ? 'A saját szövegedet használja. ' : ''}A módosítás magától mentődik, legközelebb is ez lesz.</p>
      ${typeof sablon === 'string' ? '<button type="button" class="link-gomb" data-fk="alap" style="margin:0;justify-self:start">Eredeti szöveg visszaállítása</button>' : ''}`
    : `<p style="margin:0">${link ? '<strong>Ez a link a naptárad saját szerkesztőoldala</strong>, az ügyfél nem tudja megnyitni.' : 'Még nincs megadva a foglalási link.'}
        A Google Naptárban a foglalási naptárnál a <strong>„Megosztás”</strong> alatt találod a nyilvános linket (pl. https://calendar.app.google/…). Másold ide:</p>
      <label class="mezo"><span>Időpontfoglalási link</span><input name="link" type="url" inputmode="url" required placeholder="https://calendar.app.google/…"></label>`}
    <div class="parbeszed-gombok">
      ${jo ? '' : '<button type="submit">Mentés</button>'}
      <button type="button" class="button mu-megse">${jo ? 'Bezárás' : 'Mégse'}</button>
    </div>
  </form>`;
  const urlap = hatter.querySelector('form');
  const zar = () => { hatter.remove(); document.removeEventListener('keydown', esc); };
  const esc = (ev) => { if (ev.key === 'Escape') zar(); };
  document.addEventListener('keydown', esc);
  const szoveg = () => urlap.elements.uzenet?.value ?? '';
  const linkek = () => {
    const sms = urlap.querySelector('[data-fk="sms"]');
    if (!sms) return;
    sms.href = `sms:?&body=${encodeURIComponent(szoveg())}`;
    urlap.querySelector('[data-fk="email"]').href = `mailto:${encodeURIComponent(adatok.ugyfel.email || '')}?subject=${encodeURIComponent('Időpontfoglalás – felmérés')}`
      + `&body=${encodeURIComponent(szoveg().replace(/\r?\n/g, '\r\n'))}`;
  };
  linkek();
  let mentesIdozito = null;
  urlap.addEventListener('input', (ev) => {
    linkek();
    if (ev.target.name !== 'uzenet') return;
    clearTimeout(mentesIdozito);
    mentesIdozito = setTimeout(() => {
      const uj = foglalasSablonba(szoveg(), link, ugyfelNev);
      if (!uj.includes('{link}')) {
        urlap.querySelector('.fk-uzenet').textContent = 'A link hiányzik a szövegből, ezért ezt nem mentem el sablonnak.';
        return;
      }
      ment(FOGLALAS_SABLON_KULCS, uj);
      urlap.querySelector('.fk-uzenet').textContent = 'Mentve: legközelebb is ez a szöveg lesz.';
    }, 400);
  });
  hatter.addEventListener('click', async (ev) => {
    if (ev.target === hatter || ev.target.closest('.mu-megse')) { zar(); return; }
    const g = ev.target.closest('[data-fk]');
    if (!g) return;
    if (g.dataset.fk === 'alap') {
      try { localStorage.removeItem(FOGLALAS_SABLON_KULCS); } catch { /* nem kötelező */ }
      zar();
      foglalasKuldes();
      return;
    }
    if (g.dataset.fk === 'megoszt') {
      try { await navigator.share({ text: szoveg() }); } catch { /* megszakítva */ }
    } else if (g.dataset.fk === 'masol') {
      try {
        await navigator.clipboard.writeText(szoveg());
        urlap.querySelector('.fk-uzenet').textContent = 'Vágólapra másolva.';
      } catch { urlap.querySelector('.fk-uzenet').textContent = 'A másolás nem sikerült.'; }
    }
  });
  urlap.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const uj = urlap.elements.link.value.trim();
    if (foglalasiLinkHibas(uj)) {
      urlap.elements.link.setCustomValidity('Ez a naptár saját szerkesztőoldala. A foglalási naptár „Megosztás” gombja alatti linket másold be.');
      urlap.elements.link.reportValidity();
      urlap.elements.link.addEventListener('input', () => urlap.elements.link.setCustomValidity(''), { once: true });
      return;
    }
    adatokForm.elements['vallalkozo.foglalas'].value = uj;
    ment(ADATOK_KULCS, olvasAdatok());
    ugyfelEmailFrissites();
    zar();
    foglalasKuldes();
  });
  document.body.append(hatter);
  ikonozas();
  urlap.querySelector('textarea, input')?.focus();
}

// "Google Naptárba" gomb és a foglalási link ellenőrzése.
function naptarFrissites() {
  const adatok = olvasAdatok();
  const kivitelezes = adatok.ajanlat.idopontTipus === 'kivitelezes';
  kiir('idotartam-cimke', kivitelezes ? 'Hány nap?' : 'Hány óra?');
  const osszeg = allapot.munkadij ? ajanlat(allapot.munkadij, ajanlatSorok(), allapot.arak).vegosszeg : 0;
  const link = naptarLink(adatok, osszeg);
  const a = $('naptar-link');
  a.href = link ?? '#';
  a.setAttribute('aria-disabled', String(!link));
  kiir('naptar-tipp', link ? `${kivitelezes ? 'Egész napos esemény' : 'Időpont'}, címmel és az ajánlat adataival.` : 'Adj meg kezdést, és egy koppintással bekerül a naptáradba.');
  const hibas = foglalasiLinkHibas(adatok.vallalkozo.foglalas);
  const tipp = $('foglalas-tipp');
  tipp.classList.toggle('warn', hibas);
  tipp.textContent = hibas
    ? 'Ez a naptárad saját szerkesztőoldala, az ügyfél nem tudja megnyitni. A foglalási naptárnál a „Megosztás” (vagy „Foglalási oldal megnyitása”) alatti linket másold ide, pl. https://calendar.app.google/…'
    : 'Ha megadod, az ügyfélnek küldött levélbe és az ajánlat PDF-be bekerül, és az ügyfél maga foglalhat időpontot.';
}

function ugyfelEmailFrissites() {
  naptarFrissites();
  if (!allapot.munkadij) return;
  const level = ugyfelLevel(ajanlat(allapot.munkadij, ajanlatSorok(), allapot.arak), olvasAdatok());
  $('email-ugyfel').href = mailtoLink(level);
  $('email-ugyfel').title = level.cimzett ? `Címzett: ${level.cimzett}` : 'Az ügyfél e-mail címét az Ajánlat adatainál adhatod meg';
}

function megjelenitKimenetek() {
  megjelenitBecsles();
  megjelenitBoltok();
  if (!allapot.munkadij) return;
  const a = ajanlat(allapot.munkadij, ajanlatSorok(), allapot.arak);
  ugyfelEmailFrissites();
  // A fülön: hány tételnek van már bolti ára (a teljes listából).
  const n = allapot.anyag.sorok.length;
  kiir('jelveny-arak', n ? `${allapot.anyag.sorok.filter(boltiArVan).length}/${n}` : '');
  const kimaradt = boltValaszVan() ? allapot.anyag.sorok.filter((s) => !boltiArVan(s)) : [];
  const kimaradtHtml = kimaradt.length ? `<details class="reszlet kimaradt"><summary>${kimaradt.length} listatétel nincs a bolt
    árajánlatában, ezért kimaradt</summary><p class="muted">Ha mégis kell, írd be az árát az Árak lépésnél, és visszakerül.</p>
    <ul class="nem-illesztett">${kimaradt.map((s) => `<li>${escape(s.cikk)} – ${ft.format(s.mennyiseg)} ${escape(s.egyseg)}</li>`).join('')}</ul></details>` : '';
  kiir('sum-anyag', a.anyagBolti ? penz(a.anyagBolti) : '–');
  kiir('sum-vegosszeg', a.vegosszeg ? penz(a.vegosszeg) : '–');

  const anyagSorok = a.anyag.map((s) => `
    <tr>
      <td>${escape(s.cikk)}</td>
      <td class="num">${ft.format(s.mennyiseg)} ${escape(s.egyseg)}</td>
      <td class="num hide-sm">${penz(s.bolti)}</td>
      <td class="num">${penz(s.boltiOsszeg)}</td>
    </tr>`).join('');
  $('ugyfel').innerHTML = `
    ${a.hianyzoBolti ? `<p class="warn">${a.hianyzoBolti} anyagtételnek nincs bolti ára, az összeg hiányos.</p>` : ''}
    ${kimaradtHtml}
    ${lenyilo('ugyfel-munkadij', `Munkadíj (${a.munkadij.sorok.length} tétel)`, penz(a.munkadij.osszesen), munkadijHtml(a.munkadij))}
    ${a.anyag.length ? lenyilo('ugyfel-anyag', `Anyag (${a.anyag.length} tétel)`, penz(a.anyagBolti), `
    <table>
      <thead><tr><th>Cikk</th><th class="num">Menny.</th><th class="num hide-sm">Egységár</th><th class="num">Összeg</th></tr></thead>
      <tbody>${anyagSorok}</tbody>
      <tfoot><tr><td colspan="2">Anyag összesen</td><td class="hide-sm"></td><td class="num">${penz(a.anyagBolti)}</td></tr></tfoot>
    </table>`) : ''}
    <p class="vegosszeg"><span>Végösszeg</span><span>${penz(a.vegosszeg)}</span></p>
    <p class="muted">Alanyi adómentes, ÁFA nélkül.</p>`;

  const belsoSorok = a.anyag.map((s) => `
    <tr>
      <td>${escape(s.cikk)}<div class="muted">${ft.format(s.mennyiseg)} ${escape(s.egyseg)}</div></td>
      <td class="num">${penz(s.kedvOsszeg)}</td>
      <td class="num hide-sm">${penz(s.boltiOsszeg)}</td>
      <td class="num">${penz(s.haszon)}</td>
    </tr>`).join('');
  $('belso').innerHTML = a.anyag.length === 0 ? '<p class="muted">Nincs anyagtétel.</p>' : `
    ${a.hianyzoKedvezmenyes ? `<p class="warn">${a.hianyzoKedvezmenyes} tételnek nincs kedvezményes ára, a haszon hiányos.</p>` : ''}
    <dl class="osszesito">
      <dt>Munkadíj</dt><dd>${penz(a.munkadij.osszesen)}</dd>
      <dt>Haszon az anyagon</dt><dd>${penz(a.haszon)}</dd>
      <dt class="profit">Profit</dt><dd class="profit">${penz(a.munkadij.osszesen + a.haszon)}</dd>
      <dt>Ügyfél fizet</dt><dd>${penz(a.vegosszeg)}</dd>
      <dt>Anyagbeszerzés</dt><dd>${penz(a.anyagKedvezmenyes)}</dd>
    </dl>
    ${lenyilo('belso-anyag', `Tételesen (${a.anyag.length})`, `haszon ${penz(a.haszon)}`, `
    <table>
      <thead><tr><th>Cikk</th><th class="num">Beszerzés</th><th class="num hide-sm">Bolti</th><th class="num">Haszon</th></tr></thead>
      <tbody>${belsoSorok}</tbody>
      <tfoot><tr><td>Összesen</td><td class="num">${penz(a.anyagKedvezmenyes)}</td><td class="num hide-sm">${penz(a.anyagBolti)}</td><td class="num">${penz(a.haszon)}</td></tr></tfoot>
    </table>`)}`;
}

// ---- Mentett ajánlatok ----

const klon = (x) => JSON.parse(JSON.stringify(x));

// A munka teljes állapota (amiből az ajánlat később újra megnyitható).
function pillanatkep() {
  const adatok = olvasAdatok();
  return {
    projekt: olvas(),
    arak: allapot.arak,
    plusz: allapot.plusz,
    pdfMennyiseg: allapot.pdfMennyiseg,
    feltoltesek: allapot.feltoltesek,
    boltok: allapot.boltok,
    adatok: { ugyfel: adatok.ugyfel, ajanlat: adatok.ajanlat },
    // a felhasznált egyéb munkák leírása, hogy másik eszközön is megnyitható legyen
    sajatMunkak: allapot.sajatMunkak.filter((m) => Number(olvas().egyeb?.[m.kod]) > 0),
    sajatKiallasok: allapot.sajatKiallasok.filter((k) => Number(olvas().kiallasok?.[k.kod]) > 0)
      .map((k) => ({ ...k, csomag: allapot.konyvtar.get(k.nev) ?? [] })),
  };
}

function ajanlatOsszeg() {
  if (!allapot.munkadij) return { munkadij: 0, anyagBolti: 0, anyagKedvezmenyes: 0, anyagHaszon: 0, vegosszeg: 0 };
  const a = ajanlat(allapot.munkadij, ajanlatSorok(), allapot.arak);
  return { munkadij: a.munkadij.osszesen, anyagBolti: a.anyagBolti, anyagKedvezmenyes: a.anyagKedvezmenyes, anyagHaszon: a.haszon, vegosszeg: a.vegosszeg };
}

const mostISO = () => new Date().toISOString();

function rekordFrissites(r) {
  const adatok = olvasAdatok();
  Object.assign(r, {
    modositva: mostISO(),
    ugyfel: adatok.ugyfel.nev,
    cim: adatok.ugyfel.cim,
    szam: adatok.ajanlat.szam,
    datum: adatok.ajanlat.datum,
    osszeg: ajanlatOsszeg(),
    adat: pillanatkep(),
  });
}

function ajanlatokMentese() {
  ment(AJANLATOK_KULCS, allapot.ajanlatok);
  ment(AKTUALIS_KULCS, allapot.aktualisId);
}

function ajanlatMentese() {
  let r = allapot.ajanlatok.find((x) => x.id === allapot.aktualisId);
  if (!r) {
    r = { id: ujAzonosito(), letrehozva: mostISO(), allapot: javasoltAllapot(boltValaszVan()) };
    allapot.ajanlatok.push(r);
    allapot.aktualisId = r.id;
  }
  rekordFrissites(r);
  ajanlatokMentese();
  megjelenitAjanlatAllapot();
  megjelenitAjanlatok();
}

let automentesIdozito = null;
function automentesUtemez() {
  if (!allapot.aktualisId) return;
  clearTimeout(automentesIdozito);
  automentesIdozito = setTimeout(() => {
    const r = allapot.ajanlatok.find((x) => x.id === allapot.aktualisId);
    if (!r) return;
    rekordFrissites(r);
    ajanlatokMentese();
    megjelenitAjanlatAllapot();
    megjelenitAjanlatok();
  }, 700);
}

// Van-e a mostani (még nem mentett) munkában valami, ami elveszne.
function vanMentetlenMunka() {
  if (allapot.aktualisId) return false;
  const p = olvas();
  const szam = (o) => Object.values(o ?? {}).some((v) => Number(v) > 0);
  return szam(p.kiallasok) || szam(p.szerelvenyek) || p.radiatorKiallas > 0 || p.padlofutesKor > 0 || allapot.plusz.length > 0
    || Boolean(olvasAdatok().ugyfel.nev);
}

// Saját párbeszédablak egyértelmű gombokkal (a böngésző "OK / Mégse" ablaka helyett).
// gombok: [{ felirat, ertek, stilus: 'fo' | 'veszelyes' | 'masodlagos' }] -> a választott ertek
function kerdes({ cim, szoveg, gombok }) {
  return new Promise((kesz) => {
    const hatter = document.createElement('div');
    hatter.className = 'parbeszed-hatter';
    hatter.innerHTML = `<div class="parbeszed" role="alertdialog" aria-modal="true" aria-labelledby="pb-cim" aria-describedby="pb-szoveg">
      <h2 id="pb-cim">${escape(cim)}</h2>
      <p id="pb-szoveg">${escape(szoveg)}</p>
      <div class="parbeszed-gombok">${gombok.map((g, i) => `<button type="button" data-i="${i}"
        class="${g.stilus === 'fo' ? '' : g.stilus === 'veszelyes' ? 'veszelyes' : 'button'}">${escape(g.felirat)}</button>`).join('')}</div>
    </div>`;
    const elozoFokusz = document.activeElement;
    const vissza = gombok.find((g) => g.stilus === 'masodlagos')?.ertek ?? null;
    const billentyu = (ev) => { if (ev.key === 'Escape') zar(vissza); };
    function zar(ertek) {
      hatter.remove();
      document.removeEventListener('keydown', billentyu);
      elozoFokusz?.focus?.();
      kesz(ertek);
    }
    hatter.addEventListener('click', (ev) => {
      const b = ev.target.closest('button[data-i]');
      if (b) zar(gombok[Number(b.dataset.i)].ertek);
      else if (ev.target === hatter) zar(vissza);
    });
    document.addEventListener('keydown', billentyu);
    document.body.append(hatter);
    hatter.querySelector('button')?.focus();
  });
}

// Mentetlen munka esetén megkérdezi, mi legyen vele. Igaz, ha mehet tovább.
// mire: a gombokon szereplő folytatás ("új ajánlat" / "megnyitás").
async function mentetlenKezelese(mire) {
  if (!vanMentetlenMunka()) return true;
  const nev = olvasAdatok().ugyfel.nev;
  const valasz = await kerdes({
    cim: 'Az ajánlat nincs elmentve',
    szoveg: `${nev ? `A(z) „${nev}” ajánlat` : 'A mostani ajánlat'} még nincs az Ajánlatok között. Ha elveted, a beírt adatok elvesznek.`,
    gombok: [
      { felirat: `Mentés, és ${mire}`, ertek: 'mentes', stilus: 'fo' },
      { felirat: `Elvetés, és ${mire}`, ertek: 'elvetes', stilus: 'veszelyes' },
      { felirat: 'Vissza', ertek: 'vissza', stilus: 'masodlagos' },
    ],
  });
  if (valasz === 'mentes') ajanlatMentese();
  return valasz === 'mentes' || valasz === 'elvetes';
}

// Egy mentett ajánlat (vagy üres, új ajánlat) betöltése a munkaterületre.
function munkaBetoltes(adat, id) {
  clearTimeout(automentesIdozito);
  allapot.aktualisId = null; // betöltés közben ne mentse a régit az újra
  const ures = uresProjekt();
  const p = adat?.projekt ?? {};
  // Az ajánlatban használt, de itt még nem ismert egyéb munkák felvétele.
  const ujMunkak = (adat?.sajatMunkak ?? []).filter((m) => m?.kod && !allapot.sajatMunkak.some((x) => x.kod === m.kod));
  if (ujMunkak.length) { allapot.sajatMunkak.push(...ujMunkak); ment(SAJAT_MUNKA_KULCS, allapot.sajatMunkak); }
  const ujKiallasok = (adat?.sajatKiallasok ?? []).filter((k) => k?.kod && !allapot.sajatKiallasok.some((x) => x.kod === k.kod));
  for (const k of ujKiallasok) {
    allapot.sajatKiallasok.push({ kod: k.kod, nev: k.nev });
    if (!allapot.konyvtarFelulirasok[k.nev]) allapot.konyvtarFelulirasok[k.nev] = k.csomag ?? [];
  }
  if (ujKiallasok.length) { ment(SAJAT_KIALLAS_KULCS, allapot.sajatKiallasok); konyvtarFrissites(); }
  kiallasFelepit({});
  egyebFelepit({});
  kitolt({
    ...ures, ...p,
    kiallasok: { ...ures.kiallasok, ...Object.fromEntries(allapot.sajatKiallasok.map((k) => [k.kod, 0])), ...p.kiallasok },
    szerelvenyek: { ...ures.szerelvenyek, ...p.szerelvenyek },
    gerinc: { ...ures.gerinc, ...p.gerinc },
    egyeb: Object.fromEntries(allapot.sajatMunkak.map((m) => [m.kod, p.egyeb?.[m.kod] ?? 0])),
  });
  allapot.arak = klon(adat?.arak ?? {});
  allapot.plusz = klon(adat?.plusz ?? []);
  allapot.pdfMennyiseg = klon(adat?.pdfMennyiseg ?? {});
  allapot.feltoltesek = klon(adat?.feltoltesek ?? {});
  allapot.boltok = klon(adat?.boltok ?? []);
  $('bolt-uzenet').innerHTML = '';
  allapot.diktalt = [];
  const vallalkozo = olvasAdatok().vallalkozo;
  const ugyfel = { nev: '', cim: '', munkaHelye: '', email: '', ...adat?.adatok?.ugyfel };
  const ajanlatAdat = { szam: '', datum: maISO(), ervenyesNap: 15, megjegyzes: '', idopontTipus: 'felmeres', idopont: '', idotartam: '', ...adat?.adatok?.ajanlat };
  kitoltAdatok({ vallalkozo, ugyfel, ajanlat: ajanlatAdat });
  $('bolt-valasz').value = '';
  $('eredmeny-bolti').innerHTML = feltoltesAllapotHtml('bolti');
  $('eredmeny-kedvezmenyes').innerHTML = feltoltesAllapotHtml('kedvezmenyes');
  $('beolvasas-eredmeny').innerHTML = feltoltesAllapotHtml('szoveg');
  for (const [k, v] of [[ARAK_KULCS, allapot.arak], [PLUSZ_KULCS, allapot.plusz], [PDF_MENNY_KULCS, allapot.pdfMennyiseg],
    [FELTOLTES_KULCS, allapot.feltoltesek], [BOLTOK_KULCS, allapot.boltok], [ADATOK_KULCS, olvasAdatok()]]) ment(k, v);
  frissit();
  megjelenitPlusz();
  megjelenitArTabla(true);
  megjelenitKimenetek();
  allapot.aktualisId = id ?? null;
  ajanlatokMentese();
  megjelenitAjanlatAllapot();
  megjelenitAjanlatok();
  listakCsukasa();
}

async function ujAjanlat() {
  if (!(await mentetlenKezelese('új ajánlat'))) return;
  munkaBetoltes(null, null);
  nezetValtas('projekt');
}

async function ajanlatMegnyitasa(id) {
  if (id === allapot.aktualisId) { nezetValtas('ajanlat'); return; }
  const r = allapot.ajanlatok.find((x) => x.id === id);
  if (!r) return;
  if (!(await mentetlenKezelese('megnyitás'))) return;
  munkaBetoltes(r.adat, r.id);
  nezetValtas('ajanlat');
}

function allapotValasztoHtml(r) {
  return `<select class="allapot-valaszto" data-id="${r.id}" aria-label="Állapot: ${escape(r.ugyfel || 'névtelen ajánlat')}">
    ${ALLAPOTOK.map((a) => `<option value="${a.kod}"${a.kod === r.allapot ? ' selected' : ''}>${a.nev}</option>`).join('')}</select>`;
}

const allapotCimke = (kod) => `<span class="allapot allapot-${allapotAdat(kod).csoport}">${allapotAdat(kod).nev}</span>`;

// Az Ajánlat lépés tetején: mentve van-e, milyen állapotban.
function megjelenitAjanlatAllapot() {
  const r = allapot.ajanlatok.find((x) => x.id === allapot.aktualisId);
  // A Projekt lépés tetején: melyik ajánlaton dolgozol.
  $('projekt-ajanlat-nev').innerHTML = r
    ? `${escape(r.ugyfel || 'Névtelen ajánlat')} · ${allapotCimke(r.allapot)}`
    : 'Új, még nem mentett ajánlat';
  $('ajanlat-allapot').innerHTML = r ? `
    <div class="allapot-sor">
      <div><div class="muted">Mentett ajánlat · magától frissül</div><strong>${escape(r.ugyfel || 'Névtelen ajánlat')}</strong></div>
      ${allapotValasztoHtml(r)}
    </div>
    <div class="actions"><button type="button" class="kicsi button" data-ajanlat-muvelet="uj">Új ajánlat</button>
      <button type="button" class="kicsi button" data-ajanlat-muvelet="lista">Összes ajánlat</button></div>`
    : `<p class="muted" style="margin:0">Még nincs elmentve – mentés után az Ajánlatok között követheted.</p>
    <div class="actions"><button type="button" class="kicsi" data-ajanlat-muvelet="mentes">Mentés az ajánlatok közé</button>
      <button type="button" class="kicsi button" data-ajanlat-muvelet="uj">Új ajánlat</button></div>`;
}

// Az Ajánlatok lépés: összesítés, szűrők, lista.
function megjelenitAjanlatok() {
  const lista = allapot.ajanlatok;
  const evLista = evek(lista);
  if (allapot.ajanlatEv !== 'mind' && !evLista.includes(allapot.ajanlatEv)) allapot.ajanlatEv = 'mind';
  const o = osszesites(lista, allapot.ajanlatEv);
  kiir('jelveny-ajanlatok', o.fuggoDb ? String(o.fuggoDb) : '');
  $('ajanlatok-osszesites').innerHTML = `
    <div class="ev-sor">
      <label class="ev-valaszto"><span>Időszak</span>
        <select id="ajanlat-ev">${['mind', ...evLista].map((e) => `<option value="${e}"${e === allapot.ajanlatEv ? ' selected' : ''}>${e === 'mind' ? 'Összes év' : e}</option>`).join('')}</select>
      </label>
    </div>
    <div class="kpi-racs">
      <div class="kpi kpi-fo"><span class="kpi-cim">Profit az elfogadott ajánlatokon</span><span class="kpi-ertek">${penz(o.profit)}</span>
        <span class="kpi-al">munkadíj ${penz(o.munkadij)} + anyag ${penz(o.anyagHaszon)}</span></div>
      <div class="kpi"><span class="kpi-cim">Elfogadott</span><span class="kpi-ertek">${o.elfogadottDb} db</span>
        <span class="kpi-al">${o.elfogadasiArany === null ? 'még nincs lezárt ajánlat' : `elfogadási arány ${Math.round(o.elfogadasiArany * 100)}%`}</span></div>
      <div class="kpi"><span class="kpi-cim">Bevétel</span><span class="kpi-ertek">${penz(o.bevetel)}</span><span class="kpi-al">amit az ügyfelek fizetnek</span></div>
      <div class="kpi"><span class="kpi-cim">Döntésre vár</span><span class="kpi-ertek">${o.fuggoDb} db</span><span class="kpi-al">${penz(o.fuggoErtek)} értékben</span></div>
    </div>`;
  $('ajanlat-szurok').innerHTML = SZUROK.map((f) => `<button type="button" class="szuro${f.kod === allapot.ajanlatSzuro ? ' aktiv' : ''}"
    data-szuro="${f.kod}" aria-pressed="${f.kod === allapot.ajanlatSzuro}">${f.nev}</button>`).join('');
  const szurt = szur(lista, allapot.ajanlatSzuro, allapot.ajanlatEv);
  $('ajanlat-lista').innerHTML = szurt.length ? szurt.map((r) => `
    <li class="ajanlat-kartya${r.id === allapot.aktualisId ? ' aktualis' : ''}" data-csoport="${ALLAPOTOK.find((a) => a.kod === r.allapot)?.csoport ?? 'folyamatban'}">
      <div class="ak-fej">
        <div class="ak-nev"><strong>${escape(r.ugyfel || 'Névtelen ajánlat')}</strong>
          <span class="muted">${[r.cim, r.szam && `#${r.szam}`, r.datum && datumRovid(r.datum)].filter(Boolean).map(escape).join(' · ')}</span></div>
        ${allapotCimke(r.allapot)}
      </div>
      <dl class="ak-szamok">
        <div><dt>Végösszeg</dt><dd>${penz(r.osszeg?.vegosszeg ?? 0)}</dd></div>
        <div><dt>Profit</dt><dd class="profit">${penz(profit(r.osszeg))}</dd></div>
      </dl>
      <div class="ak-muveletek">
        ${allapotValasztoHtml(r)}
        <button type="button" class="kicsi" data-ajanlat-muvelet="megnyit" data-id="${r.id}">${r.id === allapot.aktualisId ? 'Szerkesztés alatt' : 'Megnyitás'}</button>
        <button type="button" class="kicsi button ak-torles" data-ajanlat-muvelet="torol" data-id="${r.id}" aria-label="Törlés: ${escape(r.ugyfel || 'névtelen ajánlat')}">Törlés</button>
      </div>
    </li>`).join('')
    : `<li class="ures-lista">${lista.length ? 'Ebben a szűrésben nincs ajánlat.' : 'Még nincs mentett ajánlat. Az Ajánlat lépésnél a „Mentés az ajánlatok közé” gombbal kerül ide.'}</li>`;
}

const datumRovid = (iso) => {
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? iso : new Intl.DateTimeFormat('hu-HU', { year: 'numeric', month: 'short', day: 'numeric' }).format(d);
};

function ajanlatEsemenyek() {
  document.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-ajanlat-muvelet]');
    if (b) {
      const m = b.dataset.ajanlatMuvelet;
      if (m === 'mentes') ajanlatMentese();
      else if (m === 'uj') ujAjanlat();
      else if (m === 'lista') nezetValtas('ajanlatok');
      else if (m === 'megnyit') ajanlatMegnyitasa(b.dataset.id);
      else if (m === 'torol') {
        const r = allapot.ajanlatok.find((x) => x.id === b.dataset.id);
        if (!r || !confirm(`Törlöd ezt az ajánlatot: ${r.ugyfel || 'névtelen ajánlat'}? Nem vonható vissza.`)) return;
        allapot.ajanlatok = allapot.ajanlatok.filter((x) => x.id !== r.id);
        if (allapot.aktualisId === r.id) allapot.aktualisId = null;
        ajanlatokMentese();
        megjelenitAjanlatAllapot();
        megjelenitAjanlatok();
      }
      return;
    }
    const f = ev.target.closest('[data-szuro]');
    if (f) { allapot.ajanlatSzuro = f.dataset.szuro; megjelenitAjanlatok(); }
  });
  document.addEventListener('change', (ev) => {
    if (ev.target.classList.contains('allapot-valaszto')) {
      const r = allapot.ajanlatok.find((x) => x.id === ev.target.dataset.id);
      if (!r) return;
      r.allapot = ev.target.value;
      r.modositva = mostISO();
      ajanlatokMentese();
      megjelenitAjanlatAllapot();
      megjelenitAjanlatok();
    } else if (ev.target.id === 'ajanlat-ev') {
      allapot.ajanlatEv = ev.target.value;
      megjelenitAjanlatok();
    }
  });
  // Biztonsági mentés fájlba és visszatöltés
  $('mentes-fajlba').addEventListener('click', () => {
    if (allapot.aktualisId) { const r = allapot.ajanlatok.find((x) => x.id === allapot.aktualisId); if (r) rekordFrissites(r); }
    const tartalom = exportAdat(allapot.ajanlatok, { vallalkozo: olvasAdatok().vallalkozo, bovitesek: allapot.bovitesek, sajatMunkak: allapot.sajatMunkak, konyvtarFelulirasok: allapot.konyvtarFelulirasok,
      munkadijFelulirasok: allapot.munkadijFelulirasok, gerincAnyag: allapot.gerincAnyag, sajatKiallasok: allapot.sajatKiallasok, kiallasNevek: allapot.kiallasNevek, kiallasArak: allapot.kiallasArak, armemoria: allapot.armemoria, rejtett: allapot.rejtett, foglalasSablon: betoltMentett(FOGLALAS_SABLON_KULCS) });
    const nev = `arajanlatok-${maISO()}.json`;
    const kesz = () => {
      try { localStorage.setItem(MENTES_IDO_KULCS, String(Date.now())); localStorage.removeItem(MENTES_HALASZT_KULCS); } catch { /* nem kötelező */ }
      kiir('mentes-uzenet', `${allapot.ajanlatok.length} ajánlat elmentve fájlba.`);
      mentesEmlekezteto();
    };
    // Telefonon a megosztás menüből a Fájlokba, iCloudba, Google Drive-ba vagy e-mailbe menthető.
    const fajl = typeof File === 'function' ? new File([tartalom], nev, { type: 'application/json' }) : null;
    if (fajl && navigator.canShare?.({ files: [fajl] }) && matchMedia('(pointer: coarse)').matches) {
      navigator.share({ files: [fajl], title: 'Árajánlatok – biztonsági mentés' }).then(kesz).catch(() => {});
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([tartalom], { type: 'application/json' }));
    a.download = nev;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    kesz();
  });
  $('betoltes-fajlbol').addEventListener('change', async (ev) => {
    const fajl = ev.target.files?.[0];
    ev.target.value = '';
    if (!fajl) return;
    try {
      const r = importAdat(await fajl.text(), allapot.ajanlatok);
      allapot.ajanlatok = r.ajanlatok;
      // Saját adatok és a könyvtár bővítései, ha itt még nincsenek meg.
      const v = olvasAdatok().vallalkozo;
      if (!v.nev && r.beallitasok.vallalkozo) {
        kitoltAdatok({ vallalkozo: r.beallitasok.vallalkozo });
        ment(ADATOK_KULCS, olvasAdatok());
      }
      const kulcs = (b) => `${b.kiallas}|${b.cikk}|${b.egyseg}`;
      const meglevo = new Set(allapot.bovitesek.map(kulcs));
      const ujBovites = (r.beallitasok.bovitesek ?? []).filter((b) => b?.kiallas && !meglevo.has(kulcs(b)));
      const ujMunka = (r.beallitasok.sajatMunkak ?? []).filter((m) => m?.kod && !allapot.sajatMunkak.some((x) => x.kod === m.kod));
      if (ujMunka.length) { allapot.sajatMunkak.push(...ujMunka); ment(SAJAT_MUNKA_KULCS, allapot.sajatMunkak); egyebFelepit(); frissit(); }
      const ujFelul = Object.entries(r.beallitasok.konyvtarFelulirasok ?? {}).filter(([n]) => !allapot.konyvtarFelulirasok[n]);
      for (const [n, sorok] of ujFelul) allapot.konyvtarFelulirasok[n] = sorok;
      if (ujBovites.length) allapot.bovitesek.push(...ujBovites);
      for (const [k, v] of Object.entries(r.beallitasok.munkadijFelulirasok ?? {})) if (!allapot.munkadijFelulirasok[k]) allapot.munkadijFelulirasok[k] = v;
      for (const [k, v] of Object.entries(r.beallitasok.gerincAnyag ?? {})) if (!allapot.gerincAnyag[k]) allapot.gerincAnyag[k] = v;
      ment(MUNKADIJ_FELULIR_KULCS, allapot.munkadijFelulirasok);
      ment(GERINC_ANYAG_KULCS, allapot.gerincAnyag);
      const ujK = (r.beallitasok.sajatKiallasok ?? []).filter((k) => k?.kod && !allapot.sajatKiallasok.some((x) => x.kod === k.kod));
      if (ujK.length) { allapot.sajatKiallasok.push(...ujK); ment(SAJAT_KIALLAS_KULCS, allapot.sajatKiallasok); }
      for (const [k, v] of Object.entries(r.beallitasok.kiallasNevek ?? {})) if (!allapot.kiallasNevek[k]) allapot.kiallasNevek[k] = v;
      ment(KIALLAS_NEV_KULCS, allapot.kiallasNevek);
      for (const [k, v] of Object.entries(r.beallitasok.kiallasArak ?? {})) if (allapot.kiallasArak[k] === undefined) allapot.kiallasArak[k] = v;
      for (const [k, v] of Object.entries(r.beallitasok.armemoria ?? {})) {
        if (!allapot.armemoria[k] || String(v?.datum) > String(allapot.armemoria[k].datum)) allapot.armemoria[k] = v;
      }
      ment(ARMEMORIA_KULCS, allapot.armemoria);
      for (const m of r.beallitasok.rejtett ?? []) if (typeof m === 'string' && !allapot.rejtett.includes(m)) allapot.rejtett.push(m);
      ment(REJTETT_KULCS, allapot.rejtett);
      if (typeof r.beallitasok.foglalasSablon === 'string' && !betoltMentett(FOGLALAS_SABLON_KULCS)) ment(FOGLALAS_SABLON_KULCS, r.beallitasok.foglalasSablon);
      ment(KIALLAS_AR_KULCS, allapot.kiallasArak);
      kiallasFelepit();
      cimkekFrissitese();
      if (ujBovites.length || ujFelul.length) { konyvtarFrissites(); frissit(); megjelenitPlusz(); }
      ajanlatokMentese();
      megjelenitAjanlatok();
      kiir('mentes-uzenet', `Betöltve: ${r.uj} új és ${r.frissitett} frissített ajánlat.`);
    } catch (err) {
      kiir('mentes-uzenet', err.message);
    }
  });
}

// ---- Ajánlat adatai és PDF ----

const adatokForm = $('adatok');
const maISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function olvasAdatok() {
  const adatok = { vallalkozo: {}, ugyfel: {}, ajanlat: {} };
  for (const el of adatokForm.elements) {
    if (!el.name) continue;
    const [a, b] = el.name.split('.');
    adatok[a][b] = el.type === 'number' ? Number(el.value || 0) : el.value.trim();
  }
  return adatok;
}

function kitoltAdatok(adatok) {
  for (const el of adatokForm.elements) {
    if (!el.name) continue;
    const [a, b] = el.name.split('.');
    const ertek = adatok?.[a]?.[b];
    if (ertek !== undefined && ertek !== null) el.value = ertek;
  }
}

const eredetiCim = document.title;
function nyomtat(tipus) {
  if (!allapot.munkadij) return;
  const a = ajanlat(allapot.munkadij, ajanlatSorok(), allapot.arak);
  const adatok = olvasAdatok();
  $('nyomtat').innerHTML = tipus === 'belso' ? belsoOsszesitoHtml(a, adatok) : ugyfelAjanlatHtml(a, adatok);
  document.title = fajlnev(tipus === 'belso' ? 'Belso_osszesito' : 'Arajanlat', adatok);
}

// ---- Frissítés ----

function frissit() {
  const p = olvas();
  $('puffer-sor').hidden = p.hotermelo !== 'vegyes';
  $('felar-hsz-sor').hidden = p.hotermelo !== 'hoszivattyu';
  ment(MENTES_KULCS, p);
  try {
    allapot.munkadij = szamolMunkadij(p, munkadijTabla());
    $('eredmeny').innerHTML = figyelmeztetesHtml(allapot.munkadij.figyelmeztetesek) + munkadijHtml(allapot.munkadij);
    kiir('sum-munkadij', allapot.munkadij.osszesen ? penz(allapot.munkadij.osszesen) : '–');
  } catch (err) {
    allapot.munkadij = null;
    $('eredmeny').innerHTML = `<p class="error">${escape(err.message)}</p>`;
  }
  allapot.projekt = p;
  kitoltesJelolese();
  modositottJeloles();
  rejtettAlkalmaz();
  csempekFrissit();
  try {
    allapot.anyag = gyujtAnyaglista(p, allapot.konyvtar, allapot.sajatMunkak, allapot.gerincAnyag, allapot.sajatKiallasok);
    // A munkadíj-tételekhez rendelt anyag (pl. WC felszerelés -> nyomólap), a mennyiséggel szorozva.
    for (const m of allapot.munkadij?.sorok ?? []) {
      for (const a of allapot.munkadijFelulirasok[m.kod]?.anyag ?? []) {
        const t = { cikk: a.cikk, egyseg: a.egyseg || 'db' };
        const q = Math.round((Number(a.mennyiseg) || 0) * m.mennyiseg * 1000) / 1000;
        if (!(q > 0)) continue;
        const meglevo = allapot.anyag.sorok.find((s) => tetelKulcs(s) === tetelKulcs(t));
        if (meglevo) meglevo.mennyiseg = Math.round((meglevo.mennyiseg + q) * 1000) / 1000;
        else allapot.anyag.sorok.push({ ...t, mennyiseg: q });
      }
    }
    for (const t of allapot.plusz) {
      if (!(t.mennyiseg > 0)) continue;
      const meglevo = allapot.anyag.sorok.find((s) => tetelKulcs(s) === tetelKulcs(t));
      if (meglevo) meglevo.mennyiseg = Math.round((meglevo.mennyiseg + t.mennyiseg) * 100) / 100;
      else allapot.anyag.sorok.push({ ...t, plusz: true });
    }
    // A bolt PDF-je szerinti mennyiség az irányadó, ha eltér a listától.
    for (const s of allapot.anyag.sorok) {
      const m = allapot.pdfMennyiseg[tetelKulcs(s)];
      if (m !== undefined && !s.plusz && m !== s.mennyiseg) {
        s.listaMennyiseg = s.mennyiseg;
        s.mennyiseg = m;
      }
    }
    megjelenitAnyag();
  } catch (err) {
    allapot.anyag = { sorok: [], figyelmeztetesek: [] };
    $('anyaglista').innerHTML = `<p class="error">${escape(err.message)}</p>`;
  }
  megjelenitArTabla();
  megjelenitKimenetek();
}

async function betolt(utvonal, nev) {
  // Mindig ellenőrzi, van-e frissebb változat (a táblázatok a webről jönnek, gyorsítótárazva).
  const valasz = await fetch(utvonal, { cache: 'no-cache' });
  if (!valasz.ok) throw new Error(`A(z) ${nev} nem tölthető be (${valasz.status}).`);
  return valasz.text();
}

// A cikkszám már nem használt: a korábban mentett adatokból (plusz tételek, csomagok,
// munkák anyaga, ajánlatok) egyszer kitöröljük.
function cikkszamokTorlese() {
  const tisztit = (x) => {
    if (Array.isArray(x)) return x.reduce((v, e) => tisztit(e) || v, false);
    if (!x || typeof x !== 'object') return false;
    let valtozott = 'cikkszam' in x;
    delete x.cikkszam;
    for (const v of Object.values(x)) valtozott = tisztit(v) || valtozott;
    return valtozott;
  };
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const kulcs = localStorage.key(i);
      if (!kulcs?.startsWith('arajanlat.')) continue;
      const szoveg = localStorage.getItem(kulcs);
      if (!szoveg?.includes('cikkszam')) continue;
      const adat = JSON.parse(szoveg);
      if (tisztit(adat)) localStorage.setItem(kulcs, JSON.stringify(adat));
    }
  } catch { /* nem kötelező */ }
}

async function indit() {
  cikkszamokTorlese();
  nezetek();
  try {
    const [tablaCsv, konyvtarCsv] = await Promise.all([
      betolt('data/munkadij.csv', 'munkadíj-táblázat'),
      betolt('data/kiallas-konyvtar.csv', 'kiállás-könyvtár'),
    ]);
    allapot.tabla = parseMunkadijTabla(tablaCsv);
    allapot.alapKonyvtar = parseKonyvtar(konyvtarCsv);
  } catch (err) {
    $('eredmeny').innerHTML = `<p class="error">${escape(err.message)}</p>`;
    $('anyaglista').innerHTML = '';
    return;
  }
  allapot.sajatKiallasok = (betoltMentett(SAJAT_KIALLAS_KULCS) ?? []).filter((k) => k?.kod && k?.nev);
  allapot.kiallasNevek = betoltMentett(KIALLAS_NEV_KULCS) ?? {};
  allapot.kiallasArak = betoltMentett(KIALLAS_AR_KULCS) ?? {};
  felepit();
  allapot.sajatMunkak = (betoltMentett(SAJAT_MUNKA_KULCS) ?? []).filter((m) => m?.kod && m?.tetel);
  egyebFelepit({});
  $('uj-munka').addEventListener('click', () => munkaSzerkeszto(null, 'egyeb'));
  for (const b of document.querySelectorAll('[data-uj-tetel]')) b.addEventListener('click', () => munkaSzerkeszto(null, b.dataset.ujTetel));
  cimkekFrissitese();
  // Fűtés, szerelvények, gerinc és külső szerelés: a ceruzára, a névre vagy az ikonra koppintva.
  for (const id of ['futes-lista', 'szerelvenyek', 'gerinc-lista']) {
    $(id).addEventListener('click', async (ev) => {
      const cel = ev.target.closest('.mezo-nev, .mezo-ikon');
      if (!cel) return;
      ev.preventDefault();
      if (cel.closest('label').dataset.munka) { munkaSzerkeszto(cel.closest('label').dataset.munka); return; }
      const nev = cel.closest('label').querySelector('input, select').name;
      if (nev.startsWith('gerinc.')) { gerincSzerkeszto(nev.split('.')[1]); return; }
      const kod = mezoKod(nev);
      if (!kod) {
        await kerdes({ cim: 'Előbb válassz hőtermelőt', szoveg: 'A hőtermelő gépészetének árát és anyagát a kiválasztott típusnál tudod módosítani.',
          gombok: [{ felirat: 'Rendben', ertek: 'ok', stilus: 'masodlagos' }] });
        return;
      }
      tetelSzerkeszto(kod);
    });
  }
  // Kiállás anyagcsomagja: a ceruzára, a névre vagy az ikonra koppintva.
  $('kiallasok').addEventListener('click', (ev) => {
    const cel = ev.target.closest('.mezo-nev, .mezo-ikon');
    if (!cel) return;
    ev.preventDefault();
    const sor = cel.closest('label');
    if (sor.dataset.sajat) sajatKiallasSzerkeszto(sor.dataset.sajat);
    else kiallasSzerkeszto(sor.dataset.kiallas);
  });
  $('uj-kiallas').addEventListener('click', () => sajatKiallasSzerkeszto());
  $('egyeb').addEventListener('click', (ev) => {
    const cel = ev.target.closest('.mezo-nev, .mezo-ikon');
    if (!cel) return;
    ev.preventDefault();
    munkaSzerkeszto(cel.closest('label').dataset.munka);
  });
  allapot.rejtett = (betoltMentett(REJTETT_KULCS) ?? []).filter((x) => typeof x === 'string');
  form.addEventListener('click', (ev) => {
    const g = ev.target.closest('.rejtett-gomb');
    if (g) rejtettVisszaallitas(g.closest('.kartya'));
  });
  csempekInit(form);
  nevJavaslatBekotes();
  aiEsemenyek();
  document.addEventListener('click', (ev) => { if (ev.target.closest('[data-foglalas-kuldes]')) foglalasKuldes(); });
  const mentett = betoltMentett(MENTES_KULCS);
  if (mentett) kitolt(mentett);
  allapot.arak = betoltMentett(ARAK_KULCS) ?? {};
  allapot.boltok = (betoltMentett(BOLTOK_KULCS) ?? []).filter((b) => b?.id && b?.arak);
  // A PDF-ből korábban tévesen felvett összesítő sorok (nettó/bruttó végösszeg, ÁFA…) törlése.
  allapot.plusz = (betoltMentett(PLUSZ_KULCS) ?? [])
    .filter((t) => t?.cikk && t?.egyseg)
    .filter((t) => !(t.forras === 'pdf' && nemTetelNev(t.cikk)));
  ment(PLUSZ_KULCS, allapot.plusz);
  allapot.pdfMennyiseg = betoltMentett(PDF_MENNY_KULCS) ?? {};
  allapot.feltoltesek = betoltMentett(FELTOLTES_KULCS) ?? {};
  $('eredmeny-bolti').innerHTML = feltoltesAllapotHtml('bolti');
  $('eredmeny-kedvezmenyes').innerHTML = feltoltesAllapotHtml('kedvezmenyes');
  $('beolvasas-eredmeny').innerHTML = feltoltesAllapotHtml('szoveg');
  allapot.bovitesek = (betoltMentett(BOVITES_KULCS) ?? []).filter((b) => b?.kiallas && b?.cikk && b?.egyseg && b.mennyiseg > 0);
  allapot.konyvtarFelulirasok = betoltMentett(KONYVTAR_FELULIR_KULCS) ?? {};
  allapot.munkadijFelulirasok = betoltMentett(MUNKADIJ_FELULIR_KULCS) ?? {};
  allapot.gerincAnyag = betoltMentett(GERINC_ANYAG_KULCS) ?? {};
  if (feleslegesFelulirasokTorlese()) konyvtarFrissites();
  cimkekFrissitese(); // a mentett átnevezésekkel
  allapot.konyvtar = felulirtKonyvtar(bovitettKonyvtar(allapot.alapKonyvtar, allapot.bovitesek), allapot.konyvtarFelulirasok);
  pluszEsemenyek();
  allapot.ajanlatok = (betoltMentett(AJANLATOK_KULCS) ?? []).filter((a) => a?.id);
  allapot.aktualisId = betoltMentett(AKTUALIS_KULCS);
  if (!allapot.ajanlatok.some((a) => a.id === allapot.aktualisId)) allapot.aktualisId = null;
  ajanlatEsemenyek();
  // Ármemória: ha még üres, a mentett ajánlatok áraiból (régebbitől az újabb felé) és a mostaniakból.
  allapot.armemoria = betoltMentett(ARMEMORIA_KULCS) ?? {};
  if (!Object.keys(allapot.armemoria).length) {
    for (const r of [...allapot.ajanlatok].sort((a, b) => String(a.modositva).localeCompare(String(b.modositva)))) {
      armemoriaRogzites(r.adat?.arak ?? {}, String(r.modositva ?? '').slice(0, 10) || maISO());
    }
    armemoriaRogzites(allapot.arak);
  }
  mentesEmlekezteto();
  navigator.storage?.persist?.().catch(() => {});

  form.addEventListener('input', frissit);
  if (navigator.share) {
    $('megoszt').hidden = false;
    $('megoszt').addEventListener('click', async () => {
      try {
        await navigator.share({ title: 'Árajánlatkérés – anyaglista', text: levelSzoveg(anyaglistaSzoveg(allapot.anyag.sorok)) });
      } catch { /* megszakítva */ }
    });
  }
  $('masol').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(levelSzoveg(anyaglistaSzoveg(allapot.anyag.sorok)));
      $('masol-uzenet').textContent = 'Vágólapra másolva.';
    } catch {
      $('masol-uzenet').textContent = 'A másolás nem sikerült; használd az E-mail gombot.';
    }
  });
  $('beolvas').addEventListener('click', beolvas);
  for (const mezo of ['bolti', 'kedvezmenyes']) {
    $(`pdf-${mezo}`).addEventListener('change', (ev) => {
      const fajl = ev.target.files?.[0];
      ev.target.value = '';
      if (fajl) pdfFeltoltes(mezo, fajl);
    });
  }
  $('ar-tabla').addEventListener('input', (ev) => {
    const el = ev.target;
    if (!el.dataset.kulcs) return;
    const n = parseSzam(el.value);
    const ar = { ...allapot.arak[el.dataset.kulcs] };
    if (el.value.trim() === '' || Number.isNaN(n)) delete ar[el.dataset.mezo];
    else ar[el.dataset.mezo] = n;
    allapot.arak[el.dataset.kulcs] = ar;
    el.classList.toggle('hibas', el.value.trim() !== '' && Number.isNaN(n));
    ment(ARAK_KULCS, allapot.arak);
    megjelenitKimenetek();
  });
  $('ar-tabla').addEventListener('change', (ev) => {
    const k = ev.target.dataset?.kulcs;
    if (k && allapot.arak[k]) armemoriaRogzites({ [k]: allapot.arak[k] });
  });
  $('ar-szakasz').addEventListener('click', (ev) => { if (ev.target.closest('#korabbi-arak')) korabbiArakBeirasa(); });
  boltEsemenyek();
  $('mentes-most').addEventListener('click', () => { nezetValtas('ajanlatok'); $('mentes-fajlba').click(); });
  $('mentes-kesobb').addEventListener('click', () => {
    try { localStorage.setItem(MENTES_HALASZT_KULCS, String(Date.now() + 3 * 86400000)); } catch { /* nem kötelező */ }
    mentesEmlekezteto();
  });
  $('ar-szakasz').addEventListener('click', (ev) => {
    const b = ev.target.closest('.feltoltes-torles');
    if (!b) return;
    const forras = b.dataset.forras;
    const nev = allapot.feltoltesek[forras]?.fajl || FORRAS_NEV[forras];
    if (!confirm(`Eltávolítod: ${nev}? Az általa beírt árak, mennyiségek és felvett tételek törlődnek.`)) return;
    visszavon(forras);
    $(forras === 'szoveg' ? 'beolvasas-eredmeny' : `eredmeny-${forras}`).innerHTML = '<p class="muted">Eltávolítva.</p>';
    frissit();
    megjelenitPlusz();
    megjelenitArTabla(true);
    megjelenitKimenetek();
  });
  $('arak-torlese').addEventListener('click', () => {
    if (!confirm('Törlöd az összes beírt árat és a PDF szerinti mennyiségeket? A PDF-ből felvett plusz tételek megmaradnak, azokat a Plusz tételeknél törölheted.')) return;
    allapot.arak = {};
    allapot.pdfMennyiseg = {};
    allapot.feltoltesek = {};
    ment(FELTOLTES_KULCS, allapot.feltoltesek);
    ment(ARAK_KULCS, allapot.arak);
    ment(PDF_MENNY_KULCS, allapot.pdfMennyiseg);
    frissit();
    for (const id of ['beolvasas-eredmeny', 'eredmeny-bolti', 'eredmeny-kedvezmenyes']) $(id).innerHTML = '';
    megjelenitArTabla(true);
    megjelenitKimenetek();
  });
  const mentettAdatok = betoltMentett(ADATOK_KULCS) ?? {};
  kitoltAdatok({ ...mentettAdatok, ajanlat: { datum: maISO(), ervenyesNap: 15, ...mentettAdatok.ajanlat } });
  adatokForm.addEventListener('input', () => { ment(ADATOK_KULCS, olvasAdatok()); ugyfelEmailFrissites(); });
  // Az ügyfélnek küldött e-mail után a mentett ajánlat "Ajánlat elküldve" állapotba kerül (ha még folyamatban volt).
  $('email-ugyfel').addEventListener('click', () => {
    ugyfelEmailFrissites();
    const r = allapot.ajanlatok.find((x) => x.id === allapot.aktualisId);
    if (r && allapotAdat(r.allapot).csoport === 'folyamatban') {
      r.allapot = 'elkuldve';
      r.modositva = mostISO();
      ajanlatokMentese();
      megjelenitAjanlatAllapot();
      megjelenitAjanlatok();
    }
  });
  adatokForm.addEventListener('submit', (ev) => ev.preventDefault());

  // A böngésző saját Nyomtatás menüjéből az ügyfélajánlat készül.
  let gombbol = false;
  const pdf = (tipus) => { gombbol = true; nyomtat(tipus); window.print(); };
  $('pdf-ugyfel').addEventListener('click', () => pdf('ugyfel'));
  $('pdf-belso').addEventListener('click', () => pdf('belso'));
  window.addEventListener('beforeprint', () => { if (!gombbol) nyomtat('ugyfel'); });
  window.addEventListener('afterprint', () => { gombbol = false; document.title = eredetiCim; });

  frissit();
  megjelenitPlusz();
  megjelenitAjanlatAllapot();
  megjelenitAjanlatok();
  listakCsukasa();
  document.addEventListener('click', (ev) => {
    const g = ev.target.closest('.tobb-gomb');
    if (g) listaAllitas(g.dataset.lista, g.getAttribute('aria-expanded') === 'true');
  });

  // Hangos árajánlat: végigkérdez, és a válaszokat ugyanúgy írja be, mintha kézzel töltenéd ki.
  const mezoBeallit = (urlap, nev, ertek) => {
    const el = urlap.elements[nev];
    if (!el) return;
    if (el.type === 'checkbox') el.checked = Boolean(ertek);
    else if (el.type === 'number') el.value = ertek ? String(ertek) : '';
    else el.value = ertek ?? '';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };
  hangosModInit({
    projekt: () => ({ ...olvas(), rejtett: allapot.rejtett }),
    mezoBeallit: (nev, ertek) => mezoBeallit(form, nev, ertek),
    adatBeallit: (nev, ertek) => mezoBeallit(adatokForm, nev, ertek),
    pluszFelvesz: (tetelek) => {
      for (const t of tetelek) pluszHozzaad(t);
      frissit();
      megjelenitPlusz();
      megjelenitArTabla(true);
    },
    osszegek: () => {
      if (!allapot.munkadij) return { munkadij: 0, anyag: 0, vegosszeg: 0 };
      const a = ajanlat(allapot.munkadij, ajanlatSorok(), allapot.arak);
      return { munkadij: a.munkadij.osszesen, anyag: a.anyagBolti, vegosszeg: a.vegosszeg };
    },
    nezet: (nev) => nezetValtas(nev, false),
    mezoElem: (nev) => {
      const el = form.elements[nev] ?? adatokForm.elements[nev] ?? null;
      mezoMutatasa(el);
      return el;
    },
  });
}

indit();
