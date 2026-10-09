# A01 — homepage en Vercel-productiekoppeling

Onderzoek: 9 oktober 2026. Issue: [WorkMatchr/platform#17](https://github.com/WorkMatchr/platform/issues/17).
Basis: origin/main `756a3d5401b18e4e4a2e7ac709ba5e9b8348feb1` (merge PR #19).

## Waarom recente merges niet live verschijnen

De huidige Vercel GitHub-appinstallatie heeft geen zichtbare toegang tot `WorkMatchr/platform`, terwijl het Vercel-project die repository nog als Git-link bewaart. Dit is de concrete integratieblokkade; er is geen mislukte Vercel-build voor PR #19 aangetroffen.

Read-only bewijs:

- Project `platform`, ID `prj_a2ifiMVtQjDXYBQQn0ZjZcmvSkqb`, team `workmatchrs-projects`.
- Opgeslagen Git-link: GitHub `WorkMatchr/platform`, repository-ID `1298074929`, production branch `main`.
- Vercel `git-namespaces` toont de WorkMatchr-installatie `145931613` als `isAccessRestricted: true`.
- Vercel `integrations/search-repo` met deze namespace/installatie retourneert alleen `WorkMatchr/workmatchr-trading` en `WorkMatchr/website`; zoeken op `platform` retourneert geen repository.
- `createDeployments` staat op `enabled`; er is geen ignored-build-command, rollback freeze of uitschakeling in `vercel.json` gevonden.
- Laatste Production deployment: `dpl_DqUcUV5dDnrB4bhxCpQhEx5DgCfW`, 3 oktober 2026, `READY`, bron `cli`. Git-source/commitmetadata ontbreken. Een live commit-SHA is daarmee niet aantoonbaar.
- `www.workmatchr.nl` is verified op dit project en resolveert via de Vercel deployment-API naar deze deployment.
- PR #19 is op 9 oktober gemerged. De main-check `verify` is groen; een Vercel-check/status en nieuwere deployment ontbreken.
- De live homepage is al v0.2, maar toont nog de oude previewtekst `Stap 1 van 3`. Main bevat sinds PR #18 `Begin met uw hulpvraag`. De verouderde waarneming uit issue #17 dat v0.1 live zou staan, is niet bevestigd.

De CLI-route verklaart waarom de eerdere release wel live kon gaan ondanks de ontoegankelijke Git-repository. De precieze datum/oorzaak van de gewijzigde app-repositoryselectie is niet uit de beschikbare API's af te leiden.

## Buildconfiguratie en veilige herstelroute

Next.js; root directory standaard repositoryroot; Node 24.x; standaard install/build-detectie. `npm run build` voert `prisma generate && next build` uit, geen migratie. `vercel.json` bevat alleen het schema en een bestaande dagelijkse finance-cron. GitHub workflow `Trading access` valideert pushes/PR's maar bevat geen deploymentstap. De notification-workflow triggert maintenance, geen deployment.

Geen repositoryconfiguratie hoeft voor deze oorzaak te worden aangepast. Het toevoegen van een tweede deployworkflow of nieuw Vercel-project zou de bestaande integratieblokkade verhullen en is niet gedaan.

Nog door de bevoegde accountbeheerder, in een expliciet goedgekeurd releasevenster:

1. Controleer bij de bestaande Vercel GitHub-appinstallatie van WorkMatchr de geselecteerde repositories en voeg uitsluitend `platform` toe indien deze ontbreekt.
2. Verifieer in Vercel opnieuw project `platform`, team `workmatchrs-projects`, repository `WorkMatchr/platform`, Production Branch `main` en enabled Git deployments. Voeg geen ander project/repository toe.
3. Controleer dat de integratie `platform` daadwerkelijk kan zien. Stem de eerste deploy/merge apart af: herstel van Git-toegang kan nieuwe automatische deployments mogelijk maken.
4. Als een apart geautoriseerde release vóór integratieherstel nodig is, bestaat de CLI-route. Gebruik uitsluitend een schone checkout van de expliciet goedgekeurde release-SHA, de bestaande project-ID en expliciete teamscope. Controleer de lokale projectlink vóór een productiecommando; geen automatische creatie van een nieuw project. Verifieer daarna target, READY-status, domeinalias en herleidbare commitmetadata.

Geen van deze mutaties/deploymentacties is voor A01 uitgevoerd. Geen credentials bekeken of gewijzigd, geen migraties, geen productiepublicatie.

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
- GitHub-apprepositorytoegang herstellen en een latere, apart geautoriseerde productie-release live controleren. Geen deploymentacceptatie claimen op basis van uitsluitend lokale checks.

Aanvullend open: interactionele browsercontrole van alle secundaire bestemmingspagina's, screenreader en gesimuleerde netwerkuitval. De 32 succesvolle HTTP-controles en route-regressietest bewijzen bereikbaarheid en route-registratie, geen volledige interactionele acceptatie van iedere bestemming.
