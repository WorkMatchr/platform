# Commerciële vrijgave: definitieve besluiten en gerichte correcties

Peildatum: 31 oktober 2026. Basis/main en bevestigde READY Production-commit:
`85426f886bee2820433c268d92b5d7f7624ab861`. Dit dossier is geen uitvoeringsautorisatie.
Het bouwt voort op [WP21](wp21-final-commercial-release-readiness.md), WP19/WP20 en het A/B/C-dossier.
Geen nieuwe algemene audit, productiequery, migratie, providertransactie of featureactivatie.
Gedetailleerde configuratie-, account- en uitvoeringsgegevens blijven uitsluitend in het private bewijsdossier.

## 1. Werkelijk hersteld

### Retentie ook bij uitgeschakelde verzending

De contactworker keerde terug vóór de bestaande zeven-dagenopruiming wanneer de verzendgate UIT stond.
Bij een ongeldige encryptieconfiguratie werd die opruiming eveneens niet bereikt. Daardoor kon afgesloten
contactverwerking versleutelde berichtinhoud onbeperkt laten staan.

De bestaande cleanup draait nu vóór de gate/configuratiecontrole; de bestaande geauthenticeerde
marketplace-maintenance-route roept deze consumer ook bij gesloten verzending aan. Geen tweede systeem,
nieuwe tabel, migratie of provideractie. Ontbrekende/onjuiste maintenance-auth bereikt de consumer niet.
Verzending blijft standaard UIT en vereist dezelfde volledige configuratie.

De bestaande SQL verwijdert uitsluitend de ciphertext na zeven dagen vanaf creatie. SENT wordt direct
na bevestigde provideracceptatie al geredigeerd. Actieve leases blijven beschermd; zodra de lease vervalt
kan een volgende run opruimen. Retentie is dus afdwinging bij de volgende succesvolle onderhoudsrun,
geen onafhankelijk klokproces. Een schedulerstoring vertraagt ook verwijdering. De resterende HMAC,
status, attempts, providerreferentie en tijdstippen hebben nog geen automatische eindretentie.
Deze metadata niet blind verwijderen: deduplicatie/reconciliatie mogen daardoor niet verloren gaan.

### React419: ondersteunde lokale foutgrens

WP21 reproduceerde React419 in een productiebuild na notFound op een beschermde offerteroute en
vervolgens clientnavigatie. Development gaf die fout niet. Dit past bij de open
[Next.js-issue100219](https://github.com/vercel/next.js/issues/100219); dit is geen bewijs dat iedere
React419 in het platform dezelfde oorzaak heeft.

De route `opdrachten/[assignmentId]/offertes` krijgt een pass-through `layout.tsx` en lokale
`not-found.tsx` die exact de bestaande algemene not-foundcomponent hergebruikt. De ondersteunde
[Next.js-not-foundconventie](https://nextjs.org/docs/app/api-reference/file-conventions/not-found)
vangt de verwachte weigering dichter bij de pagina af. Geen nieuwe markup, clientcomponent,
redirect, autorisatie-uitzondering, consolefilter, suppressHydrationWarning of dependencyupgrade.
De memberships-, tenant- en servicecontroles in de pagina zijn ongewijzigd.

Productiebrowserproef met synthetische accounts: vreemde canonieke Request-offertes blijven verborgen;
vervolgnavigatie naar Beschikbare opdrachten en Credits & facturen werkt zonder React419 of andere
consolefout. Ook een ongeldige interne Assignment-identiteit blijft geweigerd. De bevoegde opdrachtgever
ziet via de juiste externe Request-identiteit zijn gegunde offerte. Dit onderscheid is bewust behouden.
Geen algemene claim dat alle frameworkfouten nu verholpen zijn.

### Onderhoudstekst

Platformbeheer zei ten onrechte 'Uurlijkse controle'. De bestaande Vercel-financecron is dagelijks
om03:00UTC; de tekst luidt nu 'Dagelijkse controle'. Geen schedule, financiële regel of alarmdrempel veranderd.

## 2. Juridische beslismatrix — PR64 blijft afzonderlijk Draft

PR64 head `74c6b2077ebdf1d75b55e6dd004b66545c632c47` is OPEN/Draft, met bestaande main-conflicten.
De concepten beschrijven contact nog vanuit de oude PR39/mailto-situatie. De technische opslag-,
sessie- en F3-code staat inmiddels op main. Geen juridische bestanden of imports overgenomen.
Onderstaande punten zijn een reviewaddendum, geen definitieve verklaring op `/privacy` of `/cookies`.

| Onderwerp | Bewezen / vastgesteld | Nog expliciet te besluiten of bewijzen |
|---|---|---|
| Identiteit/contact | Voorgestelde verantwoordelijke Feenstra Safety Consulting, handelsnaam WorkMatchr; contact@workmatchr.nl is door PO bevestigd | Definitieve juridische identiteit en nieuw correspondentieadres vóór publicatie; geen fictief adres invullen |
| Doeleinden/rechtsgronden | Account, organisatie, opdracht, matching/offerte, betaling en correspondentie hebben afzonderlijke doelen | Per categorie art.6-grond vaststellen; contract/precontractueel, gerechtvaardigd belang en wettelijke verplichting zijn geen onderling uitwisselbare standaardgrond. Privacyverzoeken/klachten en vrije tekst apart beoordelen |
| Leveranciers/overeenkomsten | Vercel hosting, Neon database, Resend applicatiemail, Vimexx forwarder/mailbox, Mollie betaling, Jortt boekhouding | Feitelijke afspraken/DPA's, subverwerkers en rollen bevestigen. PostgreSQL is software, geen leverancier. Mollies zelfstandige rol voor eigen betaaldiensten onderscheiden |
| Contact/retentie | Naam, e-mail, onderwerp, bericht en bevroren ontvanger versleuteld in bestaande outbox; AES-GCM/AAD, runtime/keybeheerders kunnen ontsleutelen; inhoud na SENT of bij7dagencleanup geredigeerd | PR64 aanvullen met deze tijdelijke opslag, metadataretentie en fout-/toegangsprocedure. Geen beheer-UI voor ontsleuteling. Eindretentie HMAC/bezorgmetadata en providerlogs onderbouwen vóór purge-implementatie |
| Mailboxbeleid | PO: algemene ontvangen mail maximaal1jaar vanaf ontvangst; gemotiveerde lopende zaken langer; eigenaar controleert/verwijdert handmatig, inbox en archief gelijk | Uitvoering aantonen; jaarlijkse governancecontrole plus voorstel maandelijkse ouderdomscontrole voorkomt dat 'jaarlijks controleren' feitelijk2jaar wordt. Vimexx-prullenbak, back-ups, forwardinglogs/quarantaine en MFA/toegang nog verifiëren |
| Cookies/opslag | Bestaande technische A07-sessies24u standaard, rollend7dagen opt-in; F3 expliciet lokaal bewaren maximaal24u, logoutwaarschuwing en legacykeuze behouden | Definitieve uitleg/rollenreview; huidige inventaris geeft geen aanleiding voor nieuwe trackingbanner. Externe checkout/providertechnieken en eventuele latere analytics opnieuw beoordelen |
| Rechten betrokkenen | Bestaand privacycontact en toegangsbeperking | Procedure identiteit/verzoek/termijn/uitzonderingen/ontvangers uitvoeren en documenteren; accountblokkering is geen volledige verwijdering, financiële historie niet herschrijven |
| Doorgiften | EU-hosting bewijst niet dat alle verwerkers en ondersteuning uitsluitend binnen EER werken | Contractuele doorgiftebasis/subverwerkers, feitelijke regio en aanvullende maatregelen bevestigen; geen onbewezen claim 'alles blijft in Europa' |

Vimexx-route is PO-bevestigd: contact@workmatchr.nl → Vimexx-forwarder → info@workmatchr.nl
(Vimexx-mailbox). Geen zelfstandig geverifieerde mailboxinstellingen of bewijs van permanente
forwarderopslag. [Resend-beveiligingsdocumentatie](https://resend.com/security) beschrijft providerbeleid,
geen bewijs van WorkMatchrs contract of verwijderprocedure. Geen juridische eindgoedkeuring afgeleid
uit technische tests. AP/EUR-Lex-pagina's waren bij deze controle door403/botcontrole niet volledig
uitleesbaar; geen nieuwe juridische verificatie claimen op basis daarvan.

## 3. Eén begrensde Resend-acceptatie, nog NIET uitgevoerd

Production-metadata bevestigt aanwezigheid/scope van RESEND_API_KEY en AUTH_EMAIL_FROM;
geen waarden gelezen/gepubliceerd. Contactgates, contactencryptiesleutel en override-ontvanger ontbreken:
standaardcontact blijft gesloten. DNS-bewijs uit WP21 is hergebruikt; dat bewijst geen verified-status
in het juiste Resend-account, send-scope, exact From-adres of resterend quotum.

Uitvoeringsvoorstel, één bericht:

1. Operator bevestigt in bestaand Resend-account verified workmatchr.nl, toegestane exacte From,
   send-only toegang en resterend quotum. Sleutel uitsluitend via veilige lokale invoer, geen CLI-argument,
   logs/Git/chat. Bij onvoldoende toegang of accountbewijs stoppen; geen permanente testroute toevoegen.
2. Nieuwe uitsluitend lokaal bereikbare synthetische database en dezelfde gereviewde applicatie;
   vooraf nul andere outboxrecords. Publieke productieflags blijven UIT. Alleen deze lokale server krijgt
   CONTACT_FORM_ENABLED/CONTACT_OUTBOX_ENABLED=true, een tijdelijke encryptiesleutel en
   CONTACT_EMAIL_TO=contact@workmatchr.nl. De PO-bevestigde route hierboven is de enige bestemming;
   geen CC/BCC en geen ontvangstbevestiging naar de inzender.
3. Exacte formulierinhoud: naam `WorkMatchr acceptatie`, e-mail `acceptatie@example.invalid`,
   onderwerp `Algemene vraag`, bericht `Gecontroleerde technische bezorgtest, geen klantvraag of persoonsgegevens.`
   Bestaand formulier → POST/api/contact → versleuteld NotificationOutbox-event. HTTP202 en precies één event.
4. Bestaande `deliverContactEmails({ limit: 1 })` exact eenmaal lokaal uitvoeren. Geen globale
   productie-maintenance-run, geen tweede POST, geen geplande retry. Bestaande renderContactEmail en
   sendAuthEmail/Resend blijven de enige template/transportlaag. Voorgestelde teller: claimed1/sent1,
   één provider-ID, SENT, attemptCount1 en ciphertext verwijderd.
5. Operator bevestigt ontvangst in de Vimexx-mailbox, correcte inhoud en forwarderroute. Provider ACCEPTED/SENT
   is niet hetzelfde als DELIVERED/inboxontvangst. Providerdashboard read-only vergelijken; geen openpixel vereist.
6. Bij timeout, onbekende acceptatie, onverwachte ontvanger, configfout, andere outboxrecords of tellerafwijking:
   worker stoppen, dezelfde event/providerreferentie read-only onderzoeken; nooit ter controle een tweede mail sturen.
   Bestaande providerkey/payload blijven bevroren; provider-idempotentie is tijdbegrensd, geen eeuwige garantie.
7. Beide lokale gates sluiten, server stoppen, lokale credentials wissen en uitsluitend eigen synthetische DB
   verwijderen. Bewijs beperken tot aantallen/status/tijdstip. Verwijdering van de ontvangen mailboxmail apart
   expliciet autoriseren of behandelen onder vastgesteld mailboxbeleid. Geen bestaande mail verwijderen.

Kosten: één bericht binnen bestaand quotum; exact accounttarief/quotum vóór uitvoering bevestigen,
geen betaalde upgrade. [Resend-domeincontrole](https://resend.com/docs/dashboard/domains/introduction)
en [idempotentie](https://resend.com/docs/dashboard/emails/idempotency-keys).
Dit bewijst de echte provider-/mailboxketen vanuit de acceptatieomgeving, niet de Production-runtimebinding;
eventuele latere productieactivering vraagt een afzonderlijk releasebesluit.

## 4. Eén beperkte Mollie-acceptatie, nog NIET uitgevoerd

De Production-secretnamen/configuratiescope zijn aanwezig, maar keymodus, actieve betaalmethode,
profielbinding en daadwerkelijke callbackbereikbaarheid zijn niet uit metadata bewezen.
Er is geen geautoriseerde livekoper aangewezen. Dit is een concrete startblokkade, geen fictief testaccount.

1. PO wijst één bevoegde koper en diens eigen organisatie met geldige factuurgegevens aan, uitsluitend
   in een privaat uitvoeringsblad. Geen echte klantorganisatie, verzonnen factuuridentiteit of prijsbypass.
2. Eén normale aankoop CREDITS_25: EUR25,00 netto + EUR5,25 btw = **EUR30,25**, **25credits**,
   geen Pro, coupon of bonus. Dit is het kleinste huidige live-cataloguspakket. Het bestaande EUR1,21-testbedrag
   is uitsluitend voor testkeys en mag niet voor liveacceptatie worden gebruikt.
3. Methode iDEAL/Wero (`ideal`), mits actief in het bestaande profiel. Eén transactie, geen automatische refund.
   Checkoutbedrag/currency/profiel/organisatie/webhook/redirect vóór betaling exact vergelijken.
   Publiek [Mollie-tarief](https://www.mollie.com/nl/pricing): EUR0,32 per geslaagde iDEAL/Wero;
   accountcontract kan afwijken, daarom vooraf controleren. Geen instellingen aanpassen.
4. Verwacht: provider PAID, onafhankelijk opgehaalde juiste providerstatus en bedrag/valuta/tenant,
   één PAID purchase, één +25-ledgerboeking, saldo+25 en één factuur van EUR30,25. Redirect/callbackbody
   is geen betalingsbewijs. Geen automatische opdrachtontgrendeling of verdere aankoop.
5. Maximaal één betaalactie. Controleer provider-ID, callback en lokale registratie read-only;
   bestaande synthetische replay/concurrencytests bewijzen dat dubbele callbacks geen tweede boeking geven.
   Werkelijke webhookontvangst moet nog in deze echte acceptatie worden aangetoond.
6. De betaling kan automatisch één factuurmail en bestaande boekhoudverwerking via Jortt veroorzaken.
   PO-goedkeuring moet de precieze factuurmailontvanger en boekhoudgevolgen afzonderlijk omvatten.
   Geen financieel effect, mail of instelling stilzwijgend buiten de scope toelaten.
7. Bij mismatch, onduidelijke betaling, onverwachte mail/boeken of dubbele registratie stoppen.
   Geen tweede checkout, handmatige credit-SQL of refund. Eerst dezelfde provider-ID en bestaande
   reconciliatieservice onderzoeken; herstel/terugbetaling vraagt afzonderlijk akkoord, historie behouden.

[Provider-testmodus](https://docs.mollie.com/reference/testing) blijft onderscheiden van live.
De uitgevoerde PostgreSQL-tests gebruiken fakegateway en echte domeinservices, geen Mollie-hosted checkout.

## 5. Scheduler, signalering en opvolging

De laatste30 gevonden scheduled GitHub-runs zijn SUCCESS. Bij de onderzochte gaten ontbreekt al
het aanmaak-event: run_started_at volgt created_at, jobstart circa13seconden later en korte uitvoering.
Het WP21-gat02:42:40→08:53:56UTC op31oktober is6u11m16s. De ruimere reeks bevat
op26oktober07:00:31→14:13:06UTC zelfs **7u12m35s**. Geen tussenliggende gefaalde,
geannuleerde of overgeslagen runs aangetroffen in deze reeks. Workflow actief, main/variabeleguard geldig,
cron `*/15 * * * *` en concurrencybescherming ongewijzigd. Geen bewijs van workerlock/pooluitputting
als oorzaak van die ontbrekende events. GitHubs interne reden is zonder provider-events niet vaststelbaar.

[GitHub documenteert vertraagde en mogelijk vervallen scheduled jobs](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).
Dat past bij de waarneming, maar bewijst geen specifieke storingsreden of 'hoge belasting'.
Geen dummycommit, handmatige trigger, betaalde scheduler of speculatieve cronwijziging uitgevoerd.
Due-recordcatchup, begrensde batches, serialisatie, leases en idempotentie slagen synthetisch.
Een interval van15minuten is een verzoek, geen bewezen maximale bezorgvertraging.

| Signaal | Aangetoond | Concrete opvolging / open punt |
|---|---|---|
| Contact/outbox FAILED, expired inhoud, lange PENDING/PROCESSING | Workerstatus, foutcodes, leaseherstel, veilige counters; contactfout maakt schedulejob rood | PO als voorgestelde operator controleert bestaande onderhoudsstatus en ouderdom; geen inhoud loggen. Onzekere provideracceptatie reconciliëren vóór retry |
| Geen schedulertrigger | Historie toont gaten vóór jobcreatie | Een falende-jobmelding detecteert ontbrekende runs niet. Geen onafhankelijke heartbeat of bereikbare ontvanger bewezen; eigenaar/SLA/achtervang en onafhankelijke signalering nog expliciet vaststellen |
| Financiële webhook/reconciliatie | Providerstatuscheck, auth/idempotentie, ledger/factuur en foutinjectie getest | Open betaling via oorspronkelijke provider-ID controleren; geen saldo repareren met SQL. Dagelijks financieel dashboard/onderhoud raadplegen |
| Onderhoud te laat / Jortt vertraagd | Beheerwaarschuwing zichtbaar; tests voor onderhoudsdrempels | Bestaande onderhoudsdrempel3uur versus dagelijkse cron en Jortt2uur is een bestaand operationeel verschil. Niet stilzwijgend alarm verzwakken. Besluit nodig over cadence/SLA en signalering |
| Runtime/authfouten | Lokale server/console en geautoriseerde foutpaden gecontroleerd | Operator beoordeelt incident zonder tokens/berichtinhoud; productie-alertabonnement/ontvangst niet bewezen |

Voorstel tot ingebruikname: PO benoemt operationeel eigenaar en bereikbare achtervang,
controleert minimaal dagelijks financieel onderhoud en gedurende de provideracceptatie vóór/na iedere stap
contactstatus. Spreek maximale wachttijd voor contact/notificaties en onafhankelijke detectie van stilgevallen
runs af. Dit is een beheerplan; geen claim van reeds ingerichte24/7bewaking. Geen alerts geactiveerd.

## 6. Bewijs, browser en databasegrens

- Gerichte Vitest-run:88/88 contact/maintenance/webhook/financiële tests, plus19/19 opdrachtroutetests
  (vier nieuwe checks voor de not-foundgrens, membershipweigering, tenantdoorgifte en eigen offerteweergave).
  Eerdere aanvullende run111/111 is niet opgeteld als onafhankelijke extra dekking.
- Scheduler node:test:12/12, inclusief due0/due>0, gemiste-runbacklog, timeout, begrenzing en veilige logs.
- Contact-PostgreSQL:21/21 op93migraties én21/21 op de nagebouwde85basis. Nieuwe regression test bewijst
  gelijktijdige cleanup met gesloten gate en ontbrekende encryptiesleutel, behoud recente ciphertext,
  actieve lease, wissen na leaseverloop en nul verzending.45concurrente verzoeken blijven gecontroleerd429/202,
  nul503. Timeout/retry/integriteit onveranderd.
- Commerciële PostgreSQL-keten:17matchingfixtures plus echte services als beperkte runtime, fakegateway,
  zes betaalreplays, één purchase/ledger/factuur, mailfout/herstel, annulering/onbevoegde replay,
  canonieke publicatie→matching→unlock→offerte→gunning, tenantisolatie en immutable snapshotbehoud.
- Browser: productiebuild Next16.4.3, eigen lokale database/synthetische accounts. Professional:
  dashboard/credits en herhaalde routeweigering→navigatie; opdrachtgever: eigen gegunde offerte;
  beheerder: cockpit/financieel overzicht en dagelijkse onderhoudstekst. Alle drie daadwerkelijk ingelogd/uitgelogd.
  Geen providerknop aangeklikt. Geen consolefouten in de gecontroleerde flows na de gerichte boundaryfix.
- Mobiel390×844: document375/scroll375, bereikbare UI; desktop1280×900: geen horizontale overflow.
  Tab toont solid focus; Enter vanaf not-found opent kenniscentrum. Bestaande visuele component ongewijzigd.
  Echte browserzoom200% is in deze nieuwe run niet zelfstandig ingesteld; eerdere PO-zoomacceptatie is bestaand
  bewijs, geen nieuwe meting. Nieuwe handmatige200%-controle blijft beschikbaar als PO dat voor deze release verlangt.
- Volledige lint:0errors, vier bestaande Next-waarschuwingen over location.assign in authformulieren/logout.
  TypeScript en productiebuild PASS. Drie bestaande Turbopack-tracingwaarschuwingen over dynamische bestandspaden.
  Eerste build zonder lokale authsecret logde BetterAuth-defaultsecretwaarschuwingen; finale build gebruikte een
  tijdelijke lokale secret en slaagde. Geen productionsecret gebruikt.

Laatste productiecheck85geslaagd/8pending/0checksumafwijkingen uit WP21 hergebruikt:
geen migratiebestanden of schema veranderd en geen nieuwe productiequery nodig. De contactketen is
op85 opnieuw bewezen. Deze fixes hebben geen afhankelijkheid van de acht pending migraties.
De afzonderlijke volledige database-upgrade blijft NO-GO tot herstelbaarheid/schrijfpauze en toestemming.
F4 en LMS blijven UIT; geen framework, juridische hold, pricing- of financiële beslisregel gewijzigd.

### Cleanup en exacte wijzigingsset

Na werkelijk uitloggen zijn nul Better Auth-sessies in de synthetische database overgebleven.
De eigen testserver en gelabelde tijdelijke container met tmpfs-database zijn verwijderd, evenals de
fixturebestanden en tijdelijke credentials. Er resteren de oorspronkelijke drie containers en27volumes;
geen bestaande database, image, volume, worktree of omgevingsbestand verwijderd.

Gewijzigde bestanden:

- `docs/README.md`
- `docs/commercial-final-release-decisions.md`
- `scripts/test-contact-outbox-database.ts`
- `src/app/api/maintenance/marketplace/route.ts`
- `src/app/api/maintenance/marketplace/route.test.ts`
- `src/app/opdrachten/[assignmentId]/offertes/layout.tsx`
- `src/app/opdrachten/[assignmentId]/offertes/not-found.tsx`
- `src/app/opdrachten/[assignmentId]/offertes/page.test.tsx`
- `src/app/platformbeheer/financien/page.tsx`
- `src/lib/contact/contact-email-worker.ts`
- `src/lib/contact/contact-email-worker.test.ts`
- `src/lib/maintenance/database-identity-auth.test.ts`
- `vercel.json` — uitsluitend automatische deployment van deze reviewbranch uitsluiten.

Geen package-, lockfile-, schema-, migratie-, auth-, financiële beslisregel- of juridische paginawijziging.
Diff/secrets/operationele-metadata worden vóór push gecontroleerd; alleen deze13bestanden gaan naar de Draft PR.
GitHub-CI volgt na push; Vercel Preview is bewust uitgeschakeld, dus geen Preview-PASS claim.
Bij een latere rollback kan uitsluitend deze commit worden teruggedraaid; geen datamigratie nodig.
Reeds geredigeerde verlopen contactinhoud wordt niet hersteld door een coderollback. Bij terugdraaien
van de retentiefix moet de operationele opruiming worden geborgd vóór contactactivering.

## 7. Definitieve vrijgavetabel

PASS bij technisch gereed betreft de aantoonbare scope, niet een provider- of productieautorisatie.

| Onderdeel | Technisch gereed | Echte acceptatie | Benodigd besluit |
|---|---|---|---|
| Privacy | BLOCKED | NO-GO | PR64 actualiseren/reviewen: definitief adres/identiteit, rechtsgronden, overeenkomsten/doorgiften, metadataretentie en uitvoering rechten/mailboxbeleid |
| Resend | PASS | NO-GO | Eén mail naar contact@workmatchr.nl via voorgestelde lokale proef; operator bevestigt From/domein/sendscope/quotum en mailboxontvangst |
| Mollie | PASS | NO-GO | Eén aangewezen koper/organisatie, EUR30,25 iDEAL/Wero voor25credits; factuurmail en boekhoudgevolgen expliciet meenemen, geen refund |
| Monitoring | BLOCKED | NO-GO | Eigenaar/achtervang/bereikbaarheid, toelaatbare vertraging en onafhankelijke ontbrekende-runmelding; financieel cadence/alarmverschil beslissen |
| Browser | PASS | GO | Gerichte React419-repro hersteld en drie rollen getest; geen algemene frameworkgarantie. Nieuwe echte200%-meting niet geclaimd |
| Commerciële kern | PASS | NO-GO | Technische herstel-PR reviewen; provideracceptatie, privacy en operationele opvolging afronden vóór commerciële activering |
| Productiedatabase | BLOCKED | NO-GO | Afzonderlijk herstel-/schrijfpauze-/achtmigratiesbesluit; deze contact/browserfix heeft geen migratie nodig |

## 8. Eén gebundeld Product Owner-besluitvoorstel

Beoordeel afzonderlijk binnen dit ene voorstel:

1. Technische herstel-PR: review/latere merge en deployment expliciet plannen; nu uitsluitend Draft.
   PR64 blijft juridisch concept. Benoem definitieve juridische gegevens/overeenkomsten en uitvoerende eigenaar.
2. Resend: maximaal één synthetische mail naar contact@workmatchr.nl, uitsluitend geïsoleerd lokaal via bestaande
   keten, na bevestigde veilige providerconfiguratie; geen publiek formulier of productieflag activeren.
3. Mollie: wijs koper/organisatie en factuurmailontvanger aan; autoriseer daarna maximaal één EUR30,25-betaling
   via iDEAL/Wero, inclusief de afgebakende factuurmail/boekhouding. Geen refund of andere aankoop.
4. Operations: bevestig verantwoordelijke/achtervang, maximaal toelaatbare schedulervertraging en gekozen
   onafhankelijke signalering. Geen nieuwe betaalde dienst of alert activeren zonder dat besluit.
5. Productieactivering, juridische publicatie en database-upgrade blijven afzonderlijke uitvoeringsbesluiten;
   dit voorstel geeft daarvoor geen impliciete toestemming. De acht migraties zijn niet nodig om deze fixes te reviewen.

Geen aanvullend algemeen onderzoekswerkpakket nodig. De resterende punten zijn concrete bewijs-/uitvoeringsbesluiten.
