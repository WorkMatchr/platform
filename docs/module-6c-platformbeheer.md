# Module 6C — Platformbeheer

## Marketplacebeheer â€” aanvulling augustus 2026

Platformbeheer bevat bruikbare pagina's voor **Bedrijfsregels**, **Betrouwbaarheid**, providercredits en **Platformbeheerders**. Platformeigenaar en platformbeheerder mogen regels, creditmutaties en betrouwbaarheidsonderzoeken afhandelen; de platformauditor leest uitsluitend. Alleen de platformeigenaar beheert platformtoegang. Alle acties gebruiken services, verplichte redenen, bevestiging en append-only audit. Zie [Marketplace Rules, credits en betrouwbaarheid](marketplace-rules-credit-reliability.md).

## Status

Module 6C en Module 6C.1 zijn afgerond, gecommit en naar `origin/main` gepusht in commit `7812b2c`.

Module 6C.2 — WOS Beheeracties & Communicatie is technisch opgeleverd. De handmatige product-owneracceptatie staat open; er is nog geen commit of push voor 6C.2 uitgevoerd.

## Doel

Platformbeheer is de dagelijkse cockpit van WorkMatchr. Een platformbeheerder ziet binnen vijf seconden:

- hoe gezond het platform is;
- wat vandaag aandacht vraagt;
- welke risico’s en governanceblokkades bestaan;
- welke operationele trends betrouwbaar zichtbaar zijn;
- welke concrete vervolgactie wordt aanbevolen.

Het ontwerp volgt: **Minder scrollen. Meer overzicht. Sneller begrijpen.**

## Toegang

Toegang vereist gelijktijdig:

1. een actief account;
2. `PlatformRole.ADMIN`;
3. een actieve membership;
4. een actieve `PLATFORM_OPERATOR`-organisatie;
5. `systemKey = WORKMATCHR_PLATFORM`.

Alle controles vinden server-side plaats. Organisatierollen verlenen geen toegang. Reviewer-, approver- en auditorpermissions blijven afzonderlijk en worden niet door platformbeheer toegekend.

### Testaccountwisselaar voor acceptatie

In development en test kan een bevoegde platformbeheerder met `ENABLE_TEST_ACCOUNT_SWITCHER=true` bestaande actieve fictieve accounts selecteren. De wisselaar toont naam, organisatie en rol, vraagt expliciete bevestiging en gebruikt geen wachtwoord. De oorspronkelijke beheerder blijft auditactor; het gekozen account bepaalt tijdelijk alle effectieve pagina-, rol- en tenantrechten.

Een zichtbare banner blijft op iedere route staan en beëindigt de testmodus via een server-side stopactie. Productie, geneste wisselingen, echte e-maildomeinen, geblokkeerde of niet-geverifieerde accounts en onbevoegde gebruikers worden geweigerd. In de afzonderlijke M7X.1-testdatabase is de dataset wel aanwezig, maar de wisselaar kan pas worden gebruikt nadat die database ook een geldig actief platformbeheeraccount met `WORKMATCHR_PLATFORM`-membership bevat.

De wisselaar staat op het hoofddashboard in de platformbeheershell. Buiten productie ziet uitsluitend een reeds server-side bevoegde platformbeheerder een beperkte melding wanneer de lokale featureflag uitstaat of de accountquery veilig faalt. Een lege geldige doelgroep blijft zichtbaar als lege toestand; fouten worden niet stilzwijgend als een lege lijst gepresenteerd.

Platformbeheerroutes gebruiken een afzonderlijke compacte header en footer. Publieke navigatie, `Stel uw vraag`, organisatie-aanmaak en opdrachtgeveracties worden daar niet gerenderd. De footer bevat uitsluitend de beheeridentiteit, privacy en de aanduiding van de beveiligde beheeromgeving. De gewone tenantheader, tenantfooter en organisatieflow blijven buiten `/platformbeheer` ongewijzigd.

## Cockpithiërarchie

De dashboardvolgorde is bewust:

1. begroeting en actuele platformstatus;
2. **Actie vereist**;
3. maximaal vier kerncijfers;
4. operationele wachtrijen;
5. trends, uitsluitend bij voldoende geaggregeerde data;
6. platformgezondheid.

Acties staan vóór statistieken. Lege wachtrijen en ontbrekende cijfers worden niet als betekenisloze kaarten getoond. Status wordt altijd met tekst én visuele ondersteuning weergegeven.

## Uitlegbare advieslaag

De advieslaag is deterministisch, rule-based en los van de presentatie. Iedere regel heeft:

- een vaste regelcode en ernst: kritiek, hoog of normaal;
- een begrijpelijke uitleg;
- een concrete aanbevolen actie;
- een deeplink naar een bestaande beheerpagina;
- de bronwaarden waarop het signaal berust.

Sortering gebeurt reproduceerbaar op ernst, regelcode en stabiele recordidentificatie. De cockpit gebruikt geen generatieve AI, kansmodel of black-boxbesluitvorming. Dezelfde invoer en hetzelfde peilmoment leveren dezelfde signalen en volgorde op.

De eerste regelset signaleert onder meer:

- een actieve organisatie zonder actieve `OWNER`;
- een actief account zonder geldige tenant- of platformcontext;
- een opdracht die minimaal veertien dagen openstaat zonder reactie;
- lang wachtende reviews en approvals;
- verlopen uitnodigingen;
- geblokkeerde accounts;
- niet-selecteerbare dienstverleners door ontbrekende verificatie;
- opdrachten zonder geschikte kandidaten;
- mislukte notificatie-outboxitems;
- een ongeldige centrale platformconfiguratie.

## Navigatie

De zichtbare navigatie is taakgericht gegroepeerd:

- **Dagelijks beheer:** Dashboard, Organisaties, Gebruikers, Dienstverleners, Opdrachten;
- **Beoordelingen:** Reviews, Goedkeuringen, Audit;
- **Inzicht:** Marketplace, Trends, Rapportages;
- **Systeem:** Instellingen.

Technische actorbenamingen zoals Reviewer, Approver en Auditor zijn niet langer de primaire navigatielabels.

## Overige onderdelen

- organisaties met zoeken, filters, lifecycle, gebruikers, opdrachten en audit;
- gebruikers met organisatie-, rol-, account- en sessiecontext;
- dienstverleners met kwalificatie, readiness, selecteerbaarheid en Trusted Provider-status;
- opdrachten met status-, regio-, dienst-, sector- en ouderdomsinzicht;
- marketplace met credits, reserveringen, uitnodigingen, offertes en conversie;
- geaggregeerde trends zonder persoonsgegevens;
- rapportages met beveiligde CSV-export;
- read-only platforminstellingen.

## Mutaties en audit

Pagina’s schrijven nooit rechtstreeks naar Prisma. Organisatieblokkades verlopen via een serialiseerbare lifecycletransactie en schrijven een `AdminActionLog`. Accountblokkades hergebruiken de bestaande account-lifecycle met tenantcontrole, last-OWNER-bescherming, platformaccountbescherming, sessie-intrekking en append-only provisioninghistorie. Een reden is verplicht.

Accountverwijdering en systeemconfiguratiewijzigingen zijn niet toegevoegd.

## Module 6C.2 — WOS Beheeracties & Communicatie

Het centrale Actiecentrum volgt **Signaleren → Begrijpen → Handelen → Vastleggen → Opgelost**. De werkvoorraad wordt afgeleid uit bestaande WOS-signalen en bestaande review- en goedkeuringswachtrijen. Per item zijn ernst, categorie, bron, detectiedatum, aanbevolen actie, status, verantwoordelijke en deeplink zichtbaar.

Status en verantwoordelijke worden niet in een nieuw mutable taakmodel opgeslagen. Iedere wijziging schrijft een nieuw `AdminActionLog` met een deterministische UUID-verwijzing naar het bronsignaal. Afgeronde en gesloten items blijven auditbaar en verdwijnen uit de open werkvoorraad zolang hetzelfde signaal bestaat.

Beschikbare beheeracties:

- individuele gebruiker mailen en bestaande activatie-, verificatie- of wachtwoordherstelmail versturen;
- account blokkeren of deblokkeren via de bestaande account-lifecycle;
- organisatie of dienstverlener individueel mailen;
- organisatie blokkeren of deblokkeren via de bestaande organisatie-lifecycle;
- bij een organisatie zonder actieve eigenaar via de bestaande governance een actieve `ADMIN` of `MEMBER` als extra `OWNER` aanwijzen;
- opdrachtgever en iedere geselecteerde of uitgenodigde dienstverlener afzonderlijk mailen;
- een opdrachtsignaal met reden als onderzocht vastleggen;
- reviewer of approver met een actuele expliciete permission mailen;
- een interne, alleen voor platformbeheer zichtbare, append-only beheernotitie toevoegen.

Communicatie gebruikt de bestaande mailinfrastructuur. Alleen een door de mailprovider geaccepteerde verzending resulteert in succes. Geaccepteerde en mislukte pogingen worden geaudit met transportstatus en bericht-ID of foutcode; tokens, volledige links en berichtinhoud worden niet in auditmetadata opgeslagen.

Platformbeheer verleent geen reviewer- of approverpermission en voert geen dossierbesluit uit. De bestaande vier-ogenregel, tenantisolatie, lifecycletransacties en accountarchitectuur uit Module 6B blijven ongewijzigd.

## Privacy en rapportage

Rapportages bevatten alleen operationele aggregaten. CSV-responses zijn privé en niet cachebaar. WorkMatchr verzamelt in deze module geen zoektermen of volledige zoekgeschiedenis. De cockpit en trendspagina tonen daarom expliciet dat zoekgedrag nog niet beschikbaar is, totdat privacy-, cookie-, retentie- en meetbesluiten zijn goedgekeurd.

## Afgeronde acceptatie

- visuele controle op desktop, tablet, circa 390 pixels en 200% zoom;
- toetsenbord- en focuscontrole;
- signalen, wachtrijen en lege toestanden met representatieve productieachtige data;
- controle van deeplinks en bronwaarden;
- CSV-download en spreadsheetweergave;
- OWNER, ADMIN en MEMBER krijgen geen toegang;
- platformbeheerder zonder systeemmembership krijgt geen toegang;
- reviewer-, approver- en auditorgrenzen en vier-ogenregel;
- blokkeren en deblokkeren van organisatie en account, inclusief audit en sessie-intrekking.

## Bewust open vervolgwerk

- handmatige product-owneracceptatie van Module 6C.2;
- accountverwijdering vereist een afzonderlijke lifecyclefase;
- contentbeheer/KIP is niet gebouwd;
- verdere optimalisatie van de Advieswijzer blijft geparkeerd.
