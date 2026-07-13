# ADR-005 — Versieerbare intake en antwoordhistorie

- **Status:** geaccepteerd voor Module 5A.1
- **Datum:** 13 juli 2026

## Context

WorkMatchr moet een opdrachtgever helpen een hulpvraag gestructureerd te verduidelijken. Vragen kunnen in latere versies veranderen, terwijl bestaande intakes blijvend reconstrueerbaar moeten zijn. Antwoorden moeten een actuele waarde hebben zonder eerdere geldige waarden te verliezen. Module 5A.1 bouwt uitsluitend deze databasefundering; UI, autorisatie- en intakeservices, matching en AI vallen buiten deze deelstap.

## Besluit

- Een `IntakeQuestionnaire` heeft oplopende `IntakeQuestionnaireVersion`-records.
- Iedere intake verwijst blijvend naar precies één vraagsetversie.
- Gepubliceerde en gepensioneerde versies, vragen en opties zijn databasebreed inhoudelijk immutable.
- Alleen een overgang van `PUBLISHED` naar `RETIRED` is nog toegestaan; inhoudelijke wijzigingen vereisen een nieuwe versie.
- `IntakeAnswer` bevat de actuele getypeerde waarde en een oplopend versienummer.
- Iedere opgeslagen antwoordversie krijgt een append-only `IntakeAnswerRevision`; historische keuzes worden afzonderlijk vastgelegd.
- Antwoordrevisies en intakestatushistorie mogen niet worden bijgewerkt of verwijderd.
- `Intake.freeText` blijft een databasebreed immutable bronopname van de oorspronkelijke hulpvraag. Latere verduidelijking gebruikt `IntakeAnswer`.
- `Assignment.intakeId` is optioneel maar uniek, zodat maximaal één opdracht uit een intake kan ontstaan.
- Vraagset versie 1 wordt als niet-persoonlijke referentiedata door de migratie vastgelegd. De seed controleert deze gepubliceerde inhoud en overschrijft haar nooit.
- PostgreSQL-checkconstraints bewaken versies, grenzen, maximaal één scalarwaarde en geldige basisstatussen.
- Vraagtype-, optie-, locatie-/tenant- en conditionele verplichtingscontrole blijven verplichte service-invarianten in een volgende Module 5A-stap.

## Alternatieven

- Antwoorden als onbeperkte JSON opslaan: afgewezen vanwege zwakkere relationele integriteit, validatie, historie en rapportage.
- Alleen revisies opslaan en de actuele waarde telkens afleiden: afgewezen vanwege onnodig complexe en duurdere normale reads.
- Gepubliceerde vragen in-place wijzigen: afgewezen omdat bestaande intakes dan hun oorspronkelijke betekenis verliezen.
- Een nieuwe opdracht per herhaalde indiening toestaan: afgewezen; de intake-opdrachtrelatie is maximaal één-op-één.
- `freeText` synchroniseren met het actuele antwoord: afgewezen omdat daarmee de oorspronkelijke gebruikersinvoer verloren kan gaan.

## Gevolgen

- Nieuwe vraagteksten, opties, volgorde of validatiegrenzen vereisen een nieuwe vraagsetversie.
- Services moeten actuele antwoorden en revisies atomair schrijven en optimistic concurrency toepassen.
- De productie- en bewaartermijnen voor vrije tekst en revisies moeten vóór livegang in het AVG-beleid worden vastgesteld.
- PostgreSQL-specifieke triggers en partiële indexen blijven onderdeel van de controleerbare migratieketen.
- Module 5A.1 activeert nog geen intakeflow, indiening, opdrachtvorming of matching.
