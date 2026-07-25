# Module 6C — Platformbeheer

## Status

Technisch uitgevoerd. Product-owneracceptatie staat open.

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

## Privacy en rapportage

Rapportages bevatten alleen operationele aggregaten. CSV-responses zijn privé en niet cachebaar. WorkMatchr verzamelt in deze module geen zoektermen of volledige zoekgeschiedenis. De cockpit en trendspagina tonen daarom expliciet dat zoekgedrag nog niet beschikbaar is, totdat privacy-, cookie-, retentie- en meetbesluiten zijn goedgekeurd.

## Openstaande acceptatie

- visuele controle op desktop, tablet, circa 390 pixels en 200% zoom;
- toetsenbord- en focuscontrole;
- signalen, wachtrijen en lege toestanden met representatieve productieachtige data;
- controle van deeplinks en bronwaarden;
- CSV-download en spreadsheetweergave;
- OWNER, ADMIN en MEMBER krijgen geen toegang;
- platformbeheerder zonder systeemmembership krijgt geen toegang;
- reviewer-, approver- en auditorgrenzen en vier-ogenregel;
- blokkeren en deblokkeren van organisatie en account, inclusief audit en sessie-intrekking.
