# Architectuur WorkMatchr

## Huidige technische basis

- Next.js met App Router;
- React;
- TypeScript in strikte modus;
- Tailwind CSS;
- ESLint;
- npm;
- `src`-directory en importalias `@/*`;
- responsive, semantische en toegankelijke gebruikersinterface.
- centrale semantische design-tokens in `src/app/globals.css`;
- herbruikbare layout- en UI-componenten in `src/components`.
- PostgreSQL 17 als relationele database;
- Prisma ORM 7 met de PostgreSQL-driveradapter;
- UUID's als primaire sleutels en UTC-tijdstempels met tijdzone;
- versiebeheerbare Prisma-migraties en een idempotente seed voor referentiedata;
- lokale database-isolatie via Docker Compose.
- Better Auth 1.6 met de officiële Prisma-adapter;
- databasegebaseerde sessies en database-rate-limiting;
- verwisselbare e-mailservice met Resend-voorbereiding.
- transactionele organisatieservice met membershipgebaseerde tenantautorisatie;
- server-side gevalideerde actieve-organisatiekeuze via HttpOnly-cookie in de huidige implementatie;
- verwisselbare logo-opslag met lokale developmentadapter en Sharp-WebP-verwerking.
- versieerbare intakevraagsets met immutable gepubliceerde versies;
- getypeerde actuele intakeantwoorden met append-only revisie- en statushistorie;
- maximaal één optionele opdracht per intake als databasebrede invariant.
- transactionele intakeservices met tenantautorisatie, dynamische validatie en optimistische concurrency;
- beveiligde App Router-interface met dunne Server Actions en geautoriseerde read-modellen.
- transactionele, idempotente opdrachtvorming vanuit `READY_FOR_REVIEW` met `Serializable` isolatie;
- append-only opdrachtstatus- en inhoudshistorie met optimistic concurrency op `Assignment.version`.
- dunne Assignment-Server Actions die uitsluitend servercontext normaliseren, valideren en centrale mutatieservices aanroepen;
- tenantgebonden opdrachtqueries en mutaties waarbij `OWNER` en `ADMIN` beheren en `MEMBER` alleen een opdracht uit de eigen intake kan lezen.
- gecontroleerde opdrachtpublicatie met `OPEN`, publicatieactor, publicatieversie en een immutable `AssignmentRevision`-snapshot;
- transactionele publicatie- en intrekservices met `Serializable` isolatie, optimistic concurrency en idempotente herhaling.
- server-rendered publicatiecontrole en gepubliceerde detailweergave met dunne Server Actions, expliciete bevestiging, foutfocus en invoerbehoud.

## Structuurprincipes

- Routes en paginalayouts staan in `src/app`.
- Herbruikbare layoutcomponenten staan in `src/components/layout`.
- Kleine, algemene interfacecomponenten staan in `src/components/ui`.
- `src/lib` en `src/types` worden alleen gebruikt zodra daar daadwerkelijk gedeelde code voor bestaat.
- Nieuwe bedrijfsfunctionaliteit wordt later modulair toegevoegd, zonder voortijdige abstracties.
- Publieke website en toekomstige applicatieonderdelen gebruiken hetzelfde design system.
- Databasetoegang loopt via de gedeelde, lazy geïnitialiseerde Prisma-client in `src/lib/prisma.ts`.
- Historische bedrijfsgegevens worden standaard gedeactiveerd of gearchiveerd; relaties gebruiken geen cascade-delete.
- Regels die meerdere rijen raken, zoals maximaal drie actieve selecties en een sluitend creditsaldo, worden later transactioneel in de servicelaag afgedwongen.
- Beveiligde routes controleren sessie, platformrol en actuele accountstatus server-side via centrale helpers.
- Organisatieacties controleren daarnaast actuele membershiprol en organisatie-/membershipstatus server-side.
- ADR-013 Fase 1 Expand is additief geïmplementeerd met lifecyclevelden, platformorganisatie-identiteit en append-only provisioning-/membershiphistorie. De doelarchitectuur is nog niet geactiveerd: multi-memberships, actieve-organisatiecookie en requestcontext blijven tot Migrate/Contract werken. Reviewer/approverbinding en de auditoruitzondering zijn alleen als niet-geactiveerd fundament vastgelegd.
- Iedere intake blijft gekoppeld aan de bij aanmaak vastgezette vraagsetversie; gepubliceerde inhoud wordt niet in-place gewijzigd.
- Actuele antwoorden en revisies worden in de intakeservice atomair geschreven; type-, optie-, locatie- en tenantvalidatie is server-side verplicht.
- Intakepagina’s en componenten benaderen Prisma niet rechtstreeks; reads en writes lopen via afzonderlijke intake-services.
- Alleen actieve `OWNER`- en `ADMIN`-memberships kunnen server-side een intake converteren; de conversieservice valideert status, tenant, volledige antwoorden en versie opnieuw.
- Een geconverteerde intake is immutable; iedere opdracht blijft via de unieke `intakeId` herleidbaar naar haar bron.
- Zakelijke correcties vinden alleen op een `DRAFT`-opdracht plaats. Iedere inhoudswijziging verhoogt `Assignment.version` en schrijft in dezelfde transactie één append-only `AssignmentRevision`.
- Interne statusovergangen schrijven afzonderlijke append-only `AssignmentStatusHistory`; terugzetten en annuleren vereisen een reden van 10 tot en met 500 tekens.
- Alleen een actieve organisatie-`OWNER` of organisatie-`ADMIN` kan `READY_FOR_REVIEW → OPEN` publiceren; `OPEN` geeft nog geen aanbiederszichtbaarheid en start geen matching, credits of betaling.
- Matching leest later uitsluitend de revisie op `publishedVersion`. Na publicatie zijn zakelijke opdrachtvelden, specialismekoppelingen en publicatiemetadata immutable; intrekken verloopt uitsluitend via `OPEN → CANCELLED`.
- Publicatie-Server Actions accepteren geen tenant-ID als autorisatiebron, bepalen de actieve organisatie server-side en roepen uitsluitend de centrale publicatieservices aan.
- `Assignment.version` stijgt bij inhoud en status. Een inhoudsrevisie gebruikt de actuele opdrachtversie en is strikt nieuwer dan eerdere revisies; statusgerelateerde versienummers hoeven geen lege revisies te krijgen.
- Providerkwalificatie wordt vóór toekomstige selectie een afzonderlijke domeingrens. Platformkwalificatie, beroepskwalificatie, readiness, selecteerbaarheid en historische prestaties blijven gescheiden en versieerbaar.
- De toekomstige Decision Engine leest uitsluitend een minimale, gevalideerde providerprojectie met bron, verificatie, geldigheid en snapshotversie; ruwe bewijsdocumenten, direct identificerende persoonsgegevens, vrije marketingtekst en commerciële status blijven buiten de selectielaag.
- Het geaccepteerde 6A.1-ontwerp gebruikt een deterministische pipeline van kandidaatverzameling, afzonderlijke knock-outs, integer scoring, lexicografische tie-breakers en maximaal drie geselecteerden. `Explainability before Score` is leidend: WorkMatchr communiceert primair de reden van geschiktheid en niet de interne berekening.
- Een selectieronde start uitsluitend na een expliciete actie van een actieve organisatie-`OWNER` of organisatie-`ADMIN` op een `OPEN` opdracht. Publicatie start de Decision Engine niet automatisch.
- Iedere toekomstige selectieronde bevriest opdracht-, provider-, engine-, model-, regel- en taxonomieversies en finaliseert kandidaatresultaten plus een immutable Decision Report atomair. Het rapport bevat een interne Confidence Check die context geeft over datakwaliteit en uitzonderingen, maar knock-outs, score, rangorde en selectie niet beïnvloedt.
- De engine vult een uitkomst nooit kunstmatig aan: drie, twee, één of nul geschikte providers leiden respectievelijk tot drie, twee, één of geen geselecteerde providers. De volledige interne rangorde mag worden opgeslagen; reserveactivering is nooit automatisch en een vervolgselectie vereist een expliciete nieuwe actie.
- Selectie activeert geen uitnodiging, providerrecht, credits of betaling. Opdrachtgevers zien kwalitatieve geschiktheidsredenen en relevante criteria, maar geen exacte interne scores, volledige rangorde of concurrentinformatie.
- Lokale bestandsschijf wordt nooit als productieopslag gebruikt; productie zonder provider faalt veilig.
- Providerdossierbeoordeling leest uitsluitend een immutable `ProviderDossierCandidate`, niet de mutable live-data. Candidates gebruiken `PROVIDER-DOSSIER-1`, `WORKMATCHR-CJ-1`, SHA-256 en expliciete bronversies.
- Dossierindiening, intrekken, beoordeling, informatieverzoek en herindiening lopen transactioneel via centrale provider-dossierservices met tenantcontrole, expliciete providerpermissions, optimistic concurrency en idempotentie.
- Findings en resolutions zijn append-only; dossiergoedkeuring veroorzaakt geen automatische platformkwalificatie, selecteerbaarheid of Trusted Provider Projection.
- Providerfactmutaties gebruiken één centrale profielversie voor optimistic concurrency, maken readiness/selecteerbaarheid fail-closed en invalidateren de actuele Trusted Provider Projection zonder immutable candidates te wijzigen.
- Dossiercompleetheid is een versioned syntactische policy en blijft strikt gescheiden van verificatie, kwalificatie en selecteerbaarheid. Dashboard-, sectie- en MEMBER-read-modellen selecteren tenantveilig alleen noodzakelijke velden.
- Capaciteit en beschikbaarheid zijn per productbesluit van 16 juli 2026 geen providerprofiel- of selectiegegeven. Historische capaciteit blijft technisch leesbaar, maar nieuwe writes zijn uitgeschakeld en completeness, readiness, selecteerbaarheid, `PROVIDER-DOSSIER-2` en Trusted Provider Projection lezen deze data niet.
- WorkMatchr is geen HR-systeem, personeelsplanning of diploma-administratie. Professionele gegevens blijven beperkt tot wat aantoonbaar nodig is voor platformbesluiten. ADR-013 bepaalt voor accountdata maximaal dertig dagen afgeschermde retentie na verwijdering en daarna anonimisering of verwijdering; bewaartermijnen voor overige organisatie-, dossier- en bewijsdata blijven afzonderlijk juridisch uit te werken.

## Bewust uitgestelde keuzes

## Marketplace Transaction Platform v1

- Matching wordt expliciet gestart en leest uitsluitend de gepubliceerde opdrachtsnapshot en actuele Trusted Provider Projections.
- Matchruns, kandidaten, interventies en Decision Reports bewaren engine-, model-, regel-, taxonomie- en bronversies met checksums.
- Uitnodiging, deelname, offerte, gunning, creditreservering, berichtenkanaal en notificaties zijn afzonderlijke aggregates met unieke idempotentiesleutels.
- Deelname en reservering, offerte-indiening en consumptie, en gunning met afwijzing van overige offertes zijn ieder één `Serializable` transactie.
- De creditledger is append-only; actuele beschikbare, gereserveerde en bestede totalen zijn gecontroleerde projecties met niet-negatieve databaseconstraints.
- Berichten zijn uitsluitend mogelijk binnen één opdracht, één opdrachtgever en één deelnemende provider. Concurrenten delen nooit een kanaal.
- In-appnotificaties zijn persistent. E-mail gebruikt een outbox zodat transportfalen de zakelijke transactie niet breekt.
- Private routes gebruiken Server Components voor reads en dunne Server Actions bovenop centrale services voor writes.

Credits kopen, betalingen, AI, reviews, publieke providerzoeking, realtime communicatie en berichtbijlagen blijven uitgesteld.

### ADR-013 platformidentiteit en provisioning

De centrale platformorganisatie is een afzonderlijke systeemtenant met immutable `systemKey`, niet een organisatie die op naam wordt herkend. Systeemgedreven bootstrap gebruikt een expliciete systeemactor in append-only historie; onbekende legacyactoren blijven null en worden als `MIGRATED_UNKNOWN` verklaard. Normale tenant-, provider-, intake- en opdrachtgrenzen sluiten `PLATFORM_OPERATOR` fail-closed uit. De doelarchitectuur met één membership per normaal tenantaccount is nog niet geactiveerd.

Betalingen, hosting, productieback-ups en andere infrastructuurkeuzes worden pas vastgelegd in de module waarin ze nodig zijn. De definitieve object-storageprovider, auditlogging en membershipbeheer zijn bewust uitgesteld.
