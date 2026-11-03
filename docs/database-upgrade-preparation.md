# Productiedatabase: veilige upgradevoorbereiding

Status: **productie-uitvoering NO-GO**. Geen migratie, backup, restore,
schrijfpauze, privilegewijziging of featureactivering geautoriseerd door dit document.
Basis: main `09f9ff7828411adaa2327ce552d485debef7e34f` met PR #88.
De 95 migraties zijn bytegelijk aan de eerder geaccepteerde PR88-kandidaat.
Doelidentiteiten, rollen, hashes van productiechecksums en uitvoeringsbewijs blijven privé.

## Gerichte correctie

De offline compiler `ops/recovery/write-fence.mjs` controleerde vergeten logins met
membership van een writer, maar miste logins met directe objectrechten. De nieuwe
PostgreSQL-regressie faalde vóór herstel: zo'n login blokkeerde het sluiten niet.

Close, verify en open weigeren nu iedere niet-geïnventariseerde LOGIN met CONNECT
op de database. Ook een vermeend read-only account wordt niet automatisch toegestaan:
directe/PUBLIC-grants en SECURITY DEFINER-functies kunnen schrijfbevoegdheid geven.
De compiler trekt geen rechten van onbekende rollen in; hij stopt vóór mutaties.

De expliciete onafhankelijke operator en de bestaande benoemde providerbeheerders
blijven vertrouwde uitzonderingen. Hun credentials, memberships en feitelijk gebruik
moeten vooraf afzonderlijk worden beoordeeld. Verifieer dat applicatie/Preview/worker
nooit met zo'n uitgezonderde identiteit werkt. Een benoemde providerrol is geen bewijs
dat die identiteit uitsluitend door de provider wordt gebruikt.

De compiler voert zelf geen SQL uit. Zonder afzonderlijk goedgekeurd manifest wordt
geen bruikbare close/open-SQL gegenereerd. Geen publieke onderhoudsroute of nieuwe
productiecredential toegevoegd; geen authenticatie- of financiële logica gewijzigd.

## Eén centraal uitvoeringsmanifest

Een bevoegde operator beheert één privaat manifest met: releasecommit, bundelhash,
database/endpointidentiteit, onafhankelijke operator, **alle** writer-logins en hun
oorspronkelijke LOGIN-toestand, toestemming, venster, hersteldoel, herstelbevoegdheid
en terugdraaistappen. Neem ook oude deployments, Preview-branchoverrides, directe
SQL-clients, externe jobs en clusterbrede gevolgen van NOLOGIN mee.

Bewijs dat de operator writers kan sluiten en heropenen, actieve clients kan zien,
en de gereviewde backup/migratie kan uitvoeren. Geef geen nieuwe privileges om deze
preflight kunstmatig te laten slagen. Een aparte backup-login is evenmin stilzwijgend
toegestaan: gebruik de beoordeelde operatorroute of pas eerst het ontwerp gereviewd aan.

Registreer buiten de gepauzeerde database per overgang: run-ID, manifesthash, UTC-tijd,
operator, fase, uitkomst en aggregaatbewijs. Geen tokens, SQL-resultaten met klantdata
of volledige providerpayloads. Fases:

`PREPARED → INGRESS_CLOSED → LOGINS_CLOSED → DRAINED → VERIFIED → CHECKPOINT_VERIFIED
→ MIGRATED → POSTFLIGHT_PASS → RECONCILED → OPEN`.

Bij fouten blijft de laatst bewezen fase behouden; tijdsverloop of applicatieherstart
heft de pauze niet op. Na een operatoronderbreking manifest en werkelijke roltoestand
opnieuw vergelijken. Geen blinde close/open-retry of automatische backend-termination.

## Schrijvers en centrale procedure

| Schrijver | Actie vóór sluiten | Bewijs vóór checkpoint |
|---|---|---|
| Publieke formulieren, registratie, login, sessies, server actions | Ingress op alle gekoppelde URL's gecontroleerd weigeren, inclusief GET met side effects | Geen nieuwe aanvraag; geen open runtimepool |
| Organisaties/profielen, opdrachten, offertes, gunning, credits/ledger | Nieuwe acties en checkouts stoppen; lopende requests afronden | Transacties en providercalls afgewikkeld |
| Mollie-webhook en recurring | Snelle niet-200 respons vóór verwerking; betaalinventaris vastleggen | Geen vals succes; bestaande provider-ID's en herstelprocedure bekend |
| Resend/outbox/Jortt | Nieuwe claims, handmatige retries en dispatch stoppen | Geen actieve lease of onzekere providerpoging |
| Schedulers en achtergrondtaken | Alle externe en interne triggers plus handmatige routes pauzeren | Geen actieve job; herstart gebruikt dezelfde gefencete login |
| Platformbeheer, oude apps, Preview, directe databaseclients | Beheerfreeze en pools sluiten; iedere login in manifest beoordelen | Geen onbekende login/client met bereik tot de database |

1. Sluit ingress en triggers vóór enige nieuwe provideractie. Een generieke
   onderhoudspagina is geen databasebarrière. Regel vóór productie een uitvoerbare
   beheervoorziening voor **alle** aliases/deployment-URL's; nog niet geactiveerd.
2. Genereer en review SQL met `node scripts/plan-d2d-write-pause.mjs close <private-plan.json>`.
   Uitvoering alleen met afzonderlijke toestemming via de onafhankelijke operator.
3. Laat bestaande transacties aflopen. NOLOGIN beëindigt geen bestaande sessies.
   Sluit bestaande pools gecontroleerd. De pauze is nog niet bewezen zolang een
   idle writerpool of onbekende client bestaat. Geen automatische kill.
4. Genereer/controleer de `verify`-fase. Vereist juiste identiteit, gesloten logins,
   geen onverklaarde CONNECT-login, geen writerclient en geen prepared transaction.
   Controleer apart achtergrondworkers, outboxleases en externe provideruitkomsten.
5. Controleer stabiele financiële/historische aggregaten. De DB-fence is de centrale
   bescherming; route-specifieke flags of default_transaction_read_only zijn dat niet.
6. Leg T0 pas na alle controles vast. Beheerder/provideradministratie houdt eveneens
   schrijfstilte; de noodzakelijke migratieoperator is een expliciete uitzondering.

## Mollie: begrensde retry én gecontroleerde inhaalcontrole

De [officiële webhookdocumentatie](https://docs.mollie.com/reference/webhooks)
beschrijft tien pogingen tot 26 uur en een timeout van 15 seconden. Niet-200 houdt
retry mogelijk; een succesvolle HTTP-respons mag pas na verwerking volgen.
Dit is een begrensd providermechanisme, geen onbeperkte aflevergarantie.

Voor T0: registreer minimale referenties van open/pending aankopen, bestaande
abonnementen, in-flight providerrequests en de gekoppelde merchant/profile/mode.
Geen kaart/bankgegevens kopiëren. Bij onbekende checkoutacceptatie niet migreren.

Na postflight, terwijl algemeen verkeer en schedulers nog gesloten blijven:

1. Bevoegde operator controleert dezelfde bekende betalingen read-only bij Mollie.
2. Controleer tevens de gepagineerde [Payments API](https://docs.mollie.com/reference/list-payments)
   van het juiste profiel en de juiste mode. Nieuwe recurring betalingen kunnen tijdens
   de pauze ontstaan; alleen de oude lokale pendinglijst is niet volledig. Neem voldoende
   overlap vóór T0 en alle pagina's mee. Controleer refunds/chargebacks afzonderlijk:
   betaalstatus alleen is geen volledige financiële reconciliatie.
3. Vergelijk tegen provider- en lokale referenties. Een ontbrekende koppeling, onverwachte
   mode/tenant/bedrag of onvolledige pagina-inventaris blokkeert heropening.
4. Na afzonderlijke bevoegdheidscontrole: alleen ontbrekende verwerking opnieuw aanbieden
   via de bestaande webhook/service `processMolliePayment` op **dezelfde** provider-ID.
   Deze haalt providerstatus opnieuw op en valideert bedrag, valuta en organisatiebinding.
   Dit is geen nieuwe checkout en geen onbevoegde handmatige ledgercorrectie.
5. Verifieer één creditboeking en factuur per aankoop. Laat bestaande refund-/subscription-
   services de bijbehorende gevallen afhandelen. Nieuwe factuurmail/Jortt-calls zijn mogelijke
   gevolgen: vooraf expliciet autoriseren; geen bypass om die gevolgen te verbergen.
6. Unknown Resend-acceptatie blijft voor menselijke reconciliatie; nooit automatisch resend.

Deze procedure kan niet uitsluitend aan de normale financiële scheduler worden overgelaten:
die verzorgt refunds, abonnementsacties en Jortt, geen volledige inventarisatie van alle
gemiste betalingsevents. Zonder bevoegde providerinventaris en uitvoerbare gecontroleerde
herverwerking blijft de operationele webhookveiligheid **BLOCKED**. Geen echte providercall
of bericht is in deze opdracht uitgevoerd. De provider-retry is gedocumenteerd, niet live getest.

## Herstelvoorziening en migratieplan

Een bestaande snapshot, consistente dump, volledige herstelset en geslaagde onafhankelijke
restore zijn vier verschillende bewijzen. De actuele echte herstelset is nog niet VERIFIED.
Een synthetisch geslaagde encrypted dump/restore wordt niet opnieuw uitgevoerd zolang de
gebruikte procedure bytegelijk is; hij vervangt geen actuele productieproef.

Het doel moet vooraf leeg en afgeschermd zijn, zonder applicatie/providerkoppelingen,
zonder onbedoeld overgenomen logincredentials, met voldoende capaciteit en afgesproken
retentie/cleanup. Geen nieuwe betaalde infrastructuur. Beoordeel ook beheer-/APItoegang.

Volledige set: consistente database-export, schema's, data, constraints, indexes, triggers,
functies, sequenties, migratieregistratie/checksums, ownership/ACL/default privileges,
extensions/versies en expliciet gereviewde rolmapping. Een database-pg_dump bevat geen
volledig clusterrollenbeheer; kopieer geen clusterpasswords of providerrollen blindelings.
Controleer RLS-toegang zodat geen rijen stilzwijgend ontbreken. Sleutels gescheiden,
versleuteling vóór opslag, geen backups in Git/CI of synchronisatiemappen.

Na afzonderlijk akkoord en bewezen pauze: maak checkpoint, herstel op het goedgekeurde
doel, vergelijk schema/checksums/financiële en historische invarianten/ACL's en meet duur.
RPO0 voor databasewrites vereist T0; externe betaalstatus kan doorlopen. Productie-RTO
wordt pas na een echte proef vastgesteld. Geen restore/copy uitgevoerd in deze opdracht.

### Exacte pending-volgorde bij de geverifieerde 85-basis

1. `20260924150000_add_learning_vertical_slice`
2. `20260927210000_add_learning_final_exam`
3. `20260929100000_add_learning_certificates`
4. `20260930100000_add_learning_retention`
5. `20260930120000_correct_learning_retention_publication_policy`
6. `20261017100000_add_compliance_question_visibility`
7. `20261019100000_allow_annual_reminder_reconsent`
8. `20261026090000_restore_learning_exam_question_immutability`
9. `20261102120000_add_closed_contact_audit_retention`
10. `20261103100000_add_closed_contact_decision_register`

Deze namen zijn de inventarisatie, geen nieuwe uitvoeringsautorisatie. Herlees vóór een
venster de echte registry; onverwachte namen, failures of checksums betekenen STOP.
Vergelijk canonieke Git-bytes én bestaande LF/CRLF-registryvarianten zonder historie te wijzigen.
Het oude op93 vastgezette preflightscript niet omzeilen of als95-PASS gebruiken.

Gebruik pas na akkoord de officiële `npm run db:deploy` met de exact gereviewde95-bundel.
Deze gebruikt DATABASE_URL uit prisma.config.ts, geïnjecteerd via het veilige operatorproces.
Prisma voert alle pending migraties uit: controleer dus de volledige werkmap/manifest eerst.
Geen seed, reset, resolve of handmatige applied-markeringen.

Postflight: exact95 succesvolle registraties, nul unresolved, alle hashes verklaard,
valide constraints/indexes, beschermde examenvragen, immutable financiële en historische
data, gesloten contactaudit/register met correcte ACL's. Registreer vergelijking met T0.
Geen automatische grants, purge, reconciliatie of F4/LMS/contactactivering.

Heropening: eerst postflight en beperkt herstelverkeer onder controle van de operator;
dan providerinhaalcontrole, kritieke appverificatie, en pas daarna algemeen verkeer en
schedulers. Gebruik de gereviewde `open`-fase om exact oorspronkelijke LOGIN-toestanden
te herstellen. Bestaande NOLOGIN-rollen blijven gesloten. Bij onverwachte rolstatus STOP.
Controleer achterstanden, fouten en dubbele verwerking na hervatting.

Bij migratiefout: writers gesloten houden, bewijs bewaren, read-only diagnose; geen
automatische retry/resolve/destructieve downgrade. Een teruggerolde SQL-transactie kan
toch een failed Prisma-registratie hebben. Restore/cutover uitsluitend volgens apart
goedgekeurd plan; financiële events na checkpoint altijd opnieuw reconciliëren.

## Gerichte acceptatie

De bestaande Windows-harness maakt uitsluitend een eigen netwerkloze PostgreSQL-container
zonder hostpoort, met tmpfs en synthetische data. Geen bestaande database of volume gebruikt.

`node scripts/test-d2d-write-pause.mjs --synthetic-only`

Bewezen: normaal schrijven, NOLOGIN, bestaande transactie afronden, idle pool weigeren,
direct-grant- en membershipbypass weigeren, laat toegevoegde login weigeren bij verify/open,
synthetische auth/scheduler/GET/POST/adminadapters blokkeren, adapterherstart, mislukte
DB-verbinding zonder betaalack, hervatting en zes duplicaten naar één ledgerboeking.
De auth/schedulertabellen en HTTP-adapter zijn **fixtures**, geen nieuwe echte appbrowsertest.
Echte appservices, tenantisolatie, financiële idempotentie en authregressies hebben afzonderlijk
bestaand bewijs; dat onderscheid blijft behouden. Er wordt geen provider-retry nagebootst als livebewijs.

De nieuwe direct-grant-regressie faalde op de oude compiler en slaagt na herstel.
Eigen container/rollen verwijderd; bestaande containers behouden. Testresultaten en private
runmanifesten worden bij de PR beschreven; migratieSQL en businesslogica zijn ongewijzigd.

Validatie op deze wijziging:
- 10 offline compilerregressies PASS; 11 bestaande echte webhookhandlerregressies PASS.
- De synthetische PostgreSQL-harness: 11 controlecategorieën PASS, eigen container/rollen
  verwijderd en bestaande containers/volumes ongewijzigd.
- Volledige lint PASS met vier bestaande navigatiewaarschuwingen.
- Standalone TypeScript PASS na de normale Prisma-clientgeneratie. De eerste check in
  de lege worktree miste die gegenereerde client; geen broncodefout of baseline-uitzondering.
- `npm run build -- --webpack` PASS, 172 pagina's. Webpack gebruikt wegens de gedeelde
  lokale dependency-junction; geen Next-configuratie of dependencies gewijzigd.
- Bestaande 95 fresh/85→95/repeat/checksum-, ACL-, audit/register-, financiële en historische
  integriteitsproeven hergebruikt: de relevante bronketen is bytegelijk aan PR88.
- Diff- en publicatiecontrole vóór push; geen private infrastructuur of bewijsdata in deze PR.

Dit is geen operationele PASS voor echte productieschrijfpauze of echte Mollie-aflevering.
De laatste vereist ingestelde ingress/drain, onafhankelijke operator en providerreconciliatie.

## Openstaande besluiten

1. Hersteldoel, minimale operatorbevoegdheden, sleutelroute, retentie/cleanup en één echte
   checkpoint-/restoreproef autoriseren.
2. Ingress-/writerpauze en gecontroleerde heropening autoriseren, inclusief bevoegde
   providerinventaris/inhaalverwerking en eventuele normale financiële/mailgevolgen.
3. Pas na PASS van1/2: exact95-migratievenster plus eventuele herstelcutover goedkeuren.

Geen van deze besluiten is door technische testacceptatie vervangen.
