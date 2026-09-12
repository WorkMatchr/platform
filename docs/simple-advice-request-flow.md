# Eenvoudige Advieswijzer → opdracht publiceren

De opdracht van 11 september 2026 vervangt automatische deskundigheidsroutering als kritieke afhankelijkheid van `/advieswijzer`. Dit expliciete productbesluit supersedeert voor deze flow de eerdere automatische vraagverheldering en de bijbehorende voorkeuren in PC-004/005/027. Een gebruiker die de deskundigheid kent mag die zelf kiezen. Er wordt geen professionele beoordeling of geverifieerde deskundigheidsclaim gesuggereerd.

- **Route A:** Ja → keuze uit de twintig bestaande expertise-identiteiten en hun labels. Alleen de taxonomie wordt gelezen; er wordt geen routering uitgevoerd.
- **Route B:** Nee → probleemonderwerp, inclusief Anders met optionele toelichting en Ik weet het echt niet. Er wordt geen expertise afgeleid.
- Beide routes gebruiken dezelfde titel, omschrijving, gewenst resultaat, uitvoering en gewenste start. Geen omvang, upload, organisatieanalyse, contextvraaglus, classifier of providercall.
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
