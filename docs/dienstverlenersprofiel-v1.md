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
