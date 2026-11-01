# Resend en privacy: gerichte eindacceptatie

**Vervolg na merge van PR #83:** de PO heeft de voorgestelde 30 dagen metadata en 24 uur
contacttellers goedgekeurd. Implementatie, uitzonderingen/reconciliatie en de nog niet geactiveerde
productieretentie staan in [contact-retention.md](contact-retention.md). De onderstaande oorspronkelijke
onderzoeksbevindingen blijven als historische nulmeting behouden; juridische PR #64 blijft concept.

Peildatum: 1 november 2026. Basis: main `ac9b71f010fe1b6c0779d4fda1563d6cb0d831a8`.
Aanvulling op [het commerciële vrijgavedossier](commercial-final-release-decisions.md), WP19–WP21 en PR #81/#82.
Dit dossier geeft geen toestemming voor verzending, contactactivering of juridische publicatie.
Provideridentiteiten, sleutelnamen en gedetailleerd beheersbewijs blijven uitsluitend lokaal buiten Git.

## 1. Nieuwe providerbevindingen

- Na inloggen door de Product Owner is in Resend daadwerkelijk `workmatchr.nl` als **Verified** aangetroffen;
  sending is ingeschakeld en SPF/DKIM staan op Verified. DNS ondersteunt deze records.
  DMARC bestaat met monitoringbeleid `p=none`; dit is geen reject/quarantine-beleid.
  De alignment van een werkelijk verzonden bericht is nog niet gemeten.
- Het actuele accountquotum biedt ruimte voor één bericht. Vóór uitvoering opnieuw controleren;
  geen betaalde upgrade nodig voor deze proef.
- **PO-bevestiging, 1 november 2026:** Production-`AUTH_EMAIL_FROM` en de binding van
  Production-`RESEND_API_KEY` aan een specifieke Resend-sleutel blijven **NOT VERIFIED**.
  De PO ziet alleen een Preview-afzenderinstelling en geen afzonderlijk herkenbare Production-sleutel.
  Eerdere connector-metadata over variabelen is geen bewijs van de Production-waarde of runtimebinding.
  De zichtbare ruimere rechten van een sleutel mogen niet aan Production worden toegeschreven.
  Geen verdere wijziging van productievariabelen of sleutels en geen verzending toegestaan.
  Een volgende providerstap vereist bewezen identiteit/scope en afzonderlijk uitvoeringsakkoord;
  geen bestaande sleutel raden, hergebruiken of vervangen op basis van alleen een naam.
- De domeininstelling gebruikt opportunistische TLS. Dit garandeert geen versleuteling tot iedere
  ontvangende mailserver. Vóór vrijgave een onderbouwd besluit over afgedwongen TLS; niet gewijzigd.
  Het tracking-scherm is een nieuw-configuratieformulier: de daar voorgeselecteerde checkbox is
  **geen bewijs van actieve tracking**. Geen tracking ingeschakeld of instelling opgeslagen.
- Production is READY op bovenstaande commit. Contactgates en contactencryptiesleutel zijn niet
  geconfigureerd; de bestaande standaard is gesloten. HTTP200 en de echte browser bevestigen de melding dat het formulier niet beschikbaar is, met een uitgeschakelde verzendknop. Alleen aanwezigheid van de andere mailvariabelen
  geeft geen contactvrijgave. Er is geen POST naar de productiecontactroute uitgevoerd.

Resend stelt een vooraf ondertekende DPA beschikbaar in het ingelogde Documents-scherm en beschrijft
deze als toepasselijk vanaf accountaanmaak. De eerdere algemene onzekerheid over beschikbaarheid van
een Resend-DPA is daarmee verkleind. Contractpartij, toepasselijke rol en beoordeling door WorkMatchr
blijven te bevestigen. Resend documenteert Amerikaanse opslag, ook bij een Europese verzendregio,
30 dagen e-mail-/logretentie en zeven dagen back-upretentie. Specifieke eerdere verwijdering loopt via
support. Dit zijn providerverklaringen, geen onafhankelijke audit of juridische goedkeuring.
[Resend GDPR/DPA](https://resend.com/security/gdpr).

Berichtinhoudopslag uitschakelen is geen aangetoonde instelling van dit account:
de provider biedt dit onder voorwaarden als betaalde uitbreiding aan. Geen upgrade aangevraagd.
[Resend: berichtopslag](https://resend.com/docs/knowledge-base/how-do-i-ensure-sensitive-data-isnt-stored-on-resend).

## 2. Contactgegevens: inhoud, toegang en verwijdering

De bestaande implementatie is ongewijzigd:

- Naam, e-mailadres, onderwerp, bericht en de vastgezette ontvanger zitten in AES-256-GCM-ciphertext,
  met willekeurige IV, authenticatietag en binding aan het outboxevent. De sleutel is afzonderlijk
  van de database beschikbaar via `CONTACT_MESSAGE_ENCRYPTION_KEY` (32 bytes, hex).
- Buiten de inhoud blijven envelopversie, IV/tag, HMAC-digest, event-/idempotentie-ID, status,
  pogingen, tijdstippen, leasegegevens, payloadfingerprint en eventuele providerreferentie bestaan.
  Rate limiting gebruikt HMAC's van IP/e-mailadres en tellers. Dit is pseudonimisering,
  niet aantoonbare anonimisering.
- Alleen de serverconsumer ontsleutelt in deze contactketen; er is geen lees-/decryptie-UI voor
  klant-, professional- of platformbeheeraccounts. Runtime- en sleutelbeheerders met voldoende
  database- én sleuteltoegang kunnen wel lezen. Provider en ontvangende mailbox krijgen de
  berichtinhoud. Dit is geen end-to-endversleuteling.
- Ontbrekende/ongeldige sleutel blokkeert intake en verzending. Een verkeerde geldige sleutel
  leidt bij ontsleutelen tot een generieke fout/status, niet tot plaintext. Een toekomstige sleutel
  hoort in afzonderlijk beveiligd serverbeheer, met beperkte toegang en een geteste herstel-/rotatieprocedure;
  nooit in browser, Git, commandoregel of logs. Geen sleutel gemaakt of Production gewijzigd.
- **SENT** betekent provideracceptatie: inhoud wordt direct geredigeerd. Bij mislukking blijft
  ciphertext hoogstens tot de eerste succesvolle opruimrun na zeven dagen vanaf creatie, behalve
  zolang een actieve lease beschermd moet blijven. Na leaseverloop kan de volgende run opruimen.
  Ook bij gesloten verzendgate of ontbrekende sleutel wordt oude inhoud opgeruimd.
- Opruiming bewaart status en digest voor deduplicatie. Bezorgen heeft begrensde pogingen en een
  venster van 23 uur; payload/ontvanger blijven vast. Een timeout bewijst geen mislukte aflevering.
- Er bestaat **geen automatische eindretentie voor outboxmetadata**. Oude contact-rate-limitrecords
  worden alleen bij een volgende toegelaten intake opgeschoond. Na sluiting van het formulier is
  voor die records dus geen maximale verblijfduur gegarandeerd. Dit is geen nieuw gerepareerde bug:
  de bewaartermijnen en veilige implementatie zijn nog open.
- De applicatie geeft generieke database-/providerfouten door en logt in deze paden geen berichtinhoud.
  Drie nieuwe regressies injecteren synthetische persoonsgegevens in fouten en controleren zowel
  response als console/stdout/stderr. Providerlogs en mailboxkopieën hebben een eigen lifecycle.

### Concreet voorstel, nog niet goedgekeurd

1. **Berichtinhoud:** bestaande directe redactie na SENT en zeven dagen vanaf creatie voor overige
   inhoud handhaven, met monitoring van de eerste succesvolle cleanup en leaseverloop. Zeven dagen
   biedt tijd voor herstel; het is geen wettelijke standaard en moet op noodzaak worden beoordeeld.
2. **Terminale outboxmetadata:** voorstel 30 dagen vanaf definitieve afhandeling, voor support,
   incidentonderzoek en providerreconciliatie. Een gemotiveerde uitzondering krijgt een einddatum.
   Pas na goedkeuring een gerichte purge ontwerpen en testen die oude request-ID's niet opnieuw
   laat verzenden. Nu blind records verwijderen zou deduplicatie verbreken.
3. **Contact-rate-limittellers:** voorstel uiterlijk 24 uur na het vastgelegde venstermoment, via
   onderhoud dat ook bij gesloten contactgates werkt. De actieve limietvensters duren maximaal
   één uur; een dag geeft operationele marge. Deze periodieke verwijdering is nog niet geïmplementeerd.
4. **Mailbox:** reeds door de PO vastgesteld: algemene mail maximaal één jaar vanaf ontvangst,
   inbox en archief gelijk; noodzakelijke lopende zaken gemotiveerd langer. Eigenaar verwijdert
   handmatig. Voorstel maandelijkse uitvoering met vooruitblik tot de volgende controle, zodat
   berichten niet door een jaarlijkse controle feitelijk twee jaar blijven staan; jaarlijkse
   beleidscontrole. Noteer datum, aantallen en uitzonderingscategorie/einddatum zonder inhoud of
   namen in het controledossier. Vimexx-prullenbak, back-ups en forwarding-/quarantainelogging
   blijven technisch te verifiëren.
5. **Bewijs:** controleer na opruiming aantallen/status en afwezigheid van ciphertext, geen
   ontsleutelde steekproeven in logs. Een application cleanup verwijdert geen eerdere provider-
   of mailboxkopieën. Verwijderverzoeken moeten daarom alle betrokken ontvangers meenemen.

Inhoudsretentie is technisch getest; volledige eindretentie blijft BLOCKED zolang metadata en
periodieke telleropruiming niet zijn begrensd. Er is nu niets verwijderd en geen termijn geactiveerd.

### Aanvullende controles na de PO-bevestiging

- De consumer, maintenance-auth, schoonmaakvoorwaarden en bestaande PostgreSQL-asserties zijn
  gericht nagelopen. Cleanup blijft vóór de verzendgate/sleutelvalidatie staan. Alleen CONTACT_MESSAGE
  wordt geredigeerd; recente inhoud en actieve leases blijven behouden. Bij verlopen lease kan
  de volgende run alsnog opruimen. Geen nieuwe codefout in deze reeds geteste bescherming gevonden.
- De laatste vijf geplande GitHub-runs waren succesvol. Bij de laatste run zijn zowel de dispatchjob
  als de stap die de beveiligde maintenance-route aanroept daadwerkelijk uitgevoerd, niet overgeslagen.
  Er liggen echter meerdere uren tussen runs; ook op het controlemoment lag de laatste run uren terug.
  De ingestelde kwartiercadans is dus geen bewezen operationele garantie. Gedetailleerde tijden/run-ID's
  staan in het private dossier. Geen workflow gestart en geen maintenance-endpoint aangeroepen.
- De scheduler publiceert bezorgtellers, maar neemt de bestaande `redacted`-teller niet over.
  Alleen een groene workflow bewijst daarom niet hoeveel inhoud verwijderd is of dat geen oude
  inhoud achterblijft. Er is geen productie-inhoud geopend en geen dergelijke databasecontrole uitgevoerd.
- De resterende privacyclaims uit §3 zijn inhoudelijke besluiten of nog te bewijzen provider-/beheerafspraken.
  De PO-bevestiging van de onbekende afzender/sleutel geeft geen instemming met bewaartermijnen,
  doorgifte, cookieclaims of juridische publicatie. De bestaande concepten blijven geblokkeerd.

**Uitvoerbare vervolgcriteria voor retentievrijgave, zonder nu beleid te activeren:**

1. Beoordeel de voorgestelde zeven dagen inhoud, 30 dagen terminale metadata en 24 uur tellers
   afzonderlijk. Het reeds vastgestelde mailboxjaar blijft ongewijzigd.
2. Leg voor metadata eerst een begrensde geldigheid van aanvragen en weigering van verlopen
   herhalingen vast. Test daarna replay na purge, dubbele cleanup en gelijktijdige verzending;
   een verwijderde deduplicatierij mag geen tweede mail mogelijk maken.
3. Laat telleropruiming en inhoudsretentie ook zonder nieuwe contactaanvragen werken via het
   bestaande onderhoud. Behoud authenticatie, templatefilter, gesloten verzendgate en leasebescherming.
   Controleer uitsluitend aantallen oude ciphertextrecords, actieve leases en verwijderde records.
4. Gebruik de eerder voorgestelde Product Owner als primaire beheerder; instemming en instructie
   van de voorgestelde achtervang blijven open. Voorstel: signalering wanneer
   één uur geen succesvolle onderhoudsrun is gezien, dagelijkse controle van oude inhoud en een
   jaarlijkse beleidscontrole. Deze drempel is een voorstel, geen bestaand alarm. Laat een gemiste run
   opvolgen zonder automatisch opnieuw mails te sturen. Geen betaalde dienst of configuratiewijziging.

Deze nog te implementeren grenzen en operationele bewijzen blijven expliciete releasevoorwaarden.
Geen onderhoudsaanroep gebruikt als proef: de normale route kan ook andere notificaties verzenden.

## 3. PR #64: gerichte conceptaanvulling en open juridische claims

PR #64 is OPEN/Draft op `74c6b2077ebdf1d75b55e6dd004b66545c632c47`, met bekende main-conflicten.
De tien juridische taakbestanden en hun imports zijn vergeleken met actuele main.
De branch beschrijft contact nog vanuit de eerdere mailto/uitgeschakelde-formuliersituatie.
Geen juridische bestanden, PR #40 of PR #64 gewijzigd; onderstaande tekst is het reviewaddendum,
niet een gepubliceerde verklaring.

**Voorgestelde aanvulling voor menselijke review:**

> Bij gebruik van het contactformulier verwerken wij uw naam, e-mailadres, gekozen onderwerp en
> bericht om uw vraag af te handelen. Het bericht wordt tijdelijk versleuteld in een verzendwachtrij
> bewaard en via Resend verstuurd naar onze contactmailbox bij Vimexx. Na bevestiging van verzending
> verwijderen wij de berichtinhoud uit deze wachtrij. Bij niet-afgeleverde berichten vindt
> verwijdering plaats via het periodieke onderhoud na de vastgestelde bewaartermijn.
> Technische bezorggegevens, providerkopieën en de ontvangende mailbox hebben afzonderlijke
> bewaartermijnen. Die termijnen en de uitvoering daarvan worden vóór activering vastgesteld.

Deze aanvulling moet na besluitvorming concrete termijnen krijgen; publiceer geen placeholder of
garantie dat alle kopieën direct zijn gewist. De zeven dagen in code zijn nog geen juridische acceptatie.

Nog benodigde besluiten, per bestaande claim:

- **Identiteit/contact:** voorlopige onderneming/handelsnaam en KvK zijn bekend in het concept;
  definitieve bevestiging en het nieuwe correspondentieadres vóór livegang ontbreken. Het publieke
  privacyadres is PO-bevestigd. Geen facturatiegegevens of historische stukken wijzigen.
- **Doeleinden/rechtsgronden:** websitebeveiliging, beantwoorden van contact, zakelijke accounts,
  uitnodigingen, profielen en berichten hebben in PR #64 voorgestelde gronden. Leg de noodzakelijkheid
  en belangenafweging vast; overeenkomst is niet automatisch de grond voor iedere werknemer/contactpersoon.
- **Accounts/organisaties/marketplace:** bestaande rol- en tenantgrenzen zijn technische feiten,
  geen algemene rechtsgrond. Bevestig wie voor gedeelde offertes/profielstukken verantwoordelijk is,
  welke ontvangers nodig zijn en welke verwijder-/historie-uitzonderingen gelden.
- **Betalingen:** onderscheid Mollies zelfstandige doeleinden van WorkMatchr-verwerking; benoem
  Jortts rol en afspraken. De fiscale bewaarplicht mag niet zonder onderbouwing op alle account-,
  contact- en marketplacegegevens worden toegepast.
- **Leveranciers/doorgifte:** Vercel, Neon, Resend, Vimexx, Mollie en Jortt per verwerking/contractrol
  vaststellen; PostgreSQL en Better Auth zijn niet automatisch afzonderlijke ontvangers.
  Resends DPA is beschikbaar, maar de toepasselijkheid, doorgiftewaarborgen en subverwerkers moeten
  nog inhoudelijk worden beoordeeld. Geen aanname dat Europese verzending Europese opslag betekent.
- **Bewaren/mailbox:** besluit over bovenstaande inhouds-/metadatatermijnen en aantoonbare uitvoering
  van het reeds vastgestelde mailboxbeleid; uitzonderingen voor klachten/geschillen begrenzen.
- **Rechten:** wijs behandeling, verificatie zonder onnodige identiteitskopieën, termijnbewaking en
  verwijdering bij ontvangers toe. Accountblokkering is geen volledige verwijdering; financiële
  en historische bewijslast niet stilzwijgend herschrijven.
- **Cookies/browseropslag:** behoud bestaande 24-uursessie versus vrijwillig rollend zeven dagen,
  expliciete Compliance-opslag van 24 uur, legacykeuze en logoutopruiming. Opdrachtconcepten in
  sessionStorage hebben een andere lifecycle en worden niet door Compliance-cleanup gewist.
  Laat de bestaande noodzaak-/vrijstellingsbeoordeling en de volledige actuele tekst menselijk
  accepteren; geen nieuwe trackingbanner zonder grond. Een Resend-beheerinterface is geen bewijs
  van browsertracking bij WorkMatchr. Geen betaalcheckout of nieuwe trackingmeting uitgevoerd.

## 4. Tests en scope

- Nieuwe gerichte run: **59/59 PASS in acht bestanden**, inclusief drie nieuwe logging-/foutprivacytests.
  Validatie, encryptie/integriteit, gesloten configuratie, ontvangerbinding, workerretentie,
  providererrors en maintenance-auth zijn gedekt; alle provideracties gemockt.
- Eerder PostgreSQL-bewijs **21/21 op 93 migraties én 21/21 op de 85-migratiebasis** hergebruikt.
  `src`, `scripts`, migraties en packagebestanden van PR #81 zijn identiek aan huidige main.
  Dit betreft bestaande echte SQL-/concurrency-/idempotentietests met synthetische data,
  inclusief gesloten-gatecleanup zonder sleutel. Geen nieuwe database of onnodige migratietest gestart.
- Volledige lint: nul fouten; vier bestaande Next.js-waarschuwingen. Nieuwe test afzonderlijk lintvrij na correctie van een ongebruikte testvariabele. Standalone TypeScript: PASS; de nieuwe werkboom vereiste eerst lokale Prisma-clientgeneratie, zonder databaseverbinding. Finale drie privacytests opnieuw PASS. Productiebuild: PASS met drie bestaande filesystem-tracingwaarschuwingen. De nieuwe werkboom gebruikt een node_modules-junction buiten de Turbopack-root en kon daardoor niet rechtstreeks bouwen. De finale build is uitgevoerd in de bestaande werkboom met aantoonbaar identieke applicatiebron, migraties, packagebestanden en buildconfiguratie; de nieuwe test is afzonderlijk op deze branch getypecheckt. Geen productconfiguratie aangepast om de lokale beperking te omzeilen. Diff-check en secrets-/private-metadatacontrole: PASS.
- GitHub CI op technische commit `a56283e7`: Trading access en Learning publication integrity PASS. De PO-aanvulling wijzigt alleen dit dossier; bestaande tests/build behouden hun geldigheid en zijn niet onnodig herhaald.
- Geen runtimefix nodig gevonden; uitsluitend privacyregressies en documentatie toegevoegd.
  Geen wijziging aan beslisregels, schema, contactgates, providerconfiguratie of juridische pagina's.

## 5. Eén besluitmatrix

| Onderdeel | Bewijs | Openstaand besluit |
|---|---|---|
| Resend-domein | Verified; SPF/DKIM bevestigd; DMARC aanwezig; quotum beschikbaar. Production-From/sleutelbinding ontbreekt | Afzender/sleutelbinding bevestigen; passende sleutelrechten/TLS en provideracceptatie |
| Testontvanger | PO-bevestigd contact@workmatchr.nl via Vimexx naar eigen mailbox; daadwerkelijke ontvangst nog niet getest | Afzonderlijk akkoord voor exact één niet-gevoelige mail en mailboxcontrole |
| Contactencryptie | PASS voor implementatie; Production-sleutel niet ingericht, contact gesloten | Bevoegd sleutelbeheer en afzonderlijke toekomstige provisioning goedkeuren |
| Contactretentie | Inhoudsopruiming PASS; volledige technische eindretentie BLOCKED | Zeven/30 dagen en 24 uur beoordelen; veilige metadata-/telleropruiming en monitoring van gemiste runs afronden |
| Privacyverklaring | Concept; contactaanvulling en concrete open claims vastgelegd | Menselijke inhoudelijke acceptatie, identiteit/adres, gronden, afspraken en uitvoering |
| Cookieverklaring | Concept; huidige functionele opslag behouden | Menselijke acceptatie van inventaris, uitleg en toepasselijke vrijstellingen |

## 6. Eén afgebakende mailproef, pas na afzonderlijk akkoord

1. Bevestig Production-From en de bijbehorende bestaande sleutel veilig; leg uitsluitend
   niet-geheime identiteit/scope vast. Controleer quotum en dat de PO toegang heeft tot de
   ontvangende mailbox. Beoordeel de niet-gevoelige proef inclusief providerdoorgifte.
2. Gebruik één nieuwe loopback-only synthetische acceptatiedatabase met nul outboxrecords,
   gereviewde code en geen scheduler of andere consumers. Beide Production-contactgates blijven
   UIT. Credentials alleen via beschermde procesinvoer; niet via argumenten, bestanden in Git
   of terminalgeschiedenis. Lokale tijdelijke encryptiesleutel gescheiden van de providerkey.
3. Alleen de lokale app krijgt de bestaande contactgates aan en `CONTACT_EMAIL_TO=contact@workmatchr.nl`.
   POST exact eenmaal via het bestaande formulier: naam `WorkMatchr acceptatie`,
   e-mail `acceptatie@example.invalid`, onderwerp `Algemene vraag`,
   bericht `Gecontroleerde technische bezorgtest. Geen klantvraag of persoonsgegevens.`
   Exact verwacht mailonderwerp: **Algemene vraag | WorkMatchr**.
4. Verifieer HTTP202, precies één CONTACT_MESSAGE-event en de vastgezette ontvanger.
   Roep de bestaande `deliverContactEmails({ limit: 1 })` precies eenmaal vanuit de lokale
   operatorcontext aan. Geen globale maintenance-run, geen tweede POST, geen automatische retry.
   Template en Resend-adapter blijven ongewijzigd; de geïnstalleerde SDK voert per send één fetch uit zonder eigen retrylus. Geen CC/BCC of ontvangstmail naar de inzender.
5. Leg apart vast: één provideracceptatie/ID, SENT, attemptCount1, inhoud geredigeerd; daarna
   read-only provider-deliverystatus én ontvangst in de bedoelde mailbox. Controleer op het
   ontvangen bericht SPF/DKIM/DMARC en ongewenste tracking. SENT alleen bewijst geen inboxontvangst.
6. Bij timeout/ambiguïteit: lokale worker stoppen, status read-only reconciliëren; geen tweede
   verzending. [Resend-idempotentie](https://resend.com/docs/dashboard/emails/idempotency-keys)
   heeft een venster van 24 uur en is geen onbeperkte garantie.
7. Sluit lokale gates, stop server, verwijder uitsluitend eigen synthetische testmiddelen en
   lokale credentialkopieën. Mailboxverwijdering vereist afzonderlijk akkoord of uitvoering
   volgens vastgesteld beleid. Deze proef bewijst de keten vanuit acceptatie, niet zelfstandig
   de binding van de Vercel Production-runtime.

## Eindstatus

- RESEND CONFIGURATION: **BLOCKED** — Production-afzender en sleutelbinding door PO als NOT VERIFIED bevestigd.
- RESEND REAL DELIVERY: **NO-GO** — uitvoering niet geautoriseerd.
- CONTACT ENCRYPTION: **PASS** — implementatie; Production-sleutelbeheer nog niet vrijgegeven.
- CONTACT RETENTION TECHNICAL: **BLOCKED** — inhoudsopruiming PASS, volledige metadata-/tellerretentie open.
- CONTACT RETENTION LEGAL: **NO-GO**.
- PRIVACY: **NO-GO**.
- COOKIES: **NO-GO**.
- COMMERCIAL CONTACT RELEASE: **NO-GO**.

Geen mail, providerinstelling, productiewrite, migratie, merge, deployment of juridische publicatie uitgevoerd.
F4/LMS en de publieke contactfunctie blijven uitgeschakeld.
