# P1.2 — financieel productieherstel voorbereiden

Datum: 6 november 2026. Status: **P1.3 productie-uitvoering NO-GO**. Dit dossier verleent geen uitvoeringsautorisatie. Geen productie-export, restore, schrijfpauze, migratie, provider-/factuurmutatie, merge, deployment of featureactivering uitgevoerd.

## Afbakening en actuele basis

Kandidaat is PR #105, `db959b4b48c072df37a94f42e983c5fcbe142173`, met 115 migraties. Main en de eerder deze dag read-only geverifieerde productiecommit zijn `a315db8c7738b8862a92d9f8517b0315e3b14d1f`. Main bevat 95 bestanden; productie heeft 85 toegepaste migraties. Die aantallen mogen niet worden verwisseld. PR #105 is nog Draft, head onveranderd, GitHub mergeable; de zes eerder gecontroleerde checks op die head zijn geslaagd. Dit P1.2-pakket is uitsluitend een afhankelijke test-/documentatie-PR, geen alternatieve releasekandidaat.

Hergebruikt: het private P1-productiepreflightdossier van 6 november, [P1.1](p1-financial-integration-and-recovery-readiness.md), [database-upgraderunbook](database-upgrade-preparation.md), bestaande versleutelde synthetische herstelproeven en [exacte 115-checksumlijst](evidence/p11/migration-checksums.json). Geen algemene audit herhaald. Exacte productie-, klant-, provider-, rol- en infrastructuuridentiteiten en financiële correctiebedragen blijven uitsluitend in het private dossier.

De live preflight constateerde 85 voltooide migraties, geen onafgemaakte registraties of onbekende checksums. Bekende LF/CRLF-verschillen zijn verklaard, niet gerepareerd met `migrate resolve`. De financiële preflight vond geen dubbele geregistreerde betaalde recurring-referenties, verweesde factuurbronnen of ongeldige indexes/constraints. Dit sluit de bekende **ontbrekende** financiële registraties niet uit. Een succesvolle onderhoudsrun is evenmin bewijs van een sluitende financiële keten.

De verwachte volgende Pro-incasso is rond **4 december 2026**, volgens de Product Owner en de waargenomen maandcadans. De exacte volgende providerdatum is nog niet onafhankelijk bevestigd. Bevestig die read-only vóór het uitvoeringsbesluit; behandel deze verwachting niet als gegarandeerde uiterste technische deadline.

## A/B — aanvullende herstel- en migratieproef

De eerdere 85→115-test bevatte alleen een synthetische gebruiker op schema85. De aanvullende fixture vult nu abonnement, verlopen eerste poging, betaalde retry, twee maandbetalingen, vier oorspronkelijke facturen, creditwallet/ledger, geslaagde en mislukte Jortt-registraties, syncrevisies en financiële audit. Alleen synthetische `example.invalid`-gegevens; geen kopie van productie.

Uitgevoerde volgorde:

1. Maak een eigen tijdelijke PostgreSQL18-container en lege database; controleer loopbackbinding en eigen label.
2. Bouw de exact bekende85-baseline op via Prisma en vul uitsluitend de synthetische fixture.
3. Maak een custom-format dump in geheugen; herstel die in een tweede eigen lege database, nog op85. Deze synthetische test schrijft geen plaintextdump naar schijf. De bestaande echte encryptieprocedure wordt niet vervangen of opnieuw ontwikkeld.
4. Vergelijk alle tabeldigests, volledige migratieregistraties, functions/owners/ACL, constraints en triggers. PostgreSQL normaliseert sommige CHECK-expressies bij dump/restore. Daarom worden oorspronkelijke CHECK-definities op lege tijdelijke LIKE-tabellen door PostgreSQL opnieuw geparseerd en exact vergeleken; geen casts of controles weggefilterd.
5. Verleen een bestaande synthetische NOLOGIN-testrol uitsluitend expliciete leesrechten. Factuurlezing slaagt; UPDATE, DDL en triggerbypass falen. Dit is geen bewijs van een operationele beperkte Neon-bronrol of logincredential.
6. Migreer de **herstelde** baseline met de officiële runner van85 naar115. Vergelijk oorspronkelijke kolommen/rijen en de volledige85-registry opnieuw. Alle115-checksums kloppen; herhaalde deploy verandert de registry niet. Geen ongeldige constraints/indexes.
7. Controleer daarnaast de oorspronkelijke synthetische database-upgrade en bestaande immutable historieguards. Ruim alleen eigen databases, rollen, container en anoniem volume op; vergelijk bestaande inventarissen.

**PASS:** herstel→upgrade→herhaling, behoud van gevulde financiële historie, **47** expliciet geweigerde mutaties/rechtenpogingen. Gemeten herstel-plus-upgradefase: **41.990 ms**; volledige geselecteerde suite: **109.426 ms**. Dit zijn lokale synthetische tijden, geen productie-RTO. RPO/production-RTO blijven onbewezen.

De fixture moest eerst worden aangevuld met het juiste synthetische professionele accounttype en ledgerreden; bestaande databaseguards wezen de onvolledige fixture terecht af. Verder is een testharnesslek hersteld: een mislukte Docker-poortbinding kan een eigen container achterlaten. Cleanup herkent nu uitsluitend de unieke eigen naam, label, ID en status. Geen bestaande container verwijderd.

### Exact upgradepad en compatibiliteit

[Pending-manifest](evidence/p12/pending-migrations.json): exact30 ontbrekende namen in Prisma-volgorde, met Git-LF- én lokale checkout-SHA256 uit de ongewijzigde115-bundel. Vergelijk het daadwerkelijk uit te rollen artifact; hashes niet normaliseren en vervolgens als databasehash presenteren.

- Geen toepassing tussen113,114 en115 openen: de tussenliggende constraints sluiten Academy-aankopen of nulcreditrefunds tijdelijk uit. De kandidaat repareert dit in115. De productiebaseline85 heeft nog geen Academy-tabellen; een andere inmiddels gebruikte baseline vereist opnieuw preflight en eventueel een afzonderlijke forward-only strategie.
- Nieuwe applicatiecode niet op85 starten. Een gesloten UI-gate is geen bewijs van ORM-compatibiliteit.
- **Applicatierollback is niet algemeen veilig.** De oude financiële fout keert terug en oude code begrijpt nieuwe nullable Pro-refunds niet. Vóór nieuwe writes is alleen een apart geteste compatibility-release denkbaar; na nieuwe financiële writes: schrijvers sluiten, forward-fix of afzonderlijk herstelbesluit met providerinhaalcontrole. Geen downmigraties of blinde restore.
- Geen historische migratie of productie-businesscode gewijzigd in P1.2.

### Werkelijke productieherstelbaarheid

**BLOCKED.** De bestaande snapshot is geen bewezen actueel herstelpunt; er is nog geen actuele productie-export met onafhankelijke herstelacceptatie. De eerder aanwezige lokale back-upmap bevatte geen actuele productieback-up. Beperkte bronrechten (inclusief PUBLIC-/functieprivileges), onafhankelijke herstelbare sleutelbewaring, afgesloten restoredoel, actuele capaciteit en uitvoerbare volledige schrijfpauze moeten vooraf aantoonbaar kloppen. Geen securityvoorwaarden versoepelen of broad owner-account stilzwijgend als read-only backupoperator behandelen.

Rollen en databasebrede ACL's zitten niet volledig in `pg_dump`. Voor echte uitvoering is een apart gereviewde owner/rol/default-ACL/extension/RLS-mapping nodig; geen providerbeheerrollen, wachtwoorden of privileges blind kopiëren. Een netwerkloze herstelcontainer gebruikt uitsluitend eigen volumes/tmpfs en heeft geen provider-/appkoppelingen. Beheer- en hosttoegang zijn onderdeel van de vooraf te bewijzen afscherming.

## C — schrijfpauze en hervatting

De bestaande `test-d2d-write-pause.mjs --synthetic-only` is opnieuw gericht uitgevoerd: **11 controles PASS**. Nieuwe login geweigerd; bestaande transactie correct afgerond; idle pool gedetecteerd; onbekende directe login en membership blokkeren sluiten/heropenen; HTTP- en GET-writes weigeren tijdens fence; adapterherstart heft fence niet op; databasefout geeft geen vals webhooksucces; sessie/scheduler hervatten één keer; zes dubbele synthetische callbacks geven één ledgerboeking. De backupfixture weigert drie concrete pogingen: CREATE ROLE, SET ROLE naar de operator en DELETE na uitschakeling van transaction_read_only. Dit bewijst geen algemene read-onlygarantie, met name niet voor PUBLIC large-object-functies. Alleen eigen netwerkloze testcontainer verwijderd; bestaande containers/volumes gelijk gebleven.

Dit zijn **synthetische HTTP-adapters**, geen operationele Vercel-pauze. De echte financiële serviceconcurrency is afzonderlijk getest. Geen claim dat alle productiealiases of directe clients nu gefencet zijn.

Nog verplicht vóór productie:

| Schrijver | Uitvoering door bevoegde operator | Verplicht bewijs |
|---|---|---|
| Vercel-app, server actions, registratie/login/sessies en GET-side effects | Alle productiealiases en oude deployment-URL's voor nieuwe mutaties sluiten; lopende verzoeken laten afronden | Geen bypass via alias/oud artifact; bestaande sessierecords blijven behouden |
| Mollie-webhooks en nieuwe checkouts | Nieuwe checkout blokkeren; webhook tijdelijk snelle niet-200 vóór verwerking | Geen vals200; snapshot van open betaalreferenties en providerprofiel/mode |
| Cron, externe jobs, Jortt, outbox en adminretries | Triggers en handmatige dispatch pauzeren | Geen actieve job/lease of onzekere provideractie |
| SQL-clients, Preview-overrides en bestaande pools | Alle writerlogins in goedgekeurd privaat manifest; onafhankelijke operator sluit logins en laat pools aflopen | `verify` weigert onbekende login, client, prepared transaction of afwijkende rolstatus |
| Providerbeheerders en migratieoperator | Expliciete beperkte uitzondering met vastgelegde verantwoordelijkheid | Geen applicatie/Preview gebruikt de uitgezonderde identity; beheerfreeze afgesproken |

De offline compiler genereert alleen SQL na een expliciet goedgekeurd manifest; hij voert niets uit. `NOLOGIN` sluit bestaande pools niet. `default_transaction_read_only` en een onderhoudspagina zijn geen volledige schrijfbarrière. Onbekende verbindingen niet automatisch beëindigen. Productie is **NOT PROVEN** totdat alle bovenstaande bewijsstukken aanwezig zijn.

Na postflight blijven algemeen verkeer en scheduler gesloten terwijl de operator read-only het volledige providerinterval met overlap en paginering controleert, inclusief nieuwe recurring-betalingen, refunds en chargebacks. App-rooktests en replay mogen niet worden gepland alsof een gesloten runtime-login nog kan schrijven. Daarvoor is de onderstaande expliciete beperkte heropeningsfase nodig. Alleen daarna afzonderlijk goedgekeurde replay op dezelfde provider-ID via bestaande services. Geen nieuwe checkout/incasso of handmatige ledgerinvoer. Onbekende provideracceptatie vereist read-only reconciliatie, geen herhaalde mutatie.

Mollie bevestigt maximaal tien webhookpogingen tot26uur en15seconden timeout: retry alleen is geen herstelgarantie. [Webhookbron](https://docs.mollie.com/reference/webhooks), [gepagineerde betalingen](https://docs.mollie.com/reference/list-payments), opnieuw gecontroleerd op6november2026. Exacte abonnementcontrole gebeurt via de [read-only subscriptionroute](https://docs.mollie.com/reference/get-subscription). Geen echte provideractie in P1.2.

## D — financiële acceptatie: bewezen en nog geblokkeerd

Nieuwe gerichte P1-PostgreSQL-proef PASS: verlopen eerste poging+betaalde retry, twee verlengingen, zes identieke callbacks/één factuur, vertraagde status, factuurrollback/foutregistratie/replay, atomair Jortt-werk, volledige/gedeeltelijke Pro-credit en btw, overcredit/autorisatie, verloren commitbevestiging, onzekere refund/read-only herstel, zes refundaanvragen/één fake provideracceptatie, Jortt verloren response/één boeking, tenantisolatie, zes reviewobservaties/één auditevent, Academy full-credit behoud. Alleen fake providers; bestaande wallet en abonnement veranderen niet door Pro-creditering.

| Product | Technisch bewijs | Open releasevoorwaarden |
|---|---|---|
| Pro | Nieuwe PG-serviceketen PASS; eerdere105-browser/PDF voor klant/OWNER/ADMIN, tenantweigering en historie na opzegging/intrekking hergebruikt | Echte provider/boekhoudkundige acceptatie, historisch herstel, productiecheckpoint/fence, onafhankelijk incidentontvangstbewijs |
| Creditpakketten | Bestaande105 financiële PG/ledger/idempotentie en gedeelde factuur/PDF-autorisatie hergebruikt; gerichte unitregressies | Productgebonden echte Jortt-aflettering/acceptatie; deelcreditroute niet als bewezen presenteren |
| Academy | Fake checkout/commerce-regressies;105- en nieuwe P1-PG full-credit consument/organisatie, bron/btw/idempotentie PASS | Sandbox genereert bewust geen Jortt-job; volledige commerciële Jortt/betaalacceptatie en kopersbrowser ontbreken. Blijft gesloten |
| Compliance F4 | Bestaande105 fake PG: zes callbacks/één factuur, versie/tenant; kandidaatregressies hergebruikt | Vindbaarheid vanuit scan, volledige Jortt/refundroute en juridische holds. Blijft gesloten |

Vindplaatsen: Pro/credits klant `/credits/facturen/[id]` en `/pdf`; beheer `/platformbeheer/financien/facturen/[id]` en `/pdf`. Academy gebruikt `/e-learnings/aankopen/[orderId]/factuur`; geen parallelle administratie. Een fake vergelijkingstest bewijst geen volledig doorlopen productroute. De gedetailleerde PASS/BLOCKED-matrix vanP1.1 blijft gelden; ontbrekende punten zijn niet groen gemaakt.

Iedere geactiveerde betaalroute zonder volledige factuur/Jortt-keten houdt commerciële productie **NO-GO**. Nieuwe productiefunctionaliteit blijft gesloten. Geen automatische release omdat de financiële hersteltests slagen.

## E — exact uitvoeringsplan P1.3 (nog niet geautoriseerd)

Verantwoordelijkheden: Product Owner beslist; één aangewezen onafhankelijke DB/releaseoperator voert uit; platformbeheer controleert app/webhooks en incidenten; boekhouder verifieert factuur/btw/Jortt-aflettering. Benoeming/toegang/achtervang niet afleiden uit eerdere algemene voorstellen. Onderhoudsvenster: **niet goedgekeurd**. Duur bepalen uit de actuele echte herstelproef, niet uit41,99seconden synthetisch.

1. Pin105-kandidaat en eventuele apart goedgekeurde P1.2-testcommit; alle CI/artifacthashes controleren. Live provider-next-date, runtime/databasebinding,85-registry en30pending opnieuw read-only controleren. Iedere afwijking STOP.
2. Accepteer beperkt backupaccount/operatorrechten, TLS-certificaatvalidatie, onafhankelijke sleutel/retentie, afgesloten restoredoel en voldoende capaciteit. Ontbrekend bewijs STOP; geen nieuwe credentials zonder besluit.
3. Keur uitvoeringsmanifest en venster goed. Meet vooraf financiële aantallen/digests/relaties en open providergebeurtenissen in privaat dossier. Geen onnodige persoonsgegevens exporteren naar rapportages.
4. Sluit alle ingangen en dispatch; voer goedgekeurde `close`/drain/`verify` uit. Alleen geplande rollen; geen automatische kills. Noteer T0 nadat alle schrijvers aantoonbaar stil zijn.
5. Maak één actuele consistente TLS-export rechtstreeks versleuteld en herstel geïsoleerd. Verifieer85-registry, tabellen/rijen, factuurbetalingsrelaties, financiële digests, ACL/ownership, RLS, sequenties/constraints/triggers/functions. Sleutel onafhankelijk kunnen terughalen. Als controle faalt: geen migratie.
6. Binnen bewezen fence: officiële Prisma-runner over exact30pending uit manifest naar115; geen seed/reset/resolve, geen verkeer tussendoor. Mislukte/onverwachte migratie STOP en fence behouden.
7. Postflight115/115, checksums, nul unresolved, geldige indexes/FK/unique, beschermde historie en ongewijzigde oorspronkelijke financiële kolommen. Nieuwe data alleen waar gereviewde referentiemigratie dat expliciet vereist; geen stil financieel herstel.
8. Deploy uitsluitend apart goedgekeurde appcommit, onder gesloten ingress. F4, LMS, contactmail, contactreconciliatie/purge gesloten. `PRO_FINANCIAL_CORRECTIONS_ENABLED`, `JORTT_PAYMENT_RECONCILIATION_ENABLED`, `FINANCIAL_CHAIN_REVIEW_ENABLED` standaard gesloten tot afzonderlijk besluit; productie-Jortt-writegate en operatorbinding niet stilzwijgend wijzigen. De gewone recurring-bugfix zelf heeft geen activatiegate: deployment is daarom ook financieel uitvoeringsbesluit.
9. Eerst read-only postflight/providerinventaris via de onafhankelijke operator. Vóór app-login/PDF/replay: bewijs dat alle overige ingangen, oude artifacts, jobs en directe clients **onafhankelijk van NOLOGIN** afgesloten blijven en alleen de beschermde kandidaat voor de bevoegde operator bereikbaar is. Ontbreekt dit bewijs: STOP, runtime-login niet openen. Een onderhoudspagina alleen is onvoldoende.
10. Met afzonderlijk geautoriseerde beperkte heropening: oorspronkelijke LOGIN-standen via `open` herstellen, tijdstip vastleggen en uitsluitend de beschermde kandidaat gecontroleerd laten verbinden. Dit is vanaf dat moment **geen volledige database-schrijfpauze meer**. Controleer nieuwe clients/requests; onverwachte schrijver betekent STOP. Geen gebruik van de brede migratieoperatorcredential als appcredential. Voer login/actuele rollen, bestaande klant/admin-PDF, tenantweigering en gesloten-routes-rooktests uit; daarna alleen goedgekeurde financiële replay met expliciet toegestane factuur/Jortt/mailgevolgen. Bewijs unieke verwerking en geen tweede incasso.
11. Pas na geslaagde beperkte acceptatie en reconciliatie algemeen verkeer en schedulers openen. Controleer jobs/achterstanden en normale autorisatie. Bij mislukking van stap10 niet blind dezelfde `close`-actie herhalen: werkelijke rol-/poolstatus opnieuw beoordelen, opnieuw afsluiten/drainen volgens het goedgekeurde manifest. Alle nieuwe writes sinds beperkte heropening tellen mee in een herstelbesluit.
12. Eerste24uur directe triage van webhook500, betaald-zonder-factuur, onzekere refund en Jortt-uitval; vervolgens dagelijks volledige vergelijking en controle op ontbrekende run na26uur. Platformbeheer wijst incidenten toe. Ontvangst en opvolging buiten de mislukte scheduler aantonen; geen nieuwe alarmdienst geactiveerd.
13. Vóór en na eerste echte Pro-verlenging: juiste provider-ID, organisatie/periode/bedrag/btw, één factuur, klant/admin-PDF, één Jortt-document en bewezen betaalaflettering. Een SYNCED-label alleen is onvoldoende. Stop verdere commerciële vrijgave bij afwijking.

Rollback: bij fout blijven writers gesloten, veilig bewijs behouden en afzonderlijk besluit nemen. Geen `migrate resolve`, downmigration, blind oude app starten of checkpoint terugzetten over nieuwe financiële gebeurtenissen. Herstel naar nieuw doel plus gecontroleerde cutover vergt afzonderlijke bevoegdheid en volledige providerreconciliatie sindsT0. Actuele herstelproef bepaalt feitelijke RPO/RTO; extern betalingsverkeer kan tijdens databasepauze doorgaan.

## F — P1.4 historisch herstel: afzonderlijke opdracht

Exacte gebeurtenissen, bedragen en providerreferenties staan in het private P1/P1.2-dossier. Geen echte factuur of boeking in dit publieke document. Elk dossier krijgt eigen goedkeuring, actor, UTC-moment, bronbewijs, idempotentiesleutel, voor/na-status en uitkomst.

| Geval | Geautoriseerde actie naP1.3 | Vereist eindbewijs |
|---|---|---|
| Ontbrekende oktoberbetaling | Providerstatus/tenant/bedrag/mode/periode lezen, bestaande `processMolliePayment` op dezelfde ID | Eén betalingsregistratie en oorspronkelijke factuur; juiste PDF; geen nieuwe incasso |
| Ontbrekende novemberbetaling | Dezelfde onafhankelijke controle en replay, na oktobercontrole | Eigen factuur/periode; herhaalde/oudere replay verlaagt huidige periode niet |
| Achterlopende Pro-periode | Via bestaande gevalideerde serviceprojectie herstellen; nooit losse SQL-backdate | Providerperiode versus lokale periode verklaard; abonnement niet automatisch opgezegd |
| Administratief open Jortt-documenten | Boekhouder verifieert document en alle ontvangsten; alleen aantoonbaar ontbrekende betaling apart afletteren | Eén boeking, juiste rekening/datum/bedrag; bij timeout eerst lezen, niet opnieuw muteren |
| Eventuele gewenste credit/refund | Apart bron/bedrag/grondslagbesluit; credit, refund en opzegging gescheiden | Correcte bron/btw/nummer, geen overcredit of dubbele refund; abonnement onveranderd tenzij apart besloten |

Stop bij afwijkende identiteit, al bestaande onbekende registratie, gedeeltelijke betaling, onzekere acceptatie, onverklaarde btw/valuta of onvolledig providerbewijs. Replay kan factuur-, Jortt- en mailwerk aanmaken: die gevolgen expliciet meenemen in toestemming, niet omzeilen. Geen bulkherstel of automatische financiële correctie.

Als veilige uitrol niet vóór de onafhankelijk bevestigde incasso haalbaar is: Product Owner/boekhouder besluiten afzonderlijk over een tijdelijke providermaatregel en klantcommunicatie. Eerst actuele provider-cutoff en reeds aangemaakte SEPA-betalingen lezen; wijziging van abonnementplanning garandeert niet dat een bestaande incasso stopt. Geen automatische pauze, opzegging of compensatie.

## Validatie en eindadvies

Aanvullende validatieresultaten worden vastgelegd in [veilige testmetadata](evidence/p12/validation.json). Ruwe logs blijven lokaal; productiegegevens blijven buiten Git. Bestaande105-tests worden alleen herhaald bij relevante wijziging of een concrete testfout. Geen nieuwe UI/financiële functionaliteit of migratie toegevoegd.

- Gerichte financiële/credit-/Academy-commerce/webhookregressies: aanvankelijk 428 PASS, 2 timeouts en 2 SKIP. De twee betrokken bestanden daarna afzonderlijk met één worker en **ongewijzigde 5 seconden limiet**: 10/10 PASS. Daarmee 430 unieke geslaagde tests; de 2 SKIP blijven geen bewijs. Vrij RAM tijdens de parallelle eerste run: circa 1,05 GiB. Geen applicatiecode gewijzigd voor deze timeouts.
- P1 PostgreSQL-serviceketen PASS. Gevulde baselineherstel/upgrade PASS; volledige schrijfpauzefixture 11/11 PASS. Gerichte foutinjectie bezette testpoort PASS: verwachte startweigering en alleen eigen middelen opgeruimd. Bestaande container-/volumeinventarissen behouden.
- Volledige lintcontrole: 0 fouten, 4 bestaande Next-navigatiewaarschuwingen. Laatste gewijzigde scripts apart: 0 fouten/waarschuwingen. TypeScript PASS. Lokale productiebuild met webpack PASS. Bestaande Windows-Turbopack-workerbeperking niet opnieuw onderzocht; de standaard Linux-build van de ongewijzigde105-applicatie was groen.
- Diff/checksums/secrets-/metadatareview PASS. Twee ongewijzigde synthetische loopback-URL's uit de bestaande testharness/CI apart beoordeeld, geen productiecredential. Nieuwe bestanden en toegevoegde regels bevatten geen productie-identiteiten. PR105-worktree en main ongemoeid.
- Gewijzigd: `.github/workflows/learning-publication-integrity.yml`, `scripts/test-learning-publication-integrity-database.ts`, `scripts/fixtures/financial-recovery-baseline.ts`, `scripts/test-wp21-integration.mjs`, `vercel.json`, `docs/README.md`, dit rapport en de twee JSON-bewijsbestanden onder `docs/evidence/p12/`. Geen wijzigingen onder `src/` of `prisma/`.

Nieuwe-head-CI wordt op de Draft PR vastgelegd. Automatische Vercel-deployment van deze P1.2-branch staat uit; er wordt geen deployment gestart. Deze test-PR richt zich op de105-branch om alleen de aanvullende wijzigingen reviewbaar te maken; pas na aparte105-integratie de basis gecontroleerd naar main verplaatsen.

**P1.3 NO-GO:** actuele herstelbare productieback-up en onafhankelijke sleutel-/rolroute, uitvoerbare volledige schrijfpauze, echte provider/boekhoudkundige acceptatie en operationele opvolging ontbreken nog. De synthetische herstel- en migratieblokkade is opgelost; operationele bewijsstukken niet.

Benodigde besluiten, maximaal drie:

1. Bevoegde operator, beperkte bron-/herstelrechten, sleutelbewaring en één concrete actuele versleutelde backup/isolated-restoreproef, uitsluitend na positieve veiligheidscheck.
2. Exact onderhoudsvenster, volledige writersluiting en daarna115-migratie/deployment/heropening, pas na geaccepteerd herstelbewijs en afzonderlijke P1.3-GO.
3. Boekhoudkundig beoordeeld P1.4-herstel per gebeurtenis plus echte financiële acceptatie/incidentopvolging; geen tweede incasso voor reeds ontvangen betalingen.

Eerstvolgende uitvoerbare stap: de ontbrekende operator-/sleutel-/writersvoorwaarden in één privaat uitvoeringsmanifest bewijzen en uitsluitend de actuele herstelproef ter autorisatie voorleggen. De verwachte datum4december verleent geen extra bevoegdheid.
