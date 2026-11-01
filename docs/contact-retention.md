# Contactretentie — technische kandidaat, geen productieactivering

Basis: main `6681319ac0bb1e09c210380d5526087de63bf2d2` (PR #83).
De PO heeft 30 dagen metadata na definitieve afhandeling en maximaal 24 uur contacttellers
goedgekeurd. Dit actualiseert [het Resend-/privacydossier](resend-privacy-final-acceptance.md)
binnen de [A06-contactarchitectuur](commercial-launch-finalization.md). PR #64 blijft concept.

## Definitieve afhandeling

| Toestand | Begin van 30 dagen | Automatische metadata-purge |
| --- | --- | --- |
| SENT | `processedAt`: duurzaam geregistreerde provideracceptatie | Ja; geen actieve lease of ciphertext |
| FAILED zonder poging | `processedAt`; `attemptCount=0`, eerste poging/fingerprint/provider-ID leeg | Ja, dezelfde voorwaarden |
| Nooit aangeboden, inhoud na 7 dagen verlopen | `createdAt + 7 dagen`: einde verzendmogelijkheid | Ja; een late scheduler begint de termijn niet opnieuw |
| Timeout, onbekende providerstatus, verloren acknowledgement | Niet definitief | Nee; expliciete reconciliatie |
| Andere FAILED met claim/poging, ontbrekende/tegenstrijdige datums | Onvoldoende bewijs van afhandeling | Nee; conservatieve review |
| PENDING of actieve lease | Niet definitief | Geen metadata-purge; inhoudsredactie wacht op leaseverloop |

SENT bewijst provideracceptatie, geen mailboxontvangst of inhoudelijke afhandeling van de vraag.
De outboxtermijn staat los van het bestaande mailboxjaar. Voor deze technische metadata is geen
specifieke wettelijke bewaarplicht aangetoond. De code verzint geen juridische uitzondering of
automatische verlenging. Een concrete bewaarplicht vergt vooraf een gemotiveerd, begrensd juridisch
besluit. Actieve en onzekere records verdwijnen niet als bijeffect van de purge.

## Deduplicatie na verwijdering

Een vrije client-UUID plus purge zou een oude POST opnieuw verzendbaar maken. Nieuwe inzendingen
krijgen daarom via same-origin `POST /api/contact/request` een serverondertekende willekeurige
identiteit met uitgiftetijd. De route vereist de bestaande gesloten contactgates. HMAC-SHA256 gebruikt
de bestaande contactencryptiesleutel met apart doelprefix; geen nieuwe secret, tabel of authlogica.

- Nieuwe enqueue vereist een geldige handtekening, geen toekomstige tijd en leeftijd **< 24 uur**.
- Bestaande identiteiten, ook legacy UUIDs, blijven lookup-only bruikbaar zolang de rij bestaat:
  dezelfde inhoud/status blijft idempotent; gewijzigde inhoud geeft conflict.
- Na purge zijn oude codes verlopen en vrije UUIDs ongeldig voor enqueue. Geen blijvende tombstones.
- De client houdt dezelfde identiteit na fouten/timeout/HTTP 410. Geen automatische nieuwe code
  na POST. Invoer blijft staan; de gebruiker controleert eerst ontvangst van het eerdere bericht.
  Bewust een nieuw formulier openen is een nieuwe inzending, zoals voorheen een nieuwe UUID.
- Geen globale inhoudsdeduplicatie over afzonderlijke formulieren; de bestaande quota blijven gelden.

## Opruiming en grenzen

De bestaande CRON-geauthenticeerde marketplace-maintenance voert `cleanContactRetention` uit vóór
de mailgate/sleutelcontrole. Bestaande zeven-dagen-inhoudsredactie blijft werken. Nieuwe fysieke purge
staat **standaard uit**: uitsluitend `CONTACT_RETENTION_ENABLED=true` geeft metadata-/tellerverwijdering
vrij, onafhankelijk van beide mailgates. Geen configuratie aangepast. Vercel-deployment van deze branch
is uitgeschakeld. F4 en LMS blijven ongewijzigd.

Dezelfde niet-blokkerende transactielock als admission beschermt duplicate lookup en tellervernieuwing.
Rijlocks, SKIP LOCKED en leasevoorwaarden beschermen actieve workers. Per batch maximaal 100 inhouds-
en 100 metadatarecords en 1000 contacttellers. Andere templates en Better Auth-tellers blijven intact.
Een fout rolt de hele cleanuptransactie terug. Achtergebleven inhoud ouder dan zeven dagen wordt
niet verzonden wanneer een redactiebatch nog niet klaar is.

Contacttellers worden op/na 24 uur vanaf de opgeslagen vensterstart (`lastRequest`) geselecteerd.
De actieve quota blijven 10 minuten/1 uur; bestaande opportunistische opruiming na één uur blijft.
De scheduler herhaalt batches ook bij lege/gesloten mailqueues. Hij logt alleen aantallen,
activeringsstatus, resterende batch en reviewaantal. Geen recordidentiteiten, tokens of inhoud.
De bestaande 100-batch/acht-minuten-grens meldt resterend werk als fout. `reviewRequired` maakt
ook een run zonder nieuwe mails niet-succesvol; onzekere gevallen zijn direct zichtbaar.

**Een harde maximale fysieke bewaartermijn is niet bewezen.** Een uitgevallen scheduler/database
kan niet verwijderen. Selectie gebeurt op de grens, daadwerkelijke verwijdering bij de eerste
succesvolle run. Ook kwartiercadans kan beperkte overschrijding geven. Hervatting haalt verlopen
werk in zonder de termijn te vernieuwen, maar geen softwaregarantie tijdens onbeperkte uitval.
De eerder gemeten scheduleronderbreking is niet met lokale tests opgelost. Productievrijgave vereist
bewezen externe controle op ontbrekende runs, achterstand/capaciteit en incidentopvolging. Er is
geen nieuw alarm of scheduler geactiveerd. Absolute 30-dagen/24-uursgarantie blijft BLOCKED.

## Onzekere verzending en reconciliatie

Aanvullend PO-besluit: timeout/onbekende uitkomst blokkeren voor automatische herverzending,
markeren voor expliciete reconciliatie; uitzonderingsretentie blijft een apart besluit.

De worker zet onbekende uitkomsten direct op FAILED/`DELIVERY_RECONCILIATION_REQUIRED`.
Een verloren database-acknowledgement laat tijdelijk de lease staan; na verloop leidt een al
vastgelegde delivery fingerprint tot dezelfde blokkade, zonder nieuwe providercall. Ook oude
PENDING-records met onbekende uitkomst worden geblokkeerd. Alleen aantoonbare afwijzing, zoals
HTTP 429, gebruikt begrensde automatische backoff met dezelfde payload/idempotentiesleutel.
Een claimonderbreking vóór de fingerprint kan veilig opnieuw worden opgepakt.

### Begrensde escalatieprocedure — voorstel, geen extra bewaartoestemming

1. Directe signalering; Product Owner is primaire beheerder. Achtervang alleen na aantoonbare
   instemming/instructie en afzonderlijke minimale toegang. Geen nieuwe accountrechten.
2. Voorstel: binnen **24 uur** triage/case-eigenaar; na **72 uur** escalatie bij ontbrekend bewijs;
   uiterlijk **dag 7** PO-besluit over afronding of kortste noodzakelijke uitzondering met vaste
   einddatum en dagelijkse opvolging. Dag 7 is een beslismoment, geen goedgekeurde bewaartermijn.
3. Alleen bevoegde read-only providercontrole op de exacte referentie, idempotentiesleutel en
   tijdperiode. Geen herverzending als test. Afwezigheid in een beperkt logvenster bewijst geen
   afwezigheid van verzending.
4. Bewijsregister buiten publieke Git: incident-/recordreferentie, bevoegde reviewer, datum,
   bewijsreferentie, besluit en uiterste review-/verwijderdatum. Geen berichtinhoud, mailadres of
   tokens in rapportage. Ook de registerretentie vergt afzonderlijke goedkeuring.
5. Concept veilige eindstatussen: bevestigde acceptatie → SENT; bewezen niet aangeboden → definitief
   mislukt; onvoldoende bewijs → geblokkeerd. Een toekomstige muterende beheerservice moet actuele
   autorisatie, verwachte status/lease, atomair bewijs en vaste finalisatietijd afdwingen. Nooit
   automatisch terug naar PENDING of telkens de 30 dagen vernieuwen. Gebruik aantoonbaar oorspronkelijk
   acceptatiemoment of expliciet beslismoment; verzin geen historische datum.

Deze PR bevat geen reconciliatie-schrijfendpoint of operator-SQL-bypass. Zonder voldoende bewijs
blijft automatische verwijdering geblokkeerd. Dat is geen wettelijke grond voor onbeperkte bewaring:
de uitzonderingsduur, registertermijn en bevoegdheden blijven PO-besluiten vóór activering.

## Validatie

`npm run test:db:contact -- --retention-schema` maakt één nieuwe willekeurig benoemde lokale
database met alleen de twee synthetische modelfixtures NotificationOutbox/RateLimit. Geen kopie,
accounts, migratierunner of migratieregistratie. Het harnas weigert externe hosts/providercredentials,
blokkeert echt mailtransport en verwijdert uitsluitend de eigen database in `finally`.
Dit is geen volledige nieuwe migratieketentest; schema en migraties blijven ongewijzigd.
Verbinding uitsluitend via bestaande lokale procesomgeving, nooit in Git of commandoargumenten.

Uitgevoerd op de kandidaatbranch:

- **73 unieke unit-/regressietests PASS**: gerichte set 67/67, daarna de uitgebreide worker-suite
  11/11 (zes aanvullende reconciliatiegevallen; vijf overlap). Contactformulier, nieuwe admissionroute,
  tokenintegriteit/verval, gesloten gates, transportprivacy en maintenance-autorisatie inbegrepen.
- **14/14 schedulerchecks PASS**, inclusief cleanup zonder mailbacklog, batchgrens, reviewblokkade
  en uitsluitend geschoonde tellers in logging.
- **27/27 PostgreSQL-testgroepen PASS**, na de laatste bewaarbeschermingen herhaald. Kolomnamen
  van beide fixtures gecontroleerd tegen het actuele Prisma-model. Exacte grenzen, zes gelijktijdige
  cleanups, admission/purge-race, legacy-replay, actieve leases, foutinjectie/rollback en tellervernieuwing.
- **100 dagen scheduleronderbreking**: 206 metadatarecords en 1005 tellers in drie batches verwijderd;
  beide mailgates gesloten en decryptiesleutel afwezig. Herhaling verwijdert niets extra.
- **Timeout met gesimuleerde provideracceptatie**: één providerpoging, één acceptatie; late response,
  herhaalde trigger en verloren acknowledgement leiden niet tot een tweede providerverzoek.
- **45 gelijktijdige aanvragen**: bij vastgehouden admissionlock 45/45 gecontroleerd 429,
  nul 503; gemeten p95 circa 501 ms. Daarna normale admission en juiste quota hersteld.
- Beide eigen tijdelijke testdatabases zijn in `finally` verwijderd. Bestaande containers bleven
  actief; bestaande PostgreSQL-container bleef healthy. Geen migraties of echte providerverzoeken.
- Volledige lint: **0 fouten, 4 bestaande waarschuwingen** in authformulieren/logout (interne navigatie).
- Standalone TypeScript: **PASS**; productiebuild Next.js 16.4.3: **PASS**. Drie bestaande
  dynamische-filesystemtracingwaarschuwingen in knowledge-source-manifest/logo-storage ongewijzigd.
- Eerste run op de belaste host: timeout bij een bestaande factuurmailtest en workerstart. Gerichte
  herhaling met één worker en 30s testbudget PASS; geen assertions of veiligheidscontroles versoepeld.
- Diff-check en secrets/persoons-/infrastructuurmetadatascan van alle 21 taakbestanden: **PASS**.

Geen brede nieuwe browseracceptatie of echte mailacceptatie geclaimd. De formulierregressies bewijzen
invoerbehoud, dubbel-submitbescherming en geen automatische identiteitvernieuwing na HTTP 410.
Productreview: bestaand uiterlijk, huisstijl, routes en privacycopy behouden; nieuwe fouttekst geeft
een veilige vervolgstap. Alleen de bedoelde contact-admissionroute is toegevoegd. Geen auth-,
financiële, juridische of Compliance-beslisregels gewijzigd.

| Gevraagde eindstatus | Uitkomst |
| --- | --- |
| CONTACT METADATA RETENTION | **BLOCKED voor volledige vrijgave**; automatische afhandeling/purge PASS, onzekere uitzonderingsretentie en operationele maximumgarantie open |
| RATE LIMIT RETENTION | **BLOCKED voor harde maximumgarantie**; periodieke cleanup/boundarytests PASS, uitvalbewaking nog niet operationeel bewezen |
| IDEMPOTENCY | **PASS**, inclusief replay na fysieke purge |
| SCHEDULER RECOVERY | **PASS** voor lokale herstel-/achterstandproeven; geen claim dat de productiescheduler continu beschikbaar is |
| PRODUCTION RETENTION ACTIVATED | **NO** |

### Exacte wijzigingsset

```text
docs/README.md
docs/contact-retention.md
docs/resend-privacy-final-acceptance.md
ops/marketplace-notifications/dispatch.mjs
ops/marketplace-notifications/dispatch.test.mjs
scripts/fixtures/contact-retention-checks.ts
scripts/fixtures/contact-retention-database.ts
scripts/test-contact-outbox-database.ts
src/app/api/contact/request/route.test.ts
src/app/api/contact/request/route.ts
src/components/public/contact-form.test.tsx
src/components/public/contact-form.tsx
src/lib/contact/contact-configuration.ts
src/lib/contact/contact-contract.ts
src/lib/contact/contact-email-worker.test.ts
src/lib/contact/contact-email-worker.ts
src/lib/contact/contact-request-token.test.ts
src/lib/contact/contact-request-token.ts
src/lib/contact/contact-retention.ts
src/lib/contact/contact-service.ts
vercel.json
```

## Latere vrijgave en rollback

1. Afzonderlijke review/merge/deploymentbesluiten; geen uitvoering in deze opdracht.
2. Vóór purge moeten alle aanroepbare contact-ingangen de nieuwe identiteit afdwingen; oude
   deployments/directe clients mogen geen vrije UUIDs meer enqueuen. Client/server/purge vormen
   één releasegrens; het formulier blijft in deze opdracht gesloten.
3. Bewijs schedulerbewaking, capaciteit, escalatie en uitzonderingsretentie vóór afzonderlijke
   activering van CONTACT_RETENTION_ENABLED; beide mailgates kunnen gesloten blijven.
4. Controleer aantallen en achterstand, geen inhoud exporteren. Provider/mailbox/back-upkopieën
   vallen buiten applicatiepurge en hebben afzonderlijke retentieacceptatie.
5. Rollback: retentievlag sluiten, serverweigering van oude identiteiten behouden. Na fysieke purge
   nooit terugrollen naar vrije UUID-admission: dat heropent replays. Noodzakelijke oudere rollback
   vereist gesloten contactingangen en een veilige forward-fix. Geen automatische datarestore.

PRODUCTION RETENTION ACTIVATED: **NO**.
