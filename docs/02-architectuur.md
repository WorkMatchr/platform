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

## Bewust uitgestelde keuzes

Authenticatie, autorisatie, betalingen, hosting, productieback-ups, bestandsopslag en andere infrastructuurkeuzes worden pas vastgelegd in de module waarin ze nodig zijn. Module 3 levert uitsluitend de databasebasis en implementeert nog geen bedrijfsprocessen.
