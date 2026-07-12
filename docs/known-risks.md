# Bekende risico’s

| ID | Omschrijving | Kans | Impact | Beheersmaatregel | Verantwoordelijke laag | Status |
| --- | --- | --- | --- | --- | --- | --- |
| R-001 | Onvoldoende kleurcontrast. | Middel | Hoog | Semantische tokens toetsen op WCAG 2.2 AA en opnieuw controleren na kleurwijzigingen. | UI/design system | Open |
| R-002 | Componenten worden inconsistent toegepast. | Middel | Middel | Centrale componenten documenteren en tijdens reviews controleren. | Front-end | Open |
| R-003 | De tijdelijke merkkleur wordt niet vervangen. | Middel | Middel | Technical debt registreren en vervanging koppelen aan oplevering van het logo. | Product/design | Open |
| R-004 | Het design system wordt omzeild met losse stijlen. | Middel | Hoog | Semantische tokens verplicht stellen en afwijkingen motiveren in review. | Front-end | Open |
| R-005 | Te veel visuele complexiteit vermindert overzicht. | Laag | Middel | Rustige layouts, beperkte schaduwen en functionele animaties als ontwerpprincipe bewaken. | Product/design | Beheerst |
| R-006 | De beheeromgeving wordt minder toegankelijk dan de publieke website. | Middel | Hoog | Dezelfde componenten en Definition of Done voor alle applicatieonderdelen gebruiken. | Front-end | Open |
| R-007 | Publieke website en dashboards krijgen een afwijkende huisstijl. | Middel | Hoog | Eén gedeeld token- en componentensysteem gebruiken. | Front-end | Open |
| R-008 | De demonstratieve intake wordt aangezien voor werkende functionaliteit. | Middel | Hoog | Duidelijke beschikbaarheidsmelding tonen en geen submit- of opslagfunctionaliteit aanbieden. | Product/front-end | Beheerst |
| R-009 | De homepage wordt opnieuw te donker of visueel zwaar. | Middel | Middel | Licht oppervlak als standaard vastleggen en donkere vlakken beperken tot kleine accenten. | Product/design | Beheerst |
| R-010 | Het mobiele menu is onvoldoende toegankelijk. | Laag | Hoog | Native `details` en `summary`, zichtbare focus en handmatige toetsenbordcontrole gebruiken. | Front-end | Open |
| R-011 | Onnodige persoonsgegevens worden opgeslagen. | Middel | Hoog | Dataminimalisatie, doelbinding en veldreview toepassen vóór iedere functionele module. | Product/backend | Open |
| R-012 | Cascade-delete verwijdert historische of financiële gegevens. | Laag | Zeer hoog | Restrictieve relaties gebruiken en archiveren of anonimiseren via expliciete services. | Database/backend | Beheerst |
| R-013 | Creditsaldo en transactielogboek raken inconsistent. | Middel | Zeer hoog | Saldo en mutatie later atomair met locking in één transactie verwerken. | Backend/database | Open |
| R-014 | Meer dan drie actieve aanbieders worden aan één opdracht gekoppeld. | Middel | Hoog | Selecties later met transactionele telling en locking uitvoeren. | Matching/backend | Open |
| R-015 | Dubbele lidmaatschappen of aanbiederprofielen ontstaan. | Laag | Hoog | Samengestelde unieke indexen en één-op-éénconstraints handhaven. | Database | Beheerst |
| R-016 | Het datamodel wordt voortijdig te complex. | Middel | Middel | Alleen bevestigde kernconcepten modelleren en toekomstige logica uitstellen. | Architectuur | Beheerst |
| R-017 | Schema en migraties lopen uit elkaar. | Middel | Hoog | Iedere schemawijziging via een nieuwe migratie uitvoeren en CI-validatie toevoegen. | Database/DevOps | Open |
| R-018 | Seed-data bevat persoonsgegevens of is niet herhaalbaar. | Laag | Hoog | Alleen idempotente, niet-persoonlijke referentiedata seeden en dubbel uitvoeren in acceptatietests. | Database | Beheerst |
| R-019 | Databasewachtwoorden of lokale waarden worden gecommit. | Laag | Zeer hoog | Alleen `.env.example` committen, `.env` negeren en Git-status controleren. | Security/DevOps | Beheerst |
| R-020 | JSON-velden worden ondoorzichtig of incompatibel. | Middel | Hoog | Verwachte structuur documenteren en vóór functioneel gebruik versieerbare runtimevalidatie toevoegen. | Backend | Open |
| R-021 | Verlopen certificeringen blijven als geldig meetellen. | Middel | Hoog | Geldigheidsdatum en verificatiestatus later in queries en matching afdwingen. | Provider/backend | Open |
| R-022 | Gearchiveerde organisaties of profielen blijven zichtbaar of selecteerbaar. | Middel | Hoog | Centrale actieve-recordfilters en autorisatietests toevoegen bij de betreffende modules. | Backend | Open |
