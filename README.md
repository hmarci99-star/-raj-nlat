# Árajánlatkészítő

Víz-, gáz- és fűtésszerelési árajánlatok összeállítása: munkadíj, boltnak küldhető anyaglista, ügyfélajánlat és belső összesítő.

## Jelenlegi állapot

Telefonról is használható weboldal. A beírt adatokat és árakat a böngésző megjegyzi.

1. **Munkadíj** a projekt adataiból.
2. **Anyaglista** a boltnak: vágólapra másolható, vagy előre kitöltött e-mailként küldhető.
3. **Árak a boltból:** a bolt válaszát (e-mail szöveg vagy PDF-ből kimásolt táblázat) bemásolod, és a program tételenként kiolvassa a bolti és a kedvezményes egységárat. Amit nem tud tételhez kötni, kilistázza, és a hiányzó árat kézzel beírhatod.
4. **Ügyfélajánlat:** munkadíj tételesen, anyag bolti áron, végösszeg. **Belső összesítő:** beszerzési ár és haszon tételenként, illetve összesen.

- `data/munkadij.csv`: a munkadíj-táblázat. Árat itt kell módosítani. A `Kód` oszlopot ne írd át.
- `data/kiallas-konyvtar.csv`: a kiállás-csomagok (kiállás, cikk, mennyiség, egység, cikkszám). A cikkszám oszlop még üres; ha kitöltöd, megjelenik a listában és az e-mailben.
- `src/munkadij.js`: a munkadíj szabályai.
- `src/anyaglista.js`: az anyaglista összegyűjtése, a gerinc és a hüvelyszabály.
- `src/arak.js`: a bolt válaszának beolvasása és az ajánlat összesítése.
- `index.html`, `src/app.js`: a weboldal.

### Szabályok

- A vízszerelés alapszerelés mennyisége az összes vízszerelési kiállás darabszáma.
- A hőtermelő gépészete 1 db (gázkazán, vegyes tüzelésű kazán vagy hőszivattyú).
- Ha radiátoros és padlófűtéses kör is van, 1 db felár jár. Kazánnál ez automatikus, hőszivattyúnál külön be kell kapcsolni (nyitott kérdés).
- Puffertartály csak vegyes tüzelésű kazánhoz vehető fel. Hőszivattyúnál a gépészet díja tartalmazza.
- Anyaglista: a csomag sorai szorozva a kiállások számával, azonos cikkek összevonva. Ehhez jön a gerinc csöve és csőhéja (16-oshoz 4x18, 20-ashoz 4x22 mm-es).
- Hüvelyszabály: T-idom 3, falikorong 1, könyök 2, toldóidom 2 hüvely, átmérő szerint. A program figyelmeztet, ha egy csomag ettől eltér. A könyvtár jelenleg minden csomagja megfelel neki.
- Projektenként felülírható csomag: a számítás már kezeli, a felülethez még nincs szerkesztő.
- Árbeolvasás: a sorokat cikkszám, vagy ennek hiányában a megnevezés szavai alapján köti tételhez. Az ár a sor végi számokból jön: a mennyiséget és a soronkénti összeget kihagyja, a két ár közül a nagyobb a bolti. A beolvasott árakat a bolt valódi válaszain még ellenőrizni kell.

## Futtatás

```
npm start      # http://localhost:3000
npm test
```

A weboldal statikus fájlokból áll, így GitHub Pages-en is közzétehető. Közvetlenül fájlként (`file://`) megnyitva nem működik, mert a CSV-t be kell töltenie.

## Következő lépések

1. Az árbeolvasás finomítása valódi bolti válaszok alapján, PDF közvetlen beolvasása.
2. Ügyfélajánlat és belső összesítő PDF-ben.
3. Csomag-felülírás szerkesztése a felületen; a gerinc idomai és a 25-ös cső.
4. Ajánlat-követés: állapot, következő lépés, határidő.
