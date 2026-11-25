import { parseMunkadijTabla } from './csv.js';
import { KIALLAS_TIPUSOK, SZERELVENY_KODOK, szamolMunkadij, uresProjekt } from './munkadij.js';
import { parseKonyvtar, gyujtAnyaglista, anyaglistaSzoveg } from './anyaglista.js';
import { boltValaszBeolvasas, ajanlat, tetelKulcs, parseSzam } from './arak.js';
import { ugyfelAjanlatHtml, belsoOsszesitoHtml, fajlnev } from './sablonok.js';

const MENTES_KULCS = 'arajanlat.projekt';
const ARAK_KULCS = 'arajanlat.arak';
const ADATOK_KULCS = 'arajanlat.adatok';
const ft = new Intl.NumberFormat('hu-HU', { useGrouping: 'always' });
const $ = (id) => document.getElementById(id);
const form = $('projekt');

const allapot = {
  tabla: null,
  konyvtar: null,
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
}
function betoltMentett(kulcs) {
  try { return JSON.parse(localStorage.getItem(kulcs)); } catch { return null; }
}

// ---- Projekt űrlap ----

function szamMezo(nev, cimke) {
  return `<label><span>${escape(cimke)}</span><input type="number" min="0" name="${nev}"></label>`;
}

function felepit() {
  $('kiallasok').innerHTML = KIALLAS_TIPUSOK.map((t) => szamMezo(`kiallasok.${t.kod}`, t.nev)).join('');
  $('szerelvenyek').innerHTML = SZERELVENY_KODOK
    .map((kod) => szamMezo(`szerelvenyek.${kod}`, allapot.tabla.get(kod).tetel)).join('');
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

// ---- Anyaglista ----

const levelSzoveg = (lista) => `Szia!

A következő tételekről szeretnék kérni árajánlatot.
Köszönöm szépen előre is.

${lista}
`;

function megjelenitAnyag() {
  const e = allapot.anyag;
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
      <td>${escape(s.cikk)}</td>
      <td class="num">${ft.format(s.mennyiseg)} ${escape(s.egyseg)}</td>
    </tr>`).join('');
  $('anyaglista').innerHTML = `${figyelmeztetesHtml(e.figyelmeztetesek)}
    <table>
      <thead><tr>${vanCikkszam ? '<th>Cikkszám</th>' : ''}<th>Cikk</th><th class="num">Mennyiség</th></tr></thead>
      <tbody>${sorok}</tbody>
    </table>`;
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
  $('ar-tabla').innerHTML = `
    <table>
      <thead><tr><th>Cikk</th><th class="num">Bolti bruttó egységár</th><th class="num">Kedv. bruttó egységár</th></tr></thead>
      <tbody>${sorok.map((s) => {
        const k = tetelKulcs(s);
        const ar = allapot.arak[k] ?? {};
        return `<tr>
          <td>${escape(s.cikk)}<div class="muted">${ft.format(s.mennyiseg)} ${escape(s.egyseg)}</div></td>
          <td class="num">${arMezo(k, 'bolti', ar.bolti)}</td>
          <td class="num">${arMezo(k, 'kedvezmenyes', ar.kedvezmenyes)}</td>
        </tr>`;
      }).join('')}</tbody>
    </table>`;
}

function beolvas() {
  const { arak, nemIllesztett } = boltValaszBeolvasas($('bolt-valasz').value, allapot.anyag.sorok);
  for (const [k, ar] of arak) {
    allapot.arak[k] = { ...allapot.arak[k], bolti: ar.bolti, ...(ar.kedvezmenyes !== null && { kedvezmenyes: ar.kedvezmenyes }) };
  }
  ment(ARAK_KULCS, allapot.arak);
  const hianyzik = allapot.anyag.sorok.filter((s) => !Number.isFinite(allapot.arak[tetelKulcs(s)]?.bolti)).length;
  $('beolvasas-eredmeny').innerHTML = `
    <p>${arak.size} tétel ára beolvasva.${hianyzik ? ` ${hianyzik} tételnek még nincs bolti ára, ezeket írd be kézzel.` : ''}</p>
    ${nemIllesztett.length ? `<p class="muted">Ezeket a sorokat nem tudtam tételhez kötni:</p>
      <ul class="nem-illesztett">${nemIllesztett.map((s) => `<li>${escape(s)}</li>`).join('')}</ul>` : ''}`;
  megjelenitArTabla(true);
  megjelenitKimenetek();
}

// ---- Kimenetek ----

function megjelenitKimenetek() {
  if (!allapot.munkadij) return;
  const a = ajanlat(allapot.munkadij, allapot.anyag.sorok, allapot.arak);

  const anyagSorok = a.anyag.map((s) => `
    <tr>
      <td>${escape(s.cikk)}</td>
      <td class="num">${ft.format(s.mennyiseg)} ${escape(s.egyseg)}</td>
      <td class="num hide-sm">${penz(s.bolti)}</td>
      <td class="num">${penz(s.boltiOsszeg)}</td>
    </tr>`).join('');
  $('ugyfel').innerHTML = `
    ${a.hianyzoBolti ? `<p class="warn">${a.hianyzoBolti} anyagtételnek nincs bolti ára, az összeg hiányos.</p>` : ''}
    <h3>Munkadíj</h3>
    ${munkadijHtml(a.munkadij)}
    ${a.anyag.length ? `<h3>Anyag</h3>
    <table>
      <thead><tr><th>Cikk</th><th class="num">Menny.</th><th class="num hide-sm">Egységár</th><th class="num">Összeg</th></tr></thead>
      <tbody>${anyagSorok}</tbody>
      <tfoot><tr><td colspan="2">Anyag összesen</td><td class="hide-sm"></td><td class="num">${penz(a.anyagBolti)}</td></tr></tfoot>
    </table>` : ''}
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
    <table>
      <thead><tr><th>Cikk</th><th class="num">Beszerzés</th><th class="num hide-sm">Bolti</th><th class="num">Haszon</th></tr></thead>
      <tbody>${belsoSorok}</tbody>
      <tfoot><tr><td>Összesen</td><td class="num">${penz(a.anyagKedvezmenyes)}</td><td class="num hide-sm">${penz(a.anyagBolti)}</td><td class="num">${penz(a.haszon)}</td></tr></tfoot>
    </table>
    <dl class="osszesito">
      <dt>Munkadíj</dt><dd>${penz(a.munkadij.osszesen)}</dd>
      <dt>Haszon az anyagon</dt><dd>${penz(a.haszon)}</dd>
      <dt>Ügyfél fizet</dt><dd>${penz(a.vegosszeg)}</dd>
      <dt>Anyagbeszerzés</dt><dd>${penz(a.anyagKedvezmenyes)}</dd>
    </dl>`;
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
  const a = ajanlat(allapot.munkadij, allapot.anyag.sorok, allapot.arak);
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
    allapot.munkadij = szamolMunkadij(p, allapot.tabla);
    $('eredmeny').innerHTML = figyelmeztetesHtml(allapot.munkadij.figyelmeztetesek) + munkadijHtml(allapot.munkadij);
  } catch (err) {
    allapot.munkadij = null;
    $('eredmeny').innerHTML = `<p class="error">${escape(err.message)}</p>`;
  }
  try {
    allapot.anyag = gyujtAnyaglista(p, allapot.konyvtar);
    megjelenitAnyag();
  } catch (err) {
    allapot.anyag = { sorok: [], figyelmeztetesek: [] };
    $('anyaglista').innerHTML = `<p class="error">${escape(err.message)}</p>`;
  }
  megjelenitArTabla();
  megjelenitKimenetek();
}

async function betolt(utvonal, nev) {
  const valasz = await fetch(utvonal);
  if (!valasz.ok) throw new Error(`A(z) ${nev} nem tölthető be (${valasz.status}).`);
  return valasz.text();
}

async function indit() {
  try {
    const [tablaCsv, konyvtarCsv] = await Promise.all([
      betolt('data/munkadij.csv', 'munkadíj-táblázat'),
      betolt('data/kiallas-konyvtar.csv', 'kiállás-könyvtár'),
    ]);
    allapot.tabla = parseMunkadijTabla(tablaCsv);
    allapot.konyvtar = parseKonyvtar(konyvtarCsv);
  } catch (err) {
    $('eredmeny').innerHTML = `<p class="error">${escape(err.message)}</p>`;
    $('anyaglista').innerHTML = '';
    return;
  }
  felepit();
  const mentett = betoltMentett(MENTES_KULCS);
  if (mentett) kitolt(mentett);
  allapot.arak = betoltMentett(ARAK_KULCS) ?? {};

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
  $('arak-torlese').addEventListener('click', () => {
    if (!confirm('Törlöd az összes beírt árat?')) return;
    allapot.arak = {};
    ment(ARAK_KULCS, allapot.arak);
    $('beolvasas-eredmeny').innerHTML = '';
    megjelenitArTabla(true);
    megjelenitKimenetek();
  });
  const mentettAdatok = betoltMentett(ADATOK_KULCS) ?? {};
  kitoltAdatok({ ...mentettAdatok, ajanlat: { datum: maISO(), ervenyesNap: 15, ...mentettAdatok.ajanlat } });
  adatokForm.addEventListener('input', () => ment(ADATOK_KULCS, olvasAdatok()));
  adatokForm.addEventListener('submit', (ev) => ev.preventDefault());

  // A böngésző saját Nyomtatás menüjéből az ügyfélajánlat készül.
  let gombbol = false;
  const pdf = (tipus) => { gombbol = true; nyomtat(tipus); window.print(); };
  $('pdf-ugyfel').addEventListener('click', () => pdf('ugyfel'));
  $('pdf-belso').addEventListener('click', () => pdf('belso'));
  window.addEventListener('beforeprint', () => { if (!gombbol) nyomtat('ugyfel'); });
  window.addEventListener('afterprint', () => { gombbol = false; document.title = eredetiCim; });

  frissit();
}

indit();
