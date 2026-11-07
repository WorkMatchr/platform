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

### Verplichte profielafronding bij nieuwe aanmeldingen

Een professional zonder organisatie krijgt na aanmelden de organisatiestap. Na het aanmaken opent het dossier. Bij volgende aanmeldingen toont het dashboard per onderdeel de status en waar ontbrekende gegevens kunnen worden aangevuld. Het bestaande volledigheidsmodel controleert negen onderdelen. Dienstverlening vraagt om ten minste één dienst met een leveringsvorm. Specialismen zijn optioneel. Beschikbaarheid telt volgens B-173 niet mee.

Een volledig dossier kan worden ingediend. Voor nieuwe deelnemers controleert de server bij deelname daarnaast de actuele kwalificatie, readiness, selecteerbaarheid, blokkades en een geldige trusted projection van dezelfde profielversie. Dezelfde grens geldt bij automatische en handmatige selectie, interesse, offerteruimte, uitnodigingen aannemen, offertes opstellen of indienen en berichten versturen binnen een deelname. Een verlopen beoordeling of gewijzigde profielversie kan een eerdere toelating niet dragen. Facturen, credits, abonnement, account en uitloggen behouden hun eigen autorisatie.

**Overgang voor bestaande organisaties.** De registratie van een nieuwe dienstverlenende organisatie legt de toepasselijke regel vast in het bestaande onveranderlijke provisioningevent, atomair met de organisatie en het lidmaatschap. Voor een nieuwe professional die bij een bestaande organisatie wordt uitgenodigd geldt de regel individueel. Bestaande teamleden en de organisatie als matchingkandidaat behouden hun eerdere toelatingsregels. Een herhaalde uitnodiging wijzigt het oorspronkelijke event niet. De checklist is ook voor bestaande accounts beschikbaar.

Voor invoering moeten alle actieve registratieroutes de nieuwe code gebruiken, inclusief eventuele externe imports. Maak voor een latere overgang van bestaande organisaties eerst een alleen-lezen overzicht van ontbrekende onderdelen en lopende deelnames. Informeer de betrokken beheerders, spreek een aanvultermijn en ondersteuning af en controleer vlak voor overgang de actuele status. Een expliciet Product Owner-besluit is vereist voor uitbreiding van de handhaving naar bestaande accounts. Deze wijziging bevat geen backfill.

**Vrijgavevoorwaarden.** Controleer de dienstencatalogus, de actuele verplichte verklaringen en een operationeel, afgeschermd proces voor aanleveren en controleren van verzekeringsbewijs. Zonder verklaringen of schoon bewijs blijft een nieuw dossier openstaan. Laat een beheerder vóór vrijgave de bestaande beoordelingsprocedure doorlopen tot een actuele trusted projection is afgegeven. De technische uitbreiding gebruikt de provisioningevents, dossier- en beoordelingstabellen van schema 85.

**Acceptatie op schema 85.** Op de geïsoleerde PostgreSQL-database zijn de nieuwe organisatie, het toepasselijke beleid voor een uitgenodigde professional, tenantisolatie, de negen benodigde onderdelen en toegang met een actuele goedkeuring gecontroleerd. De technische proef gebruikt synthetisch bewijs en vooraf ingerichte beoordelingsrecords. Ook na een profielwijziging en bij rechtstreeks aangeroepen deelname- en offertediensten bleef de grens afdwingbaar.

De browserproef gebruikte de echte registratie- en verificatiehandler met gesimuleerde mail- en wachtwoordcontrolediensten. In Edge zijn vervolgens inloggen, organisatie aanmaken, de checklist, de link naar diensten, drie directe Marketplace-routes, een directe deelnameactie, account, credits, Pro-beheer en uitloggen doorlopen. De deelnameactie stuurde de ingelogde gebruiker terug naar het dossier. De checklist bleef binnen de viewport op desktop (1414 CSS-pixels), mobiel (390) en bij 200% browserzoom (707). Toetsenbordfocus bleef zichtbaar. De geautomatiseerde WCAG A/AA-controle van de checklist meldde op alle drie nul overtredingen.

## B4 vereenvoudiging — besluit van Product Owner (7 november 2026)

- **Mijn dienstverlening** is één formulier met sectoren, diensten, specialismen, leveringsvormen en werkgebied; één opslagactie en één seriële transactie.
- Organisatiegegevens staan onder **Bedrijfsgegevens**. De compacte organisatie-identiteit staat links naast de dossiernavigatie en is niet meer als tweede bedrijfskaart in het dienstverlenersprofiel opgenomen.
- Het beheren van individuele professionals en kwalificaties is niet verplicht voor de nieuwe Marketplace-onboarding. Bestaande gegevens en routes worden niet verwijderd, maar verdwijnen uit de standaardnavigatie. Organisatiegebruikers blijven te beheren via organisatiebeheer.
- Verzekeringen, bewijsstukken en afzonderlijke verklaringen zijn **geen verplichte onboardingstappen voor nieuwe deelnemers**. Accountregistratie en toepasselijke platformvoorwaarden blijven een afzonderlijk proces.
- De nieuwe onboardingcontrole **PROVIDER-COMPLETENESS-B4-2** vereist uitsluitend organisatiegegevens, minimaal één dienst met leveringsvorm, minimaal één sector en een werkgebied. De bestaande afzonderlijke profielbeoordeling en de actuele vertrouwde projectie blijven relevant voor Marketplace-toegang.
- Legacy-organisaties behouden voorlopig hun oorspronkelijke dossierpolicy, zodat bestaande beoordelingen en toegangsrechten niet onverwacht veranderen. Hun overgang vereist een afzonderlijk besluit en acceptatieproef.
- Productie blijft **NO-GO** tot de gecombineerde B4-code en de vereenvoudigde beoordelingsketen volledig zijn geaccepteerd. Er worden geen bestaande profielrecords of historische beoordelingen automatisch aangepast.
