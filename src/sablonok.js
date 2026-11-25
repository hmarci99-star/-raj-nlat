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
