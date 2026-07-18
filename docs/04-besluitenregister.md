# Besluitenregister

## 12 juli 2026

| ID | Besluit | Toelichting |
| --- | --- | --- |
| B-001 | De project- en merknaam is `WorkMatchr`. | De schrijfwijze is overal exact en consequent. |
| B-002 | Per opdracht worden maximaal drie aanbieders geselecteerd. | De selectie blijft overzichtelijk en inhoudelijk relevant. |
| B-003 | WorkMatchr is volledig onafhankelijk. | Betaalde voorkeursposities zijn uitgesloten. |
| B-004 | Credits worden gekocht en uitgegeven per 10 of een veelvoud van 10. | Prijzen en technische uitwerking volgen later. |
| B-005 | De beheerder kan handmatig ingrijpen. | Geautomatiseerde processen nemen de eindregie niet over. |
| B-006 | De gebruikersinterface gebruikt de aanspreekvorm `U` en `Uw`. | Code en technisch gebruikelijke namen blijven Engels. |
| B-007 | Lichtblauw is de primaire huisstijlkleur. | De huidige token is tijdelijk en wordt later vervangen door de exacte logokleur. |
| B-008 | WorkMatchr ontwikkelt zich tot digitale arbo-adviseur. | Het platform helpt eerst de vraag te begrijpen en matcht daarna. |
| B-009 | Versie 1 gebruikt dynamische vraagbomen. | De functionele en technische uitwerking volgt in een latere module. |
| B-010 | AI-intake volgt in latere versies. | AI wordt niet binnen Module 2A gebouwd. |
| B-011 | Publieke website en applicatie vormen visueel en technisch één consistent systeem. | Gedeelde design-tokens en componenten zijn de basis. |
| B-012 | Module 1 gebruikt Next.js App Router, TypeScript en Tailwind CSS. | Dit vormt de schaalbare basis van de webapplicatie. |
| B-013 | Database, authenticatie en betalingen volgen later. | Keuzes worden pas gemaakt wanneer de betreffende module start. |
| B-014 | De publieke homepage begint bij de situatie van de organisatie. | De gebruiker hoeft vooraf niet te weten welke specialist nodig is. |
| B-015 | Eén invoer ondersteunt concrete specialistvragen en open hulpvragen. | De invoer blijft demonstratief totdat een latere module de intake bouwt. |
| B-016 | De publieke visuele richting is overwegend licht. | Wit en lichtblauw domineren; donkerblauw blijft beperkt tot tekst en kleine accenten. |
| B-017 | De homepage gebruikt een originele lokale procesvisual. | Externe stockbeelden en generieke veiligheidsclichés zijn uitgesloten. |
| B-018 | WorkMatchr gebruikt lokaal poort 3001. | Poort 3000 hoort bij een ander project en wordt niet als WorkMatchr-testadres gerapporteerd. |
| B-019 | PostgreSQL 17 is de relationele database en Prisma ORM 7 de datalaag. | Dit biedt transacties, constraints, getypeerde toegang en versiebeheerbare migraties. |
| B-020 | Alle kernentiteiten gebruiken UUID's en UTC-tijdstempels met tijdzone. | Identiteiten blijven omgeving-onafhankelijk en tijdregistratie eenduidig. |
| B-021 | Gebruikers, organisaties en lidmaatschappen zijn afzonderlijke entiteiten. | Blijft van kracht; ADR-013 beperkt een normaal tenantaccount tot één actieve membership, terwijl één organisatie meerdere gebruikers kan hebben. Organisaties kunnen opdrachtgever, aanbieder of beide zijn. |
| B-022 | Historische bedrijfsgegevens worden niet automatisch cascade-verwijderd. | Deactivatie, archivering en restrictieve relaties beschermen audit- en transactiesporen. |
| B-023 | Aanbiederselecties slaan bron, status, score en score-uitleg op. | Automatische en handmatige selecties blijven later controleerbaar. |
| B-024 | Maximaal drie actieve aanbieders wordt later transactioneel afgedwongen. | Deze regel raakt meerdere rijen en kan niet betrouwbaar met alleen een statische databaseconstraint worden geborgd. |
| B-025 | Credits gebruiken een rekening plus onveranderlijk transactielogboek. | Saldo en mutatie worden later atomair bijgewerkt; kopen en besteden gebeurt per 10 of een veelvoud daarvan. |
| B-026 | Externe verwijzing en zelf afgehandelde opdrachten staan in een afzonderlijke resolutie. | Een normale aanbiederselectie verwijst daardoor altijd naar een echte aanbieder. |
| B-027 | De lokale PostgreSQL-omgeving draait via Docker Compose. | Ontwikkelaars gebruiken dezelfde reproduceerbare databasebasis. |
| B-028 | Seed-data bevat uitsluitend niet-persoonlijke referentiedata. | De seed is idempotent en veilig herhaalbaar. |
| B-029 | Authenticatie, dynamische intake, matching, betalingen en creditslogica vallen buiten Module 3. | Het datamodel bereidt deze modules voor zonder onafgemaakte functionaliteit te activeren. |
| B-030 | De productiedatabaseprovider is nog niet gekozen. | Hosting, back-ups, hersteldoelen, monitoring en datalocatie worden vóór livegang afzonderlijk beoordeeld. |
| B-031 | WorkMatchr gebruikt Better Auth voor persoonlijke accounts. | Zelfgebouwde hashing, cookies en tokenlogica zijn uitgesloten. |
| B-032 | Module 4A gebruikt uitsluitend e-mail en wachtwoord. | Social login, MFA en passkeys vallen buiten deze module. |
| B-033 | E-mailverificatie is verplicht voordat een sessie kan ontstaan. | Nieuwe accounts starten als `INVITED` en worden na verificatie `ACTIVE`. |
| B-034 | Wachtwoordherstel gebruikt een eenmalige link van één uur. | Na reset worden bestaande sessies ingetrokken. |
| B-035 | Sessies worden databasegebaseerd opgeslagen. | Sessies zijn centraal intrekbaar en statuscontrole blijft server-side. |
| B-036 | Wachtwoorden hebben 12–128 tekens. | Hashing en verificatie worden volledig door Better Auth uitgevoerd. |
| B-037 | Autorisatie wordt dicht bij server-side gegevensgebruik uitgevoerd. | Clientchecks en proxy zijn niet de beveiligingsgrens. |
| B-038 | `BLOCKED` en `ARCHIVED` krijgen geen toegang. | Nieuwe sessies worden geweigerd en bestaande sessies bij beveiligd gebruik ingetrokken. |
| B-039 | E-mailadressen worden getrimd en naar lowercase genormaliseerd. | Dit gebeurt vóór opslag en in de registratievalidatie. |
| B-040 | Lokale authmail wordt development-only naar de serverterminal geschreven. | Alleen verificatie- en resetlinks; geen wachtwoorden of sessietokens. |
| B-041 | Productiemail gebruikt een afzonderlijke WorkMatchr-Resendconfiguratie. | Ontbrekende productieconfiguratie faalt veilig. |
| B-042 | Rate limiting gebruikt de gedeelde PostgreSQL-database. | Productie-proxy- en client-IP-configuratie wordt vóór deployment vastgesteld. |
| B-043 | Organisaties en organisatierollen vallen buiten Module 4A. | Module 4B start alleen na expliciete opdracht. |

## 13 juli 2026

| ID | Besluit | Toelichting |
| --- | --- | --- |
| B-044 | Vervallen door B-176: één gebruiker kon meerdere organisaties hebben. | Alleen historische context voor de huidige actieve-organisatiekeuze; ADR-013 vervangt dit doelmodel. |
| B-045 | De organisatiecreator wordt actieve `OWNER`. | Organisatie en membership ontstaan in één transactie. |
| B-046 | Memberships bepalen organisatieautorisatie. | Clientstate en organizationId zijn nooit zelfstandig vertrouwd. |
| B-047 | `MEMBER` is read-only voor het organisatieprofiel. | Alleen `OWNER` en `ADMIN` mogen wijzigen. |
| B-048 | Organisatieaanmaak is transactioneel. | Organisatie, membership, sectoren, locatie en eventueel ProviderProfile ontstaan atomair. |
| B-049 | `PROVIDER` en `BOTH` krijgen een `ProviderProfile` met status `DRAFT`. | Volledige onboarding en goedkeuring volgen later. |
| B-050 | Per organisatie bestaat maximaal één logo. | Alleen afleidbare metadata staat in PostgreSQL. |
| B-051 | Een logo is maximaal 2 MB. | Grootte wordt vóór beelddecodering server-side gecontroleerd. |
| B-052 | PNG, JPEG en WebP zijn toegestaan. | Invoer wordt opnieuw gecodeerd naar WebP. |
| B-053 | SVG is niet toegestaan in versie 1. | Actieve inhoud en sanitizationrisico worden vermeden. |
| B-054 | Lokale logo-opslag is uitsluitend voor development. | `.local-storage` wordt door Git genegeerd. |
| B-055 | De productieobject-storageprovider wordt later gekozen. | Productie zonder provider weigert upload veilig. |
| B-056 | Module 4B is na de definitieve technische en handmatige acceptatie afgerond. | Organisatie-onboarding, autorisatie, logo-opslag en validatie-UX zijn aantoonbaar gecontroleerd. |
| B-057 | Module 5 bouwt als volgende module de functionele vraagverheldering, intake en opdrachtflow. | Matching, credits, betalingen en AI-intake blijven afzonderlijke latere modules. |
| B-058 | Module 5A.1 gebruikt versieerbare, genormaliseerde intakevraagsets. | Versie 1 is lineair; toekomstige vertakkingen vereisen een afzonderlijk ontwerp. |
| B-059 | Gepubliceerde en gepensioneerde vraagsetinhoud is databasebreed immutable. | Tekst-, optie-, volgorde- of validatiewijzigingen maken een nieuwe versie. |
| B-060 | Intakeantwoorden hebben een actuele waarde plus append-only revisiehistorie. | Iedere succesvolle wijziging werkt beide representaties atomair bij met optimistische concurrencycontrole. |
| B-061 | `Intake.freeText` blijft de immutable oorspronkelijke bronopname. | Het actuele verduidelijkte antwoord staat in `IntakeAnswer`. |
| B-062 | Per intake bestaat maximaal één opdracht. | Een unieke nullable `Assignment.intakeId` bereidt veilige opdrachtvorming in 5B voor. |
| B-063 | Vraagset versie 1 is niet-persoonlijke, idempotent gecontroleerde referentiedata. | De migratie legt haar vast; de seed valideert en overschrijft gepubliceerde inhoud nooit. |
| B-064 | Alleen actieve `OWNER` en `ADMIN` mogen een intake omzetten naar een opdracht. | Organisatie-, membership-, tenant- en accountstatus worden server-side opnieuw gecontroleerd. |
| B-065 | Opdrachtvorming is één transactionele overgang via `SUBMITTED` naar `CONVERTED`. | Opdracht, statushistorie en initiële revisie ontstaan atomair; fouten rollen volledig terug. |
| B-066 | Een geslaagde intakeconversie is onomkeerbaar en idempotent. | Correcties volgen later op de opdracht; de bronintake en haar antwoorden blijven immutable. |
| B-067 | Opdrachten hebben een actuele versie plus append-only status- en inhoudshistorie. | Optimistische concurrency en reconstructeerbare revisies beschermen toekomstige wijzigingen. |
| B-068 | Opdrachtvorming start uitsluitend na een aparte, expliciete POST-bevestiging. | Gereedmelden of openen van een intake heeft geen side effect; de Server Action hergebruikt de bestaande conversieservice. |
| B-069 | `MEMBER` ziet alleen een opdracht uit de eigen intake en mag niet indienen. | Het bestaande 5B-autorisatiemodel wordt niet stilzwijgend verruimd naar alle organisatieopdrachten. |
| B-070 | Opdrachtstatussen worden centraal naar gewone Nederlandse taal vertaald. | UUID's, enumwaarden en interne auditmetadata lekken niet naar de gebruikersinterface. |
| B-071 | Module 5B.3 gebruikt nog geen definitieve opdrachtnummering. | De UI toont “Conceptopdracht” met titel en datum totdat product en juridisch een nummeringsbeleid vaststellen. |
| B-072 | Een reden voor terugzetten of annuleren bevat 10 tot en met 500 tekens. | De reden blijft bruikbaar voor historie, wordt server-side begrensd en wordt niet aan de opdrachtomschrijving toegevoegd. |
| B-073 | Inhoud en status van een opdracht gebruiken afzonderlijke append-only histories. | Een inhoudswijziging schrijft precies één revisiesnapshot; een statusovergang schrijft statushistorie en beide gebruiken optimistic concurrency. |

## 14 juli 2026 — Module 5C

De product owner heeft B-074 tot en met B-080 geaccepteerd. ADR-007 is in Module 5C.2 en Module 5C.3 technisch toegepast; Module 5C is als geheel afgerond en product-ownergeaccepteerd.

| ID | Besluit | Toelichting |
| --- | --- | --- |
| B-074 | Publicatie is gereedstelling voor toekomstige marktverwerking, niet algemene zichtbaarheid. | Aanbieders krijgen in Module 5C geen toegang en matching start niet. |
| B-075 | De bestaande status `OPEN` vertegenwoordigt de gepubliceerde toestand. | `PUBLISHED` en `PUBLICATION_PENDING` voegen voor de gekozen korte transactionele handeling geen nieuwe betekenis toe. |
| B-076 | Alleen actieve organisatie-`OWNER` en organisatie-`ADMIN` mogen publiceren en intrekken. | `MEMBER` krijgt geen extra rechten; platformbeheer zonder actieve tenantmembership evenmin. |
| B-077 | De gepubliceerde opdrachtinhoud is een immutable, herleidbare snapshot. | Publicatietijd, actor en publicatieversie worden atomair met revisie en statushistorie vastgelegd. |
| B-078 | Publicatie kan alleen via `OPEN → CANCELLED` worden ingetrokken en niet worden herpubliceerd binnen Module 5C. | Een reden is verplicht; historie blijft behouden en inhoud keert niet terug naar `DRAFT`. |
| B-079 | Publicatie activeert geen matching, providerselectie, credits of Mollie. | Het toekomstige kostmoment en aanbiederscontract worden in afzonderlijke modules besloten. |
| B-080 | `publishedVersion` verwijst naar exact één immutable `AssignmentRevision`. | De revisie gebruikt de actuele opdrachtversie en mag versies overslaan die uitsluitend door statusovergangen zijn ontstaan. |
| B-081 | Publicatie- en intrekkingshistorie worden databasebreed op uniciteit en samenhang gecontroleerd. | Actor en tijd van de publicatiehistorie moeten overeenkomen met de actuele publicatiemetadata. |

## 14 juli 2026 — Module 6A.0

De product owner heeft het providerkwalificatieontwerp en ADR-008 geaccepteerd. Er is nog geen providerkwalificatie-, onboarding- of Decision Engine-functionaliteit geïmplementeerd.

| ID | Besluit | Toelichting |
| --- | --- | --- |
| B-082 | Platformkwalificatie, beroepskwalificatie, readiness, selecteerbaarheid en historische prestaties blijven afzonderlijke begrippen. | Een positieve status in één begrip impliceert geen positieve status in een ander begrip. |
| B-083 | Alleen organisatie-`OWNER` en organisatie-`ADMIN` mogen juridische en complianceverklaringen indienen of wijzigen. | `MEMBER` krijgt hiervoor geen mutatierecht. |
| B-084 | Zelfverklaarde gegevens worden nooit automatisch als geverifieerd behandeld. | Bron, verificatiemethode en geldigheid blijven expliciet. |
| B-085 | Diensten, specialismen, sectoren, regio’s en kwalificaties gebruiken centrale, versieerbare taxonomieën. | Gepubliceerde betekenis wordt niet in-place gewijzigd. |
| B-086 | Werkgebied gebruikt in versie 1 Nederlandse provincies, landelijke dekking en remote inzet. | De technische codes zijn volgens B-114 `NATIONWIDE` en `REMOTE`; het zichtbare Nederlandse label blijft **Landelijk**. Organisatielocaties en vrije tekst zijn geen automatische werkgebiedsbron. |
| B-087 | Vervallen door B-173: capaciteit zou bestaan uit acceptatie van nieuwe opdrachten, vroegste startdatum, globale capaciteit en laatste bevestigingsdatum. | Alleen historische ontwerpcontext; niet meer actief. |
| B-088 | Vervallen door B-173: capaciteitsgegevens zouden maximaal 30 dagen actueel zijn. | Alleen historische ontwerpcontext; niet meer actief. |
| B-089 | Verificatielabels zijn **Zelf verklaard**, **Document gecontroleerd** en **Geverifieerd**. | Technische workflowstatussen blijven hiervan gescheiden. |
| B-090 | `Premium Verified` wordt niet gebruikt. | Er bestaat geen commercieel verificatieniveau. |
| B-091 | Verificatie heeft geen commerciële betekenis en verhoogt niet automatisch de selectiescore. | Betaling en inhoudelijke betrouwbaarheid blijven gescheiden. |
| B-092 | Bestaande providerdata blijft behouden als zelfverklaarde data. | Deze data wordt niet automatisch een gevalideerde selectiebron. |
| B-093 | Een provider is pas selecteerbaar met complete en actuele verplichte kwalificatie-, capability-, regio-, capaciteit- en compliancegegevens. | Selecteerbaarheid is een afgeleide, tijdelijke status. |
| B-094 | Bewijsdocumenten worden veilig, versieerbaar en niet-publiek opgeslagen. | Productieopslag en AVG-bewaarbeleid moeten nog worden vastgesteld. |
| B-095 | Correcties en herbeoordelingen schrijven een nieuw immutable kwalificatiebesluit. | Eerdere besluiten worden niet vervangen of overschreven. |
| B-096 | Historische prestaties worden niet gebruikt in Decision Engine v1. | Methodiek, volume en biasbeheersing vereisen later een afzonderlijk besluit. |
| B-097 | De Decision Engine leest uitsluitend een minimale, gevalideerde en versieerbare providerprojectie. | Ruwe dossier- en bewijsdata blijven buiten de beslislaag. |
| B-098 | Vrije marketingtekst, persoonsgegevens, bewijsdocumenten, credits en betaalstatus beïnvloeden de selectie niet. | Selectie gebruikt alleen vooraf toegestane, herleidbare feiten. |

## 14 juli 2026 — Module 6A.1

De product owner heeft het ontwerp voor WorkMatchr Decision Engine v1 en ADR-009 geaccepteerd. De geaccepteerde besluiten beschrijven uitsluitend de toekomstige selectiearchitectuur; providerkwalificatie en de Decision Engine zijn nog niet geïmplementeerd.

| ID | Besluit | Toelichting |
| --- | --- | --- |
| B-099 | Selectie start niet automatisch bij publicatie. | Alleen een actieve organisatie-`OWNER` of organisatie-`ADMIN` start expliciet een selectieronde voor een `OPEN` opdracht. |
| B-100 | De engine vult een selectie nooit kunstmatig aan. | Drie, twee, één of nul geschikte providers leveren respectievelijk drie, twee, één of geen geselecteerde providers op. |
| B-101 | De volledige interne rangorde mag worden opgeslagen, maar reserveactivering is nooit automatisch. | Een vervolgselectie vereist een expliciete nieuwe actie en wordt als afzonderlijke, herleidbare ronde vastgelegd. |
| B-102 | De opdrachtgever ziet kwalitatieve uitleg, geschiktheidsredenen en relevante criteria. | Exacte interne scores, de volledige ranglijst en concurrentinformatie blijven intern. |
| B-103 | Iedere Decision Engine-run bevat een interne Confidence Check. | De kwaliteitsinschatting beschrijft onder meer kandidatenvolume, projectiecompleetheid, actualiteit en uitzonderingen, maar beïnvloedt de selectie niet. |
| B-104 | `Explainability before Score` is een leidend ontwerpprincipe. | Een geschiktheidsbesluit moet eerst begrijpelijk verklaarbaar zijn; interne puntberekening is ondergeschikt aan die uitleg. |
| B-105 | De voorlopige gewichten voor v1 zijn capabilities 40%, sectorfit 25%, leveringsvoorkeur 15%, gewenste start 10% en aanvullende kwalificaties 10%. | Alle gewichten zijn onderdeel van een immutable, versieerbaar model. |
| B-106 | De minimumscore is 60% van de actieve criteria. | Niet-toepasselijke criteria tellen niet mee in teller of noemer; de grens geldt niet over alle mogelijke criteria. |
| B-107 | Tie-breakers volgen een vaste lexicografische volgorde. | Eerst aanvullende capabilityscore, daarna sectorfit, gewenste startscore, leveringsvoorkeurscore en ten slotte een reproduceerbare cryptografische hash. |
| B-108 | Betaling, credits, bedrijfsgrootte, historische prestaties en commerciële status hebben geen invloed op selectie of tie-breakers. | Historische prestaties blijven buiten Decision Engine v1; de uitsluiting uit B-096 en B-098 is hiermee voor het volledige selectiemodel bevestigd. |

## 14–15 juli 2026 — Module 6A.2.0, 6A.2.1 en 6A.2

De product owner heeft Module 6A.2.0, Module 6A.2.1, ADR-010 en op 15 juli 2026 de volledige implementatie van Module 6A.2 geaccepteerd. De concrete v1-taxonomie, configuratiegrenzen en het bindende fail-closed beleid blijven ongewijzigd van kracht. Binnen Module 6A.3 zijn 6A.3.0, 6A.3.1 en 6A.3.2 product-ownergeaccepteerd; 6A.3.3 is technisch opgeleverd met product-owneracceptatie open.

| ID | Besluit | Toelichting |
| --- | --- | --- |
| B-109 | `ProviderProfile` blijft de aggregate root van providerkwalificatie. | Nieuwe capabilities, professionals, compliance, decisions, assessments en projecties blijven direct of indirect tenantgebonden aan dit profiel. |
| B-110 | Bestaande providerdata migreert uitsluitend als `SELF_DECLARED`. | Legacydata verleent geen automatische readiness, verificatie, platform- of beroepskwalificatie of selecteerbaarheid. |
| B-111 | Providerlifecycle, readiness, platformkwalificatie, beroepskwalificatie, selecteerbaarheid en blokkades krijgen afzonderlijke modellen en historie. | Een positieve status in één begrip impliceert geen positieve status in een ander begrip. |
| B-112 | Module 6A.2 gebruikt expliciete domeinmodellen en koppeltabellen. | Een generiek polymorf assertion-supertype of losse `entityType + entityId`-relatie wordt in versie 1 niet gebruikt. |
| B-113 | Diensten, specialismen, sectoren, competentie-/kwalificatietypen, certificeringstypen en provincies gebruiken centrale, versieerbare taxonomieën. | Vrije waarden zijn niet beschikbaar voor de Decision Engine. |
| B-114 | Werkgebied v1 bestaat uit Nederlandse provincies, `NATIONWIDE`, `REMOTE` en een optionele maximale reisafstand. | Internationale inzet valt buiten v1; de selectiesemantiek van reisafstand vereist nog een productbesluit. |
| B-115 | Gedeeltelijk vervallen door B-173: bestaande capaciteitssnapshots blijven append-only bewaard. | Geen nieuwe providerwrites en geen gebruik voor completeness of selectie. |
| B-116 | Readiness betekent volledigheid en syntactische geldigheid, niet verificatie. | Een compleet dossier kan nog ongecontroleerd, ongekwalificeerd en niet-selecteerbaar zijn. |
| B-117 | Platformkwalificatie vereist een actieve providerorganisatie, gecontroleerde organisatiebasis, actuele voorwaarden, geldige vereiste verzekering, geen blokkade en een formeel besluit. | De precieze polis- en criteriaversies blijven vóór service-implementatie vast te stellen. |
| B-118 | Beroepskwalificatie is capabilitygebonden en afzonderlijk per dienst/specialisme. | Organisatieclaims en professionele kwalificaties worden niet samengevoegd. |
| B-119 | Selecteerbaarheid is afgeleid en herleidbaar. | Er komt geen handmatig selecteerbaar-vinkje; iedere uitkomst verwijst naar actuele bronbesluiten en assessments. |
| B-120 | Verificatieniveaus zijn `SELF_DECLARED`, `DOCUMENT_CHECKED` en `VERIFIED`. | Een hoger verificatieniveau geeft niet automatisch een hogere selectiescore. |
| B-121 | Module 6A.2 gebruikt `PROVIDER_REVIEWER`, `PROVIDER_APPROVER` en `PROVIDER_AUDITOR`. | ADR-010 en de daarin vastgelegde vier-ogencontrole voor hoog-risicobesluiten zijn geaccepteerd. |
| B-122 | Bewijs krijgt versioned, private metadata; bestandbytes staan niet in PostgreSQL. | Object-storageprovider, bestandbeleid en bewaartermijnen blijven open vóór productie. |
| B-123 | Kwalificatiebesluiten en blokkades zijn append-only. | Actor, reden, bewijsversies, tijd en geldig interval blijven behouden; correctie schrijft een nieuw besluit of release. |
| B-124 | De Trusted Provider Projection is immutable en minimaal. | Canonical JSON en SHA-256 worden opgeslagen met expliciete schema-, canonicalisatie- en bronversie; persoonsgegevens en bewijsmetadata ontbreken. |
| B-125 | Diensten v1 gebruiken vijf gesloten codes en competenties v1 acht gesloten codes. | Vrije waarden tellen niet mee voor kwalificatie of toekomstige selectie; Nederlandse labels staan in referentiedata. |
| B-126 | Bestaande specialismen, sectoren en certificeringstypen blijven ongewijzigd. | Versieerbare mappings en legacyrelaties worden uitsluitend `SELF_DECLARED`; oude `APPROVED`, `VERIFIED` en `isAvailable` verhogen geen nieuwe status. |
| B-127 | Capabilitykwalificatie gebruikt een versieerbare, configureerbare vereistenmatrix. | Zonder actieve inhoudelijke configuratie levert de service `QUALIFICATION_REQUIREMENTS_NOT_CONFIGURED` en geen positief besluit. |
| B-128 | Verzekeringsvereisten zijn versieerbare configuratie. | `GENERAL_LIABILITY` moet expliciet vereist zijn; dekking, geografie en verificatieniveau zijn configureerbaar en nooit stilzwijgend hardcoded. |
| B-129 | Juridische voorwaarden en verklaringen zijn versieerbaar en expliciet te accepteren. | De seed bevat alleen conceptreferenties; ontbrekende actuele configuratie blokkeert platformkwalificatie met `TERMS_NOT_CONFIGURED`. |
| B-130 | Bewijsscanresultaten zijn afzonderlijke immutable besluiten. | Een provider kan scanstatus niet verhogen; alleen een expliciet `CLEAN` scanbesluit maakt private bewijsmetadata bruikbaar. |
| B-131 | Canonicalisatieprotocol v1 is `WORKMATCHR-CJ-1` met SHA-256. | Objectkeys worden deterministisch gesorteerd, numerieke waarden zijn veilige gehele getallen en golden vectors bewaken reproduceerbaarheid. |
| B-132 | Ontbrekende of verouderde configuratie faalt gesloten. | Geen automatische verificatie, kwalificatie, readiness, selecteerbaarheid of Trusted Provider Projection is toegestaan. |
| B-133 | Module 6A.2 is afgerond en product-ownergeaccepteerd. | Legacydata blijft uitsluitend `SELF_DECLARED`; zonder volledige geldige configuratie ontstaat geen positieve status of Trusted Provider Projection. Decision Engine, matching, uitnodigingen, credits en Mollie blijven buiten scope en niet geïmplementeerd. |

## 15 juli 2026 — Module 6A.3.0 en 6A.3.1 geaccepteerd

De product owner heeft het UX- en functioneel ontwerp, de technische impactanalyse, de workflowfundering en ADR-011 voor **Mijn providerdossier** geaccepteerd. De workflowbesluiten hieronder zijn bindend. Module 6A.3 is niet afgerond; Module 6A.3.3 is technisch opgeleverd met product-owneracceptatie open.

| ID | Besluit | Toelichting |
| --- | --- | --- |
| B-134 | Dossiercompleetheid, platformkwalificatie, beroepskwalificatie, beoordelingsstatus en selecteerbaarheid blijven afzonderlijke zichtbare begrippen. | Een positieve status in één begrip impliceert geen positieve status in een ander begrip. |
| B-135 | De zichtbare verificatielabels blijven **Zelf verklaard**, **Document gecontroleerd** en **Geverifieerd**. | Technische workflowstatussen en commerciële labels worden niet met verificatie vermengd. |
| B-136 | Een dossier is alleen indienbaar wanneer verplichte onderdelen compleet en geldig zijn en de server-side readinessservice indiening toestaat. | Indienbaar betekent niet goedgekeurd, gekwalificeerd of selecteerbaar. |
| B-137 | Tijdens beoordeling is het ingediende dossier inhoudelijk read-only. | De beoordeling gebruikt een vastgezette dossiercandidate of revisieversie en nooit mutable live-data. |
| B-138 | Bij aanvullende informatie worden alleen aangewezen onderdelen heropend. | Na herstel is expliciete herindiening en een nieuwe reviewbasis verplicht. |
| B-139 | `MEMBER` is in provider-onboarding v1 volledig read-only. | MEMBER mag niet wijzigen, professionals beheren, verzekeringen of bewijs beheren, verklaringen accepteren, indienen of herindienen. |
| B-140 | Dossiercompleetheid mag aanvullend als percentage worden getoond, maar altijd naast aantallen. | Het percentage is uitsluitend een volledigheidsindicator en geen beoordeling of kwaliteitsscore. |
| B-141 | Mijn providerdossier gebruikt zeven taakgerichte navigatiegroepen. | Professionals/kwalificaties en verzekeringen/bewijsstukken delen hoofdgroepen zonder hun domeingrenzen te verliezen. |
| B-142 | Providerformulieren gebruiken in versie 1 expliciet handmatig opslaan. | Autosave blijft uitstelbaar en mag niet stilzwijgend worden geïntroduceerd. |
| B-143 | Minimale professionalidentiteit bestaat uit volledige naam, functionele rol, actief/inactief en gekoppelde competenties en kwalificaties. | Geboortedatum, privéadres en privécontactgegevens worden niet gevraagd. |
| B-144 | Productiebewijsupload blijft fail-closed tot private objectopslag en malwarecontrole volledig zijn ingericht. | De publieke logo-opslag en -route mogen niet voor providerbewijs worden hergebruikt. |
| B-145 | PDF is het standaard bewijsformaat. | Definitieve MIME-, grootte- en paginalimieten blijven een security- en productiebesluit. |
| B-146 | De primaire indienactie heet **Dossier indienen voor beoordeling**. | Zonder vastgestelde SLA wordt geen beoordelingstermijn getoond. |
| B-147 | Module 6A.3.0 is afgerond en product-ownergeaccepteerd. | De acceptatie betreft het ontwerp en activeert geen provider-onboardingfunctionaliteit. |
| B-148 | Iedere eerste indiening en herindiening maakt een nieuwe immutable `ProviderDossierCandidate`. | Bestaande candidates worden nooit aangepast of vervangen. |
| B-149 | Beoordeling leest uitsluitend de candidate en niet mutable live-data. | Iedere review case en ieder nieuw gekoppeld besluit verwijst naar de exacte reviewbasis. |
| B-150 | Opgeslagen reviewstatussen zijn `SUBMITTED`, `UNDER_REVIEW`, `ADDITIONAL_INFORMATION_REQUIRED`, `APPROVED`, `REJECTED`, `EXPIRED` en `WITHDRAWN`. | Concept, indienbaar en herindiening gereed blijven afgeleide toestanden. |
| B-151 | Dossiergoedkeuring veroorzaakt geen automatische kwalificatie, selecteerbaarheid of Trusted Provider Projection. | De bestaande begrippenscheiding en fail-closed vervolgstappen blijven bindend. |
| B-152 | OWNER en ADMIN mogen een niet definitief afgesloten submission met verplichte reden intrekken. | Intrekking bewaart candidate, case, findings, resolutions en historie. |
| B-153 | Findings zijn append-only en verwijzen naar een gesloten dossieronderdeelcode. | Alleen aangewezen onderdelen worden bij aanvullende informatie heropend. |
| B-154 | Finding resolutions zijn afzonderlijke immutable records. | Herindiening verbindt iedere resolution aan de nieuwe candidate zonder de finding te wijzigen. |
| B-155 | Per provider bestaat maximaal één actieve submission en één open review case. | Partial unique indexes en transacties moeten dit databasebreed afdwingen. |
| B-156 | Professionals krijgen versieerbare minimale identiteitsgegevens. | Volledige naam, functionele rol en actief/inactief worden historisch bewaard; overmatige persoonsgegevens blijven uitgesloten. |
| B-157 | Vervallen door B-173: nieuwe capaciteitssnapshots zouden `confirmedByUserId` krijgen. | Historische snapshots en onbekende actoren blijven ongewijzigd bewaard. |
| B-158 | Nieuwe review-, verification- en qualificationbesluiten ondersteunen candidatebinding. | Provider-, submission-, case- en candidateconsistentie wordt server-side en databasebreed gecontroleerd. |
| B-159 | Bestaande historische besluiten worden niet achteraf fictief aan een candidate gekoppeld. | Nullable historische binding blijft zichtbaar als onbekende oude reviewbasis. |
| B-160 | Publieke logo-opslag mag niet voor providerbewijs worden gebruikt. | Providerbewijs vereist een afzonderlijke private opslag- en autorisatieketen. |
| B-161 | Bewijsupload blijft productie-fail-closed. | Zonder private storage, malwarecontrole en downloadaudit bestaat geen productie-uploadactie. |
| B-162 | Module 6A.3.1 is afgerond en product-ownergeaccepteerd. | De acceptatie activeert nog geen database-, service- of interface-implementatie. |
| B-163 | `ProviderDossierSubmission` wordt ontworpen als één logisch versioned workflowaggregate met meerdere immutable candidateattempts. | Dit houdt herindiening binnen de geaccepteerde statusset en bewaart per historyregel en reviewcase de gebruikte candidate. |
| B-164 | De uitvoering van Module 6A.3.2 is geautoriseerd op basis van de geaccepteerde ADR-011. | Dit besluit activeert 6A.3.3–6A.3.5 niet en rondt Module 6A.3 niet af. |
| B-165 | Module 6A.3.2 is technisch opgeleverd met product-owneracceptatie open. | 6A.3.3 blijft niet gestart; technische oplevering rondt Module 6A.3 niet af. |
| B-166 | Dossiercandidates gebruiken `PROVIDER-DOSSIER-1`, canonicalisatie `WORKMATCHR-CJ-1` en SHA-256. | Iedere beoordeling blijft reproduceerbaar tegen immutable inhoud en expliciete bronverwijzingen. |
| B-167 | Historische professionalidentiteiten, capaciteitsbevestigers en besluitbindingen worden niet fictief teruggevuld. | Onbekende historische actoren en bindings blijven expliciet `null`; nieuwe workflowwrites zijn strenger. |
| B-168 | Module 6A.3.2 is afgerond en product-ownergeaccepteerd; ADR-011 blijft geaccepteerd. | De acceptatie activeert geen interface, matching, credits of betalingen. |
| B-169 | Module 6A.3.3 is gestart zonder nieuwe Prisma- of productfundamentkeuze. | Module 6A.3.4 en 6A.3.5 blijven niet gestart en Module 6A.3 als geheel blijft niet afgerond. |
| B-170 | Module 6A.3.3 is technisch opgeleverd met één centrale completenesspolicy, centrale invalidation, tenantveilige read-modellen en transactionele mutatie-/submissioncontracten. | Product-owneracceptatie blijft open; 6A.3.4 en 6A.3.5 worden niet geactiveerd. |
| B-171 | Findingresolutions voor een herindiening worden expliciet aan de nieuwe immutable candidate gebonden en gebruiken optimistic concurrency. | Historische resolutions blijven nullable en worden niet fictief gekoppeld; de oorspronkelijke candidate blijft immutable. |
| B-172 | Module 6A.3.3 is afgerond en product-ownergeaccepteerd; Module 6A.3.4 is gestart. | ADR-011 blijft geaccepteerd. Module 6A.3 als geheel en Module 6A.3.5 blijven niet afgerond respectievelijk niet gestart. |
| B-173 | WorkMatchr is geen personeelsplanning; capaciteit en beschikbaarheid zijn geen verplicht providerprofiel- of selectiegegeven. | Verwijder capaciteit uit UX, completeness, open acties, readiness, selecteerbaarheid, nieuwe dossiercandidates en Trusted Provider Projection. Behoud historische modellen niet-destructief als deprecated en schrijf geen nieuwe snapshots. |
| B-174 | Providerkwalificatie-invoer blijft minimaal en zelfverklaard. | Gebruik centrale kwalificatie, naam, gecertificeerd ja/nee en bestaande many-to-many dienstkoppelingen; de aanbieder kan nooit zelf `VERIFIED` toekennen. |
| B-175 | WorkMatchr is geen HR-systeem of diploma-administratie en verzamelt alleen gegevens die noodzakelijk zijn voor platformbesluiten. | ADR-013 bepaalt accountverwijdering en maximaal dertig dagen beschermde accountretentie; organisatie-, professional-, dossier- en bewijsretentie blijven afzonderlijk juridisch uit te werken. |

## 17 juli 2026 — Eén account per organisatie en gecontroleerde accountlifecycle

De product owner heeft de doelarchitectuur uit ADR-013 vastgesteld. Fase 1 Expand heeft inmiddels uitsluitend de additive Prisma-, lifecycle-, historie- en platformorganisatie-fundamenten toegevoegd. Bestaande data, tenantcontext en interfaces zijn nog niet gemigreerd; Migrate en Contract blijven toekomstig.

| ID | Besluit | Toelichting |
| --- | --- | --- |
| B-176 | Een normaal tenantaccount behoort tot precies één organisatie. | `OrganizationMembership` blijft bestaan en krijgt uiteindelijk een unieke `userId`; toegang tot een andere organisatie vereist een afzonderlijke `User`, e-mailidentiteit, credentials en sessie. |
| B-177 | De organisatiecontext komt per request server-side uit de unieke actieve membership. | Er komt geen `organizationId` op `User` of in `Session`; actieve-organisatiecookie, wisselaar en “Organisatie toevoegen” vervallen. |
| B-178 | Reviewer en approver zijn lid van de centrale WorkMatchr-beheerorganisatie én hebben een expliciete platformpermission. | Zij mogen geen membership bij de beoordeelde provider hebben. Een auditor kan zonder organisatiemembership bestaan; uitsluitend centraal WorkMatchr-beheer kent platformpermissions toe. |
| B-179 | Actor- en bevoegdheidshistorie wordt nooit herschreven. | Membership-, rol-, status-, blokkade-, offboarding- en verwijdergebeurtenissen zijn append-only. Een nieuw account met hetzelfde e-mailadres krijgt een nieuwe `User.id` en erft niets. |
| B-180 | Blokkeren is herstelbaar en trekt alle authenticatiemiddelen onmiddellijk in. | Data en historie blijven behouden; alleen een bevoegde actor kan de status met reden wijzigen of herstellen. |
| B-181 | Accountverwijdering is direct en onomkeerbaar voor de gebruiker. | Credentials, sessies en tokens vervallen onmiddellijk; membership eindigt; het e-mailadres is direct herbruikbaar; een nieuw account blijft een nieuwe identity. |
| B-182 | Verwijderde persoonsgegevens blijven maximaal dertig dagen afgeschermd en worden daarna verwijderd of geanonimiseerd. | Minimale niet-herleidbare audit en actorcontinuïteit blijven behouden; exacte wettelijke auditbewaartermijn, encryptiesleutelbeheer en back-upuitwissing blijven productiebesluiten. |
| B-183 | Bestaande gebruikers met meerdere memberships worden uitsluitend na een preflight en handmatige keuze gemigreerd. | Geen automatische winnaar, merge of actorherschrijving; conflicten blokkeren de hardeningfase. |
| B-184 | Last-owner-, beschermde-account- en functiescheidingsregels gelden voor blokkeren en verwijderen. | Creator en bevoegde centrale beheerder krijgen begrensde bevoegdheden; reviewer, approver en auditor vereisen extra bescherming en centrale overrideprocedures. |
| B-185 | ADR-013 Fase 2A legt onbekende legacyprovisioning expliciet vast zonder een actor te verzinnen. | De centrale platformorganisatie gebruikt `WORKMATCHR_PLATFORM`; beide bestaande Users krijgen één immutable `MIGRATED_UNKNOWN`-event en behouden null `createdByUserId`; uitsluitend de goedgekeurde uitgenodigde User wordt `MIGRATION_TEMP`. Memberships, OWNERs, e-mails, authrecords en permissions blijven ongewijzigd. |
| B-186 | ADR-013 Fase 2A is afgerond en product-ownergeaccepteerd op 17 juli 2026. | De acceptatie bevestigt uitsluitend de uitgevoerde platform- en provisioningfundering; Fase 2B, de één-membershipmigratie en Contract blijven niet gestart. |
| B-187 | OWNER toevoegen en OWNER overdragen zijn afzonderlijke acties; een gewone rolwijziging mag deze lifecycle niet impliciet uitvoeren. | Overdracht promoveert de opvolger en demoveert de huidige OWNER atomair. |
| B-188 | Creatorbeheer verleent nooit extra rechten en beperkt uitsluitend het bereik van een reeds bestaande bevoegdheid. | Actorrol, tenant, targetrol en beschermde accountsoort blijven altijd eerst bepalend. |
| B-189 | Platformbeheer vereist gelijktijdig een actieve User, `PlatformRole.ADMIN` en een actieve membership bij `WORKMATCHR_PLATFORM`. | Een los platformrolveld, permission of tenantrol is onvoldoende. |
| B-190 | Self-block wordt altijd geweigerd en de laatste actieve OWNER blijft beschermd. | Er is geen impliciet overridepad in tenantbeheer. |
| B-191 | Membershipbeëindiging blijft fail-closed totdat accountstatus, membership, sessies, herstelmiddelen en historie volledig atomair kunnen worden verwerkt. | Fase 2B biedt deze actie niet aan en de service weigert haar expliciet. |
| B-192 | ADR-013 Fase 2B is technisch geïmplementeerd met product-owneracceptatie open. | Er is geen schema- of datamigratie uitgevoerd; de bestaande legacy multi-membership blijft voor een latere migratiefase. |

ADR-011 heeft status **Geaccepteerd**. Het implementatieplan begrenst 6A.3.2 tot maximaal twee niet-destructieve migraties en houdt de bredere services, interface en acceptatie in afzonderlijke vervolgstappen.

Zie [ADR-001](adr/ADR-001-design-system-en-huisstijl.md) voor de onderbouwing van het design system.
Zie [ADR-002](adr/ADR-002-postgresql-prisma-en-datamodel.md) voor de database- en datamodelkeuzes.
Zie [ADR-003](adr/ADR-003-better-auth-en-platformrollen.md) voor de authenticatie- en platformrolkeuzes.
Zie [ADR-004](adr/ADR-004-organisaties-autorisatie-en-logo-opslag.md) voor organisatie-, autorisatie- en logo-opslagkeuzes.
Zie [ADR-005](adr/ADR-005-versieerbare-intake-en-antwoordhistorie.md) voor vraagsetversies, intakeantwoorden en historie.
Zie [ADR-006](adr/ADR-006-transactionele-opdrachtvorming.md) voor atomische, idempotente en onomkeerbare opdrachtvorming.
Zie [ADR-007](adr/ADR-007-gecontroleerde-opdrachtpublicatie.md) voor de betekenis van publicatie, de immutable snapshot en de scheiding met matching.
Zie [ADR-008](adr/ADR-008-providerkwalificatie-als-fundament-voor-selectie.md) voor het geaccepteerde kwalificatiefundament en het minimale gegevenscontract voor toekomstige selectie.
Zie [ADR-009](adr/ADR-009-deterministische-versieerbare-en-uitlegbare-selectie.md) voor het geaccepteerde deterministische selectie-, snapshot- en Decision Report-model.
Zie [ADR-010](adr/ADR-010-fijnmazige-platformrollen-providerkwalificatie.md) voor het geaccepteerde reviewer-, approver-, auditor- en vier-ogenmodel.
Zie [ADR-011](adr/ADR-011-immutable-providerdossierindiening-en-beoordeling.md) voor immutable providerdossierindiening en beoordeling.
Zie [ADR-012](adr/ADR-012-gedelegeerde-bevoegdheden-namens-organisaties.md) voor de voorgestelde organisatieprocesrechten.
Zie [ADR-013](adr/ADR-013-een-organisatie-per-tenantaccount-platformrollen-en-gecontroleerde-accountverwijdering.md) voor één organisatie per tenantaccount, platformactorbinding en gecontroleerde accountverwijdering.
