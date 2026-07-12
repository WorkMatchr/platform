# Datawoordenboek WorkMatchr

Alle IDs zijn UUID’s. `createdAt` en `updatedAt` zijn UTC-timestamps tenzij anders vermeld. Relaties gebruiken standaard `RESTRICT` om zakelijke historie te beschermen.

| Model | Doel en belangrijkste velden | Relaties en constraints | Archivering, gevoeligheid en toekomst |
| --- | --- | --- | --- |
| `User` | Menselijke gebruiker; `email`, `displayName`, `platformRole`, `status`. | Unieke e-mail; memberships en actorrelaties. | `archivedAt`; e-mail en naam zijn persoonsgegevens; authenticatie volgt in Module 4. |
| `Organization` | Opdrachtgever, aanbieder of beide; contact- en bedrijfsgegevens. | Type/status-indexen; 1:n memberships/locations; 1:1 provider/creditaccount. KvK niet uniek. | `archivedAt`; contactvelden kunnen persoonsgegevens bevatten. |
| `OrganizationMembership` | Gebruikersrol binnen organisatie. | Uniek `userId + organizationId`; indexen op beide FKs en status. | Status `REMOVED`; geen hard delete na gebruik. |
| `OrganizationLocation` | Vestiging of werklocatie. | Organisatie-FK; landcodecheck; assignmentrelatie. | `archivedAt`; adres is potentieel gevoelig; primaire locatie later transactioneel. |
| `Sector` | Beheerbare sectorclassificatie. | Unieke slug; `isActive`-index. | Deactiveren, niet verwijderen wanneer gebruikt. |
| `OrganizationSector` | Sectoren van een organisatie. | Uniek `organizationId + sectorId`. | Primaire sector later via service bewaken. |
| `Specialism` | Hiërarchisch expertisegebied. | Unieke slug; self-relation via `parentId`; index op parent/active. | Deactiveren; vraagboomuitbreiding volgt later. |
| `ProviderProfile` | Aanbieder-specifieke gegevens en goedkeuring. | Unieke `organizationId`; approverrelatie; status/availability-indexen. | `archivedAt`; provider-type en goedkeuring via latere service. |
| `ProviderSpecialism` | Expertise van aanbieder. | Uniek `providerProfileId + specialismId`; niet-negatieve ervaring. | Koppeling verwijderen alleen vóór gebruik; primaire expertise later service. |
| `ProviderSector` | Sectorervaring van aanbieder. | Uniek `providerProfileId + sectorId`; niet-negatieve ervaring. | Geen persoonsgegevens. |
| `Certification` | Beheerbaar certificeringstype. | Unieke slug; `isActive`-index. | Deactiveren, niet verwijderen wanneer gebruikt. |
| `ProviderCertification` | Certificaat van aanbieder. | Meerdere certificaten per type toegestaan; verifierrelatie; datumcheck. | `archivedAt`; certificaatnummer kan gevoelig zijn; uploads volgen later. |
| `Intake` | Vrije hulpvraag vóór opdracht. | Optionele gebruiker/organisatie/specialisme; status- en datumindexen. | `archivedAt`; vrije tekst kan gevoelige informatie bevatten; vraagbomen/AI later. |
| `Assignment` | Concrete opdracht. | Verplichte client/creator; optionele intake, locatie, sector en primair specialisme; status/datumindexen. | `archivedAt` of status; omschrijving kan gevoelige bedrijfsinformatie bevatten. |
| `AssignmentSpecialism` | Meerdere gevraagde specialismen. | Uniek `assignmentId + specialismId`. | Na publicatie als historie behouden. |
| `AssignmentProviderSelection` | Herleidbare reguliere providerselectie. | Uniek assignment/provider; score 0–100; bron/status/datumindexen. | Nooit stilzwijgend verwijderen; max. drie actieve selecties later transactioneel. |
| `AssignmentResolution` | Uitkomst: provider gegund, externe verwijzing of zelf afgehandeld. | Eén per assignment; conditionele PostgreSQL-check op type en velden. | Historie behouden; externe partijnaam kan zakelijke informatie bevatten. |
| `AdminActionLog` | Append-only beheerhandelingen. | Actor-FK; entity- en datumindexen; geen `updatedAt`. | Nooit wijzigen/verwijderen; metadata begrenzen via latere validatie. |
| `CreditAccount` | Afgeleid actueel creditsaldo per organisatie. | Eén per organisatie; saldo niet negatief. | Niet los verwijderen; alleen transactioneel wijzigen. |
| `CreditTransaction` | Append-only creditgrootboek. | Account/actorrelaties; bedrag niet nul, saldo niet negatief; datum/type/reference-indexen. | Nooit wijzigen/verwijderen; creditservice volgt later. |
