# WP21 — definitieve commerciële release-readiness

Peildatum: 31 oktober 2026. Dit is een technisch vrijgavedossier, geen juridische of productieautorisatie.

## 1. Managementsamenvatting en gecontroleerde basis

Productie `www.workmatchr.nl` draait aantoonbaar `ac6f92934951b8d23008d601205fad565563bf33`:
Vercel project platform, Production, main, READY. PR's #77, #78 en #79 zijn gemerged.
De volledige Git-tree is identiek aan WP20-head `6fb3b663fb9bc47e5ca1cd2db94d7ea570a1c400`:
`f09fd48b8115e986b3cce4fd38e61f8c3c02c40e`. Eerder bewijs kan daarom voor ongewijzigde code worden hergebruikt.

De commerciële services zijn synthetisch technisch geaccepteerd. Werkelijke providerbezorging,
Mollie-provideracceptatie, juridische informatie en operationele opvolging zijn geen afgeleide
van groene tests. De publieke contactfunctie staat dicht. F4 en LMS blijven uitgeschakeld.
Productie heeft read-only bevestigd 85 geslaagde migraties en acht pending; nul afwijkende
checksums en nul onafgemaakte of teruggedraaide registraties. Migratie blijft NO-GO.

Bronnen voor bestaand bewijs: [WP20](wp20-commercial-core-completion.md),
[WP19](wp19-commercial-release-acceptance.md), [commerciële implementatie](commercial-launch-finalization.md),
[WP17B](wp17b-runtime-verification-and-acceptance-environment.md),
[A/B/C](final-release-closure-abc.md) en de bestaande D1/D2-rapporten.
D1-P2 en geslaagde synthetische hersteltests zijn niet opnieuw uitgevoerd.
Geen algemene laptopaudit, productieactie of providertransactie uitgevoerd.
Gedetailleerde configuratie-identiteiten en synthetische uitvoeringslogs blijven privé buiten Git en synchronisatiemappen.

## 2. Contact en Resend: feitelijke status

Eén bestaande keten: `/contact → POST /api/contact → submitContact → NotificationOutbox(CONTACT_MESSAGE)
→ deliverContactEmails → sendAuthEmail/Resend`. Geen parallel mailsysteem, nieuwe tabel of migratie.

| Controle | Bewijs en grens |
|---|---|
| Standaard gesloten | Beide contactflags en contact-encryptiesleutel ontbreken in de Production-configuratiemetadata; browser toont uitgeschakeld formulier. Geen waarde opgehaald of gewijzigd |
| Providerconfiguratie | Production bevat namen RESEND_API_KEY en AUTH_EMAIL_FROM. Afgeschermde waarden, werkelijke accountstatus, afzender en quota niet gecontroleerd |
| DNS | DKIM-record en SPF aanwezig; DMARC-record aanwezig. Dit bewijst niet dat Resend het domein in het juiste account als verified markeert |
| Ontvanger | Configuratie valt terug op contact@workmatchr.nl. PO-bevestigde route: Vimexx-forwarder → info@workmatchr.nl bij Vimexx; daadwerkelijke bezorging niet getest |
| Validatie/misbruik | Servercontract, honeypot, origincontrole, veldlimieten, niet-blokkerende toelatingslock en keyed IP/e-mailquota |
| Duurzame ontvangst | Versleutelde payload plus quota atomair opgeslagen; HTTP202 volgt pas na databasecommit; geen provideractie in de transactie |
| Deduplicatie | Request-ID plus HMAC van inhoud; afwijkende replay geweigerd; bevroren ontvanger/payload/providerkey |
| Worker | Due records, SKIP LOCKED, lease, maximaal vijf pogingen, backoff; acht seconden providerwachtlimiet; onzekere uitkomst na 23 uur naar reconciliatie |
| Status | SENT bewijst provideracceptatie, niet inboxontvangst; late providerresponse overschrijft geen retry |
| Beheer | Maintenance-auth behouden; geen openbaar lees-/decryptie-endpoint; fouten zonder berichtinhoud |

A02 is gedekt door de ongewijzigde WP20-contactharness: **20/20 op 93 migraties én 20/20 op
nagebouwde 85-basis**. Geldig/ongeldig, duplicaat, spam/quota, timeout/providerfout/retry,
workerconcurrentie, databaseuitval, crypto, auth, dataminimalisatie en logs zijn daarin daadwerkelijk getest.
Bij 45 gelijktijdige verzoeken: bezette lock 45×429 en nul503; vrije lock één respectievelijk
twee202 en overige429. Timeout circa8 seconden; twee pogingen/één fakeacceptatie.
Dit is bewuste begrensde toelating, geen capaciteit van45 succesvolle inzendingen.
Geen aanleiding dezelfde zware foutinjecties op bytegelijke code opnieuw uit te voeren.

### A03: exact voorstel voor één echte bezorgtest — nog niet geautoriseerd

1. Gebruik een uitsluitend lokaal bereikbare acceptatieserver en een nieuwe synthetische database,
   met dezelfde gereviewde contactconsumer en Resend-adapter. Publieke Production-contactflags blijven UIT.
   De testdatabase bevat geen andere outboxrecords; geen globale productie-maintenance-run.
2. Operator bevestigt in het bestaande Resend-account het geverifieerde domein workmatchr.nl,
   de toegestane exacte From en resterend quotum. DNS/keymetadata alleen is onvoldoende.
   Gebruik bestaande geautoriseerde send-only toegang via veilige lokale secretinvoer, nooit CLI-argument/log/Git.
3. Voorgestelde enige ontvanger: **contact@workmatchr.nl**, na expliciet PO-akkoord voor die bestemming
   en de bestaande Vimexx-forwarder. Geen CC/BCC, geen ontvangstbevestiging aan afzender.
4. Eén formulierinzending: naam `WorkMatchr acceptatie`, afzender `acceptatie@example.invalid`,
   onderwerp `Algemene vraag`, tekst `Gecontroleerde technische bezorgtest, geen klantvraag of persoonsgegevens.`
   Eén versleuteld event. Alleen lokaal beide contactgates aan, aparte tijdelijke encryptiesleutel.
5. Verwerk exact dat ene record met bestaande consumer `limit:1`, één workerinvocatie en maximaal
   één echte providerpoging. Geen automatische scheduler of tweede invocatie. Bestaande idempotentiesleutel behouden.
6. Controleer één provider-ID/ACCEPTED, SENT, attemptCount1, één ontvanger en handmatig één ontvangst
   in de aangewezen mailbox. Bij timeout/onzekere uitkomst: STOP; eerst providerreconciliatie,
   geen tweede mail, nieuwe sleutel of retry zonder nieuw akkoord.
7. Sluit lokale gates/worker en verwijder tijdelijke providercredential uit de testprocessen.
   Bewaar alleen status/tijdstip zonder inhoud. Verwijder uitsluitend eigen synthetische database/keys.
   Mailboxbericht verwijderen is een afzonderlijk expliciet goedgekeurde opruimactie.
8. Kosten: één bericht binnen bestaand plan/quotum; actuele rekening controleren. Geen upgrade.

Dit is een uitvoerbaar begrensd voorstel zodra account, From, sleutelroute en ontvanger zijn bevestigd;
geen claim dat deze beheerhandelingen al zijn uitgevoerd.
[Resend vereist domeinverificatie](https://resend.com/docs/dashboard/domains/introduction).
[Provider-idempotentiesleutels gelden 24 uur](https://resend.com/docs/dashboard/emails/idempotency-keys);
de bestaande23uurgrens voorkomt blind herhalen daarbuiten.

## 3. Mollie, credits en marketplace

Bestaande provideradapter, providerstatusverificatie, transacties, append-only ledger, factuursnapshots,
canonieke publicatie en tenantcontroles blijven ongewijzigd. Geen alternatieve financiële route.
WP20's acht HTTP-webhooktests bewijzen dat vervalste status/bedrag/tenant niet worden doorgegeven;
alleen het gevalideerde provider-ID gaat naar de service, die de status onafhankelijk ophaalt.
Een browserredirect of callbackbody is geen betaald-bewijs. Onbekende providerstatus wordt geweigerd;
OPEN/PENDING en CANCELED/FAILED/EXPIRED geven geen bijschrijving.

**Aanvullend werkelijk uitgevoerd in WP21:** bestaande PostgreSQL-notificatie/commerciële harness
op een nieuw lokaal geïsoleerd doel, als beperkte runtime in plaats van schema-eigenaar.
PASS:17 matchingfixtures; betaalverzoek via fakegateway, zes replays, precies één purchase,
ledgerboeking en factuur; mailfout/herstel; annulering en onbevoegde replay; canonieke
AdviceDossier→Request→handoff→Assignment→matching→credits→unlock→offerte→gunning;
PRIMARY/ADDITIONAL, concurrente workers, retries/voorkeur/privacy, tenantweigering en historische snapshotbehoud.
RouteB zonder primary publiceert wel en wordt niet automatisch gematcht.

De ongewijzigde financiële/concurrency-suites uit WP20 blijven geldig: gelijktijdige deelnemers,
offertes, gunningen, creditmutaties/factuurnummers, rollback en replay-autorisatie.
Deze bewijzen gebruiken **gemockte providers en echte lokale PostgreSQL/services**.
Er is geen Mollie-hosted testsandboxcheckout, echte webhookbezorging of livebetaling uitgevoerd.
Geen bewezen afzonderlijke testcredential/callbackomgeving: Production-keyaanwezigheid is geen toestemming
of bewijs van testmodus. [Mollie scheidt test- en livemodus](https://docs.mollie.com/reference/testing).

### B04: concreet voorstel voor beperkte liveacceptatie — nog niet geautoriseerd

- PO wijst één werkelijk bevoegde koper en diens eigen acceptatieorganisatie aan. Geen bestaande
  klantorganisatie en geen fictieve juridische factuuridentiteit gebruiken. Organisatie-ID en operator
  worden uitsluitend in het private uitvoeringsblad ingevuld; zonder aanwijzing geen start.
- Eén aankoop van **25 credits, EUR30,25 inclusief21% btw**, geen Pro, kortingscode of bonus;
  bestaande catalogus/checkout vóór bevestiging opnieuw exact vergelijken. Stop bij afwijkend bedrag.
- Methode **iDEAL/Wero** in het bestaande WorkMatchr Mollie-liveprofiel, mits die methode daar actief is;
  profiel, valuta, webhook en redirect eerst onafhankelijk bevestigen. Maximaal één transactie.
- [Publieke Mollie-prijs](https://www.mollie.com/nl/pricing): EUR0,32 voor iDEAL/Wero;
  werkelijk contracttarief vóór uitvoering controleren. Geen tarieven of instellingen wijzigen.
- Verwacht: één PAID purchase, één +25-ledgerboeking, één factuur met EUR25,00 netto en EUR5,25 btw;
  beschikbare credits +25, geen automatische marketplacekoop. Match/quote/gunning blijven synthetisch getest.
- Provider-ID/status/bedrag/currency/tenant en webhook→ledger→factuur vergelijken; dubbele callback
  mag geen tweede financieel effect hebben. Browserredirect alleen mag niets bevestigen.
- **Belangrijke afhankelijkheid:** `processMolliePayment` roept na bevestiging de factuurmailservice aan.
  Production heeft Resend-configuratiemetadata. Een livebetaling kan dus ook een echte factuurmail starten;
  Jortt kan via bestaand onderhoud volgen. Geen betaaltest autoriseren zonder expliciete reikwijdte voor
  die mail/ontvanger en bestaande boekhoudgevolgen, of een afzonderlijk gereviewde geïsoleerde providerproef.
  Geen financiële gates/secrets wijzigen om dit te omzeilen.
- Stop bij dubbele records, onbekende status, mismatch, onverwachte ontvanger, ontbrekende actuele privacy-/koopinformatie
  of onzekere provideruitkomst. Herstel via oorspronkelijke provider-ID, nooit directe saldo-SQL.
- Geen refund, creditnota, factuurmail of financiële verwijdering stilzwijgend toegestaan.
  Eventuele terugbetaling met kosten/creditgevolg afzonderlijk laten goedkeuren; financiële historie behouden.

## 4. Privacy-implementatiematrix

[PR64](https://github.com/WorkMatchr/platform/pull/64), head
`74c6b2077ebdf1d75b55e6dd004b66545c632c47`, blijft OPEN/Draft en heeft mergeconflicten.
PR40 blijft auditspoor. Geen juridische bestanden/imports uit die branches overgenomen.
PR64 beschrijft A06 nog als toekomstige verwerking via PR39 en noemt contact via mailto;
dat moet vóór publicatie worden bijgewerkt naar de huidige versleutelde outboxketen.
Technische sessie-/F3-opslag is inmiddels op main en wordt niet teruggedraaid.

Legenda: **T** technisch bevestigd, **P** PO-beleid, **V** voorstel/review vereist, **O** ontbrekend uitvoeringsbewijs.
Artikel6-verwijzingen hieronder zijn kandidaten voor juridische beoordeling, geen vastgestelde rechtsgrond.
Geen PostgreSQL als leverancier: PostgreSQL is software, Neon is de betrokken databasedienst.

| Onderdeel, doel en gegevens (T) | Leveranciers/ontvangers, toegang (T/O) | Rechtsgrond/rol (V) | Bewaren en verwijderen (T/P/O) |
|---|---|---|---|
| Accounts: naam/e-mail, hash, verificatie/reset, sessie/IP/user-agent voor toegang/herstel | Vercel/Neon/Resend; HIBP hashprefixcontrole; eigen gebruiker en bevoegd beheer | 6b waar eigen contract, anders6f veilige toegang; rollen bevestigen | T standaard24u sessie, opt-in rollend7 dagen; technische expiry ≠ purge; account/verificatie/logretentie en vernietigingsprocedure O |
| Organisaties: zakelijke naam/adres, leden, rollen, uitnodigingen | Eigen actieve tenant/membership, bevoegd beheer; hosting/database | 6b/6f; verhouding werkgever/WorkMatchr beoordelen | Statusblokkering is geen verwijdering; termijn na uitdienst/einde relatie en uitzonderingen O |
| Advieswijzer: deskundigheid, onderwerpen, vrije tekst, locatie/voorkeur, concept | Vercel/Neon en eigen organisatie; browser sessionStorage | 6b voorbereiding op verzoek, anders6f te onderbouwen | Concept/historie/antwoordrevisies apart beleid O; Compliance-wisactie wist deze sessionStorage niet |
| Opdrachten: beschrijving, locatie, planning, auditactor en immutable snapshot | Eigen tenant; veilige preview aan professional, volledige gegevens pas na geautoriseerde unlock | 6b/6f, doelbinding en verantwoordelijkheden V | Geen algemene automatische purge; snapshots niet herschrijven; bewaartermijn/rechtenafhandeling O |
| Matching/offertes: professionele expertise, regio, membership/voorkeuren, offerte/berichten en gunning | Relevante professionals/opdrachtgever, bevoegd beheer; Vercel/Neon/Resend | 6b/6f; geen medische of automatische juridische beoordeling | Matching-/bericht-/offerte-/auditretentie en anonimisering O; geen vrijgave om gegevens voor test te wissen |
| Credits/betalingen: bedrag, betaalreferentie/status, ledger, factuuridentiteit/btw | Mollie zelfstandige rol per betaaldienst beoordelen; Jortt boekhouding, Resend factuurmail, hosting/database | 6b betaling en6c concrete fiscale bewaarplicht; reikwijdte juridisch vaststellen | Immutable financiële historie; wettelijke termijn per document/categorie vaststellen, niet generiek alles permanent bewaren |
| Contactformulier: naam/e-mail/onderwerp/bericht/ontvanger, HMAC/quota/bezorgmetadata | Vercel/Neon ciphertext; runtime/keybeheerders kunnen decrypten; Resend; ontvangend Vimexx | 6b concrete precontractuele vraag of6f correspondentie; privacyverzoek/klacht apart beoordelen | T inhoud direct na SENT geredigeerd, anders7 dagen bij worker; resterende metadata geen TTL. P mailbox1 jaar vanaf ontvangst, gemotiveerde uitzonderingen. Uitvoering O |
| E-mailnotificaties: ontvanger, veilige preview, template, status/attempts/provider-ID | Resend; geadresseerde mailbox; onderhoudsautorisatie/bevoegd beheer | 6b noodzakelijke service of onderbouwd6f; voorkeur is geen algemene marketingtoestemming | Retry5/23u; outboxmetadata/provider-/mailboxretentie afzonderlijk vaststellen |
| Browseropslag: F3-antwoorden/context, oude concepten; opdrachtconcepten apart | Lokaal apparaat; geen externe opslagdienst door dit mechanisme | Functionele gevraagde opslag; informeren, noodzaak beoordelen | T expliciet bewaren24u vanaf actie, niet automatisch verlengen; expiry bij relevante actie; logoutwaarschuwing/verwijdering; legacykeuze, actieve invoer in geheugen |
| Cookies: Better Auth sessie-/cache en functionele context | Eerste partij; server-side Vercel/Neon/Resend/Jortt zijn geen bewijs van browsercookies; betaalpagina apart | Noodzakelijke sessie/context mogelijk vrijgesteld; geen bewezen trackingbasis | T sessiecookie bij standaardlogin, servermax24u; opt-in7 dagen; context/caches volgens A07-inventaris; actuele verklaring nog concept |
| ComplianceF3: vijf oriëntatieantwoorden en relevante onderwerpen | Lokale conceptopslag, ingelogd bestaand dossier bij expliciete opslag; tenantautorisatie | 6b/6f per dienst; vrije tekst minimaliseren |24u lokaal volgens boven; serverbeoordeling/historie eigen beleid O; geen automatische rechtsconclusies |
| F4/LMS inactief: versiegebonden beoordelingen/voortgang/examen/certificaat later mogelijk | Gereviewde architectuur aanwezig, gates uit; geen nieuwe productiecollectie door WP21 | Rollen, inhoudelijke/juridische noodzaak en termijn afzonderlijk vrijgeven | Bestaande historische resultaten intact; geen activatie of nieuw retentiebesluit |

**Doorgifte voor alle rijen:** feitelijke regio, contract/DPA, subprocessors en toegang per leverancier
moeten uit het echte account/dossier blijken. Geen garantie dat alles binnen de EER blijft.
Resend documenteert opslag in de VS; een EU-verzendregio is geen EER-opslaggarantie, standaardmail/logretentie
30 dagen op Free/Pro/Scale en backups7 dagen. Dit is providerdocumentatie, geen gecontroleerde
WorkMatchr-accountinstelling. Signed-DPA-document/gebruikelijke doorgiftegrondslag controleren.
[Resend security](https://resend.com/security). Voor Vercel/Neon/Vimexx/Mollie/Jortt blijft
WorkMatchr-specifiek bewijs open; geen overeenkomst als gesloten presenteren zonder bewijs.

Geen nieuwe cookiebanner: op basis van A07/ongewijzigde code geen aangetoonde niet-vrijgestelde tracking.
Dat is geen algemene juridische vrijstelling voor toekomstige scripts of Mollie-checkout.
[Nederlandse AP over cookies](https://autoriteitpersoonsgegevens.nl/nl/onderwerpen/internet-telefoon-tv-en-post/cookies)
en [ACM over cookies/opslagtechnieken](https://www.acm.nl/nl/verkoop-aan-consumenten/reclame-en-verleiden/online-beinvloeden/cookies-plaatsen).
Publieke `/privacy` en `/cookies` tonen nog placeholders; registratie noemt tijdelijke juridische informatie.
Dit is een daadwerkelijke commerciële publicatieblokkade, niet opgelost door technische session-securitytests.

### Contactretentie, sleutels en noodzakelijke aanvulling PR64

- AES-256-GCM versleutelt naam, e-mail, onderwerp, bericht én ontvanger; IV/tag en keyed digest
  plus technische bezorgmetadata zijn apart opgeslagen. AAD bindt ciphertext aan het event.
- De onafhankelijke32bytekey hoort server-side in begrensde secrettoegang. Wie runtime én key kan
  beheren kan decrypten; encryptie beschermt niet tegen een bevoegde, gecompromitteerde runtime.
  Geen UI voor ontsleuteling. Production-key ontbreekt nog; geen sleutel aangemaakt/geactiveerd.
- Ontbrekende/ongeldige key sluit intake; foutieve key of gewijzigde ontvanger/payload geeft veilige
  foutstatus, geen omleiding. Rotatie tijdens pending werk kan delivery/deduplicatie breken:
  eerst stop-intake, bestaande key behouden tot reconciliatie/redactie, daarna apart gereviewde rotatie.
- SENT verwijdert inhoud direct. Niet-afgeleverde ciphertext wordt pas bij een geldige workercontrole
  na7 dagen verwijderd, actieve lease uitgezonderd. Gate uit/worker uit betekent **geen periodieke verwijdering**.
  CreatedAt verandert niet door retry. Providerresponseverlies kan inhoud tot deze grens vasthouden.
- Event/provider-ID, HMAC, status/pogingen/foutcode/fingerprint blijven zonder automatische eindtermijn.
  Dit is geen bewezen anonimisering. RateLimit-fingerprints ouder dan1 uur worden bij een volgende
  toegelaten inzending opgeruimd; zonder verkeer geen onmiddellijke purge.
- **Voorstel ter acceptatie:** inhoudbeleid hierboven behouden, onbekende aflevering uiterlijk vóór23 uur
  beoordelen; gefaalde payload vóór7 dagen opvolgen. Geredigeerde contactmetadata maximaal30 dagen
  na terminale status, daarna gerichte controle/verwijdering met audit zonder inhoud, behoud bij gemotiveerd incident.
  Deze30dagengrens is nog niet geïmplementeerd of goedgekeurd; eerst technische referentie-/replayreview.
- **Vastgesteld PO-mailboxbeleid:** algemene ontvangen mail maximaal1 jaar vanaf ontvangst, inbox én archief;
  noodzakelijke lopende zaak/klacht/geschil mag gemotiveerd langer, na afsluiting opnieuw beoordelen.
  Eigenaar controleert/verwijdert handmatig jaarlijks en registreert datum/aantallen/uitzonderingscategorie,
  geen persoonsgegevens. Geen bewijs dat dit al operationeel gebeurt. Jaarlijkse controle alleen garandeert
  geen exact1jaarmaximum: voorstel maandelijkse leeftijdscontrole naast jaarlijkse beleidscontrole.
- Vimexx-trash/backup/forwarderlogs/quarantaine/MFA/toegang blijven te verifiëren. Geen automatische
  30dagentrashgarantie. Geen mailboxinstelling of bericht gewijzigd.

Conceptaanvulling voor review in PR64 (niet de publieke pagina):
“Wanneer u het contactformulier gebruikt, verwerken wij uw naam, e-mailadres, onderwerp en bericht
voor ontvangst en behandeling. Het platform bewaart de inhoud versleuteld tijdens verzending naar
onze contactmailbox. Na bevestigde acceptatie door de e-maildienst wordt de inhoud uit de
verzendwachtrij verwijderd. Niet-afgeleverde inhoud wordt volgens de nog te accepteren
transportretentie verwijderd; technische aflevergegevens hebben een afzonderlijk bewaarbeleid.
De ontvangende mailbox valt onder het door de eigenaar vastgestelde e-mailbewaarbeleid.”
Voor publicatie moeten de termijnen en daadwerkelijke uitvoering expliciet worden ingevuld/geaccepteerd;
geen voorstel als werkende garantie publiceren.
## 5. Browseracceptatie en React419

Werkelijke browser: Chromium-gebaseerde Codex in-app browser. Productie is uitsluitend anoniem
bekeken; nooit een echt account gebruikt of contact/publicatie/betaalformulier ingestuurd.
Lokale productiebuild en afzonderlijke developmentreproductie gebruiken uitsluitend de eigen
synthetische database, beperkte databaserol en geblokkeerd extern transport.

| Controle | Werkelijk resultaat |
|---|---|
| Productie homepage/navigatie | PASS: homepage, primaire CTA en beide deeplinks; mobiele menu-uitklap en toetsenbordfocus |
| Contact | PASS gesloten: geen verzendmogelijkheid, toelichting zichtbaar; privacy-/bestaande contactroutes intact |
| Opdrachtstart | PASS generieke Ja/Nee-keuze, directe deskundigheidselectie20 opties en onderwerpselectie; beide deeplinks renderen bestaande flow |
| Registreren/inloggen | PASS publieke weergave, twee accounttypen, Ingelogd blijven standaard uit; geen productieaccount gemaakt |
| Opdrachten/marketplace | PASS anoniem: beide routes verwijzen naar login met returnTo; geen gegevens getoond |
| Privacy/cookies | Beide placeholders daadwerkelijk zichtbaar; daarom geen juridische publicatie-PASS |
| F4/LMS | `/wijzers/compliance/v2` en `/e-learnings` tonen not-found; marketingpagina's zijn geen actieve runtime |
| Opdrachtgever lokaal | Werkelijk inloggen, eigen dashboard/organisatiecontext, gegunde offerte zichtbaar, uitloggen |
| Professional lokaal | Eigen dashboard, creditopbouw31 beschikbaar, één100-creditboeking en69 verbruik; preview42 credits toont veilige velden, kopen disabled bij onvoldoende saldo; vreemde opdrachtgeverofferte geweigerd |
| Beheerder lokaal | Eigen Platformbeheer-cockpit; acht bewust gefaalde synthetische notificaties met actieadvies; financiële tellingen en ontbrekend onderhoud zichtbaar; herladen en uitloggen werken |
| Mobiel/toetsenbord |390×844, document375px/scroll375px; menu en formulier bereikbaar, Tab geeft zichtbare solide focus |
| Desktop |1280×900, document1265px/scroll1265px; deskundigheidselectie zichtbaar met focus; geen horizontale overflow |
|200% | Eerder expliciet PO-akkoord voor ongewijzigde UI hergebruikt; geen nieuwe meting geclaimd |
| Publieke console | Geen error/hydratatiemelding in de gecontroleerde productieroutes. Geen algemene garantie voor alle routes/sessies |
| Productieruntime | Read-only geaggregeerde Vercel-logs: geen error/fatal-groepen in het gecontroleerde30minutenvenster; geen uptime- of providerbezorggarantie |

De volledige registratie→organisatie→publicatie-browserketen uit WP17B/#77 en de WP20-
rolacceptatie zijn hergebruikt voor ongewijzigde code. WP21 heeft niet alle mutaties opnieuw
in één browsertransactie uitgevoerd. De echte nieuwe PostgreSQL-ketentest vult deze laag aan.
Geen hosted providercheckout of volledige echte financiële klantreis als PASS gepresenteerd.
Screenshots van gesloten contact, mobiele navigatie en opdrachtstart blijven lokaal buiten Git.

### Gerichte verklaring van de twee WP20-React419-meldingen

1. Bestaande melding:31oktober09:56:10.320UTC, lokale productiebuild van WP20, niet Vercel Production.
   Gerichte browserhistorie: om09:56:05.129 geweigerde opdrachtgeverofferte, vervolgens om
   09:56:10.303 `/professional/opdrachten`. Dus melding17ms na die vervolgnavigatie.
2. Nieuwe geïsoleerde productiebuild van exact dezelfde code/Next16.4.3:
   professional opent opdrachtgeverofferte→correcte not-found→klikt Beschikbare opdrachten.
   Dit reproduceert tweemaal React419 per overgang. Ook not-found→Credits geeft dezelfde melding.
   Normale dashboard/preview/credit/beheer-navigatie en herladen van beheerfinanciën geven geen nieuwe419.
3. Afzonderlijke HTTP/SSR-proef met eigen synthetische sessie toont twee
   `NEXT_HTTP_ERROR_FALLBACK;404`-digests, correcte not-found-UI en **geen offerte-inhoud**.
   HTTP blijft200 omdat de response al streamde; dit is
   [gedocumenteerd Next.js-gedrag](https://nextjs.org/docs/app/api-reference/file-conventions/not-found),
   geen financiële bevestiging of autorisatiebypass. API-testsessie is daarna ingetrokken.
4. `ClientQuotesPage` roept bij ontbrekende/toegangsgeweigerde query `notFound()` aan.
   De geïnstalleerde Next-recoverable-errorcallback filtert CSR-bailout maar geen router404.
   [Upstream issue100219](https://github.com/vercel/next.js/issues/100219) beschrijft precies
   dit gestreamde notFound/Suspense-pad. Dit is ondersteunend frameworkbewijs, geen claim dat
   een nog niet uitgebrachte fix al aanwezig is.
5. Developmentmodus: dezelfde professional/tenantweigering/vervolgnavigatie werkt zonder
   consolefout; geen onderliggende database-/serverexception in beide lokale serverlogs.
   [React419](https://react.dev/errors/419) duidt hier op terugval van een onvoltooide
   server-Suspense-boundary naar clientrendering, niet op aangetoonde ongelijke formulierstate.
6. Concreet gevolg: herstelbare consolemeldingen; not-found blijft correct, vervolgnavigatie
   functioneert, geen tenantlek of verlies van financiële records aangetoond.
   Geen suppressHydrationWarning, consolefilter, authversoepeling, dependencyupgrade of brede layoutwijziging.

**Advies:** functionele routecontroles PASS; onvoorwaardelijke foutvrije consoleacceptatie blijft
open. Technisch beheer volgt de upstreamfix en herhaalt exact deze korte productiebuildproef
bij een gereviewde dependencywijziging. PO kan de afgebakende bestaande renderwaarschuwing
als tijdelijk bekend punt beoordelen; WP21 geeft die acceptatie niet namens de PO.

## 6. Monitoring: actief bewijs versus voorgesteld proces

De bestaande cockpit detecteert FAILED-outboxitems; financieel overzicht toont provider-/ledger-
aggregaten, Jortt-status en onderhoudshistorie. Dit is opnieuw synthetisch browsermatig bevestigd.
Een kaart 'Alle operationele wachtrijen zijn leeg' kan tegelijk met FAILED-outboxsignalering verschijnen:
het betreft verschillende tellingen en mag niet worden gelezen als volledig storingsvrij.

**Werkelijk actief:** GitHub-variable MARKETPLACE_NOTIFICATIONS_ENABLED=true, bestaande CRON_SECRET-
metadata aanwezig; workflow op main met `*/15 * * * *`, concurrency zonder cancel-in-progress.
Vijf laatste gecontroleerde scheduledruns waren SUCCESS. Hun startmomenten in UTC:
30okt15:27:43,19:59:59,23:33:27;31okt02:42:40,08:53:56. De laatste log meldt
claimed0/sent0/retry0/failed0. Dit bewijst een geslaagde geauthenticeerde lege run, niet contactbezorging.
Er zijn tussen deze runs gaten tot **6uur11 minuten**. Geen exacte oorzaak voor ieder gemist
schedule-event vastgesteld; geen retry/trigger uitgevoerd.
[GitHub documenteert vertraging en mogelijk wegvallen van scheduled events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

De bestaande worker haalt due records bij de volgende run in. De launcher heeft een begrensd
batch-/tijdbudget; failed-records maken de run rood, retry-only kan groen blijven. Een groene run
bewijst dus geen lege achterstand of ontvangst. **Geen aantoonbare onafhankelijke alarmontvanger,
queue-age-alert of operationele responstijd.**
Financieel onderhoud staat in vercel.json op **dagelijks03:00UTC**; de huidige UI zegt 'Uurlijkse controle'.
Dit is een bestaande copy/configuratie-inconsistentie, geen reden om zonder besluit het productieschema
te wijzigen. Reviewactie: feitelijke onderhoudscadans en alarmgrens afspreken, copy daarop corrigeren.
Geen claim dat dagelijks onderhoud daadwerkelijk is uitgevoerd op basis van alleen cronconfiguratie.

Alle onderstaande rollen/termijnen zijn **voorstellen**, niet een bewezen operationele bezetting.

| Fout/ernst | Bestaande detectie; automatisch bewezen? | Eerste actie/verantwoordelijke en escalatie | Herstel/reconciliatie |
|---|---|---|---|
| Contact PENDING/PROCESSING te oud, hoog | Metadata/status/due/lease; leeftijdsalarm niet actief bewezen | Beheerder controleert minstens dagelijks én tijdens acceptatie direct; voorstel alarm bij1 uur, escalatie4 uur en ruim vóór23 uur | Oorspronkelijk event/providerkey; provideruitkomst controleren, niet opnieuw insturen |
| Outbox/Resend FAILED, hoog | Cockpit automatisch tellend; actief pushalarm niet bewezen | Beheerder→technisch beheer: config/lease/quota/providerstatus, geen nieuwe key | Eén provideracceptatie; SENT versus inbox apart; vóór7dagenretentie opvolgen |
| Mollie/webhook, hoog | Runtime5xx, payment events, statusoverzicht; geen gesloten alarmketen | Financieel bevoegd beheer→PO/techniek; onafhankelijk originele provider-ID opvragen | Bedrag/currency/tenant→purchase→één ledger/factuur; onbekend blijft onbekend |
| Creditverschil/dubbel financieel effect, kritiek | Ledger/financiële totalen; geen automatische verschilalarmgarantie | Financieel verantwoordelijke direct escaleren naar PO/techniek, verdachte flow begrenzen met apart akkoord | Geen directe SQL; gecontroleerde geautoriseerde correctie en audit |
| Vastgelopen publicatie, hoog | Runtimefout/status/handoffcontrole; geen zelfstandige ouderdomsalert | Techniek controleert Request/handoff/version/idempotentie; opdrachtgever informeren bij aantoonbare impact | Eén Request/handoff/Assignment; immutable snapshot behouden |
| Gunning mislukt, hoog | UI/status/audit | Beheerder controleert actor/membership/quoteversie; techniek bij transactieprobleem | Eén award, geen andere tenant/offerte aanpassen |
| App/DB5xx, kritiek | Vercel-logs en maintenancefailure; notificatieontvangers niet bewezen | Techniek→PO, geen vals202/SENT; herstel alleen volgens apart plan | Controle geaccepteerde versus afgebroken transacties, geen persoonsgegevens in incidentrapport |
| Autorisatie-/tenantafwijking, kritiek | Serverweigeringen/audit; automatische securityalert niet bewezen | Techniek/PO beperken toegang met geautoriseerde maatregel, omvang onderzoeken | Privacy-incidentbeoordeling en eventuele melding door bevoegde verantwoordelijke; geen onbewezen datalekclaim |
| Scheduler ontbreekt, hoog | GitHub-runhistorie/financieel laatste-run; geen watchdog bewezen | Operator controleert iedere afgesproken ronde laatste success/due; vervanger bij afwezigheid | Due-catchup met bestaande worker; geen blind betaald alternatief of ongeautoriseerde trigger |

Compact te ondertekenen beheerbesluit: primaire beheerder, bevoegde achtervang, bestaand storingsadres,
diensturen/reactietijden, escalatiemethode, providerbeheerrechten en financieel incidentmandaat invullen.
Een eerder aangewezen achtervang voor offline herstel is niet automatisch commerciële/on-callautorisatie.
Test daarna synthetisch signaal→ontvangst→opvolging→reconciliatie. Geen nieuwe betaalde monitoringdienst.

## 7. Database en herstelafhankelijkheden

Nieuwe **read-only** controle op de eerder door D1-P2 bewezen productiedoelbranch, plus onafhankelijke
Neon-branchmetadata:85 registraties,0unfinished,0rolled-back. Alle lokale bestanden vergeleken met
registratiechecksum volgens bestaande LF/CRLF-strategie:0afwijkingen,93 lokale migraties,exact8 pending.
Geen productiecredential opgehaald, endpoint geactiveerd of gegevens gemuteerd.
Deze registrycontrole bewijst niet opnieuw alle schema-/data-invarianten of herstelbaarheid.

Exacte pendingvolgorde volgens Prisma:

1. 20260924150000_add_learning_vertical_slice
2. 20260927210000_add_learning_final_exam
3. 20260929100000_add_learning_certificates
4. 20260930100000_add_learning_retention
5. 20260930120000_correct_learning_retention_publication_policy
6. 20261017100000_add_compliance_question_visibility
7. 20261019100000_allow_annual_reminder_reconsent
8. 20261026090000_restore_learning_exam_question_immutability

De LMS-migraties en laatste examenvraagcorrectie moeten als volledige keten worden beoordeeld;
F4 gebruikt vraagzichtbaarheid, jaarlijkse LMS-herinnering gebruikt reconsent. De commerciële
contactketen is op85basis getest en vergt deze acht niet. Schema gereed betekent geen F4/LMS-vrijgave.

**Kort, afzonderlijk migratiebesluit — nog NO-GO:**

1. Benoem één bevoegde migratieoperator en onderhoudsvenster; bevestig exacte gereviewde commit,
   doelidentiteit,85 checksums,geen gedeeltelijke objecten en exactachtpending opnieuw vlak vóór uitvoering.
2. Eerst een actueel aantoonbaar bruikbaar herstelpunt en echte gecontroleerde herstelproef met
   schema/constraints/triggers/functies/registry/rollen/integriteit, vastgelegde RPO/RTO, toegang en cleanup.
   Bestaande synthetische versleutelde PostgreSQL-proef is geen productieherstelbewijs; laptoptraject blijft geparkeerd.
   Zonder reeds goedgekeurde afgeschermde omgeving geen nieuwe kopie/branch als impliciete oplossing.
3. Schrijfpauze aantonen op **alle** kanalen: UI/serveractions, authregistratie/sessiewrites, API's,
   Mollie-webhooks/redirect-reconciliatie, cron/outbox/financieel/Jortt-werk en directe DB-clients.
   Alleen een onderhoudspagina of contactgate is onvoldoende. Providerretry/durable buffering en
   achterstandsreconciliatie vooraf bewijzen; geen webhook200 retourneren zonder duurzame verwerking.
4. Controleer geen actieve writertransacties en geen nieuw werk vanaf het herstelpunt. Stop bij niet
   te pauzeren kanaal, onbekende provideruitkomst, ontbrekende back-upintegriteit, checksum/schema-afwijking.
5. Pas na afzonderlijk expliciet akkoord officiële Prisma-deploy met exactachtmigraties. Geen resolve,
   reset, historische checksumwijziging of handmatige applied-registry. F4/LMS blijven uit.
6. Postflight93/93,checksums,nulfailed plus gegevens/financiële totalen en examenvraagbescherming
   vergelijken; geen herberekening historische beoordelingen. Heropen pas na bevestigde integriteit.
7. Bij fout: schrijfpauze handhaven, niets blind herhalen, bevoegde PO/DB-operator beslist over bewezen
   herstelroute. Herstel kan wijzigingen na herstelpunt verliezen: RPO0 alleen bij werkelijk volledige
   schrijfpauze; geen gegarandeerde RTO uit een synthetische laptopmeting afleiden.

Geen back-up, restore, schrijfpauze, privilegeswijziging of migratie uitgevoerd.

## 8. Validatie, hergebruik en cleanup

| Bewijs | Uitkomst |
|---|---|
| Nieuwe gerichte contractregressies |206/206 PASS,6 bestanden: contact, Mollie-gateway/verificatie, HTTP-webhook en featuregate-isolatie |
| Nieuwe PostgreSQL commerciële keten |PASS,17 matchingfixtures plus financiële/canonieke keten als beperkte runtime; alleen fakeproviders |
| WP20unit/regressies hergebruikt |442/442+159/159=601 PASS; bytegelijke Git-tree |
| WP20contactPG hergebruikt |20/20 op93 en20/20 op85; uitval/timeout/concurrency/encryptie/auth/retentie |
| WP20finance/concurrency hergebruikt |PASS; idempotentie, authorization-on-replay, ledger en snapshots |
| Lint hergebruikt |PASS,0 fouten/4 bekende authnavigatiewaarschuwingen |
| Standalone TypeScript hergebruikt |PASS,0 fouten |
| Productiebuild hergebruikt |PASS,3 bestaande tracingwaarschuwingen; exact deze build is opnieuw browsermatig gebruikt |
| Browser/SSR nieuwe proef |Zie sectie5; React419 gericht reproduceerbaar en geduid, niet verborgen |
| Productiecheck |READY/exacteSHA; configmetadata en read-only85/93-checksumvergelijking |
| Diff/secrets/metadata |Volledige nieuwe commitset vóór push gecontroleerd; geen secret, persoonsgegeven of infrastructuuridentiteit gepubliceerd |

Onderliggende geslaagde [lint/build-CI](https://github.com/WorkMatchr/platform/actions/runs/41191485794)
en [PostgreSQL/regressie-CI](https://github.com/WorkMatchr/platform/actions/runs/41191485795) horen bij de bytegelijke WP20-tree.
Geen nieuwe applicatiecode in WP21; zware suites zijn daarom niet onnodig herhaald.
De nieuwe review-PR krijgt daarnaast reguliere CI; uitkomst en exacte head worden op de PR bijgehouden.
Automatische Vercel-deployment van uitsluitend deze nieuwe branch staat uit. Geen PreviewREADY-claim.

Cleanup uitgevoerd: nul sessies in de eigen testdatabase; beide eigen servers gestopt; eigen tmpfs-
container met synthetische databases/accounts/rollen verwijderd; tijdelijke credentials en fixturebestanden
verwijderd. Alle3 vooraf bestaande containers en27 volumes behouden. De cleanup stopte eerst bij een
onverwachte childprocesnaam; dit bleek de eigen Windows-consolehelper. Identiteit gecontroleerd vóór hervatting.
Bestaande worktrees/databases ongemoeid; onafhankelijke lokale AGENTS-wijziging niet meegenomen.
De eigen door developmentgegenereerde type-import is teruggenomen. Geen package-/lockfilewijziging.

Herhaalbare beperkte WP21-check op de ongewijzigde buildbron:

```sh
npx vitest run src/lib/contact src/lib/finance/mollie-gateway.test.ts src/lib/finance/payment-verification-boundaries.test.ts src/app/api/payments/mollie/webhook/route.test.ts src/app/featuregate-isolation.test.ts --maxWorkers=2
npm run test:db:assignment-notifications
```

De databaseharness vereist een expliciete loopbackverbinding naar een nieuw geïsoleerd doel,
maakt eigen testdatabases en weigert echte providercredentials. Browserfixture-retentie is
alleen tijdelijk gebruikt; cleanup is apart gecontroleerd.

## 9. Gefaseerde vrijgave en concrete besluiten

| Onderdeel | Technisch | Nog nodig vóór daadwerkelijk commercieel gebruik / eigenaar |
|---|---|---|
| Publieke site/accounts/organisaties/opdrachtstart |Bestaande regressies en beperkte echte browserchecks PASS |PO juridische informatie/voorwaarden en finale functionele acceptatie; geen echte gebruiker voor test |
| Marketplace/credits/ledger |Synthetische keten GO |PO/provideracceptatie en incidentorganisatie; geen verandering prijzen/matching |
| Contact/Resend |Techniek GO, publiek gesloten |PO contactprivacy/transportretentie/keybeheer, exact éénmailbesluit, ontvangst en operatorrespons |
| Mollie |Mocks/services GO, externe provider niet geaccepteerd |PO koper/profiel/bedrag/methode plus afzonderlijke factuur-/boekhoudgevolgen; eerst testmodusbewijs |
| Juridisch |PR64review nodig |PO/juridisch deskundige: adresZwolle/identiteit, rechtsgronden, leveranciers/DPA/doorgifte, termijnen, mailboxuitvoering en registratievoorwaarden |
| Monitoring |Signalen aanwezig, opvolging niet operationeel bewezen |PO primaire/achtervang/kanaal/diensturen, cadence/alarmlimieten, synthetische opvolgproef |
| Database |85/93bekend, commerciële contactbasis compatibel |PO echte herstelproef + volledige schrijfpauze; daarna apart achtmigratiesbesluit |
| F4 |DISABLED |Bestaande juridische bronholds, frameworkversie/inhoud, aparte migratie- en activatievrijgave |
| LMS |DISABLED |Volledige migratieketen, cursus/examen/certificaat/retentieacceptatie en aparte activatie |

Kortste besluitvolgorde:

1. Juridisch contactaddendum/PR64 en concreet sleutel-/retentie-/mailboxbeheer laten beoordelen;
   definitief correspondentieadres en verantwoordelijke identiteit bevestigen. Niet automatisch publiceren.
2. Bevoegde operator/achtervang en opvolgtijden vastleggen; schedulevertraging en financiële
   cadenceverschil expliciet oplossen vóór een bezorgbelofte. Aanwijsbare ontvanger voor alarmsignalen beproeven.
3. Het ene Resendvoorstel apart autoriseren nadat account/From/toegang/ontvanger vaststaan.
4. Mollie-testmodusprofiel/callback aantonen; daarna maximaal éénlivebetaling met vastgelegde echte
   koper en expliciete downstreamscope. Refund/creditnota blijven apart.
5. Functionele eindacceptatie inclusief bekende upstream419-beperking besluiten; technischeGO is geen PO-handtekening.
6. Herstelproef/schrijfpauze apart autoriseren; uitsluitend na bewijs een apart migratiebesluit.
   F4/LMS blijven ook daarna uit tot hun eigen vrijgave.

Geen nieuw algemeen onderzoek nodig om bovenstaande beslispunten te benoemen. Onbekende provider-
accountgegevens, juridische acceptatie, herstelvoorziening en operationele bezetting kunnen niet
veilig door een codewijziging of een geslaagde mock worden vervangen.

## 10. Wijzigingsset, producttoets en eindadvies

Alleen:

- `docs/README.md`: verwijzing naar dit dossier.
- `docs/wp21-final-commercial-release-readiness.md`: dit publieke, geschoonde dossier.
- `vercel.json`: alleen deze reviewbranch uitsluiten van automatische deployment.

Geen productcode, financiële regel, auth, privacy-pagina, database, migratie, providerconfiguratie
of F4/LMS-gate gewijzigd. PR64/40 ongewijzigd; geen juridische concepttekst in de applicatie gepubliceerd.
Product Constitution: verwachtingen en technische/juridische status onderscheiden, geen ongefundeerde
bezorg-/snelheids-/privacygaranties; privacygrens behouden; onvolledige acceptatie expliciet.
De bekende onderhoudscopy-inconsistentie en419-beperking blijven zichtbaar voor review.

GO hieronder betekent technisch bewezen binnen de beschreven synthetische scope, nooit productieautorisatie.
BROWSER NO-GO betreft de nog onvoorwaardelijke console-/eindacceptatie; de afzonderlijke functionele
controles zijn PASS. COMMERCIAL CORE/OVERALL NO-GO betreft lancering, niet een defecte boekingsketen.

- CONTACT TECHNICAL: **GO**
- RESEND REAL DELIVERY: **NO-GO**
- MOLLIE TECHNICAL: **GO**
- MOLLIE REAL PAYMENT: **NO-GO**
- CREDITS/LEDGER: **GO**
- MARKETPLACE: **GO**
- PRIVACY & COOKIES: **NO-GO**
- BROWSER ACCEPTANCE: **NO-GO**
- MONITORING: **NO-GO**
- DATABASE MIGRATION: **NO-GO**
- COMMERCIAL CORE: **NO-GO**
- F4: **DISABLED**
- LMS: **DISABLED**
- OVERALL RELEASE: **NO-GO**