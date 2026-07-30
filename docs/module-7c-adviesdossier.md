# Module 7C — WorkMatchr Adviesdossier

Status: technisch opgeleverd; handmatige product-owneracceptatie open

## Doel

Een afgeronde publieke hulpvraag kan voor een ingelogde opdrachtgever worden vastgelegd als een duurzaam WorkMatchr Adviesdossier. Het dossier bewaart exact de informatie en het advies waarop de gebruiker op dat moment kon vertrouwen. Het is geen opdracht, matchingverzoek of commerciële transactie.

## Domeingrens

`AdviceDossier` is de tenantgebonden dossieridentiteit. `AdviceDossierVersion` is de immutable inhoudssnapshot. Een dossier:

- behoort aan exact één actieve opdrachtgeverorganisatie;
- heeft exact één eigenaar;
- kan vanuit een publieke hulpvraag, kennisroute of directe specialistzoekroute ontstaan;
- gebruikt in M7C uitsluitend `HELP_REQUEST`;
- verwijst voor die route uniek naar één `PublicIntakeDraft`;
- krijgt een herkenbare, databasebreed unieke code zoals `WM-2026-000001`;
- bevat geen matching, providerselectie, credits, offerte of opdrachtvorming.

De code wordt transactioneel uit een jaarteller uitgegeven. Een telling van bestaande dossiers is nadrukkelijk niet toegestaan, omdat parallelle creaties dan dezelfde code kunnen kiezen.

## Immutable versies

Iedere inhoudelijke dossierstand staat in een nieuwe `AdviceDossierVersion`. Een versie bewaart onder meer:

- de oorspronkelijke hulpvraag;
- de bevestigde samenvatting;
- het onderwerp;
- antwoorden en bekende onzekerheden;
- de deterministische guidance-uitkomst;
- het professionele advies en de vaste disclaimer;
- gebruikte engine-, ruleset-, knowledge- en bronversies;
- de bronversie van de publieke intake.

Versies worden nooit bijgewerkt of verwijderd. PostgreSQL-triggers blokkeren `UPDATE` en `DELETE`. Een unieke bronversie voorkomt dat dezelfde publieke intakeversie tweemaal als dossierinhoud wordt vastgelegd.

## Aanmaak en idempotentie

Na een complete publieke intake probeert de server-side handoff een dossier aan te maken wanneer de actuele gebruiker:

- een actieve accountstatus heeft;
- één actief membership heeft;
- bij een actieve organisatie van type `CLIENT` of `BOTH` hoort.

Anonieme bezoekers behouden de bestaande publieke draft en krijgen geen fictieve User of Organization. De aanmaak is serializable, vergrendelt de bron-draft en gebruikt unieke databaseconstraints. Herhaalde requests en parallelle submits leveren daardoor hetzelfde dossier en dezelfde versie op.

## Autorisatie

Alle reads en mutaties controleren de actuele sessie en tenant opnieuw op de server.

- de eigenaar kan het eigen dossier lezen;
- `OWNER` en `ADMIN` kunnen dossiers binnen de eigen actieve opdrachtgeverorganisatie lezen;
- `MEMBER` ziet uitsluitend het eigen dossier;
- een volledige centrale `PlatformRole.ADMIN` kan vanuit platformbeheer lezen;
- een providerorganisatie krijgt geen toegang op basis van providerschap;
- ontbrekende of tenantvreemde dossiers leveren geen objectenumeratie op.

Statusacties gebruiken dezelfde servicegrens. M7C activeert uitsluitend afronden en archiveren; toekomstige marketplace- of opdrachtstatussen zijn niet functioneel aangesloten.

## Audit

`AdviceDossierEvent` is append-only en registreert minimaal:

- dossieraanmaak;
- versieaanmaak;
- PDF-download;
- statuswijziging.

Het event bevat actor, tijd, type, doelversie en begrensde metadata. De eventtabel heeft eveneens databasebrede immutable triggers.

## PDF

De PDF wordt op verzoek en in-memory opgebouwd uit exact één opgeslagen `AdviceDossierVersion`. Er wordt geen live intake of opnieuw berekend advies gebruikt. De downloadroute herhaalt de server-side autorisatie, geeft geen informatie over tenantvreemde dossiers prijs, voegt `no-store` toe en schrijft na succesvolle generatie een auditevent.

## Privacy, indexering en retentie

Adviesdossierpagina’s hebben `noindex` en zijn in `robots.txt` uitgesloten. Dossiers kunnen bedrijfsinformatie en mogelijk door de gebruiker ingevoerde persoonsgegevens bevatten. Voor productie moeten nog expliciet worden vastgesteld:

- juridische grondslag en bewaartermijn per status;
- archiverings-, anonimisering- en verwijderbeleid;
- behandeling van PDF-downloads en back-ups;
- inzage- en exportrechten;
- operationele monitoring van mislukte auditwrites.

Totdat deze besluiten zijn uitgevoerd, worden immutable versies niet fysiek verwijderd en wordt geen geautomatiseerde retentiejob geactiveerd.

## Bewust buiten scope

M7C bouwt niet:

- matching of providerselectie;
- opdrachten of omzetting naar `Assignment`;
- credits, offertes of betalingen;
- e-mailverzending van dossiers;
- kennis- of directe specialistflows;
- inhoudelijke wijziging van afgeronde dossierinhoud;
- nieuwe AI-, Guidance- of Clarification-regels.

## Acceptatiestatus

De datamodel-, service-, interface-, PDF-, audit- en integriteitstests zijn technisch opgeleverd. Handmatige product-owneracceptatie van de volledige browserflow blijft open totdat deze op desktop en mobiel is doorlopen.

### M7C.1 — Header Navigation and Anonymous Save UX

De publieke hoofdnavigatie blijft op publieke en beschermde pagina’s beschikbaar, ongeacht de sessiestatus. Bij een ingelogde gebruiker verdwijnt uitsluitend de loginlink en blijft het bestaande accountmenu als afzonderlijke accountnavigatie beschikbaar.

Een afgeronde anonieme intake toont een bewaarblok met:

- `Inloggen`, met een veilige terugkeer naar `/advieswijzer`;
- `Account aanmaken`, zonder belofte van automatische opslag.

De padgebonden conceptsessie blijft tijdens login behouden. Een bestaande opdrachtgever met een actief membership keert na succesvolle login terug naar de Advieswijzer, waarna de bestaande idempotente handoff het dossier kan opslaan zonder nieuwe classificatie. De registratieflow loopt via e-mailverificatie en eventuele organisatie-onboarding en ondersteunt nog geen volledige automatische terugkeer; dit blijft een handmatig acceptatie- en toekomstig auth-UX-punt.

### M7C.2 — Correct Situation Summary Snapshot

Een nieuwe dossierversie bewaart twee bewust gescheiden bronnen:

- `originalHelpRequest` bevat exact de oorspronkelijke vrije invoer van de gebruiker;
- `situationSummary` bevat bij een expliciet bevestigde AI-interpretatie de reeds gecachte en door de gebruiker bevestigde samenvatting.

De dossierhandoff voert geen nieuwe classificatie uit. Na een bevestiging wordt uitsluitend de bestaande gevalideerde cache-uitkomst read-only teruggeladen. Ontbreekt die bij een historische intake, dan gebruikt de snapshot achtereenvolgens een bestaande bevestigde hulpvraagbeschrijving en de reeds gevalideerde M7B-situatiesamenvatting. Alleen wanneer geen andere bron bestaat, blijft de bestaande deterministische Guidance-uitkomst de laatste veilige fallback.

Bestaande `AdviceDossierVersion`-records worden niet gewijzigd. Detailpagina en PDF blijven uitsluitend de immutable opgeslagen snapshot lezen.

### M7B.1-prioriteiten in de snapshot

Nieuwe dossierversies bewaren één primaire en alle aanvullende en mogelijk relevante deskundigheden met hun expliciete prioriteit, reden en expertise. Hiervoor wordt het bestaande JSON-snapshotveld additief gebruikt; een Prismawijziging is niet nodig. Historische secundaire snapshots zonder prioriteit worden uitsluitend bij het lezen als `ADDITIONAL` geïnterpreteerd. Ze worden niet in-place aangepast. De online detailweergave en PDF lezen dezelfde immutable snapshot.
