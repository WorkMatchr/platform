# QUAL-UX-01 — Beoordelaarsverificatie

**Historische proef.** Het latere besluit en de acceptatie van de vier verplichte matchingonderdelen staan in de [V3.0-standaardtoelating](onboarding-v3.md).

**NO-GO voor de volledige browserroute van een nieuwe professional.** De toegewezen beoordelaar kan verificaties vastleggen en de tweede beheerder kan het dossier goedkeuren. De volgende blokkade is het verzekeringsbewijs. De professional kan via de huidige interface geen bewijsbestand aanleveren. Zonder een gecontroleerd bewijsbestand kan de professional geen polis toevoegen en weigert de kwalificatieservice het platformbesluit.

De basis was [de UX-acceptatie op 6211cde](https://github.com/WorkMatchr/platform/commit/6211cdef399e11f5a1148f2576ea402c4719d43a). Alle onderstaande handelingen gebruikten tijdelijke lokale PostgreSQL 18-databases, fictieve accounts en lokale mailopvang.

## Reparatie

De schrijffunctie voor verificaties was niet bereikbaar vanuit beheer. Alleen een formulier aansluiten zou bovendien de goedkeuring ongeldig maken. Iedere verificatie verhoogt namelijk de profielversie en de eerdere controle kon het verschil uitsluitend aan kwalificatiebesluiten toeschrijven.

De nieuwe actie gebruikt de bestaande verificatieservice en de bestaande relaties tussen verificatie, beoordelingszaak, kandidaat en indiening. Alleen de toegewezen beoordelaar met een geldige bevoegdheid kan in de open zaak een onderdeel van de actuele momentopname verifiëren. De interface toont de gegevens van de ingediende revisie, het oordeel en de geldigheid. Bij beschikbaar bewijs toont zij de vastgelegde bestandsmetadata. Zij biedt geen download van onbeheerde bestanden aan.

De service schrijft de verificatie, versieaanpassing en het auditbewijs met beoordelaar en onderbouwing in één transactie. De controle vergelijkt ook de actuele dossierinhoud met de checksum van de indiening. Een gebonden verificatie verklaart precies één versieverhoging. Een wijziging door de professional of een andere organisatie kan daarvoor niet doorgaan.

De goedkeurder ziet de verificaties en legt het afzonderlijke kwalificatiebesluit vast. Een positief besluit op een ingediend dossier vereist geldige verificatie van dezelfde beoordelaar voor die kandidaat. Bij een dienst wordt de actuele dienstrevisie gecontroleerd. Een later negatief oordeel of een verlopen verificatie kan niet als positieve basis dienen. Een besluit mag de einddatum van de onderliggende, vereiste verificatie niet overschrijden. De bestaande voorwaarden voor verklaringen, verzekering, dienstbewijzen en schorsing blijven van toepassing.

## Browseracceptatie

| Stap met dezelfde nieuwe professional | Uitslag | Waarneming |
|---|---|---|
| Registreren, e-mailadres verifiëren, inloggen en organisatie aanmaken | PASS | Nieuw account via browser en lokale verificatiemail. |
| Vier matchingonderdelen invullen | PASS | Bedrijfsgegevens, diensten, sectoren en werkgebied ingevuld. Dienstkeuzes bleven na herladen aanwezig. |
| Verklaringen en dossier | PASS | De professional accepteerde zes synthetische verklaringen in de browser en diende het dossier in. |
| Verzekeringsbewijs aanleveren | **BLOCKED** | Het verzekeringsscherm meldt dat uploaden nog niet beschikbaar is. Zonder gecontroleerd bewijs verschijnt het formulier voor een polis niet. [Scherm van de professional](verzekering-geblokkeerd.png) |
| Verificatie door toegewezen beoordelaar | PASS | Vijf ingediende revisies van diensten, sectoren en werkgebied afzonderlijk geverifieerd. Een verlopen einddatum werd eerst geweigerd. De professional had geen toegang tot de verificatieformulieren. Geen vooraf aangemaakte beoordelaarsverificaties. [Desktop](verificaties-desktop.png) · [Mobiel](verificatie-mobiel.png) |
| Onafhankelijke goedkeurder | PASS | Een tweede testbeheerder zag de verificaties en keurde het ingediende dossier goed. |
| Platformkwalificatie | **BLOCKED, controle werkt** | De positieve aanvraag werd geweigerd wegens onvolledige onderbouwing. Er werd geen kwalificatiebesluit toegevoegd. [Uitkomst](kwalificatie-geweigerd.png) |
| Gekwalificeerde diensten, uitnodiging, creditbesteding, offerte en gunning | **BLOCKED voor dit account** | De uitnodigingsroute blijft gesloten. Het eerdere positieve bewijs met voorbereide gegevens staat in het [oorspronkelijke dossier](README.md). Dat bewijs telt niet als acceptatie van deze nieuwe keten. |

## Technische controles

- 290 gerichte Vitest-tests in 44 bestanden geslaagd.
- PostgreSQL bevestigde dat een onbevoegde professional, verkeerde kandidaat, verlopen einddatum en verouderde profielversie worden geweigerd. Van twee gelijktijdige verificatieverzoeken leverde één verzoek een verificatie en één auditregistratie op.
- De B4-FIX-00A/00B-proeven weigerden alle zes besluiten op de dienst van een andere organisatie en accepteerden de zes bevoegde besluiten. Ze controleerden ook organisatie- en dienstschorsing, directe toegang, verouderde projecties en concurrerende herberekeningen.
- De afzonderlijke Marketplace-databasetest controleerde credits, offertes, gunning, audit, historie en notificaties.
- De standaard productiebuild gebruikt de TypeScript-controle van Next.js. Lint heeft vier bestaande waarschuwingen in authenticatiecomponenten.

## Vrijgavevoorwaarde

Voor de zelfstandige route is een beveiligde aanlever- en inzageroute voor bewijsstukken nodig. Koppel de upload aan private opslag, daadwerkelijke bestandscontrole, geautoriseerde inzage en het vastgestelde bewaarbeleid. Daarna kan met één nieuw dossier ook de kwalificatie en de daaropvolgende Marketplace-route opnieuw via de browser worden bewezen. Het project benoemt deze afhankelijkheden in het [onboardingontwerp](../../module-6a3-provider-onboarding-ux-ontwerp.md).
