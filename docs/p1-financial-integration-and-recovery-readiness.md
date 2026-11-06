# P1.1 Financial Integration & Recovery Readiness

Status: **reviewkandidaat; commerciële productie NO-GO**. Uitvoering: 6 november 2026. Uitsluitend synthetische databases, accounts en fake providers. Geen productiebetaling, refund, Jortt-mutatie, mail, productiemigratie, merge of deployment. Bronbranches blijven ongemoeid; PR #64 blijft juridisch concept.

## Bronnen en migratieketen

| Bron | Exacte commit | Migraties |
|---|---|---:|
| main | `a315db8c7738b8862a92d9f8517b0315e3b14d1f` | 95 |
| WP21 / PR #102 | `936782bf97250be58b2904563f738f61f47b3c71` | 113 |
| P1 / PR #104 | `93796bf3634968458391a3cbbd5a693368e1df46` | 96 |
| Integratie | `codex/p11-financial-integration-recovery` | **115** |

De bronunie bevat 114 unieke migraties; alle bron-SQL blijft inhoudelijk ongewijzigd. Een noodzakelijke nieuwe integratiemigratie maakt 115. [Exacte namen, herkomst en SHA-256](evidence/p11/migration-checksums.json). Git-LF en lokale checkoutbytes hebben afzonderlijke hashes; controleer de werkelijke releasebytes tegen de database, zonder checksumverschillen met migrate resolve te maskeren.

P1 is gestart vanaf een groene definitieve GitHub Actions-basis. De bestaande Preview-blokkade betreft database-isolatie, geen toestemming om die beveiliging te versoepelen. WP20's 110 migraties is een andere kandidaat, geen productiebaseline: vergelijk namen en checksums. WP20-infrastructuur wordt niet overgenomen. De nieuwe integratiebranch heeft automatische Vercel Git-deployment uitgeschakeld; geen Preview gestart.

## Opgeloste integratieconflicten

De conflicten zaten in documentatie, vaste testpreflights, rolfixtures, invoice-service, Jortt-gateway, financiële beheeracties/query's en refunds. De gecombineerde versie behoudt WP21's Academy/Compliance-facturen, nullable consumentenorganisaties, accounting-contextcontrole, actuele F3/Academy-functionaliteit en P1's Pro-bronvalidatie en onzekere refunds.

1. Nullable Pro-refunds worden expliciet van purchasegebonden Academy-/creditpakketrefunds onderscheiden. Geen onbewezen non-null-aanname over purchase of organisatie.
2. P1 verving guards die Academy-refunds met nul credits en juridische deelcredits konden blokkeren. Nieuwe migratie `20261106130000_integrate_pro_academy_refund_guards` combineert de bestaande guards met de specifieke Pro-bronvalidator. Geen trigger uitgeschakeld.
3. Een echte aanvullende PostgreSQL-proef vond dat de eerdere Compliance-aankoopconstraint Academy uitsloot. Dezelfde nieuwe integratiemigratie herstelt alle vier productcategorieën, organisatieplicht voor B2B en sandboxplicht voor Academy. Consument- en organisatiecredits worden werkelijk gecommit, met juiste btw/bron en idempotente herhaling. Onbevoegde deelrefund en historievernietiging worden geweigerd.
4. Academy's volledige importchecksummanifest bevat nu exact 115 migraties; onvolledige of afwijkende databases blijven geweigerd.
5. Pro-refundbevestiging controleert providerbetaling, exact bedrag en valuta; read-only lookup behoudt die velden. Afwijkende antwoorden leveren geen onterechte definitieve refund op.
6. De bestaande onderhoudswaarschuwing stond op drie uur bij een dagelijkse scheduler. Zij staat nu op 26 uur, met grenswaardetests.

## Harde financiële release-eis

Product Owner-besluit: iedere definitief geslaagde factureerbare betaling heeft één unieke registratie en precies één geldige oorspronkelijke factuur. Samengestelde facturatie vergt een expliciet afzonderlijk model. Klant, product, periode, bedragen, btw en valuta moeten aansluiten. De betalende klant/organisatie en bevoegde platformbeheerder moeten dezelfde factuur en correcte PDF kunnen zien; andere tenants niet.

Jortt-documentoverdracht en daadwerkelijke betaalaflettering zijn afzonderlijk bewijs. SYNCED of already_paid bewijst geen betalingsboeking. Provideruitval mag geen factuur verliezen. Creditfactuur, geldrefund en opzegging blijven afzonderlijke handelingen. Herstel veroorzaakt geen nieuwe incasso. Opzegging alleen trekt historische factuurinzage niet in; actuele account- en organisatiebevoegdheid blijft vereist.

**Eén geactiveerde betaalroute zonder volledige bewezen keten betekent commerciële NO-GO.** Dit geldt ook voor toekomstige producten. Synthetische groene contracttests vervangen geen echte provider- of boekhoudkundige acceptatie.

## Productmatrix en factuurvindplaatsen

| Product | Klantfactuur/PDF | Beheer |
|---|---|---|
| Pro | `/credits`, `/credits/facturen/[id]`, `/credits/facturen/[id]/pdf` | `/platformbeheer/financien/facturen/[id]` en `/pdf` |
| Creditpakket | Dezelfde organisatiegebonden routes | Dezelfde financiële beheeromgeving |
| Academy | `/e-learnings/aankopen`, `/e-learnings/aankopen/[orderId]/factuur`; consument-/organisatiekoperautorisatie | Dezelfde FinancialInvoice-administratie en beheer-PDF |
| Compliance F4 | Organisatiegebonden factuur/PDF; vindbaarheid vanuit betaalde scan nog apart accepteren | Dezelfde financiële beheeromgeving |

PASS betekent hieronder uitsluitend het benoemde synthetische bewijs. BLOCKED betekent ontbrekend bewijs of bewust gesloten functionaliteit, niet automatisch een defect.

| Controle | Pro | Creditpakket | Academy | Compliance F4 |
|---|---|---|---|---|
| Geslaagd: registratie en oorspronkelijke factuur | PASS PG, eerste en twee verlengingen | PASS financiële PG | Sandboxfactuur/credit commit PASS; volledige checkoutacceptatie BLOCKED | PASS fake PG |
| Klant/admininzage en PDF | PASS echte Edge-browser | PASS gedeelde route-/PDF-regressies; eigen browser niet herhaald | BLOCKED kopersbrowser in deze uitvoering | BLOCKED vindbaarheid vanuit scan |
| Andere organisatie uitgesloten | PASS browser en PG | PASS gedeelde autorisatie | PASS contract/unit; browser BLOCKED | PASS PG |
| Jortt-document | PASS fake registratie/fout/herstel | PASS fake financiële regressies | BLOCKED: sandbox maakt bewust geen Jortt-job | BLOCKED productgebonden eindacceptatie |
| Jortt-aflettering | PASS fake verloren response en read-only bevestiging | PASS gedeeld contract; productgebonden acceptatie BLOCKED | BLOCKED | BLOCKED |
| Dubbele/vertraagde webhooks | PASS PG-concurrency | PASS financiële PG | BLOCKED checkout; credit-herhaling PASS | PASS zes callbacks/één factuur |
| Factuur/Jortt-uitval, herstel zonder incasso | PASS PG-foutinjectie en fake provider | PASS bestaande financiële suites | BLOCKED volledige Jortt-route | BLOCKED volledige Jortt-route |
| Full/partial credit en refundonzekerheid | PASS PG; wallet en abonnement onveranderd | Volledige refund PASS; gedeeltelijke pakketroute BLOCKED | Full consument/organisatie PASS; volledige legal-partial route BLOCKED | BLOCKED productrefundroute |
| Historische inzage na opzegging/rolwijziging | PASS browser na synthetische opzegging en ontzegging na membershipintrekking | Huidige autorisatie PASS | BLOCKED | BLOCKED |
| Echte provider-/boekhoudkundige acceptatie | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| Commerciële publicatie | **NO-GO** | **NO-GO** | **NO-GO, gesloten** | **NO-GO, gesloten** |

De vier productcategorieën hebben daarnaast dezelfde contracttests voor ontbrekende/dubbele registratie, factuur, bedrag/btw/valuta, toegang/PDF, Jortt, credits en refunds. Dit bewijst de vergelijkingsregels, niet automatisch iedere productroute. Een SKIP is geen PASS.

## Dagelijkse reconciliatie en monitoring

De pure `financial-chain-review.ts` vergelijkt bewijs. `financial-chain-review-service.ts` bewaart append-only waarnemingen in bestaande FinancialEvent-records. Geen tweede betaaladministratie, reparatieautomaat of externe notificatiedienst.

- Statussen: In orde, Afwijking, In onderzoek, Hersteld. Een bekende afwijking blijft zichtbaar naast onzekerheid.
- De bounded reader gebruikt uitsluitend Mollie GET/list en Jortt inspectie. Maximaal 5.000 providerbetalingen en 100 refunds per betaling; overschrijding of ontbrekende lokale betaalde registratie in de providercollectie blokkeert complete dekking. Geen echte providerlezing in deze uitvoering.
- Tenantbinding en unieke providerbetalingen zijn verplicht. Onbekende organisatie/productmapping blokkeert in plaats van naar een willekeurige tenant te schrijven.
- Dag/dossier/bewijshash/status vormt een idempotente observatiesleutel. Zes gelijktijdige identieke controles leveren één event op; herstel overschrijft het oorspronkelijke bewijs niet.
- Actieve platformbeheerautorisatie vóór providerlezing en opnieuw transactioneel bij vastlegging; intrekking tijdens de controle voorkomt een succesvolle cyclus. Geen algemene cronbevoegdheid toegevoegd.
- Alleen referenties, codes, product, tijdstip en digest; geen klantnaam, bankgegevens, berichtinhoud of ruwe providerresponse.
- Webhook-500 krijgt bij expliciet geopende monitor-gate een onzekere observatie met gehashte betaalreferentie. Database-uitval geeft uitsluitend een generieke infrastructuurlogcode: permanente alarmontvangst is dan niet gegarandeerd.
- Beheer toont laatste 50 waarnemingen, ontbrekende complete controle na 26 uur en bestaande refund/Jortt-achterstanden. Dit is nog geen volledig operationeel open-incidentregister; onafhankelijk alarmkanaal en ontvangst moeten apart worden geaccepteerd.
- `FINANCIAL_CHAIN_REVIEW_ENABLED=false` standaard. De bestaande dagelijkse onderhoudsrunner start vergelijking alleen bij expliciet geopende gate en bevoegde `FINANCIAL_REVIEW_OPERATOR_ID`. Andere bestaande onderhoudsfasen behouden hun eigen gedrag; de vergelijking corrigeert niets. Onvolledige dekking maakt onderhoud PARTIAL_FAILURE. Alleen complete platformcycli vernieuwen de 26-uursindicator, geen losse tenantcontrole.
- Klant-/beheer-/tenantbrowserbewijs is niet afleidbaar uit een provider-GET en blijft in de reader onbekend. Eerste Pro-periodes die alleen uit de factuur komen, zijn evenmin onafhankelijk bewezen en blijven In onderzoek. Geen kunstmatige groene controle.

Voorgestelde opvolging: dagelijks na onderhoud; ontbrekende volledige cyclus na 26 uur onderzoeken. Betaald-zonder-factuur en webhook-500 direct triage; onzekere refund en Jortt-fout direct zichtbaar en na twee uur achterstallig. Platformbeheer bepaalt dezelfde werkdag een vervolgstap. Boekhouder valideert rekening, boekdatum, btw, credit en aflettering. Echte herstelmutaties vereisen afzonderlijke toestemming; onbekende provideracceptatie nooit opnieuw verzenden. Geen nieuwe operator, planning of alarm geactiveerd.

## Exact migratie- en uitrolplan

Productie85 is het laatst opgegeven/gecontroleerde dossierfeit, geen nieuwe live query. Deze kandidaat heeft **30** ontbrekende migraties tegenover85. De eerder genoemde tien horen uitsluitend bij main95.

1. Pin kandidaatcommit en artifactbytes. Controleer productie-identiteit read-only, exacte85 historische namen/checksums, nul onafgemaakte/mislukte registraties. Stop bij onbekende historie, objecten of checksums.
2. Bevestig actueel herstelbaar checkpoint, onafhankelijke sleutel/restorebestemming en volledige schrijfpauze: applicatie, webhooks, scheduler, sessies, achtergrondjobs en directe clients. Synthetisch herstel bewijst geen productieschrijfpauze. Niet uitgevoerd.
3. Preflight op dubbele PAID-referenties, factuurbronnen/totals en null-bronnen. **STOP bij bestaande Academy-aankopen vóór migratie113 of nulcredit-Academy-refunds vóór114**: de tussenmigraties kunnen die gebruikte database weigeren voordat115 corrigeert. Niet historische SQL herschrijven, triggers uitschakelen of records wijzigen. Een al gebruikte WP21-basis vereist in dat geval een apart gereviewd upgradepad.
4. Met schrijvers stil en gates gesloten: officiële Prisma-runner over exact ontbrekende gesorteerde namen uit het manifest. Geen verkeer tussen113,114 en115. Nieuwe code niet op85 uitrollen: gesloten UI-gates voorkomen geen ORM/schema-afhankelijkheden.
5. Postflight:115 succesvolle registraties, exacte checksums, guards/FK/unique/ACL, ongewijzigde historische kolom-/recorddigests, geen extra betalingen/facturen/refunds. Hervatten pas na apart releasebesluit en smokecheck van exacte applicatiecommit.
6. Rollback is geen downmigration. Oude code begrijpt nullable Pro-refunds niet veilig na nieuwe operaties. Eerst schrijvers stoppen, nieuwe financiële data sinds checkpoint inventariseren en apart herstelbesluit nemen; geen blinde restore of oude code na nieuwe financiële writes.

Geen productie-RPO/RTO claim. Lokale synthetische tijden zijn alleen lokaal bewijs. Checkpoint, schrijfpauze, hersteloperator en releasevolgorde blijven productievoorwaarden.

## Historisch herstelplan — niet uitgevoerd

Exacte productie-ID's blijven uitsluitend in het bestaande private P1-dossier. De volgende bedragen zijn eerdere onderzoeksbevindingen, geen nieuwe providerwaarnemingen.

| Geval | Afzonderlijk geautoriseerde handeling | Preflight/postflight en stop |
|---|---|---|
| Ontbrekende oktober-/novemberincasso's samen EUR118,58 | Na providerlezing bestaande Pro-reconciliatieservice per exacte betaling replayen | Organisatie/subscription/bedrag/valuta/periode sluiten; één oorspronkelijke factuur per betaling; geen nieuwe incasso; afwijking STOP |
| Betaalde Pro-factuur EUR59,29 administratief open | Jortt-document en alle betalingen lezen; alleen bewezen ontbrekende aflettering apart registreren | Boekhouder kiest rekening/datum; bestaande/deel/onzekere boeking: geen tweede registratie |
| Betaald creditpakket administratief open | Dezelfde aparte document-/betaalcontrole | Geen extra credits/factuur/betaling; wallet en ledger vóór/na identiek |
| Gewenste creditering | Bronfactuur, grondslag en bedrag apart goedkeuren; credit, refund en abonnementbesluit scheiden | Onzekere refund alleen lezen/reconciliëren; geen automatische opzegging/nieuwe incasso |

Vóór de eerstvolgende echte Pro-incasso is een nieuwe afzonderlijke read-only productiecontrole vereist: komende incassodatum, actieve commit/schema, historische afwijkingen, klant-PDF, providerbinding en incidentontvangst. Dit is **BLOCKED/niet uitgevoerd** in deze uitsluitend synthetische integratieopdracht.

## Werkelijk uitgevoerde validatie

- Volledige unit/regressiebaseline: **4217 PASS,115 SKIP** (488 geslaagde,24 overgeslagen bestanden). Latere gerichte financiële/PDF/tenantwijzigingen: **406 PASS/44 bestanden**, plus **5 PASS** schedulerautorisatie/foutinjectie. Geen SKIP als PASS geteld.
- PostgreSQL18: financiële basis, P1, marktconcurrency, sessies, notificatieketen, Compliance, contactretentie op huidige en85-basis, audit/register en integriteit/synthetisch herstel PASS. Nieuwe gerichte hertest:85->115,95->115,financiën,P1,Compliance PASS; exacte checksums/herhaalde deploy en historische digests gecontroleerd. Alleen eigen tijdelijke databases/rollen/container/volume opgeruimd.
- Academy:16/16 inhoud-, voortgang-, toets- en certificaatproeven PASS na checksummanifestcorrectie; definitieve manifesthertest eveneens16/16 PASS. Extra werkelijk gecommitteerde consumer/business full-creditproef PASS; exacte btw/bron, idempotentie en negatieve SQL-mutaties.
- Edge/Chromium, productiebuild localhost: OWNER/ADMIN kunnen financiële details en PDF lezen; MEMBER en andere organisatie krijgen geen financiële inzage. Klant ziet eigen PDF, andere organisatie404. Desktop1280x900 en mobiel390x844 zonder overflow; tabfocus aanwezig; geen browser pageerrors; vijf keer uitloggen geeft nul sessies en beveiligde route vraagt opnieuw login. Voor MEMBER zonder klantorganisatie is organisatie-doorverwijzing correct, geen404 vereist.
- Echte200%-browserzoom en schermlezer/PDF-UA zijn **niet uitgevoerd** in deze financiële browserproef; geen eerdere algemene PO-zoomacceptatie hergebruikt als nieuw bewijs.
- Lint: nul fouten, vier bestaande Next-navigatiewaarschuwingen in activate-account/login-gerelateerde componenten. Nieuwe expliciete Prisma-testtypes herstellen de aanvullende TypeScript-inferentiefout; definitieve TypeScriptcontrole PASS, nul fouten.
- Standaard lokale Turbopackbuild tweemaal geblokkeerd door CSS-workerstart (`node process exited before connect`, exit0), ook buiten sandbox. Definitieve productiebuild met webpack PASS; Linux-CI op exacte commit apart beoordelen. Geen codefout of productieperformanceclaim afgeleid uit deze lokale toolingfout.
- Diff- en secrets-/metadata-controle PASS (geen bevindingen); finale CI op de nieuwe commit wordt bij de PR vastgelegd; alleen publieke veilige documentatie, geen lokale screenshots/logs/credentials in Git.

## Vrijgave en nazorg

**Technische integratie: kandidaat ter review; definitieve CI op nieuwe head nog afwachten. Commerciële productie: NO-GO.**

Technisch GO vereist geen onopgeloste conflicten, relevante unit/PG/browser/PDF/autoristests PASS, lint/TS/build verantwoord en ongewijzigde bronmigraties. Productie-GO vereist alle actieve productrijen volledig bewezen, echte provider-/boekhoudkundige acceptatie, historisch herstel, herstelbare database en operationele monitoring.

Na afzonderlijk akkoord: één eerste Pro-betaling en één verlenging, juiste btw/periode/factuur/PDF voor klant en beheer, één Jortt-document en bewezen aflettering. Full/partial credit/refund afzonderlijk accepteren. Dagelijks volledige reconciliatie, nul onverklaarde betaalde-zonder-factuurgevallen, nul dubbele financiële gevolgen en toegewezen incidenten. Bij afwijking verdere commerciële vrijgave stoppen; geen automatische correctie.

Nog benodigde besluiten: (1) technische kandidaatreview en gecontroleerde schema-/releasevolgorde; (2) boekhoudkundige/provideracceptatie plus exact historisch herstel per dossier; (3) benoemde operationele eigenaar, onafhankelijke alarmontvangst en aantoonbare opvolging. Geen van deze besluiten wordt door groene synthetische tests vervangen.

## Bestanden en controlebewijs

[Volledige bestandslijst](evidence/p11/changed-files.json) onderscheidt eigen integratieverschillen van de ongewijzigd overgenomen WP21-scope. [Veilige testmetadata en lokale logdigests](evidence/p11/validation.json). Alle ruwe logs, screenshots en tijdelijke browsertools blijven buiten Git. De twee eerder foutieve browserverwachtingen (redirecttijdstip en organisatie-doorverwijzing) en de ongeldige ingetrokken-membershipteststatus zijn testfixturecorrecties; geen autorisatieversoepeling.

Aanvullende echte browserproef PASS: dezelfde historische Pro-PDF blijft toegankelijk na uitsluitend synthetische opzegging. Na intrekking van het eigen organisatielidmaatschap wordt dezelfde PDF geweigerd. Geen echte abonnementsmutatie of providerverzoek uitgevoerd.
