# A01 — homepage en Vercel-productiekoppeling

Onderzoek: 9 oktober 2026. Issue: [WorkMatchr/platform#17](https://github.com/WorkMatchr/platform/issues/17).
Basis: origin/main `756a3d5401b18e4e4a2e7ac709ba5e9b8348feb1` (merge PR #19).

## Productiedeployment: feiten en diagnosegrens

Recent main is niet live omdat voor de recente main-merges geen Production deployment is geregistreerd. Er is geen mislukte Vercel-build voor PR #19 gevonden. Waarom het main-event niet is verwerkt, is met de beschikbare read-only gegevens nog niet sluitend vast te stellen.

Read-only bewijs:

- Project `platform`, ID `prj_a2ifiMVtQjDXYBQQn0ZjZcmvSkqb`, team `workmatchrs-projects`.
- Git-link: GitHub `WorkMatchr/platform`, repository-ID `1298074929`, Production Branch `main`. `createDeployments` is `enabled`; geen ignored-build-command, rollback freeze of uitschakeling in `vercel.json` gevonden.
- Laatste Production deployment: `dpl_DqUcUV5dDnrB4bhxCpQhEx5DgCfW`, 3 oktober 2026, `READY`, bron `cli`.
- De gedetailleerde CLI/API-respons bevat `meta.productionCommit = 77f5585e7db4b799f7dde57dd2eef2610a46fe80` en `releasePr = 15`. Dit is door de CLI-release aangeleverde metadata; `gitSource` ontbreekt. De eerdere compacte connectorrespons liet deze metadata weg.
- `www.workmatchr.nl` is verified op dit project en resolveert naar deze deployment. Geen domein- of cachemisrouting aangetoond.
- PR #19 is op 9 oktober gemerged. De main-check `verify` is groen; main heeft geen Vercel-check/status of nieuwere productiedeployment.
- Live is al v0.2 met `Vind de juiste deskundige voor uw vraag`, maar toont nog `Stap 1 van 3`. Main bevat sinds PR #18 `Begin met uw hulpvraag`. De verouderde crawl uit issue #17 is dus geen bewijs dat v0.1 live staat.

### Nieuwe tegenproef tijdens het maken van deze PR

De geautoriseerde push van de A01-featurebranch heeft automatisch een Git-preview gestart: `dpl_9s33qJatGXMFctbaMZWkeFMS1JPP`, source `git`, ref `codex/a01-homepage-deployment`, SHA `9fb2e0392f7721b2028c2af0311a083fc5dc90b9`, target `null` (Preview). Er is geen deploycommando uitgevoerd. Production bleef de deployment van 3 oktober.

Hiermee is een algemene ontbrekende repositorytoegang als oorzaak NIET bewezen. De eerdere hypothese daarop is ingetrokken. De GitHub-installatie/API voor repositoryselectie toont wel `isAccessRestricted: true` en geen `platform` in `search-repo`, maar die lijst is kennelijk geen sluitend bewijs voor de effectieve toegang van de bestaande projectkoppeling. Projectconfiguratie is tijdens A01 niet gewijzigd.

Er verschijnt daarnaast automatisch een falende previewcheck voor het bestaande project `jortt-production-forward-port`, voor dezelfde repository/branch/SHA (deployment `dpl_KqxpvYosr5tMUHW2zfEy4dUHZQ3L`, ERROR, ENOENT / npm run build exit 1). Dit is een afzonderlijke bestaande projectkoppeling, niet de Production deployment van `platform`. Deze koppeling is niet verwijderd of aangepast.

## Buildconfiguratie en veilige vervolgcontrole

Next.js; root directory standaard repositoryroot; Node 24.x; standaard install/build-detectie. `npm run build` voert `prisma generate && next build` uit, geen migratie. `vercel.json` bevat alleen het schema en een bestaande dagelijkse finance-cron. GitHub workflow `Trading access` valideert pushes/PR's maar bevat geen deploymentstap. De notification-workflow triggert maintenance, geen deployment.

Er is geen bewezen foutieve repositoryconfiguratie om veilig te corrigeren. Geen alternatieve deployworkflow, nieuwe projectkoppeling of permissionwijziging aangebracht.

Nog door de bevoegde beheerder of Vercel-support, eerst read-only:

1. Controleer GitHub-app event delivery / Vercel Git activity voor de main-merge van PR #19 op 9 oktober 2026 om 10:06:16 UTC en SHA `756a3d5401b18e4e4a2e7ac709ba5e9b8348feb1`. Vraag naar ontvangst, filtering en eventuele weigering van dat specifieke event. Deze deliverylogs waren via de beschikbare accounttoegang niet aantoonbaar beschikbaar.
2. Vergelijk het ontbrekende main-event met het wel verwerkte A01-branch-event. Trek geen permissionconclusie uitsluitend uit `search-repo`; de preview bewijst dat Git-deployment voor deze repository mogelijk is.
3. Beoordeel afzonderlijk of de tweede projectkoppeling `jortt-production-forward-port` bedoeld is. Geen disconnect/verwijdering zonder specifieke autorisatie.
4. Voer een eventuele reconnect, repo-permissioncorrectie of Production deploy pas in een apart goedgekeurd releasevenster uit; deze acties kunnen deployments activeren. Volgens de [Vercel Git-documentatie](https://vercel.com/docs/git) hoort een merge naar de Production Branch normaal een productiedeployment te starten.
5. Als een apart geautoriseerde release vóór definitief integratieherstel nodig is, bestaat de bewezen CLI-route. Gebruik uitsluitend een schone checkout van de goedgekeurde release-SHA, de bestaande project-ID en expliciete teamscope. Controleer de lokale projectlink vóór een productiecommando; maak geen nieuw project. Verifieer daarna target, READY-status, domeinalias en commitmetadata.

Geen productie-deployment, secretwijziging, migratie of productiepublicatie uitgevoerd. Alleen de bestaande automatische previews ontstonden door de gevraagde branchpush/PR.

## Bevestigde homepagecorrecties

- De onbekende-deskundigheidkeuze zegt nu consequent `Nee, ik kies eerst een onderwerp`. De uitleg beschrijft onderwerp kiezen en zelf ondersteuning bepalen; geen impliciete automatische expertisebepaling.
- De onderste link `Ik weet nog niet wat ik nodig heb` gaat naar de bestaande `?start=onderwerp`-instap, net als de andere onderwerpkeuzes.
- Bestaande interne sectielinks krijgen een focusbaar ankerdoel, zodat toetsenbordfocus de scroll volgt.
- De door PR #19 achtergebleven regressietest verwacht nu de reeds gemergede CTA `Vraag ondersteuning aan`, voor zowel embedded als volledige weergave.

Toetsing: Product Constitution, ADR-001/huisstijl en de actuelere `simple-advice-request-flow.md`. Geen wijziging van intakevragen, validatie, routing, matching, prijs of autorisatie. Het bestaande v0.2-ontwerp en de oude rollbackcomponent blijven behouden.

## Validatie

Gerichte suite: 117 tests in 8 bestanden PASS:

```powershell
npm test -- src/app/public-homepage.test.tsx src/components/public/public-content-pathways.test.tsx src/components/layout/public-navigation.test.tsx src/components/layout/public-navigation-interaction.test.tsx src/components/layout/header.test.tsx src/components/layout/header-model.test.ts src/components/requests/simple-advice-form.test.tsx src/lib/requests/simple-advice-contract.test.ts --maxWorkers=1
```

Nieuwe regressies dekken onderwerp-CTA/copy, benoemde links naar geregistreerde routes, focusbare ankers, kophiërarchie, één H1 en canonical/OpenGraph. Bestaande suites dekken navigatie, rolweergave en intake-deeplinks/ongeldige query/statebehoud. De nieuwe assertions faalden vóór de homepagecorrecties; ook de verouderde PR #19-CTA-assertion is eerst rood gereproduceerd.

- Volledige `npm run lint`: PASS.
- `npm run typecheck`: BASELINE_FAILURE, vier TS2345-fouten in `src/lib/compliance/rule-engine.test.ts` op 13:79, 14:89, 23:8 en 24:89. De readonly tuple van `RISK-SET` past niet op het mutable arraytype. Geen fout in A01-bestanden. Test, engine en tsconfig zijn identiek aan de eerder gecontroleerde main-baseline `3d08ffb`; geen baselinefix in deze PR.
- `npm run build`: PASS, inclusief Next.js-typecontrole en 160 statische pagina's. Waarschuwing over brede file tracing via de bestaande knowledge-source-upload-keten; niet veroorzaakt of aangepast door A01. De geslaagde Next.js-build heft de afzonderlijke standalone TypeScript-failure niet op.
- `git diff --check`: PASS. Gerichte secrets-patterncontrole op alle vijf taakbestanden: PASS (0 matches).
- Geen complete publicatie- of databaseacceptatie uitgevoerd: deze wijziging raakt die keten niet.

Browsercontrole, lokaal met uitsluitend synthetische buildconfiguratie en zonder databaseverbinding:

- Desktop 1280 px, tablet 820 px, mobiel 390 px en smalle reflow 320 px: hero/CTA leesbaar, geen horizontale documentoverflow.
- Mobiel menu via Enter geopend, Tab geeft zichtbare focus (2,4 px outline), Escape sluit en herstelt focus naar menuknop.
- Interne CTA `Ontdek eerst wat u nodig heeft`: focus en URL-fragment gaan naar `advieswijzer`.
- Deskundigheid-deeplink: Ja geselecteerd en focus op `requestedExpertise`.
- Onderwerp-deeplink via onderste CTA: Nee geselecteerd en focus op `helpTopic`.
- Normale `/advieswijzer`: bereikbaar; bestaande onderwerpkeuze blijft via de bestaande draftopslag bewaard.
- Alle 32 unieke interne homepage-links, inclusief header/footer, zijn via read-only HTTP gecontroleerd tegen de lokale productiebuild: 32 x HTTP 200, 0 redirects, 0 failures. Homepage en beide deeplinks ook browsermatig gecontroleerd; geen console-errors in het gecontroleerde venster.
- Skiplink in lokale productiebuild: Enter springt naar hoofdinhoud; Tab bereikt vervolgens de eerste aanvraag-CTA, zonder eerst de headernavigatie te doorlopen.
- Canonical wijst naar `https://www.workmatchr.nl`; title, één H1 en benoemde links gecontroleerd. Geen SEO-configuratiedefect bevestigd.

## Resterende handmatige acceptatie

- Echte 200%-browserzoom (320 px reflow is hiervoor geen vervanging).
- Definitieve product-ownerbeoordeling van copy en responsive weergave.
- Ingelogde rolvarianten in de browser; geautomatiseerde header-/roltests zijn wel groen.
- Ontbrekend main-deployevent via beheerder/Vercel-support verklaren en een latere, apart geautoriseerde productie-release live controleren. Geen deploymentacceptatie claimen op basis van uitsluitend lokale checks.

Aanvullend open: interactionele browsercontrole van alle secundaire bestemmingspagina's, screenreader en gesimuleerde netwerkuitval. De 32 succesvolle HTTP-controles en route-regressietest bewijzen bereikbaarheid en route-registratie, geen volledige interactionele acceptatie van iedere bestemming.
