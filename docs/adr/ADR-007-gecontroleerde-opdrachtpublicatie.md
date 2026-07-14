# ADR-007 — Gecontroleerde opdrachtpublicatie

## Status

Geaccepteerd door de product owner op 14 juli 2026 en technisch toegepast in de afgeronde, product-ownergeaccepteerde Module 5C.2 en Module 5C.3. Module 5C is als geheel afgerond.

## Context

Na Module 5B.3 kan een opdracht intern de status `READY_FOR_REVIEW` bereiken. WorkMatchr moet bepalen wat publiceren betekent voordat matching, providerselectie, credits of betalingen worden gebouwd. Een algemene marktplaats past niet vanzelfsprekend bij de productregel dat maximaal drie passende aanbieders gecontroleerd worden geselecteerd.

Publicatie moet bovendien herleidbaar zijn naar een actor, tijd en exacte inhoudsversie. De bestaande opdracht heeft optimistic concurrency, append-only revisies en statushistorie, maar nog geen complete publicatiemetadata of integriteitsregel.

## Besluit

1. WorkMatchr gebruikt publicatiemodel B: publicatie zet een opdracht definitief gereed voor toekomstige marktverwerking.
2. Publicatie maakt de opdracht niet openbaar en geeft aanbieders geen toegang.
3. De bestaande status `OPEN` vertegenwoordigt publicatie; er komen geen statussen `PUBLISHED` of `PUBLICATION_PENDING`.
4. Alleen actieve organisatie-`OWNER` en organisatie-`ADMIN` binnen een actieve `CLIENT`- of `BOTH`-tenant mogen publiceren en intrekken.
5. Platformrol `ADMIN` geeft zonder actieve membership geen tenanttoegang of publicatierecht.
6. Publicatie schrijft atomair `OPEN`, tijd, actor, publicatieversie, één append-only inhoudssnapshot en één statushistorieregel.
7. Alle opdrachtinhoud is na publicatie immutable. Terugkeer naar `DRAFT` en herpublicatie zijn niet toegestaan binnen Module 5C.
8. Intrekken verloopt via `OPEN → CANCELLED` met verplichte reden en behoud van alle historie.
9. Publicatie start geen matching, providerselectie, reactie, creditmutatie of Mollie-betaling.

## Gevolgen

### Positief

- publicatie en matching hebben een heldere contractgrens;
- de toekomstige matchingservice leest één stabiele snapshot;
- tenantautorisatie blijft eenvoudig en sluit aan op bestaand beleid;
- privacyrisico's van algemene providerzichtbaarheid worden vermeden;
- concurrency, idempotentie en audit kunnen binnen één databasehandeling worden geborgd;
- de productbelofte van maximaal drie gecontroleerde aanbieders blijft intact.

### Negatief

- de term “publiceren” vraagt expliciete UX-uitleg omdat er geen externe zichtbaarheid ontstaat;
- correcties na publicatie vereisen intrekken en een nieuwe intake/opdracht;
- de gebruikersinterface en Server Actions zijn in Module 5C.3 technisch en door de product owner geaccepteerd;
- platformherstel, herpublicatie en meerdere publicatie-episodes blijven onontworpen.

## Gerealiseerde technische gevolgen

- `Assignment` bewaart `publishedAt`, `publishedByUserId` en `publishedVersion`;
- `publishedVersion` verwijst naar exact één append-only `AssignmentRevision`;
- publicatie en intrekken gebruiken centrale `Serializable` transacties met optimistic concurrency en idempotentie;
- databaseconstraints en triggers bewaken complete metadata, unieke historie, immutable inhoud en het verbod op herpublicatie;
- `Assignment.version` kan door statusovergangen stijgen zonder lege revisie; een nieuwe inhoudsrevisie moet wel de actuele versie gebruiken en strikt nieuwer zijn;
- er zijn geen provider-, matching-, credit- of betaalwrites toegevoegd.

## Afgewezen alternatieven

### Algemene marktplaatspublicatie

Afgewezen wegens privacy, informatieoverbelasting, ongecontroleerde acquisitie en strijdigheid met de gecontroleerde selectie van maximaal drie aanbieders.

### Publicatie gekoppeld aan providerselectie

Uitgesteld omdat dit publicatie afhankelijk maakt van matching, providergoedkeuring, maximaal-drie-invariant, toegangsverlening, credits en herstel over meerdere domeinen.

### Nieuwe status `PUBLISHED`

Afgewezen omdat `OPEN` dezelfde domeintoestand kan vertegenwoordigen en een extra enumwaarde zonder nieuwe betekenis complexiteit toevoegt.

### Status `PUBLICATION_PENDING`

Afgewezen zolang publicatie één korte lokale transactie is. Een mislukking laat de opdracht in `READY_FOR_REVIEW`.

## Grenzen

Deze ADR wijzigt ADR-006 niet. Opdrachtvorming en opdrachtpublicatie blijven afzonderlijke domeinhandelingen. Providerzichtbaarheid, matchingstart, kostmoment, beheerblokkades, AVG-retentie en juridisch bruikbare opdrachtnummering krijgen afzonderlijke besluiten.

## Gerelateerde documentatie

- [Ontwerp Module 5C](../module-5c-ontwerp.md)
- [Ontwerp Module 5B](../module-5b-ontwerp.md)
- [ADR-006 — Transactionele opdrachtvorming](ADR-006-transactionele-opdrachtvorming.md)
- [Productvisie](../01-productvisie.md)
