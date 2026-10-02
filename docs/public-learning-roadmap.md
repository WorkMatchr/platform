# Public Learning roadmap v1

## Basis en scope

Main-slice: `codex/public-learning-roadmap-v1`, vanaf `origin/main` op `f297831344abdf4bc8cbc7b42801accd31052984`. Productiebasis: `05bf107963aeb268a5ef9bd5ab1fbd70d2dffca7` (`codex/public-navigation-v2-production`). De live basis bevat refundpatch `be3349f`; main bevat aanvullende Compliance-functionaliteit. De afzonderlijke productievariant krijgt uitsluitend de publieke wijziging, zodat beide verschillen behouden blijven.

Uitsluitend statische publieke presentatie. Geen database, migratie, seed, cursusrecords, Learning-backend, enrollment, examen, commerce, certificaatuitgifte, maildelivery of retentionactivatie. De oorspronkelijke lokale worktree en WL-001-RC blijven ongemoeid. De Product Owner heeft de lokale pagina en het aanbod goedgekeurd en commit, push, PR, CI, merge, productievariant, deployment en live smoke geautoriseerd na groene eindcontrole. Alle instructies §1–§71 en de prijsaanvulling zijn ontvangen.

## Catalogus, prijs en routes

De centrale contentbron `src/content/public-learning-catalog.ts` bevat twaalf opleidingen in drie afgesproken categorieën en volgorde. De elf roadmapopleidingen gebruiken `/e-learning/[slug]`; een volgende opleiding kan hoofdzakelijk via catalogusdata worden toegevoegd. WL-001 behoudt zijn specifieke detailpagina, hoofdstukken, examen- en certificaatinformatie en status **Binnenkort beschikbaar**. WL-002 t/m WL-012 zijn **In ontwikkeling**.

`src/content/public-learning-prices.ts` bevat centraal **€149 per deelnemer** en **€595 voor 5 deelnemers**, onafhankelijk van studieduur. Geen btw-claim, kortingsengine of seatmanagement. Het toekomstige 5%-vervolgleervoordeel blijft buiten deze opdracht. WL-001 heeft geen canonieke publieke studieduur; de kaart vermeldt daarom **Nog vast te stellen**. De overige elf duren volgen de opdracht.

Iedere kaart toont doelgroep, indicatieve duur, omschrijving, status, beide prijzen en **Bekijk opleiding**. Iedere nieuwe detailheader toont titel, status, doelgroep, duur en prijzen, met **De opleiding is nog niet beschikbaar voor inschrijving**. Alleen informatieve navigatie; geen koop-, start-, wachtlijst- of inschrijfacties.

## Toetsing §57–§71

- §57–§58: complete header en eigen korte introductie vanuit de aangeleverde scope.
- §59: **Wat leert u?**, met expliciet beoogde, nog aan te scherpen leeruitkomsten; geen formele validatieclaim.
- §60: voorlopige onderwerpen zonder gefingeerde hoofdstuknummering; WL-002 heeft tien onderwerpen.
- §61–§64: expliciete ontwikkeltekst, aangekondigde reguliere prijzen, nog geen inschrijving, online/eigen tempo en praktijkgerichte positionering.
- §65–§66: geen wettelijke nalevingsgarantie, erkenningsclaim of verleende beroepsbevoegdheid.
- §67: de voorgeschreven nuance over organisatiegebonden voorlichting/instructie bij WL-003 is integraal opgenomen.
- §68: WL-007 blijft basisopleiding en vervangt geen noodzakelijke stofspecifieke, procesgerichte, wettelijke of praktische voorlichting of instructie.
- §69: de voorgeschreven BHV-awarenessbegrenzing is integraal opgenomen: geen zelfstandige BHV-kwalificatie of vervanging van noodzakelijke praktijkopleiding/oefening.
- §70: hoogte-awareness verleent geen vakbekwaamheid, certificering of praktische bevoegdheid.
- §71: veilig en gezond leidinggeven is geen VCA-VOL, geen VOL-VCA-equivalent en geen vervanging van een andere formele kwalificatie.

## Hergebruik, SEO en productreview

Bestaande PublicPageLayout en hero-slot, Section, PublicContentCard, Card, Heading, Text en LinkButton. PublicContentCard heeft een optioneel inhoudslot en h4-ondersteuning voor aanbod h2 → categorie h3 → opleiding h4. Geen redesign of dependencies.

Elf statische detailroutes met unieke title, description, canonical en Open Graph. De bestaande routecatalogus voedt de sitemap: twaalf unieke detailroutes. Geen Product/Offer structured data of fictieve beschikbaarheid. Copy gebruikt u/uw, expliciete tekststatus, geen persoonsgegevens of dode acties. De roadmap maakt geen uniforme examen-/certificaatbelofte.

### Onbekende routes

Onbekende slugs gebruiken expliciet notFound in pagina en metadata. Door de bestaande streaming-rootlayout geven `/e-learning/onbekend` en de bestaande `/sectoren/onbekend` HTTP 200, met de correcte bestaande niet-gevonden-weergave en noindex. Er verschijnt geen lege/fictieve opleiding. Deze bestaande semantiek wordt niet aangepast en is geen claim van HTTP 404 voor onbekende roadmaproutes.

## Verificatie — 2 oktober 2026

- Gerichte roadmap-, WL-001- en publieke regressies: **115/115 PASS in 11 bestanden**, ook na §57–§71. De tests controleren onder meer alle elf headers, categorievolgorde, centrale prijzen, disclaimers, publieke rendering zonder auth/database, metadata, sitemap, informatieve CTA's en onbekende slugs.
- Volledige `npm run lint`: **PASS**.
- Volledige effectieve `npm run typecheck -- --incremental false --pretty false`: uitsluitend vier **PRE-EXISTING BASELINE**-fouten, geen nieuwe fouten; zie bewijs hieronder.
- Volledige `npm run build -- --webpack`: **PASS**, inclusief Generate, TypeScript, 160/160 pagina's en traces. Alleen tijdelijke procesinstelling `NODE_OPTIONS=--max-old-space-size=6144`; geen compilerconfiguratie gewijzigd. Gegenereerde next-env.d.ts bytegetrouw hersteld.
- HTTP zonder login: `/`, `/diensten`, `/e-learning` en twaalf details **15/15 HTTP 200**. Learning-canonicals correct; iedere detailroute exact eenmaal in sitemap.
- Definitieve browsermatrix: alle vijftien routes op desktop 1280×900, mobiel 390×844 en 500×900 PASS; geen horizontale overflow, één H1 en geen foutoverlay. Echte 200% browserzoom op overzicht en twaalf details PASS. Keyboard-only navigatie en zichtbare focus PASS. Mobiele header visueel gecontroleerd. Geen console- of page-errors.
- Bewijsbestanden, logs en screenshots staan buiten Git. Geen productiecredentials of databaseverbinding gebruikt voor lokale checks.

### PRE-EXISTING BASELINE

Een afzonderlijke ongewijzigde bronexport via `git archive origin/main` op `f297831344abdf4bc8cbc7b42801accd31052984` is daadwerkelijk gecontroleerd met dezelfde volledige typecheck, dependencies en gegenereerde client van het ongewijzigde main-schema. Geen bron- of configuratieaanpassing.

Resultaat op main én definitieve roadmap: exit 2, exact vier TS2345-fouten in `src/lib/compliance/rule-engine.test.ts` op regels 13, 14, 23 en 24 (readonly tuple versus mutable antwoordarray). Volledige diagnostische output identiek. De Product Owner heeft deze baseline expliciet geaccepteerd. Geen suppressie, bypass of ongerelateerde Compliance-reparatie. De productievariant krijgt een eigen effectieve TypeScript-check die volledig groen moet zijn.

## Wijzigingsset

- `docs/README.md`
- `docs/public-learning-roadmap.md`
- `src/app/e-learning/page.tsx`
- `src/app/e-learning/rie-in-de-praktijk/page.tsx` — alleen metadataprijs uit centrale bron
- `src/app/e-learning/[slug]/page.tsx`
- `src/app/public-learning-roadmap.test.tsx`
- `src/components/public/public-content-card.tsx`
- `src/components/public/public-learning-catalog.tsx`
- `src/content/public-learning.ts`
- `src/content/public-learning-catalog.ts`
- `src/content/public-learning-prices.ts`
- `src/content/public-routes.ts`

Geen backend-, database-, auth-, package-, lockfile- of workflowwijzigingen. Geen .env, secrets, screenshots, logs, tijdelijke bestanden of absolute lokale productpaden. Release-identiteiten en live smoke worden na uitvoering in het eindrapport vermeld.
