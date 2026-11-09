# Academy Release 02 — besluit voor beheer en cursusaanbod

**Technisch GO voor inzage in Academy-resultaten op PR #125. NO-GO voor volledig schrijvend cursusbeheer op deze V3.0-kandidaat. Commerciële cursusvrijgave 0/12.**

Applicatiebasis `b79d808402f6b3e1ff2774b0e08e6d43e099602f`. De acceptatietak bouwt voort op `e7fea79b039fa12645a9fc9a239689e1f1e7499d`. De nieuwe leesroutes gebruiken de 96 bestaande migraties. De beheerproeven gebruikten uitsluitend lokale, tijdelijke PostgreSQL 18-databases en synthetische accounts.

## Bestaande ontwikkeling en integratievolgorde

| Onderdeel | Bestaande bron | Aansluiting |
| --- | --- | --- |
| Cursussen, hoofdstukken, lessen, toetsvragen en beoordelingsstatus | [#93](https://github.com/WorkMatchr/platform/pull/93), `a7c90313`; volledige bundelimport en editor op [#94](https://github.com/WorkMatchr/platform/pull/94), `19ba769a` | Gebruik de versiegebonden authoringservice met hash, revisiecontrole, transacties en audit. Een historische gepubliceerde versie blijft alleen-lezen. |
| Getoetste cursusbundels | [#98](https://github.com/WorkMatchr/platform/pull/98), `ede36ca4` | WL-001 1.2, WL-002 1.3 en WL-003 1.1 als concept behandelen. Historische inschrijvingen, examens en certificaten bij de oorspronkelijke versie houden. |
| Certificaatlijst, detail, PDF, beheer en sjablonen | Ontwerper [#92](https://github.com/WorkMatchr/platform/pull/92), `91838abb`. Gecombineerde beheerbron [#100](https://github.com/WorkMatchr/platform/pull/100), `codex/academy-certificate-integration`, `85e02741181e9278cb0399f6b8c5b2a621f07804` | Deze branch bevat de editor van #94, de inhoud van #98 en de geïntegreerde ontwerper. Gebruik één beheerroute per cursusversie en de bestaande uitgifteservice. |
| Deelnemers, voortgang, ingeleverde toetsresultaten en uitgegeven certificaten | #100 toont deelnemers en scores op de cursusversie. #125 voegt op dezelfde route ook werkelijke voortgang per hoofdstuk toe. | Via Platformbeheer → Academy · Cursussen en resultaten. Per 25 deelnemers, met verificatie van het oorspronkelijke certificaat. Toegang wordt aan de serverzijde bij iedere gegevensopvraag gecontroleerd. |

**Volgende integratiestap.** Breng de bundelimport en editor van #100 als één samenhangende wijziging op #125. Behoud de nieuwe deelnemerssectie op de bestaande versiepagina. Controleer eerst de meer-cursusrelaties, het importregister `LearningAcademyImport`, `LearningEnrollment.accessRevokedAt`, de examenhoofdstukconstraint en de databasebescherming voor vraagrevisies. Voor de ontwerper zijn aanvullend sjabloonrevisies, cursuskoppelingen en de immutable `designSnapshot` nodig. Test op deze combinatie gelijktijdige bewerkingen, verliesvrije import, behoud van bestaande inschrijvingen bij versieovergangen en historische PDF-bytes. Neem uitsluitend de hiervoor noodzakelijke migraties over na vergelijking van namen, SQL en checksums.

De donor telt 110 migraties en mist de op V3 aanwezige migratie `20261106120000_repair_pro_financial_integrity`. De donor bevat ook Academy-orders, stoelen, promoties, terugbetalingen en financiële schemawijzigingen. De aantallen 96 en 110 vormen dus geen oplopende reeks van veertien migraties. Het openingspunt voor de editor op V3 is de succesvolle geïsoleerde verificatie van die gerichte combinatie. Behoud het bestaande financiële schema en de onafhankelijke commerciële vrijgave.

## Uitgevoerde acceptatie

| Controle | Resultaat en reikwijdte |
| --- | --- |
| Cursus en les beheren | **PASS op #100.** Een ingelogde synthetische platform-OWNER maakte via de editor een cursus met hoofdstuk, tekstles, hoofdstukcheck en eindtoets. Na opnieuw opslaan en herladen bleef de gewijzigde lestitel behouden. Twee `ACADEMY_DRAFT_SAVED`-auditregels; versie bleef DRAFT. **Open op #125** tot de schrijvende editor geïntegreerd is. |
| Inschrijving en resultaten | **PASS op #125.** Browser van de OWNER toonde de juiste versie, tien hoofdstukken op 100%, een ingeleverde onvoldoende en 40/50 geslaagd. Op 390 px geen horizontale overflow. De resultaten kwamen uit de geïsoleerde examenserviceproef. |
| Certificaatcontrole na accountwijziging | **PASS op #125.** De beheerder opende de verificatie vanuit de inschrijving. Na wijziging van de weergavenaam van de cursist, intrekking van diens synthetische sessie en opnieuw inloggen was de volledige opgeslagen certificaatrij identiek. De publieke controle in een verse browsersessie toonde een geldig certificaat. |
| Beheerautorisatie | **PASS op #125.** Een platform-MEMBER en een OWNER van een andere, reguliere organisatie kregen op zowel de lijst als de directe versie-URL geen toegang tot de resultaten. De gerichte unitproef bevestigde dat een gesloten runtime of geweigerde operator geen query op cursistgegevens uitvoert. |
| Volledige versiegebonden content en uitgifte | **16/16 PASS op #100**, twee PostgreSQL-suites. Drie cursusbundels, herhaalde import, onbevoegde/verouderde wijzigingen, voortgang, zakken/herkansen/slagen, certificaateigendom en behoud van het uitgegeven ontwerp. De 110 migraties en hun registraties bleven bij herhaalde toepassing gelijk. |
| V3-regressie | **17/17 PASS** voor de leesroutes, beheerlayout en cockpit; daarnaast **1/1 PostgreSQL-eindtoetsproef PASS**. TypeScript en productiebuild geslaagd. Volledige lint had nul fouten, vier waarschuwingen in bestaande authcomponenten en vier in een genegeerde lokale testdriver. |
| Vier voorheen overgeslagen brontests | **4/4 PASS** met het aanwezige private bronmateriaal. Het legacy-DOC werd deterministisch geëxtraheerd, de AI-02-PDF leverde alle 51 pagina’s, de geconfigureerde PDF's voldeden aan het manifest en de inventarisatie van de bronmap slaagde. De twee betrokken Vitest-bestanden samen gaven **28/28 PASS, nul skips**. De tijdelijke manifestkopie en eigen databasecontainers zijn opgeruimd. |
| Browserbewijs van WL-001 als student | De vorige doorloop op dezelfde studentcode omvat daadwerkelijk hervatten na herinloggen, tien hoofdstukken, vijftig examenantwoorden, PDF en verificatie. [Eerdere acceptatie](academy-acceptatie.md). |

## Cursusplanning en vrijgavematrix

De eerste drie werkversies zijn technisch uitvoerbaar op de genoemde beheerbron. Voor WL-004 t/m WL-012 bevat de onderzochte kandidaat uitsluitend een catalogusvermelding. De voorgestelde activiteiten zijn werk voor een eventuele ontwikkelfase. De bestaande openbare catalogus vermeldt de opleidingen als in voorbereiding. Geen van de twaalf heeft een gemeten representatieve studieduur.

| Code en cursus | Inhoud | Uitvoerbaar op #125 / #100 | Eindtoets | Certificaat | Beheer | Studieduur inclusief toets en volgende stap | Commercieel |
| --- | --- | --- | --- | --- | --- | --- | --- |
| WL-001 RI&E in de praktijk | Bestaande studentenversie; kandidaat 1.2 wacht op review | Ja / ja | 50 vragen; 40 goed vereist op V3 | Uitgifte en verificatie getest | Inzage V3; editor donor | V3 bevat 190 lesminuten plus ongemeten toets. 1.2 begroot 255 + 45 = 300 min. Fase 1: 104 leerdoel/toetsbindingen beoordelen en versiegebonden pilot. | NO-GO |
| WL-002 Preventiemedewerker in de praktijk | Kandidaat 1.3, 10 hoofdstukken en 60 uitleglessen | Roadmap / ja | 50 vragen getest | Getest op donor | Donor | 250 + 45 = 295 min geraamd. Fase 2: portfolio-opdrachten en feedback timen, inhoud en bank laten beoordelen. | NO-GO |
| WL-003 Veilig en gezond werken | Kandidaat 1.1, 10 hoofdstukken en 60 uitleglessen | Roadmap / ja | 50 vragen getest | Getest op donor | Donor | 238 + 50 = 288 min geraamd. Fase 2: leeslast, casusafwegingen en toetsduur piloten. | NO-GO |
| WL-004 Ongevallen en gevaarlijke situaties melden | Roadmap | Nee / nee | Open | Open | Geen cursusversie | Publiek 30–45 min. Fase 3: meldcasus, feedback en toetsmatrijs ontwerpen; pilot. | NO-GO |
| WL-005 Werkdruk & ongewenst gedrag | Roadmap | Nee / nee | Open | Open | Geen cursusversie | 45–60 min. Fase 3: praktijksituaties en toepassingsvragen uitwerken; pilot. | NO-GO |
| WL-006 Fysieke belasting | Roadmap | Nee / nee | Open | Open | Geen cursusversie | 30–45 min. Fase 3: werktaakanalyse en oefenfeedback uitwerken; pilot. | NO-GO |
| WL-007 Veilig werken met gevaarlijke stoffen – basis | Roadmap | Nee / nee | Open | Open | Geen cursusversie | 45–60 min. Fase 4: afbakening basisniveau, oefencasus en vakreview; pilot. | NO-GO |
| WL-008 Veilig werken met machines | Roadmap | Nee / nee | Open | Open | Geen cursusversie | 45–60 min. Fase 4: doelgroep afbakenen en machinecasus beoordelen; pilot. | NO-GO |
| WL-009 Beeldschermwerk & ergonomie | Roadmap | Nee / nee | Open | Open | Geen cursusversie | 20–30 min. Fase 3: werkplekcheck en beslisoefening ontwerpen; pilot. | NO-GO |
| WL-010 Veiligheid voor leidinggevenden | Roadmap | Nee / nee | Open | Open | Geen cursusversie | Circa 60 min. Fase 4: besluitcasussen, feedback en toets ontwikkelen; pilot. | NO-GO |
| WL-011 BHV awareness | Roadmap | Nee / nee | Open | Open | Geen cursusversie | 20–30 min. Fase 4: leerdoelen en reikwijdte van het afrondingsbewijs vaststellen; pilot. | NO-GO |
| WL-012 Werken op hoogte – awareness | Roadmap | Nee / nee | Open | Open | Geen cursusversie | 30–45 min. Fase 4: toepassingsgrenzen, herkenningscasussen en toets ontwikkelen; pilot. | NO-GO |

**Meting en commercieel besluit.** Laat per kandidaat een representatieve groep nieuwe cursisten de eerste poging zelfstandig doorlopen. Registreer per versie actieve lestijd, casus-/oefentijd en eindtoetstijd afzonderlijk. Sluit pauzes, herexamens en optioneel kennisbehoud uit. Leg aantal deelnemers, mediaan, spreiding en oorzaken van afwijkingen vast. Bij een korter zinvol leertraject beslist de inhoudseigenaar of het een korte module blijft of een inhoudelijk uitgebreid leertraject wordt. Pas de gepubliceerde tijd pas aan op basis van de pilot.

De commercieel verantwoordelijke kan per cursus beslissen zodra de inhouds- en toetsreview is ondertekend, de tijdsclaim is onderbouwd, de gekozen cursusversie inclusief beheer op de V3-kandidaat is geaccepteerd en de operationele voorwaarden voor betaalde toegang afzonderlijk zijn vrijgegeven. De negen roadmapvermeldingen krijgen pas een start- of koopactie na eigen versie, examen, uitgifteproef en vrijgave.
