# Publieke e-learningpagina’s

## Scope en uitgangspunt

Geïsoleerde publieke wijziging op origin/main `5d5e9b411719601439654f9a931261d12d7b357d` (homepage v0.2). Geen Learning-backend, database, betalingen, entitlements, ADR-024, intake- of AdviceDossier-wijzigingen. Het oorspronkelijke lokale werk is niet overgezet of gewijzigd.

- `/diensten` behoudt alle diensten, deskundigen en bestaande vervolgroutes en krijgt een aanvullende sectie met een link naar `/e-learning`.
- `/e-learning` bevat de hero, drie leerstappen, deelnemers- en organisatie-informatie, een voorlopige aanbodsectie en een afsluitende CTA.
- Metadata bevat titel, beschrijving, canonical en Open Graph. De bestaande sitemap leest de aangevulde `indexablePublicRoutes`.

## Hergebruik

Bestaande publieke site-shell, navigatie, footer, `PublicPageLayout`, `PublicPageHero`, `Section`, `ProcessSteps`, `PublicContentCard`, `KnowledgeCallToAction`, `Card`, `Heading`, `Text` en `LinkButton`. Alleen optionele hero-acties en de drie-kolomsvariant voor drie processtappen zijn toegevoegd. Bestaande aanroepen behouden hun gedrag. Geen nieuwe stylesheets of dependencies.

## Tijdelijke aanbodsectie

Op deze origin/main bestaan geen Learning-routes, canonieke cursusdata of veilige publieke catalogusread-flow. Daarom toont de pagina de redactionele placeholder **RI&E in de praktijk — In ontwikkeling**, zonder cursuslink. De leeromgeving, persoonlijke voortgang en organisatiemogelijkheden worden niet als beschikbare functies gepresenteerd. De lokale prototypecursus is geen release-afhankelijkheid; er is geen tweede cursusdatabase gemaakt.

`Bekijk het aanbod` gaat naar de aanbodsectie. `Inloggen` gaat naar de bestaande `/inloggen`-route en belooft geen toegang tot opleidingen. Het commentaar bij de aanbodsectie markeert de latere aansluiting op een veilige publieke catalogus. Vóór die aansluiting moeten beschikbaarheidsclaims en CTA’s opnieuw worden beoordeeld.

## Gewijzigde bestanden

- `src/app/e-learning/page.tsx`
- `src/app/diensten/page.tsx`
- `src/app/public-elearning-pages.test.tsx`
- `src/app/public-platform-pages.test.tsx`
- `src/components/public/public-page-layout.tsx`
- `src/components/public/public-page-hero.tsx`
- `src/components/public/process-steps.tsx`
- `src/content/public-routes.ts`
- `docs/public-elearning-pages.md`

## Verificatie

De oude homepage-assertie `Kies een deskundigheid of onderwerp` faalt ook vóór wijziging op de schone origin/main. De bijbehorende publieke regressietest controleert nu de twee daadwerkelijk bestaande keuzes van homepage v0.2 en hun exacte bestemmingen. De homepage-implementatie is ongewijzigd.

De gerichte set bevat 29 tests in vijf bestanden: e-learning, publieke platformpagina’s, publieke informatiearchitectuur, homepage en visuele dichtheid. De e-learningtests controleren behoud van diensten en deskundigen, koppen, CTA’s, aanbodstatus, metadata en sitemap, met blokkerende mocks op auth en Prisma om onbedoeld privaat gegevensgebruik te detecteren.

Reproduceerbare controle vanuit deze worktree:

```powershell
npm ci --no-audit --no-fund
# Gebruik een lokale test-DATABASE_URL en een tijdelijke BETTER_AUTH_SECRET.
npm run db:generate
npm test -- src/app/public-elearning-pages.test.tsx src/app/public-platform-pages.test.tsx src/app/public-information-architecture.test.tsx src/app/public-homepage.test.tsx src/components/public/public-visual-density.test.tsx
npm run lint
npm run typecheck
npm run build -- --webpack
git diff --check origin/main
npm start -- --port 3100
```

Prisma-generatie moet gereed zijn vóór TypeScript. Webpack wordt expliciet gebruikt voor een reproduceerbare lokale production build; er worden geen TypeScript- of lintcontroles uitgezet.

## Resultaat op 30 september 2026

**READY** voor review; geen merge of deployment uitgevoerd.

- Nieuwe e-learningtests en publieke regressieset: **29/29 geslaagd**.
- Volledige lint: geslaagd, exitcode 0.
- TypeScript na Prisma-generatie: geslaagd, exitcode 0.
- `npm run build -- --webpack`: geslaagd, inclusief TypeScript en 144 statische pagina’s; exitcode 0.
- `git diff --check origin/main`: geslaagd. De diff bevat uitsluitend de negen hierboven genoemde bestanden; start-HEAD is gelijk aan de opgehaalde origin/main.
- Productionserver op `http://localhost:3100`: `/e-learning` en `/diensten` beide HTTP 200, zonder sessie en zonder authredirect.
- Edge: desktop 1440×1000 en mobiel 390×844 gecontroleerd, zonder horizontale overflow.
- Echte browserzoom 200% gecontroleerd: CSS-viewport 1440 → 720 en devicePixelRatio 1 → 2; geen horizontale overflow.
- Skiplink, toetsenbordnavigatie, zichtbare focus en Enter-activering gecontroleerd op beide pagina’s.
- Alle vier e-learning-CTA’s en de nieuwe diensten-CTA doorgeklikt; bestemmingen werken. Geen browserfouten.
- Desktop-, mobiele en zoomscreenshots beoordeeld: bestaande visuele stijl, leesbare koppen, gestapelde kaarten en knoppen op mobiel.

## Productreview

De pagina gebruikt u/uw, bestaande tokens en componenten, één H1 en logische H2/H3-niveaus. De voorlopige status is expliciet en belooft geen beschikbare cursussen, certificaten, organisatiebeheer of voortgangsfuncties. CTA’s beschrijven hun werkelijke bestemming. Er worden geen persoonsgegevens gevraagd of gegevens geladen. Bestaande diensten, deskundigen, navigatie en footer blijven beschikbaar. De gecontroleerde UI-structuur bestaat uit hero → leerstappen → deelnemers/organisaties → voorlopig aanbod → afsluitende CTA.

Browserbewijsmateriaal en logs zijn uitsluitend lokaal buiten beide bronworktrees bewaard en worden niet gecommit. Er is niet gepusht, gemerged of gedeployd. De oorspronkelijke lokale worktree en server zijn ongemoeid gelaten. Product Owner-bevestiging voor merge/deployment blijft een afzonderlijke vervolgstap.
