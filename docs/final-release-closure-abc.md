# Gecombineerde afronding A/B/C — 29 oktober 2026

**Technische voorbereiding opgeleverd; productiemigratie en volledige commerciële
vrijgave NO-GO.** Dit dossier is geen toestemming voor uitvoering. De ontbrekende
bewijzen, begrensde uitvoeringsvoorstellen en menselijke besluiten staan hieronder.
Geen nieuwe algemene audit; ongewijzigd bewijs is hergebruikt met de genoemde grenzen.

## 1. Actuele basis en reviewpakketten

| Onderdeel | Gecontroleerde toestand |
|---|---|
| GitHub main / migratiebundel | `46962cff1724e87e5f33697173cbb9168d6f9da3`; #67/#69 gemerged |
| Vercel Production | `platform`, `prj_a2ifiMVtQjDXYBQQn0ZjZcmvSkqb`, team `workmatchrs-projects`; `dpl_HPDDANHTLKB6tF613RZzs51dj2W8` READY, dezelfde SHA; www.workmatchr.nl als alias |
| Diagnose | ENABLED=false, UNTIL=2026-10-28T20:03:11Z. Oude sluitcontrole404; geen nieuw geautoriseerd venster |
| Neon connector | `billowing-term-15867762` / production / `br-odd-smoke-agf0wj9j` / `ep-royal-sound-agegzj34` / neondb / neondb_owner; READ ONLY |
| Registry 29 oktober 07:56 UTC | 85 succesvol, 0 failed/unfinished/rolled-back/onbekend; 0 checksumverschillen; repository93 |
| Integriteit | Vier beoordelingen, 38 resultaten, twee Requests/twee Assignments; nul ongeldige indexen; alleen NL_ARBO_LEGACY/1 PUBLISHED; Learning-tabellen/visibilityCondition afwezig |
| Productiemodules | Homepage200; F4 `/wijzers/compliance/v2` en LMS `/e-learnings/aanbod` bevatten de gesloten404-boundary in streaming200. Geen activering |
| #39 A06 | Draft OPEN, niet gemerged; `afd46590901cb31b1aa154c4ca28744a4e622764` |
| #40 A07 audit | Draft behouden, `6292c312a6d81a1493ac63f680d004db87be48c6`; niet gewijzigd |
| #64 juridische review | `74c6b2077ebdf1d75b55e6dd004b66545c632c47`; actuele main geïntegreerd, retarget naar main uitgevoerd; Draft behouden, exact tien PR-bestanden |
| #73 WP17B | `a64c9cab0ace3672b26e9d6511a24d4d2291a26b`; afgezonderde TLS-correctie, fixtures en browserbewijs; geen Production-runtimewijziging |
| Reviewvolgorde | #70 WP15 → #71 WP16 → #72 WP17 → #73 WP17B → dit ABC-bewijspakket. Dit is een reviewvolgorde, geen mergeautorisatie |

[Nieuwe read-only registry/ACL-evidence](evidence/abc/production-readonly.json).
Connectoridentiteit is nadrukkelijk geen bewijs dat de Vercel-app deze database of
rol gebruikt. Actuele envmetadata bewijst alleen de configuratiescope, geen inhoud.

## 2. A — Database en beheer

### A1. Runtimebinding: concrete beperkte vervolgstap

De bestaande diagnose uit #69 controleert exact-true gate, maximaal 15 minuten,
bestaande constant-time maintenance-auth, intentheader, geen queryparameters,
READ ONLY, statementtimeout 5 seconden en transactiebudget 8 seconden. Generieke fouten zonder ruwe
adapterlog, no-store/noindex-responses. Gebruik geen finance/outbox-maintenance.
Tests voor gesloten gate, auth en foutafhandeling zijn behouden.

Op 28 oktober is het expliciet goedgekeurde venster éénmaal uitgevoerd: de enige
geauthenticeerde POST gaf 401, vóór databasegebruik. Daarna flags gesloten en dezelfde
commit gesloten uitgerold. Zie [WP17B](wp17b-runtime-verification-and-acceptance-environment.md).
Geen geldige Production-maintenancecredential bewezen. Een aanvullende gesloten
POST op 29 oktober werd door automatische autorisatiereview vóór uitvoering
geweigerd; geen alternatieve route gebruikt. De vorige toestemming is verbruikt.

| Target | Te bewijzen / concrete blokkade |
|---|---|
| Production platform | Bevoegde operator moet bestaande geldige maintenance-auth via veilig kanaal gebruiken; geen secretwaarde in chat. Runtimehost/project/branch/db/rol/TLS nog onbekend |
| Standaard Preview platform | Oud aangetroffen target is gearchiveerd; geen actuele werkende runtime. Geen Preview CRON_SECRET-metadata. Eerst apart geïsoleerd target/auth vaststellen |
| Preview `codex/jortt-technical-identity-hardening` | Eigen DATABASE_URL én unpooled override; werkelijke identiteit/rechten niet bewezen |
| Preview `codex/arbo-guide-account-access` | Eigen sensitive DATABASE_URL; identiteit/rechten niet bewezen |

Die drie Previewbindings mogen geen groene isolatieclaim krijgen op basis van het
nieuwe WP17B-project. Ook aanwezige Preview-provideroverschrijvingen (Resend/Mollie/
Jortt/Blob) zijn geen veilige testconfiguratie. Niet kopiëren naar acceptatie.

**D1 uitvoeringsvoorstel, niet uitgevoerd:** Production platform/team hierboven,
exact commit `46962cff…`, operator workmatchr/OWNER met werkelijk geldige bestaande auth.
Eén UTC-startmoment T0 bij uitvoering vastleggen, twee genoemde diagnoseflags true
en T0+15min; gecontroleerde redeploy van exact die SHA; één geauthenticeerde POST
naar `/api/maintenance/database-identity` met `x-workmatchr-diagnostic: database-identity-v1`.
Geen body/query. Metadata alleen: deployment/SHA/omgeving, endpoint/project/branch/db,
rol/rechten, TLS/read-only en gates. Bij401/503/mismatch STOP, geen retry/verlengen.
Daarna altijd false/verlopen, dezelfde SHA opnieuw gesloten uitrollen, gesloten
404 en ongeautoriseerde weigering controleren. Beide deployments horen bij het
apart te autoriseren venster; verloopt de deadline tijdens build, geen verlenging.

**Beperking vóór D1:** huidige Production-diagnose gebruikt `pg_stat_ssl` van de
backend-hop. WP17B bewees met echt Neon dat die false kan zijn terwijl de client
gevalideerde TLS1.3 gebruikt. #73 herstelt dit voor de bestaande beperkte Previewpool,
niet voor Production. Een503 mag niet als onveilige TLS of correcte identiteit
worden geïnterpreteerd. Beheerder moet de geldige auth én bruikbaarheid van dit
transportbewijs oplossen vóór een nieuwe productieactie; geen tweede diagnose-API.

**D2 Previewvoorstel:** eerst per target één concreet deployment/SHA en expliciet
geïsoleerde endpoint/branch/db/rol aanwijzen. Hergebruik #69/#73-probe, maximaal 15 min,
eigen maintenance-auth, fake providers en F4/LMS uit; na één probe flags dicht en
gesloten redeploy. Overridebranches niet ongemerkt vervangen of hun oude commits
uitrollen. Zolang geen target is aangewezen is dit nog niet uitvoerbaar autoriseerbaar.

WP17B heeft al een nieuwe lege synthetische Neon-rootbranch en beperkte runtime,
maar de eerste Vercel-aanvraag targetpreview werd door Vercel als production
geregistreerd en vóór READY geannuleerd. Een niet-preview-build wordt nu geweigerd.
Geen bruikbare Preview-URL; geen tweede poging. Vercel-beheer moet een echte
Previewtargetroute bevestigen voordat opnieuw een deployment wordt voorgesteld.

### A2. Herstelpunt, onderhoud en rollback

Actueel API-bewijs: Free_v3, history 21.600 seconden (zes uur), branchlimiet 1 GiB,
logische omvang 193.486.848 bytes; snapshotplanning leeg. Bestaande snapshot
`snap-young-sunset-agambfcl` / `pre-compliance-f2-migration85-2026-10-16` is behouden.
Die oude snapshot is geen actueel migratiecheckpoint. Beschikbare snapshot-/WAL-
capaciteit en de feitelijke oudste herstelbare UTC-tijd zijn niet bewezen door
alleen de limiet en omvang. Geen backupkopie, restore of planwijziging gedaan.

Veiligste voorstel: direct na een goedgekeurde volledige schrijfpauze een nieuw
bruikbaar snapshot/checkpoint T0 vastleggen, beschikbaarheid en herstelrechten
controleren en het oude punt behouden. Als quota dit verhinderen: STOP; afzonderlijk
kosten-/capaciteitsbesluit of aantoonbaar herstelbare PITR-tijd met voldoende marge.
Nooit het oude punt verwijderen om de proef groen te krijgen. Een restorebranch
met echte gegevens is een gegevenskopie en vereist apart akkoord plus toegangsplan.

Voorgestelde operator: bestaande bevoegde Neon/Vercel-beheerder workmatchr; PO moet
operator en achtervang bevestigen. RPO0 alleen haalbaar wanneer alle schrijvers
stil en externe side effects reconciliabel zijn; RTO60min is een doel, niet gemeten
Neon-SLA. Zes uur history betekent geen gegarandeerd zes uur bruikbare rollbackruimte.
Reserveer minimaal twee uur na postflight als voorgestelde marge; controleer quota
en herstelbaar timestamp direct vóór uitvoering.

Schrijfpauze omvat applicatiepublicatie/registratie/offertes/credits, beheermutaties,
uitgaande workers, dagelijkse financecron, GitHub-outboxscheduler en Mollie-callbacks.
Er is geen in dit pakket bewezen universele onderhoudsschakelaar. Een verkeersblokkade
alleen stopt die schrijvers niet. Operator moet vóór toestemming een concrete
targetlijst, blokkeerwijze, drains, actieve transacties en provider-retry/reconciliation
bevestigen. Callback niet200 antwoorden als verwerking niet duurzaam is aangenomen.

Synthetische restoreproef en least-privilegechecks opnieuw groen in #73-CI; dit
bewijst SQL/restorecontrole, geen werkelijke Neonquota, endpointwissel of RTO.
Bij uitval schrijfpauze behouden, read-only diagnose, geen reset/resolve/retry die
geschiedenis verbergt. Herstel alleen naar goedgekeurd punt met aparte toestemming;
vergelijk registry/digests/ACL, verifieer apps en reconcile providertransacties sinds
T0 vóór hervatten. Historische facturen/beoordelingen nooit handmatig herschrijven.

### A3. Metadatahelper

Opnieuw exact vastgesteld: `public.show_db_tree()` zonder argumenten, owner
neondb_owner, SECURITY INVOKER, bodyMD5 `2dc5cdeafbbc8d0c82c8db059c0e25e5`,
proaclNULL → effectieve EXECUTE voor PUBLIC en owner; geen catalogusafhankelijkheden.
Dit sluit externe beheerclients niet uit; eigenaar moet dat bevestigen.

Apart voorstel: uitsluitend [restrict-show-db-tree.sql](../ops/database/restrict-show-db-tree.sql),
owner/same-bodyguard, lock/statementtimeout5s, `REVOKE EXECUTE ON FUNCTION
public.show_db_tree() FROM PUBLIC`. Eigenaar blijft bevoegd, expliciete grants
blijven staan. Vooraf oorspronkelijke ACL bewaren. Bij nood exact aangetroffen
PUBLIC EXECUTE herstellen met bestaande restoreprocedure en apart akkoord.
Geen extra ownerrolgrant of andere functies aanraken. Synthetische test bewijst
weigering voor gewone rollen en behoud van owner/expliciete beheerrechten.
Nu geen privileges veranderd. Zonder functionele noodzaak is brede PUBLIC-toegang
geen aanbevolen eindsituatie; geen SECURITY DEFINER-privilege-escalatie vastgesteld.

### A4. Exacte migratiebundel en stopcriteria

De [acht namen en LF-SHA256's](wp16-migration-execution-plan.md#exacte-acht-pending-migraties)
zijn één-op-één opnieuw bevestigd tegen huidige registry en main. Geen verschil
in 93 migratiebestanden tussen main en #73; 92 historische bestanden ongemoeid.
Volgorde: learning_vertical_slice → learning_final_exam → learning_certificates →
learning_retention → correct_learning_retention_publication_policy →
compliance_question_visibility → allow_annual_reminder_reconsent →
restore_learning_exam_question_immutability. Alle acht vormen één operationele bundel.

Zes LMS-migraties, één F4-visibilitymigratie en de LMS-herinneringscorrectie dienen
gesloten modules; publieke website, accounts, F3 en bestaande commerciële schema's
vereisen ze niet automatisch. Dat neemt gedeelde runtime-/privacy-/betaalvoorwaarden
niet weg. Bestaande F1/F2-resultaatopslag is bij85 aanwezig.

Uitvoerplan na apart D4-akkoord: schone checkout46962cff en exacte LF-bytes; veilige
directe ownerverbinding alleen proceslokaal; `npx prisma migrate status`, verwacht
exact acht pending; vervolgens eenmaal officiële `npx prisma migrate deploy`.
Geen andere pending migratie/seed/frameworkregistratie. Prisma voert niet alle acht
in één globale transactie uit. De tijdelijke zwakkere examenguard wordt pas door
de laatste migratie hersteld; geen tussentijdse vrijgave.

Preflight: runtimebinding alle targets, schrijfpauze, herstelpunt/TLS/rol,
85checksums, geen onafgemaakte objecten, actuele counts/snapshotdigests, locks en
gates uit. DDL verwacht schema/cataloguslocks en korte exclusieve locks op gewijzigde
tabellen; bestaande workload/long transactions kunnen deze verlengen. Operator
stelt lock_timeout5s en bounded statement_timeout (voorstel60s, vooraf lokaal
beproeven met dezelfde bundel) proceslokaal in, geen poolcapaciteit verhogen.
STOP bij onverwachte blockers/locktimeout, checksum/schema-afwijking of verlies
van herstelmarge. Niet blind afbreken tijdens DDL zonder toestand vast te stellen.

Postflight:93/93, 0 failed/pending/onbekend, exacte hashes/indexen/FKs/guards/ACL,
vier/38 en twee/twee of verklaarde checkpointaantallen/digests intact, legacyversie
ongewijzigd, geen 2.1-publicatie; F4/LMS/workers uit. Volg runtime5xx/latentie/locks
en kernroutes. Bij afwijking schrijvers dicht, geen migrate resolve/reset/handentries.

## 3. B — Commerciële acceptatie

### B1. Contact en mail: werkelijke implementatie

Main `/contact` gebruikt bestaande contactlinks. #39 is code op een Draft-branch,
geen actieve productieform. `CONTACT_FORM_ENABLED` blijft defaultfalse.
PR39-service: servervalidatie, honeypot, HMAC-limieten, try-advisory-lock; BUSY429
met Retry-After5, echte fouten503 met behoud van invoer. Resend ACCEPTED vereist voor
200; developmentlog wordt niet als aflevering geaccepteerd. Provider-idempotentiesleutel
is aan requestId/ontvanger/payload gebonden. Geen automatisch ongecontroleerd retry.

**Geen duurzame contact-outbox:** berichtinhoud wordt niet in DB bewaard en de
server roept direct bestaand mailtransport aan. Alleen limiettellers zijn duurzaam.
Na proces-/providerfout kan de gebruiker opnieuw proberen, maar geen worker herstelt
het bericht automatisch. Dit is geen bewezen dataverlies na een beloofde duurzame
enqueue; de UI zegt provider aangeboden. Het voldoet wel niet aan een nieuwe eis
van gegarandeerde duurzame formulierverwerking. Geen concurrerend systeem gebouwd.
Vóór zo'n belofte: beperkte uitbreiding van bestaande NotificationOutbox met privacy-
retentie, noodzakelijke payload en contactconsumer apart ontwerpen/reviewen. Een
mailworker voor marketplace mag niet zomaar contactpayloads gaan verwerken.

Hergebruikt #39-testbewijs:137regressies en18PostgreSQL-tests, negen45-bursts405requests,
0quotaoverschrijding/503 na fix, p95 67–105ms; vaste-lock45/45→429,0mail/counters.
Dat is historische fake-transportbewijs op afd465, geen actuele mainintegratie of
productiecapaciteit. Oude migratie/typeblockers in dat rapport zijn door latere
mainreparaties ingehaald; harnas/code is in ABC niet opnieuw geïntegreerd of gewijzigd.
Geen A06-branch ongevraagd aangepast. Voor actieve release: integratie met main,
gerichte volledige databaseproef en privacy/bezorgacceptatie alsnog nodig.

Vimexx-route en éénjaarsbeleid zijn PO-bevestigd, uitvoering/MFA/trash/backups niet.
Resend ACCEPTED ≠ Vimexx-ontvangst ≠ gelezen. Marketplace-outbox met retries/leases
blijft onderscheiden van directe factuurmail. Die drie ketens krijgen geen gezamenlijke
afleverclaim. Drie oude in-app-outboxtypen zonder mailconsumer blijven expliciete
productverwachtingsbesluiten, zie [WP15 B](wp15-integrated-commercial-release-readiness.md).

### B2/B4. Geïntegreerde synthetische keten

[WP17B](wp17b-runtime-verification-and-acceptance-environment.md#afgeronde-browseracceptatie-en-grenzen--2829-oktober)
legt echte lokale browserpublicatie→selectie→privacy-preview→30creditontgrendeling→
offerte→gunning vast. Eén Request/Assignment/handoff/dossier/snapshot/invitation.
Wallet 100→70; vier aankopen waarvan alleen één fake PAID credits/factuur oplevert.
Een aanvullende read-only nacontrole bevestigt één offerte, één gunning, één
certificaat, één ingeleverde toetspoging, één factuur en één PURCHASE-ledgerregel.
Registratie/accountopbouw gebeurde via synthetische fixture, niet opnieuw via
browserregistratie. Examenfixture is geen commerciële of juridische beoordeling.

Fake Mollie: zes gelijktijdige paid-verwerkingen, één bijschrijving/factuur; repeated
en delayed pending keren betaald niet terug; failed/canceled/expired nulbijschrijving;
tenant/actorcontrole op replay. Fake accepted invoice eenmaal, mailfailure laat
financiële commit intact. CI bevat daarnaast17matchingfixtures/workerconcurrency.
Geen echte provider, webhookdelivery, Jortt-boeking of mailbox getest.
Geen financieel/productcorrectie nodig op basis van deze proeven.

Open browserbewijs: beheerderslogin, tweede-organisatienavigatie, certificaat-PDF,
laatste logout/200% en eventuele orgwissel. Toolinitialisatie faalt ook na reset
met kernel-assets OSerror3; niet als PASS gepresenteerd. Database-/CI-autorisatie
is wel geslaagd. VercelPreview ontbreekt door targetprobleem, los van deze browsertool.

### B3. Kort beheerprotocol (voorstel, niet als actief monitoringsysteem geclaimd)

| Signaal | Eigenaar / eerste actie | Stop of escalatie |
|---|---|---|
| DeploymentERROR of nieuwe5xx | Vercelbeheer; exacte deployment/SHA/loggroep, gevoelige payload niet kopiëren | Geen promotie; bekende goede code alleen met releasebesluit terugzetten, DBcompatibiliteit eerst |
| Outboxlease verlopen, retries of oudste due>30min | Operator; serverstatus/attemptCount/availableAt, schedulerstatus en provider-ID reconciliëren | Niet handmatig SENT of tweede mail forceren; permanente/ambigue afhandeling naar ontwikkelaar |
| Betaling PAID bij provider maar lokaal niet verwerkt | Finance+operator; herverifieer via bestaande gateway, ledger/factuur-correlatie | Geen handmatige saldomutatie/refund; dubbele/ongelijke bedragen direct stoppen |
| DBonbereikbaar, locks of migratiefout | DBbeheer; read-only identiteit/locks/registry/herstelmarge | Schrijfpauze, geen resolve/reset; beoordeelde roll-forward/restore |
| Onverklaarde tenant-/authfout | Securitybeheer; rol en sessiecontrole zonder tokens in rapport | Blokkeer nieuwe vrijgave, geen autorisatieverruiming |

Vercel-logvoorziening, GitHub CI, dagelijkse financecron en 15min-outboxworkflow
bestaan als configuratie. Werkelijke schedulersecret, uptime, alertbestemming,
achtervang en herstel-SLA zijn niet volledig bewezen. PO benoemt primaire operator
en achtervang. Voorstel: tijdens venster continu; eerste24 uur iedere 30 min controle;
daarna dagelijks plus actieve failuremelding na apart configuratieakkoord.
Geen nieuwe melding, betaald monitoringproduct of scheduler gestart.

## 4. C — Inhoudelijke review en gescheiden vrijgave

### C1. PR64

De oude base bevatte de inmiddels squashgemergede technische A07-commits. Een
gewone retarget zou20bestanden inclusief auth/session/workflow/package tonen.
Daarom actuele main gericht geïntegreerd; alleen README-linkconflict samengevoegd.
Alle technische maincode en F3/F4/opdrachtstart behouden. Diff naar main: negen
bedoelde juridische bestanden plus branchspecifieke deploymentblokkering.
Definitieve SHA en CI staan in PR64; PR40 blijft ongemoeid als auditspoor.

Negen bestanden: docs/README.md, docs/a07-privacy-cookies.md,
docs/a07-storage-session-design.md, src/app/privacy/page.tsx,
src/app/cookies/page.tsx, src/app/public-legal-pages.test.tsx,
src/app/public-placeholder-routes.test.tsx, src/config/legal-identity.ts,
src/content/public-legal.ts. Extra vercel.json voorkomt publicatie bij reviewpush.
Geen inhoudelijke goedkeuring of wijziging van voorlopige identiteit/bewaarbeleid.

Concreet beslisblad staat bovenaan [A07](a07-privacy-cookies.md): definitief Zwolle-
adres, rechtsgronden/belangenafwegingen, leveranciersafspraken/doorgifte, actuele
cookies, mailretentie-uitvoering/MFA/backups en werkende rechtenprocedure.
Een jaar vanaf ontvangst is vastgesteld beleid, geen nog te kiezen termijn.
Geen ingevulde fictieve bedrijfsgegevens; concept/noindex blijft behouden.

### C2. F4

Hergebruik [juridisch acceptatiedossier](compliance-f4-legal-acceptance.md),
[46claims/141bindings](compliance-f4-review-dossier.json),
[bronrevisies](compliance-f4-source-evidence.json) en
[RI&E-beslisblad](compliance-f4-rie-legal-review.md).
20 REVIEW_REQUIRED / 26 INSUFFICIENT_EVIDENCE;0 menselijke besluiten;131 antwoordregels+
10 scope-onzekerheidsregels;27 beperkte afleidingen over negen vragen. Niet9regels.
188 fragmenthashes zijn technisch bewijs, geen actuele wetsconsolidatie/goedkeuring.
De laatste vastgelegde consolidatiecontrole is23oktober en bleef onvoldoende;
geen nieuwe juridische actualiteitsclaim in dit afrondingspakket.

| Hold (ieder YES/PARTIAL/NO) | Ontbrekend besluit op bestaande bronrevisie/claimmatrix |
|---|---|
| RIETESTING | AW14/AB2.14b: uren versus personen, cao/erkend instrument, geldigheid en bedrijfsspecifieke toepassing; reviewer bevestigt beide uitzonderingsroutes |
| PREVENTIONOFFICER | AW13: interne/externe uitvoering, deskundigheid, capaciteit en uitzonderingen |
| PREVENTIONCONSULTATION | AW13/medezeggenschap: betrokkenheid is niet vanzelf vereiste instemming met persoon/positie |
| EXPERTTASKSCOVERED | AW14: toepasselijkheid en feitelijke uitvoering per deskundige taak |
| BHVAPPOINTED | AW15: aanwijzing en beschikbaarheid los beoordelen; samengestelde vraag onvoldoende |
| CW2-PAGO-02 | AW18: vrijwilligheidsvoorlichting bewijst geen zelfstandige nalevingsovertreding |
| ACCIDENTREGISTRATION | AW9lid2: werkelijk register en gebeurtenissen ontbreken; procedureantwoord onvoldoende |
| ACCIDENTREPORTING | AW9lid1: kennis is geen bewijs van tijdige melding van concrete gebeurtenis |
| CW2-ONG-01 | AW9lid1: later bekend geworden gevolgen/tijdstip/feitelijke melding vaststellen |

Exacte claim-ID's, revisies, templatehashes en ontbrekende bound checksums blijven
in de bestaande JSON; geen nieuwe ID of menselijke beslissing verzonnen.
Daarnaast voor10scopebindings aparte werkgeversscope en uitzonderingen bevestigen.
Onbekend blijft Niet beoordeeld, nooit automatisch Op orde/NVT. Bestaande read-only
Knowledge-publicatiepolicy/dry-run wordt behouden; statusPUBLISHED alleen volstaat
niet. Bronactualiteit, directe ondersteuning, conflicten, menselijk besluit en
bound checksums ontbreken nog. Geen registratierunner/seed als publicatieworkaround.
Framework2.1 en gate blijven gesloten; technische merge is geen juridische vrijgave.

### C3. LMS

WL-001 prototype0.17, tienhoofdstukken/190min en 50vraag-examen met40goed-cesuur
blijven reviewerpunten volgens bestaande WL-001/WP15-dossiers. Nieuwe synthetische
browserproef bewijst voortgang, toetsindienen en certificaatvorm, niet studieduur,
vakinhoud/antwoordcorrectheid of wettelijke deskundigheid. Review leerdoelen,
praktijkvoorbeelden, feedback/antwoordopties, examenvorm/cesuur/versiehistorie,
certificaatclaim en publieke certificaatprivacy afzonderlijk. Kennisbehoud is
vrijwillig; DRAFT-vraagbank niet publiceren. WL-002 mist nog uitvoerbare inhoud/runtime.
Geen cursusnorm of tekst gewijzigd. LMSactivering, cursusseed/publicatie en
kennisbehoudbank ieder apart besluit, naast databasevoorwaarden.

## 5. Eén gebundeld besluitenoverzicht

| Besluit | Afgebakende handeling en huidige uitvoerbaarheid |
|---|---|
| D1 Productiondiagnose | §A1: platform/main 46962, bestaande bevoegde operator, twee flags≤15min, één POST en twee gecontroleerde deployments inclusief sluiting. **Nog niet uitvoerbaar:** geldige auth en TLS-bewijsroute eerst bevestigen |
| D2 Previewdiagnose | Standaard én twee genoemde overrides elk apart exact target/SHA/rol/auth; eigen creds/fakes, flags en cleanup. **Nog niet uitvoerbaar:** targets/geldigePreviewroute ontbreken |
| D3 herstel/ACL | Nieuw checkpoint direct na volledige schrijfpauze, bestaand snapshot behouden; quota/retentie/operator/achtervang en eventuele echte datakopie apart. Helper exact public.show_db_tree(), alleen PUBLIC EXECUTE-revoke met vastgelegde ACLrollback; geen andere grants |
| D4 migratie | Exactachtbundel/hashes op main 46962, neondb/production/br-odd-smoke; officiële runner, onderhoudswriters/locks/checkpoint/postflight uit§A4. **NO-GO** zolang D1–D3 en uitvoerbare schrijfpauze niet bewezen |
| D5 één contactmail | Voorstel: één fictief bericht van Synthetische acceptatietest, onderwerp Algemene vraag, body 'Gecontroleerde WorkMatchr-bezorgtest; geen klantgegevens'; uitsluitend contact@workmatchr.nl→Vimexx→info@workmatchr.nl. Max1bericht, geen retry bij onzekere ontvangst; bestaandResendtransport. Pas na PR39-integratie/privacy/provideracceptatie en apart ontvangend-mailboxakkoord. Provider-ID/ACCEPTED, inbox/spamontvangst en lezen afzonderlijk. Geen echte professional uitnodigen |
| D6 één livebetaling | Voorstel na geïsoleerde testmodus: CREDITS_25, standaardNL21%, geenPRO/korting, **EUR30,25** (25,00+5,25), één iDEAL-checkout, maximaal één betaling, geen abonnement/refund. PO wijst één bevoegde testorganisatie/account/betaalrekening aan; geen fictieve fiscale identiteit op echte factuur. Prijs direct vóór uitvoering uit bestaande price-preview vergelijken; afwijking STOP. Testaccount/methode/omgeving/providerprofiel nog te bevestigen. Geen Jortt-mutatie of echte factuurmail impliciet geautoriseerd |
| D7 inhoudelijke publicatie | Afzonderlijk exact de PR64-privacy/cookieversie; F4NL_ARBO_GUIDE2.1 plus reviewedbindings; WL-001cursus/examen/certificaat en DRAFT-kennisbehoud. Geen technisch GO als vervanging |

D5 en D6 zijn twee aparte mogelijke proeven, geen stilzwijgend bundelakkoord.
Een betaalflow kan factuurmail/Jorttverwerking activeren: vóór D6 exact uitsluiten
via bestaande testmodus of alle bedoelde effecten apart aanwijzen/goedkeuren.
Geen echte geldtransactie uitvoeren met uitgeschakelde noodzakelijke administratie.
Geen refund, tweede poging of andere ontvanger op basis van eerdere toestemming.

## 6. Vrijgave per module

| Module | Technische stand | Besluit |
|---|---|---|
| Publieke informatie | Actuele READYdeployment; homepage200; geen nieuwecontentwijziging | Bestaande pagina's onafhankelijk van8migraties; juridische concepten niet publiceren |
| Accounts / opdrachtstart | Mainauth/tenant + synthetische publicatieketen groen | Geen blokkade door F4/LMS, wel privacy/runtimebewijs en resterendebrowsercontrole voor nieuwe commerciële vrijgave |
| Marketplace | Synthetisch preview→unlock→offerte→gunning bewezen | Mailverwachting, privacy/voorwaarden en provideracceptatie nog nodig |
| Betalingen | Fakepayment/ledger/invoice/retry/concurrency groen | Echte provider-/fiscaleacceptatie OPEN; geen liveGO |
| Contact/e-mail | Mainmailto; PR39defaultoff/directResend, geen durablecontactoutbox | Formulier blijft uit; duurzameverwerking/PRintegratie/privacy/ontvangst open |
| F3 | Bestaande intake, 24-uursopslag en logoutbeveiliging behouden | Onafhankelijk van F4; geen juridische nalevingsclaim |
| F4 | Vijfstatus/immutable/tenanttests groen | Bewust UIT; juridische/bron-/frameworkacceptatie NO-GO |
| LMS | Synthetischeleer/examen/certificaatflow deelsbrowser+PGgroen | Bewust UIT opProduction; migratie/content/privacy/Preview/PDFacceptatie OPEN; WL002onvolledig |

## 7. Validatie, beperkingen en vervolgstappen

Hergebruikt bewijs is aan de bron gebonden: 93 migraties ongewijzigd tegenover main;
WP17B: 110 tests opnieuw PASS (99+11). PostgreSQL-CI op b281ffd bewijst de schone
opbouw, upgrade, restore, beperkte rollen, financiën, notificaties, Compliance,
sessies en LMS. Deze controles zijn groen.
Laatste #73-commit voegt uitsluitend twee operatorfixtures en browserrapport toe;
de applicatie-/migratiebytes zijn gelijk. Ook alle vier checks op exacte head
`a64c9ca` zijn SUCCESS: [PostgreSQL](https://github.com/WorkMatchr/platform/actions/runs/40839779591),
[lint/build](https://github.com/WorkMatchr/platform/actions/runs/40839779522).
PR64: 14 gerichte juridische tests PASS; volledige lint nul fouten en vier bestaande
waarschuwingen. De eerste TypeScript-check liep vóór de ontbrekende Prisma-generatie;
de eerste build weigerde een node_modules-junction buiten de worktreeroot. Dit zijn
lokale inrichtingsfouten, geen productbaseline: hersteld met een eigen installatie
uit de bestaande lockfile en generatie, daarna opnieuw getest.
Na herstel zijn standalone TypeScript en productiebuild beide PASS. Geen nieuwe of
oude TypeScriptfout op deze kandidaat. Alle vier checks op PR64-head `74c6b20` zijn
SUCCESS: [PostgreSQL](https://github.com/WorkMatchr/platform/actions/runs/40841087301),
[lint/build](https://github.com/WorkMatchr/platform/actions/runs/40841087417).
Een bewust uitgesloten Previewdeployment wordt niet als READY geclaimd.
Diff- en secretscontrole op expliciete bestanden; lokale credentials en ruwe logs
blijven buiten Git. Dit ABC-pakket wijzigt alleen vier documentatie-/evidence- en
branchconfiguratiebestanden; de bovenstaande applicatieproeven blijven geldig.

Geen productiemutatie, deployment, echte provideractie of juridische vrijgave in ABC.
De oude begrensde diagnose staat gesloten. Eigen acceptatieresources zijn synthetisch;
geen productiekopie of verwijdering van bestaande databases/snapshots. Operatorscripts
zijn op exact die acceptatie-identiteit begrensd en geen algemeen productiegereedschap.

Eerst uitvoerbaar: review van PR64 en de gescheiden #70–73/ABC-kandidaten. Beheerder
verifieert bestaande maintenance-auth, Previewtarget en herstelquota. PO benoemt
achtervang, bevestigt de schrijfpauze en neemt de concrete besluiten. Resterende
browseracceptatie hervatten zodra browserbediening of veilige Preview bruikbaar is.
Geen nieuwe algemene audit nodig.

**Eindadvies: voorbereidingsdossier afgerond; productiemigratie NO-GO.**
Uitvoering wacht deels op specifieke toestemming, deels op nog ontbrekend bewijs
(runtimebinding/Preview, herstelpunt en schrijfpauze, provider-/browseracceptatie).
Juridische acceptatie ontbreekt; F4 en LMS blijven bewust uit. Geen integrale
productierijpheid afgeleid uit groene tests.
