# A01.8 — Opdracht starten

De canonieke startpagina is `/opdracht-starten`, met titel `Opdracht starten | WorkMatchr` en zichtbare kop `Maak uw opdracht`. De bestaande SimpleAdviceForm en publicatieservice blijven leidend; er is geen tweede intake.

## Compatibiliteit

De GET-routehandler `src/app/advieswijzer/route.ts` retourneert expliciet HTTP 301 voor `/advieswijzer` naar `/opdracht-starten`. De handler geeft een relatieve Location met het canonieke pad en de oorspronkelijke query terug; daarmee blijft ook de lokale oorsprong behouden en de oorspronkelijke queryparameters, inclusief herhaalde waarden, blijven behouden. De nieuwe route redirect niet terug. De routes `?start=deskundigheid` en `?start=onderwerp` behouden hun bestaande initialisatie. Onbekende of meervoudige startwaarden krijgen het normale openingsscherm. De oude `#advieswijzer`-homepageanker blijft voor bestaande links behouden.

De interne sleutel `publicRoutes.adviceGuide` blijft stabiel en verwijst naar de nieuwe URL. Bestaande server-actionmodules blijven op hun pad staan; een modulepad is geen publiek bereikbare pagina. De historische AI-intake-cookieconfiguratie wordt niet gewijzigd: de huidige Simple Advice-flow gebruikt deze cookie niet. Tabgebonden conceptkeys, vraagvolgorde, validatie, login-overdracht, tenantcontrole, Request/AdviceDossier/Assignment en publicatie blijven ongewijzigd.

De loginlink en de publicatie-autorisatie verwijzen naar de canonieke start. Bestaande login-returnTo-links naar de oude route blijven via de 301 bruikbaar. Registratie, verificatie en onboarding worden niet gewijzigd. Mail-/notificatiecode heeft geen hardcoded verwijzing naar de oude publieke route.

## SEO en copy

De sitemap bevat precies eenmaal `/opdracht-starten`; canonical en Open Graph wijzen ernaar. Directe start-CTA's heten `Start uw opdracht`. Informatieve links en bestaande acties zoals hervatten, controleren en publiceren houden hun betekenis. Zelfstandige Arbo-/BHV-/Compliance-wijzers worden niet hernoemd.

## Release en rollback

Deze wijziging wordt als Draft PR aangeboden. Geen merge of productiedeployment in deze opdracht. Na review kan de reguliere release de route en 301 samen uitrollen. Rollback is een revert van de volledige wijziging; behoud bij een latere rollback een redirect voor reeds gedeelde nieuwe links om 404's te voorkomen. Een 301 kan door browsers gecachet zijn.

## Product Constitution

PC-011/035/068: opdrachtterminologie, concrete startactie en metadata. De goedgekeurde expliciete Ja/Nee-keuze uit Simple Advice blijft behouden. Geen nieuwe afwijking, nieuwe vragen, rechten of gegevensverwerking.

## Verificatie (11 oktober 2026)

Basis: `4a5a13800ea4a0d2fd8760d4f25627fa39bce2d3` (main, merge PR #25). De uniforme accountlayout is ongewijzigd.

- Volledige testsuite: 2101 geslaagd, 12 gefaald, 12 overgeslagen; 313 testbestanden geslaagd, 11 gefaald, 1 overgeslagen. Naast de twaalf assertions zijn er twee bestaande suite-laadproblemen.
- Alle twaalf falende assertions en beide laadproblemen zijn opnieuw uitgevoerd op een geïsoleerde, ongewijzigde export van deze main. Dezelfde oorzaken: oude publieke CTA-/previewverwachtingen, bedrijfsartswoordlimiet 728/575, oude platformversie-default, assignmentquery-mocks, datumafhankelijke abonnementopzegging, context-/guidanceverwachtingen, ontbrekende server-only-testmock en een node:test-suite die Vitest niet herkent.
- Afzonderlijke eindcontrole: 57/57 gerichte tests PASS (route/parameterbehoud, metadata, formulier, opdrachtenlijst, homepage, contact en diensten).
- Volledige lint PASS; aanvullende lint voor de laatste wijzigingen PASS.
- Standalone TypeScript: uitsluitend vier bestaande TS2345 readonly-arrayfouten in `src/lib/compliance/rule-engine.test.ts` op 13:79, 14:89, 23:8 en 24:89; bestand identiek aan main.
- Productiebuild PASS, inclusief de definitieve relatieve 301-handler. Geen databaseverbinding of migratie nodig.
- HTTP HEAD op de oude route: 301 met `location: /opdracht-starten?start=onderwerp&tag=a&tag=b`.
- Browser op lokale productiebuild: normale Ja/Nee-start, beide deeplinks, herhaalde parameters, deskundigheid Bedrijfsarts, onderwerp UNKNOWN, validatiefouten, invullen, controlepagina, login-returnTo en antwoordbehoud na browser-terug gecontroleerd. Bestaand gedrag: terug naar een deeplink heropent stap 1; verdere antwoorden blijven behouden.
- Desktop en 390px mobiel: geen horizontale overflow; dropdown bereikbaar; Tab-focus zichtbaar en Enter op Verder werkt. Geen consolefouten waargenomen. Homepage heeft vier start-CTA's met de canonieke bestemming.
- Geen echte login/publicatie of databasewrites uitgevoerd. Persistente publicatie en een volledige ingelogde browsercyclus blijven onderdeel van de bestaande acceptatie; deze routewijziging heeft die domeinlogica niet veranderd. Nieuwe product-owneracceptatie en echte 200%-zoom zijn niet in deze run bevestigd.
- Geen Product Constitution-afwijking geïntroduceerd. Release blijft ter review: bestaande repo-brede test-/typecheckblokkades zijn niet opgelost in A01.8.

## Exacte wijzigingsset

- `docs/README.md`
- `docs/a018-opdracht-starten.md`
- `src/app/advice-guide.test.tsx`
- `src/app/adviesdossiers/page.tsx`
- `src/app/advieswijzer/page.tsx`
- `src/app/advieswijzer/route.ts`
- `src/app/advieswijzer/simple-actions.ts`
- `src/app/compliance-guide.test.tsx`
- `src/app/contact/page.test.tsx`
- `src/app/contact/page.tsx`
- `src/app/dashboard/compliance/page.tsx`
- `src/app/diensten/page.test.tsx`
- `src/app/hulpvragen/nieuw/page.tsx`
- `src/app/opdracht-starten/page.tsx`
- `src/app/opdracht-starten/route.test.ts`
- `src/app/opdrachten/my-assignments-page.test.ts`
- `src/app/opdrachten/page.tsx`
- `src/app/over-workmatchr/page.tsx`
- `src/app/public-audience-pages.test.tsx`
- `src/app/public-content-detail-pages.test.tsx`
- `src/app/public-homepage.test.tsx`
- `src/app/public-platform-pages.test.tsx`
- `src/app/rie-knowledge-cluster.test.tsx`
- `src/app/voor-opdrachtgevers/page.tsx`
- `src/app/wijzers/page.tsx`
- `src/components/assignments/assignment-interface.test.ts`
- `src/components/assignments/assignment-list.tsx`
- `src/components/public/arbo-guide-layout.test.tsx`
- `src/components/public/bhv-guide.tsx`
- `src/components/public/compliance-guide.tsx`
- `src/components/public/knowledge-search.tsx`
- `src/components/public/public-content-pathways.test.tsx`
- `src/components/public/public-content-pathways.tsx`
- `src/components/public/public-detail-content.test.tsx`
- `src/components/public/public-homepage-v01.test.tsx`
- `src/components/public/public-homepage-v01.tsx`
- `src/components/public/public-homepage-v02.tsx`
- `src/components/public/public-intake-guidance-result.test.tsx`
- `src/components/public/public-intake-workspace.tsx`
- `src/components/public/public-visual-density.test.tsx`
- `src/components/requests/simple-advice-form.tsx`
- `src/content/canonical-expertise-service-content.ts`
- `src/content/knowledge/knowledge-contexts.test.ts`
- `src/content/knowledge/knowledge-contexts.ts`
- `src/content/public-content-platform.test.ts`
- `src/content/public-content.ts`
- `src/content/public-homepage.ts`
- `src/content/public-routes.ts`
- `src/content/services.ts`
