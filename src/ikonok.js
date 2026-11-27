// Saját vonalas piktogramok (24×24, körvonalas, kerekített végek), a szakma tárgyaihoz.
// Minden ikon csak a belső SVG-elemeket tartalmazza; a stílus (szín, vastagság) a CSS-ből jön.

export const IKONOK = {
  // Kiállások, szerelvények
  wc: '<rect x="6" y="3" width="9" height="6" rx="1.5"/><path d="M4 9h15c0 3.6-2.7 6-6.5 6h-2C6.7 15 4 12.6 4 9z"/><path d="M9 15l-.8 6h7.6l-.8-6"/>',
  kad: '<path d="M3 12h18v2.5A4.5 4.5 0 0 1 16.5 19h-9A4.5 4.5 0 0 1 3 14.5z"/><path d="M6 12V6a2 2 0 0 1 3.8-.9"/><path d="M8.5 6.5l2.5-1.5"/><path d="M7 19l-1 2M17 19l1 2"/>',
  zuhany: '<path d="M5 21V9a5 5 0 0 1 9.2-2.7"/><path d="M11 9h8l-1.2 2.5h-5.6z"/><path d="M12.5 14.5v1M15 14.5v1M17.5 14.5v1M13.7 18v1M16.3 18v1"/>',
  bojler: '<rect x="7" y="2.5" width="10" height="16" rx="3"/><circle cx="12" cy="8" r="2"/><path d="M10 13h4M10 18.5V22M14 18.5V22"/>',
  mosogep: '<rect x="4" y="2.5" width="16" height="19" rx="2.5"/><path d="M4 7h16"/><circle cx="12" cy="14" r="4.2"/><path d="M10 13.4c.8.8 3.2.8 4 0"/><path d="M7.5 4.8h.01M10 4.8h.01"/>',
  hoszivattyu: '<rect x="2.5" y="5.5" width="19" height="13" rx="2"/><circle cx="9" cy="12" r="4"/><path d="M9 8v8M5 12h8"/><path d="M16 9h2.5M16 12h2.5M16 15h2.5"/><path d="M5 18.5v2M19 18.5v2"/>',
  mosdo: '<path d="M3 11h18v.5A6.5 6.5 0 0 1 14.5 18h-5A6.5 6.5 0 0 1 3 11.5z"/><path d="M12 11V6.5A2.5 2.5 0 0 1 14.5 4H16"/><path d="M12 18v3"/>',
  konyha: '<path d="M2 10h20"/><path d="M5 10v3a4 4 0 0 0 4 4h6a4 4 0 0 0 4-4v-3"/><path d="M17 10V5.5a2.5 2.5 0 0 0-5 0V7"/><path d="M8 20.5h8"/>',
  kerticsap: '<path d="M3 6v7"/><path d="M3 9.5h8.5a3.5 3.5 0 0 1 3.5 3.5v1"/><path d="M8.5 9.5V6.5M6 6.5h5"/><path d="M15 18.2a1.6 1.6 0 0 1-3.2 0c0-1.1 1.6-2.7 1.6-2.7s1.6 1.6 1.6 2.7z"/><path d="M2 21h20" opacity=".55"/>',
  csaptelep: '<path d="M5 20.5h14"/><path d="M9 20.5V12h6v8.5"/><path d="M15 14h2.5a2.5 2.5 0 0 1 2.5 2.5v.5"/><path d="M12 12V8.5M8.5 8.5h7"/>',
  kabin: '<rect x="4" y="2.5" width="16" height="19" rx="1.5"/><path d="M12 2.5v19"/><path d="M14.5 11v2.5"/><path d="M6.5 5.5h3l-.5 1.5h-2z"/><path d="M7.2 9v.6M8.7 9v.6"/>',
  // Fűtés
  radiator: '<path d="M6 4.5v14M10 4.5v14M14 4.5v14M18 4.5v14"/><path d="M4 8h16M4 15h16"/><path d="M6 18.5v2M18 18.5v2"/>',
  padlofutes: '<path d="M4 17.5V8a2 2 0 0 1 4 0v7.5a2 2 0 0 0 4 0V8a2 2 0 0 1 4 0v7.5a2 2 0 0 0 4 0V6"/><path d="M2 21h20"/>',
  lang: '<path d="M12 2.8c.9 3 5.2 5.3 5.2 10.4a5.2 5.2 0 0 1-10.4 0c0-2.2 1-4 2.2-5.1-.1 2 .9 3.3 2.1 3.4-.4-3.2-.4-5.8.9-8.7z"/>',
  // Csövek
  cso: '<path d="M2.5 8.5h6a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 0 3.5 3.5h6"/><path d="M2.5 6v5M21.5 13v5"/>',
  csepp: '<path d="M12 3s6.5 7.1 6.5 11.5a6.5 6.5 0 0 1-13 0C5.5 10.1 12 3 12 3z"/><path d="M9 15a3 3 0 0 0 3 3"/>',
  szennyviz: '<path d="M4 3.5h5.5v7.5a3.5 3.5 0 0 0 3.5 3.5h7"/><path d="M20 11.5v6"/><path d="M2 21h20" opacity=".55"/><path d="M6.5 18h.01M10 18.5h.01"/>',
  // Szakaszok, műveletek
  csavarkulcs: '<path d="M14.7 6.3a4.2 4.2 0 0 0-5.6 5.6L3 18l3 3 6.1-6.1a4.2 4.2 0 0 0 5.6-5.6l-2.6 2.6-2.4-.6-.6-2.4z"/>',
  kalapacs: '<path d="M14.5 10.5 6 19a2.1 2.1 0 0 1-3-3l8.5-8.5"/><path d="M12.5 5.5 15.5 2.5l6 6-3 3z"/><path d="M11.5 7.5l5 5"/>',
  doboz: '<path d="M21 7.8 12 3 3 7.8 12 12.6z"/><path d="M3 7.8v8.4L12 21l9-4.8V7.8"/><path d="M12 12.6V21"/>',
  plusz: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8M8 12h8"/>',
  cimke: '<path d="M20.5 12.3 12.3 20.5a1.6 1.6 0 0 1-2.3 0L3 13.5V3h10.5l7 7a1.6 1.6 0 0 1 0 2.3z"/><path d="M7.5 7.5h.01"/>',
  szemely: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  dokumentum: '<path d="M14 2.5H6.5A1.5 1.5 0 0 0 5 4v16a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 20V7.5z"/><path d="M14 2.5v5h5"/><path d="M8.5 13h7M8.5 17h5"/>',
  lakat: '<rect x="4.5" y="10.5" width="15" height="11" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/><path d="M12 15v2.5"/>',
  feltolt: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 15v3.5A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V15"/>',
  letolt: '<path d="M12 4v12M7 11l5 5 5-5"/><path d="M4 15v3.5A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V15"/>',
  naptar: '<rect x="3" y="4.5" width="18" height="16.5" rx="2"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/><path d="M7.5 13.5h2M11 13.5h2M14.5 13.5h2M7.5 17h2M11 17h2"/>',
  level: '<rect x="2.5" y="4.5" width="19" height="15" rx="2"/><path d="m3 6 9 7 9-7"/>',
  masol: '<rect x="8.5" y="8.5" width="12" height="12" rx="2"/><path d="M15.5 8.5V5a1.5 1.5 0 0 0-1.5-1.5H5A1.5 1.5 0 0 0 3.5 5v9A1.5 1.5 0 0 0 5 15.5h3.5"/>',
  ceruza: '<path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/><path d="M14.5 5.5l3 3"/>',
  aktataska: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8.5 7V5.5A1.5 1.5 0 0 1 10 4h4a1.5 1.5 0 0 1 1.5 1.5V7"/><path d="M3 12.5h18"/><path d="M10.5 12.5v1.5h3v-1.5"/>',
  mentes: '<path d="M5 3.5h11l3.5 3.5v12A1.5 1.5 0 0 1 18 20.5H6A1.5 1.5 0 0 1 4.5 19V5A1.5 1.5 0 0 1 6 3.5z"/><path d="M8 3.5v5h7v-5"/><rect x="7.5" y="13" width="9" height="7.5" rx="1"/>',
  vegosszeg: '<rect x="2.5" y="5.5" width="19" height="13" rx="2"/><circle cx="12" cy="12" r="2.8"/><path d="M6 9.5v5M18 9.5v5"/>',
};

export function ikon(nev, osztaly = '') {
  const tartalom = IKONOK[nev];
  if (!tartalom) return '';
  return `<svg viewBox="0 0 24 24" class="ikon ${osztaly}" aria-hidden="true" focusable="false">${tartalom}</svg>`;
}

// Mezőnév -> ikon
export const MEZO_IKON = {
  'kiallasok.wc_tartaly': 'wc', 'kiallasok.kad': 'kad', 'kiallasok.zuhanyzo': 'zuhany', 'kiallasok.bojler': 'bojler',
  'kiallasok.mosogep': 'mosogep', 'kiallasok.hoszivattyu': 'hoszivattyu', 'kiallasok.mosdo': 'mosdo',
  'kiallasok.konyha': 'konyha', 'kiallasok.kerti_csap': 'kerticsap',
  radiatorKiallas: 'radiator', radiatorFelszereles: 'radiator', padlofutesKor: 'padlofutes', hotermelo: 'lang',
  'szerelvenyek.wc': 'wc', 'szerelvenyek.mosdo_sima': 'mosdo', 'szerelvenyek.mosdo_butoros': 'mosdo', 'szerelvenyek.mosdo_dupla': 'mosdo',
  'szerelvenyek.csaptelep': 'csaptelep', 'szerelvenyek.zuhanycsaptelep_sullyesztett': 'zuhany', 'szerelvenyek.mosogep_bekotes': 'mosogep',
  'szerelvenyek.zuhanykabin_konnyu': 'kabin', 'szerelvenyek.zuhanykabin_kozepes': 'kabin', 'szerelvenyek.zuhanykabin_nehez': 'kabin',
  'szerelvenyek.kad_hagyomanyos': 'kad', 'szerelvenyek.kad_elolapos': 'kad',
  'szerelvenyek.bojler_egyszeru': 'bojler', 'szerelvenyek.bojler_futesrol': 'bojler',
  'gerinc.16': 'cso', 'gerinc.20': 'cso', kulsoVizFm: 'csepp', kulsoSzennyvizFm: 'szennyviz',
};
