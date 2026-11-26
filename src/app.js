import { parseMunkadijTabla } from './csv.js';
import { KIALLAS_TIPUSOK, SZERELVENY_KODOK, szamolMunkadij, uresProjekt } from './munkadij.js';
import { parseKonyvtar, gyujtAnyaglista, anyaglistaSzoveg } from './anyaglista.js';
import { boltValaszBeolvasas, ajanlat, tetelKulcs, parseSzam, nemTetelNev } from './arak.js';
import { bovitettKonyvtar, bennVanAzAlapban, konyvtarCsv } from './konyvtar.js';
import { ugyfelAjanlatHtml, belsoOsszesitoHtml, fajlnev, ugyfelLevel, mailtoLink } from './sablonok.js';
import { pdfSzoveg } from './pdfszoveg.js';
import { diktaltTetelek, vanDiktalas, diktalas } from './diktalas.js';
import { hangosModInit } from './hangosfelulet.js';
import { ikon, MEZO_IKON } from './ikonok.js';
import {
  ALLAPOTOK, SZUROK, allapotAdat, osszesites, szur, evek, profit, ujAzonosito, javasoltAllapot, exportAdat, importAdat,
} from './ajanlatok.js';

const MENTES_KULCS = 'arajanlat.projekt';
const ARAK_KULCS = 'arajanlat.arak';
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
const NEZET_KULCS = 'arajanlat.nezet';
const ft = new Intl.NumberFormat('hu-HU', { useGrouping: 'always' });
const $ = (id) => document.getElementById(id);
const form = $('projekt');

const allapot = {
  tabla: null,
  alapKonyvtar: null,
  konyvtar: null,
  bovitesek: [], // a könyvtárhoz a felületen hozzáadott sorok (az eszközön tárolva)
  // Egyéb (saját) munkák: { kod, tetel, egyseg, egysegar, megjegyzes, anyag: [{ cikk, mennyiseg, egyseg }] }
  sajatMunkak: [],
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

// ---- Egyéb (saját) munkák ----

// A munkadíj-táblázat a saját munkákkal kiegészítve.
function munkadijTabla() {
  const t = new Map(allapot.tabla);
  for (const m of allapot.sajatMunkak) {
    t.set(m.kod, { kod: m.kod, tetel: m.tetel, egyseg: m.egyseg, egysegar: Number(m.egysegar) || 0, megjegyzes: m.megjegyzes ?? '' });
  }
  return t;
}

const MUNKA_EGYSEGEK = ['db', 'óra', 'fm', 'm²', 'kör', 'alkalom', 'kiállás', 'nap'];
const ANYAG_EGYSEGEK = ['db', 'fm', 'pár', 'csomag', 'szett', 'kg', 'tekercs', 'doboz'];

// Az "Egyéb munkák" sorai a Projekt lépésben. ertekek: a megtartandó mennyiségek (alapból a mostaniak).
function egyebFelepit(ertekek = olvas().egyeb) {
  const sorok = allapot.sajatMunkak.map((m) => `
    <label><span>${escape(m.tetel)}<small class="munka-ar">${ft.format(Number(m.egysegar) || 0)} Ft / ${escape(m.egyseg)}${
      m.anyag?.length ? ` · ${m.anyag.length} anyag` : ''}</small></span>
      <input type="number" min="0" step="any" name="egyeb.${m.kod}" value="${Number(ertekek?.[m.kod]) > 0 ? ertekek[m.kod] : ''}">
      <button type="button" class="munka-szerk" data-munka="${m.kod}" aria-label="Szerkesztés: ${escape(m.tetel)}">${ikon('ceruza')}</button>
    </label>`).join('');
  $('egyeb').innerHTML = sorok || '<p class="muted" style="margin:4px 0 0">Itt veheted fel a táblázatban nem szereplő munkákat (pl. hőcserélő csere) saját egységárral. Minden ajánlatnál használhatók.</p>';
  leptetok();
  ikonozas();
  kitoltesJelolese();
}

function ujMunkaKod(nev) {
  const alap = `sajat-${nev.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'munka'}`;
  let kod = alap;
  for (let i = 2; allapot.sajatMunkak.some((m) => m.kod === kod); i++) kod = `${alap}-${i}`;
  return kod;
}

// Szerkesztőablak egy egyéb munkához (új vagy meglévő).
function munkaSzerkeszto(kod = null) {
  const m = allapot.sajatMunkak.find((x) => x.kod === kod) ?? { tetel: '', egyseg: 'db', egysegar: '', megjegyzes: '', anyag: [] };
  const anyagSor = (a = {}) => `<div class="anyag-sor">
      <input class="as-cikk" placeholder="Anyag megnevezése" aria-label="Anyag megnevezése" value="${escape(a.cikk ?? '')}">
      <input class="as-menny" type="number" min="0" step="any" aria-label="Mennyiség" value="${a.mennyiseg ?? 1}">
      <select class="as-egyseg" aria-label="Egység">${ANYAG_EGYSEGEK.map((e) => `<option${e === (a.egyseg ?? 'db') ? ' selected' : ''}>${e}</option>`).join('')}</select>
      <button type="button" class="kicsi button as-torles" aria-label="Anyag törlése">×</button>
    </div>`;
  const hatter = document.createElement('div');
  hatter.className = 'parbeszed-hatter';
  hatter.innerHTML = `<form class="parbeszed munka-urlap" role="dialog" aria-modal="true" aria-labelledby="mu-cim">
    <h2 id="mu-cim">${kod ? 'Munka szerkesztése' : 'Új munka'}</h2>
    <label class="mezo"><span>Megnevezés</span><input name="tetel" required placeholder="Pl. Hőcserélő csere" value="${escape(m.tetel)}"></label>
    <div class="ketoszlop">
      <label class="mezo"><span>Egységár (Ft)</span><input name="egysegar" type="number" min="0" step="any" required inputmode="numeric" value="${m.egysegar}"></label>
      <label class="mezo"><span>Egység</span><select name="egyseg">${MUNKA_EGYSEGEK.map((e) => `<option${e === m.egyseg ? ' selected' : ''}>${e}</option>`).join('')}</select></label>
    </div>
    <label class="mezo"><span>Megjegyzés az ajánlaton (nem kötelező)</span><input name="megjegyzes" placeholder="Pl. a régi hőcserélő elszállításával" value="${escape(m.megjegyzes ?? '')}"></label>
    <div class="mezo"><span>Anyag ehhez a munkához (nem kötelező) – egy munkára számolva</span>
      <div class="anyag-sorok">${(m.anyag ?? []).map(anyagSor).join('')}</div>
      <button type="button" class="kicsi button as-uj">+ Anyag</button>
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
    if (ev.target.closest('.as-uj')) {
      urlap.querySelector('.anyag-sorok').insertAdjacentHTML('beforeend', anyagSor());
      urlap.querySelector('.anyag-sor:last-child .as-cikk').focus();
    } else if (ev.target.closest('.as-torles')) {
      ev.target.closest('.anyag-sor').remove();
    } else if (ev.target.closest('.mu-torles')) {
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
    const anyag = [...urlap.querySelectorAll('.anyag-sor')].map((sor) => ({
      cikk: sor.querySelector('.as-cikk').value.trim().replace(/\s+/g, ' '),
      mennyiseg: Number(sor.querySelector('.as-menny').value) || 0,
      egyseg: sor.querySelector('.as-egyseg').value,
    })).filter((a) => a.cikk && a.mennyiseg > 0);
    const adat = { tetel, egyseg: f.egyseg.value, egysegar, megjegyzes: f.megjegyzes.value.trim(), anyag };
    const ertekek = olvas().egyeb;
    if (kod) Object.assign(allapot.sajatMunkak.find((x) => x.kod === kod), adat);
    else allapot.sajatMunkak.push({ kod: ujMunkaKod(tetel), ...adat });
    ment(SAJAT_MUNKA_KULCS, allapot.sajatMunkak);
    zar();
    egyebFelepit(ertekek);
    frissit();
  });
  document.body.append(hatter);
  urlap.elements.tetel.focus();
}

// ---- Projekt űrlap ----

function szamMezo(nev, cimke) {
  return `<label><span>${escape(cimke)}</span><input type="number" min="0" name="${nev}"></label>`;
}

function felepit() {
  $('kiallasok').innerHTML = KIALLAS_TIPUSOK.map((t) => szamMezo(`kiallasok.${t.kod}`, t.nev)).join('');
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
    const ik = MEZO_IKON[mezo?.name] ?? (mezo?.name?.startsWith('egyeb.') ? 'kalapacs' : null);
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

function lenyilo(kulcs, cim, osszegzes, tartalom) {
  const nyitva = nyitottListak.has(kulcs);
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
  if (nyit) nyitottListak.add(b.dataset.lenyilo); else nyitottListak.delete(b.dataset.lenyilo);
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
    + `&body=${encodeURIComponent(levelSzoveg(szoveg))}`;
  $('anyag-gombok').hidden = e.sorok.length === 0;
  if (e.sorok.length === 0) {
    $('anyaglista').innerHTML = figyelmeztetesHtml(e.figyelmeztetesek)
      + '<p class="muted">Adj meg kiállást vagy gerincet.</p>';
    return;
  }
  const vanCikkszam = e.sorok.some((s) => s.cikkszam);
  const sorok = e.sorok.map((s) => `
    <tr>
      ${vanCikkszam ? `<td>${escape(s.cikkszam)}</td>` : ''}
      <td>${escape(s.cikk)}${s.plusz ? ` <span class="cimke">${s.forras === 'pdf' ? 'bolt' : 'plusz'}</span>` : ''}</td>
      <td class="num">${ft.format(s.mennyiseg)} ${escape(s.egyseg)}${s.listaMennyiseg !== undefined
        ? `<div class="muted">PDF szerint; lista: ${ft.format(s.listaMennyiseg)}</div>` : ''}</td>
    </tr>`).join('');
  $('anyaglista').innerHTML = figyelmeztetesHtml(e.figyelmeztetesek) + lenyilo('anyaglista', `Tételek (${e.sorok.length})`, '', `
    <table>
      <thead><tr>${vanCikkszam ? '<th>Cikkszám</th>' : ''}<th>Cikk</th><th class="num">Mennyiség</th></tr></thead>
      <tbody>${sorok}</tbody>
    </table>`);
}

// ---- Árak ----

const arMezo = (kulcs, mezo, ertek) => `<input type="text" inputmode="decimal" class="ar"
  data-kulcs="${escape(kulcs)}" data-mezo="${mezo}" value="${ertek ?? ''}" aria-label="${mezo === 'bolti' ? 'Bolti ár' : 'Kedvezményes ár'}">`;

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
          <td class="num">${arMezo(k, 'bolti', ar.bolti)}</td>
          <td class="num">${arMezo(k, 'kedvezmenyes', ar.kedvezmenyes)}</td>
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
  for (const [k, ar] of arak) arBeiras(k, ar);
  for (const [k, m] of mennyisegek) allapot.pdfMennyiseg[k] = m;
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

function jeloltHtml(j) {
  const arak = Object.entries(j.ar).filter(([, v]) => v !== null)
    .map(([m, v]) => `${MEZO_NEV[m]} ${penz(v)}`).join(', ');
  return `<li>
    <span><strong>${escape(j.cikk)}</strong>${j.cikkszam ? ` <span class="muted">(${escape(j.cikkszam)})</span>` : ''}<br>
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
    allapot.plusz.push({ cikk: t.cikk, egyseg: t.egyseg, mennyiseg: t.mennyiseg, cikkszam: t.cikkszam ?? '', ...(t.forras && { forras: t.forras }) });
  } else if (mennyisegFrissit) {
    meglevo.mennyiseg = t.mennyiseg;
  }
  if (t.ar) arBeiras(k, t.ar);
  ment(PLUSZ_KULCS, allapot.plusz);
  ment(ARAK_KULCS, allapot.arak);
}

function kiallasDarab(nev) {
  const kod = KIALLAS_TIPUSOK.find((t) => t.nev === nev)?.kod;
  return Number(allapot.projekt?.kiallasok?.[kod]) || 0;
}

function javasoltMennyiseg(t, kiallas) {
  const db = kiallasDarab(kiallas);
  return db > 0 ? Math.round((t.mennyiseg / db) * 100) / 100 : t.mennyiseg;
}

function megjelenitPlusz() {
  const sorok = allapot.plusz.map((t, i) => {
    const nyitva = allapot.konyvtarbaNyitva === i;
    const alapKiallas = KIALLAS_TIPUSOK.find((k) => kiallasDarab(k.nev) > 0)?.nev ?? KIALLAS_TIPUSOK[0].nev;
    return `<li class="plusz-sor">
      <div class="plusz-fej">
        <span class="plusz-nev">${escape(t.cikk)}${t.cikkszam ? ` <span class="muted">(${escape(t.cikkszam)})</span>` : ''}${t.forras === 'pdf' ? '<br><span class="muted">a bolt PDF-jéből</span>' : ''}</span>
        <span class="plusz-menny"><input type="number" min="0" step="any" class="plusz-mennyiseg" data-i="${i}"
          value="${t.mennyiseg}" aria-label="Mennyiség: ${escape(t.cikk)}"> ${escape(t.egyseg)}</span>
      </div>
      <div class="actions kicsi-gombok">
        <button type="button" class="kicsi button plusz-konyvtarba" data-i="${i}" aria-expanded="${nyitva}">Könyvtárba…</button>
        <button type="button" class="kicsi button plusz-torles" data-i="${i}">Törlés</button>
      </div>
      ${nyitva ? `<div class="konyvtarba">
        <label>Melyik kiálláshoz?
          <select id="kb-kiallas">${KIALLAS_TIPUSOK.map((k) => `<option${k.nev === alapKiallas ? ' selected' : ''}>${escape(k.nev)}</option>`).join('')}</select></label>
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
      <span><strong>${escape(b.kiallas)}:</strong> ${escape(b.cikk)} – ${ft.format(b.mennyiseg)} ${escape(b.egyseg)}
        ${bennVanAzAlapban(allapot.alapKonyvtar, b) ? ' <span class="muted">(már benne van az alapkönyvtárban, törölhető)</span>' : ''}</span>
      <button type="button" class="kicsi button bovites-torles" data-i="${i}" aria-label="Törlés: ${escape(b.cikk)}">×</button>
    </li>`).join('');

  $('plusz').innerHTML = `
    <h2 class="kartya-fej"><span class="fej-ikon">${ikon('plusz')}</span>Plusz tételek</h2>
    ${allapot.plusz.length ? lenyilo('plusz', `Plusz tételek (${allapot.plusz.length})`, '', `<ul class="plusz-lista">${sorok}</ul>`)
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
  allapot.konyvtar = bovitettKonyvtar(allapot.alapKonyvtar, allapot.bovitesek);
  ment(BOVITES_KULCS, allapot.bovitesek);
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
      allapot.bovitesek.push({ kiallas, cikk: t.cikk, mennyiseg, egyseg: t.egyseg, cikkszam: t.cikkszam ?? '' });
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
function ugyfelEmailFrissites() {
  if (!allapot.munkadij) return;
  const level = ugyfelLevel(ajanlat(allapot.munkadij, ajanlatSorok(), allapot.arak), olvasAdatok());
  $('email-ugyfel').href = mailtoLink(level);
  $('email-ugyfel').title = level.cimzett ? `Címzett: ${level.cimzett}` : 'Az ügyfél e-mail címét az Ajánlat adatainál adhatod meg';
}

function megjelenitKimenetek() {
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
    adatok: { ugyfel: adatok.ugyfel, ajanlat: adatok.ajanlat },
    // a felhasznált egyéb munkák leírása, hogy másik eszközön is megnyitható legyen
    sajatMunkak: allapot.sajatMunkak.filter((m) => Number(olvas().egyeb?.[m.kod]) > 0),
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
  egyebFelepit({});
  kitolt({
    ...ures, ...p,
    kiallasok: { ...ures.kiallasok, ...p.kiallasok },
    szerelvenyek: { ...ures.szerelvenyek, ...p.szerelvenyek },
    gerinc: { ...ures.gerinc, ...p.gerinc },
    egyeb: Object.fromEntries(allapot.sajatMunkak.map((m) => [m.kod, p.egyeb?.[m.kod] ?? 0])),
  });
  allapot.arak = klon(adat?.arak ?? {});
  allapot.plusz = klon(adat?.plusz ?? []);
  allapot.pdfMennyiseg = klon(adat?.pdfMennyiseg ?? {});
  allapot.feltoltesek = klon(adat?.feltoltesek ?? {});
  allapot.diktalt = [];
  const vallalkozo = olvasAdatok().vallalkozo;
  const ugyfel = { nev: '', cim: '', munkaHelye: '', email: '', ...adat?.adatok?.ugyfel };
  const ajanlatAdat = { szam: '', datum: maISO(), ervenyesNap: 15, megjegyzes: '', ...adat?.adatok?.ajanlat };
  kitoltAdatok({ vallalkozo, ugyfel, ajanlat: ajanlatAdat });
  $('bolt-valasz').value = '';
  $('eredmeny-bolti').innerHTML = feltoltesAllapotHtml('bolti');
  $('eredmeny-kedvezmenyes').innerHTML = feltoltesAllapotHtml('kedvezmenyes');
  $('beolvasas-eredmeny').innerHTML = feltoltesAllapotHtml('szoveg');
  for (const [k, v] of [[ARAK_KULCS, allapot.arak], [PLUSZ_KULCS, allapot.plusz], [PDF_MENNY_KULCS, allapot.pdfMennyiseg],
    [FELTOLTES_KULCS, allapot.feltoltesek], [ADATOK_KULCS, olvasAdatok()]]) ment(k, v);
  frissit();
  megjelenitPlusz();
  megjelenitArTabla(true);
  megjelenitKimenetek();
  allapot.aktualisId = id ?? null;
  ajanlatokMentese();
  megjelenitAjanlatAllapot();
  megjelenitAjanlatok();
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
    : `<p class="muted">Ez az ajánlat még nincs elmentve. Mentés után az Ajánlatok között követheted az állapotát és a profitját.</p>
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
    <li class="ajanlat-kartya${r.id === allapot.aktualisId ? ' aktualis' : ''}">
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
    const tartalom = exportAdat(allapot.ajanlatok, { vallalkozo: olvasAdatok().vallalkozo, bovitesek: allapot.bovitesek, sajatMunkak: allapot.sajatMunkak });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([tartalom], { type: 'application/json' }));
    a.download = `arajanlatok-${maISO()}.json`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    kiir('mentes-uzenet', `${allapot.ajanlatok.length} ajánlat elmentve fájlba.`);
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
      if (ujBovites.length) { allapot.bovitesek.push(...ujBovites); konyvtarFrissites(); frissit(); megjelenitPlusz(); }
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
  try {
    allapot.anyag = gyujtAnyaglista(p, allapot.konyvtar, allapot.sajatMunkak);
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

async function indit() {
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
  felepit();
  allapot.sajatMunkak = (betoltMentett(SAJAT_MUNKA_KULCS) ?? []).filter((m) => m?.kod && m?.tetel);
  egyebFelepit({});
  $('uj-munka').addEventListener('click', () => munkaSzerkeszto());
  $('egyeb').addEventListener('click', (ev) => {
    const b = ev.target.closest('.munka-szerk');
    if (b) { ev.preventDefault(); munkaSzerkeszto(b.dataset.munka); }
  });
  const mentett = betoltMentett(MENTES_KULCS);
  if (mentett) kitolt(mentett);
  allapot.arak = betoltMentett(ARAK_KULCS) ?? {};
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
  allapot.konyvtar = bovitettKonyvtar(allapot.alapKonyvtar, allapot.bovitesek);
  pluszEsemenyek();
  allapot.ajanlatok = (betoltMentett(AJANLATOK_KULCS) ?? []).filter((a) => a?.id);
  allapot.aktualisId = betoltMentett(AKTUALIS_KULCS);
  if (!allapot.ajanlatok.some((a) => a.id === allapot.aktualisId)) allapot.aktualisId = null;
  ajanlatEsemenyek();

  form.addEventListener('input', frissit);
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
    projekt: () => olvas(),
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
    mezoElem: (nev) => form.elements[nev] ?? adatokForm.elements[nev] ?? null,
  });
}

indit();
