# Mini-brief — #002 Find the Best Spot

**Status:** in uitvoering · **Basis:** herbruikt de volledige #001-keten

## Probleem

Na "wat zie je?" (#001) is de natuurlijke vervolgvraag "waar moet het staan?".
Mensen schuiven met bureaus, tv's en planten zonder te kunnen verwoorden
waarom een plek goed of slecht is. #002 laat AI één concreet doel ruimtelijk
afwegen — zichtbaar, vergelijkend en met eerlijke nadelen.

## Wow-moment

Je kiest "Desk", en binnen seconden staat er een genummerde marker op een
frame van jóuw kamer: "Best spot — left of the window", met een tweede marker
voor het alternatief, een reden, een trade-off én een plek die je juist moet
vermijden. Daarna tik je "Try another goal" en krijgt dezelfde scan een
compleet nieuwe afweging — zonder opnieuw te filmen.

## Eerste videobeeld

Een hand tikt "Desk" aan boven een live camerabeeld van een gewone kamer.
Op seconde ~7: het geannoteerde frame met "1 · Best spot" en de reden.

## Kerninteractie

1. Scan (10 s sweep, of 3–6 foto's) — identiek aan #001.
2. Kies een doel: Desk · TV · Reading chair · Plant · Play area · Storage.
3. Resultaat: gerankte plekken (best + max. 2 alternatieven) met marker,
   reden, zichtbaar bewijs, trade-off en confidence; plus één "avoid"-plek.
4. Max. 3 doelen per scan; "Scan another room" reset.

## Technische aanpak

Volledig op de bewezen onderdelen: CameraScan/PhotoUpload → frames →
`runVisionTask` met nieuw Zod-schema (`SpotAnalysis`: goal, summary,
spots[1..3] gerankt met marker/trade-off, avoid?, limitations) → AnnotatedFrame
per spot. Nieuw zijn alleen: prompt (`prompts/find-the-best-spot.ts`),
schema + repair, route `/api/spots/analyze`, en de experiment-UI
(goal-picker + ranked result). Geen nieuwe abstracties; de sessielimiet-
helper verhuist naar `lib` (tweede gebruiker — toegestane promotie).
Lichtinval/looproutes zijn redeneerfactoren in de prompt (idee F geabsorbeerd).

## Privacy & veiligheid

Identiek aan #001: alleen geselecteerde, verkleinde frames; geen opslag; geen
logging van beelddata; zelfde providerverwerking; geen nieuwe datastromen.
Risicodoelen (bijv. "waar hang ik een tv op aan de muur?") krijgen dezelfde
vaste professional-doorverwijzing; het experiment adviseert visueel over
*plek*, nooit over montage, constructie of elektra.

## Wat expliciet niet wordt gebouwd

Geen maten of afstanden; geen meubelcatalogus of productlinks; geen
plattegrond/3D; geen foto-inpainting ("zo zou het eruitzien"); geen
vergelijking tussen kamers; geen bewaarde voorkeuren; geen nieuwe
camera-features.

## Succescriteria

- Doel → geannoteerd, gerankt resultaat in < 30 s vanaf pagina-open.
- Spots verwijzen aantoonbaar naar zichtbaar bewijs; markers altijd binnen
  beeld en op het juiste frame; rangorde consistent met de redenen.
- "Try another goal" werkt zonder nieuwe scan; 4e doel netjes geblokkeerd.
- Zelfde kwaliteitsgate als #001 groen (lint/typecheck/tests/build/preview).

## Zakelijke signalen

Interieur-/kantoorinrichters, makelaars-styling, retail ("waar past dit
product bij jou thuis?" — brug naar #003 Does It Fit). Let op reacties die
naar maatvoering vragen: dat valideert #003.

## Geschatte bouwtijd

~1 dagdeel: spike (promptkwaliteit ranked output) ~1 uur; slice + UI ~3 uur;
tests/polish/preview ~2 uur.

## Kill criteria

- De spike levert generiek interieuradvies i.p.v. kamer-specifieke,
  vergelijkende plekken → herontwerpen of stoppen.
- Rangorde of markers zijn in >1 op 3 runs onnavolgbaar → stoppen.
- Het resultaat voelt als "#001 met een knop" → terug naar de tekentafel
  (dan wordt #003 naar voren gehaald).
