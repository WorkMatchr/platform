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
Geen externe mails, betalingen, productiegegevens of databasefixtures nodig.

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
