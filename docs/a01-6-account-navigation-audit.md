# A01.6 — herkomst en herstel ingelogde navigatie

Datum: 9 oktober 2026. Gerelateerd aan [issue #17](https://github.com/WorkMatchr/platform/issues/17).
Basis: `origin/main` op `756a3d5401b18e4e4a2e7ac709ba5e9b8348feb1`.

## Teruggevonden versies en bewijs

| Versie | Bewijs | Aanwezig op main |
| --- | --- | --- |
| Accountzijbalk | Commit `847ca165177c578b24f9271f9ebdaab32630acf0`, besluit B-238 in `04-besluitenregister.md`: Werk / Organisatie / Persoonlijk, desktopzijbalk en mobiel menu | Ja |
| Klantaccount-shell v0.2 | [PR #16](https://github.com/WorkMatchr/platform/pull/16), commit `007e008`, merge `3d08ffb`, `account-shell-v02.md`; PR en opdrachtgeschiedenis vermelden product-owneracceptatie inclusief 200% | Ja |
| Platformbeheer v0.2 | Bestaande lokale worktree `platform-admin-v02-release`, branch `codex/platform-admin-v02-release`, basis `3d08ffb`; 15 eerder afgebakende taakbestanden en `platform-admin-v02.md` | Nee, uitsluitend lokale ongecommitte port |

Er is dus geen verdwenen nieuwe klantmenu-indeling teruggevonden. PR #16 wijzigde de presentatie en behield juist expliciet de routes, navigatiegroepen en businesslogica. De uitgebreidere hoofdstukindeling hoort bij de aparte Platformbeheer-versie. De huidige opdracht noemt die eerdere beoordeling; het historische document beschrijft tevens nog open ingelogde browserchecks. Die historische gegevens zijn geen nieuw end-to-endacceptatiebewijs.

De huidige `ApplicationChrome`, account-CSS, `HeaderModel` en `AccountNavigationMenu` zijn identiek aan de versie bij commit `007e008`. `AccountNavigationMenu` is zelfs ongewijzigd sinds de zijbalkcommit `847ca16`. Een tweede menu ontwerpen of de groepen hernoemen zou geen herstel zijn.

## Waarom productie en preview verschillen

- `www.workmatchr.nl`: Vercel deployment `dpl_DqUcUV5dDnrB4bhxCpQhEx5DgCfW`, Production READY, CLI-release van 3 oktober. Metadata `productionCommit=77f5585e7db4b799f7dde57dd2eef2610a46fe80`; deze code heeft de account-v0.2-promotie nog niet.
- PR #20-preview: `dpl_ExRALP3AFiu9rDcTRjT1KtL7QN9u`, READY, Git SHA `6008eba46e21e0497fd22e0bc001fe57bc3af19b`. Deze bevat PR #16 en dus de account-shell v0.2.
- Er zijn geen project-environmententries voor `NEXT_PUBLIC_ACCOUNT_SHELL_VERSION` of de oude previewvlag gevonden. Geen waarden of secrets gewijzigd.
- Account-v0.2 geldt alleen voor gevalideerde niet-platformaccounts op bestaande werkruimteroutes zoals `/dashboard`, `/organisatie`, `/opdrachten` en `/aanbiedersdossier`. De publieke homepage krijgt geen klantzijbalk.
- Platformbeheerders gebruiken een afzonderlijke shell. PR #16 en #20 leveren de lokale Platformbeheer v0.2 niet mee. Daarom is het oude platformmenu op beide deployments verklaarbaar.
- Welke rol/URL de gebruiker precies bekeek is niet in een ingelogde sessie geverifieerd. Deze verklaring is gebaseerd op deploymentmetadata, broncode en roltests, niet op een nagebootste productie-login.

## Afgebakend herstel

De bestaande Platformbeheer-v0.2-port is overgenomen, zonder nieuw menuontwerp. Alle 13 oorspronkelijke code-/testbestanden zijn met bestands-hashes identiek aan de bronworktree bevonden. Het bestaande document is behouden en van een A01.6-toelichting voorzien; de README-link is afzonderlijk toegevoegd om actuele main-inhoud te bewaren.

- De zeven hoofdstukken, detailroute-indeling en compacte CSS zijn ongewijzigd.
- `/platformbeheer/v02` kiest de teruggevonden versie; `/platformbeheer/v01` kiest de oude versie.
- **Zonder voorkeur blijft v0.1 actief, conform de teruggevonden versie. Deze PR promoveert v0.2 niet stilzwijgend tot standaard.** Een beheerder die de nieuwe indeling wil bekijken moet het bestaande v0.2-instappunt gebruiken.
- Beide keuzeroutes controleren de bestaande platformautorisatie; de HttpOnly presentatiecookie verleent geen rechten.
- De al bestaande port stuurt een server-side gevalideerde platformbeheerder vanaf de generieke `/dashboard` naar `/platformbeheer`. Bij geweigerde platformautorisatie blijft de tenantdashboardflow intact; onverwachte fouten worden niet verborgen.
- AccountShell, HeaderModel, Header, AccountNavigationMenu, accounttypes, tenantautorisatie, formulieren en database blijven ongewijzigd. De gemergede unieke navigatiekeys blijven intact.

Dit volgt PC-052/054 (rol/context), PC-062/066 (toegankelijkheid/bestaande componenten), ADR-003 (Better Auth) en ADR-004 (actuele server-side tenantautorisatie). Er is geen sessie- of auth-bypass toegevoegd.

## Validatie

- 69 tests in 14 bestanden PASS: bestaande shell/header/account-/platformnavigatie plus de herstelde chapters, landing, versievoorkeur en nieuwe rol-integratietests.
- 22 tests in 6 aanvullende bestanden PASS: mobiel accountmenu/Escape/focus, login, dashboard, platformdashboard en platformautorisatie/-policy.
- Totaal 91 gerichte tests PASS. De vooraf uitgevoerde huidige-main-accountnavigatiesuite had 46/46 PASS; er is geen bestaande klantnavigatiebug gefabriceerd.
- Nieuwe integratietest rendert echte Header + ApplicationChrome + AccountNavigationMenu voor opdrachtgever en dienstverlener, ieder met OWNER/ADMIN/MEMBER. Desktopzijbalk en mobiel menu bevatten dezelfde canonieke routes, precies één actieve route, geen ongepaste klant/provider/platformlinks en de bestaande uitlogactie.
- Mobiele interactietest opent het menu, controleert actieve route, sluit via Escape, controleert focusherstel en opent Persoonlijk. Dit is een DOM-componenttest, geen ingelogde browseracceptatie.
- Platformtests bewaken alle bestaande beheerpagina's, specifieke detailroutes, zeven hoofdstukken en uitsluitend Audit voor MEMBER. Layouttests bewaken v01-default, v02-keuze en weigering vóór cookiegebruik bij ontbrekende autorisatie.
- Volledige lint en aanvullende lint op de laatst toegevoegde interactietest: PASS.
- Standalone `npm run typecheck`: BASELINE_FAILURE, uitsluitend vier bestaande TS2345 readonly-arrayfouten in `src/lib/compliance/rule-engine.test.ts` op 13:79, 14:89, 23:8 en 24:89. De betrokken compliancebestanden zijn identiek aan origin/main; dezelfde fouten zijn in het eerdere A01-mainonderzoek vastgesteld. Geen taakgerelateerde TypeScript-fout.
- npm run build: PASS, inclusief Next.js TypeScript-stap en 162 gegenereerde routes. Alleen de bestaande brede file-tracingwaarschuwing in knowledge-source-upload; geen buildfout.
- `git diff --check` en secrets-patrooncontrole op de wijzigingsset: PASS.

## Nog te accepteren in echte browser

Er was geen ingelogd browsertabblad beschikbaar. Geen productieaccount, testdata of sessie aangemaakt of gewijzigd.

1. Opdrachtgever en dienstverlener: dashboard, organisatie, account en rolgebonden werkpagina's; desktop vanaf 1024 px, mobiel 390 px; open/dicht, Tab/Enter/Escape, zichtbare focus en logout/herlogin.
2. Platformbeheer: `/platformbeheer/v02`, alle hoofdstukken en specifieke detailroute, v01-terugwisseling; OWNER/ADMIN en Audit-only MEMBER volgens bestaande bevoegdheden.
3. Echte 200%-zoom, geen clipping/overflow en pagina-acties bereikbaar.
4. Product owner bevestigt dat juist deze teruggevonden versie de bedoelde navigatie is. Er is geen alternatieve goedgekeurde klantmenu-indeling in de onderzochte Git/PR/documentatie gevonden.

## Relatie met PR #20 en veilige release

Deze branch is rechtstreeks gebaseerd op actuele main, niet op PR #20. PR #20 raakt uitsluitend publieke homepagecopy, CTA-tests en auditdocumentatie; geen runtimeafhankelijkheid. Beide PR's voegen een eigen README-link toe; behoud beide bij eventuele tekstuele overlap.

Voor een latere release, niet uitgevoerd in A01.6:

1. Rond bovenstaande browseracceptatie en review af. Beslis expliciet of alleen de bestaande keuzeversie wordt uitgebracht of v0.2 later standaard moet worden; deze PR bevat alleen de bestaande keuzeversie.
2. Synchroniseer met actuele main en behoud de eventuele PR #20-homepagefixes. Controleer de precieze release-SHA en schone scope. Geen Prisma-/databasewijziging nodig.
3. Controleer GitHub CI en uitsluitend het juiste Vercel-project `platform` in `workmatchrs-projects`. De in A01 gevonden extra `jortt-production-forward-port`-previewcheck is een andere bestaande projectkoppeling; niet verwarren met platform en niet stilzwijgend aanpassen.
4. De ontbrekende main-deployevents uit A01 zijn nog niet verklaard. Een werkende PR-preview bewijst geen werkende Production-trigger. Na expliciet goedgekeurde merge/deployment alleen het bestaande project gebruiken; geen nieuw project aanmaken.
5. Verifieer Production READY, exacte Git/releasemetadata en alias `www.workmatchr.nl`. Controleer de ingelogde rolroutes opnieuw. Geen releaseklaarclaim op basis van uitsluitend publieke homepage of een andere preview-SHA.
6. Presentatierollback Platformbeheer blijft `/platformbeheer/v01`; account-v0.2 heeft de bestaande buildoptie `NEXT_PUBLIC_ACCOUNT_SHELL_VERSION=v01`. Deze PR wijzigt geen van die instellingen.

Geen secrets aangepast, databasewijzigingen/migraties uitgevoerd of productie-deployment gestart. Geen automatische merge.
