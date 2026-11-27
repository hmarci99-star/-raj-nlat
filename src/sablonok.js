// Nyomtatható (PDF-be menthető) sablonok: ügyfélajánlat és belső összesítő.
// Bemenet: az ajanlat() eredménye és az ajánlat adatai (vállalkozó, ügyfél, dátum).

const ft = new Intl.NumberFormat('hu-HU', { useGrouping: 'always' });
export const penz = (x) => (x === null || x === undefined ? '–' : `${ft.format(x)} Ft`);
const menny = (x, egyseg) => `${ft.format(x)} ${egyseg}`;

export function escape(s) {
  return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}

// "2026-11-25" -> "2026. november 25."
export function datumSzoveg(iso) {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' }).format(d);
}

export function hozzaadNap(iso, napok) {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime()) || !(napok > 0)) return '';
  d.setDate(d.getDate() + Number(napok));
  return d.toISOString().slice(0, 10);
}

// Toldalék dátum után: "2026. december 10." + "ig" -> "2026. december 10-ig".
const datumToldalekkal = (iso, toldalek) => `${datumSzoveg(iso).replace(/\.$/, '')}-${toldalek}`;

const sorok = (...elemek) => elemek.filter(Boolean).map(escape).join('<br>');

function fejlec(cim, adatok) {
  const { vallalkozo: v = {}, ugyfel: u = {}, ajanlat: a = {} } = adatok;
  const ervenyes = hozzaadNap(a.datum, a.ervenyesNap);
  return `
    <header class="ny-fej">
      <div class="ny-vallalkozo">
        <strong>${escape(v.nev)}</strong><br>
        ${sorok(v.cim, v.adoszam && `Adószám: ${v.adoszam}`, v.telefon, v.email)}
      </div>
      <div class="ny-cim">
        <h1>${escape(cim)}</h1>
        ${a.szam ? `<div>Szám: ${escape(a.szam)}</div>` : ''}
        ${a.datum ? `<div>Kelt: ${escape(datumSzoveg(a.datum))}</div>` : ''}
        ${ervenyes ? `<div>Érvényes: ${escape(datumToldalekkal(ervenyes, 'ig'))}</div>` : ''}
      </div>
    </header>
    ${u.nev || u.cim || u.munkaHelye ? `
    <section class="ny-ugyfel">
      <div><span class="ny-cimke">Megrendelő</span><br>${sorok(u.nev, u.cim)}</div>
      ${u.munkaHelye ? `<div><span class="ny-cimke">A munka helye</span><br>${escape(u.munkaHelye)}</div>` : ''}
    </section>` : ''}`;
}

export function ugyfelAjanlatHtml(a, adatok) {
  const munkadijSorok = a.munkadij.sorok.map((s) => `
    <tr>
      <td>${escape(s.tetel)}${s.megjegyzes ? `<div class="ny-megj">${escape(s.megjegyzes)}</div>` : ''}</td>
      <td class="num">${escape(menny(s.mennyiseg, s.egyseg))}</td>
      <td class="num">${penz(s.egysegar)}</td>
      <td class="num">${penz(s.osszeg)}</td>
    </tr>`).join('');
  const anyagSorok = a.anyag.map((s) => `
    <tr>
      <td>${escape(s.cikk)}</td>
      <td class="num">${escape(menny(s.mennyiseg, s.egyseg))}</td>
      <td class="num">${penz(s.bolti)}</td>
      <td class="num">${penz(s.boltiOsszeg)}</td>
    </tr>`).join('');
  const fej = '<thead><tr><th>Megnevezés</th><th class="num">Mennyiség</th><th class="num">Egységár</th><th class="num">Összeg</th></tr></thead>';
  const megjegyzes = adatok.ajanlat?.megjegyzes;
  return `
    <article class="ny-lap">
      ${fejlec('Árajánlat', adatok)}
      ${a.munkadij.sorok.length ? `
      <h2>Munkadíj</h2>
      <table>${fej}<tbody>${munkadijSorok}</tbody>
        <tfoot><tr><td colspan="3">Munkadíj összesen</td><td class="num">${penz(a.munkadij.osszesen)}</td></tr></tfoot>
      </table>` : ''}
      ${a.anyag.length ? `
      <h2>Anyag</h2>
      <table>${fej}<tbody>${anyagSorok}</tbody>
        <tfoot><tr><td colspan="3">Anyag összesen</td><td class="num">${penz(a.anyagBolti)}</td></tr></tfoot>
      </table>` : ''}
      <table class="ny-osszesites">
        ${a.munkadij.sorok.length && a.anyag.length ? `
        <tr><td>Munkadíj</td><td class="num">${penz(a.munkadij.osszesen)}</td></tr>
        <tr><td>Anyag</td><td class="num">${penz(a.anyagBolti)}</td></tr>` : ''}
        <tr class="ny-vegosszeg"><td>Fizetendő végösszeg</td><td class="num">${penz(a.vegosszeg)}</td></tr>
      </table>
      <div class="ny-zaras">
      <p class="ny-afa">Alanyi adómentes, az árak ÁFA-t nem tartalmaznak.</p>
      ${a.anyag.length && adatok.ajanlat?.datum ? `<p class="ny-megj">Az anyagárak a ${escape(datumToldalekkal(adatok.ajanlat.datum, 'i'))} bolti árak.</p>` : ''}
      ${megjegyzes ? `<p class="ny-szabad">${escape(megjegyzes).replace(/\n/g, '<br>')}</p>` : ''}
      ${foglalas(adatok.vallalkozo) ? `<p class="ny-szabad">Időpontfoglalás: <a href="${escape(foglalas(adatok.vallalkozo))}">${escape(foglalas(adatok.vallalkozo))}</a></p>` : ''}
      <footer class="ny-alairas"><div>${escape(adatok.vallalkozo?.nev)}</div></footer>
      </div>
    </article>`;
}

export function belsoOsszesitoHtml(a, adatok) {
  const tetelek = a.anyag.map((s) => `
    <tr>
      <td>${escape(s.cikk)}</td>
      <td class="num">${escape(menny(s.mennyiseg, s.egyseg))}</td>
      <td class="num">${penz(s.kedvezmenyes)}</td>
      <td class="num">${penz(s.bolti)}</td>
      <td class="num">${penz(s.kedvOsszeg)}</td>
      <td class="num">${penz(s.boltiOsszeg)}</td>
      <td class="num">${penz(s.haszon)}</td>
    </tr>`).join('');
  const hiany = [
    a.hianyzoBolti && `${a.hianyzoBolti} tételnek nincs bolti ára.`,
    a.hianyzoKedvezmenyes && `${a.hianyzoKedvezmenyes} tételnek nincs kedvezményes ára.`,
  ].filter(Boolean);
  return `
    <article class="ny-lap ny-belso">
      ${fejlec('Belső összesítő', { ...adatok, ajanlat: { ...adatok.ajanlat, ervenyesNap: 0 } })}
      <p class="ny-bizalmas">Belső használatra, az ügyfélnek nem adható ki.</p>
      ${hiany.length ? `<p class="ny-hiany">${hiany.map(escape).join(' ')}</p>` : ''}
      <table class="ny-osszesites ny-kpi">
        <tr><td>Munkadíj</td><td class="num">${penz(a.munkadij.osszesen)}</td></tr>
        <tr><td>Haszon az anyagon</td><td class="num">${penz(a.haszon)}</td></tr>
        <tr class="ny-vegosszeg"><td>Bevétel összesen (munkadíj + haszon)</td><td class="num">${penz(a.munkadij.osszesen + a.haszon)}</td></tr>
        <tr><td>Az ügyfél fizet</td><td class="num">${penz(a.vegosszeg)}</td></tr>
        <tr><td>Anyagbeszerzés (kedvezményes bruttó áron)</td><td class="num">${penz(a.anyagKedvezmenyes)}</td></tr>
      </table>
      ${a.anyag.length ? `
      <h2>Anyag tételesen</h2>
      <table class="ny-suru">
        <thead><tr><th>Cikk</th><th class="num">Menny.</th><th class="num">Kedv. egységár</th><th class="num">Bolti egységár</th>
          <th class="num">Beszerzés</th><th class="num">Bolti összeg</th><th class="num">Haszon</th></tr></thead>
        <tbody>${tetelek}</tbody>
        <tfoot><tr><td colspan="4">Összesen</td><td class="num">${penz(a.anyagKedvezmenyes)}</td>
          <td class="num">${penz(a.anyagBolti)}</td><td class="num">${penz(a.haszon)}</td></tr></tfoot>
      </table>` : ''}
    </article>`;
}

// Javasolt fájlnév (a böngésző a dokumentum címét ajánlja fel PDF-mentéskor).
export function fajlnev(tipus, adatok) {
  const nev = (adatok.ugyfel?.nev || '').trim().replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '_');
  return [tipus, nev, adatok.ajanlat?.datum].filter(Boolean).join('_');
}

// E-mail az ügyfélnek: tárgy és szöveg (a PDF-et a felhasználó csatolja).
// a: az ajanlat() eredménye, adatok: { vallalkozo, ugyfel, ajanlat }
// A vállalkozó nyilvános időpontfoglalási linkje (csak http(s), és nem a naptár szerkesztőoldala).
const foglalas = (v) => {
  const link = (v?.foglalas ?? '').trim();
  return /^https?:\/\//.test(link) && !/calendar\.google\.com\/calendar\/(u\/\d+\/)?r\b/.test(link) ? link : '';
};

export function ugyfelLevel(a, adatok) {
  const { vallalkozo: v = {}, ugyfel: u = {}, ajanlat: aj = {} } = adatok;
  const f = (x) => `${ft.format(Math.round(x ?? 0)).replace(/ /g, ' ')} Ft`;
  const hely = u.munkaHelye || u.cim;
  const ervenyes = hozzaadNap(aj.datum, aj.ervenyesNap);
  const sorok = [
    `Tisztelt ${u.nev || 'Megrendelő'}!`,
    '',
    `Köszönöm a megkeresést. Mellékelten küldöm az árajánlatot${hely ? ` (${hely})` : ''}.`,
    '',
    'Összesítve:',
    `Munkadíj: ${f(a.munkadij.osszesen)}`,
    ...(a.anyagBolti > 0 ? [`Anyag: ${f(a.anyagBolti)}`] : []),
    `Fizetendő végösszeg: ${f(a.vegosszeg)}`,
    'Alanyi adómentes, az árak ÁFA-t nem tartalmaznak.',
    ...(ervenyes ? ['', `Az ajánlat ${datumToldalekkal(ervenyes, 'ig')} érvényes.`] : []),
    ...(foglalas(v) ? ['', `Időpontot itt foglalhat (felmérés, egyeztetés): ${foglalas(v)}`] : []),
    '',
    'Ha bármilyen kérdése van, keressen bizalommal.',
    '',
    'Üdvözlettel:',
    ...[v.nev, v.telefon, v.email].filter(Boolean),
  ];
  return {
    cimzett: (u.email ?? '').trim(),
    targy: `Árajánlat${aj.szam ? ` – ${aj.szam}` : ''}${hely ? ` – ${hely}` : ''}`,
    szoveg: sorok.join('\n'),
  };
}

export const mailtoLink = ({ cimzett, targy, szoveg }) =>
  `mailto:${encodeURIComponent(cimzett).replace(/%40/g, '@')}?subject=${encodeURIComponent(targy)}&body=${encodeURIComponent(szoveg)}`;

// ---- Naptár ----

// Google Naptár "esemény létrehozása" link (bejelentkezés és beállítás nélkül működik).
// ajanlat: { idopontTipus: 'felmeres' | 'kivitelezes', idopont: 'ÉÉÉÉ-HH-NNTÓÓ:PP', idotartam }
// Felmérés: időpontra, órában (alapból 1). Kivitelezés: egész napos, napokban (alapból 1).
export function naptarLink(adatok, vegosszeg = 0) {
  const { ugyfel: u = {}, ajanlat: aj = {} } = adatok;
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(aj.idopont ?? '');
  if (!m) return null;
  const kivitelezes = aj.idopontTipus === 'kivitelezes';
  const hossz = Number(aj.idotartam) > 0 ? Number(aj.idotartam) : 1;
  const ketjegy = (n) => String(n).padStart(2, '0');
  const nap = (d) => `${d.getUTCFullYear()}${ketjegy(d.getUTCMonth() + 1)}${ketjegy(d.getUTCDate())}`;
  let datumok;
  if (kivitelezes) {
    const kezd = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    const vege = new Date(kezd.getTime() + Math.ceil(hossz) * 86400000); // a vége nem számít bele
    datumok = `${nap(kezd)}/${nap(vege)}`;
  } else {
    // Helyi (budapesti) idő: a ctz paraméter mondja meg a naptárnak, így nincs időzóna-átszámítás.
    const kezd = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] ?? 8), +(m[5] ?? 0)));
    const vege = new Date(kezd.getTime() + hossz * 3600000);
    const ido = (d) => `${nap(d)}T${ketjegy(d.getUTCHours())}${ketjegy(d.getUTCMinutes())}00`;
    datumok = `${ido(kezd)}/${ido(vege)}`;
  }
  const hely = u.munkaHelye || u.cim || '';
  const cim = `${kivitelezes ? 'Kivitelezés' : 'Felmérés'} – ${u.nev || 'ügyfél'}`;
  const reszletek = [
    u.nev && `Ügyfél: ${u.nev}`,
    u.email && `E-mail: ${u.email}`,
    hely && `Cím: ${hely}`,
    aj.szam && `Ajánlat: ${aj.szam}`,
    vegosszeg > 0 && `Végösszeg: ${ft.format(Math.round(vegosszeg))} Ft`,
    aj.megjegyzes && `\n${aj.megjegyzes}`,
  ].filter(Boolean).join('\n');
  const p = new URLSearchParams({ action: 'TEMPLATE', text: cim, dates: datumok, details: reszletek, location: hely });
  if (!kivitelezes) p.set('ctz', 'Europe/Budapest');
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

// Rövid üzenet az ügyfélnek a foglalási linkkel (SMS, Viber, e-mail).
export function foglalasUzenet(vallalkozo = {}, ugyfelNev = '') {
  const v = vallalkozo;
  return [
    ugyfelNev ? `Tisztelt ${ugyfelNev}!` : 'Jó napot kívánok!',
    '',
    `Az alábbi linken kiválaszthatja az Önnek megfelelő időpontot a helyszíni felméréshez: ${(v.foglalas ?? '').trim()}`,
    'A foglalásról e-mailben visszaigazolást kap.',
    '',
    'Üdvözlettel:',
    ...[v.nev, v.telefon].filter(Boolean),
  ].join('\n');
}

// A Google Naptár szerkesztőoldalának címe (nem nyilvános foglalási link)?
export const foglalasiLinkHibas = (link) => /calendar\.google\.com\/calendar\/(u\/\d+\/)?r\b/.test(link ?? '');
