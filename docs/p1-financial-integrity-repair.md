# P1 - herstel financiele integriteit

Datum: 6 november 2026. Basis: `a315db8c7738b8862a92d9f8517b0315e3b14d1f`.
Scope: uitsluitend codeherstel, synthetische gegevens en fake providers. Productie is niet benaderd of gewijzigd tijdens deze reparatie. De eerdere private onderzoeksbewijzen blijven buiten Git.

## Financiële vervolgkandidaat V3.0

De vervolgbranch bouwt op PR #118 (`821a6949`). De controles en providerbewijzen hieronder uit de oorspronkelijke P1-reparatie hebben hun eigen datum. De actuele resultaten voor de geïntegreerde commit staan op de vervolg-PR.

De financiële PostgreSQL-proef op een lege lokale database verwerkt een synthetische betaalde herkansing via de webhookservice en activeert het abonnement met een bevestigd testmandaat. Dezelfde organisatie doorloopt verlengingen, een mislukte incasso met herstel, gedeeltelijke credits, een fake refund en een apart aangevraagde opzegging. Een tweede abonnement bewijst volledige creditering van een verlengingsfactuur. De proef vergelijkt factuur, btw, audit, Jortt-opdrachten en de ongewijzigde creditwallet. De databaseketen heeft 96 migraties. De eerdere V3.0-controles op betaalidentiteit, schorsing, stornering en vertraagde webhooks blijven van toepassing.

## Root causes en correcties

### 1. Pro-incasso en facturatie

De factuurservice las uitsluitend `firstPaymentPurchase.invoice`. Na een verlopen eerste poging wees deze relatie nog naar die verlopen poging, terwijl een latere betaalde poging wel een factuur had. Een geldige maandincasso rolde daardoor inclusief de financiele registratie terug. Dit was in het voorafgaande onderzoek met PostgreSQL gereproduceerd.

`resolveProInvoiceSource` zoekt nu de unieke betaalde, gefactureerde eerste poging binnen hetzelfde abonnement en dezelfde organisatie. De oorspronkelijke aankooprelatie en historische facturen worden niet herschreven. Meerdere betaalde kandidaten of afwijkende bronidentiteit blokkeren expliciet voor onderzoek.

De periode wordt afgeleid van de oorspronkelijke dienstperiode en de provider-aanmaakdatum van de maandincasso, niet van de latere ontvangstdatum of betaaldatum. Maandeinden blijven aan de oorspronkelijke dag verankerd. Een afwijkende provider-aanmaakdag geeft `PRO_PAYMENT_SCHEDULE_REVIEW_REQUIRED`; daarvoor wordt geen periode gegokt. Een vertraagde webhook voor een oude maand verlaagt de huidige periode niet. PAID is definitief voor hetzelfde providerbetaal-ID; mislukte replays verhogen de retryteller niet opnieuw.

Elke verwerkte status krijgt een append-only betalingsrecord en validatie-event met bronfactuur, providerdatums, periode en bedrag. Factuur, regels, btw en Jortt-werk worden atomair vastgelegd. Fouten leveren een afzonderlijk herstel-signaal op; bij totale database-uitval blijft de webhook HTTP 500 geven zodat de provider opnieuw kan aanbieden. Een verloren bevestiging na commit veroorzaakt bij replay geen tweede factuur. De unieke PAID-index biedt extra databasebescherming.

Ontbrekende webhooks kunnen via de expliciete beheeractie op een Pro-factuur worden ingelezen. Deze controle is begrensd op 500 providerbetalingen, controleert klant/organisatie/abonnement en gebruikt dezelfde betalingsservice. Geen automatische historische backfill bij deployment. De operator controleert een mislukte run en kan dezelfde periode veilig opnieuw aanbieden.

### 2. Pro-creditering en refunds

De bestaande beheeractie ondersteunde alleen een volledige refund van een creditaankoop. Pro had geen zelfstandige creditbron; recurring betalingen stonden bovendien in een ander bestaand model. De ontbrekende creditfunctie en de incassofout hebben dus verschillende directe oorzaken.

Nieuwe diensten binnen de bestaande financiele architectuur:

- `issueProCredit`: volledige of gedeeltelijke creditfactuur op een betaalde Pro-factuur, met originele organisatie, providerbetaling, dienstperiode, btw, regels, volgnummer en audit-event.
- `requestProRefund`: afzonderlijk geautoriseerde geldterugbetaling, uitsluitend tegen een uitgegeven Pro-creditfactuur. Een unieke relatie voorkomt een tweede refund voor dezelfde creditfactuur.
- Creditfactuur en cashrefund veranderen de Pro-status, toekomstige incasso's of de creditwallet niet. Abonnementsbeeindiging blijft de bestaande afzonderlijke handeling.
- Bedragen zijn gehele centen. Cumulatieve verdeling van netto en btw houdt de laatste afrondingscent consistent; totaal crediteren kan de bronbedragen niet overschrijden. De implementatie accepteert het bestaande Pro-contract met een enkele regel/btw-categorie zonder korting. Afwijkende contracten worden niet stilzwijgend omgerekend.
- Seriele transacties, bronrijvergrendeling, idempotency keys, een unieke refundbron en deferred databasevalidatie beschermen tegen concurrerende requests. Andere idempotency keys zijn afzonderlijke operatoropdrachten, maar kunnen samen nooit boven het factuurtotaal komen.
- Alleen actieve platform-ADMIN-gebruikers met actief OWNER/ADMIN-lidmaatschap van de platformorganisatie zijn bevoegd. Een gewone organisatie-eigenaar kan geen platformcorrectie uitvoeren.
- De bestaande FinancialInvoice/FinancialEvent-registratie is de financiele bron; er is geen tweede geldledger of Pro-wallet gemaakt. Het dashboard trekt uitgegeven creditfacturen van omzet/btw af en toont werkelijk terugbetaald geld afzonderlijk.

De providerintentie wordt duurzaam vastgelegd voordat Mollie wordt aangeroepen. Een timeout, netwerkfout of verloren lokale bevestiging is geen bewijs van afwijzing: de reservering blijft behouden, er volgt geen tweede createRefund en reconciliatie zoekt de exacte refundreferentie. Een bekende REFUNDED-status kan niet terugvallen. Historische refunds krijgen dispatchversie 0 en worden nooit automatisch opnieuw verzonden. Het oude, bewezen volledige creditpakketpad blijft behouden.

Definitief FAILED/CANCELED wordt niet automatisch opnieuw aangeboden. Een vervangende cashhandeling vereist afzonderlijke gecontroleerde afhandeling; een onzekere uitkomst zonder vindbare providerreferentie blijft REVIEW_REQUIRED. De administratie mag niet aannemen dat dit geld is terugbetaald.

### 3. Jortt

`already_paid` in de documentaanvraag was geen bewijs van een geboekte betaling. Er ontbrak een afzonderlijke afletteringsstap. De nieuwe betaalservice leest de factuur en betalingen, controleert referentie/bedrag/valuta en valideert de door de operator gekozen tussenrekening. Zij schrijft eerst een unieke intentie, registreert vervolgens hoogstens eenmaal en bevestigt het resultaat met een nieuwe providerlezing. Een bestaande of onbekende boeking, conflict of gedeeltelijk betaald bedrag blijft REVIEW_REQUIRED. Geen automatische tweede boeking na een timeout.

Pro-crediten gebruiken het bestaande Jortt-creditendpoint voor een concept. Het concept-ID wordt duurzaam bewaard, de negatieve regels worden aangepast en de bronfactuur en netto/brutototalen worden teruggelezen voordat het document wordt gefinaliseerd met `send_method=self`. Een onzekere conceptaanmaak zonder teruggevonden identiteit wordt niet herhaald. Een afwijkende providerafronding blokkeert finalisatie en vereist boekhoudkundige controle; een gedeeltelijke credit wordt nooit als volledige credit verzonden.

API-contract gecontroleerd tegen [officiele Jortt v3-documentatie](https://developer.jortt.nl/): documentcreditering, conceptbewerking, betaalmethoden en `/payments/register`. Fake HTTP-transporttests controleren de velden. Echte provideracceptatie en de benodigde boekhoudkundige machtigingen zijn niet door synthetische tests bewezen.

## Beheer en standaard gesloten toestand

Factuurnummers in platformbeheer openen nu de beveiligde detailpagina. Deze biedt afzonderlijke formulieren voor creditfactuur, refund, refundcontrole, ontbrekende incasso's en Jortt-betaalreconciliatie. Een bevestiging en onderbouwing zijn verplicht. Actoridentiteit komt uitsluitend uit de serversessie. Bedragen worden server-side gevalideerd; fouten tonen geen providerinhoud.

| Configuratie | Standaard | Betekenis |
| --- | --- | --- |
| `PRO_FINANCIAL_CORRECTIONS_ENABLED` | uit | Nieuwe beheeracties en Pro-creditfinalisatie |
| `JORTT_PAYMENT_RECONCILIATION_ENABLED` | uit | Afzonderlijke Jortt-betaalregistratie |
| Bestaande Jortt environment/write-guards | ongewijzigd | Vereist naast bovenstaande gates |

Er zijn geen instellingen, sleutels, abonnementen of featuregates gewijzigd. Geen echte betaling, refund of mail uitgevoerd. Automatische factuurmail voor nieuwe Pro-crediten is bewust geen onderdeel van deze actie; PDF en afzonderlijke providerverwerking blijven beschikbaar na vrijgave.

## Migratie en compatibiliteit

Nieuwe migratie: `20261106120000_repair_pro_financial_integrity` (nummer 96 op deze main-basis). Geen bestaande migratie gewijzigd.

- Nieuwe nullable Pro-creditbron in FinancialRefund en nieuwe idempotency key in FinancialInvoice.
- Unieke PAID-providerbetaling, unieke refund-per-credit en cumulatieve Pro-creditbeveiliging.
- Bestaande full-refund-, teken-, totaliteits-, append-only- en immutable-snapshotregels blijven actief. Alleen de specifiek geautoriseerde Pro-creditbron krijgt een aanvullende route.
- Oude refundpogingen worden dispatchversie 0; nieuwe pogingen versie 1. De providerintentie, providerrefund-ID, bron en definitieve refundstatus kunnen niet worden teruggezet.
- Een bestaande dubbele PAID-registratie doet de migratie stoppen. Geen automatische historische deduplicatie.

Deze code is **niet schema-compatibel met productie op 85 migraties**, ook niet alleen door de nieuwe UI-gates uit te laten. Geen directe production-deployment of automatische mergevrijgave. De reeds ontbrekende migraties en deze nieuwe migratie moeten eerst in een afzonderlijk geautoriseerd traject worden beoordeeld en uitgevoerd. De 95 eerdere migratiebestanden hebben ongewijzigde Git-inhoud. De Windows-werkmap gebruikt CRLF; controleer bij de productiepreflight de Prisma-checksums tegen de gereviewde Git-bestanden en de bestaande migratiehistorie. Stop bij een niet verklaard verschil.

## Validatie

Uitgevoerd op de afzonderlijke herstelbranch met de vastgelegde npm-lockfile; geen echte providers.

- Gerichte financiele/credit/webhook/beheeractieregressies: 425/425 PASS (52 testbestanden).
- Geisoleerde PostgreSQL 18: volledige keten van 96 migraties en tweede deploy zonder nieuwe migraties PASS.
- P1-services met echte PostgreSQL en fake providers: verlopen eerste poging + betaalde retry, twee verlengingen, zes gelijktijdige callbacks, vertraagd PAID/FAILED, factuurfout/rollback/herstel, ontbrekende webhook, verloren commitbevestiging, volledige/gedeeltelijke credit, btw, overcredit, tenant-/operatorafscherming, zes gelijktijdige refunds, timeoutreconciliatie en Jortt-herstel PASS.
- Aanvullende integratie: 70 offline herstelguardtests en 11 lokale preflighttests PASS; synthetische upgrade 85 naar 96 plus schone opbouw/checksums/herhaalde deploy en 96 negatieve mutatie-/rechtencontroles PASS; contact 27/27 op 96 en 27/27 op de behouden 85-migratiebaseline PASS. Eigen databases, tijdelijke rollen en container verwijderd, bestaande inventaris gelijk gebleven.
- Bestaande financiele databasesuite: snapshots, signed v2-crediten, wallet/ledger, nummering, kortingscodeconcurrency en mailfoutisolatie PASS.
- HTTP-webhooktests bewijzen 500 zonder interne foutdetails en veilige heraanbieding. De PostgreSQL-proef loopt via de betaalservice met fake gateway; geen claim van echte Mollie-netwerkacceptatie.
- Lint: 0 fouten, vier bestaande ongewijzigde Next.js-navigatiewaarschuwingen in authenticatiecomponenten.
- CI ontdekte een integratieprobleem in de historische D2C-testfixture: deze nam de nieuwe P1-migratie onterecht op in het synthetische register van 85. De fixture sluit nu expliciet ook deze nieuwe kandidaat uit. De operationele D2C-productiepreflight blijft ongewijzigd en weigert alle niet-goedgekeurde extra migraties. Ook de expliciete versieasserties in de synthetische leer-/contacttests en de uitsluitend lokale WP17-acceptatiecontrole zijn afgestemd op 96; de contactbaseline blijft exact 85. Geen rechtencheck is verwijderd.
- Diff-check en gerichte secrets-/operationele-metadatacontrole: PASS; uitsluitend synthetische fixtures en lokale loopbackconfiguratie in de tests.
- TypeScript: PASS. Build: PASS; drie bestaande waarschuwingen over dynamische bestandstracing in kennisbron-/leerbestandsopslag.
- PostgreSQL-driver meldt bij bestaande serializable concurrency een pg@9-deprecationwaarschuwing; de huidige pg@8-controles slagen.
- De GitHub-checks voor financiÃ«le integriteit en Trading access (inclusief build) slagen op commit `641d88d`. Vercel Preview wordt geblokkeerd door de bestaande `PREVIEW_DATABASE_ISOLATION_REQUIRED`-guard; deze is niet omzeild. Definitieve checks op de PR-head staan in de PR-beschrijving.
- Geen productieomgeving, bestaande database of bestaande Docker-resource aangepast. Eigen tijdelijke databases en container zijn verwijderd.
- Echte provideracceptatie, boekhoudkundige review en ingelogde browseracceptatie van de nieuwe formulieren blijven apart open. Er wordt geen 200%- of schermlezer-PASS geclaimd zonder uitvoering.

## Historisch herstel - apart uitvoeringsplan, niet uitgevoerd

Het private P1-dossier bevat de concrete betaal-/factuurreferenties. Publiceer deze niet in deze openbare PR.

1. Bevestig opnieuw read-only de historische betaalstatus, provideridentiteit, organisatie, mandaat, contractperiode en bestaande facturen. De onderzochte ontbrekende maandincasso's zijn herstelkandidaten, geen nieuwe betaalopdrachten.
2. Keur de migratie-/releasevolgorde en herstelbaarheid afzonderlijk goed. Laat de nieuwe gates gesloten tijdens schema- en applicatieverificatie.
3. Autoriseer een benoemde platformbeheerder en de exact afgebakende historische abonnementsperiode. Gebruik de Pro-reconciliatieactie. Controleer aantallen, bedragen, btw, bronkoppelingen, dienstperioden en idempotente replay. Stuur geen nieuwe incasso aan.
4. Laat een boekhoudkundig bevoegde reviewer de Jortt-documenten, Mollie-afrekening, eventuele bankimport, tussenrekening en boekdatum controleren. Match reeds geboekte betalingen eerst; voorkom dubbele aflettering met handmatige of automatische bankverwerking. Activeer de betaalroute pas afzonderlijk na akkoord.
5. Beoordeel ieder gewenst creditbesluit apart: bedrag, grondslag, oorspronkelijke factuur en gewenste cashrefund. Een factuurcorrectie betekent niet dat Pro wordt stopgezet of dat een refund is uitgevoerd. Keur annulering en eventuele mail afzonderlijk goed.
6. Stop bij bedrag-, bron-, rechten-, datum-, boekings- of checksumverschillen. Na onbekende provideracceptatie uitsluitend teruglezen en bewijs verzamelen; geen intenties wissen of idempotency keys vervangen om een retry te forceren.
7. Registreer operator, besluit, uitgevoerde stap en uitkomst in het private uitvoeringsbewijs. Exporteer geen persoonsgegevens naar publieke CI/PR-artifacts.

Rollback: sluit de twee nieuwe gates; stop nieuwe herstelacties en behoud alle immutable documenten, intents en events. Rollback van applicatiecode vereist een afzonderlijke compatibiliteitscontrole: oudere code veronderstelt een niet-null aankoopbron voor iedere refund. Geen destructieve down-migratie en geen automatisch verwijderen van uitgegeven creditfacturen/boekingen. Kies bij al aangemaakte Pro-crediten een forward fix.

## Advies

Technische integratie: GO voor review en geisoleerde integratie na groene checks; geen productie- of mergevrijgave op het huidige 85-migratieschema. Productieherstel: NO-GO totdat migratie/release, historische herstelset en boekhoudkundige provideracceptatie afzonderlijk zijn goedgekeurd. Onzekere provideruitkomsten blijven expliciet geblokkeerd.
