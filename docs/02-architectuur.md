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
- server-side gevalideerde actieve-organisatiekeuze via HttpOnly-cookie;
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
- Lokale bestandsschijf wordt nooit als productieopslag gebruikt; productie zonder provider faalt veilig.

## Bewust uitgestelde keuzes

Betalingen, hosting, productieback-ups en andere infrastructuurkeuzes worden pas vastgelegd in de module waarin ze nodig zijn. De definitieve object-storageprovider, auditlogging en membershipbeheer zijn bewust uitgesteld.
