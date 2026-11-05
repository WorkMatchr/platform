# A07 — ontwerp en herstelvoorstel browseropslag en sessies

**Status: ontwerp goedgekeurd; actuele technische eindacceptatie van 25 oktober staat in [het A07-acceptatierapport](a07-privacy-cookies.md#eindacceptatie-25-oktober-2026). Juridische vrijgave blijft OPEN.** Issue #35, bestaande Draft PR #40. Onderzoek: 15 oktober 2026, baseline `c2152d17b45811f9785ed1e802ae786dd353428c`. Het oorspronkelijke onderzoek hieronder blijft als besluitonderbouwing bewaard. De Product Owner heeft implementatie van de sessiekeuze, expliciete 24-uursconceptopslag, uitlogwaarschuwing en legacyovergang goedgekeurd. De implementatiestatus staat in paragraaf 8. De voorgestelde intrekking van bestaande sessies is nadrukkelijk niet goedgekeurd en niet geïmplementeerd. Geen toestemming voor merge of deployment.

## 1. Expliciet ‘Ingelogd blijven’

### Bevinding

`LoginForm` en de login na `ActivateAccountForm` sturen nu altijd `rememberMe: true`. Better Auth 1.6.23 gebruikt zonder expliciete parameter eveneens true. De huidige WorkMatchr-configuratie kent expiresIn 7 dagen en updateAge 1 dag. De geïnstalleerde bibliotheek geeft `rememberMe=false` een **servergeldigheid van 24 uur**, een sessiecookie zonder persistente maxAge en een `dont_remember`-marker; de normale sessievernieuwing wordt dan overgeslagen. Alleen de checkbox wijzigen zonder de standaard in andere paden te controleren is onvoldoende.

### Voorgestelde wijziging

- Normaal loginformulier: native checkbox **Ingelogd blijven**, standaard niet aangevinkt. Niet opslaan als blijvende voorkeur en niet stilzwijgend afleiden uit een eerdere sessie.
- Toelichting gekoppeld met `aria-describedby`: ‘Gebruik dit alleen op uw eigen apparaat. Uw sessie blijft maximaal 7 dagen geldig en kan bij gebruik worden verlengd. Log uit op een gedeeld apparaat.’ Browserherstel kan ook sessiecookies terugzetten; niet beloven dat sluiten altijd uitlogt.
- Vinkje uit: stuur expliciet boolean false. Vinkje aan: expliciet true. Voeg het veld toe aan de bestaande invoervalidatie; **geen `Boolean("false")`**. FormData vertaalt alleen een daadwerkelijk aangevinkte checkbox naar true.
- Server-side in de bestaande `/sign-in/email`-before-hook: ontbrekende rememberMe standaard false; alleen expliciet true toestaan, ongeldige types afwijzen via Better Auth-validatie. Zo is ook een ontbrekend veld van een andere client geen impliciete toestemming. Geen eigen cookie-/token- of sessiecryptografie.
- Automatisch inloggen na accountactivatie: expliciet false; daar geen tweede onthoudvraag toevoegen. Wie persistentie wil, kan die bij een volgende normale login kiezen. Registratie, verificatie, reset en veilige return-URL blijven hun bestaande gedrag behouden.
- Bestaande serverchecks op accountstatus, membership, tenant en platformrechten, CSRF/trusted-origincontrole, rate limits, wachtwoordbeleid en sessie-intrekking blijven intact. Secure/HttpOnly/SameSite worden niet versoepeld.
- Persistente login houdt de bestaande 7-dagen-/1-dagconfiguratie. Niet-onthouden login gebruikt de native 24-uurslimiet zonder refresh. Geen nieuwe serverretentietermijn voor oude sessierecords claimen.

**Risico's:** eerder opnieuw moeten inloggen bij een lange werksessie; browserherstelgedrag verschilt; een nieuw vinkje herstelt geen historische impliciete keuze. Geen claim dat 7 dagen een absolute maximumduur over alle verlengingen is.

**Acceptatie:** PO keurt standaard uit, toelichting en 24 uur versus bestaande rollende 7 dagen goed. Test login true/false/ontbrekend/ongeldig, fout-/retry-/dubbelklikpad, accountactivatie, logout en cookie-attributen met drie onafhankelijke synthetische logins. Checkbox toegankelijk via Tab/Spatie, label en schermlezer; mobiel/200%. Geen uitbreiding van rechten.

### Bestaande ingelogde sessies

Een bestaande sessie met `rememberMe=true` mag niet achteraf als expliciete toestemming worden gepresenteerd. Alleen ‘wacht 7 dagen’ is onvoldoende, omdat activiteit kan verlengen. **Voorgestelde releasekeuze voor apart akkoord:** pre-release sessies bij het eerstvolgende beschermde gebruik opnieuw laten aanmelden via de bestaande server-side sessie-/autorisatiegrens en Better Auth. Gebruik bestaande aanmaaktijd en één gecontroleerde releasegrens, zonder nieuwe cookie of schemamigratie. Werk de precieze implementatie pas na akkoord uit en test ook Better Auth's sessie-refreshpad; een onbeschermde refresh mag de herauthenticatiegrens niet omzeilen. Geen bestaande sessie, productieaccount of token nu gewijzigd. Indien deze aanvullende release-ingreep niet wordt goedgekeurd, blijft de juridische overgang van bestaande persistente sessies expliciet open.

## 2. Compliance-concepten: concrete termijn en opslagkeuze

### Voorstel: maximaal 24 uur vanaf expliciete bewaaractie

De gratis intake bevat 15 profielvragen. Het gaat om tijdelijk hervatten, niet om een duurzaam dossier. **24 uur** biedt herstel later op dezelfde dag/volgende ochtend zonder wekenlange opslag op gedeelde apparaten. Dit is een proportioneel productvoorstel, **geen wettelijke standaard** en niet afgeleid van het éénjarige e-mailbewaarbeleid. De PO moet bevestigen dat dit past bij werkelijk gebruik.

- Standaard alleen de lopende intake in componentgeheugen; geen automatische localStorage-write bij openen of na invoer zonder bewaarverzoek.
- Gerichte, niet-voorgeselecteerde keuze: **‘Concept 24 uur op dit apparaat bewaren’**. Uitleg over duur, gedeeld apparaat, wissen bij logout en later intrekken. Zonder bewaren blijft de volledige gratis intake bruikbaar; weigeren beperkt geen functionaliteit behalve het expliciet aangeboden herstel na sluiten/herladen.
- Nieuwe key `workmatchr:compliance-free-intake:v2`, envelope met `version: 2`, `savedAt`, `expiresAt`, genormaliseerde `answers` en geldige integer `stepIndex`. Geen account-ID, e-mailadres, token of vrije tekst toevoegen. Deze gratis vragen zijn niet accountgebonden; dit moet ook in de uitleg zichtbaar zijn.
- `expiresAt = savedAt + 24 uur`; normaal lezen, openen of antwoorden wijzigen verlengt die absolute termijn **niet**. Nieuwe bewaartermijn alleen na nieuwe expliciete bewaaractie. Antwoorden binnen de bestaande termijn kunnen worden bijgewerkt zonder nieuwe expiry.
- Voor elke restore: valideer formaat, versie, toegestane antwoordcodes, stap, eindige timestamps, geen toekomstig savedAt en een maximumvenster van 24 uur. Ongeldige/onbekende/te oude data niet gebruiken; wis alleen eigen bekende conceptkeys en toon een neutrale uitleg zonder inhoud te loggen.
- Check expiry vóór read/restore, bij hervatten/focus en vóór iedere write. Een timer voor de open pagina voorkomt hergebruik na het tijdstip; `storage`-events coördineren tabbladen. Bij verlopen termijn: wis de persistente kopie en zet bewaren uit, maar behoud de **lopende invoer in geheugen** zodat actieve gebruikers de intake kunnen afronden. Toon ‘De bewaartermijn is verstreken. Uw huidige invoer blijft beschikbaar zolang deze pagina openblijft.’ Geen automatische verlenging.
- Een slapende/gesloten browser kan geen wiscode uitvoeren. Daarom: na expiry nooit hervatten; fysieke opruiming bij het eerstvolgende uitvoeren van de controles. Geen belofte dat offline browserdata exact na 24 uur fysiek verdwenen is. Een handmatig gewijzigde apparaatklok kan de clientcontrole beïnvloeden; localStorage is geen vertrouwde beveiligings- of autorisatiebron.
- Resultaat, ‘Opnieuw beginnen’ en expliciet ‘Concept van dit apparaat verwijderen’ verwijderen de eigen oude/nieuwe key en schakelen bewaren uit. De write-effect mag niet meteen een leeg concept terugschrijven. Ontbrekende/geblokkeerde opslag of quota-/SecurityError blokkeren het formulier niet; de gebruiker ziet dat bewaren niet is gelukt.

**Risico's:** verlies van niet-bewaarde invoer bij sluiten/herladen, gedeelde origin/tabbladen, opslagfouten en onbetrouwbare apparaatklok. Een korte TTL maakt ongevraagde persistente opslag niet vanzelf vrijgesteld. De expliciete bewaaractie voorkomt een ongemotiveerde algemene banner; privacyadviseur beoordeelt uiteindelijke tekst/keuze.

**Acceptatie:** PO keurt 24 uur, standaard niet bewaren en het onderscheid tussen verlopen kopie en actieve invoer goed. Test 23:59:59, exact expiry, erna, herladen zonder verlenging, actieve sessie bij expiry, geblokkeerde opslag, twee tabbladen en herstart/resultaat. Geen medische/personen-/ongevalsgegevens in tests.

### Uitloggen zonder onbedoeld verlies

- Alleen de Compliance-keys v1/v2 en de betreffende in-memory state opruimen; geen `localStorage.clear()` of `sessionStorage.clear()`. Opdrachtconcepten en serverdossiers vallen buiten deze gedragswijziging.
- Als er een niet-afgerond Compliance-concept is: vóór logout gerichte melding ‘Uitloggen verwijdert uw lokale Compliance-concept’ met **Terug naar mijn concept** en **Uitloggen en concept verwijderen**. Geen gegevens stilzwijgend op een server opslaan. ‘Terug’ laat alles intact.
- Na expliciete bevestiging: lokale kopie wissen en actieve tabbladen informeren; in andere geopende Compliance-tabbladen geen automatische herschrijving uit oude state. Beëindig daarna de sessie via Better Auth. Een `storage`-event moet ook als de key al ontbreekt betrouwbaar een afgesproken lokale wisactie kunnen doorgeven; kies bij implementatie de kleinste geteste oplossing zonder nieuwe persistente tracking-ID.
- Een opslagfout mag de server-side logoutpoging niet blokkeren. Een mislukte logout mag niet als succes worden getoond; lokaal bevestigd wissen kan dan al uitgevoerd zijn, benoem dit eerlijk. Better Auth vangt momenteel een database-deletefout af: het bestaande foutpad blijft een aparte verificatievoorwaarde, geen garantie ontleend aan alleen HTTP 200.
- Voor behoud van noodzakelijk werk kan de gebruiker vóór logout teruggaan en de lopende intake afronden; geen afleiding dat iedere lokaal bewaarde kopie een noodzakelijk dossier is. Afgeronde ingelogde scans/servergegevens blijven onaangetast.

**Acceptatie:** PO keurt het expliciete verliesmoment en bevestiging goed. Test annuleren, bevestigd logout, server-/netwerkfout, geblokkeerde storage en twee tabbladen; geen andere browserkeys of serverrecords verdwijnen. Test daadwerkelijke intrekking, niet alleen redirect.

## 3. Hydratatiefout 418: oorzaak en minimale reparatie

### Reproductie en bewijs

- Eerdere echte lokale browseraudit op 15 oktober: synthetische intake naar stap 2; herladen hervat stap 2 met React-error 418.
- Herhaalpoging in deze onderzoeksronde op bestaande server 3046: DOM-checkboxes veranderden, maar Volgende bleef disabled; geen nieuwe 418 vastgelegd. Deze server is na een eerdere build niet herstart en is geen betrouwbare actuele heracceptatie. De concrete oorzaak van die niet-interactieve pagina is niet als bewezen vastgesteld; geen server-/auth-/DB-omgeving gewijzigd.
- Daarom een **geïsoleerde React/JSDOM-oorzaakproef tegen de ongewijzigde broncomponent** uitgevoerd: SSR `renderToString` zonder window; daarna `hydrateRoot` met `onRecoverableError` en lege of synthetisch gevulde localStorage. Twee gevallen: (1) geen opgeslagen concept → stap 1, **0 hydration-mismatches**; (2) `{ answers: {}, stepIndex: 1 }` → client stap 2, **1 hydration-mismatch**. **2/2 diagnostische tests PASS**, 62,52 s. Dit is een oorzaaksbevestiging, geen gerepareerde regressietest of echte ingelogde browseracceptatie. Tijdelijk testbestand na afloop verwijderd; geen afhankelijkheid, productcode of database gewijzigd.
- Oorzaak: `useState(readStoredIntake)` in `compliance-free-intake.tsx` leest in de eerste clientrender andere data dan SSR. De server heeft `{answers:{},stepIndex:0}`; de client kan stap 1 (nulgebaseerd, dus zichtbaar stap 2) teruggeven. Tekst, voortgang en vragen verschillen bij hydration. Het probleem is dus niet de duur van localStorage of een databasefout.

Volgens [React error 418](https://react.dev/errors/418) duidt dit op verschil tussen server- en clientmarkup. [hydrateRoot](https://react.dev/reference/react-dom/client/hydrateRoot) vereist gelijke initiële output; een tweede render na een effect kan browserafhankelijke gegevens tonen. Beide primaire bronnen geraadpleegd op 15 oktober 2026.

### Voorgestelde reparatie

1. Server en eerste clientrender gebruiken exact dezelfde vaste beginstate of dezelfde korte laadstatus; geen `window`, storage of tijdafhankelijke gegevens in de initializer.
2. Lees/valideer/herstel eenmaal na mount; zet pas daarna een expliciete `storageReady`/herstelstatus. Tijdens herstel zijn antwoorden en Verder niet bedienbaar, zodat nieuwe invoer niet wordt overschreven.
3. Write-effect wacht op voltooide restore én expliciete bewaarintentie én niet-verlopen termijn. Lege beginstate mag een bestaand concept nooit vóór de read overschrijven.
4. Maak herstel idempotent onder React Strict Mode; valideer ook corrupte/ongeldige legacygegevens. Lokale foutafhandeling behoudt een bruikbaar formulier.
5. Verwijder het racepad, niet de waarschuwing: geen `suppressHydrationWarning`, SSR uitschakelen of nieuwe aparte wizard. Vragen en beoordelingslogica blijven gelijk.

**Risico's:** kort laadmoment, focusverlies en effect-race waardoor data verloren gaat. **Acceptatie:** test echte SSR→hydrate met leeg/geldig/verlopen/legacy/corrupt concept, 0 recoverable hydration errors, geen write vóór restore, Strict Mode, toetsenbordfocus en normale/200%-browserflow. Houd een aparte regressietest op correct hervatten van antwoorden én stap.

## 4. Bestaande conceptgegevens en overgang

V1 bevat geen datum. De leeftijd kan niet betrouwbaar worden gereconstrueerd. **Geen stille omzetting naar v2 met ‘nu’ als vermeende oorspronkelijke datum**, geen generieke browserwipe en geen databaseschemamigratie.

**Voorkeursvoorstel ter goedkeuring:** op de eerste relevante bezoekhandeling alleen vaststellen dat een legacykey bestaat; niet automatisch antwoorden tonen of nieuwe persistentie starten. Vraag eenmalig **Hervat oud concept** of **Verwijder oud concept**, met uitleg dat de ouderdom onbekend is. Na expliciet hervatten: read/normaliseer naar geheugen, verwijder v1 zodra herstel geslaagd is; alleen met de nieuwe bewaaractie ontstaat v2 met een werkelijk nieuw gekozen 24-uursvenster. Bij ongeldige inhoud: niet gebruiken, eigen key verwijderen en uitleg tonen. Verwijderen of bevestigd logout wist v1 direct. Falen van read/write/remove mag niet tot stille dataverliesclaims leiden; toon welke stap niet lukte, behoud succesvol ingelezen antwoorden tijdelijk in geheugen.

**Overgangsbeperking:** zolang de gebruiker geen keuze maakt of niet terugkomt, kan oude opslag aanwezig blijven; er is geen technisch bewijs van een oorspronkelijke expiry. Het voorstel verlengt die opslag niet en gebruikt haar niet automatisch. PO/privacyadviseur moet deze tijdelijke herstelroute expliciet accepteren. Alternatief is v1 direct wissen bij eerstvolgend bezoek, maar dat kan een bestaand concept onherstelbaar verwijderen en krijgt daarom geen automatische voorkeur of uitvoering. De implementatie mag deze keuze niet zelfstandig maken.

Voor v2: schema/versie valideren, onbekende nieuwere versies niet destructief als v1 behandelen; bij rollback voorkomen dat oude code een oud v1-concept terugbrengt of nieuw opgeslagen v2 omzeilt. Productrollback vereist daarom opnieuw opslag-/privacyreview. Alleen bekende eigen versiekeys doelgericht behandelen. Opdrachtconcepten in sessionStorage en ingelogde definitieve scans niet migreren of verwijderen.

**Acceptatie:** expliciet PO-besluit over de legacy-herstelroute versus direct verwijderen; tests op geldige/ongeldige v1, onderbroken herstel, onbekende versie, dubbele mount/tab en geen andere-keyverwijdering. Migratie betreft uitsluitend lokale browserdata, geen verzoek om nu data te wijzigen.

## 5. Minimale afzonderlijke lokale acceptatieomgeving

### Actueel vastgesteld

- Bestaande publieke URL `http://127.0.0.1:3046` heeft geen werkende testdatabase en is geen rol-/sessiebewijs. Docker Linux-engine opnieuw onbereikbaar bij read-only `docker ps`.
- Worktree bevat **83 migratiedirectories**. In `20261001113000_add_compliance_domain_versioning_foundation/migration.sql` staan op regels 215/250 nog **`AS $` / `$;`**. Een schone replay kan dus niet zonder afzonderlijke oplossing worden beloofd. Dit is dezelfde bestaande migratieafwijking, niet veroorzaakt door A07; geen migratie herschreven of als applied gemarkeerd.
- `seed:test-providers` maakt een grote dataset (50 aanbieders/20 opdrachtgevers). De onderzochte seed maakt User-/organisatiegegevens maar geen Better Auth-wachtwoordaccounts; zij is daarom niet vanzelf een loginvoorziening en niet de minimale inrichting.
- `scripts/bootstrap-platform-organization.ts`/`ensurePlatformOrganization` maakt alleen de platformorganisatie. Dat is geen volledige eerste-beheerderbootstrap. Bestaande auth-/accountlifecycletests tonen synthetische fixturepatronen; er is geen kant-en-klare veilige drie-loginseed aangetoond.

### Voorgestelde inrichting, nog niet uitvoeren

1. Docker door eigenaar beschikbaar laten maken. Eerst bestaande afzonderlijke testdatabases read-only inventariseren, inclusief werkelijke migratiechecksums en accountmetadata. Bestaande gewone ontwikkel-/productiedatabases niet aanpassen of kopiëren.
2. Indien geen geschikte database bestaat: apart akkoord voor één lokale database `workmatchr_accept_a07`. Gebruik uitsluitend de gecontroleerde migraties van de dan geaccepteerde branch; **eerst de bestaande syntaxblokkade afzonderlijk oplossen**. Geen handmatige migratieregistraties, geen reset van bestaande DB, geen productiebackup. Database-migratiestatus/kolommen/constraints en referentiedata vóór accounts verifiëren.
3. Minimaal drie synthetische accounts en drie organisaties:
   - opdrachtgever: CLIENT, platformRole USER, ACTIVE/geverifieerd, één actieve CLIENT-organisatie en OWNER-membership;
   - dienstverlener: PROFESSIONAL, platformRole USER, ACTIVE/geverifieerd, één actieve PROVIDER-organisatie en OWNER-membership plus alleen benodigde minimale providerregistratie;
   - platformbeheer: bevoegde ADMIN, ACTIVE/geverifieerd, actieve `WORKMATCHR_PLATFORM`-organisatie en benodigde platformmembership. Geen platformrechten aan de twee reguliere accounts.
4. Alleen `example.invalid`-adressen, fictieve namen en testreferenties. Bestaande Better Auth-/organisatie-/platformservices gebruiken. Indien eerste beheeractor niet via bestaande bootstrap kan worden ingericht, is een klein **afzonderlijk goed te keuren testfixturemechanisme** nodig, lokaal en expliciet opt-in, met host/db-allowlist; geen productie-bypass, handmatige sessietoken of eigen passwordhashing. Geen accountprovisioning in deze opdracht.
5. Lokale mail capture uitsluitend voor fictieve activatie/verificatie, geen echte providercredentials of mail. Wachtwoordkeuze/-invoer door eigenaar, geen tokens/passwords in rapport/Git. Gebruik bestaande HIBP-controle; bij onbereikbaarheid niet fail-open maken. Geen betalingen, echte abonnements-/creditacties of schedulerworkers.
6. Procesgebonden DATABASE_URL, synthetisch lokaal authsecret en correcte lokale baseURL; CONTACT_FORM_ENABLED uit, Resend/Mollie/Jortt/cron uit. Geen permanente overschrijving van bestaande env. Voorgestelde vrije poort **3047** pas bij inrichting controleren/starten. **Dit is nu geen beschikbare acceptatie-URL.**
7. Voor juiste productie-cookieflags een lokale HTTPS-productiebuild met vertrouwde certificaatketen, zonder Secure te verlagen. Certificaatvertrouwen niet zonder afzonderlijk akkoord wijzigen. Development/testwisselaar is aanvullend bruikbaar, maar bewijst geen onafhankelijke login: voer alle drie accountlogins/logout apart uit. Testwisselaar niet in productie aanzetten.
8. Na acceptatie alleen de expliciet disposable eigen fixturedata/database opruimen volgens bestaand veilig testpatroon; geen brede cleanup. Geen database of account nu aangemaakt.

**Risico's/acceptatie:** bereikbare Docker, afzonderlijke migratiereparatie, veilige bootstrap van eerste testbeheerder, HTTPS en toestemming voor de lokale inrichting ontbreken nog. Alle drie rolcontroles blijven OPEN. Extra synthetische ADMIN/MEMBER-organisatiemembers zijn alleen nodig als de latere regressiescope die rechten afzonderlijk moet toetsen; geen onnodige 70-accountseed.

## 6. Documentatie, regressies en uitvoeringsgrens

Na implementatie én geslaagde tests pas de privacy-/cookieverklaring actualiseren: standaard sessiegebonden login (native 24 uur), gekozen persistentie (rollende 7 dagen), 24-uursconcept vanaf expliciete bewaaractie, gedeelde-apparaatrisico, fysieke verwijderbeperking bij gesloten browsers, logout/legacy-overgang. Geen voorstel als bestaand gedrag publiceren. Het definitief vastgestelde algemene e-mailbewaarbeleid blijft ongewijzigd. Conceptstatus, Zwolle-adrescontrole en overige A07-acceptatie blijven staan.

Geplande regressies:

| Gebied | Vereist bewijs |
|---|---|
| Login/activatie | Default uit, expliciete true/false, missing false, ongeldige input, geen checkboxvoorkeur uit storage; activation false; bestaande errors/rate-limit/double-submit/returnTo behouden |
| Cookies/server | Browser maxAge/flags, 24-uurs niet-refresh en bestaande 7-dagen-refresh, statusblokkering/reset/tenantautorisatie, historische sessie-overgang, daadwerkelijke logoutintrekking en foutpad |
| Compliance | 24-uursgrenzen/geen stille verlenging, actieve invoer behouden, resultaat/herstart wist zonder herschrijven, quota/SecurityError, invalide timestamp/antwoorden, multi-tab/logout |
| Migratie | V1 onbekende leeftijd, expliciete herstel-/verwijderkeuze, geen stille TTL-reset, corruptie en onderbreking, onbekende versie, andere keys intact |
| Hydration | Echte renderToString→hydrateRoot-proef op alle statussen, geen recoverable errors, write pas na restore, Strict Mode en focus |
| Verklaringen/UI | Opslaginventaris consistent met implementatie; geen absolute wis-/logoutgarantie; labels, Tab/Spatie, schermlezer, desktop/mobiel/echte 200% |

Na goedgekeurde implementatie: relevante tests, volledige lint, standalone TypeScript (baseline apart), productiebuild, diff- en secretscontrole; daarna drie onafhankelijke logins in de geïsoleerde omgeving. Geen database- of echte provideractie in unit-/componenttests.

### Besluiten vóór uitvoering

- [ ] Loginoptie standaard uit, native 24-uursduur en activation false; bestaande persistente sessies eenmalig opnieuw laten aanmelden via gecontroleerde releasegrens.
- [ ] Alleen expliciet gekozen persistente Compliance-opslag, absolute 24 uur, huidige invoer bij expiry in geheugen behouden.
- [ ] Gerichte logoutwaarschuwing en verwijdering van uitsluitend Compliance-opslag, inclusief andere open tabbladen.
- [ ] Legacy-herstelkeuze met erkende overgangsbeperking, of expliciet goedgekeurd direct wissen met dataverliesrisico.
- [ ] Lokale inrichting/fixtures en afzonderlijke migratieoplossing toestaan; HTTPS-aanpak vaststellen.

**Uitgevoerd in deze ontwerpronde:** read-only bron-/bibliotheek-/omgevingonderzoek, publieke browserpoging, 2/2 geïsoleerde oorzaaksproeven en documentatie. Geen gedragswijziging geïmplementeerd. Lint/productiebuild niet opnieuw uitgevoerd voor uitsluitend documentatie; de vorige audit op dezelfde runtimebron had 69 tests/lint/build PASS. Geen nieuw resultaat daarvan geclaimd. Volledige ingelogde acceptatie blijft OPEN. Geen productiegegevens, echte accounts, betaalgegevens, mail, merge of deployment gebruikt/uitgevoerd.


## 8. Implementatie van het goedgekeurde ontwerp — 15 oktober 2026

### Uitgevoerd

- Login heeft de native checkbox **Ingelogd blijven**, standaard uit. FormData accepteert alleen `on` als true. De Better Auth-before-hook vult ontbrekende invoer met false vóór endpointvalidatie; ongeldige typen blijven geweigerd. Accountactivatie gebruikt false. Registratie/verificatie blijven zonder automatische login.
- Native Better Auth: false geeft een sessiecookie en 24 uur servergeldigheid, true behoudt 7 dagen/1 dag rolling refresh. Er is geen eigen token-/cookiecryptografie of nieuwe authprovider. De bestaande veilige cookieattributen en accountstatuschecks blijven gelden.
- Aanvullende fail-closed guard in de bestaande Better Auth session-updatehook: een sessie waarvan de oorspronkelijke servergeldigheid maximaal 24 uur is, mag niet worden verlengd. Dit voorkomt dat het verwijderen van `dont_remember` onbedoeld 7 dagen oplevert. Zonder de marker leidt een refreshpoging tot de native 401/uitloggen; normale korte sessies verversen niet. Zonder oorspronkelijke servercontext wordt geen expiryverlenging toegestaan.
- **Bestaande sessies worden niet ingetrokken of achteraf aangepast.** Zevendaagse sessies behouden hun eerdere gedrag. De juridische overgang van die eerdere impliciete persistentie blijft open voor afzonderlijk besluit.
- Compliance-intake begint voor SSR en eerste clientrender met dezelfde laadstatus. Browserherstel gebeurt na mount; annulering bij unmount en Strict Mode voorkomen voortijdige verwerking. Geen `suppressHydrationWarning` of SSR-uitschakeling.
- Standaard geheugenopslag. Alleen de expliciete knop start v2-opslag. Absolute `savedAt + 24 uur`; updates behouden dezelfde termijn. Een verlopen/verwijderde lease kan niet door een oud tabblad worden hersteld. Verlopen opslag wordt bij lezen, schrijven, focus, zichtbaarheid of timer gecontroleerd. Actieve antwoorden blijven in geheugen behouden.
- Behoud van actieve antwoorden bij verlopen/verwijderen is bewust: ‘Concept van dit apparaat verwijderen’ verwijdert de persistente kopie en zet bewaren uit. Resultaat/herstart beëindigen ook het geheugenconcept. Andere opslag en serverdossiers worden niet aangeraakt.
- Legacy v1: eerst hervatten/verwijderen kiezen, geen automatische antwoorden of fictieve oorspronkelijke datum. Hervatten leest naar geheugen en verwijdert v1; opnieuw bewaren vereist een afzonderlijke actie. Onbekende versie wordt niet stilzwijgend gewist. Ongeldige bekende opslag wordt veilig verwijderd; opslagfouten geven een melding.
- Uitloggen gebruikt een native toegankelijk modal dialog met teruglink en expliciete wisbevestiging, gevolgd door de bestaande Better Auth-signOut. API-/netwerkfouten geven geen succesredirect. Als lokaal wissen door de browser wordt geweigerd, wordt dat zichtbaar gemeld ook wanneer serverlogout slaagt.
- Tabbladcoördinatie: BroadcastChannel met alleen `query`/`present`/`clear`, plus een direct verwijderd `workmatchr:compliance-free-intake:clear` localStorage-signaal als wisfallback. Geen antwoorden, account-ID of tracking-ID verzonden. Een paginalange luisteraar voorkomt hervatten van oude geheugeninvoer na navigatie in een ander tabblad. Bij opslagwijzigingen door een andere tab blijft actieve invoer behouden en gaat bewaren uit.

### Concrete beperkingen en resterende acceptatie

- Een gesloten/slapende browser kan niet op het exacte vervalmoment wissen. Nooit hervatten na expiry; opruimen bij eerstvolgende relevante activiteit. Clientklok en geblokkeerde opslag begrenzen client-side garanties.
- Als BroadcastChannel niet beschikbaar is, kan aanwezigheid van uitsluitend geheugeninvoer in een ander tabblad niet vóór logout worden opgevraagd. Het scoped localStorage-signaal wist die invoer wel wanneer opslag beschikbaar is. Als beide mechanismen geblokkeerd zijn, is geen betrouwbare tabbladcoördinatie mogelijk. Test dit in de daadwerkelijk ondersteunde browsers; geen universele wisgarantie.
- Better Auth kan een interne database-deletefout bij signOut afvangen. De frontend detecteert teruggegeven fouten, maar een 200 alleen is geen bewijs dat iedere databasefout tot intrekking leidde. PostgreSQL-foutinspuiting blijft vereist vóór volledige sessieacceptatie.
- Docker is opgestart. Bestaand `npm run test:db:account-lifecycle` is uitgevoerd met een uitsluitend lokale URL naar de Docker PostgreSQL 17-container. Het script maakt een eigen tijdelijke `workmatchr_account_lifecycle_test_*` database, past de worktree-migraties toe en verwijdert die database in `finally`.
- **Afzonderlijke bestaande migratieblokkade gereproduceerd:** 83 migraties gevonden; replay strandt bij `20261001113000_add_compliance_domain_versioning_foundation`, Prisma P3018 / PostgreSQL 42601, `syntax error at or near "$"` (positie 10788). De foutieve `AS $` / `$;` staat ook op `origin/main`; laatste bestandshistorie `09fb864` / `07e1fa7`. Na de test zijn 0 tijdelijke lifecycle-databases over.
- Geen historische migratie aangepast, overgeslagen of handmatig als applied gemarkeerd. Veilige afzonderlijke herstelroute: eerst de daadwerkelijk toegepaste SQL/checksums in bekende omgevingen read-only vergelijken; afhankelijk daarvan origineel exact herstellen of een controleerbare migratieherstelprocedure vaststellen. Zonder dat bewijs hier geen herschrijving van geschiedenis. Pas daarna volledige schone replay, drie synthetische `example.invalid` accounts via bestaande Better Auth/accountfixtures en onafhankelijke logins voor opdrachtgever/dienstverlener/platformbeheer.
- Daardoor blijven ingelogde PostgreSQL-browseracceptatie, echte cookiejarcontrole voor drie rollen en foutinjectie op sessieverwijdering OPEN. Publieke UI en geïsoleerde native Better Auth-/React-tests zijn afzonderlijk bewijs, geen vervanging daarvan.
- Echte 200%-browserzoom voor de gewijzigde login-/concept-/uitlogbediening blijft handmatige Product Owner-acceptatie. Geen eerdere zoomgoedkeuring van ongewijzigde pagina’s hergebruiken.
- A06 blijft standaard uit; geen productiegegevens, bestaande sessies, mailboxinstellingen, echte mail, betalingen, merge of deployment gewijzigd/uitgevoerd.

Validatieresultaten en de exacte wijzigingsset worden in PR #40 bij deze implementatie vastgelegd. Privacy-/cookieverklaring blijven concept; overige juridische en Vimexx-acceptatiepunten blijven open.


### Validatie en wijzigingsset

- **147/147 tests PASS, 16 suites**: native Better Auth met echte WorkMatchr hooks op een in-memory testadapter (geen PostgreSQL-bewijs), login/activering/logout, headerrollen, consent/TTL/legacy/ongeldige opslag/blocked storage/tabbladberichten/SSR-hydratatie, bestaande intake/public/legal/contactregressies. Geen echte e-mail of account aangemaakt.
- Volledige lint en productiebuild PASS. Productiebuild gebruikt synthetische configuratie en een onbereikbare builddatabase; A06 en mail zijn uitgeschakeld.
- Standalone TypeScript: uitsluitend de **4 bestaande TS2345-fouten** in `src/lib/compliance/rule-engine.test.ts` regels 13/14/23/24 (readonly-array tegenover mutable-arraytype). Dat bestand is inhoudelijk identiek aan `origin/main` (`d3bce31248cf496f4c0563e210addbcb8d2e721c`); geen nieuwe typefout uit deze wijziging.
- Lokale browser op `http://127.0.0.1:3047`: geen bewaaractie → herladen stap 1; expliciet bewaren → herladen stap 2 zonder console-/hydratatiefout; tweede tabblad hervat; verwijderen in tab 1 schakelt bewaren in tab 2 uit en oude invoer schrijft niet opnieuw weg. Logincheckbox standaard uit, bedienbaar met Spatie, gekoppelde uitleg en zichtbare focus. Desktop 1280 px en mobiel 390 px: geen horizontale overflow, knoppen en toelichting leesbaar/bereikbaar. Geen echte login uitgevoerd.
- Echte 200%-zoom expliciet aan Product Owner voorgelegd; nog geen nieuwe PASS ontvangen. Uitlogdialoog/activering getest in React/JSDOM, niet als drie ingelogde browserrollen geaccepteerd.
- Diff-check PASS. Secrets-patterncontrole: geen private keys, providercredentials of credentialbevattende verbindingsstrings aangetroffen. Synthetische fixtures zijn uitsluitend lokaal/in-memory; geen volledige externe secretscanner geclaimd.
- Read-only metadata in bestaande lokale `workmatchr`: geen registratie voor de genoemde compliance-migratie; dit bewijst niet dat zij nergens anders is toegepast. Geen productiecontrole of migratiereparatie uitgevoerd.

Exacte taakbestanden:

- `docs/a07-privacy-cookies.md`
- `docs/a07-storage-session-design.md`
- `src/app/cookies/page.tsx`
- `src/app/public-legal-pages.test.tsx`
- `src/components/auth/activate-account-form.tsx`
- `src/components/auth/login-form.tsx`
- `src/components/auth/logout-button.tsx`
- `src/components/auth/session-choice.test.tsx`
- `src/components/layout/header-logout.test.tsx`
- `src/components/public/compliance-free-intake-storage.test.tsx`
- `src/components/public/compliance-free-intake.tsx`
- `src/components/public/use-compliance-draft.ts`
- `src/content/public-legal.ts`
- `src/lib/auth-session.test.ts`
- `src/lib/auth-validation.ts`
- `src/lib/auth.ts`
- `src/lib/compliance/free-intake-storage.test.ts`
- `src/lib/compliance/free-intake-storage.ts`

Geen migratie-, schema-, package-, lockfile-, omgevings- of A06-codewijzigingen. De gegenereerde wijziging in next-env.d.ts is teruggezet. PR blijft Draft; status volledige A07-eindacceptatie: OPEN/BLOCKED door de genoemde database-/ingelogde controles en juridische acceptatie.


## 9. Heracceptatie 25 oktober 2026

De oude migratieblokkade en open drie-rollen-/foutinspuitcontroles hierboven zijn historische resultaten, inmiddels vervangen door de actuele eindacceptatie. De keten op actuele main bevat 92 migraties; replay, checksums en herhaalde uitvoering zijn op een eigen tijdelijke PostgreSQL-database gecontroleerd. De A07-beforehook bevestigt sessie-intrekking vóór native cookieverwijdering. Een echte DELETE-fout levert 503 en behoudt de cookie voor retry. De browserwaarschuwing, foutmelding, retry, sessieverloop en drie synthetische rollen zijn getest.

F3-opslag en logout worden rechtstreeks uit actuele main hergebruikt; geen oude A07-variant teruggezet. PR #62 blijft intact. Zie het actuele rapport voor aantallen, resterende technische beperkingen en juridische besluiten. Er is geen toestemming tot merge, deployment, algemene sessie-intrekking of definitieve juridische publicatie afgeleid uit deze tests.
