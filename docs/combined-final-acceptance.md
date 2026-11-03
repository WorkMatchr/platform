# Gecombineerde eindacceptatie — 3 november 2026

Basis main abfb6d6, inclusief gemergede PR #87. Eén gesloten technische kandidaat;
feitelijke juridische correcties uitsluitend in Draft PR #64. Geen productiehandeling.

## Bewijs en veranderingen

- Geen bestaande commerciële logica opnieuw gebouwd. De ongewijzigde nachtvalidatie
  blijft geldig: 229 + 41 regressies; contactaudit16 PostgreSQL-groepen; commerciële
  keten met17 matchingfixtures, zes betaalreplays naar één aankoop/ledger/factuur,
  unlock/offerte/gunning, tenantisolatie en notificatieherstel met synthetische providers.
- [Gesloten besluitregister](contact-decision-register.md) daadwerkelijk geïmplementeerd
  en getest binnen bestaande PostgreSQL-infrastructuur. Geen operationeel register
  geclaimd voordat migratie, individuele bevoegdheden, beleid en beheer zijn vrijgegeven.
- PR #87-auditroute is code in main, niet een ontbrekend ontwerp; productie-uitvoering
  is nog niet toegestaan. Overige marketplace-/financiële audit blijft beschermd.
- Legal PR #64 behoudt concept/noindex, voorlopige identiteit/adres en open leveranciers-
  en doorgiftebesluiten. Eén bestaande juridische beslismatrix bijgewerkt; geen
  bewaartermijn of contract als stilzwijgend vastgesteld gepresenteerd.

## Browser en cookies

Op de met main bytegelijke applicatiebron van de vorige testworktree is de bestaande
authharness opnieuw gebruikt: eigen tijdelijke loopbackdatabase, synthetische accounts,
gesloten gates, geen providercredentials. Geen echte gebruikers of externe betaling.

PASS: opdrachtgeverlogin standaard zonder blijvend inloggen; expliciet concept bewaren,
herladen/herstel, logoutwaarschuwing, annuleren behoudt invoer, bevestigen wist concept
en sessie. Daarna professional met expliciet aangevinkt blijven-inloggen: database
bevestigt168 uur en logout0 sessies. Beheerder standaard24 uur; eigen testsessie kunstmatig
verlopen → beschermde pagina naar login; opnieuw inloggen en uitloggen. Eindcontrole:
0 totale/actieve sessies, lege intake na mount, geen browserconsole-errors.

Desktop en390 pxmobiel gecontroleerd; opslagbediening bereikbaar, zichtbare toetsenbordfocus.
De mobiele screenshot blijft lokaal in genegeerde testopslag, bevat alleen synthetische UI.
Tijdelijke database, accounts, runtimecredentialbestand en eigen server opgeruimd.

De browsertool biedt geen volledige cookiejar-/netwerkexport: HttpOnly-attributen en
sessiecontract zijn daarom via de echte HTTP/PostgreSQL-harness bewezen, niet als
nieuwe browsercookiecapture gepresenteerd. De eerdere anonieme productienetwerkmeting
blijft het bewijs voor publieke scripts. Geen nieuwe tracker gevonden in de ongewijzigde
code. Externe Mollie-checkout en ingelogde productiecookiejar blijven NOT VERIFIED.
Geen betaalverzoek aangemaakt om die bewijsgrens te omzeilen. Geen algemene banner
nodig aangetoond voor de onderzochte WorkMatchr-technieken; optionele opslagkeuzes
blijven expliciet. Juridische beoordeling en externe checkout zijn geen technische PASS.

## Resend — concrete geblokkeerde uitvoering

Read-only providerbrowser: workmatchr.nl Verified. Vercel bevestigt Production-keys
AUTH_EMAIL_FROM en RESEND_API_KEY maar de sensitive waarde blijft afgeschermd, ook
bij gerichte officiële uitlezing van de afzender. Geen sleutel gelezen of gewijzigd.
Een zichtbare Preview-sleutelnaam bewijst geen Production-binding. Preview-overrides
bestaan; metadata bewijst geen volledige credentialisolatie. Geen actieve aanvraag
met een geheim uitgevoerd om dit alsnog groen te maken.

Minimale vervangingsprocedure, **niet uitgevoerd**: bevoegde beheerder verifieert eerst
de bestaande afzender en sleutelbinding veilig. Indien dat onmogelijk is, afzonderlijk
akkoord voor één herkenbare Production-sending-only sleutel beperkt tot workmatchr.nl,
een expliciet bevestigd afzenderadres op dat domein en uitsluitend Production-scope.
Geen kopie naar default/branch-Preview; die bindings afzonderlijk controleren en
werkende testisolatie aantonen. Sleutel via provider/Vercel-beheer opslaan, nooit in
chat/Git/argumenten. De bestaande credential beveiligd beschikbaar houden voor een
geautoriseerde rollback totdat verificatie slaagt. Geen CRON-wijziging.
Resend documenteert beperkte rechten/domeinscope en maakt een bestaande sleutelwaarde
niet opnieuw zichtbaar: [sleutelbeheer](https://resend.com/docs/dashboard/api-keys/introduction).

AUTH_EMAIL_FROM/RESEND_API_KEY bedienen ook verificatie/reset, uitnodigingen en
andere notificaties: controleer verzenderrechten en alle betrokken templates met mocks
vóór een geautoriseerde rollout. Runtimebewijs/deployment vereist apart akkoord.

Eén echte proef blijft het bestaande voorstel uit
[Resend-acceptatie](resend-privacy-final-acceptance.md): exact één eigen geïsoleerde
acceptatie-outbox, gesloten publieke contactgates, alleen contact@workmatchr.nl,
synthetische naam/afzender en herkenbare niet-gevoelige tekst, vaste idempotency-key.
Gerichte dispatch op dat ene record; geen globale due-run. Een poging; bij timeout
stop/reconciliatie, geen tweede verzending. Registreer provider-ID/status afzonderlijk
van daadwerkelijke ontvangst via de bevestigde Vimexx-forwarder/mailbox. De provider
bewaart idempotency keys slechts 24 uur; dit is geen onbeperkte bescherming tegen
herverzending: [Resend-idempotentie](https://resend.com/docs/dashboard/emails/idempotency-keys). Provider-ID
en ontvangstbewijs uitsluitend privaat. Dit bewijst acceptatie→provider→mailbox en
**niet** vanzelf de Production-runtimebinding. Eén daadwerkelijke Production-proef
vereist vooraf bewezen binding én goedgekeurde exact-een-record uitvoeringsroute;
geen algemene contactactivering als workaround. Nog geen verzendtoestemming.

## Mollie — onafhankelijke koper vereist

Synthetische browsercheckout:25 credits, €25,00 excl. btw, €5,25 btw, €30,25 totaal
zonder Pro. Geen klik op betaalinitiatie. Bestaand servercontract met effectief Pro:
10% korting, €22,50 + €4,73 btw = €27,23. Een verlopen kalenderperiode is op zichzelf
geen bewijs dat het bestaande Pro-recht vervallen is. Prijs/rol server-side herlezen.

De eerder aangewezen kandidaat heeft dezelfde bedrijfsidentiteit als verkoper;
geen zelfbetaling als acceptatiebewijs. Geen andere echte organisatie verzonnen of
aangemaakt. **Onafhankelijke bevoegde koper en daardoor het werkelijk verschuldigde
bedrag zijn nog niet vastgesteld.** PO wijst een bestaande onafhankelijke koper aan,
vervolgens read-only factuur-/membership-/Pro-controle. Pakket CREDITS_25, methode
iDEAL/Wero mits aangeboden; bestaande providerredirect, één aankoop/provider-ID.
Verwachting betaald: één25creditbijschrijving, éénledgermutatie, correct saldo,
factuur en bestaande unlockketen. Dubbele webhook levert niets extra op. Bij pending,
timeout, mislukking of annulering geen nieuwe checkout of handmatige creditcorrectie;
bestaande ID/statusreconciliatie gebruiken. Factuurmail/boekhoudgevolgen afzonderlijk
meenemen in betaalakkoord; refund vereist eigen akkoord. Geen echte betaling gedaan.

## Finale testresultaten

- Nieuw register: zes gerichte PostgreSQL-groepen PASS, waaronder concurrency,
  cross-operatorautorisatie, 720-uurgrens, batchrollback/foutinjectie en schadelijke DDL.
- Volledige lokale keten: 95/95 upgrade én fresh, checksums en herhaalde deploy PASS;
  13 least-privilegeweigeringen en 96 negatieve mutatiecontroles PASS. Alleen eigen
  synthetische databases/rollen/artifacts verwijderd; bestaande inventaris gelijk.
- Eerste fresh-run had een lokale timeout. Een volgende run weigerde terecht een
  overgeërfde CRON_SECRET in het testproces. Na alleen die procesvariabele leegmaken
  slaagt de volledige proef; geen productiesecret/configuratie of guard gewijzigd.
- Historische preflight 17 tests en lokale acceptatieconfiguratie 11 tests PASS. Het
  oorspronkelijke acht-migratieplan weigert 95 en 94; geen impliciete uitbreiding.
- Juridische paginatests 18/18 PASS. De ongewijzigde nachtregressies hierboven hergebruikt.
- Beide branches volledige lint PASS: 0 fouten, 4 bestaande interne-navigatiewaarschuwingen.
  Standalone TypeScript PASS; de oude vier typefouten komen hier niet terug.
- Productiebuilds PASS: 172 pagina's, 3 bestaande filesystemtracingwaarschuwingen. De
  technische worktree heeft een externe node_modules-junction; haar ongewijzigde
  applicatiebron is daarom gebouwd in de eerdere worktree met fysieke dependencies.
  src/public/schema/package/lockfile/Next-config zijn aantoonbaar identiek. Nieuw SQL
  en tests zijn op de eigen branch gevalideerd. PR64 is in haar eigen worktree gebouwd.
- Diff-check en gerichte secrets-/infrastructuurmetadatascan PASS; geen testcredentials,
  runtimefixture of screenshot in Git. Eén brede scannerhit was een bestaande
  testidentifier; geen providercredential. Staged scope wordt per commit gecontroleerd.
- Vercel Git-deployment is op beide reviewbranches bewust uitgeschakeld. Geen Preview
  READY of daadwerkelijke productie-/provideracceptatie geclaimd.

## Vrijgavegrenzen

Contactinhoud: bestaande directe redactie bij workeracceptatie en fallback na zeven dagen
ongewijzigd; juridische inhoudsacceptatie open. Metadata30 dagen/tellers24 uur zijn
vastgesteld, register/contactaudit30 dagen uitsluitend voorstel. Geen48 uurexceptie.
Bewijsbehoud voor concrete geschillen vereist gemotiveerde minimale scope en reviewdatum,
geen blanket financiële bewaarplicht. Mailboxjaar blijft; Vimexx-prullenbak/back-ups,
providerkopieën, afspraken/doorgifte en uitvoering blijven te bewijzen.

| Onderdeel | Technisch | Juridisch/operationeel | Eindstatus |
|---|---|---|---|
| Cookies | Onderzochte opslag/keuzes PASS; externe checkout open | Geen algemene banner nodig aangetoond; conceptacceptatie open | NO-GO definitieve vrijgave |
| Privacyverklaring | Concept consistent, geen runtimeafhankelijkheid | Identiteit/adres, rechtsgronden, afspraken/doorgifte en rechtenprocedure open | NO-GO |
| Contactmetadata | Bestaande30-dagenlogica PASS | Geen harde fysieke garantie bij uitval/gates/leases | NO-GO activering |
| Rate-limittellers | Bestaande24-uurslogica PASS | Geen harde fysieke garantie bij uitval | NO-GO activering |
| Privébesluitregister | Gesloten kandidaat getest | Geen beleids-/operator-/migratievrijgave | NO-GO activering |
| Contactaudit | PR #87 beschermd en getest | Migratie 94, beleid en uitvoering niet vrijgegeven | NO-GO activering |
| Resend | Transport/outbox bewezen; domein Verified | Production-binding/Preview-isolatie en echte ontvangst open | NO-GO |
| Mollie | Synthetische keten PASS | Onafhankelijke koper, actueel bedrag en echte betaalacceptatie open | NO-GO |
| Gezamenlijke commerciële acceptatie | Gerichte techniek voorbereid | Bovenstaande productie-/juridische voorwaarden open | NO-GO |

## Maximaal vijf resterende besluiten

1. Juridische conceptacceptatie PR #64: identiteit/adres, doelen/gronden, rollen/DPA/doorgifte,
   rechtenprocedure en cookieverklaring; geen eerder vastgesteld beleid herbeslissen.
2. Inhoud-, register-/contactauditretentie en concrete bewijsbehoudcriteria vaststellen,
   kopieën/receipts/back-ups en aantoonbare uitvoering meenemen; geen automatische48 uur.
3. Bestaande Resendbinding/Preview-isolatie laten bewijzen of de begrensde vervanging
   autoriseren; daarna apart één exact afgebakende mailproef inclusief mailboxbewijs.
4. Onafhankelijke koper aanwijzen en actueel verschuldigd bedrag bevestigen; vervolgens
   apart één betaling inclusief factuur-/boekhoudgevolgen, geen stilzwijgende refund.
5. Pas na herstelbaarheid, schrijfpauze, veilige runtime-DB-rol en beheeropvolging een
   afzonderlijke gereviewde migratie-/operatoruitvoering vrijgeven. Geen brede deploy.

Volgende gerichte opdracht: laat de bevoegde beheerder bestaande Resendbinding en
Preview-isolatie bewijzen, plus één onafhankelijke koper read-only vaststellen; leg
tegelijk de twee juridische besluitblokken voor. Voer daarna alleen de afzonderlijk
goedgekeurde providerproeven uit. Alle productiefeaturegates blijven gesloten.
