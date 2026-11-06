# P1.7 — financiële releasegereedheid

Datum: 6 november 2026. **Productie: NO-GO.** Dit is een aanvulling op P1.2–P1.6, geen nieuwe betaaladministratie of herstelroute. Infrastructuuridentiteiten, providerreferenties en klantgegevens blijven uitsluitend in het private dossier.

## Kandidaat en hergebruik

| Onderdeel | Exacte bron | Controle |
|---|---|---|
| PR105 | `db959b4b48c072df37a94f42e983c5fcbe142173` | Open Draft; gerapporteerde GitHub-checks SUCCESS |
| PR106 | `179f2e9cfde426069eb11ce83b8351ba12ebe770` | Open Draft; gerapporteerde GitHub-checks SUCCESS |
| PR107 | `32258c4eb9b0849d423fc250276a7ca0c53a63ab` | Open Draft; gerapporteerde GitHub-checks SUCCESS; mergeable |
| Productie | `a315db8c7738b8862a92d9f8517b0315e3b14d1f` | READY; dezelfde-dag read-only bewijs: 85 migraties, nul onafgemaakte |

De keten105→106→107 is met Git-ancestry gecontroleerd. Alle115 migraties hebben op deze drie heads identieke Git-LF-checksums. De30pending-bestanden komen exact overeen met `docs/evidence/p12/pending-migrations.json`. Geen schemawijziging toegevoegd. De bestaande gevulde85→115-herstelproef, historische checksums inclusief verklaarde CRLF-varianten en47 negatieve integriteitscontroles blijven geldig; niet onnodig herhaald.

P1.7 is gestapeld op107 en mag niet los op productie-main worden toegepast. Integreer later de afhankelijkheden in volgorde105→106→107→P1.7, telkens met actuele base/CI-review. Geen dubbele cherry-picks van onderliggende wijzigingen. Een mergeable-status vervangt geen vrijgave.

## A — R1: nieuw bewijs corrigeert een eerdere aanname

De eerdere P1.6-fixture had geen REPLICATION-attribuut. Een nieuwe netwerkloze PostgreSQL18.6-proef toont:

- Een niet-superuser met CREATEROLE en ADMIN OPTION kan lokaal LOGIN/NOLOGIN op een REPLICATION-doelrol wijzigen. Het wijzigen van REPLICATION zelf wordt geweigerd. De eerste test faalde doordat zij de eerdere onjuiste aanname als verwachting had; daarna zijn de werkelijk waargenomen roltoestanden expliciet getest.
- NOLOGIN verhindert nieuwe verbindingen, maar een bestaande verbinding kon nog schrijven. De bestaande `fenceSql(...,'verify')` weigerde terecht zolang die verbinding bestond. Na gecontroleerd sluiten van uitsluitend de testsessie slaagt verificatie.
- Een onbekende CONNECT-login blokkeert verificatie én heropening. Een reader kan geen DML/DDL/TEMP/large-object-aanmaak, privilege-escalatie of fence uitvoeren. De synthetische herstelrol kan niet op de bron verbinden.
- Dit is géén bewijs dat Neon de voorgestelde delegatie ondersteunt. Provider-owned PUBLIC-rechten, veilige ADMIN-verlening en privilege-escalatiemogelijkheden blijven open. De P1.6-waarschuwing dat ADMIN een eigen SET-membership kan verlenen blijft geldig: een fenceoperator is geen read-only rol.

De brede formulering in [ALTER ROLE](https://www.postgresql.org/docs/18/sql-alterrole.html) verschilt van het waargenomen LOGIN-gedrag. De afzonderlijke attribuutcontroles in [upstream PostgreSQL18-broncode](https://github.com/postgres/postgres/blob/REL_18_STABLE/src/backend/commands/user.c) ondersteunen deze observatie. Geen live ALTER/GRANT/REVOKE uitgevoerd om dit op productie te proberen.

Het officiële Support center is daadwerkelijk geopend en de juiste organisatie geselecteerd. Free toont alleen AI/community; geen technisch ticketformulier. De geschoonde vijfdelige ondersteuningsvraag is privé gereed maar **niet verzonden**. Er is geen schriftelijk Neon-antwoord. AI/community is geen providergoedkeuring. Geen betaald plan aangeschaft. Zie [Neon Support](https://neon.com/docs/introduction/support).

| Route | Uitvoerbaarheid en rechten | Herstelbaarheid/kosten | Besluit |
|---|---|---|---|
| Huidige R1 + versleutelde dump | Synthetische grenzen bewezen; Neon-ACL/delegatie nog niet ondersteund bevestigd | Bestaande streamende export; onafhankelijke sleutel en writersluiting nodig; geen nieuwe dienstkosten | BLOCKED, geen ruimere operator als workaround |
| Neon PITR/branch/snapshot | Officieel ondersteunde primitives; bron-SQL-reader mogelijk niet nodig | Overgenomen credentials, beheerderstoegang, quota, restoretermijn en kosten vooraf bewijzen; bestaande snapshot behouden | BLOCKED voor uitvoering; geen geïsoleerde bestemming aannemen |
| Geïsoleerde lokale PostgreSQL18-restore | Bestaande netwerkloze harness; geen hostpoorten, alleen eigen resources | Geen abonnementskosten; RAM/host/sleutelvoorwaarden en actuele echte restore nog open | Technische voorkeurskandidaat, operationeel NO-GO |

[Neon Backup & restore](https://neon.com/docs/guides/backup-restore) noemt één handmatige snapshot op Free en snapshotopslag tegen tarief. Dit is geen bewijs van een kosteloze extra kopie binnen de actuele capaciteit. Een branch is niet vanzelf afgeschermd tegen overgenomen credentials. Geen nieuwe infrastructuur aangemaakt.

## B — capaciteit, encryptie en sleutel

Actueel privaat gemeten: RAM onder de bestaande3GiB-grens; schijfruimte boven de eerder berekende lokale behoefte. Capaciteit is een tijdgebonden preflight, geen blijvende garantie. Procesgeheugen is read-only gegroepeerd; geen bestaande processen/containers gestopt. Eigen ongebruikte browser-/appvensters kunnen door de operator worden gesloten, waarna3GiB opnieuw aantoonbaar beschikbaar moet zijn. Geen andere bestaande afgeschermde herstelmachine bewezen; WP20 blijft uitsluitend synthetisch.

Concrete correctie: `encrypted-archive.mjs` las het gehele versleutelde archief opnieuw in RAM voor SHA256. De checksum wordt nu in64KiB-chunks berekend. Meerchunkshash en corruptieweigering getest. Authentieke decryptie en PGDMP-controle blijven vóór restore verplicht; foutbuffers worden gewist. De bestaande begrensde decryptiebuffer blijft nodig, dus deze optimalisatie verlaagt de3GiB-hersteleis niet. Geen plaintextdump op schijf.

Onafhankelijke sleutelbewaring blijft BLOCKED. Bestaand ontwerp: twee afzonderlijk versleutelde offline kopieën, fysieke locaties gescheiden, ontgrendeling apart, primaire beheerder en aangewezen achtervang in privéregister. Eerst feitelijke media/toegang en onafhankelijke synthetische recovery door beide beheerders bewijzen; daarna pas echte sleutelverstrekking. Een tweede lokale map of alleen een actieve laptopsessie is onvoldoende. Verlies: export/restore stoppen, toegang en eventuele blootstelling onderzoeken, afzonderlijk goedgekeurde sleutel-/credentialprocedure; nooit het enige herstelpunt automatisch verwijderen.

De bestaande export→GnuPG→integriteitscontrole→netwerkloze restoreprocedure blijft leidend. Vóór echte uitvoering: exacte bronidentiteit/TLS/read-only rechten, volledige schrijfpauze, sleutelterughaaltest, capaciteit, maximale duur/retentie en cleanup vooraf vastleggen. Financiële postrestorecontrole:85registry/checksums, betaling/factuur/organisatie/abonnementrelaties, bedragen/btw, immutable historie, constraints/triggers/functions, rollen/ACL's en financiële digests. Geen nieuwe synthetische encryptieronde nodig waar broncode ongewijzigd bleef; de gewijzigde hashgrens is afzonderlijk getest.

## C en D — betaalcategorieën en geselecteerd herstel

| Categorie | Technisch bewijs en locatie factuur | Openstaande vrijgave |
|---|---|---|
| Pro | Hergebruikt P1/P14-PG/browserbewijs: eerste betaling, twee verlengingen ondanks verlopen eerste poging, exacte datum/periode/btw, replay/concurrency, volledige/gedeeltelijke credit, refundonzekerheid. Klant `/credits`, beheer `/platformbeheer/financien/facturen`, beide eigen PDF-routes. | Echte providerbinding/boekhoudkundige acceptatie, historische correcties en operationele alarmontvangst |
| Credits | Aanvullende echte service/PG-proef met fake provider: zescallbacks, één factuur, één creditmutatie,25credits, vertraagde pending zonder rollback; mailweigering behoudt factuur en herstelt via fakeacceptatie; Jortt-document en aflettering idempotent. | Echte provideracceptatie; gedeeltelijke pakketcredit blijft afzonderlijk productbesluit |
| Compliance | Aanvullende financiële serviceproef met synthetische DRAFT-conceptbinding, exact2495netto/524btw/3019bruto, factuur/PDF/Jortt en tenant/admin-inzage. Bestaande F4-concept/checkout/accessproeven hergebruikt. | Dit bewijst niet de gehele geïntegreerde F4-checkout.46claims/141bindingen/9holds blijven, commerciële/publicatiegate gesloten; productgebonden refund en volledige browserreis niet vrijgegeven |
| Academy | Bestaande echte PG-sandboxfacturen en volledige consumer/businesscredits behouden; gerichte commerce/refundregressies. | Sandboxdocumenten gaan opzettelijk niet naar live Jortt. Geen kunstmatige queue of fiscale goedkeuring toegevoegd. Prijs/btw/content/publicatie en volledige commerciële providerketen blijven NO-GO |

Aanvullende tests lezen dezelfde facturen in klant- en beheerservices, weigeren andere tenant/ongeautoriseerde beheerder en genereren echte PDF-bytes. Eerdere HTTP-PDF-autorisatie- en browserproeven worden hergebruikt; geen nieuwe browseracceptatie of PDF/UA-claim. Factuurinzage omvat laatste50: dit is geen onbeperkt historisch archiefbewijs.

Het private P14-manifest blijft negen afzonderlijke gevallen bevatten. A/B: twee geselecteerde betaalgebeurtenissen synthetisch via bestaande `reconcileProPayments`, geen bulkbackfill of nieuwe incasso. C: periodestand en replay bewaren latere periode. D1/D2: bestaande Pro/credit-documenten en afzonderlijke fakeaflettering; D-A/D-B: geselecteerde synthetische historische facturen naar fakeJortt, verloren acceptatie gevolgd door uitsluitend provider-read, één boeking en onveranderd factuurnummer. Audit en autorisatie/idempotentie blijven onderdeel van de PG-proef.

E1/E2 zijn géén nieuwe incasso's: definitieve uitbetaling/kosten/bankmatch tegenover een slechts geplande uitbetaling. De dry-run laat beide zonder boeking: onafhankelijke bank-/clearinginformatie en boekhoudkundige rekening/datum ontbreken. Een netto uitbetaling is niet het bruto factuurbedrag. Geen negen-uit-negen-productieherstelclaim. Het volledige manifest en de geselecteerde echte identiteiten blijven privé; voor tests uitsluitend fictieve identiteiten.

## Financiële bewaking

De bestaande financiële reader detecteert ontbrekende factuur/betaalkoppeling, Jortt-afwijking, refundonzekerheid en onvolledige dekking. Bestaande webhook-500-observatie en financiële onderhoudsindicator worden hergebruikt. Na26uur zonder volledige dagelijkse cyclus is onderzoek nodig; een losse tenantcontrole vernieuwt die indicator niet. Bij database-uitval kan ook de incidentopslag falen: generieke logcode is geen bewijs van alarmontvangst.

Een nieuwe synthetische ontvangertest gebruikt de bestaande onafhankelijke monitoradapter: scheduler ontbreekt, ontvanger eerst onbeschikbaar, daarna één ontvangstbevestiging, geen dubbele melding, herstelmelding. Dit is alleen bewijs van adapter-/ontvangstcontract in de test. De bestaande contact/scheduler-monitor is geen reeds operationele financiële watchdog. Een permanente onafhankelijke uitvoerder, financiële cycluswaarneming en echte gecontroleerde ontvangstbevestiging blijven BLOCKED; geen nieuwe externe alarmdienst of e-mail geactiveerd.

Dezelfde-dag analyse van twee mislukte onderhoudsruns blijft geldig: setup slaagde, dispatch faalde generiek; de oude detailrespons is niet beschikbaar. Synthetische401/403/429/500/503/timeout/DNS/ongeldige-responsgevallen bewijzen dat dezelfde foutcode meerdere oorzaken kan hebben. Geen onbewezen concrete oorzaak toegewezen. Latere schedulerhervatting is geen bewijs dat alle geplande intervallen zijn uitgevoerd.

## F — WP20

Bestaande beschermde Preview read-only opnieuw READY bevestigd; andere broncommit en110migraties dan de financiële kandidaat. Reeds bewezen synthetische gebruikers/OIDC/private opslag/rolgrenzen niet opnieuw opgebouwd. Bestaande gegevens niet overschreven. De twee Preview-deployments zijn verbruikt.

Een nieuwe geïntegreerde proef vereist afzonderlijk: exacte financiële kandidaat, gecontroleerde110→115-upgrade uitsluitend op de acceptatiedatabase met behoud van synthetische gegevens, één extra beschermd Preview-deployment, vooraf quota/kosten/geen overgenomen providercredentials bewijzen, fakeproviders, gesloten niet-goedgekeurde gates. Geen derde deployment uitgevoerd. Geen productieback-up naar WP20.

## Validatie P1.7

Nieuwe gerichte bewijsstukken:

- PostgreSQL18.6-roltest PASS: REPLICATION-attribuut versus LOGIN, bestaande sessie, readerweigeringen, onbekende schrijver en veilige heropening. Cleanup PASS, bestaande middelen behouden.
- Financiële PostgreSQL-suite inclusief nieuwe product-/historische gevallen PASS,36,245seconden in de finale uitvoering;115migraties, herhaalde deploy zonder pending en cleanup PASS. Alleen eigen nieuwe testdatabase/container/volume gebruikt.
-133/133 gerichte Vitest-controles,9bestanden;23/23 Node-tests voor archief/fence/monitor. GeenSKIP.
- TypeScript PASS. Volledige lint0fouten; vier bestaande Next-navigatiewaarschuwingen. De gewijzigde scripts worden aanvullend apart gecontroleerd.
- Lokale webpack-productiebuild PASS. Diff-check en secrets-/productiemetadatascan van alle negen gewijzigde/nieuwe publieke bestanden PASS. Geen Turbopack-heronderzoek. Nieuwe-head-CI wordt afzonderlijk op de Draft PR gecontroleerd.

Eerdere testfouten blijven transparant: verkeerde REPLICATION-verwachting, ongeaccepteerde lokale mailtransportfixture en ontbrekende synthetische Compliance-conceptbinding. Geen productiecode of beveiliging hiervoor uitgezet. Prisma-client moest in de nieuwe worktree eerst gegenereerd worden met uitsluitend een onbereikbare synthetische URL. Een eerste npm-exec-run koos een bestaande alpha-Node en gaf een versiewaarschuwing; de finale PG-uitvoering gebruikt de expliciete geïnstalleerde Node-route. Bestaande pg-concurrent-query-deprecatie blijft zichtbaar, geen integriteitsfout.

Gewijzigde bestanden: `ops/recovery/encrypted-archive.mjs`, bijbehorende nieuwe test, `scripts/test-p17-role-boundaries.mjs`, `scripts/test-p1-financial-database.ts`, `ops/marketplace-notifications/monitor.test.mjs`, `.github/workflows/p1-financial-integrity.yml` (gerelateerde operatorchecks), `vercel.json` (alleen automatische deployment van deze branch uit), dit rapport en `docs/README.md`. Geen applicatie-, Prisma-schema- of migratiebestanden gewijzigd. De gewijzigde scripts: lint0fouten/0waarschuwingen.

## G — releasevolgorde en besluiten

| Werkstroom | Technisch | Operationeel/commercieel |
|---|---|---|
| A R1 | Nieuwe rechten-/sessiegrenzen synthetisch bewezen; eerdere aanname gecorrigeerd | NO-GO: Neon-ondersteuning en exact bevoegdhedenmodel |
| B herstel | Bestaande encryptie/herstelbewijzen + streaminghashcorrectie | NO-GO: capaciteit, onafhankelijke sleutel, echte checkpoint/restore en volledige fence |
| C financieel | Productgebonden bewijs uitgebreid; geen tweede administratie | NO-GO zolang actieve ketens/provideracceptatie en alarmopvolging niet volledig bewezen zijn |
| D historie | Synthetische geselecteerde replay/reconciliatie; settlementgevallen blijven zonder mutatie | NO-GO: per-gebeurtenis operator/boekhouder/PO-besluit |
| E kandidaat |115exact, ancestry en schema ongewijzigd; zie finale controles | Geen merge/deploymentvrijgave |
| F acceptatie | Bestaand beschermd target beschikbaar | Nieuw geïntegreerd deployment vereist akkoord |
| G incasso | Actieve maandelijkse providerstatus read-only gezien | 4december2026 EXPECTED; exact provider-nextPaymentDate niet aangetoond |

Eerstvolgende werkdag, op prioriteit:

1. **R1/herstelbesluit:** officieel schriftelijk Neon-antwoord of expliciet gereviewd ondersteund alternatief met exacte rechtenmatrix; tegelijk onafhankelijke sleutelmedia en RAM vrijmaken. Pas na allePASS één actuele versleutelde checkpoint/isolated-restore autoriseren. Geen securityverlaging bij tijdsdruk.
2. **Acceptatie-/uitrolbesluit:** één extra beschermde WP20-kandidaatproef. Daarna afzonderlijk onderhoudsvenster, volledige ingress/writerstop/drain/verify, exact30migraties naar115, beschermde applicatie, beperkte heropening. Onbekende schrijver, checksumverschil, onafgemaakte migratie, onbewijsbare restore of onverwachte provideractie: STOP. Na nieuwe writes geen blinde oude-snapshotrollback; eerst alle nieuwe financiële gebeurtenissen veiligstellen en gecontroleerd vooruit herstellen.
3. **Financieel besluit:** boekhoudkundig akkoord op individuele historische gevallen, echte provideracceptatie en onafhankelijke alarmontvangst met eigenaar/achtervang. Vóór volgende incasso exact providerplan en reeds aangemaakte SEPA controleren. Als tijdige acceptatie niet aantoonbaar haalbaar is: afzonderlijk voorstel voor uitsluitend toekomstige inning, klantcommunicatie/toegang en herstart; een reeds ingediende incasso stopt niet vanzelf door abonnementswijziging. Geen fallback uitgevoerd.

**Eindgrens:** geen productie-export, restore, nieuwe rollen, schrijfpauze, migratie, deployment, merge, echte betaling/refund/credit, Jortt-mutatie, mail of featuregateactivering uitgevoerd. Productie blijft NO-GO.
