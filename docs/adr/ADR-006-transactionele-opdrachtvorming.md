# ADR-006 — Transactionele opdrachtvorming

- **Status:** geaccepteerd voor Module 5B.2
- **Datum:** 13 juli 2026

## Context

Module 5A levert versieerbare intakes tot `READY_FOR_REVIEW`. Module 5B moet een bevoegde organisatiegebruiker zo’n intake laten indienen en daaruit maximaal één herleidbare `Assignment` vormen. Een dubbele klik, herhaald request, gelijktijdige indiening of technische fout mag geen dubbele of gedeeltelijke opdracht opleveren. Na indiening moet de oorspronkelijke intake als historische bron behouden blijven.

## Besluit

- Alleen een actuele `OWNER` of `ADMIN` met actieve membership bij dezelfde actieve `CLIENT`- of `BOTH`-organisatie mag een intake indienen.
- Een opdracht ontstaat uitsluitend na expliciete bevestiging van een volledig geldige intake in `READY_FOR_REVIEW`.
- De service registreert binnen één databasetransactie `READY_FOR_REVIEW → SUBMITTED → CONVERTED`, maakt exact één `Assignment` met status `DRAFT` en schrijft de initiële status- en inhoudshistorie.
- `SUBMITTED` is geen duurzame herstelstatus. Bij iedere fout rolt de volledige transactie terug en blijft de intake `READY_FOR_REVIEW`.
- `Assignment.intakeId` blijft uniek. De service is daarnaast idempotent en gebruikt optimistische concurrency op de intakeversie.
- Na `CONVERTED` blijven intake, vraagsetversie, antwoorden en antwoordrevisies immutable.
- Een geslaagde conversie wordt niet teruggedraaid. Correctie gebeurt op het opdrachtconcept; intrekken zet de opdracht met verplichte reden op `CANCELLED` en verwijdert geen historie.
- De opdracht bewaart de bron-`intakeId`, tenant, indienende actor en een deterministisch afgeleide titel en omschrijving. Gestructureerde vraagset- en matchinginput blijft via de immutable intake herleidbaar en wordt niet onnodig gedupliceerd.
- Module 5B vormt geen specialisme, score, providerselectie, publicatie, betaling of AI-uitkomst.
- Intake- en opdrachtstatussen en iedere opdrachtinhoudswijziging krijgen append-only zakelijke historie. Applicatielogs bevatten geen vrije tekst, antwoorden, secrets, tokens of volledige persoonsgegevens.

## Alternatieven

- **Een opdracht maken zodra de intake `READY_FOR_REVIEW` bereikt:** afgewezen, omdat een `MEMBER` dan impliciet namens de organisatie zou indienen en er geen expliciet bevestigingsmoment is.
- **Intake en opdracht in afzonderlijke transacties wijzigen:** afgewezen, omdat een duurzame gedeeltelijke toestand kan ontstaan.
- **Alleen vooraf controleren of al een opdracht bestaat:** afgewezen, omdat twee gelijktijdige requests deze controle allebei kunnen passeren.
- **Alle intakeantwoorden als opdracht-JSON kopiëren:** afgewezen vanwege duplicatie, divergentierisico en zwakkere herleidbaarheid naar de vastgezette vraagsetversie.
- **Een geconverteerde intake heropenen:** afgewezen, omdat daarmee de bron waarop de opdracht is gevormd achteraf verandert.
- **Een geannuleerde opdracht hard verwijderen:** afgewezen vanwege zakelijke historie en auditbaarheid.

## Gevolgen

- De implementatie heeft ontbrekende indieningsmetadata, assignmentversie en append-only opdrachtstatus-/revisiehistorie nodig via een nieuwe Prisma-migratie.
- De opdrachtvormingsservice moet autorisatie, volledigheid, tenantrelaties, status en versie binnen de transactiestroom opnieuw valideren.
- Een herhaalde aanvraag mag alleen als idempotent succes gelden wanneer intake en bestaande opdracht samen de verwachte consistente eindtoestand hebben.
- Correcties na conversie kunnen afwijken van de bronintake en moeten daarom in opdrachtrevisies zichtbaar blijven.
- `MEMBER` kan een uit de eigen intake gevormde opdracht bekijken, maar niet indienen of muteren.
- Bewaar- en anonimiseringstermijnen moeten vóór productie in het AVG-beleid worden vastgesteld.
- De precieze implementatie, migratie en tests volgen in een afzonderlijke Module 5B-stap.
