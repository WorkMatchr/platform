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
| R-008 | De voorbeeldinvoer op de homepage wordt aangezien voor het functionele intakeformulier. | Laag | Middel | De invoer expliciet als voorbeeld labelen en alle CTA’s naar de afzonderlijke beveiligde intakeflow laten verwijzen. | Product/front-end | Beheerst |
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
| R-023 | Authflows maken accountenumeratie mogelijk. | Middel | Hoog | Generieke login-, registratie- en resetmeldingen gebruiken en regressietests behouden. | Security/backend | Beheerst |
| R-024 | Brute-forceaanvallen op login of herstel. | Hoog | Hoog | Database-rate-limiting toepassen; productieproxy en client-IP-herkomst valideren. | Security/DevOps | Open |
| R-025 | Sessiecookies of tokens worden gestolen. | Laag | Zeer hoog | Better Auth-standaarden, HttpOnly, Secure in productie, SameSite/origincontrole en sterk geheim gebruiken. | Security/backend | Open |
| R-026 | Een return-URL veroorzaakt een open redirect. | Middel | Hoog | Alleen gevalideerde lokale paden accepteren en geautomatiseerd testen. | Backend | Beheerst |
| R-027 | Verificatie- of resettokens komen in logs. | Middel | Hoog | Links alleen development-only loggen; productielogs en monitoring vóór livegang controleren. | Security/DevOps | Open |
| R-028 | Productie draait zonder werkende e-mailprovider. | Middel | Hoog | Zonder Resend-key en afzender veilig falen en deployment-healthcheck toevoegen. | DevOps | Beheerst |
| R-029 | Verificatie- en resetmail worden misbruikt. | Middel | Hoog | Database-rate-limits, korte eenmalige tokens en neutrale responses gebruiken. | Security/backend | Beheerst |
| R-030 | Better Auth raakt in conflict met het zakelijke User-model. | Laag | Zeer hoog | Eén User-model, expliciete `displayName`-mapping, migratiereview en relatietests behouden. | Architectuur/database | Beheerst |
| R-031 | Blokkering wordt alleen in de UI toegepast. | Middel | Zeer hoog | Session-create-hook en actuele server-side statuscontrole verplicht gebruiken. | Backend/security | Beheerst |
| R-032 | Authsecrets of Resend-key worden gecommit. | Laag | Zeer hoog | `.env` negeren, placeholders gebruiken en secret-scan/Git-controle uitvoeren. | Security/DevOps | Beheerst |
| R-033 | Sessies blijven actief na blokkeren of wachtwoordreset. | Middel | Hoog | Sessies bij statusweigering verwijderen en officiële reset-revocation inschakelen. | Backend/security | Beheerst |
| R-034 | Trusted origins of proxyheaders zijn in productie verkeerd ingesteld. | Middel | Hoog | Deployment-specifieke origins, proxyketen en client-IP-header vóór livegang testen. | DevOps/security | Open |
| R-035 | Juridische akkoordpagina’s zijn nog niet definitief. | Hoog | Hoog | Tijdelijke status eerlijk tonen en juridische inhoud vóór livegang laten vaststellen. | Product/juridisch | Open |
| R-036 | Persoonsgegevens belanden in authlogs. | Middel | Hoog | Minimale logging, redactie en productie-logreview uitvoeren. | Security/DevOps | Open |
| R-037 | Een gebruiker krijgt toegang tot een organisatie van een ander. | Laag | Zeer hoog | Iedere actie valideert userId, actieve membership en organisatie server-side. | Backend/security | Beheerst |
| R-038 | Een organizationId uit clientstate wordt vertrouwd. | Middel | Zeer hoog | Cookie/formulier alleen als keuze gebruiken en membership opnieuw opzoeken. | Backend/security | Beheerst |
| R-039 | Gedeeltelijke organisatieaanmaak ontstaat. | Laag | Hoog | Alle onboardingrecords in één Prisma-transactie aanmaken. | Backend/database | Beheerst |
| R-040 | Dubbele memberships ontstaan. | Laag | Hoog | Samengestelde unieke index en transactionele aanmaak behouden. | Database | Beheerst |
| R-041 | Meerdere primaire locaties ontstaan. | Middel | Hoog | Updates transactioneel resetten en één locatie primair maken; databasebrede constraint later beoordelen. | Backend/database | Open |
| R-042 | Schadelijke afbeeldingsinhoud wordt opgeslagen. | Middel | Zeer hoog | Werkelijke inhoud met Sharp decoderen en opnieuw naar WebP coderen. | Backend/security | Beheerst |
| R-043 | SVG-scriptinhoud wordt uitgevoerd. | Middel | Hoog | SVG volledig weigeren in versie 1. | Backend/security | Beheerst |
| R-044 | Directory traversal leest willekeurige bestanden. | Laag | Zeer hoog | Alleen UUID-v4-WebP-keys en gecontroleerde resolved paden accepteren. | Backend/security | Beheerst |
| R-045 | Oude logo’s blijven achter. | Middel | Middel | Vervanging en verwijdering ruimen bestanden aantoonbaar op; latere object storage krijgt orphan-cleanup. | Storage/backend | Beheerst |
| R-046 | Lokale schijf wordt als productieopslag gebruikt. | Middel | Hoog | Productie zonder provider hard weigeren. | DevOps/storage | Beheerst |
| R-047 | Logo-opslag en database raken uit synchronisatie. | Middel | Hoog | Veilige schrijfvolgorde, rollbackcleanup en toekomstige periodieke reconciliatie. | Backend/storage | Open |
| R-048 | Contactgegevens worden onbedoeld publiek. | Middel | Hoog | Alleen logo publiek serveren; contactvelden uitsluitend in beveiligde pagina’s. | Product/backend | Beheerst |
| R-049 | Organisatiegegevens worden zonder audit aangepast. | Hoog | Hoog | Centrale auditlogging in een latere beheermodule toevoegen. | Backend/audit | Open |
| R-050 | ProviderProfile raakt inconsistent met organizationType. | Laag | Hoog | Aanmaak transactioneel; type na aanmaak read-only tot beheeractie beschikbaar is. | Backend/database | Beheerst |
| R-051 | Gepubliceerde vragen of opties wijzigen waardoor bestaande intakes van betekenis veranderen. | Laag | Zeer hoog | PostgreSQL-triggers maken gepubliceerde en gepensioneerde vraagsetinhoud immutable; wijzigingen krijgen een nieuwe versie. | Database/backend | Beheerst |
| R-052 | Actuele antwoorden en revisiehistorie raken bij een gedeeltelijke schrijfactie uit synchronisatie. | Laag | Hoog | Revisies zijn append-only en opeenvolgend; de intakeservice schrijft actueel antwoord en revisie atomair met optimistische concurrencycontrole. | Backend/database | Beheerst |
| R-053 | Dubbele of gedeeltelijke opdrachtvorming ontstaat door herhaalde of gelijktijdige indiening. | Laag | Zeer hoog | `Serializable` transactie, conditionele versie-update, idempotente service, unieke `Assignment.intakeId` en rollbacktests. | Backend/database | Beheerst |
