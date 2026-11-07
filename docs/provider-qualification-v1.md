# Providerkwalificatie v1

## Bronnen en uitkomst

Zelfverklaarde feiten, verificatie, platformkwalificatie, capabilitykwalificatie, readiness, selecteerbaarheid en Trusted Provider Projection blijven afzonderlijk. Positieve besluiten vereisen actuele configuratie, vier ogen en geldige bronversies. Verlopen kwalificaties vallen buiten de geldige basis en maken de provider fail-closed niet-selecteerbaar voor de betreffende dienst.

De selectielaag leest alleen een actuele, niet-geïnvalideerde `TrustedProviderProjection`. Deze bevat gecontroleerde capabilities, sectoren en werkgebieden, maar geen persoonsgegevens, bewijsbytes, marketingtekst, credits, betaling, capaciteit of historische prestaties.

Voor M7B.2 bevat een capability naast de dienst waar beschikbaar de
concrete vakdiscipline als `specialismCode`. De SPECIALISM-taxonomie v2
voegt `ergonoom`, `arbeids-en-organisatiedeskundige`, `asbest` en
`milieudeskundige` toe. Zelfverklaarde profieltekst of een functietitel
levert nooit automatisch een projectie of eligibility op.

## Dienstbesluiten en eigendom

Elk besluit over een dienst controleert in dezelfde serialiseerbare transactie of die dienst bij het beoordeelde profiel hoort. Een ontbrekende of vreemde dienst geeft dezelfde afwijzing vóór het opslaan van het besluit, het verhogen van de profielversie en het intrekken van de projectie. Kwalificatie en herstel vereisen een actieve dienst met de bestaande inhoudelijke bewijsbasis. Een negatief besluit over een eigen gearchiveerde dienst blijft mogelijk en maakt die dienst nooit actief.

De bestaande afzonderlijke foreign keys controleren of beide records bestaan. Een samengestelde foreign key zou ook toekomstige rechtstreekse database-invoer kunnen beschermen. Dat vraagt een unieke samengestelde sleutel, controle van historische koppelingen en een afzonderlijke migratie. Deze servicereparatie werkt op de bestaande 85 migraties.

## Ingangsdatum, schorsing en herstel

Selecteerbaarheid en projectieopbouw lezen de volledige besluithistorie voor de platformkwalificatie en voor iedere actieve dienst. De ingangsdatum bepaalt welk besluit geldt. Op de einddatum vervalt een positief besluit direct. Een ouder positief besluit wordt dan niet opnieuw geldig. Twee besluiten met dezelfde ingangsdatum geven geen betrouwbare volgorde. De dienst blijft in dat geval geblokkeerd.

Een schorsing blijft ook na herberekening of het verstrijken van de eigen einddatum blokkerend. Een afzonderlijk, later herstelbesluit vereist de bestaande bevoegde reviewer, een onafhankelijke approver, een geldige inhoudelijke basis en de verwachte profielversie. De bronchecksum van een nieuw herstelbesluit omvat ook de identiteit van het voorafgaande besluit. De historie blijft append-only.

Selecteerbaarheid vereist kwalificatie voor **alle actieve diensten**. Bij één geschorste dienst wordt het hele profiel tijdelijk niet selecteerbaar. Een nieuwe projectie vereist actuele positieve assessments van dezelfde profielversie en eindigt uiterlijk bij de eerstvolgende bekende wijziging of vervaldatum. Een bronwijziging trekt de uitstaande projecties voor dat profiel transactioneel in. Selectie, uitnodiging, offerte en nieuwe gunning controleren bij gebruik ook de actuele besluitstatus en de projectie waarop de selectie berust.

De bestaande overgangsregeling blijft gelden voor teamleden die buiten de B4-onboarding vallen. De vier nieuwe dossiervereisten worden voor hen niet alsnog afgedwongen. Een geregistreerde schorsing, verlopen besluit of verouderde projectie blokkeert wel een nieuwe deelname. Factuur- en accountbeheer, het afwijzen van een uitnodiging en het intrekken van deelname houden hun eigen autorisatie.

De lokale PostgreSQL-regressie staat in `scripts/verify-provider-qualification.ts` en loopt via `scripts/test-provider-offering-database.ts`. De proef gebruikt synthetische organisaties, functiescheiding en echte servicetransacties. Onafhankelijke readiness-voorwaarden zijn als testgegeven vastgelegd. Dossiergoedkeuring en de beheerinterface voor kwalificatie hebben een afzonderlijke acceptatie.
