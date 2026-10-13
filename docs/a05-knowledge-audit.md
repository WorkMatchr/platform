# A05 — Kenniscentrumacceptatie (issue #33)

Datum: 13 oktober 2026. Basis: `origin/main` `f002905a2fab351c29d45b225d2812d7c7db09c1`. A04 en A03/PR #36 worden niet gekopieerd.

## Nulmeting en correcties

Negen unieke artikelroutes, inclusief de afzonderlijke RI&E-route, en vijf informatieve rubrieken. Rubrieken zijn bewust geen links naar niet-bestaande categoriepagina's; er is geen nieuwe zoek- of filterfunctie toegevoegd.

Bevestigde correcties:

- Overzichts-CTA expliciet **Start uw opdracht**, bestemming `/opdracht-starten` ongewijzigd.
- Categorie- en informatietypekaarten krijgen H3 onder de bestaande H2-secties, met dezelfde kaarten/grid.
- Gerelateerde links krijgen lokaal de bestaande donkerdere kleur: circa 6,60:1 in plaats van 4,48:1. Geen wijziging aan de gedeelde CTA-component.
- Uitsluitend in het incidentonderzoekartikel: registratie bij **meer dan drie werkdagen verzuim** (Arbowet art. 9 lid 2), niet drie kalenderdagen. `Helpverlening` wordt `Hulpverlening`. Alleen dit artikel krijgt reviewdatum 2026-10-13.

## Onderwerpen en primaire controle

| Onderwerp | Bron en bevinding |
|---|---|
| RI&E | [NLA RI&E en plan van aanpak](https://www.nlarbeidsinspectie.nl/onderwerpen/arbeidsomstandighedenwet/risico-inventarisatie-evaluatie-en-plan-van-aanpak): algemene plicht en situatieafhankelijke toetsing; afzonderlijke kennisroute behouden. |
| Preventiemedewerker | [Arboportaal wettelijke positie](https://www.arboportaal.nl/onderwerpen/ondersteuning-bij-arbowet/preventiemedewerker/wat-zegt-de-wet-over-de-preventiemedewerker): interne bijstand, kerntaken, maximaal 25 werknemers onder voorwaarden zelf; geen extra inhoudelijke correctie bevestigd. |
| BHV | [Arboportaal BHV](https://www.arboportaal.nl/onderwerpen/arbozorg/bedrijfshulpverlening/wat-zegt-de-wet-over-bedrijfshulpverlening): organisatie volgt risico's en omstandigheden; geen algemeen vast aantal geïntroduceerd. |
| PMO/PAGO | [Arboportaal PAGO](https://www.arboportaal.nl/onderwerpen/arbowet--en--regelgeving/arbobeleid/pago): risicogericht aanbod blijft onderscheiden van bredere PMO-doelen; geen nieuwe medische claim. |
| Bedrijfsarts | [Arboportaal bedrijfsarts](https://www.arboportaal.nl/onderwerpen/ondersteuning-bij-arbowet/bedrijfsarts): preventieve toegang en medische onafhankelijkheid behouden; artikel niet herschreven. |
| PSA | [Arboportaal PSA](https://www.arboportaal.nl/onderwerpen/psychosociale-arbeidsbelasting): werkdruk/ongewenst gedrag, RI&E en preventie blijven onderscheiden van diagnose. |
| Arbeidsongeval | [NLA arbeidsongevallen](https://www.nlarbeidsinspectie.nl/onderwerpen/arbeidsomstandighedenwet/arbeidsongevallen): directe melding bij overlijden, opname, blijvend letsel; melden versus registreren behouden. |
| Arbeidshygiënist | [Arboportaal kerndeskundigen](https://www.arboportaal.nl/onderwerpen/ondersteuning-bij-arbowet/arbodeskundigen-kerndeskundigen): blootstellingsbeoordeling en bronaanpak, zonder diagnoseclaim. |
| Incidentonderzoek | [Arbowet art. 9](https://wetten.overheid.nl/arbowet) en [NLA ongevalsonderzoek](https://www.nlarbeidsinspectie.nl/onderwerpen/arbeidsomstandighedenwet/ongevalsonderzoek): werkdagen gecorrigeerd; leeronderzoek en formele verplichtingen blijven afzonderlijk. |

Alle 16 unieke bestaande bron-URL's van de artikel-/basiscollectie gaven HTTP 200 (redirects gevolgd). Bereikbaarheid is geen juridische certificering. Bestaande FAQ-data, selectieve zichtbaarheid, bronstructuur en overige reviewdatums zijn behouden.

## Validatie

- Nulmeting: 43 PASS, één bestaande failure voor `knowledge:occupational-physician` (728 woorden tegenover 575). Deze inhoud/limiet is niet aangepast.
- Definitief **49/49 PASS**: `kenniscentrum/acceptance.test.tsx`, `kenniscentrum/knowledge-overview-interface.test.ts`, `knowledge-carousel.test.tsx`, `public-detail-content.test.tsx`.
- Volledige lint en productiebuild PASS. Diff-check en secretpatrooncontrole PASS.
- Standalone TypeScript: vier bestaande TS2345 readonly-arrayfouten in ongewijzigd `src/lib/compliance/rule-engine.test.ts` (13,14,23,24); geen taakfouten.
- HTTP 200 voor overzicht en alle negen artikelen. Tests bewaken unieke routes, bronresolutie, FAQ-ID's, metadata/canonicals/sitemap en één CTA per artikel.
- Desktop en 390px mobiel: alle negen artikelen, geen horizontale overflow, één CTA; overzicht visueel gecontroleerd; CTA-focus zichtbaar en geen consolefouten tijdens laatste controle. Headingniveaus getest.
- Geen volledige schermlezeraudit. Echte 200%-zoom en inhoudelijke eindacceptatie door Product Owner staan open.

Acceptatie: `http://127.0.0.1:3044/kenniscentrum`.

## Bestanden / afbakening

Dit rapport; `src/app/kenniscentrum/page.tsx`; `src/app/kenniscentrum/acceptance.test.tsx`; `src/components/public/knowledge-article-page.tsx`; `src/components/public/public-detail-content.test.tsx`; `src/content/knowledge/articles.ts`.
Geen database-, financiële-, intake- of authenticatiewijzigingen. Geen merge of deployment. A07 blijft uitgesteld tot integratie/acceptatie van A03–A06.
