// Mentett ajánlatok: állapotok, összesítés (elfogadott ajánlatok profitja), szűrés.
// Tiszta logika, a tárolás és a felület az app.js-ben van.

// Az ajánlat útja a felméréstől a kész munkáig (az eredeti terv szerint).
export const ALLAPOTOK = [
  { kod: 'felmeres', nev: 'Felmérés', csoport: 'folyamatban' },
  { kod: 'anyag-elkuldve', nev: 'Anyaglista elküldve', csoport: 'folyamatban' },
  { kod: 'arak-megjottek', nev: 'Árak megérkeztek', csoport: 'folyamatban' },
  { kod: 'elkuldve', nev: 'Ajánlat elküldve', csoport: 'elkuldve' },
  { kod: 'elfogadva', nev: 'Elfogadva', csoport: 'elfogadva' },
  { kod: 'kivitelezes', nev: 'Kivitelezés', csoport: 'elfogadva' },
  { kod: 'kesz', nev: 'Kész', csoport: 'elfogadva' },
  { kod: 'elutasitva', nev: 'Elutasítva', csoport: 'elutasitva' },
];

export const allapotAdat = (kod) => ALLAPOTOK.find((a) => a.kod === kod) ?? ALLAPOTOK[0];
export const elfogadott = (kod) => allapotAdat(kod).csoport === 'elfogadva';

export const SZUROK = [
  { kod: 'mind', nev: 'Mind' },
  { kod: 'folyamatban', nev: 'Folyamatban' },
  { kod: 'elkuldve', nev: 'Elküldve' },
  { kod: 'elfogadva', nev: 'Elfogadott' },
  { kod: 'elutasitva', nev: 'Elutasított' },
];

// Az ajánlat profitja: a munkadíj és az anyagon maradó haszon (bolti − kedvezményes ár).
export const profit = (o) => (o?.munkadij ?? 0) + (o?.anyagHaszon ?? 0);

// Az ajánlat éve: a kelte (ha van), különben a létrehozás dátuma.
export const ajanlatEve = (a) => String(a.datum || a.letrehozva || '').slice(0, 4);

// ev: '2026' vagy 'mind'
export function osszesites(lista, ev = 'mind') {
  const evben = lista.filter((a) => ev === 'mind' || ajanlatEve(a) === ev);
  const elf = evben.filter((a) => elfogadott(a.allapot));
  const fuggo = evben.filter((a) => allapotAdat(a.allapot).csoport === 'elkuldve');
  const sum = (l, f) => l.reduce((t, a) => t + (f(a) || 0), 0);
  return {
    elfogadottDb: elf.length,
    bevetel: sum(elf, (a) => a.osszeg?.vegosszeg),
    profit: sum(elf, (a) => profit(a.osszeg)),
    munkadij: sum(elf, (a) => a.osszeg?.munkadij),
    anyagHaszon: sum(elf, (a) => a.osszeg?.anyagHaszon),
    fuggoDb: fuggo.length,
    fuggoErtek: sum(fuggo, (a) => a.osszeg?.vegosszeg),
    osszesDb: evben.length,
    // Elfogadási arány a lezárt (elfogadott vagy elutasított) ajánlatokból.
    elfogadasiArany: (() => {
      const lezart = evben.filter((a) => ['elfogadva', 'elutasitva'].includes(allapotAdat(a.allapot).csoport)).length;
      return lezart ? elf.length / lezart : null;
    })(),
  };
}

export function szur(lista, szuro = 'mind', ev = 'mind') {
  return lista
    .filter((a) => ev === 'mind' || ajanlatEve(a) === ev)
    .filter((a) => szuro === 'mind' || allapotAdat(a.allapot).csoport === szuro)
    .sort((a, b) => String(b.modositva).localeCompare(String(a.modositva)));
}

export const evek = (lista) => [...new Set(lista.map(ajanlatEve).filter(Boolean))].sort().reverse();

export const ujAzonosito = () => `a${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

// Javasolt állapot a munka alapján (új mentéskor): ha már van bolti ár, "Árak megérkeztek".
export const javasoltAllapot = (vanBoltiAr) => (vanBoltiAr ? 'arak-megjottek' : 'felmeres');

// Biztonsági mentés fájlba / visszatöltés.
export function exportAdat(ajanlatok, beallitasok = {}) {
  return JSON.stringify({ tipus: 'arajanlat-mentes', verzio: 1, keszult: new Date().toISOString(), ajanlatok, beallitasok }, null, 1);
}

// A betöltött fájl ajánlatai összefésülve a meglévőkkel (azonos azonosítónál a frissebb marad).
export function importAdat(szoveg, meglevok) {
  let adat;
  try { adat = JSON.parse(szoveg); } catch { throw new Error('Ez nem az alkalmazás mentésfájlja.'); }
  if (adat?.tipus !== 'arajanlat-mentes' || !Array.isArray(adat.ajanlatok)) throw new Error('Ez nem az alkalmazás mentésfájlja.');
  const terkep = new Map(meglevok.map((a) => [a.id, a]));
  let uj = 0;
  let frissitett = 0;
  for (const a of adat.ajanlatok) {
    if (!a?.id) continue;
    const m = terkep.get(a.id);
    if (!m) { terkep.set(a.id, a); uj += 1; } else if (String(a.modositva) > String(m.modositva)) { terkep.set(a.id, a); frissitett += 1; }
  }
  return { ajanlatok: [...terkep.values()], uj, frissitett, beallitasok: adat.beallitasok ?? {} };
}
