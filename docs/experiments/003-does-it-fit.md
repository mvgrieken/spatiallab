# Mini-brief — #003 Does It Fit?

**Status:** in uitvoering · **Nieuw risico:** USDZ + AR Quick Look

## Probleem

"Past die kast wel?" wordt nu beantwoord met een rolmaat en voorstellingsvermogen.
#003 zet een maatvast, eenvoudig 3D-object in je échte kamer via AR Quick Look —
in Safari, zonder app.

## Wow-moment

Je typt 90 × 200 × 45 cm, tikt "View at real size", en er staat een kast van
exact die maten in je kamer. Je loopt eromheen. Kernbelofte:
**See it at real size. No app required.**

## Eerste videobeeld

Vingers stellen maten in; op ~seconde 6 staat het object levensgroot in de
kamer en loopt de camera eromheen.

## Kerninteractie

1. Kies objecttype: kast · bureau · tafel · bank · koelkast.
2. Stel breedte/hoogte/diepte in (cm, met per type een realistisch bereik
   en gangbare standaardmaten).
3. 3D-voorbeeld op de pagina (three.js) → knop "View at real size (AR)".
4. iPhone/iPad: AR Quick Look opent het USDZ-model op ware grootte.
   Overige browsers: interactief 3D-voorbeeld + uitleg dat AR Apple-only is.

## Technische aanpak

Volledig client-side, geen AI, geen backend, geen upload: parametrische
geometrie (boxen per type: romp, blad, poten, rugleuning) in `three`, export
via three's `USDZExporter` (1 unit = 1 m), blob-URL aan een `<a rel="ar">`.
Spike bewijst eerst: (a) geldige USDZ uit de exporter, (b) blob-link-patroon.
Hergebruik: ExperimentLayout, registry, UI-kit, analytics. Geen nieuwe
abstracties; `three` is een experiment-dependency.

## Privacy & veiligheid

Er verlaat níéts het toestel: geen camera-upload (AR draait in Apple's eigen
Quick Look-viewer), geen API-calls, geen opslag. De privacypagina hoeft alleen
te melden dat dit experiment volledig lokaal werkt.

## Wat expliciet niet wordt gebouwd

Geen productcatalogus of links; geen texturen/materialenrealisme; geen
Android-AR (WebXR); geen meten van de kamer; geen opslag van configuraties;
geen `<model-viewer>`-dependency (three-preview volstaat).

## Succescriteria

- USDZ valideert structureel en opent in AR Quick Look op een echte iPhone
  met maatvaste afmetingen (fysieke checkstap).
- Maat instellen → nieuw model < 1 s.
- Niet-iOS krijgt een bruikbaar 3D-voorbeeld, geen doodlopend pad.
- Kwaliteitsgate groen; bundlegrootte bewaakt (three via dynamic import).

## Zakelijke signalen

Retail/e-commerce ("zo groot is dit product bij jou thuis"), keukens/kasten
op maat, verhuizers. Reacties die om echte producten vragen valideren een
latere B2B-knipoog.

## Geschatte bouwtijd

2–3 dagdelen: spike ~1 uur; parametrische objecten + UI ~een dagdeel;
polish/tests/preview ~een dagdeel.

## Kill criteria

- Blob-URL's blijken niet betrouwbaar te werken met `rel="ar"` op iOS →
  fallback: USDZ via een kleine GET-route serveren; als ook dat faalt: stop.
- USDZExporter-output blijkt door Quick Look geweigerd → stop of uitstel.
- Maatvastheid klopt niet aantoonbaar (schaalfout) → stop tot bewezen.
