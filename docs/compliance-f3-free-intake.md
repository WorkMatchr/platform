# Compliance F3 — gratis oriëntatie met vijf hoofdvragen

Issue #46; ontwerp PR #42 / issue #41 (`690ee84cc705d162008017fdd175b8538bc8b840`).
Uitgangspunt actuele main `5d41fa8` met F1/F2 (#43/#45). Nieuwe branch
`codex/compliance-f3-free-intake`; geen wijzigingen aan A07-branch, database,
historische resultaten, financiële configuratie of de 21/25 wijzervragen.

## Vraagset en toepasselijkheid

`FREE_INTAKE / 2.0`, FI2-01–FI2-05, toepasselijkheidsversie 2.0. Personeel,
de zes bestaande publieke sectoridentiteiten, aantal werknemers, gegroepeerde
werk-/risicochecklist en informatiebehoefte. Geen vrijtekst of medische
persoonsvragen. Voortgang telt hoofdvragen, geen vijfklikkenbelofte.

De configuratie volgt §3 van het goedgekeurde ontwerp. De 25 werksignalen
plus NONE_RECOGNIZED/UNKNOWN/OTHER vormen één hoofdvraag. Exclusieve antwoorden
kunnen niet samen met positieve signalen worden gebruikt. Ongeldige of
tegenstrijdige combinaties leveren geen positief bewijs. Aantal en
personeelskeuze worden zichtbaar gecontroleerd, niet stil overschreven.
Bij geen werknemers wordt 0 uitsluitend als corrigeerbaar voorstel aangeboden.

Alle C01–C10/R01–R23 blijven aanwezig. EMPLOYEES activeert de kernonderwerpen;
ander werkgeverschap blijft onzeker. Positieve werksignalen gebruiken exact
de R-mapping uit het ontwerp; R02/PBM blijft mogelijk relevant. Niet-aangevinkt,
NONE_RECOGNIZED, UNKNOWN en OTHER geven nooit een vrijstelling. FIRE/ATEX
activeren R19; gevaarlijke stoffen alleen R03. MULTIPLE_LOCATIONS verduidelijkt
de dekking bij C01/C05. PSA blijft zichtbaar zonder PSA-vinkje. Sector verandert
geen toepasselijkheid; interesse ordent uitsluitend. Geen vijfstatusbeoordeling,
score, Op orde, Actie vereist of wijziging van bestaande v1-evaluators.

## Gerichte overname uit A07 — expliciet door PO goedgekeurd

Bron PR #40: `70374ed71f195feef3feca1549c48c5a9ad567fd`.
PO gaf op 17 oktober toestemming voor uitsluitend opslag en logout.

| A07-bestand | Overname in F3 / gerichte aanpassing |
| --- | --- |
| `src/lib/compliance/free-intake-storage.ts` | Bestaande enige opslaghelper, aangevuld met vraagsetdiscriminator en v3-envelop; bescherming tegen overschrijven door stale tabs |
| `src/lib/compliance/free-intake-storage.test.ts` | Bestaande opslagregressies behouden; v2-vraagsettests aanvullend |
| `src/components/public/use-compliance-draft.ts` | Herstel na mount, expliciete TTL, expiry/visibility/storage/logout; nieuwe starts vraagset 2.0; oude saved-concepten krijgen keuze, TTL blijft behouden |
| `src/components/public/compliance-free-intake.tsx` | A07-v1-presentatie behouden in `compliance-free-intake-legacy.tsx`; huidige entrypoint dispatcht op bevestigde vraagset; opslagbediening éénmaal gedeeld |
| `src/components/auth/logout-button.tsx` | A07-waarschuwing en gerichte wisactie; bestaande Better Auth signOut en bestemming behouden |
| `src/components/auth/session-choice.test.tsx` | Uitsluitend logouttests overgenomen naar `logout-compliance-draft.test.tsx`; geen login-/activatietests of sessiegedrag geïmporteerd |
| `src/components/layout/header-logout.test.tsx` | A07-aanpassing voor async conceptcontrole en echte signOut-responsevorm |

Niet overgenomen: `auth.ts`, auth-validatie, inlog-/activatieformulieren,
rememberMe, sessieduur/renewal, juridische identiteit of privacy-/cookiepagina's.
Geen sessie-intrekking. Auth-client en serverautorisatie blijven gelijk aan main.

### Vereiste afstemming wanneer PR #40 later wordt gemerged

Rebase A07 na F3 en laat bovenstaande opslag/logout-bestanden door F3 leiden.
Laat de oude A07-`compliance-free-intake.tsx` de F3-versiedispatch niet vervangen.
Verwijder dubbele logoutcases uit A07 `session-choice.test.tsx` of importeer de
gedeelde suite; behoud de afzonderlijke login-/activatiecases in A07.
Vervang/integreer A07 `compliance-free-intake-storage.test.tsx` met de F3
UI-suite (dezelfde scenario's plus expliciete v1/v2-keuze). Geen dubbele helpers,
nieuwe opslagkeys of terugzetting naar FI1-normalisatie. Juridische teksten uit
A07 moeten beide vraagsetversies en envelop 3 beschrijven. A07-sessie-acceptatie
blijft zelfstandig open. Dit document wijzigt PR #40 niet.

## Opslag, overgang en privacy

Standaard alleen tabgeheugen. Expliciet bewaren geeft maximaal 24 uur vanaf de
bewaaractie; openen/bewerken verlengt niets. Verlopen opslag verdwijnt bij timer
of eerstvolgende relevante leesactie. Actieve invoer blijft in geheugen.
Verwijderen wist de opgeslagen kopie; uitloggen vraagt vooraf en wist uitsluitend
Compliance-opslag/geheugen, ook via een antwoordinhoudloze multitabmelding.
Geblokkeerde opslag geeft uitleg en laat invullen zonder bewaren toe.

De storagekey `workmatchr:compliance-free-intake:v2` blijft dezelfde: de suffix
betekent de A07-opslagfamilie, niet de vraagset. Bestaande envelop 2 bevat FI1;
nieuwe envelop 3 vereist `questionnaireVersion: 2.0`. Daardoor kan oude A07-code
een nieuwe envelop veilig als onbekend behouden, in plaats van FI2 leeg te
normaliseren. De oude ongedateerde `:v1`-key blijft expliciet hervatbaar/verwijderbaar.
Onbekende versies of twee gelijktijdige opgeslagen concepten worden niet overschreven.

Hervatten van FI1 gebruikt de oorspronkelijke vijftien vragen/evaluator. Geen
automatische mapping, fictieve savedAt of splitsing van FI14/FI15. Een A07-concept
behoudt zijn oorspronkelijke lease; een ongedateerd concept wordt na expliciet
hervatten alleen in geheugen geplaatst. Nieuw beginnen vereist expliciet
verwijderen van het oude concept. Hydratatie start altijd zonder browserstate;
herstel volgt na mount, zonder voortijdige opslag of suppressHydrationWarning.

## Vervolg en afhankelijkheid F4

Oriëntatieresultaat verwijst naar bestaande `/wijzers/compliance`, met bestaande
account-/organisatiegate. Geen antwoorden/organisatie-ID in URL, geen serverwrite,
geen verborgen sessionStorage of authprefill. De huidige 21-vragenwijzer blijft
inhoudelijk ongewijzigd; hij ontvangt geen v2-profiel. De UI vermeldt dit expliciet.
Veilige bevestigde profieloverdracht en vermijden van herhaalde profielvragen
horen bij F4: versiegebonden profieladapter, samenvatting/wijzigen/weigeren,
actieve organisatie bevestigen en alleen met dezelfde expliciete 24h-opt-in door
loginredirects heen. Geen voorlopige v2→onveilige v1-NONE/NVT-mapping.
Uitgebreide betaalde scan blijft niet beschikbaar, zonder aankoopactie.

## Validatie en acceptatie

Relevante regressies omvatten elke optie, conflicten, alle modules, positieve
mapping, ontbrekend/onbekend, interesseordening, expliciete opslag, verval,
legacy/A07-herstel, geblokkeerde opslag, multitab, logout/error/focus en SSR-hydratatie.
De componentregressies vereisen geen databasefixtures. Voor de aanvullende echte
sessieacceptatie zijn uitsluitend tijdelijke synthetische lokale fixtures gebruikt
(zie de eindcontrole hieronder). Geen externe mails, betalingen of productiegegevens.

PC-025/028/029: gedeelde vraagconfig/validatie. PC-040/043: begrijpelijke fouten,
behouden invoer en herstelkeuze. PC-044/047: vaste profielcodes zonder persoonsgegevens.
PC-057: geen historische herinterpretatie. PC-062–064: fieldsets, labels,
stapfocus/reduced-motion en tekststatus. PC-069–071: uitsluitend oriëntatie.

Echte 200%-browserzoom: Product Owner PASS op 17 oktober 2026. Functionele Product Owner-eindacceptatie blijft open.
Definitieve technische meetresultaten staan in de Draft PR.

### Uitgevoerde controles op 17 oktober 2026

- F2-productievoorwaarde read-only bevestigd: production READY op main `5d41fa8784851b943dd42cde5747be79d14ef9da`; 85 migraties, 0 onopgelost, 4 beoordelingen en 38 resultaatregels. Geen productiewrites.
- Lokale anonieme productieserver: `http://127.0.0.1:3048/wijzers/compliance/scan`, zonder werkende database of echte accounts nodig te hebben.
- Browser: vijf vragen naar oriëntatie; expliciet bewaren en herladen; toetsenbord (Enter/Spatie/Tab), stapfocus en vervolgactie; desktop 1280 en mobiel 390 px zonder horizontale overflow. Geen console-/hydratatiefouten waargenomen.
- Logoutwaarschuwing, focusherstel, behoud bij annuleren, gerichte verwijdering, API-fout en onvolledige signOut-response zijn met componentregressies getest. Een echte ingelogde sessie is in deze anonieme lokale omgeving niet browsermatig getest.
- Standalone TypeScript: uitsluitend de vier bestaande TS2345-readonly-arrayfouten in `src/lib/compliance/rule-engine.test.ts:13,14,23,24`. Dat bestand en de bijbehorende regelengine zijn identiek aan de main-baseline; geen nieuwe F3-typefouten.
- Een legacy-PDF-test overschreed eenmalig de bestaande 5s-timeout tijdens gelijktijdige zware controles; afzonderlijk en bij de daaropvolgende gerichte run groen. Geen timeout of assertions aangepast.
- Productiebuild heeft bestaande waarschuwingen over de worktree-root/meerdere lockfiles en NFT-tracing van de kennisbank-uploadroute. Geen configuratieworkaround toegepast.
- Geen wijziging van Better Auth-configuratie, login, activatie, sessies, privacy-/cookiepagina's, Prisma, lockfile, vragen van de bestaande beoordeling, prijzen of betaalroutes.

### Exacte wijzigingsset

- `docs/README.md`
- `docs/compliance-f3-free-intake.md`
- `src/app/wijzers/compliance/page.tsx`
- `src/app/wijzers/compliance/scan/page.tsx`
- `src/components/auth/logout-button.tsx`
- `src/components/auth/logout-compliance-draft.test.tsx`
- `src/components/layout/header-logout.test.tsx`
- `src/components/public/compliance-free-intake.tsx`
- `src/components/public/compliance-free-intake-legacy.tsx`
- `src/components/public/compliance-free-intake-v2.tsx`
- `src/components/public/compliance-free-intake-v2.test.tsx`
- `src/components/public/use-compliance-draft.ts`
- `src/lib/compliance/free-intake-storage.ts`
- `src/lib/compliance/free-intake-storage.test.ts`
- `src/lib/compliance/free-intake-v2.ts`
- `src/lib/compliance/free-intake-v2.test.ts`

Definitieve gerichte run: **163/163 tests, 16 suites PASS** (met één worker). Volledige lint PASS. Productiebuild PASS, 163/163 pagina's. Diff-check PASS; secretpatrooncontrole over alle 16 taakbestanden: 0 treffers. Standalone TypeScript blijft BASELINE_FAILURE zoals hierboven beschreven.

### Definitieve technische browseracceptatie — 19 oktober 2026

Geteste code: PR #47-head `9941ef521806a39ceb8f28353f51d0de55c869cd`,
branch `codex/compliance-f3-free-intake`. Geen productcodecorrectie nodig.
Deze controle sluit de eerder openstaande echte ingelogde logoutacceptatie.

#### Geïsoleerde omgeving en opruiming

- Alleen lokaal Docker PostgreSQL 17 op `127.0.0.1:5432`;
  nieuwe database `workmatchr_f3_browser_test_20896_1792429453144`.
- Alle 85 F3-migraties werkelijk uitgevoerd: 85/85, nul mislukte/onverwachte
  migraties; alle geregistreerde SHA-256-checksums gelijk aan de SQL-bestanden.
- Twee synthetische `example.invalid`-CLIENT-accounts, elk uitsluitend OWNER
  van een eigen synthetische organisatie. Bestaand Prisma-testfixturepatroon
  en Better Auth-wachtwoordhashing gebruikt; echte login via het inlogformulier.
- Acceptatieserver `http://127.0.0.1:3048`, zonder externe mailcredentials,
  `CONTACT_FORM_ENABLED=false` en `COMPLIANCE_F4_ENABLED=false`.
- Vóór verwijdering: exact twee testgebruikers, twee testorganisaties,
  nul sessies en nul serverbeoordelingen. Acceptatieserver gestopt; daarna
  uitsluitend bovenstaande database verwijderd, zonder geforceerde disconnects.
- Afwezigheid van die database bevestigd. Overige database-identiteiten/OID's
  en PostgreSQL-rollen vóór/na opruimen identiek. Geen writes naar bestaande
  databases, bestaande gebruikers of productie uitgevoerd; dit is geen claim
  dat hun volledige inhoud opnieuw is gehasht.
- `.local-storage/f3-acceptance/` volledig verwijderd, inclusief tijdelijke
  credentials en scripts. De map was ignored en nooit tracked/staged.
  Alle tracked bestanden gecontroleerd op de concrete tijdelijke wachtwoorden,
  authsecret en verbinding: nul treffers. Geen secrets in rapport of PR.

#### Echte browsercontroles

| Controle | Resultaat en bewijs |
| --- | --- |
| Login en organisatiecontext | PASS: A en B tonen uitsluitend hun eigen synthetische organisatie. |
| Onopgeslagen concept + logout | PASS: waarschuwing vóór signOut; teruggaan behoudt selectie en sessie; focus terug op Uitloggen. |
| Bevestigde logout onopgeslagen concept | PASS: invoer gewist, signOut HTTP 200, publieke homepage; sessieaantal A van 1 naar 0; dashboard verwijst naar Inloggen. |
| Expliciet bewaren + herladen | PASS: vraag 3 en antwoord 1–25 hersteld; terug naar vraag 2 behoudt Industrie; verdergaan behoudt antwoorden. |
| Bewaard concept + logout | PASS: waarschuwing; Escape behoudt antwoord; bevestigen wist concept en beëindigt sessie (A: 0). |
| Tweede geopende tab | PASS: concept eerst hersteld op vraag 4; logout in andere tab wist antwoorden en keert terug naar lege vraag 1 met verwijdermelding. |
| Wisselen A → B | PASS: B heeft eigen organisatiecontext en lege intake; geen concept van A hersteld. Geen antwoorden in URL of serverbeoordeling opgeslagen. |
| Vijf vragen / navigatie | PASS: alle vijf doorlopen, vooruit/achteruit en opnieuw beginnen; nieuwe intake heeft vijf ongevulde antwoordopties op vraag 1. |
| Ontbrekende/onbekende risico's | PASS: lege selectie geeft validatiefout; onbekende antwoorden leveren 0 relevante en 33 mogelijk relevante onderwerpen, geen vrijstelling. |
| Tekstcorrectie | PASS: toelichting is “Denk ook aan uitzendkrachten en stagiairs.”; exacte tekst “Vul geen namen in” afwezig. Algemene privacytoelichting behouden. |
| Laatste logout B | PASS: beide accounts hebben 0 sessies vóór databaseverwijdering. |
| Laatste browsercontrole | PASS: nieuw geopend lokaal tabblad toont Inloggen, lege vraag 1 en 0 geselecteerde antwoorden; geen concept wordt hersteld. |
| Console/hydratatie | Geen errors/hydratatiefouten in vastgelegde browserlogs. Laatste devcontrole meldt alleen een logo-LCP/laadprioriteitswaarschuwing; geen F3-regressie. |

De browsertool biedt hier geen uitlezing van ruwe localStorage. De browserclaim
is daarom beperkt tot aantoonbaar ontbreken van een hersteld concept en de
zichtbare wissing in beide tabs. Het daadwerkelijk verwijderen van de specifieke
v1/v2-keys en het behouden van andere browsergegevens is aanvullend gedekt door
de opslagregressies. TTL-grens en legacygevallen zijn met gecontroleerde tijd
en fixtures in tests gecontroleerd, niet door 24 uur in de browser te wachten.

#### Herhaalde gerichte regressies

```text
npm run test -- --maxWorkers=1 src/lib/compliance/free-intake-storage.test.ts src/lib/compliance/free-intake-v2.test.ts src/components/public/compliance-free-intake-v2.test.tsx src/components/auth/logout-compliance-draft.test.tsx src/components/layout/header-logout.test.tsx
```

**118/118 tests, 5/5 suites PASS** in één finale run (58,19 s). Dekt onder meer
logout/annuleren/focus/fouten, gerichte wissing, 24-uurslease zonder verlenging,
verlopen opslag met behoud van actieve invoer, legacy/A07-concepten, stale tabs,
geblokkeerde opslag en SSR/hydratatie. In een eerdere poging startte één worker
niet tijdig; de suite slaagde afzonderlijk en de finale gezamenlijke run heeft
geen workerfout. Geen limieten of assertions versoepeld.

Echte 200%-zoom blijft de eerder gegeven Product Owner-PASS. De uiteindelijke
functionele Product Owner-goedkeuring en het besluit tot merge blijven apart.
PR #40 en PR #49, productie, migraties en frameworkpublicatie zijn ongemoeid.

#### Finale kwaliteitscontrole en advies

- Volledige `npm run lint`: PASS (exit 0).
- `npm run build`: PASS (exit 0), inclusief ingebouwde TypeScript-check en
  163/163 gegenereerde pagina's. De eerste poging stopte vóór compilatie omdat
  `DATABASE_URL` ontbrak. Herhaling gebruikt uitsluitend een niet-bereikbare
  localhost-build-URL en een tijdelijke procesgebonden authsecret; geen database,
  `.env` of productieconfiguratie gewijzigd. Bestaande worktree-root- en
  kennisbank-NFT-tracingwaarschuwingen blijven apart geregistreerd.
- De door Next gegenereerde wijziging van `next-env.d.ts` is teruggebracht
  naar de oorspronkelijke inhoud; zij hoort niet bij de wijzigingsset.
- `git diff --check`: PASS. Secretpatrooncontrole van de rapporttoevoeging:
  nul treffers; concrete tijdelijke secrets tevens vóór cleanup tegen alle
  tracked bestanden gecontroleerd (nul treffers).
- Standalone `tsc` is in deze laatste acceptatieronde niet opnieuw gevraagd
  of uitgevoerd. De eerder gedocumenteerde standalone-baseline blijft als
  historische bevinding staan; de actuele ingebouwde buildcheck is geslaagd.

**Technisch advies: GO voor merge na afzonderlijk Product Owner-akkoord.**
Geen resterende F3-technische acceptatieblocker gevonden. Dit is geen besluit
tot merge of deployment. PR #47 blijft Draft. Functionele eindacceptatie en
latere afstemming met A07/F4 blijven afzonderlijke Product Owner-/reviewstappen.
De Product Owner heeft de definitieve technische afronding bevestigd en
uitsluitend commit/push van dit rapport naar de bestaande PR #47-branch
geautoriseerd. Productcode blijft ongewijzigd. PR #47 blijft Draft; merge en
productiedeployment zijn niet geautoriseerd.
