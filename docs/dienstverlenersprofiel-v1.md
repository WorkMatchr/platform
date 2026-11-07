# Dienstverlenersprofiel v1

## Doel

Het Dienstverlenersprofiel is een gestructureerde beslissingspagina binnen een bestaande opdrachtrelatie. Het is geen openbare bedrijfspagina, bedrijvengids of vrij doorzoekbaar aanbiedersoverzicht. Een opdrachtgever krijgt uitsluitend server-side toegang wanneer de dienstverlener aantoonbaar voor diens eigen opdracht is geselecteerd en die selectie niet is verwijderd.

## Bronnen van waarheid

- `Organization` levert de organisatienaam, handelsnaam, het logo en de vestigingslocatie.
- `ProviderProfile` levert de korte introductie, organisatieomschrijving en werkwijze.
- `ProviderCapability` en de laatste revision leveren diensten, specialismen en uitvoeringsvormen.
- `ProviderProfileCoreExpertise` ordent maximaal drie specialismen die ook in een actieve capability voorkomen.
- `ProviderSectorExperience` en `ProviderWorkArea` blijven de bestaande bronnen voor sectorervaring en werkgebied.
- `ProviderProfileWorkMode` koppelt aanvullende werkvormen aan de centrale `WORK_MODE`-taxonomie.
- `ProviderOrganizationQualification` bewaart organisatiegebonden lidmaatschappen en registraties met bestaande revision- en verificatiegrondslag.
- `ProviderProfessionalQualification` blijft de bron voor persoonsgebonden kwalificaties en registraties.

Er is geen nieuwe profielstatus. Lifecycle, readiness, selecteerbaarheid, reviewstatus en Trusted Provider Projection blijven afzonderlijke bestaande begrippen. Het getoonde invulpercentage is uitsluitend een berekende UX-hulp en geen kwaliteitsscore, kwalificatie of selectiegrond.

## Taxonomie

De centrale providertaxonomie ondersteunt aanvullend `MEMBERSHIP`, `REGISTRATION` en `WORK_MODE`. Gepubliceerde versies en termen blijven immutable; gebruikte termen worden niet destructief verwijderd. Expertise hergebruikt `SPECIALISM`, diensten hergebruiken `SERVICE` en kwalificaties hergebruiken `QUALIFICATION` en `CERTIFICATION`.

`SERVICE` versie 2 bevat de brede dienstencatalogus voor RI&E, arbeidsveiligheid, verzuim en re-integratie, arbeidsdeskundig advies, eerste en tweede spoor, PMO, PAGO, bedrijfsarts, arbodienstverlening, ergonomie, arbeidshygiëne, machineveiligheid, incidentonderzoek, BHV en ontruiming en de bestaande algemene diensten. Versie 1 blijft behouden voor historische capabilityrevisies en wordt niet in-place gewijzigd.

## Informatiearchitectuur

Op desktop staat een compacte, zelfstandig scrollende organisatiekolom naast het inhoudelijke profiel. Op kleinere schermen en bij sterke vergroting staan beide onderdelen in de natuurlijke leesvolgorde onder elkaar. Administratieve organisatiegegevens worden via organisatiebeheer gewijzigd; korte introductie, omschrijving en werkwijze uitsluitend via het dienstverlenersprofiel. Lidmaatschappen en registraties hebben afzonderlijke invoer en presentatie.

De bestaande verzekerings- en verklaringsflows blijven afzonderlijke beschermde dossieronderdelen. Verzekeringsgegevens zijn nog een expliciete compliance-afhankelijkheid voor dossierbeoordeling en selecteerbaarheid. Verklaringen leggen onder meer platformvoorwaarden, privacy, gegevensjuistheid, bevoegdheid en wettelijke naleving vast. Zij zijn daarom niet verwijderd of samengevoegd met het algemene profiel.

## Verificatie

Nieuwe profielclaims starten altijd als `SELF_DECLARED`. Alleen een bestaand geldig verificatiebesluit kan leiden tot “Document gecontroleerd” of “Geverifieerd door WorkMatchr”. Afwijzing en verloop worden uit bestaande review- en geldigheidsgegevens afgeleid. De profielbeheerder kan zichzelf geen verificatiestatus toekennen.

## Autorisatie en privacy

- Eigenaar en beheerder beheren organisatieprofielgegevens; medewerker is read-only. De code blijft de bestaande rollen `OWNER`, `ADMIN` en `MEMBER` gebruiken.
- Iedere mutatie valideert gebruiker, membership, organisatie, tenant, profielversie en bewerkbare dossiersectie server-side.
- Opdrachtgeversinzage vereist een actieve membership bij de opdrachtgevende organisatie én een niet-verwijderde `AssignmentProviderSelection` voor exact dezelfde opdracht en dienstverlener.
- De beslissingspagina bevat geen persoonlijk e-mailadres, direct telefoonnummer, privéadres of zelfstandig contactpad.
- Er is geen publieke profielroute, vrije zoekfunctie, bedrijvengids of uitnodiging buiten de gecontroleerde matchingflow.

## B-173

Beschikbaarheid, capaciteit, vroegste startdatum en periodieke bevestiging zijn volledig uitgesloten. Historische capaciteitsmodellen ontvangen geen nieuwe profieldata en beïnvloeden profielvolledigheid, readiness, selecteerbaarheid, Trusted Provider Projection of matching niet. Planning wordt alleen bij een concrete reactie of offerte besproken.

Een afzonderlijke voorkeur “voor deze dienst wil ik opdrachten ontvangen” is niet toegevoegd. De huidige architectuur heeft daarvoor geen bestaande bron die losstaat van beschikbaarheid. Een toekomstig productbesluit moet eerst vastleggen of en hoe zo'n capabilityvoorkeur verenigbaar is met B-173.

## Sectoren en diensten (B4)

Op `/aanbiedersdossier/diensten-en-ervaring` kiest de organisatie meerdere sectoren en diensten. Per sector zijn ervaringsjaren optioneel. Per dienst kiest de beheerder één of meer leveringsvormen en desgewenst een specialisme. Voor een tweede specialisme bij dezelfde dienst kan een extra dienstregel worden toegevoegd. Bestaande bladwijzers voor diensten en sectorervaring openen de juiste sectie.

Een actieve professionele eigenaar of beheerder kan de bewerkbare dossieronderdelen samen opslaan. Een lid kan de actieve keuzes bekijken. De server controleert de actuele organisatie, rol, dossierstatus en profielversie. Een gelijktijdige wijziging geeft een conflict. De gebruiker kan het profiel opnieuw openen om de actuele keuzes te zien.

### Opslag en matching

- `ProviderSectorExperience` en `ProviderSectorExperienceRevision` bevatten de branches en ervaringsjaren.
- `ProviderCapability` en `ProviderCapabilityRevision` bevatten de dienst, het bijbehorende specialisme en de leveringsvormen. Een bestaand specialisme zonder dienst behoudt zijn record-ID wanneer er een dienst aan wordt gekoppeld.
- Eén transactie verwerkt de expliciete wijzigingen en reserveert eenmaal de profielversie. Uitvinken archiveert het record. Een gewijzigde claim krijgt een nieuwe zelfverklaarde revisie. Eerdere revisies, gekoppelde kwalificaties, competenties en geldigheid blijven bewaard. Opnieuw selecteren kan een gearchiveerd record herstellen.
- Bij gewijzigde brongegevens vervalt de actuele vertrouwde projectie via de bestaande dossierprocedure. Matching gebruikt de beoordeelde dienst voor selectie, sectorervaring voor sectorfit en de bestaande leverings- en werkgebiedregels voor onder meer werken op afstand.

### Dienstencatalogus op schema 85

Het formulier leest actieve termen van een gepubliceerde `ProviderTaxonomyVersion`. De historische migratie `20260802140000_expand_provider_service_taxonomy` slaat de aanvulling over als de taxonomie `SERVICE` ontbreekt. Hierdoor kan een gemigreerde database nul diensten aanbieden. De voor B4 benodigde tabellen en rechten voor dossierbeheer bestaan al op schema 85. Er is geen nieuwe migratie.

Gebruik met de geverifieerde doelverbinding `npx --no-install tsx scripts/ensure-provider-service-catalog.ts` voor de leescontrole. Bij `MISSING` kan een afzonderlijk bevoegde operator na expliciet akkoord hetzelfde commando met `--apply` uitvoeren. Dit maakt uitsluitend de taxonomie, gepubliceerde versie 2 en de 19 bestaande referentiediensten aan in één transactie. Bij een afwijkende bestaande catalogus stopt de procedure. Voer daarna de leescontrole opnieuw uit en verwacht `ALREADY_PRESENT`. De algemene seed heeft een ruimere scope.

### B4-acceptatie

De PostgreSQL-proef controleert de drie organisatierollen, een tweede organisatie, dossiervergrendeling, gelijktijdige wijzigingen, terugrollen van een gemengd onjuist verzoek, behoud van revisies en archiveren/herstellen. De lokale acceptatie gebruikt een tijdelijke PostgreSQL 18-database met de 85 gecontroleerde migratiechecksums. De browsertest controleert opslaan en heropenen, de profielweergave, oude bladwijzers en bediening met toetsenbord. Edge liet op desktop (1414 CSS-pixels), mobiel (390) en bij 200% browserzoom (707 bij dezelfde desktopvensterbreedte) geen horizontale overflow zien.
