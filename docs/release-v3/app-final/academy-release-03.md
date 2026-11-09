# Academy Release 03 — versiegebonden beheer op V3

Draft PR #125 bouwt op Academy-acceptatie `9a8fbdf2` en applicatiebasis `b79d8084`. De beheerbron is PR #100, `85e02741`. De cursuslijst en versiepagina combineren de bestaande editor met de deelnemersinzage van #125. De student behoudt de bestaande WL-001-route.

## Schema en historische gegevens

De twee oorspronkelijke ketens hebben 95 identieke migratiemappen (Git-tree inclusief SQL). Alle 96 migraties van V3 blijven intact, inclusief `20261106120000_repair_pro_financial_integrity`. Van de vijftien uitsluitend in de bron aanwezige migraties zijn drie SQL-bestanden ongewijzigd overgenomen. Twee nieuwe migraties vullen uitsluitend de benodigde beheervoorwaarden aan.

| Aanvulling | Gebruik |
| --- | --- |
| `20261024191000_add_academy_course_isolation` | Cursusgebonden kennisbehoud, relaties en append-only importbewijs per versie. |
| `20261024204000_allow_academy_certificate_numbers` | Cursusgebonden certificaatnummers naast de bestaande nummers. |
| `20261104220000_add_learning_certificate_designer` | Sjabloonrevisies, binding aan actief ontwerp en onveranderlijke uitgiftesnapshot. |
| `20261109180000_academy_editor_chapter_range` | Verruimt het toegestane hoofdstuknummer in de examenbank van 10 naar 100. |
| `20261109181000_academy_enrollment_access` | Twee nullable toegangsdatums voor bestaande media-autorisatie en veilige versieovergang. |

De twaalf niet overgenomen bronmigraties zijn `20261024190000_restore_exam_question_immutability`, `20261026100000_add_academy_commerce`, `20261026110000_allow_academy_sandbox_pricing`, `20261029100000_add_academy_pricing_promotions`, `20261029210000_restore_integrated_learning_question_policy`, `20261030120000_academy_legal_commercial_decisions`, `20261030140000_academy_seat_transfer_consideration`, `20261030160000_academy_legal_partial_refunds`, `20261030170000_academy_legal_credit_note_validation`, `20261030180000_academy_refund_seat_allocations`, `20261104180000_add_learning_authoring_media`, `20261104190000_allow_operator_certificate_review`. De gerichte CI-controles verwachten 101 migraties. De historische contactproef blijft exact 85 verwachten.

De upgrade op een eigen PostgreSQL 18 begon op schema 96 met een werkelijke synthetische inschrijving en uitgegeven certificaat. Voor en na de upgrade zijn rij-aantallen en geordende vingerafdrukken van alle voorheen aanwezige kolommen vergeleken. Ze waren gelijk voor 1 cursus, 1 versie, 10 hoofdstukken, 455 inhoudsblokken, 1 inschrijving, 10 voortgangsrecords, 3 examenpogingen, 100 antwoorden, 304 vragen, 1 certificaat, 1 auditrecord en 1 outboxrecord. Alle 96 oorspronkelijke migratieregistraties en checksums bleven behouden. De geïntegreerde renderer produceerde voor het historische certificaat exact dezelfde PDF-bytes als de renderer van de V3-basis. Ook na conceptimport en nieuwe sjabloonbinding bleven certificaat en verificatie gelijk.

## Cursussen en publicatie

| Concept | Geraamde duur inclusief toets | Beheeracceptatie |
| --- | ---: | --- |
| WL-001 RI&E in de praktijk 1.2 | 300 min | Ongewijzigd bronbestand, als eigen versie naast de historische studentroute. |
| WL-002 Preventiemedewerker in de praktijk 1.3 | 295 min | Ongewijzigd bronbestand, geïmporteerd en heropend als concept. |
| WL-003 Veilig en gezond werken 1.1 | 288 min | Ongewijzigd bronbestand, geïmporteerd en heropend als concept. |

Herimport van dezelfde inhoud behoudt één versie en één importbewijs. Nieuwe bundelinhoud krijgt een eigen revisie. De verschillende teksten van de oude en nieuwe WL-001 blijven aan de juiste versie gebonden. De bestaande titel, adresnaam en historische catalogusgegevens worden bij bundelimport gecontroleerd. Gelijktijdige conceptbewerkingen hebben één winnaar. De andere editor moet opnieuw laden. Menselijke review en inhoudelijke goedkeuring zijn afzonderlijke versieovergangen.

De examenservice van V3 bedient WL-001 `prototype-0.17`. De publicatieactie controleert dezelfde runtime-identiteit. Andere versies blijven veilig als concept of intern goedgekeurd bewaard tot hun studententoets en de overgang van bestaande inschrijvingen afzonderlijk zijn geaccepteerd. De cursist kan zijn bestaande cursus blijven vervolgen. Een representatieve cursistenpilot moet de drie tijdsramingen nog bevestigen.

## Beheer en bevoegdheden

Platformbeheer → Academy → Cursussen biedt de compacte editor, de volledige bundelbewerking, deelnemers, hoofdstukvoortgang en toetsresultaten. De certificaatlijst biedt zoeken, detail, geauditeerde PDF-inzage en verificatie. Het sjabloonbeheer biedt concept, review, activering en binding voor toekomstige uitgiften. De bestaande autorisaties worden opnieuw gecontroleerd bij gegevensgebruik. Een platform-MEMBER en de eigenaar van een andere organisatie kunnen de beheerroutes niet openen.

Voor externe media is een werkende private opslagbinding in het betreffende doelmilieu vereist. De lokale proeven gebruiken synthetische accounts en sluiten uitgaande browserrequests naar andere hosts af. Financiële verwerking, Marketplace-services, providerinstellingen en gates vallen buiten deze integratie.

## Acceptatie

De PostgreSQL-suite `src/lib/learning/academy-release03.integration.test.ts` controleert het volledige migratiemanifest, een lokale non-ownerrol zonder DDL, rolweigeringen, de drie herhaalbare imports, afwijzing van verouderde revisies, gelijktijdig schrijven, de publicatieblokkades en behoud van het uitgegeven certificaat. Dezelfde suite is opgenomen in de bestaande PostgreSQL 18-workflow.

De lokale upgradeproef slaagde voor alle drie bundels, de foutpaden en de historische PDF. De beheerder importeerde en heropende alle drie via de browser, maakte een extra synthetische cursus met les en toetsvraag, wijzigde de les en vond de wijziging na herladen terug. Dezelfde beheerder opende voortgang, geslaagde en gezakte toetsresultaten, de certificaatverificatie, de sjabloonontwerper en de PDF van een historisch certificaat. De geauthenticeerde PDF-opvraag gaf HTTP 200 en een auditregistratie. Certificaat en verificatie bleven geldig bij een gewijzigde accountnaam en sessievernieuwing.

**Vrijgavegrens voor afbeeldingen.** Een proef met een ontwerpsnapshot die verwijst naar een in een andere omgeving opgeslagen logo gaf bij het downloaden terecht geen PDF. Inhoudsgeadresseerde bestanden moeten in hetzelfde vrijgegeven opslagbereik beschikbaar blijven voor de volledige levensduur van het certificaat. Een tekst-/QR-ontwerp heeft deze externe assetafhankelijkheid niet. Acceptatie van het echte doelmilieu vereist een uitgifte- en herdownloadproef met de gekozen private opslag en een eigen goedgekeurd ontwerp.
