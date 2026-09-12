# Publieke copy — eenvoudige Advieswijzer

Gerichte copy-audit op basis van `7eedc6bc94caa0c8079c84b9b04a919c37a3f490`. Geen redesign, wijziging aan de opdrachtflow, matching, Knowledge Engine, accounts, providers of pricing. Geen commit, push, deployment of productiemigratie in deze stap.

## Exacte nieuwe publieke teksten

De twee heroknoppen “Ontdek welke ondersteuning u nodig heeft” en “Vraag ondersteuning aan” zijn vervangen door één primaire knop **Vraag ondersteuning aan**, met bestemming `/advieswijzer`.

**Hero:** Beschrijf waar u ondersteuning bij nodig heeft. Kies direct een deskundigheid of, als u dat nog niet weet, het onderwerp van uw vraag. Daarna kunt u uw opdracht eenvoudig publiceren.

**Inleiding processtappen:** U kiest een deskundigheid of onderwerp, beschrijft uw vraag en publiceert uw opdracht na controle van uw gegevens.

| Processtap | Beschrijving |
|---|---|
| Kies een deskundigheid of onderwerp | Kies zelf een deskundigheid als u die weet. Kies anders het onderwerp van uw vraag. |
| Beschrijf uw vraag | Vertel waar u ondersteuning bij nodig heeft, wat u wilt bereiken en waar en wanneer u wilt starten. |
| Controleer uw opdracht | Bekijk uw ingevulde gegevens en pas ze aan waar nodig. |
| Publiceer uw opdracht | Log in als opdrachtgever en publiceer uw opdracht. Dat kan ook zonder een deskundigheid te kiezen. |

**Homepagekaart “Ik weet nog niet wat ik nodig heb”:** Kies het onderwerp van uw vraag als u de deskundigheid nog niet weet. Beschrijf daarna waar u ondersteuning bij nodig heeft en publiceer uw opdracht.

**Principe “Vraaggestuurd”:** Uw eigen vraag en keuze vormen het uitgangspunt van uw opdracht.

**Afsluitende homepage-uitleg:** U kunt ook zonder een deskundigheid te kennen een opdracht publiceren. Kies het onderwerp van uw vraag en beschrijf waar u ondersteuning bij nodig heeft.

**Advieswijzerkaart op `/wijzers`:** Kies zelf een deskundigheid of, als u die nog niet weet, het onderwerp van uw vraag. Beschrijf uw vraag en publiceer uw opdracht.

**Uitleg op `/over-workmatchr`:** WorkMatchr helpt u uw vraag te beschrijven, zelf een deskundigheid of onderwerp te kiezen en vervolgens een opdracht te publiceren. Hier leest u straks meer over de uitgangspunten van het platform.

## Auditgrenzen en resterende teksten

Gecontroleerd: publieke homepagecontent, publieke pagina's en contentbestanden, Advieswijzerverwijzingen en herkomst van de oudere publieke intakecomponenten. Geen resterende expliciete claim over automatische expertisekeuze gevonden in de actieve gecontroleerde publieke content. Algemene vakinformatie over passende deskundigheid, bronnen en wettelijke context blijft geldig en ongewijzigd. De overige Arbo-wijzers blijven hun eigen functie beschrijven.

De oude `public-intake-workspace.tsx` bevat nog “Aanbevolen deskundigheid”. Die component is via het oude intakeprototype niet meer vanuit een actieve pagina geïmporteerd. Deze oudere implementatie is buiten de copyopdracht gehouden. De bestaande illustratie en algemene metadata over begrijpen en verbinden zijn geen expliciete claim van automatische expertisekeuze en zijn niet veranderd.

## Bestanden en verificatie

Gewijzigd: `src/content/public-homepage.ts`, `src/components/public/public-hero.tsx`, `src/app/page.tsx`, `src/app/wijzers/page.tsx`, `src/app/over-workmatchr/page.tsx`, `src/app/public-homepage.test.tsx`, `src/app/public-platform-pages.test.tsx` en dit rapport.

De homepageasserties controleren één hero-CTA met de juiste tekst en bestemming. Een reeds verouderde homepageassertie over dienst-/sectorkaarten is vervangen door assertions over de actuele opdrachtflow en de behouden kennisroute. De publieke en Advice Request Flow-regressierun slaagt met 128 tests in 13 bestanden.

Lint, afzonderlijke typecheck, productiebuild, diff-check en patroongebaseerde secretscan: PASS. De bestaande buildwaarschuwingen over workspace-root en het Knowledge-bestandspatroon zijn niet aangepast.

Browsercontrole op de lokale productiebuild: desktop 1280 × 900 en mobiel 390 × 844 PASS. Exact één CTA met bestemming `/advieswijzer`; geen overlap of horizontale pagina-overflow (document-/scrollbreedte beide 1265 px op desktop en beide 375 px op mobiel). De knop is 44 px hoog, op desktop passend bij de tekstkolom en op mobiel over de beschikbare breedte. Een klik opent de bestaande Advieswijzer met de eerste Ja/Nee-keuze. Browsererrorlog leeg. Viewportoverride hersteld en tijdelijke preview gesloten.

Git-status na afronding: zeven gewijzigde bron-/testbestanden en dit nieuwe rapport, niets gestaged. De door de build gegenereerde wijziging aan `next-env.d.ts` is teruggezet. HEAD blijft `7eedc6bc94caa0c8079c84b9b04a919c37a3f490`. De oudere experimentele werkmap is niet meegenomen.
