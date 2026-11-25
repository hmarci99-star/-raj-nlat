# Árajánlatkészítő

Víz-, gáz- és fűtésszerelési árajánlatok összeállítása: munkadíj, boltnak küldhető anyaglista, ügyfélajánlat és belső összesítő.

## Jelenlegi állapot

Telefonról is használható weboldal. A beírt adatokat és árakat a böngésző megjegyzi.

1. **Munkadíj** a projekt adataiból.
2. **Anyaglista** a boltnak: vágólapra másolható, vagy előre kitöltött e-mailként küldhető.
3. **Árak a boltból:** a bolt két PDF-jét feltöltöd a „Bolti árak PDF” és a „Kedvezményes árak PDF” gombbal, mindegyik csak a saját oszlopát tölti ki. Ha mindkét ár egy levélben jön, a szövegét bemásolhatod, és a program tételenként kiolvassa a bolti és a kedvezményes egységárat. Amit nem tud tételhez kötni, kilistázza, és a hiányzó árat kézzel beírhatod.
4. **Ügyfélajánlat:** munkadíj tételesen, anyag bolti áron, végösszeg. **Belső összesítő:** beszerzési ár és haszon tételenként, illetve összesen.
5. **PDF:** mindkét kimenet külön sablonnal, A4-es lapra. A gomb a böngésző nyomtatási ablakát nyitja meg, ott a „Mentés PDF-ként” lehetőséget kell választani. A fájlnév javaslata például `Arajanlat_Kovács_Anna_2026-11-25`. A fejlécbe a vállalkozó adatai, a megrendelő, az ajánlat száma, a kelte és az érvényessége kerül. A saját adataidat a böngésző megjegyzi.

- `data/munkadij.csv`: a munkadíj-táblázat. Árat itt kell módosítani. A `Kód` oszlopot ne írd át.
- `data/kiallas-konyvtar.csv`: a kiállás-csomagok (kiállás, cikk, mennyiség, egység, cikkszám). A cikkszám oszlop még üres; ha kitöltöd, megjelenik a listában és az e-mailben.
- `src/munkadij.js`: a munkadíj szabályai.
- `src/anyaglista.js`: az anyaglista összegyűjtése, a gerinc és a hüvelyszabály.
- `src/arak.js`: a bolt válaszának beolvasása és az ajánlat összesítése.
- `src/sablonok.js`: az ügyfélajánlat és a belső összesítő nyomtatható sablonja.
- `src/pdfszoveg.js`: a bolt PDF-jének szövegét soronként kinyeri, és a cellán belül tördelt megnevezéseket visszailleszti a sorukba.
- `vendor/pdfjs-4.10.38/`: a Mozilla pdf.js PDF-olvasója (Apache 2.0 licenc). Csak PDF feltöltésekor töltődik be. A PDF a telefonon dolgozódik fel, nem kerül fel sehova.
- `index.html`, `src/app.js`: a weboldal.

### Szabályok

- A vízszerelés alapszerelés mennyisége az összes vízszerelési kiállás darabszáma.
- A hőtermelő gépészete 1 db (gázkazán, vegyes tüzelésű kazán vagy hőszivattyú).
- Ha radiátoros és padlófűtéses kör is van, 1 db felár jár. Kazánnál ez automatikus, hőszivattyúnál külön be kell kapcsolni (nyitott kérdés).
- Puffertartály csak vegyes tüzelésű kazánhoz vehető fel. Hőszivattyúnál a gépészet díja tartalmazza.
- Anyaglista: a csomag sorai szorozva a kiállások számával, azonos cikkek összevonva. Ehhez jön a gerinc csöve és csőhéja (16-oshoz 4x18, 20-ashoz 4x22 mm-es).
- Hüvelyszabály: T-idom 3, falikorong 1, könyök 2, toldóidom 2 hüvely, átmérő szerint. A program figyelmeztet, ha egy csomag ettől eltér. A könyvtár jelenleg minden csomagja megfelel neki.
- Projektenként felülírható csomag: a számítás már kezeli, a felülethez még nincs szerkesztő.
- Árak: a bolt bruttó (ÁFÁ-s) árakat küld. Alanyi adómentesként az ÁFA nem igényelhető vissza, ezért ez a valódi beszerzési költség. Az ügyfélnek a bruttó bolti ár megy tovább, a haszon a két bruttó ár különbsége.
- Árbeolvasás: a sorokat cikkszám, vagy ennek hiányában a megnevezés szavai alapján köti tételhez. Az ár a sor végi számokból jön: a mennyiséget és a soronkénti összeget kihagyja, a két ár közül a nagyobb a bolti. A beolvasott árakat a bolt valódi válaszain még ellenőrizni kell.

## Futtatás

```
npm start      # http://localhost:3000
npm test
```

### Telefonról

Az alkalmazás GitHub Pages-en fut: https://hmarci99-star.github.io/-raj-nlat/

Ha a böngésző menüjében a „Hozzáadás a kezdőképernyőhöz” lehetőséget választod, saját ikonnal indítható. A beírt adatok és árak csak az adott eszköz böngészőjében tárolódnak, a webre nem kerülnek fel.

A weboldal statikus fájlokból áll. Közvetlenül fájlként (`file://`) megnyitva nem működik, mert a CSV-t be kell töltenie.

## Következő lépések

1. Az árbeolvasás finomítása valódi bolti válaszok alapján. A szkennelt (képként mentett) PDF-ből nem lehet szöveget kiolvasni.
2. Csomag-felülírás szerkesztése a felületen; a gerinc idomai és a 25-ös cső.
3. Több ajánlat mentése és kezelése, ajánlat-követés: állapot, következő lépés, határidő.
