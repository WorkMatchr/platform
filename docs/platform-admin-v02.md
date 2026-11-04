# Platformbeheer v0.2 — vergelijking

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
