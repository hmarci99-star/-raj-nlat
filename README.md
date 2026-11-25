# Árajánlatkészítő

Víz-, gáz- és fűtésszerelési árajánlatok összeállítása: munkadíj, boltnak küldhető anyaglista, ügyfélajánlat és belső összesítő.

## Jelenlegi állapot

Kész a **munkadíj-számítás** és az **anyaglista**, telefonról is használható weboldalon. A beírt adatokat a böngésző megjegyzi. Az anyaglista vágólapra másolható, vagy előre kitöltött e-mailként küldhető a boltnak.

- `data/munkadij.csv`: a munkadíj-táblázat. Árat itt kell módosítani. A `Kód` oszlopot ne írd át.
- `data/kiallas-konyvtar.csv`: a kiállás-csomagok (kiállás, cikk, mennyiség, egység, cikkszám). A cikkszám oszlop még üres; ha kitöltöd, megjelenik a listában és az e-mailben.
- `src/munkadij.js`: a munkadíj szabályai.
- `src/anyaglista.js`: az anyaglista összegyűjtése, a gerinc és a hüvelyszabály.
- `index.html`, `src/app.js`: a weboldal.

### Szabályok

- A vízszerelés alapszerelés mennyisége az összes vízszerelési kiállás darabszáma.
- A hőtermelő gépészete 1 db (gázkazán, vegyes tüzelésű kazán vagy hőszivattyú).
- Ha radiátoros és padlófűtéses kör is van, 1 db felár jár. Kazánnál ez automatikus, hőszivattyúnál külön be kell kapcsolni (nyitott kérdés).
- Puffertartály csak vegyes tüzelésű kazánhoz vehető fel. Hőszivattyúnál a gépészet díja tartalmazza.
- Anyaglista: a csomag sorai szorozva a kiállások számával, azonos cikkek összevonva. Ehhez jön a gerinc csöve és csőhéja (16-oshoz 4x18, 20-ashoz 4x22 mm-es).
- Hüvelyszabály: T-idom 3, falikorong 1, könyök 2, toldóidom 2 hüvely, átmérő szerint. A program figyelmeztet, ha egy csomag ettől eltér. A könyvtár jelenleg minden csomagja megfelel neki.
- Projektenként felülírható csomag: a számítás már kezeli, a felülethez még nincs szerkesztő.

## Futtatás

```
npm start      # http://localhost:3000
npm test
```

A weboldal statikus fájlokból áll, így GitHub Pages-en is közzétehető. Közvetlenül fájlként (`file://`) megnyitva nem működik, mert a CSV-t be kell töltenie.

## Következő lépések

1. Csomag-felülírás szerkesztése a felületen; a gerinc idomai és a 25-ös cső.
2. Árak beolvasása a bolt válaszából, először kézi beírással.
3. Ügyfélajánlat és belső összesítő PDF-ben.
4. Ajánlat-követés: állapot, következő lépés, határidő.
