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

## Structuurprincipes

- Routes en paginalayouts staan in `src/app`.
- Herbruikbare layoutcomponenten staan in `src/components/layout`.
- Kleine, algemene interfacecomponenten staan in `src/components/ui`.
- `src/lib` en `src/types` worden alleen gebruikt zodra daar daadwerkelijk gedeelde code voor bestaat.
- Nieuwe bedrijfsfunctionaliteit wordt later modulair toegevoegd, zonder voortijdige abstracties.
- Publieke website en toekomstige applicatieonderdelen gebruiken hetzelfde design system.

## Bewust uitgestelde keuzes

Database, datamodel, authenticatie, rollen, betalingen, hosting, bestandsopslag en andere infrastructuurkeuzes worden pas vastgelegd in de module waarin ze nodig zijn. Dit document verzint daar nog geen technische invulling voor.
