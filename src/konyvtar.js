// A kiállás-könyvtár bővítése a felületről (az eszközön tárolva) és exportja CSV-be.

// alap: Map(kiállás -> sorok), bovitesek: [{ kiallas, cikk, mennyiseg, egyseg, cikkszam }].
// A már meglévő (azonos kiállás, cikk és egység) bővítés kimarad, így a repóba
// bekerült tételek nem duplázódnak.
export function bovitettKonyvtar(alap, bovitesek) {
  const konyvtar = new Map([...alap].map(([k, sorok]) => [k, [...sorok]]));
  for (const b of bovitesek) {
    const sorok = konyvtar.get(b.kiallas) ?? [];
    if (sorok.some((s) => s.cikk === b.cikk && s.egyseg === b.egyseg)) continue;
    sorok.push({ cikk: b.cikk, mennyiseg: b.mennyiseg, egyseg: b.egyseg, cikkszam: b.cikkszam ?? '' });
    konyvtar.set(b.kiallas, sorok);
  }
  return konyvtar;
}

export function bennVanAzAlapban(alap, b) {
  return (alap.get(b.kiallas) ?? []).some((s) => s.cikk === b.cikk && s.egyseg === b.egyseg);
}

const mezo = (x) => {
  const s = String(x ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// Ugyanaz a formátum, mint a data/kiallas-konyvtar.csv.
export function konyvtarCsv(konyvtar) {
  const sorok = [['Kiállás', 'Cikk', 'Mennyiség', 'Egység', 'Cikkszám']];
  for (const [kiallas, tetelek] of konyvtar) {
    for (const t of tetelek) {
      sorok.push([kiallas, t.cikk, String(t.mennyiseg).replace('.', ','), t.egyseg, t.cikkszam]);
    }
  }
  return `${sorok.map((s) => s.map(mezo).join(',')).join('\n')}\n`;
}

// A felületen szerkesztett kiállás-csomagok (teljes csere): { kiállás neve: [sorok] }.
export function felulirtKonyvtar(konyvtar, felulirasok = {}) {
  const k = new Map([...konyvtar].map(([n, s]) => [n, [...s]]));
  for (const [nev, sorok] of Object.entries(felulirasok)) {
    if (Array.isArray(sorok)) k.set(nev, sorok.map((t) => ({ cikk: t.cikk, mennyiseg: t.mennyiseg, egyseg: t.egyseg, cikkszam: t.cikkszam ?? '' })));
  }
  return k;
}
