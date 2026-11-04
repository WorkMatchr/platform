# Homepage 2.0 — compacte lay-out

## Scope en acceptatie

Basis: `origin/main` `9f22a67a7308b971b84b3c70bbcd09cebe37221a` (4 november 2026).
Afzonderlijke branch `codex/homepage-compact-v2`; geen wijzigingen aan lopende LMS-branches.

Er is geen afzonderlijke referentieafbeelding beschikbaar. De Product Owner heeft de bestaande huisstijl en de expliciete compactheidsinstructies als ontwerpgrondslag bevestigd. De nieuwe variant is eerst lokaal getoond; daarna heeft de Product Owner expliciet bevestigd: **“200% zoom en de rest is akkoord”**. Dit is visuele acceptatie, geen toestemming voor merge of productiepublicatie.

## Wijziging

Alleen `PublicHomepageV02` verandert qua presentatie:

- Sectiepadding van 48/64 naar 32/40 px (mobiel/vanaf `sm`). De helper is privé aan deze component; andere pagina's veranderen niet.
- Minder ruimte tussen bovenregel, kop, inhoud en vervolgknoppen; dezelfde kleuren, fonts, tekstgroottes en regelhoogtes.
- Hero-kaart iets minder padding, gebalanceerde twee kolommen op desktop. Op mobiel staan beide knoppen met een ruim klikvlak onder elkaar.
- Vier stappen met bestaande nummermarkeringen en verbindingslijn. CSS-subgrid lijnt koppen en beschrijvingen op desktop uit zonder vaste kaarthoogte; mobiel blijft een verticale lijst.
- Alleen de dubbele opdrachtstartknop onder de stappen is verwijderd, inclusief de lege margewrapper. Hero, donkere sectie en afsluitende CTA blijven bestaan.
- Zes deskundigheidsrijen: minimaal 64 px in plaats van 80 px, behoud van drie desktopkolommen, scheidingslijnen en rechts uitgelijnde pijlen.
- Teksten, sectievolgorde, broncontent, header/footer, navigatie, metadata, canonicals en alle bestemmingen blijven behouden.

Geen backend-, authenticatie-, database-, betaal-, e-learning- of featuregatewijziging. Geen dependency toegevoegd.

## Visueel bewijs en meting

Lokale Chromium/IAB-browser, dezelfde branch vóór/na de presentatieaanpassing, anoniem, zonder database of providercredentials. Viewporthoogte 900 px. Paginahoogte inclusief ongewijzigde header/footer, gemeten in CSS-pixels bij normale browserweergave; geen Lighthouse- of CLS-claim. De volledige screenshots kunnen door scrollbarafhandeling enkele pixels afwijken van de afzonderlijke DOM-meting.

| Breedte | Voor | Na | Reductie | Horizontale overflow |
| --- | ---: | ---: | ---: | --- |
| 1440 | 4777 | 4117 | 13,8% | Geen |
| 1280 | 4761 | 4101 | 13,9% | Geen |
| 768 | 6174 | 5358 | 13,2% | Geen |
| 390 | 8375 | 7607 | 9,2% | Geen |
| 320 | 9252 | 8500 | 8,1% | Geen |

De richtwaarde 20–25% is niet kunstmatig afgedwongen. Op mobiel neemt ongewijzigde tekst het grootste deel van de hoogte in. Leesbaarheid, voldoende aanraakruimte en behouden inhoud hebben voorrang.

### Desktop: voor en na

[Volledig voor](images/homepage-compact/before-1440.jpg) · [Volledig na](images/homepage-compact/after-1440.jpg)

### Mobiel: voor en na

[Volledig voor](images/homepage-compact/before-390.jpg) · [Volledig na](images/homepage-compact/after-390.jpg)

## Browseracceptatie

- 1440/1280: twee hero-kolommen, vier stappen horizontaal; alle vier koppen en beschrijvingen beginnen op gelijke hoogte. Geen extra CTA onder de stappen.
- 768: hero en stappen vallen in leesvolgorde onder elkaar; deskundigheden in twee kolommen.
- 390/320: verticale stappen en deskundigheden; hero-knoppen onder elkaar, geen horizontale pagina-overflow of afgesneden tekst waargenomen.
- Hero-CTA's minimaal 44 px hoog; deskundigheidsrijen minimaal 64 px. Focus- en kleurtokens ongewijzigd.
- Mobiel menu: Enter opent, Tab bereikt de eerste link met zichtbare focus, Escape sluit.
- Secundaire hero-CTA bereikt het bestaande `#advieswijzer`-anker.
- Beide keuzevlakken via toetsenbord gecontroleerd: deskundigheidroute kiest Ja en focust de deskundigheidselectie; onderwerproute kiest Nee en focust de onderwerpselectie.
- Geen browserconsolefouten in het gecontroleerde venster.
- Echte 200%-browserzoom en visuele variant: **Product Owner akkoord**. Niet verward met de geautomatiseerde viewportmetingen.
- Geen nieuwe volledige schermlezeraudit uitgevoerd; bestaande semantiek blijft behouden en de kop-/inhoudsstructuur is via DOM en regressietests gecontroleerd.

## Technische validatie

- Nulmeting: 18/18 bestaande homepagetests PASS.
- Na wijziging: 86/86 tests in vijf suites PASS (homepages, opdrachtstart, intakecontract); drie nieuwe gerichte tests voor inhoud, stappen/CTA-afbakening, zes deskundigheden, koppen en sectievolgorde.
- Volledige lint PASS: nul fouten, vier bestaande waarschuwingen in ongewijzigde authenticatiecomponenten (interne window.location.assign-navigatie).
- Standalone TypeScript PASS: nul fouten.
- Productiebuild PASS: 172 statische paginas, drie bestaande Knowledge-filesystemtracingwaarschuwingen. Geen database/providerverbinding gebruikt.
- Diff-check en gerichte secrets-/metadatacontrole PASS; alleen publieke screenshots en homepagebestanden opgenomen. Door Next.js gegenereerde lokale AGENTS.md/next-env.d.ts-verschillen buiten de taak teruggezet.

## Release en rollback

Eén Draft PR vanaf main. Alleen na afzonderlijke merge-/releasebeslissing opnemen. Een terugdraaiing van de homepagecomponent herstelt de vorige presentatie; er zijn geen gegevens-, configuratie- of migratieafhankelijkheden. De eerdere lokale knopverwijdering in de LMS-worktree is niet gewijzigd; dezelfde bedoelde verwijdering zit zelfstandig in deze main-gebaseerde PR.
