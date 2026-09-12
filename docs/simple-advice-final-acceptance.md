# Eindacceptatie eenvoudige Advieswijzer

Acceptatie van 12 september 2026, in dezelfde worktree `codex/ai-help-request-intake-v2`. Geen nieuwe functionaliteit, AI-routering, intakevelden, authwijziging of deployment.

## Testlogin en omgeving

Gecontroleerd: `docs/README.md`, `docs/authentication.md`, `docs/test-provider-dataset.md`, `.env.example`, `prisma/seed.ts`, `scripts/seed-test-providers.ts`, `scripts/test-request-database.ts`, `scripts/test-account-lifecycle-database.ts` en `src/lib/test-impersonation/`.

De bestaande testaccountwisselaar vereist een actieve platformbeheerderssessie en de reeds bestaande developmentflag. De lokale inventaris bevat actieve opdrachtgever- en provider-testaccounts. Het bestaande opdrachtgeveraccount `frank2.workmatchr.dev@example.invalid` is door de product owner zelf ingelogd. Er is geen wachtwoord gevraagd, gewijzigd of gerapporteerd en er zijn geen sessietokens, hashes of secrets in dit rapport opgenomen.

De test draait op een afzonderlijke lokale tijdelijke database met de migraties en referentieseed. Deze bevat een kopie van de bestaande testidentiteit met dezelfde ID en credential, plus een fictieve testorganisatie en vestiging; er is geen nieuwe login geregistreerd en het oorspronkelijke account is niet gewijzigd. De testpublicaties raken geen bestaande lokale opdrachten of productiegegevens. Authconfiguratie is ongewijzigd.

## Gevonden acceptatiebug en gerichte correctie

De eerste ingelogde Route A-test toonde dat de klik op Verder van intake naar controle direct een publicatie veroorzaakte. React hergebruikte dezelfde button-DOM-node en wijzigde het type tijdens de klik naar submit. De testpublicatie staat uitsluitend in de tijdelijke database.

Correctie in `src/components/requests/simple-advice-form.tsx`: verschillende React-keys voor Verder en Publiceren, expliciet type button op Verder en preventDefault op de navigatieklik. Geen wijziging aan de gedeelde Button-component of publicatieservice.

Regressietest in `src/components/requests/simple-advice-form.test.tsx`: Verder blijft een navigatieactie; review en Wijzigen mogen geen serveractie uitvoeren; alleen een afzonderlijke klik op Opdracht publiceren roept de actie aan. De 62 gerichte contract- en formuliertests slagen, evenals de opnieuw uitgevoerde Request-databasesuite.

## Acceptatiebewijs

De eerste testpublicatie heeft één Request met status PUBLISHED, HVK, WITHIN_TWO_WEEKS en Utrecht opgeleverd, in de juiste tenant. De typed startsnapshot is aanwezig, evenals REQUEST_PUBLISHED, ELIGIBILITY_SNAPSHOT_CREATED en twee dossierauditevents. Assignment-aantal is nul. Dit bewijst de opslagketen, maar geldt wegens de gevonden voortijdige publicatie niet als geslaagde Route A-eindacceptatie.

De browserherhaling na de publicatiefix slaagt: Verder blijft op review zonder nieuwe Request, Wijzigen behoudt invoer en alleen de aparte publicatieklik maakt één Request. Route A staat met de gewijzigde titel in het bestaande overzicht. Route B met RI&E en de afzonderlijke UNKNOWN-route publiceren zonder expertise. Alle drie hebben de juiste tenant, twee Request-events en twee dossier-events. Er zijn vier Requests inclusief de eerste bugreproductie, en nul Assignments.

Locatiecontroles: organisatielocatie Utrecht, andere plaats Delft, Remote, combinatie met en zonder andere plaats. De combinatie toont alle drie de uitvoeringsvormen; de plaats verschijnt alleen waar nodig en is verplicht. Startcontroles: Zo snel mogelijk, Binnen 2 weken, Binnen 1 maand, Later en Specifieke datum. De native datumkiezer is met toetsenbord bediend; 13-09-2026 wordt als `2026-09-13` opgeslagen. UNKNOWN bevat geen expertiseclaim.

De ingelogde mobiele controle vond daarnaast headeroverflow door de lange accountnaam: documentbreedte 518 px bij 458 px beschikbare breedte. De header is minimaal gecorrigeerd met flex-wrap en een begrensde, afgekorte zichtbare accountnaam. De volledige naam blijft in de markup aanwezig. Er is een aanvullende lange-naamvariant in de bestaande headertest. De gecombineerde gerichte run slaagt met 75 tests.

De mobiele hercontrole vond een concrete resterende regressie: het publieke navigatiemenu stond bij 390 px links buiten beeld (linkergrens circa -222 px). De ingelogde actieregel neemt nu onder sm de volle breedte in; het navigatiepaneel opent daar links uitgelijnd en behoudt vanaf sm de bestaande rechteruitlijning. Alleen `header.tsx`, `public-navigation.tsx` en hun regressietests zijn hiervoor aangepast.

Mobiele header: PASS na herbouw. Bij 390 px viewport zijn documentbreedte en scrollbreedte beide 375 px (exclusief scrollbar); het geopende navigatiegedeelte ligt tussen circa 37 en 354 px. Bij 600 px zijn beide documentbreedtes 585 px en blijft het menu eveneens binnen beeld. De screenshot bij 390 px toont leesbare, niet-overlappende headeritems en beide bruikbare menu's. Enter opent, Tab bereikt de eerste navigatielink en Escape sluit met focusherstel op de betreffende trigger. Gesloten menu's dekken geen content af. De viewportoverride is daarna hersteld.

Verificatie van deze minimale correctie: 86 gerichte tests PASS, lint PASS (twee bestaande waarschuwingen in benchmarkbestanden), productiebuild inclusief TypeScript PASS en diff-check PASS. De lokale app draait weer op poort 3000 met dezelfde ingelogde testsessie. Bewijslogs: `.tmp/simple-advice-acceptance/tests-menu.log`, `lint-menu.log` en `build-menu.log`.

Echte 200%-browserzoom: PASS op basis van de handmatige product-ownercontrole in Edge. De product owner bevestigde: “ik heb in Edge gekeken en de 200% zoom werkt goed”. Dit is door de product owner geleverd acceptatiebewijs; Codex heeft de echte zoomcontrole niet zelfstandig uitgevoerd. De eerdere viewportcontrole geldt niet als vervanging daarvan.

Eindstatus: SIMPLE_ADVICE_REQUEST_FLOW_ACCEPTED. De twee resterende controles zijn afgerond: 200%-zoom PASS en mobiele header PASS. Geen open acceptatieblockers; de flow is gereed voor product-owneracceptatie en commit. Bij deze afronding is uitsluitend dit acceptatierapport bijgewerkt; geen productcode gewijzigd en geen tests opnieuw uitgevoerd voor deze documentatiewijziging.

Lokale bewijsbestanden staan onder `.tmp/simple-advice-acceptance/`; de databasebewijs-export bevat uitsluitend de fictieve testopdrachten. Geen commit, push of deployment.

## Gecontroleerde commitvoorbereiding

Na product-owneracceptatie is uitsluitend de Simple Advice-flow geselecteerd in een schone releaseworktree vanaf `origin/main` (`98e084a`). Zeven gemengde bestanden zijn op hun afzonderlijke flowwijzigingen geselecteerd; oudere routing-, benchmark-, provider-, kennisbron- en financiële wijzigingen blijven buiten de commit. De migratie `20260912090000_simple_advice_request` hoort volledig bij deze flow; andere lokale migraties zijn niet overgenomen.

De twintig geaccepteerde expertisecodes en labels staan in het Simple Advice-contract als statische keuzelijst. Een exacte vergelijking met de geaccepteerde lijst slaagt voor 20/20 keuzes. Het importeren van het experimentele V2-contractbestand is daarmee niet nodig; er zijn geen routingregels, prompts, facts of nieuwe expertise-identiteiten toegevoegd en het formuliergedrag is ongewijzigd.

De geïsoleerde commitselectie slaagt voor 94 gerichte tests, de Request-databasesuite (A/B/UNKNOWN, idempotentie, immutable snapshots, tenant-/locatiecontrole en rollback), lint zonder waarschuwingen, afzonderlijke typecheck en productiebuild. Ook de patroongebaseerde secretscan en diff-check slagen. Alleen de bestaande buildwaarschuwingen over workspace-root en Knowledge-bestandspatroon blijven zichtbaar. De documentatie verwijst naar de eerdere browseracceptatie, inclusief de door de product owner uitgevoerde echte 200%-zoomcontrole.

De exacte selectie en uitsluitingen, met classificatie per bestand, zijn vóór commit aan de product owner beschikbaar gesteld. De bronworktree en lokale testartefacten worden niet integraal gestaged. Deze opdracht autoriseert commit en push; geen deployment of toepassing van de migratie op productie.
