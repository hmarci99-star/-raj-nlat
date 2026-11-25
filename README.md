# Árajánlatkészítő

Víz-, gáz- és fűtésszerelési árajánlatok összeállítása: munkadíj, boltnak küldhető anyaglista, ügyfélajánlat és belső összesítő.

## Jelenlegi állapot

Kész a **munkadíj-számítás**: a projekt adatai alapján, telefonról is használható weboldalon. A beírt adatokat a böngésző megjegyzi.

- `data/munkadij.csv`: a munkadíj-táblázat. Árat itt kell módosítani. A `Kód` oszlopot ne írd át.
- `src/munkadij.js`: a számítási szabályok.
- `index.html`, `src/app.js`: a weboldal.

### Szabályok

- A vízszerelés alapszerelés mennyisége az összes vízszerelési kiállás darabszáma.
- A hőtermelő gépészete 1 db (gázkazán, vegyes tüzelésű kazán vagy hőszivattyú).
- Ha radiátoros és padlófűtéses kör is van, 1 db felár jár. Kazánnál ez automatikus, hőszivattyúnál külön be kell kapcsolni (nyitott kérdés).
- Puffertartály csak vegyes tüzelésű kazánhoz vehető fel. Hőszivattyúnál a gépészet díja tartalmazza.

## Futtatás

```
npm start      # http://localhost:3000
npm test
```

A weboldal statikus fájlokból áll, így GitHub Pages-en is közzétehető. Közvetlenül fájlként (`file://`) megnyitva nem működik, mert a CSV-t be kell töltenie.

## Következő lépések

1. Kiállás-könyvtár, és belőle az anyaglista (cikkszám, megnevezés, mennyiség), a hüvelyszabállyal és a gerinccel.
2. Árak beolvasása a bolt válaszából, először kézi beírással.
3. Ügyfélajánlat és belső összesítő PDF-ben.
4. Ajánlat-követés: állapot, következő lépés, határidő.
