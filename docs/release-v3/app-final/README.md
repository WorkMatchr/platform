# WorkMatchr V3.0 — applicatievrijgave

**De reguliere Marketplace-route is functioneel geaccepteerd. Voor de volledige applicatie geldt technisch NO-GO zolang de twee historische aanvraagroutes geen positieve regressiedekking hebben.** De uitsluiting van gereguleerde opdrachten blijft afdwingbaar. De commerciële omschakeling vereist afzonderlijke operationele vrijgave en een Product Owner-besluit.

## Kandidaat en integriteit

Getest op applicatiecommit `98ccbed6f0ddd33a71e8b861cd25f3e6882672ce` op `codex/v3-ux-final`, Draft PR #123. De aansluitende dossiercommit bevat uitsluitend dit rapport en screenshots. De V3-basissen van PR #118 (`821a6949`) en #122 (`7a5d8dc6`) zijn beide voorouders. De scopecontrole uit `0049949e` en het rolthema uit `6a53956c` zitten in deze kandidaat.

| Gewijzigd applicatie- of testbestand | Wijziging |
| --- | --- |
| `src/lib/marketplace/assignment-scope-service.ts` | Eén controle op selectie, actuele scope, specialisme en geldig dienstbesluit voor deze uitnodiging. |
| `src/lib/marketplace/quote-service.ts` | Controle binnen de transactie bij opslaan en indienen van een offerte. |
| `src/lib/marketplace/award-service.ts` | Controle vóór een nieuwe gunning. Een bevoegde herlezing van dezelfde voltooide gunning behoudt het historische resultaat. |
| `scripts/test-marketplace-concurrency-database.ts` | Gepubliceerde inhoud is onveranderlijk. Intrekken van een specialisme na aankoop of indiening blokkeert vervolghandelingen. |
| `src/lib/marketplace/assignment-scope.test.ts` | Vergelijkt de echte lijst van negentien diensten met de zes toegelaten dienstcodes. |

Geen wijzigingen onder `prisma/` ten opzichte van de goedgekeurde basis `3d87e845`. De financiële PostgreSQL-proef en de browserproef bouwden elk een lege database op met alle 96 migraties. De financiële test herhaalde de migratieopdracht. Het bestaande upgradebewijs 85 → 96 blijft van toepassing op dezelfde migratiebestanden.

## Opdrachtscope en beveiliging

De opdrachtgever kiest bij de selectie een dienst. Voor een automatisch besluit moet de volledige standaardtaak passen bij de primaire en eventuele aanvullende specialismen, een geldige publicatie en de actuele gepubliceerde dienstconfiguratie. Gewijzigde of vrije tekst krijgt waar nodig een menselijke beoordeling. Bij aangetoonde uitsluiting kan een beoordelaar de opdracht binnen deze dienst niet toelaten.

Het serverbesluit bindt een SHA-256-vingerafdruk aan opdrachtinhoud, publicatierevisie, brongegevens, specialismen, dienstdefinitie en configuratie. De beheerbeslissing registreert actor, motivering, tijdstip, revisie en beleidsversie. Matching, selectieherhaling, uitnodigingsverzending, aankoop, offerte en nieuwe gunning toetsen de actuele geldigheid. Bij een nieuwe gunning worden ook de actuele bevoegdheid en selecteerbaarheid gecontroleerd.

| Negatieve controle | Werkelijk resultaat |
| --- | --- |
| Wettelijke RI&E-toets onder Veiligheidsadvies | PostgreSQL weigerde selectie. |
| Medische belastbaarheidsbeoordeling onder eerste spoor | PostgreSQL weigerde selectie. |
| Formeel WIA-/UWV-oordeel onder tweede spoor | PostgreSQL weigerde selectie. |
| Particulier rechercheonderzoek onder Incidentonderzoek | PostgreSQL weigerde selectie. Voor de vier gereguleerde gevallen samen nul kandidaten en nul uitgaande meldingen. |
| Verandering na een bevoegde beoordeling | Oude vingerafdruk geweigerd. Browser toont de afwijkende publicatie en biedt geen selectieknop. |
| Verouderd dienstbeleid | Nieuw configuratie-ID neemt het oude kwalificatiebesluit niet over. Een verouderde uitnodiging bereikt het mailtransport niet. |
| Ontbrekend besluit en actuele platformschorsing | Twee afzonderlijke synthetische aanbieders met selecteerbare projecties leverden samen nul geschikte kandidaten en nul uitnodigingen. |
| Onbevoegde beoordelaar en gelijktijdige besluiten | Opdrachtgever geweigerd. Van twee gelijktijdige bevoegde besluiten werd er één geregistreerd. |
| Gelijktijdige inhoudswijziging en selectie | Selectie geweigerd, nul uitnodigingen. Herhaalde geldige selectie leverde één run op. |
| Verandering na aankoop of offerte | Op de volledig gemigreerde database weigert de trigger een tekstwijziging. Intrekken van het gemapte specialisme blokkeert conceptopslag, indiening en gunning zonder extra afschrijving. |

De foutinjecties die gewijzigde publicatietekst simuleren gebruikten een aparte lokale schemafixture. De aanvullende proef op een volledig gemigreerde database hield de onveranderbaarheidstrigger actief. De normale gebruikersroute liep op een eigen PostgreSQL 18-database met alle migraties.

## Browseracceptatie

Nieuwe synthetische accounts registreerden en verifieerden hun e-mail via een lokaal opvangmechanisme. De professional maakte de organisatie aan en vulde de vier matchingonderdelen in. Voor indienen en kwalificeren zijn de normale schermen, twee bevoegde beheerders en afzonderlijke platform- en dienstbesluiten gebruikt. De nieuwe professionals kregen geen vooraf ingevulde bewijsstukken of verificaties. Een bevoegde testbeheerder kende synthetische deelnamecredits toe via de beheerinterface.

| Gebruikershandeling | Uitkomst |
| --- | --- |
| Opdrachtgever registreert, logt in, maakt organisatie en opdracht aan | PASS. Concept heropend en gewijzigd, ergonomische standaardtaak gekozen, gepubliceerd en selectie gestart. |
| Professional rondt dossier en kwalificatie af | PASS. Directe uitnodigingenroute bleef vóór kwalificatie geblokkeerd. Bestaande optionele rubrieken bleven herkenbaar als optioneel. |
| Uitnodiging, aankoop, offerteconcept, opnieuw openen en indienen | PASS. Alle zes offertevelden opnieuw gelezen. Eén veld mobiel aangepast. Definitief ingediende offerte kon niet opnieuw worden bewerkt. |
| Twee offertes vergelijken en gunning heropenen | PASS. Twee via de interface geregistreerde bureaus dienden afzonderlijk € 287,45 en € 354,70 in. De opdrachtgever zag beide aanbiedingen en las na gunning en herladen de status Gegund. |
| Offerte gunnen en gunningsmelding openen | PASS. Opdrachtgever klikte **Deze offerte gunnen**, de professional opende de juiste gegunde offerte via de melding. |
| Browsernegatieven | 7/7 PASS. Gereguleerde opdracht, gewijzigde beoordeling, ontbrekende configuratie, ontbrekende kwalificatie, onvoldoende credits, verlopen uitnodiging en vreemde organisatie. |
| Menselijke scopecontrole | PASS. Opdrachtgever vroeg beoordeling aan, onafhankelijke beheerder motiveerde het besluit, daarna werd selectie beschikbaar. |
| Toetsenbord, zoom en toegankelijkheid | PASS op de geteste schermen. Zichtbare toetsenbordfocus en logische tabvolgorde. Offerteformulier op 1414, 820, 390 en 707 CSS-pixels bij echte 200%-zoom (DPR 2). Geen horizontale overflow of axe-bevindingen op deze vier metingen. |

[Geblokkeerde opdracht](scope-geblokkeerd.png) · [Bevoegd beoordeelde opdracht](scope-na-beoordeling.png) · [Twee onafhankelijke offertes vergelijken](offertes-vergelijken.png) · [Gegunde offerte bij de professional](gegunde-offerte.png).

## Rolweergave

Dezelfde ingelogde testbeheerder wisselde via de bestaande lokale testaccountwisselaar van opdrachtgever naar professional en terug. Alle twaalf metingen op desktop en mobiel, met lichte en donkere browservoorkeur, gaven de verwachte achtergrond en witte kaarten, navigatie en kopbalk. De tekstkleur was `#102A3E`. Bij een donkere browservoorkeur gebruikt deze omgeving hetzelfde lichte palet. Reguliere accounts hebben één actieve membership. De testaccountwisselaar is alleen beschikbaar buiten productie.

| Actieve omgeving | Werkruimte | Desktop | Mobiel |
| --- | --- | --- | --- |
| Opdrachtgever | `#F7FBFD` | [Screenshot](opdrachtgever-desktop.png) | [Screenshot](opdrachtgever-mobiel.png) |
| Professional | `#EAF7EE` | [Screenshot](professional-desktop.png) | [Screenshot](professional-mobiel.png) |

## Dienstencatalogus

De zes definities zijn vergeleken met het aangeleverde revisie-2-document. Incidentonderzoek bevat bovendien de expliciet opgedragen uitsluiting van vergunningplichtig particulier onderzoek. De configuratiereferentie is `STANDARD_SERVICE_SCOPE` met het label *V3.0-LAUNCH-01 — Algemene deskundigheid en professionele uitvoering*. Vier matchingonderdelen, vierogencontrole, schorsingsbescherming en het afzonderlijke dienstbesluit blijven vereist. De referentieterm verleent zelf geen bevoegdheid.

| Dienst | Status eerste release | Begrenzing of reden |
| --- | --- | --- |
| Ergonomie | Technisch testbaar | Niet-medisch werkplekadvies. |
| Incidentonderzoek | Technisch testbaar | Feiten en organisatie. Geen vergunningplichtig particulier onderzoek, opsporing of toezicht. |
| Veiligheidsadvies | Technisch testbaar | Praktisch veiligheidsadvies. Formele RI&E- en PvA-toetsing uitgesloten. |
| Ondersteuning bij implementatie | Technisch testbaar | Invoering van bestaande maatregelen. Geen wettelijke keuring of certificeringsbesluit. |
| Re-integratie eerste spoor | Technisch testbaar | Niet-medische begeleiding bij eigen werkgever. |
| Re-integratie tweede spoor | Technisch testbaar | Externe arbeidsmarktbegeleiding. Geen formeel WIA-/UWV-oordeel. Beide sporen kunnen parallel lopen. |
| RI&E | Uitgesteld | Buiten de technische lanceringslijst. |
| Arbeidsveiligheid | Uitgesteld | Idem. |
| Verzuim en re-integratie | Uitgesteld | Idem. |
| Arbeidsdeskundig advies | Uitgesteld | Idem. |
| Preventief medisch onderzoek (PMO) | Uitgesteld | Idem. |
| Periodiek arbeidsgezondheidskundig onderzoek (PAGO) | Uitgesteld | Idem. |
| Bedrijfsarts | Uitgesteld | Idem. |
| Arbeidshygiëne | Uitgesteld | Idem. |
| Machineveiligheid | Uitgesteld | Idem. |
| BHV en ontruiming | Uitgesteld | Idem. |
| Audit en inspectie | Uitgesteld | Idem. |
| Opleiding en training | Uitgesteld | Idem. |
| Arbodienstverlening | Uitgesloten | Afzonderlijk organisatiemodel vereist. |

## Technische en financiële controle

| Controle | Resultaat |
| --- | --- |
| Vitest | 419 bestanden geslaagd, 7 overgeslagen. 3.480 tests geslaagd, 0 mislukt, 26 overgeslagen. Afzonderlijke databasesuites hieronder. |
| TypeScript, lint, standaardproductiebuild | Alle drie exit 0. ESLint meldde vier bestaande waarschuwingen bij interne navigatie in authformulieren. Next.js bouwde met Turbopack. |
| PostgreSQL Marketplace, concurrency en credits | Drie suites geslaagd. Eén afschrijving, één gunning bij herhaling, geen negatieve saldi. Ledger over 54 regels, ook buiten de 50 zichtbare regels. |
| PostgreSQL financiële keten | P1 en FIN-04 geslaagd. Eerste betaling en twee verlengingen, betaalde periodegrens, mislukte en vertraagde betaling, dubbele callbacks, gedeeltelijke en volledige creditering, onzekere refund, Jortt-herstel, tenantisolatie en onveranderlijke historie. Alle providers synthetisch. |
| GitHub Actions applicatiecommit | 5/5 geslaagd. Twee `postgres-integrity`, twee `verify` en één `synthetic-finance`. |
| Historische PostgreSQL-suites | `test:db:request-interests` en `test:db:request-offer-slots` verwachten automatisch geschikte aanbieders voor een oudere RI&E-publicatie. Deze publicatie heeft geen gekoppelde, inhoudelijk toegelaten Marketplace-selectie. |

[PostgreSQL-integriteit](https://github.com/WorkMatchr/platform/actions/runs/42526035390) · [Financiële CI](https://github.com/WorkMatchr/platform/actions/runs/42526035407) · [Verificatie](https://github.com/WorkMatchr/platform/actions/runs/42526035396).

## Openstaande vrijgavevoorwaarden

De historische publicatieroute schrijft de geschiktheidsmomentopname bij publicatie. De scopecontrole vereist dan al een actuele afgeronde Marketplace-selectie. Voor dit oudere type aanvraag bestaat op dat moment geen gekoppelde selectie. Daardoor is nul geschikte aanbieders veilig en verwacht voor de RI&E-fixture, maar blijven de positieve downstreamcontroles voor interesse en betaalde offerteplaatsen onbewezen. Beide proeven zijn opnieuw uitgevoerd op de genoemde applicatiecommit. De eerste stopte bij de verwachting van meer dan één organisatie, de tweede bij de verwachting van minimaal zes. De reguliere browserroute gebruikt geselecteerde uitnodigingen en één directe deelnameaankoop.

Voor vrijgave van de historische betaalroute is een expliciet ondersteunde overdracht naar de canonieke selectie of een gecontroleerde uitfasering met behoud van bestaande financiële verplichtingen nodig. Voorkom dat dezelfde deelname via beide routes kan worden gekocht. Tot die grens is vastgesteld, blijft integrale commerciële publicatie geblokkeerd. Voor de zes begrensde diensten is vervolgens afzonderlijk publicatieakkoord en operationele vrijgave door Chat 2 nodig.
