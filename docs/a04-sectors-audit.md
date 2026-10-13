# A04 — Sectorenacceptatie (issue #32)

Datum: 13 oktober 2026. Basis: `origin/main` `f002905a2fab351c29d45b225d2812d7c7db09c1` (A02 gemerged). A03/PR #36 wordt niet dubbel overgenomen.

## Nulmeting en bevestigde correcties

Er bestaan zes unieke sectorroutes. Het overzicht sprak nog over onderwerpen die zouden volgen, terwijl alle pagina's al beschikbaar zijn. Dit is gecorrigeerd. De overzichts-CTA heet nu expliciet **Start uw opdracht**, met ongewijzigde bestemming `/opdracht-starten`. De gedeelde CTA-component is niet gewijzigd.

Gerelateerde links hadden `#1479a6` op `#eef7fb` (circa 4,48:1). De bestaande donkerdere huiskleur `brand-primary-hover` geeft circa 6,60:1. De correctie is beperkt tot het sectoroverzicht en de sectorcomponent; geen globale stijlwijziging.

## Inhoud en bronnen

| Route | Controle en conclusie | Aanvullende bestaande bron |
|---|---|---|
| `/sectoren/bouw` | Wisselende bouwplaatsen, machines, stoffen en fysieke belasting zijn contextafhankelijke aandachtspunten; geen uniforme plicht voor één deskundige. | Arboportaal arbeidsmiddelen en gevaarlijke stoffen |
| `/sectoren/industrie` | Machines, processen, blootstelling en onderhoud in samenhang; geen nieuw wettelijk voorschrift toegevoegd. | Arboportaal arbeidsmiddelen en gevaarlijke stoffen |
| `/sectoren/zorg` | Fysieke belasting, agressie en werkdruk zijn risico's, geen automatische uitkomst voor elke instelling. | Arboportaal PSA |
| `/sectoren/onderwijs` | Werkdruk en sociale veiligheid als aandachtspunten; situatie blijft leidend. | Arboportaal PSA |
| `/sectoren/logistiek-en-transport` | Verkeer, laden/lossen en middelen blijven werkzaamhedenafhankelijk. | Arboportaal arbeidsmiddelen |
| `/sectoren/zakelijke-dienstverlening` | Beeldschermwerk, hybride werk en werkdruk; geen generieke vrijstelling van arbobeleid. | Arboportaal computerwerk en PSA |

De bestaande basisteksten en FAQ-data zijn behouden. `lastReviewed` is 2026-10-13. Bronnen zijn bestaande canonieke bronrecords; de gedeelde bronregistratie is niet gewijzigd.

Geraadpleegd: [Arbowet](https://wetten.overheid.nl/arbowet), [NLA sector- en beroepeninformatie](https://www.nlarbeidsinspectie.nl/documenten/2026/07/03/sector-en-beroepeninformatie-inspectiebrede-risicoanalyse), [arbeidsmiddelen](https://www.arboportaal.nl/onderwerpen/veiligheid-op-het-werk/arbeidsmiddelen), [PSA](https://www.arboportaal.nl/onderwerpen/psychosociale-arbeidsbelasting), [computerwerk](https://www.arboportaal.nl/onderwerpen/fysieke-belasting/computerwerk). De NLA-sectorinformatie is indicatief; zij bewijst geen specifieke bedrijfsrisico's.

## Validatie

- Nulmeting: 46 tests PASS, één bestaande content-wordcountfailure (`knowledge:occupational-physician`, 728 > 575).
- Definitief: **48/48 PASS** in `sectoren/acceptance.test.tsx`, `public-detail-content.test.tsx`, `public-content-pathways.test.tsx`.
- Volledige `npm run lint`: PASS. `npm run build`: PASS.
- `npx tsc --noEmit --incremental false`: vier bestaande TS2345 readonly-arrayfouten in `src/lib/compliance/rule-engine.test.ts` (13,14,23,24), geen taakfouten. Dit bestand en zijn contract zijn ongewijzigd tegenover main.
- `git diff --check` en gerichte secretpatrooncontrole: PASS.
- HTTP: overzicht plus zes detailroutes 200. Tests bewaken unieke routes, statische params, bron-ID's, H1, CTA, canonical en sitemap.
- Browser: alle zes detailpagina's op desktop en 390px mobiel; één CTA, bronnen en breadcrumbs aanwezig, geen horizontale overflow. Overzicht visueel gecontroleerd. Toetsenbordfocus op CTA zichtbaar. Geen consolefouten in het gecontroleerde venster.
- Geen formele schermlezeraudit uitgevoerd. Echte 200%-zoom blijft Product Owner-acceptatie.

Lokale acceptatie: `http://127.0.0.1:3043/sectoren`.

## Scope / release

Bestanden: dit rapport; `src/app/sectoren/page.tsx`; `src/app/sectoren/acceptance.test.tsx`; `src/components/public/sector-detail-page.tsx`; `src/content/sectors.ts`.
Geen database, authenticatie, pricing, matching of mail gewijzigd. Geen merge/deployment. A07 blijft checklist tot A03–A06 zijn geaccepteerd en geïntegreerd.
