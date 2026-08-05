# Mini-brief — #004 Solar Roof

**Status:** spike · **Nieuw risico:** open-geodata-pijplijn (PDOK/3D BAG)

## Probleem

Iedereen vraagt zich af of zonnepanelen zin hebben op hún dak, maar niemand
weet hoe z'n dak georiënteerd is. Ondertussen heeft de overheid elk dak in
Nederland al met lucht-LiDAR gescand en staat die data open.

## Wow-moment / hook

> The government has already scanned your roof with LiDAR.

Je typt je adres, en seconden later zie je jóuw dak als 3D-model met per
dakvlak de oriëntatie, helling en een indicatieve zonne-score. Expliciet:
dit is open lucht-LiDAR (AHN/3D BAG), géén iPhone-LiDAR.

## Eerste videobeeld

Een adres wordt ingetypt; op ~seconde 6 draait het eigen dak in beeld met
gekleurde dakvlakken (zuid = warm, noord = koel).

## Kerninteractie

1. Adres invoeren (NL) → PDOK Locatieserver → BAG-pand.
2. 3D BAG levert het gebouw in LoD 2.2 met semantische dakvlakken.
3. Per dakvlak: azimut, helling, oppervlakte → indicatieve zonne-score
   (heuristiek t.o.v. zuid/35°, eerlijk gelabeld als schatting).
4. 3D-weergave (three.js — al aanwezig door #003) met aanklikbare vlakken.

## Technische aanpak (spike eerst)

Spike bewijst met één adres: Locatieserver → pand-ID → 3D BAG API →
CityJSON-geometrie → dakvlak-normalen → azimut/helling/oppervlak. Pas bij GO:
server-route (`/api/roof/analyze`) die de twee open API's aanroept en een
compact, getypeerd antwoord teruggeeft (geen AI nodig voor v1; de AI-laag kan
later duiding geven). Hergebruik: three-viewer-patroon uit #003, layout, UI-kit.

## Privacy & veiligheid

Adres is persoonsgerelateerd: adres wordt server-side alleen doorgegeven aan
PDOK/3D BAG (publieke data), nooit opgeslagen of gelogd; resultaat is publieke
gebouwdata. Duidelijke bronvermelding. Geen opbrengst-/financieel advies,
geen constructieoordeel (draagkracht dak = professional).

## Wat expliciet niet wordt gebouwd

Geen landelijke batch/kaart; geen opbrengst in euro's of kWh-garanties; geen
schaduwanalyse van omliggende bebouwing (dat is #00x Shadow Study); geen
paneel-layout-optimalisatie; geen lead-formulier.

## Succescriteria

Adres → dakvlakken in < 10 s; azimut/helling aantoonbaar correct voor een
bekend testpand; eerlijke onzekerheid (platte daken, complexe kappen); werkt
op iPhone Safari.

## Kill criteria

- 3D BAG-dekking of datakwaliteit te grillig voor gewone rijtjeshuizen → stop
  of beperk tot een disclaimer-zware "werkt niet overal"-versie.
- Geometrie-parsing (CityJSON) blijkt > 2 dagdelen → herscopen naar alleen
  2D-oriëntatie zonder 3D-weergave, of uitstellen.

## Geschatte bouwtijd

Spike ~1 dagdeel; daarna 3–4 dagdelen voor slice + viewer + polish.
