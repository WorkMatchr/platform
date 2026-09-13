# Eenvoudige Advieswijzer → opdracht publiceren

De opdracht van 11 september 2026 vervangt automatische deskundigheidsroutering als kritieke afhankelijkheid van `/advieswijzer`. Dit expliciete productbesluit supersedeert voor deze flow de eerdere automatische vraagverheldering en de bijbehorende voorkeuren in PC-004/005/027. Een gebruiker die de deskundigheid kent mag die zelf kiezen. Er wordt geen professionele beoordeling of geverifieerde deskundigheidsclaim gesuggereerd.

- **Route A:** Ja → keuze uit de twintig bestaande expertise-identiteiten en hun labels. Alleen de taxonomie wordt gelezen; er wordt geen routering uitgevoerd.
- **Route B:** Nee → probleemonderwerp, inclusief Anders met optionele toelichting en Ik weet het echt niet. Er wordt geen expertise afgeleid.
- Beide routes gebruiken dezelfde omschrijving, gewenst resultaat, uitvoering en gewenste start. De technische titel wordt voor nieuwe formulierinvoer deterministisch uit de omschrijving afgeleid; de gebruiker krijgt geen afzonderlijke titelvraag. Geen omvang, upload, organisatieanalyse, contextvraaglus, classifier of providercall.
- Controle toont de daadwerkelijk ingevulde gegevens. Publiceren vereist de bestaande actieve opdrachtgeveridentiteit. Teruggaan behoudt invoer; routewisseling verwijdert de onverenigbare selectie.

## Opslag en bestaande keten

`simpleAdviceSchema` valideert dezelfde typed waarden in browser en server. De expertise-identiteiten komen uit de bestaande goedgekeurde catalogus; de probleemonderwerpen beschrijven de vraag en vormen geen tweede expertisetaxonomie.

De nieuwe startsnapshot staat één keer als `AdviceDossierVersion.simpleRequestSnapshot`, met route, gekozen expertise/onderwerp, resultaat, uitvoering en datum. Titel en omschrijving worden daarnaast geprojecteerd naar de bestaande canonieke `Request.title` en `Request.publicSummary`. De bestaande start-enum is uitgebreid. `Request.notes` bevat een leesbare publicatiesamenvatting van keuze, resultaat, locatie en start; plaats/regio gebruikt `Request.region`. Deze projectie blijft immutable, ook na een wijziging aan een organisatielocatie. De dossierbron is `SIMPLE_ADVICE` en bevat geen gegenereerd advies of matchingprofiel.

De bestaande AdviceDossier/Request-keten wordt gebruikt. Publicatie maakt dossier, startsnapshot, Request en auditevents atomair in één serializable transactie. De bestaande tellers en publicatiebeperkingen blijven gelden. Het server-side gecontroleerde submit-ID maakt dubbelklikken en parallelle verzoeken idempotent; gewijzigde inhoud op hetzelfde ID is een conflict. Accountstatus, membership, organisatie en eventuele vestigingslocatie worden binnen de transactie opnieuw gecontroleerd. Clientinvoer bevat geen vertrouwde tenant-ID.

Voor onderwerp-only requests is `Request.primaryExpertise` null en zijn expertise-codearrays leeg. Dit is een geldige publicatie. De bestaande eligibility-service levert dan geen automatische professionele doelgroep op; onderwerpgestuurde matching wordt niet in deze wijziging ontworpen. De interne Assignment- en bestaande provider/offerteketens blijven bestaan. Een nieuw eenvoudig dossier biedt geen tweede oudere opdrachtintake aan naast zijn gepubliceerde Request.

## Migratie en historie

`20260912090000_simple_advice_request` voegt één nullable JSONB-snapshotveld, één bronroute en drie start-enumwaarden toe en maakt de Request-expertise nullable. Er worden geen bestaande records of gepubliceerde vraagsetversies herschreven. Bestaande immutable dossier- en requesttriggers en append-only events blijven actief.

## Browserstate en grenzen

Invoer blijft in React-state en, indien beschikbaar, tabgebonden `sessionStorage` bewaard. Opdrachtgeverconcepten zijn gescheiden per gebruiker. Alleen een expliciete loginactie neemt het anonieme tabconcept mee; na succesvolle publicatie wordt het concept verwijderd. Browseropslag is geen serverdossier en werkt niet als overdracht naar een ander apparaat. De bestaande registratie/onboarding blijft bestaan; er wordt geen nieuwe authflow gemaakt.

## Verificatie

Gerichte contract- en interactieve tests controleren A/B, UNKNOWN, conditionele velden, teruggaan, routewisseling, locatie en start. De bestaande Request-databasesuite controleert daarnaast de echte publicatie, parallelle idempotentie, tenantisolatie, immutable snapshot en rollback. Zie het opleverrapport voor de daadwerkelijk uitgevoerde checks en eventuele open browseracceptatie.

Geen AI-experimenten, routingwerk, benchmark, betalingen of matchingredesign. Geen commit, push of deployment.

## Contextuele verfijning — 13 september 2026

Het expliciete Product Owner-besluit voor deze flow blijft leidend boven automatische vraagverheldering: de gebruiker kiest zelf. Vanaf de gedeelde intake toont het bestaande contextpaneel uitsluitend beschrijvende context bij de gekozen deskundigheid of het gekozen onderwerp. Context selecteert of corrigeert niets en kan publicatie niet blokkeren. UNKNOWN geeft algemene schrijfhulp. Het desktop/tabletpaneel en de mobiele disclosure zijn hergebruikt uit de bestaande responsive werkset; browseracceptatie op desktop, tablet en mobiel is afgerond. De product owner heeft de echte 200%-zoomcontrole als PASS bevestigd.

`src/content/simple-advice-context.ts` verwijst rechtstreeks naar de bestaande dienstcontent voor HVK, arbeidshygiënist, bedrijfsarts, incidentonderzoek, preventiemedewerker en BHV. De overige veertien beschrijvingen beperken zich tot de al vastgelegde taakgebieden van de bestaande expertise-identiteiten. Er worden geen routingregels, uitsluitingen, modelcalls of automatische alternatieven ingelezen. De context is presentatie en wordt geen tweede besliscontract of onderdeel van de immutable startsnapshot.

`Request.title` en de dossieronderwerpen blijven technisch verplicht. Nieuwe formulierinvoer gebruikt de omschrijving met samengevoegde witruimte, begrensd op 200 tekens. Bestaande opgeslagen titels blijven ongewijzigd en geldig. Er is geen migratie of AI-call nodig.

Bij een bestaande vestiging wordt het gekozen ID binnen de publicatietransactie opnieuw op tenant en actieve status gecontroleerd. Zonder vestigingskeuze kan de gebruiker voor Op locatie een plaats invullen. Hiervoor wordt het optionele `organizationLocationCity` in de bestaande JSON-snapshot gebruikt, met een lege standaardwaarde voor oudere snapshots. Het bestaande `otherLocationCity` blijft de plaats voor Op andere locatie. Combinatie bewaart beide plaatsen wanneer beide fysieke onderdelen zijn gekozen. Remote vereist geen plaats en normaliseert verborgen locatie-invoer weg. De bestaande projectie naar Request.region/notes gebruikt de opgegeven plaats; matching zelf verandert niet. Er wordt geen OrganizationLocation aangemaakt. De bestaande expliciete tabgebonden login-/registratieoverdracht behoudt de plaats en vervangt die niet automatisch door de primaire vestiging.

Startwaarden en datumopslag blijven gelijk. De interface noemt de specifieke datum een voorkeursdatum en toont dat de daadwerkelijke start met de opdrachtnemer wordt afgestemd. Gepubliceerde snapshots en versiegebonden vraagsets worden niet gewijzigd.


## Primaire en optionele aanvullende deskundigheid

Product Owner-besluit: Route A behoudt precies één zelfgekozen primaire deskundigheid en biedt in stap 2 maximaal twee expliciet selecteerbare directe aanvullingen. De matrix staat in `src/lib/requests/additional-expertise.ts`; uitsluitend deze twintig vaste entries bepalen zichtbaarheid en servervalidatie. Conditionele KE-relaties, facts en AI worden niet geëvalueerd. De korte raakvlakteksten zijn beschrijvend en bouwen voort op dezelfde bestaande taakgebieden als de primaire context. Preventiemedewerker, arbodienst en keuringsinstantie hebben de afzonderlijk goedgekeurde introducties.

Het bestaande `requestedExpertise` blijft het invoerveld voor de primaire keuze. De JSON-snapshot legt daarnaast `primaryExpertise` als gecontroleerde projectie daarvan vast, met `additionalExpertises` (IDs) en `expertiseSelectionSource: USER_SELECTED`. Een conflicterende primary-projectie, derde keuze, duplicaat, ongeldige matrixrelatie of aanvullende Route-B-keuze wordt server-side geweigerd. Ontbrekende aanvullende waarden worden als [] gelezen. Er is geen tweede taxonomie, nieuwe tabel, migratie of backfill. Bestaande records worden niet herschreven.

De bestaande Request.primaryExpertise/primaryExpertiseCodes en additionalExpertise/additionalExpertiseCodes bewaren de immutable openbare projectie. Bestaande triggers beschermen deze arrays en de dossier-snapshot. Nieuwe Simple Advice-eligibility koppelt iedere gekozen code uitsluitend aan het eigen label, met de bestaande kwalificatie-, werkgebied- en sectorregels. RequestEligibleProvider.eligibilityBasis bewaart USER_SELECTED en PRIMARY/ADDITIONAL. Bij overlap is PRIMARY de hoogste classificatie; de exacte matchredenen blijven behouden. Oudere niet-Simple-Advice-publicaties behouden hun eerdere eligibilitypad. Route B blijft zonder automatische doelgroep.

Providerlijst en detail tonen Primaire match of Aanvullende match met de expliciete opdrachtgeverskeuze als verklaring. Historische eligibility zonder USER_SELECTED krijgt de bestaande presentatie. Deze Request-publicatieketen schrijft momenteel alleen eligibility en auditevents; zij verstuurt geen notificaties. Er wordt daarom geen notificatie-infrastructuur geactiveerd. Een latere koppeling moet de vastgelegde doelgroep en matchclassificatie gebruiken.
