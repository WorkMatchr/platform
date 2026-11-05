# Platformbeheer v0.2 — vergelijking

## Final Admin Acceptance PR #91 — 5 november 2026

Deze hercontrole geldt voor head `e4352e4cab9b0defbaef84e7d31a85a62744be69`.
Na fetch is main `a315db8c7738b8862a92d9f8517b0315e3b14d1f`: nul commits
achter, twee voor. Deze actuele resultaten gaan vóór de historische notities
hieronder. Geen aangetoond code- of autorisatiedefect gewijzigd; uitsluitend dit verslag.

### Werkelijke browseracceptatie

Een afzonderlijke Edge-testsessie gebruikte een nieuwe lokale PostgreSQL 18-
database met uitsluitend synthetische accounts en een tijdelijk credential.
Contactmail, F4, Learning en de testaccountwisselaar bleven uit.
Geen productie-/Preview-verbinding of provideractie.

| Controle | Resultaat deze uitvoering | Bewijs / beperking |
| --- | --- | --- |
| OWNER inloggen | PASS | Echt inlogformulier, redirect naar /platformbeheer; één sessie in de tijdelijke database. |
| OWNER Academy / header | PASS voor DOM-controle | Zes rubrieken met ‘Nog niet beschikbaar’, geen Academy-links; vergelijkingslink ontbreekt, Account en Uitloggen aanwezig. |
| OWNER Account openen | BLOCKED | Niet uitgevoerd vóór stop van de browserbediening. |
| OWNER uitloggen, intrekking en beveiligde pagina opnieuw bezoeken | BLOCKED | Browserlogout niet uitgevoerd. Eén sessie over bij onderbreking; geen geslaagde intrekking geclaimd. |
| ADMIN inloggen en zes rubrieken | BLOCKED | Synthetisch account gereed, browserflow niet uitgevoerd. |
| MEMBER inloggen en uitsluitend auditnavigatie | BLOCKED | Synthetisch account gereed, browserflow niet uitgevoerd. |
| Afgeschermde routes via ingelogde browser | BLOCKED | Serverautorisatie apart getest; geen vervanging van de browserproef. |
| Desktop, mobiel en horizontale overflow | BLOCKED | Geen nieuwe volledige visuele controle. Eerdere viewportmetingen blijven historisch bewijs. |
| Toetsenbord, zichtbare focus, geen dubbele logout | BLOCKED | Componentregressies slagen; actuele native interactiecontrole niet afgerond. |
| Echte 200% browserzoom | BLOCKED | Geen zoomactie of nieuwe menselijke acceptatie voor deze uitvoering. Acceptatie van andere PR's telt niet voor #91. |

De eerste browserstart binnen de afgeschermde toolruntime kon Edge niet starten;
het expliciete Edge-pad gaf een beëindigde pipe. Een eigen lokale Edge-testsessie
buiten die runtime startte wel. CDP vanuit de toolruntime gaf EACCES op loopback;
de geautoriseerde lokale harness kon dezelfde eigen browser wel bereiken en de
OWNER-login uitvoeren.

Bij het bekijken van dat testvenster beëindigde Windows Computer Use de bediening:
“could not determine the current browser URL on Windows with enough confidence
to enforce policy”. Hierna is geen verdere browserbediening uitgevoerd en geen
veiligheidscontrole omzeild. Dit is een testuitvoerbeperking, geen bewezen
applicatiefout. Geen nieuwe screenshots of geslaagde zoommetingen te rapporteren.

De eindassertie van de browserharness faalde terecht met
`Browser acceptance must finish logged out: 1 !== 0`. De finally-cleanup verwijderde
de eigen database inclusief die sessie en alle synthetische accounts, de tijdelijke
credentialfixture en uitsluitend de eigen container. De eigen browser, het profiel
en de acceptatieserver zijn gesloten/verwijderd. Bestaande containers/databases
behouden. Cleanup is **geen** bewijs van geslaagde browserlogout.

### Gerichte validatie

- **155/155 tests in 34 suites PASS**: platformbeheerpolicy/autorisatie,
  OWNER/ADMIN/MEMBER-navigatie, shells, acties, versievoorkeur, testaccountwisselaar,
  auth/sessies, logout met Compliance-concepten en organisatieautorisatie.
- Bestaande authharness op eigen PostgreSQL 18: **95/95 migraties** met correcte
  checksums; herhaalde deploy ongewijzigd. Uitsluitend de lokale testdatabase.
- Opdrachtgever, professional en platform-OWNER: sessiecookie/maximaal 24 uur,
  expliciet blijvende sessie/zeven dagen en vernieuwing, serverautorisatie,
  tenantisolatie, deactivering en database-intrekking PASS.
- Werkelijke PostgreSQL-foutinjectie bij sessieverwijdering: 503 zonder vals
  logoutsucces; retry en gelijktijdige logout geven nul sessies; ongeldige en
  verlopen sessies geweigerd. Integratietest PASS, onafhankelijk van browseracceptatie.
- Volledige lint PASS: nul fouten, vier bestaande authnavigatiewaarschuwingen.
- Standalone TypeScript PASS: nul fouten.
- Productiebuild PASS: 172 pagina's, drie bestaande dynamische filesystem-tracingwaarschuwingen. Uitsluitend lokale buildconfiguratie, geen databaseverbinding.
- Diff-check en secrets-/metadatacontrole van het staged document: PASS.

### Academy-integratiematrix op daadwerkelijke PR-heads

Read-only vergeleken:

- PR #93: `a7c903130771ca8302536ea6df6055b76fe22fd4`.
- PR #94: `19ba769a920125f8c22f74e89b1aab11f6f24d00`, gestapeld op #93.

| Rubriek | Bestaande beheerroute in #93 / #94 | Integratievoorwaarde |
| --- | --- | --- |
| Cursussen | /platformbeheer/academy/cursussen en /platformbeheer/academy/cursussen/[versionId] | Bestaande cursuskeuze en versie-editor gebruiken. |
| Hoofdstukken en lessen | Binnen /platformbeheer/academy/cursussen/[versionId] | Geen losse hoofdstukkenroute. #94 gebruikt voor bundles de volledige bundle-editor; eerst cursusversie kiezen. |
| Vragenbanken | /platformbeheer/academy/vragen; reviewexport onder /vragen/export | Bestaande beschermde beheerfunctie, geen deelnemersvragenroute. |
| Eindtoetsen | Cursusversie-editor; review via /platformbeheer/academy/vragen | Geen losse eindtoetsbeheerroute verzinnen. Bestaande bankfilters gebruiken. |
| Deelnemers en resultaten | Sectie binnen /platformbeheer/academy/cursussen/[versionId] | Beide heads lezen enrollments/examAttempts via de beschermde authoringservice. Geen los totaaloverzicht aangetoond. Geen deelnemersroute als vervanging. |
| Certificaten | /platformbeheer/academy/certificaten, /[certificateId], /[certificateId]/pdf en /zoeken | Bestaande operatorautorisatie/gate behouden. Niet vooruitlopen op latere certificaatontwerper-PR's. |

#93 en #94 voegen zelf een Academy-hoofdstuk toe in
`platform-admin-navigation-v02.ts`, inclusief bestaande routes voor
beoordelingsverzoeken en prijzen. Een ongewijzigde combinatie met de sidebar van
#91 levert twee Academy-menu's op. Bij de afzonderlijke integratiereview moet één
bestaande navigatiepresentatie overblijven, met alle zes afgesproken rubrieken en
behoud van bestaande functies. Dit verslag importeert of activeert geen LMS-code.

De Academy-layout faalt gesloten wanneer `LEARNING_RUNTIME_ENABLED` niet aanstaat.
De authoringservice controleert de actuele gebruiker en
`getPlatformOperatorContext`; certificaatbeheer gebruikt
`requirePlatformOperator`. MEMBER behoudt uitsluitend auditnavigatie.
#93/#94 hebben 109 migraties tegenover 95 in #91. Routeaanwezigheid is geen bewijs
van een gemigreerde of vrijgegeven productieomgeving. Alle zes rubrieken blijven
in #91 niet-navigeerbaar ‘Nog niet beschikbaar’.

### WP20 en definitief advies

`PREVIEW_DATABASE_ISOLATION_REQUIRED` blijft een infrastructuurafhankelijkheid
van WP20. Preview-beveiliging, productieconfiguratie en featuregates ongewijzigd.
Op de gecontroleerde head zijn de GitHub-checks groen en is Vercel FAILURE;
de eerdere oorzaakanalyse staat hieronder. Groen GitHub CI is geen Preview-PASS.

**Technisch acceptatieadvies: NO-GO.** Resterend:

1. De geblokkeerde browsercontroles hierboven, waaronder ADMIN/MEMBER,
   Account/logout, routeafscherming en echte 200%-zoom.
2. Een aantoonbaar geïsoleerde, succesvolle Preview via WP20.

Een volgende browserproef vereist werkende URL-herkenning/bediening van het
lokale testvenster of expliciete handmatige uitvoering door de Product Owner.
De browserblokkade is geen PASS en geen uitsluitend externe WP20-afhankelijkheid.
PR #91 blijft Draft; geen merge of productiedeployment.

## Afrondingscontrole PR #91 — 5 november 2026

Gecontroleerde PR-head: `855bfa89cd4b4a8a778e4daf717abeb7414a17ce`.
Actuele origin/main: `a315db8c7738b8862a92d9f8517b0315e3b14d1f`; de PR
staat één commit voor en nul achter. Geen mergeconflict of LMS-overname.

### Vercel Preview: configuratieblokkade

De volledige buildlog is in tijdvakken zonder afkapping gecontroleerd (182 events).
Deployment: `dpl_GbXJnCwt6zhMHrKzZyFAmzTGXpMT`.
Compilatie slaagt in 6,5 s en TypeScript in 13,5 s. Vervolgens faalt het verzamelen
van pagina/configuratiegegevens voor `/_not-found` met
`PREVIEW_DATABASE_ISOLATION_REQUIRED`, vanuit
`src/lib/maintenance/preview-isolation.ts:48` via Prisma/auth.
`BUILD_UTILS_SPAWN_1` is de afsluitmelding, niet de primaire oorzaak.

Dit bewijst dat de bestaande Preview-configuratie niet aan het isolatiecontract
voldoet. De generieke fout bewijst niet welke afzonderlijke variabele ontbreekt
of afwijkt. Geen secretwaarde opgevraagd of gepubliceerd. Geen bewezen fout in
de navigatiewijziging; de beveiliging, configuratie en featuregates zijn behouden.

Veilige vervolgstap: een bevoegde operator moet voor deze Preview de bestaande
isolatievoorwaarden aantonen (afzonderlijke database en rol, kloppende metadata,
TLS, expliciete infrastructuuracceptatie en geen verboden overgeërfde provider-
of alternatieve databasecredentials). Pas daarna Preview opnieuw laten bouwen.
Geen placeholderwaarde, `VERCEL_ENV`-omzeiling of gedeelde productiedatabase gebruiken.

De Node-enginewaarschuwing (Vercel kiest 26.x bij `>=24.0.0` ondanks projectinstelling
24.x) en drie dynamische filesystem-tracingwaarschuwingen zijn afzonderlijke
bestaande aandachtspunten; zij veroorzaken de aangetroffen afbreking niet.
GitHub Actions op de gecontroleerde head zijn geslaagd; Vercel is FAILURE.

### Aanvullende acceptatie: werkelijk uitgevoerd

- 126/126 gerichte tests in 16 suites PASS: v0.2-shell, gedeelde shell, navigatie,
  platformautorisatie, versievoorkeur en Preview-isolatie.
- Volledige lint: nul fouten, vier bestaande authnavigatiewaarschuwingen.
- Standalone `npm run typecheck`: PASS.
- Productiebuild PASS (172 paginas), met drie bestaande filesystem-tracingwaarschuwingen.
  Hiervoor uitsluitend lokale buildconfiguratie gebruikt; geen databaseverbinding.
- Diff-check en controle van toegevoegde regels op secrets/private metadata PASS.
- Bestaande authharness met uitsluitend een nieuwe lokale synthetische PostgreSQL-
  omgeving: 95/95 migraties, checksums en ongewijzigde tweede deploy PASS.
- Opdrachtgever/professional/platformbeheer: sessieduur, sessievernieuwing,
  daadwerkelijke DB-intrekking, deactivering, autorisatie en tenantisolatie PASS.
  PostgreSQL-foutinjectie bij logout, gelijktijdige retry, ongeldige/verlopen
  sessies PASS. Dit zijn integratietests, geen vervanging van browseracceptatie.
- Echte browserlogin als synthetische platform-OWNER: PASS. Academy toont alle
  zes niet-beschikbare rubrieken zonder links; vergelijkingslink ontbreekt,
  Account en één Uitloggen-actie zijn zichtbaar.
- Desktop 1440 px en mobiel 390 px: geen horizontale overflow; mobiele header
  breekt naar twee regels. Enter sluit Academy, Spatie opent; zichtbare focus
  met een gemeten blauwe outline van 2,4 px: PASS.
- Account met Enter geactiveerd; bestemmingspagina niet meer geverifieerd.
- De Windows-browserbediening stopte wegens onvoldoende betrouwbare herkenning
  van de actuele browser-URL. Daarom blijven echte 200%-zoom, de volledige
  Account/logout-browserflow en ingelogde ADMIN/MEMBER-browseracceptatie OPEN.
  De bestaande OWNER/ADMIN/MEMBER-regressietests zijn wel groen.
- De onderbroken browserflow liet één synthetische sessie achter. De harness
  meldde terecht een mislukte eindassertie voor nul sessies; dit is geen PASS
  voor browserlogout. De finally-cleanup verwijderde de eigen testdatabase met
  die sessie en testaccounts, het credentialbestand, de tijdelijke server en
  uitsluitend de eigen gelabelde container. Bestaande databases/container behouden.
- Contact, F4 en Learning bleven in de lokale testomgeving uitgeschakeld.

### Academy-integratiebesluit

De kandidaat `codex/academy-content-approval` op `7434ae2` bevat zelf al een
Academy-hoofdstuk. Neem bij een latere afzonderlijke review één menu op en vervang
zowel dat hoofdstuk als dit tijdelijke sidebarblok. Behoud de zes rubrieken:
Cursussen, Hoofdstukken en lessen, Vragenbanken, Eindtoetsen, Deelnemers en
resultaten, Certificaten. Gebruik de hierboven geïnventariseerde werkelijke
routes; hoofdstukken/lessen en eindtoetsen zijn cursusversieonderdelen.
`beoordelingen` is geen deelnemers/resultatenoverzicht. Behoud ook bestaande
beoordelingsverzoeken en prijsbeheer op hun bevoegde plek; verwijder die functies
niet bij het samenbrengen van menu's. Ontbrekende rubrieken blijven zonder link.
De Learning-layoutgate en server-side platformoperatorautorisatie blijven beide
nodig; een zichtbare link of ingeschakelde gate verleent geen bevoegdheid.

**Mergeadvies: NO-GO** zolang Preview-isolatie en de hierboven expliciet open
browseracceptatie niet zijn afgerond. Geen aangetoonde navigatiecodefout om te
herstellen. Geen merge, productiehandeling of LMS-integratie uitgevoerd.

## Actuele navigatieaanpassing — 4 november 2026

Basis: main `a315db8`; afzonderlijke branch `codex/admin-academy-navigation`.
De overige paragrafen in dit document zijn historisch. Actuele main kiest v0.2
standaard; alleen een bestaande expliciete `v01`-voorkeur kiest de oude shell.
Deze selectie en de historische componenten/versieroutes blijven ongewijzigd.

- Alleen de bovenbalklink **Vergelijk met v0.1** is verwijderd. Account en de
  bestaande gedeelde LogoutButton blijven behouden, zonder extra uitlogactie.
- **Academy / E-learning** is een zelfstandig, met het toetsenbord inklapbaar
  navigatieonderdeel via de bestaande `sidebarExtra`-voorziening. Geen tweede
  beheersysteem, nieuwe pagina of databasequery.
- De bestaande platformoperatorregel toont dit onderdeel alleen aan platform-
  OWNER/ADMIN. MEMBER houdt uitsluitend de bestaande auditnavigatie. De serverlayout
  blijft de actieve gebruiker, platformorganisatie en membership controleren.
- De zes onderdelen zijn zichtbaar als **Nog niet beschikbaar**, zonder href,
  button of formulier. Ook een gewijzigde omgevingsvariabele opent hier geen
  ontbrekende beheerroutes. LEARNING_RUNTIME_ENABLED wordt niet geactiveerd.

### Daadwerkelijke route- en vrijgavegrenzen

| Onderdeel | Actuele main | Aangetroffen in lopende LMS-kandidaat |
| --- | --- | --- |
| Cursussen | Geen beheerroute | `/platformbeheer/academy/cursussen` en `/{versionId}` |
| Hoofdstukken en lessen | Geen beheerroute | Onderdeel van de cursusversie-editor, geen zelfstandig overzicht |
| Vragenbanken | Geen beheerroute | `/platformbeheer/academy/vragen` |
| Eindtoetsen | Geen beheerroute | Eindtoetsinhoud binnen cursusversie; deelnemersroute is geen beheerroute |
| Deelnemers en resultaten | Geen passend beheeroverzicht | Geen zelfstandige deelnemers/resultatenroute aangetoond; `beoordelingen` betreft beoordelingsverzoeken |
| Certificaten | Geen beheerroute | `/platformbeheer/academy/certificaten` en `/{certificateId}` |

Read-only bekeken kandidaat: `7434ae2` in de bestaande Academy-ontwikkelbranch.
Geen code of route uit die branch overgenomen. De kandidaat gebruikt de bestaande
Learning-gate en `requireAuthor` → `getPlatformOperatorContext`; de featuregate
verleent op zichzelf geen rechten. Main bevat wel `/e-learnings/...` en de
certificaatroute, maar dat zijn geen vervangende beheerbestemmingen.

De laatst vastgelegde productiebasis in het database-upgrade-runbook bevat 85
migraties tegenover 95 in deze main. Dit is bestaand bewijs, geen nieuwe live
productiecontrole. Learning vertical slice, final exam, certificates, retention,
retention-publication-policy, annual-reminder-reconsent en de examenvraag-
immutabilitycorrectie staan in de ontbrekende bundel. Daardoor is alleen een
navigatielink toevoegen geen veilige Academy-vrijgave. Geen migratie uitgevoerd.

Bij latere integratie: de LMS-kandidaat bevat al een hoofdstuk **Academy**.
Vervang deze tijdelijke beschikbaarheidsweergave en dat kandidaatmenu in één
review door één rol- en beschikbaarheidsbewuste navigatie; voeg ze niet beide toe.
Koppel pas na bewezen route-, autorisatie-, schema- en runtimevrijgave. Geen
algemene gate, autorisatie of databasecontrole wordt in deze presentatie-PR aangepast.

### Validatie

- 41 gerichte tests in zeven suites PASS: beheerheader, OWNER/ADMIN/MEMBER,
  ontbreken van onveilige Academy-links, actuele route, versievoorkeur,
  serverautorisatie, gedeelde klant-shell en gesloten Learning-gate.
- De bestaande volledige shell-snapshot is uitsluitend aangepast voor de
  verwijderde vergelijkingslink en het nieuwe Academy-beschikbaarheidsblok.
- Eerste testrun: verwachte snapshotafwijking en nog niet gegenereerde lokale
  Prisma-client. Na lokale clientgeneratie en review van de snapshot: PASS.
- Volledige lint PASS (bestaande vier no-location-assign-waarschuwingen in authcode);
  standalone TypeScript PASS; productiebuild PASS (172 paginas; drie bestaande
  Knowledge filesystem-tracing-waarschuwingen). Geen nieuwe fout.
- Browser: echte shellmarkup met productie-CSS, uitsluitend synthetische data,
  OWNER/ADMIN/MEMBER. Desktop 1440 en mobiel 390/320 pixels zonder horizontale
  overflow. Academy met Enter dicht en Spatie open; zichtbare focusrand.
  Account en precies een uitlogknop behouden. MEMBER toont alleen Audit.
- De browserpreview is statisch en bewijst presentatie en native details-bediening,
  niet een nieuwe ingelogde sessie of daadwerkelijke logout. Serverautorisatie,
  versievoorkeur en rollen zijn door de gerichte regressies gecontroleerd.
- Echte 200%-browserzoom: handmatige acceptatie gevraagd, nog OPEN.
- Diff-check, beperkte secrets-/metadatareview en controle tegen actuele main PASS.
  Geen lokale fixtures, credentials of gegenereerde buildbestanden in de PR.

Geen productieaccount, sessie, database of LMS-branch gewijzigd; geen merge,
productiedeployment, migratie of featuregate-activering.


Basis: origin/main f297831. Presentatie en generieke landingskeuze; geen business-, database- of auditwijzigingen.

## Bereikbaarheid

- `/platformbeheer/v02` kiest de compacte versie en keert terug naar `/platformbeheer`.
- `/platformbeheer/v01` kiest de bestaande versie. Zonder voorkeur blijft v0.1 actief.
- De HttpOnly sessiecookie `platform-admin-view` geldt alleen onder `/platformbeheer` en verleent geen rechten. Beide instappunten controleren de bestaande auditor/operatorautorisatie. Versiewisseling geldt voor dezelfde browser; gebruik aparte browserprofielen voor een gelijktijdige vergelijking.
- Bestaande routes, filters, detailpagina's, acties en redirects blijven canoniek. Geen kopie van queries of beheeracties.

## Inventaris en hoofdstukken

| Hoofdstuk v0.2 | Bestaande functies en detailacties |
| --- | --- |
| Overzicht | Dagelijkse cockpit met signalen, KPI's, wachtrijen en gezondheid; Actiecentrum met status/verantwoordelijke en notities; trends; rapportages met CSV-export |
| Gebruikers & organisaties | Organisaties en detail met memberships/gebruikers; gebruikers en detail; bestaande uitnodigings-, lifecycle-, rol- en communicatieacties |
| Opdrachten & dienstverlening | Opdrachtlijst en detail met communicatie en onderzoek; dienstverleners en kwalificatiedetails; reviews; goedkeuringen; betrouwbaarheidsonderzoeken per organisatie |
| Financieel | Financiële totalen, abonnementen en onderhoud; betalingen en detail; facturen en PDF; terugbetalingen; credits/reserveringen/marketplace; prijzen en versieerbare bedrijfsregels; providercreditdetail |
| Kennis & content | Kennisoverzicht; bronupload; beoordelingen en detail; verbeter-/onjuistheidsmeldingen; originele bronbestanden |
| Platform & instellingen | Configuratieoverzicht, vraagsets/taxonomie/outbox; bestaande Tradingtoegang |
| Beveiliging & audit | Audit en gekoppeld communicatiearchief; platformbeheerders en uitnodigings-/toegangsbeheer |

Alle 35 bestaande page.tsx-routes blijven behouden. Dynamische details vallen onder hun bestaande overzicht; providercredits vallen onder Financieel. Communicatiedetails blijven auditdetails; mails versturen blijft dicht bij de betreffende gebruiker, organisatie of opdracht. Review-/approvalpermissions worden niet uitgebreid. MEMBER ziet uitsluitend Audit zoals in v0.1.

Learning heeft geen bestaande platformbeheerroutes. Er is geen losse communicatie-overzichtspagina. Daarom geen lege hoofdstukken of nieuwe functionaliteit. Prijzen verhuizen in de navigatie van Systeem naar Financieel; gebruikers en kennisdeelroutes worden direct bereikbaar. Bestaande technische routepaden wijzigen niet.

## Compactheid en toegankelijkheid

Desktop: 14rem hoofdstukkolom met flexibele inhoud; maximaal 100rem breedte, 1rem hoofdafstand. V0.1 heeft 15rem, 96rem en 1.5rem. Paginaheaders 24px, sectieheaders 16px, metric cards minimaal 84px in plaats van 112px, tabelcellen 8px verticale padding in plaats van 12px. CSS is uitsluitend onder v0.2 van toepassing. Geen gegevens, beschrijvingen of controls verborgen. Tabellen behouden hun lokale overflowcontainer. Hoofdstukken stapelen responsief; lokale navigatie breekt over regels af. Focus en aria-current blijven zichtbaar.

## Landingsgedrag

De bestaande login en accountactivatie gaan generiek naar `/dashboard`. Die serverpagina controleert na de actuele gebruikerscontext via `getPlatformAuditorContext` de actieve accountstatus, platformrol, membership en platformorganisatie. Alleen een geldige platformcontext leidt naar `/platformbeheer`; MEMBER volgt daar de bestaande redirect naar Audit. Een afwijzing behoudt de tenantdashboardflow; onverwachte fouten worden niet ingeslikt. Expliciete veilige returnTo-bestemmingen blijven behouden. Geen clientrolvertrouwen, impersonation of nieuwe sessielogica.

## Bewust ongewijzigd

Historische moduledocumentatie beschrijft deels oudere rollen en toekomstige modules. De actuele autorisatieservices blijven leidend. Technische statuslabels en uitgebreide verklaringen in bestaande beheerpagina's zijn niet herschreven. Financiële details en providercreditacties blijven op hun oorspronkelijke routes.

## Route- en actie-inventaris op de basiscommit

- `/platformbeheer/actiecentrum` — requirePlatformAdministrator
- `/platformbeheer/approver` — requirePlatformAdministrator
- `/platformbeheer/auditor` — requirePlatformAuditor
- `/platformbeheer/communicatie/[communicationId]` — requirePlatformAdministrator
- `/platformbeheer/dienstverleners/[providerProfileId]/credits` — requirePlatformAdministrator
- `/platformbeheer/dienstverleners/[providerProfileId]` — requirePlatformAdministrator
- `/platformbeheer/dienstverleners` — requirePlatformAdministrator
- `/platformbeheer/financien/betalingen/[purchaseId]` — requirePlatformAdministrator
- `/platformbeheer/financien/betalingen` — requirePlatformAdministrator
- `/platformbeheer/financien/facturen` — requirePlatformAdministrator
- `/platformbeheer/financien` — requirePlatformAdministrator
- `/platformbeheer/financien/terugbetalingen` — requirePlatformAdministrator
- `/platformbeheer/gebruikers/[userId]` — requirePlatformAdministrator
- `/platformbeheer/gebruikers` — requirePlatformAdministrator
- `/platformbeheer/instellingen` — requirePlatformAdministrator
- `/platformbeheer/kennisbank/beoordelingen/[reviewTaskId]` — requirePlatformAdministrator
- `/platformbeheer/kennisbank/beoordelingen` — requirePlatformAdministrator
- `/platformbeheer/kennisbank/bronnen/uploaden` — requirePlatformAdministrator
- `/platformbeheer/kennisbank/meldingen` — requirePlatformAdministrator
- `/platformbeheer/kennisbank` — requirePlatformAdministrator
- `/platformbeheer/marketplace/betrouwbaarheid/[organizationId]` — requirePlatformAdministrator
- `/platformbeheer/marketplace/betrouwbaarheid` — requirePlatformAdministrator
- `/platformbeheer/marketplace` — requirePlatformAdministrator
- `/platformbeheer/marketplace/regels` — requirePlatformAdministrator
- `/platformbeheer/opdrachten/[assignmentId]` — requirePlatformAdministrator
- `/platformbeheer/opdrachten` — requirePlatformAdministrator
- `/platformbeheer/organisaties/[organizationId]/gebruikers` — requirePlatformAdministrator
- `/platformbeheer/organisaties/[organizationId]` — requirePlatformAdministrator
- `/platformbeheer/organisaties` — requirePlatformAdministrator
- `/platformbeheer` — requirePlatformAuditor
- `/platformbeheer/platformbeheerders` — requirePlatformAdministrator
- `/platformbeheer/rapportages` — requirePlatformAdministrator
- `/platformbeheer/reviewer` — requirePlatformAdministrator
- `/platformbeheer/trading/toegang` — requirePlatformOperator
- `/platformbeheer/trends` — requirePlatformAdministrator

De bestaande serveracties blijven ongewijzigd:

- `src/app/platformbeheer/actions.ts`: `changePlatformOrganizationStatusAction`, `changePlatformUserStatusAction`, `sendPlatformAdminEmailAction`, `sendPlatformUserAccessEmailAction`, `addPlatformAdminNoteAction`, `updatePlatformSignalStatusAction`, `addPlatformOrganizationOwnerAction`, `createMarketplaceRuleSetAction`, `mutateMarketplaceCreditsAction`, `decideMarketplaceContactRequestAction`, `invitePlatformAdministratorAction`, `resendPlatformAdministratorInvitationAction`, `revokePlatformAdministratorInvitationAction`, `changePlatformAdministratorRoleAction`, `changePlatformAdministratorAccessAction`
- `src/app/platformbeheer/financien/actions.ts`: `startPlatformFinancialRefundAction`, `retryPlatformJorttSyncAction`
- `src/app/platformbeheer/kennisbank/actions.ts`: `saveKnowledgeReviewDraftAction`, `decideKnowledgeReviewAction`, `addKnowledgeSupportingSourceAction`, `withdrawKnowledgeReviewApprovalAction`, `withdrawKnowledgeSupportingSourceAction`
- `src/app/platformbeheer/kennisbank/bronnen/uploaden/actions.ts`: `analyzeKnowledgeSourceUploadAction`, `analyzeStoredKnowledgeSourceUploadAction`, `analyzeKnowledgeSourceUploadBatchAction`, `confirmKnowledgeSourceUploadAction`, `confirmKnowledgeDocumentFamilyAction`
- `src/app/platformbeheer/kennisbank/meldingen/actions.ts`: `handleKnowledgeImprovementAction`
- `src/app/platformbeheer/test-account-actions.ts`: `startTestImpersonationAction`, `stopTestImpersonationAction`
- `src/app/platformbeheer/trading/toegang/actions.ts`: `resetTradingPasswordAction`, `revokeTradingSessionsAction`

## Validatie en bewijs

- 88 gerichte tests PASS: bestaande beheertests, loginregressie en nieuwe navigatie-, versiekeuze- en landingtests.
- Afzonderlijke tijdelijke fixturetest PASS: rendert de echte Overzicht-, Financieel- en Organisaties-componenten met fictieve gegevens; geen auth-bypass in applicatiecode.
- Volledige lint PASS.
- Definitieve productiebuild PASS (exit 0), inclusief TypeScript-controle en 151 gegenereerde pagina's. Een afzonderlijke gelijktijdige tsc-run is gestopt om geheugendruk te verminderen; de volledige TypeScript-controle in de definitieve build is geslaagd.
- Buildmeldingen: bestaande Knowledge Engine-bestandstracering en ontbrekende lokale BETTER_AUTH_SECRET. Geen productiecredentials geladen; ingelogde runtime daarmee niet gevalideerd.
- git diff --check en secrets-patterncontrole PASS.
- Desktopcomponentpreviews op 1440px; tablet op 820px; mobiel op 390px. Geen horizontale pagina-overflow. Brede bestaande tabellen behouden lokale horizontale scrolling. Toetsenbordfocus op filters zichtbaar.
- Dezelfde organisatietabel: v0.1 430px hoog, v0.2 358px hoog (circa 17% compacter).
- Screenshots buiten Git opgeslagen. Dit is visueel componentbewijs, geen ingelogde end-to-endacceptatie. Lokale beheerlogin nog niet beschikbaar; echte login/actiecontrole en echte 200%-browserzoom nog open.

## Gewijzigde/toegevoegde taakbestanden

- `docs/README.md`
- `docs/platform-admin-v02.md`
- `src/app/dashboard/page.tsx`
- `src/app/platformbeheer/layout.tsx`
- `src/app/platformbeheer/v01/route.ts`
- `src/app/platformbeheer/v02/route.ts`
- `src/app/platformbeheer/view-version.test.ts`
- `src/components/platform-admin/platform-admin-shell-v02.test.tsx`
- `src/components/platform-admin/platform-admin-shell-v02.tsx`
- `src/components/platform-admin/platform-admin-shell.tsx`
- `src/components/platform-admin/platform-admin-v02.module.css`
- `src/lib/platform-admin/platform-admin-landing.test.ts`
- `src/lib/platform-admin/platform-admin-landing.ts`
- `src/lib/platform-admin/platform-admin-navigation-v02.test.ts`
- `src/lib/platform-admin/platform-admin-navigation-v02.ts`

Geen commit, push, deployment of databasewijziging uitgevoerd. De oorspronkelijke werkmap blijft onaangeroerd.

## A01.6-herstel

De bovenstaande beschrijving en validatie zijn historisch. De bestaande versie is voor A01.6 ongewijzigd naar actuele main geport. Actuele resultaten, deploymentvergelijking en resterende acceptatie staan in [het A01.6-rapport](a01-6-account-navigation-audit.md). De bestaande v0.1-default en expliciete v0.2-keuze blijven behouden.
