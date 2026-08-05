# Mini-brief — #005 Room Acoustics

**Status:** in uitvoering · **Nieuw risico:** Web Audio-betrouwbaarheid op iOS

## Probleem

Iedereen heeft weleens een videocall in een ruimte waar je klinkt als in een
badkamer — maar niemand kan horen *waaróm*. Galm is onzichtbaar tot je hem
meet. Dit is ook het eerste experiment dat niet met een camera werkt: het
laat zien dat "AI en de fysieke wereld" ook over geluid gaat.

## Wow-moment

Je klapt één keer in je handen. Binnen een seconde zie je de nagalmcurve van
jóuw kamer uitdoven, met één getal: "je kamer galmt ~0,6 seconde na" en wat
dat betekent voor gesprekken.

## Eerste videobeeld

Een hand die klapt boven een telefoon; op ~seconde 5 tekent de decay-curve
zich uit en verschijnt het getal.

## Kerninteractie

1. Uitleg + microfoontoestemming (eigen scherm vóór de native prompt).
2. "Clap once" → 3 seconden opnemen met audio-processing uitgeschakeld
   (echo-cancellation/AGC/ruisonderdrukking uit — die vervormen de decay).
3. Analyse in de browser: klap-onset zoeken, Schroeder-integratie,
   T20-fit → RT60 (broadband + spraakband 500–2000 Hz).
4. Resultaat: getal, karakterlabel, decay-curve, wat het betekent, eerlijke
   beperkingen, opnieuw proberen.

## Technische aanpak

Volledig client-side, **geen upload, geen AI**: `getUserMedia` audio →
`AudioContext` → `OfflineAudioContext` voor bandfiltering → pure
analysefuncties (`lib/acoustics/rt60.ts`) die los unit-getest worden tegen
gesynthetiseerde decays met bekende T60. Visualisatie als SVG (geen extra
dependency). Hergebruik: ExperimentLayout, UI-kit, ErrorPanel, registry.

## Privacy & veiligheid

Audio verlaat het toestel niet en wordt niet opgeslagen: de opname bestaat
alleen in het geheugen tijdens de analyse. Microfoon stopt direct na de
opname. Geen AI-provider betrokken.

## Wat expliciet niet wordt gebouwd

Geen professionele akoestiekmeting of normclaim (ISO 3382); geen
octaafbandenrapport; geen advies over materialen/aankopen; geen opname die
je kunt terugluisteren of delen; geen ruimtemodel.

## Succescriteria

- Gesynthetiseerde klap met bekende T60 (0,3 / 0,6 / 1,2 s) wordt binnen
  ±20% teruggevonden door de analysefuncties (unit-getest).
- Klap → resultaat < 2 s na de opname.
- Onbruikbare opname (te zacht, geen klap, te veel achtergrondruis) geeft
  een eerlijke melding met retry, nooit een verzonnen getal.
- Microfoonweigering leidt naar een nette uitleg, geen doodlopend pad.

## Kill criteria

- iOS levert ondanks uitgeschakelde processing structureel onbruikbare
  decays → stoppen en publiceren als "failed experiment" met uitleg.
- RT60-schatting varieert > 40% tussen herhaalde klappen in dezelfde ruimte
  → herontwerpen (bijv. alleen een relatieve "galmrijk/gedempt"-indicatie)
  of stoppen.

## Geschatte bouwtijd

2 dagdelen: analysefuncties + tests ~1 dagdeel; opname-UI en polish ~1 dagdeel.
