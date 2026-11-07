# WP18 — Commercial Completion

Datum: 5 november 2026. Branch `codex/wp18-commercial-completion`.
Basis: main `a315db8c7738b8862a92d9f8517b0315e3b14d1f`.

**GO voor technische Draft-review; commerciële productieacceptatie blijft afzonderlijk.**
Geen productiegegevens, echte providers, featuregates, migraties of juridische teksten gewijzigd.
Dit dossier actualiseert WP15–WP17B voor beperkte offertecorrecties; het vervangt geen
provider-, infrastructuur-, juridische of menselijke productvrijgave.

## Bevestigde defecten en herstel

1. Offerte aanpassen opende een leeg formulier, hoewel currentVersion bestond. Alle zes
   velden worden nu hersteld; expectedQuoteVersion bewaakt een volgende immutable versie.
2. saveQuoteDraft controleerde geen afgesloten opdracht. De bestaande serialiseerbare
   transactie controleert nu dezelfde open statussen als submitQuote. De pagina biedt
   geen bewerking bij gesloten opdracht, verstreken deadline of ingediende offerte.
3. awardMarketplaceQuote accepteerde een verstreken validUntil. Een echte PostgreSQL-
   reproductie faalde vóór herstel met `Missing expected rejection`. De server weigert nu
   een verstreken offerte, inclusief de exacte grens; bestaande idempotente replay blijft intact.
4. Gunning stuurde ook afwijzingsmeldingen naar niet-ingediende conceptoffertes. De
   ontvangerset bevat nu alleen AWARDED/REJECTED offertes. Geen nieuwe e-mailconsumer.
5. Prijsuitleg en voorwaarden werden opgeslagen maar niet getoond in offertevergelijking
   of eigen offertedetail. Beide weergaven tonen deze bestaande inhoud nu, met geldigheid.

Geen nieuwe prijzen, btw-regels, statustaxonomie, betaalde uitbreiding of selectiecriteria.
De bestaande datuminput slaat een timestamp op; WP18 verandert de datuminterpretatie niet
stilzwijgend naar het einde van een dag. Een toekomstige gebruiksregel daarvoor vereist
productafstemming en historische compatibiliteit.

## Commerciële acceptatiematrix

| Werkpakket | Technische uitkomst | Bewijs / grens |
| --- | --- | --- |
| A Registratie/organisatieverificatie | PASS bestaand bewijs | WP13–WP17B; auth/organisatiecode ongewijzigd. Geen nieuwe browserregistratie of externe verificatiemail in WP18. |
| A Login, sessies, rollen en tenants | PASS | PostgreSQL-sessies, foutinjectie/logout/retry/concurrency; browser OWNER, ADMIN, MEMBER, professional en platformbeheer. |
| A Hulpvraag → dossier → opdracht → markt | PASS | Nieuwe browserpublicatie met Bedrijfsarts + Casemanager, matching en gunning; PG één canonieke Request/handoff bij replay. |
| A Offertevergelijking/status/historie | PASS | Browser concept v1 → v2 → indiening → gunning; PG immutable snapshots en award replay. |
| B Profiel/expertise/selecteerbaarheid | PASS servicebewijs | Gekwalificeerde synthetische fixture; matching PRIMARY/ADDITIONAL en read-model. Geen nieuwe volledige browserkwalificatie. |
| B Privacyveilige uitnodiging/ontgrendeling | PASS | Browser preview, onvoldoende saldo blokkeert, na fake funding één aankoop en volledige toegang; PG tenant/ontvanger/deadline. |
| B Offerte opstellen/aanpassen/indienen | PASS | Zes velden heropenen, tweede versie, indiening; daarna bewerking geweigerd, server en UI. |
| C Maximaal drie offertes | PASS | PostgreSQL gelijktijdige claims, vierde geweigerd; vier/vijf blijft toekomstig besluit, geen activering. |
| C Verlopen/ingetrokken/afgesloten | PASS binnen bestaande lifecycle | Verlopen gunning en gesloten concept via echte PG; WITHDRAWN/EXPIRED bewerkingsknoppen via regressies; geen nieuwe intrekkingsworkflow. |
| D Credits/betaling/factuur/ledger/refund | PASS met fake providers | Financiële PG-suite en regressies; zes replays, één aankoop/ledger/factuur, fout en herstel; geen echte betaling/refund/mail. |
| E Uitnodigingsconsumer | PASS met fake transport | Ontvangercontrole, deduplicatie, gelijktijdige worker, retries, mailvoorkeur, privacyveilige snapshot. |
| E Overige gewenste e-mails | PENDING HUMAN ACCEPTANCE | Geen ongedocumenteerde consumer toegevoegd; gebeurtenismatrix hieronder. |
| F Desktop/mobiel/keyboard | PASS geteste schermen | 1280 en 390 px, geen horizontale overflow; zichtbare focus, echte ingelogde rollen. Niet iedere pagina/screenreader getest. |
| F Echte 200% zoom | PASS Product Owner | Gebruiker bevestigde tijdens WP18: “zoom is akkoord”. Geen eigen geautomatiseerde zoommeting geclaimd. |
| Productieproviders / juridische vrijgave | BLOCKED voor onvoorwaardelijke livegang | Afzonderlijke acceptatie uit bestaande dossiers; PR64 blijft ongewijzigd concept. |

## Browserbewijs per rol

Nieuwe lokale PostgreSQL 18-testomgeving met 95 migraties en beperkte effectieve applicatierol.
Geen bestaande database gebruikt. Externe fetch geblokkeerd; geen echte providerkeys.

- **Opdrachtgever OWNER:** login, dashboard, opdrachten, Ja/deskundigheid, hulpvraag,
  aanvullende expertise, samenvatting, publicatiebevestiging, detail/historie, selectie,
  offerte vergelijken en gemotiveerd gunnen. Dashboard registreerde één nieuwe offerte.
- **Professional OWNER:** login, gekwalificeerde/selecteerbare status, privacypreview,
  onvoldoende saldo, fake aankoop via bestaande services, ontgrendelen, concept opslaan,
  heropenen van zes velden, planning aanpassen, versie 2, indiening en gesloten editor.
  De opdrachtgeverroute gaf een niet-gevondenpagina zonder klantgegevens.
- **Organisatie ADMIN:** login, eigen organisatie en gebruikersbeheer, laatste OWNER-
  bescherming zichtbaar; geen uitnodiging verzonden of accounts geblokkeerd.
- **Organisatie MEMBER:** alleen lezen, geen profiel-/gebruikersbeheer; offertevergelijking
  en gunning afgeschermd. Geen rechten uitgebreid.
- **Platformbeheerder:** echte login, financiële cockpit met synthetische betalingen,
  credits en onderhoudssignaal; mobiel en logout. Geen beheeractie uitgevoerd.
- Browserconsole tijdens deze flow: nul errors. Rollen uitgelogd via bestaande Better Auth.
- Screenshots uitsluitend synthetisch; lokale bewijsbestanden buiten publieke Git.

Browserregistratie en volledige providerkwalificatie zijn bestaand WP13–WP17-bewijs,
geen nieuw browserbewijs. De betaalfixture gebruikt financiële services met fake gateway,
geen echte Mollie-checkoutbrowser. Geen synthetische betaalinstelling op productie toegepast.

## Notificatie- en providergrenzen

| Gebeurtenis | Huidige afhandeling | Acceptatie |
| --- | --- | --- |
| Relevante opdracht / PRIMARY en ADDITIONAL uitnodiging | In-app + MARKETPLACE_INVITATION-outbox / assignment-email-worker | Fake acceptatie, ontvanger, retry, lease en deduplicatie PASS |
| Offerte ontvangen | In-app QUOTE_SUBMITTED | Geen aparte e-mailconsumer bewezen; gewenst mailgedrag eerst besluiten |
| Gunning / afwijzing | In-app QUOTE_AWARDED / QUOTE_REJECTED | Alleen werkelijk ingediende offertes; geen verzonnen e-mailbewijs |
| Berichten / verdere status | Bestaande in-app events | Geen generieke nieuwe e-mailconsumer |
| Intrekking opdracht | REQUEST_WITHDRAWN-outbox | Nog geen afzonderlijke consumer bewezen; bestaand WP16-besluitpunt |
| Contactverzoek / beheeruitnodiging | MARKETPLACE_CONTACT_REQUEST / PLATFORM_ADMIN_INVITATION_ACCEPTED | Geen afzonderlijke consumer bewezen; geen nieuwe mailpolicy |
| Factuur | financial-invoice-delivery-service | Fake acceptatie, fout/retry, deterministische idempotency key; provideracceptatie is geen inboxbewijs |
| Contactformulier | Bestaande gesloten contactarchitectuur | Niet geactiveerd of gewijzigd |

Geen algemene exactly-once-mailclaim: onbekende provideracceptatie en providerretentie
van idempotency keys blijven operationele reconciliatievoorwaarden. WP15/16/20/21-
bevindingen over provideracceptatie worden niet kunstmatig groen gemaakt.

## Tests en reproduceerbaarheid

Eigen PostgreSQL 18-container, nieuwe tijdelijke databases en bestaande harness. Alle
95 migratieregistraties exact op bestandschecksum gecontroleerd; nul mislukte/onafgemaakte
of onverwachte registraties. Geen migratiebestanden gewijzigd.

- `npm run test:db:marketplace-concurrency`: PASS; slotrace/maximum drie, walletintegriteit,
  autorisatie, offerte-/awardreplays, immutable historie; aanvullend verlopen gunning,
  gesloten concept, geen afwijzing voor niet-ingediend concept.
- `npm run test:db:finance`: PASS; payments/refunds/credits/ledger/invoice, providerfouten,
  idempotentie en ongeautoriseerde replay.
- `npm run test:db:auth-sessions`: PASS; drie accounttypen, sessieduur/refresh/expiry,
  tenantisolatie en echte DELETE-foutinjectie: 503 zonder cookieverlies, retry en concurrent logout.
- `npm run test:db:requests`: PASS; canonieke dossier/request/handoff en autorisatie.
- `npm run test:db:request-offer-slots`: PASS; concurrentie, vierde geweigerd, privacy,
  bestaande terugboekingsregel en append-only historie.
- `npm run test:db:assignment-notifications`: PASS; 17 matchingfixtures en volledige fake
  aankoop → canonieke publicatie → PRIMARY/ADDITIONAL → fake SENT → aankoop → offerte
  → gunning; beperkte runtime, historische snapshots en cross-tenantcontrole.
- `npm run test:scheduler`: 14/14 PASS, afzonderlijk geteld.

Gerichte regressies (PowerShell, deze branch):

```powershell
npx vitest run src/lib/marketplace src/lib/finance src/lib/credits src/lib/requests src/lib/organizations src/lib/account-architecture src/lib/auth-policy.test.ts src/lib/auth-session-policy.test.ts src/lib/email.test.ts src/app/api/payments src/app/marktplaats src/app/offertes src/components/ui/action-form.test.tsx --maxWorkers=2
npm run lint
npm run build
npm run typecheck
git diff --check
```

Databasecommando's vereisen expliciet een lokale testverbinding zonder providercredentials;
de harness weigert niet-lokale doelen. Geen productiecommando of secret in dit dossier.

## Integratie en vrijgave

Geen auth-, Prisma-, migratie-, finance-, navigatie-, Academy-, Compliance- of SEO-bestand
gewijzigd. Geen dependencies toegevoegd. PR90–94 en juridische PR64 niet gewijzigd.
WP15–WP17B-bewijzen hergebruikt waar code ongewijzigd is. De huidige testketen bevat 95
migraties; dit is geen actuele productiepreflight of bewijs voor schema85.

React-review: servercomponenten, bestaande ActionForm, geen nieuwe hooks/clientstores/bundels;
tenantcontrole in query/service, immutable versies, labels en focus behouden.

Merge uitsluitend na review en exacte headchecks. Product Owner beoordeelt commerciële
acceptatie en aanvullend mailgedrag. Vier/vijf offertes blijven gesloten. Rollback: alleen
applicatiecommit terugdraaien; geen datamigratie. Historische versies/awards blijven intact.
Rollback herintroduceert genoemde offerteproblemen en is geen permanente oplossing.

## Exacte wijzigingsset

- docs/README.md
- docs/quotation-flow-v1.md
- docs/wp18-commercial-completion.md
- scripts/test-marketplace-concurrency-database.ts
- src/app/offertes/[quoteId]/page.tsx
- src/app/offertes/nieuw/page.tsx
- src/app/offertes/nieuw/page.test.tsx
- src/app/offertes/quote-presentation.test.tsx
- src/app/opdrachten/[assignmentId]/offertes/page.tsx
- src/lib/marketplace/award-service.ts
- src/lib/marketplace/dashboard-query-service.ts
- src/lib/marketplace/quote-service.ts
- src/lib/marketplace/quote-lifecycle.test.ts

## Definitieve resultaten

- Finale regressies: **658/658 PASS**, 80 bestanden, nul skips/failures; scheduler apart 14/14.
- Volledige lint: PASS, nul fouten, vier bestaande authnavigatiewaarschuwingen.
- Standalone TypeScript: PASS, geen baselinefouten op deze actuele main.
- Productiebuild: PASS; drie bestaande Knowledge/organisatie-logo-tracingwaarschuwingen.
- Definitieve gebouwde browser toont prijsuitleg en voorwaarden op desktop/mobiel;
  geen horizontale overflow of consolefouten. Logout vraagt opnieuw om login.
- Databasecontrole na browser: één nieuwe opdracht, één handoff, één award, twee
  offerteversies en één deelnameafschrijving; nul resterende sessies.
- Eigen testserver/container/volume/databases/accounts/credentials verwijderd.
  Drie bestaande containers en 27 bestaande volumes behouden; bestaande PostgreSQL gezond.
- Automatisch gegenereerde next-env.d.ts-wijziging niet meegenomen. Geen dependencies,
  lockfile, secrets, fixtures, lokale logs of operationele hostmetadata in de wijzigingsset.
- Diff-/secretscontrole en exacte remote headchecks worden bij de Draft PR vastgelegd.

**Technisch gereed voor gecontroleerde review.** Geen onvoorwaardelijke productie-GO:
remote Preview/CI, ontbrekende e-mailproductbesluiten en bestaande provider-/juridische
releasevoorwaarden blijven afzonderlijk te beoordelen. Geen productiehandeling uitgevoerd.

## Release B3 op de gepubliceerde A/B1/B2-basis

Deze aanvulling geldt voor PR #112. De eerdere WP18-metingen hierboven zijn historisch.
De referentie voor de release is productiecommit `baa6547c35c03905bec09fc22b76593e5821794d`.
Het enige integratieconflict betrof de lijst met uitgesloten Preview-branches in
`vercel.json`. Zowel B2 als B3 behoudt de eigen uitsluiting.

De read-only controle bevestigde de 85 afgeronde productiemigraties. Alle 85 namen en
SHA-256-checksums zijn vergeleken met de bijbehorende SQL uit Git. Bij 12 bestanden
komen de vastgelegde checksums overeen met CRLF-regeleinden en bij de overige 73
met de oorspronkelijke Git-bytes. De PostgreSQL 18-proef gebruikte precies de 85
geregistreerde bestanden, met dezelfde checksums. De keten uit de repository bevat
ook latere migraties. Een eenvoudige selectie van de eerste 85 mappen is onjuist.

- De server bewaart voor een gekozen einddatum het begin van de volgende dag in
  Amsterdam. De detailweergaven tonen dit exclusieve tijdstip met tijdzone. Bij
  bewerken bewaart een ongewijzigde datum ook het oorspronkelijke historische tijdstip.
- Het bestaande prijs-, selectie-, credit- en sessiemodel blijft leidend. De schema-,
  homepage-, auth-, SEO- en providerbestanden van de productiebasis zijn identiek.
- Op schema 85 zijn conceptversies, de verlopen uitnodiging, capaciteitsgrens,
  tenantisolatie, gelijktijdige indiening en gunning en de bijbehorende notificaties
  getest. Een parallelle gunning leverde precies één besluit op. Een niet-ingediend
  concept behield zijn status en kreeg geen afwijzingsmelding. Een herhaalde aankoop
  en indiening leverden samen één deelnameafschrijving op. Ook de sessie- en
  financiële PostgreSQL-suites slaagden.

### Herhaalde acceptatie op de geïntegreerde kandidaat

| Controle | Resultaat |
| --- | --- |
| Gerichte Vitest-regressies en scheduler | PASS, 404 tests in 64 bestanden en 14 schedulertests. |
| PostgreSQL 18 met 85 productiemigraties | PASS voor Marketplace, sessies en financiële integriteit met synthetische tenants en fake providers. |
| Edge, desktop en mobiele weergave | PASS voor het ingelogde offerteformulier, 1414 en 390 CSS-pixels breed. Alle zes velden kwamen na opslaan en heropenen terug. |
| Echte browserzoom op 200% | PASS, bij een buitenbreedte van 1440 px veranderde de inhoudsbreedte van 1414 naar 707 px en de pixelratio van 1 naar 2. |
| Toegankelijkheid van het offerteformulier | PASS voor geteste tabvolgorde, zichtbare focus en reflow. Axe vond op de drie weergaven geen overtredingen van de geteste WCAG A/AA-regels. |
| Tenantafscherming in Edge | PASS, een andere professional kreeg voor zowel het conceptformulier als het offertedetail de pagina voor een onbekende route. |
| Lint, zelfstandige TypeScriptcontrole en standaardproductiebuild | PASS. Lint meldt vier bestaande navigatiewaarschuwingen. De standaardbuild gebruikte Turbopack. |

De GitHub Actions zijn gekoppeld aan de PR-head. Controleer de bijbehorende runs
opnieuw zodra die head of de productiebasis verandert. Fysieke mobiele apparaten
en een schermlezer maakten geen deel uit van deze browserproef.

### Publicatie en terugkeer

Controleer vóór een afzonderlijk goedgekeurde publicatie opnieuw de PR-head, groene
Actions, productiealias en schema-identiteit. Controleer na publicatie de alias en
commit, homepage, SEO, inloggen, accountafscherming en de offertepagina. Gebruik
bestaande foutsignalen voor opslaan, indienen en gunnen. Stop bij een onverwachte
autorisatie-, datum- of transactiefout. Herstel dan met afzonderlijke bevoegdheid de
productiealias naar de vooraf opnieuw gecontroleerde READY-deployment van B2.
Nieuwe legitieme offertetransacties blijven behouden. Terugkeer naar B2 brengt ook
het oude bewerkings- en geldigheidsgedrag terug. Gebruik die handelingen pas weer
na beoordeling. Er is geen databaseterugdraai nodig.

### Afzonderlijk vervolg voor het dienstverlenersprofiel

De pagina voor diensten haalt uitsluitend actieve termen uit gepubliceerde versies
van `ProviderTaxonomy` op. De read-only telling op de productiebasis vond geen
`SERVICE`-taxonomie, tegenover 12 selecteerbare sectoren en 20 specialismen. Daardoor
heeft de dienstenselectie alleen een placeholder. De repository definieert diensten
in de referentieseed. Herstel van productiegegevens valt buiten B3.

Vervolgopdracht **Sectoren en diensten**: verifieer de bedoelde gepubliceerde
dienstencatalogus en bereid een afzonderlijke, idempotente referentiedata-aanvulling
voor. Combineer daarna sectoren, meerdere diensten en specialismen, en de
leveringsvormen per dienst in één formulier. Gebruik de bestaande profiel- en
revisieservices met één atomische opslagactie, optimistische versiecontrole en
serverautorisatie. Behoud bestaande koppelingen en bewijs bij ongewijzigd opslaan.
Test lege catalogus, wijzigen zonder verlies, rol- en tenantgrenzen, gelijktijdige
bewerkingen en ongewijzigde matching en selecteerbaarheid.
