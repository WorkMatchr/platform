# Public Navigation v2 — professionals en WorkMatchr-producten

## Scope en basis

De publieke navigatie onderscheidt professionele ondersteuning via het platform van eigen kennisproducten en tools. De PR-basis is origin/main 2b66e7ca6ba996f3f2e48a6595b6f4ea146f3311, met Public Learning v1. De gecontroleerde productieversie is 5c24ff50fdd9ec8923aa0794afb1b0503fd3ae1a. Productie heeft afzonderlijke refundfunctionaliteit; main bevat aanvullend Compliance-databasewerk. De productiepatch bevat uitsluitend dezelfde beoordeelde publieke bestanden bovenop de live basis.

## Definitieve navigatie

| Groep | Label | Route |
| --- | --- | --- |
| Professionals & opdrachtgevers | Diensten | /diensten |
| Professionals & opdrachtgevers | Voor opdrachtgevers | /voor-opdrachtgevers |
| Professionals & opdrachtgevers | Voor professionals | /voor-professionals |
| WorkMatchr | Kenniscentrum | /kenniscentrum |
| WorkMatchr | E-learning | /e-learning |
| WorkMatchr | Arbo Compliance Check | /wijzers/compliance |

Inloggen en bestaande account-/dashboardacties blijven apart. Sectoren, Wettelijke verplichtingen en Arbo-wijzers blijven bereikbaar via de bestaande footer en inhoudelijke links.

Desktop hergebruikt DisclosureMenu voor twee dropdowns. Mobiel behoudt het bestaande Menu met twee gelabelde secties. De groepen zijn direct leesbaar zonder extra geneste uitklappers. Beide weergaven gebruiken publicNavigationGroups uit de centrale routecatalogus. Escape herstelt focus; focus buiten een disclosure sluit het paneel. De meest specifieke route bepaalt de actieve link. Op Learning-detail is E-learning actief.

## Nieuwe doelgroeppagina’s

Beide pagina’s zijn compacte statische servercomponenten met PublicPageLayout, Section, Card, Heading, Text en LinkButton. Geen nieuwe dependencies, gegevensopslag of backend.

Voor opdrachtgevers beschrijft de route van hulpvraag naar professionele ondersteuning. CTA’s: Start de Advieswijzer → /advieswijzer en Bekijk diensten → /diensten. De professional bepaalt de uiteindelijke aanpak, prijs en planning.

Voor professionals beschrijft het bestaande dienstverlenersprofiel, gecontroleerde deskundigheid, werkgebied en interesse in beschikbare passende opdrachten. Geen garantie op opdrachten. De expliciet gevraagde CTA Meld je aan als professional verwijst naar /registreren?accountType=PROFESSIONAL. De bestaande registratie vraagt nog zelf om de accountkeuze; er is geen automatische voorselectie beloofd of nieuwe registratiefunctionaliteit gebouwd.

Beide pagina’s hebben titel, beschrijving, canonical, Open Graph en sitemapregistratie. Bestaande metadata, canonicals en Learning-sitemapvermeldingen blijven behouden.

## Compliance en Learning

/wijzers/compliance is de bestaande publieke uitlegroute. Gebruik, resultaten en opslag blijven achter de bestaande account-/organisatiecontrole. Het navigatielabel Arbo Compliance Check verwijst naar de bestaande Compliance-wijzer. Geen nieuwe scanroute, backend of toegangsregel.

Diensten beschrijft het inschakelen van professionals via WorkMatchr. Onderaan staat Zelf kennis opbouwen? als afzonderlijke cross-link naar E-learning. Homepage, Learning-overzicht en detailinhoud blijven intact, inclusief Binnenkort beschikbaar en Home → E-learning → RI&E in de praktijk. Geen koop- of activeringsclaim.

## TypeScript-baseline — expliciet goedgekeurd

PRE-EXISTING BASELINE: ongewijzigde origin/main op 2b66e7c geeft vier TS2345-fouten in src/lib/compliance/rule-engine.test.ts op regels 13, 14, 23 en 24. De readonly antwoordarray past niet op het bestaande mutable-arraytype. De volledige foutoutput is in een afzonderlijke worktree met actuele lockfile-dependencies gereproduceerd en vergeleken. Deze patch raakt noch de bestanden noch de typen.

De Product Owner heeft deze baseline geaccepteerd mits de patch geen nieuwe TypeScript-fouten introduceert en de productievariant een volledige eigen TypeScript-check haalt. Geen TypeScript-configuratie aangepast, fouten onderdrukt of CI-check uitgeschakeld. Merge blijft afhankelijk van de normale groene CI; een geaccepteerde lokale baseline is geen omzeiling van branch protection.

## Productreview en releasepoort

Professionele ondersteuning en eigen kennisproducten zijn onderscheiden. Copy noemt alleen bestaande functionaliteit; de registratie-CTA volgt de expliciete tekstinstructie. Menu’s en doelgroeppagina’s verzamelen geen gegevens. Bestaande tokens, focusstijlen en touch targets worden gebruikt. Geen database, migraties, Learning-backend, commerce of retentionpublicatie.

Vereist voor release: gerichte tests en publieke regressies, lint, geen nieuwe TypeScript-fouten, productievariant TypeScript en production build PASS, git diff --check, browser 1280×900 / 390×844 / 500×900, keyboard/focus/Escape en echte 200% zoom. Daarna normale PR/CI, uitsluitend de publieke productiepatch en live smoke. Bewijsbestanden blijven buiten Git; exacte resultaten, commits, PR en deployment worden in het eindrapport vastgelegd.

## Gewijzigde bestanden

- docs/public-information-architecture.md
- docs/public-navigation-v2.md
- src/app/diensten/page.tsx
- src/app/voor-opdrachtgevers/page.tsx
- src/app/voor-professionals/page.tsx
- src/app/public-audience-pages.test.tsx
- src/app/public-elearning-pages.test.tsx
- src/components/layout/header.test.tsx
- src/components/layout/public-navigation.test.tsx
- src/components/layout/public-navigation-interaction.test.tsx
- src/components/layout/public-navigation.tsx
- src/components/ui/disclosure-menu.tsx
- src/content/public-routes.ts
## Definitieve lokale acceptatie — 1 oktober 2026

- Beide varianten: 81/81 gerichte en publieke regressietests PASS.
- Volledige lint PASS; alleen main bevat de bestaande _condition-warning in ongewijzigde Compliance-code.
- Main: geen nieuwe TypeScript-fouten; foutoutput exact gelijk aan de vier goedgekeurde PRE-EXISTING BASELINE-fouten.
- Productievariant: volledige effectieve TypeScript-check zonder incremental-cache PASS; volledige Webpack-productiebuild PASS (147 statische pagina’s gegenereerd).
- Desktop 1280×900, mobiel 390×844 en 500×900, beide dropdowns, zes menu-items, accountlink, mobiele structuur, keyboard Tab/Enter/Space, Escape/focusherstel en echte browserzoom 200% PASS. Geen horizontale overflow of browserfouten.
- Nieuwe doelgroeppagina’s: headings, layout, CTA-bestemmingen en sitemap PASS. Alle acht gevraagde publieke routes en inloggen geven lokaal HTTP 200 zonder sessie.
- Productreview: professionele ondersteuning en WorkMatchr-producten zijn helder gescheiden; bestaande huisstijl behouden, geen gegarandeerde opdrachten of nieuwe functionaliteitsclaims. Learning blijft Binnenkort beschikbaar.
- git diff --check en scopescan PASS. Geen backend-, database-, package-, workflow-, secrets- of artifactwijzigingen. Productievariant behoudt de bestaande backend bytegelijk aan de live basis.

Deze lokale acceptatie is geen productieclaim; PR/CI, merge en live smoke worden apart in het eindrapport vastgelegd.
