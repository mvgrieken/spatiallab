# SpatialLab roadmap

Vastgesteld 2026-08-04 (autonome selectie conform programma-opdracht).
Wordt bijgesteld op basis van technische bevindingen — niet op basis van smaak.

## Scores

Criteria (1–10; bij privacy en foutkans betekent 10 = laag risico):
30s-begrijpelijk · wow · Safari-betrouwbaar · haalbaar · bouwtijd · hergebruik ·
techn. waarde · privacy · foutrobuust · zakelijk · video · positionering.

| Kandidaat | 30s | wow | saf | haal | tijd | herg | tech | priv | fout | zak | vid | pos | Σ |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B Find the Best Spot | 9 | 7 | 9 | 9 | 9 | 10 | 4 | 8 | 7 | 6 | 7 | 9 | **94** |
| C Does It Fit? | 9 | 9 | 8 | 7 | 6 | 4 | 8 | 10 | 8 | 7 | 9 | 8 | **93** |
| D Solar Roof | 8 | 9 | 8 | 5 | 3 | 3 | 9 | 7 | 5 | 9 | 9 | 9 | **84** |
| F Room Light Map | 7 | 6 | 9 | 8 | 8 | 9 | 3 | 8 | 5 | 5 | 6 | 8 | 82 |
| E Room Acoustics | 8 | 8 | 5 | 6 | 6 | 3 | 7 | 8 | 4 | 5 | 6 | 8 | **74** |
| J Shadow Study | 8 | 8 | 8 | 4 | 3 | 3 | 8 | 7 | 5 | 7 | 8 | 8 | 77 |
| K Damage Report | 7 | 5 | 8 | 8 | 6 | 8 | 4 | 4 | 5 | 9 | 5 | 6 | 75 |
| H Meter Cabinet | 8 | 5 | 9 | 8 | 8 | 7 | 3 | 6 | 4 | 7 | 5 | 6 | 76 |
| G Accessibility | 7 | 6 | 8 | 7 | 6 | 8 | 4 | 5 | 3 | 8 | 6 | 7 | 75 |
| I Room Story | 8 | 4 | 9 | 9 | 8 | 8 | 2 | 7 | 6 | 3 | 5 | 5 | 74 |
| L Paint From Photo | 8 | 7 | 6 | 4 | 3 | 6 | 7 | 7 | 2 | 8 | 7 | 6 | 71 |

## Gekozen reeks

1. **#002 — Find the Best Spot** (directe uitvoering). Maximaal hergebruik van
   de bewezen #001-keten, maar met een écht ander resultaatmodel dan "een extra
   knop op #001": een doelkeuze vóóraf, *gerankte* plekken (beste + alternatief)
   mét eerlijke trade-offs en een afrader, elk visueel gemarkeerd — en "try
   another goal" op dezelfde scan zonder opnieuw te filmen. Lichtinval (idee F)
   wordt hier een redeneerfactor in plaats van een eigen experiment.
2. **#003 — Does It Fit?** (logisch vervolg, nieuwe browsermogelijkheid).
   Parametrische USDZ + AR Quick Look; geen camera-upload, dus privacy-luw en
   deterministisch maatvast. Spike eerst: three.js USDZExporter met één object.
3. **#004 — Solar Roof** (technisch ambitieus, open data). PDOK/3D BAG/AHN;
   spike met één adres/gemeente vóór enige UX. Grootste zakelijke dubbele bodem.
4. **Reserve: #005 — Room Acoustics.** Sterk wow, maar iOS-microfoonprocessing
   (AGC/echo cancellation) maakt betrouwbaarheid onzeker; alleen bouwen na een
   geslaagde Web Audio-spike op een echte iPhone.

## Overige ideeën

- **Later:** J Shadow Study (pas als de geo-basis van #004 bewezen herbruikbaar
  is) · H Meter Cabinet (alleen educatief) · F Light Map (opgegaan in #002).
- **Private pilot:** G Accessibility (aansprakelijkheid, kwetsbare gebruikers) ·
  K Damage Report (B2B-knipoog, privacygevoelige beelden) · L Paint From One
  Photo (schijnprecisie; eerst meetvalidatie met grondmetingen).
- **Geschrapt:** I Room Story — geen eigen technische waarde, hoog
  "oppervlakkig gevoel"-risico; het deelbare-verhaal-element komt terug in de
  publicatiekant van elk experiment in plaats van als eigen demo.

## Volgordelogica

Conform het programma: eerst maximaal hergebruik (#002), dan een nieuwe
browsermogelijkheid (#003), dan open ruimtelijke data (#004), reserve met
nieuwe sensor (#005). Elke stap valideert precies één nieuw technisch risico.
