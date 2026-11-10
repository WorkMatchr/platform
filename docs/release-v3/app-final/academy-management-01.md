# Opleidingen beheren in WorkMatchr Academy

## Bestaand en toegevoegd

| Bestaand beheer | Toegevoegd op de afzonderlijke werktak |
| --- | --- |
| Cursuscatalogus, editor, bundelimport en versiehistorie | Nieuwe opleiding rechtstreeks openen, onvolledige concepten bewaren en schermopleidingen naar een afzonderlijke versie kopiëren |
| Volgorde van hoofdstukken en lessen, tekst en afbeeldingen | Leerdoelen per les en vraag, praktijkopdrachten, voorbeelden, samenvattingen en tabellen |
| Oefenvragen, eindvragen, toelichting, instelbare cesuur en poginglimiet | Waar/onwaar invoeren en de eindvraagvolgorde veranderen |
| Beoordeling, certificaatontwerper, PDF en verificatie | Aangewezen beoordelaar, juridische referentie, prijscontrole en expliciete keuze van het sjabloon per versie |
| Persoonlijke codes en betaalde pilot voor de drie bestaande opleidingen | Conceptprijzen, actieprijzen en een geblokkeerde persoonlijke kortingscode voor een nieuwe cursusversie |
| Deelnemers, hoofdstukvoortgang, uitslagen en studieduurmeting voor pilotdeelnemers | Geaggregeerd versierapport en CSV met toegang voor bevoegde beheerders |

## Een opleiding maken

1. Open **Platformbeheer → Academy → Cursussen → Nieuwe opleiding**. Vul de unieke cursuscode, adresnaam, titel en versie in. Met **Concept opslaan** kunt u later verdergaan.
2. Vul de korte en uitgebreide omschrijving, doelgroep, voorkennis, leerdoelen, categorie en niveau in. Geef per hoofdstuk de geschatte lesduur op en vul de toetsduur apart in. De editor telt ze op.
3. Voeg hoofdstukken en lessen toe. Verplaats ze met **omhoog** en **omlaag**. Kies tekst, afbeelding, tabel, praktijkvoorbeeld, praktijkopdracht of samenvatting. Bij een tabel vormt de eerste regel de kolomkoppen en scheidt u de cellen met een verticale streep. Geef afbeeldingen een tekstalternatief.
4. Maak voor elk hoofdstuk een oefenvraag. Voeg onder **Eindtoets** de vragen in de gewenste volgorde toe. Markeer de juiste antwoorden, geef uitleg en koppel waar van toepassing het leerdoel. Bij **Waar/onwaar instellen** controleert u welke van beide antwoorden juist is. Het aantal ingevoerde eindvragen bepaalt de toetslengte. Vul het vereiste aantal goede antwoorden en het maximum aantal pogingen in.
5. Vul de consumentenprijs in euro in, eventueel ook een lagere actieprijs. Kies het standaardcertificaat met verificatiecode of het aan deze cursus gekoppelde actieve ontwerp. Het sjabloonbeheer biedt de bestaande ontwerper en voorvertoning.
6. Gebruik **Preview bekijken**, controleer de lessen en sla de versie op. Vul het e-mailadres van de bevoegde inhoudelijke beoordelaar in. Kies **Review** met een onderbouwing. Bij **Goedgekeurd** controleert het systeem diens ingelogde identiteit. Bij vereiste juridische beoordeling legt de beoordelaar de referentie naar het daadwerkelijke akkoord vast.
7. In de geïsoleerde proefomgeving kan een bevoegde beheerder een beoordeelde opleiding uitproberen met **Vrijgeven in lokale proefomgeving**. De proef werkt uitsluitend met geverifieerde synthetische accounts. De bestaande betaalde pilot voor WL-001 t/m WL-003 heeft eigen toegangs- en betaalvoorwaarden.
8. Open de versie om deelnemers, hoofdstukvoortgang, toetsresultaten en certificaten te bekijken. Onder **Cursusrapport** kunt u de totalen als CSV downloaden. Alleen complete duurmetingen tellen mee voor gemiddelde en mediaan. Het rapport toont het aantal ontbrekende metingen. Een ingetrokken toegang vóór afronding is afzonderlijk zichtbaar. Langdurige inactiviteit bewijst op zichzelf geen uitval.

## Prijs, kortingscode en historie

De conceptprijs en actieprijs horen bij de cursusversie. **Persoonlijke kortingscode voorbereiden** legt voor één bestaand, geverifieerd account een percentage en vervaldatum vast. De code geldt voor één inschrijving op die versie. Voor nieuwe opleidingen blijft de code geblokkeerd voor verkoop. Het cursusrapport gebruikt uitgegeven facturen en gekoppelde creditnota’s voor bedragen in eurocent.

Gebruik **Versie kopiëren** bij een schermopleiding. Kies een ongebruikte versienaam. Bij een geïmporteerde bundel gebruikt u **Nieuwe conceptversie voorbereiden** en de bestaande bundelimport. Elke inschrijving, toetspoging en afgegeven certificaat blijft gekoppeld aan de oorspronkelijke versie. Een conceptwijziging verleent geen nieuwe cursusrechten.

## Grenzen voor vrijgave

De financiële integratiebasis is `b7420456e682ee30dbe39b6a03dd4be2c8bc192c`. Algemene betaalde inschrijving en verzilvering voor nieuwe versies vereisen een afzonderlijke, geaccepteerde aansluiting op de financiële diensten. De bestaande R07-pilot blijft begrensd. De prijs op een nieuw concept activeert geen verkoop. Het certificaat bevestigt cursusafronding. Een wettelijke beroepsbevoegdheid vereist een afzonderlijke grondslag.

De vraag naar video botst met het bestaande Academy-besluit voor tekst en afbeeldingen. De automatische goedkeuringscontrole heeft de wijziging voor video-opslag en videoweergave geweigerd. Hiervoor is een expliciet vervangend besluit over video nodig.

## Acceptatie met WL-004

De beheerder opende de editor vanuit het dashboard, bewaarde een onvolledig concept, voegde twee hoofdstukken en twee eindvragen toe en heropende de bewerkingen. Vier opslaghandelingen leverden vier auditregistraties op. Versie 1.1 werd als afzonderlijk concept opgeslagen. Versie 1.0 ging via review en goedkeuring naar de lokale proefomgeving. De beheerder stelde een consumentenprijs van €25 en het standaardsjabloon in. De proef gebruikte desktop en tablet, met een expliciete controle op horizontale overflow op de tablet.

Een nieuw geregistreerde synthetische cursist doorliep beide hoofdstukken, slaagde, downloadde de PDF en kon het certificaat vanuit een afzonderlijke anonieme browser verifiëren. Het beheerrapport en de gedownloade CSV gaven één geslaagde cursist aan. De cursist kreeg geen toegang tot de beheerexport. De persoonlijke code had 25% korting, één gebruik en de status geblokkeerd. Het aantal financiële aankopen voor het testaccount bleef nul. De tijdelijke acceptatiedatabase is opgeruimd.

| Controle | Uitkomst |
| --- | --- |
| Gerichte tests | 55 geslaagd, 0 mislukt |
| PostgreSQL 18 | 103 migraties op lege lokale testdatabase. Historische examenproef 1/1 en Academy-integratie 6 geslaagd, 3 overgeslagen. De drie tests vereisen specifiek de persoonlijke of betaalde R07-pilotmodus. |
| TypeScript en productiebuild | Geslaagd. Drie bekende waarschuwingen over bestandstracering buiten de editor. |
| Lint | 0 fouten en 4 bestaande waarschuwingen. |
| Wijzigingsbereik | Geen wijziging aan cursusbundels, bestaande migraties, Marketplace of financiële verwerking. |

[Beheer op tablet](academy-management-01/WL004-beheer-tablet.png) · [Voorvertoning op desktop](academy-management-01/WL004-voorvertoning.png) · [Cursusrapport](academy-management-01/WL004-rapport.png) · [Anonieme certificaatverificatie](academy-management-01/WL004-certificaat.png)

## Gewijzigde bestanden

| Onderdeel | Bestanden |
| --- | --- |
| Beheer en versiegebonden gegevens | `src/lib/learning/academy-authoring-contract.ts`, `src/lib/learning/academy-authoring-service.ts`, `src/components/learning/academy-course-editor.tsx`, `src/components/learning/academy-course-review.tsx` |
| Beheerpagina’s en acties | `src/app/platformbeheer/academy/cursussen/page.tsx`, `src/app/platformbeheer/academy/cursussen/[versionId]/page.tsx`, `src/app/platformbeheer/academy/cursussen/actions.ts` |
| Persoonlijke kortingscode | `src/components/learning/course-discount-form.tsx`, `src/app/platformbeheer/academy/cursussen/personal-discount.ts` |
| Rapport en export | `src/lib/learning/academy-course-results.ts`, `src/app/platformbeheer/academy/cursussen/[versionId]/rapport/route.ts` |
| Cursist en certificaatkeuze | `src/app/e-learnings/actions.ts`, `src/components/learning/lesson-player.tsx`, `src/lib/learning/certificate-design-issue.ts`, `src/lib/learning/learning-certificate-service.ts` |
| Acceptatie | `src/lib/learning/academy-authoring-contract.test.ts`, `scripts/acceptance/academy-students/run.py`, `scripts/acceptance/academy-students/student.mjs`, `scripts/acceptance/academy-students/administration.mjs` |
| Documentatie | `docs/README.md`, `docs/release-v3/app-final/academy-management-01.md` |
