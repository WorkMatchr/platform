# F3 gebruikerservaring — issue #51

Basis: main `a49b59507139ef7121634705da19f781b17845f0` (gemergede F3 #47).
Branch: `codex/compliance-f3-ux`. Geen wijzigingen aan PR #40 of #49.

**Actuele integrale review (22 oktober 2026):** zie
[compliance-f3-review.md](compliance-f3-review.md) voor alle 25 controlepunten,
broncontrole, concrete resultaatkaarten en beperkingen. Het resultaat heeft nu
maximaal vier uitgewerkte kaarten met controlepunt, vervolgstap en officiële
toelichting. De eerdere korte verkenningssuggesties hieronder beschrijven de
uitgangssituatie van PR #52. De finale regressies omvatten 162 tests.
200%-zoom is inmiddels door de Product Owner als standaard geaccepteerd;
er wordt geen nieuw afzonderlijk zoomakkoord gevraagd.

## Vastgestelde problemen en oplossing

- FI2-04 had al exclusieve `NONE_RECOGNIZED` en `UNKNOWN`, maar presenteerde
  deze samen met `OTHER` als dubbelzinnige “Overige keuzes”.
- De nieuwe presentatielaag onderscheidt aanvullende, mogelijk niet genoemde
  werkzaamheden van “geen van de genoemde situaties herkend” en “nog niet
  kunnen inschatten”. De twee laatste keuzes sluiten elkaar én alle concrete
  keuzes uit. Muis en toetsenbord gebruiken dezelfde native checkboxes en
  bestaande togglefunctie.
- Niet geselecteerd betekent nooit afwezig. `OTHER` blijft een mogelijk
  onbenoemde situatie, geen bevestigd risico. Er wordt geen vrije tekst gevraagd.
- Het resultaat toonde alle 33 onderwerpen direct, met herhaalde algemene
  toelichtingen. Nu verschijnen maximaal zes onderwerpen in deze vaste volgorde:
  expliciete informatiebehoefte, concrete werksignalen, personeelskeuze.
  Binnen dezelfde prioriteit geldt de bestaande brede voorkeur voor
  risicothema's en daarna een stabiele codevolgorde. Dit is presentatievolgorde,
  geen juridische ernstscore.
- Iedere geselecteerde kaart geeft de aanleiding en een korte, onderwerpgerichte
  verkenningssuggestie. De overige onderwerpen staan in een standaard gesloten
  native `details` met het exacte resterende aantal, inclusief eventuele
  relevante onderwerpen buiten de eerste zes. Alle 33 onderwerpen blijven
  eenmaal bereikbaar. Onderwerpen zonder concrete aanleiding krijgen geen
  herhaalde, generieke uitleg.
- Bij uitsluitend onbekende antwoorden ontstaat geen verzonnen shortlist.
  Alle 33 onderwerpen blijven ingeklapt beschikbaar en de vervolgstap blijft
  zichtbaar.
- De vervolgstap blijft `/wijzers/compliance`, met expliciete toelichting dat
  de intakeantwoorden nog niet worden overgenomen.

## Versie- en veiligheidsgrens

De bevroren FI2-vraagdefinities en alle optiecodes blijven behouden in
`free-intake-v2.ts`. Alleen de bestaande signalen-/interessemappings worden
exporteerbaar gemaakt voor hergebruik; er ontstaat geen tweede regelengine.
De verduidelijkte zichtbare teksten staan in `free-intake-v2-presentation.ts`.

Dit is een presentatiecorrectie, geen nieuwe vraagset of herinterpretatie van
antwoorden. Daarom blijven `FREE_INTAKE/2.0`, de toepasselijkheidsversie,
opslagenvelop 3 en opslagkey ongewijzigd. Er is geen datamigratie nodig.
Tests bewaken dezelfde opties, exclusiviteit en toepasselijkheid. Oude
`OTHER`, `UNKNOWN` en `NONE_RECOGNIZED` worden ongewijzigd hersteld; de oorspronkelijke
bewaartermijn blijft staan. Een tegenstrijdige opgeslagen combinatie levert
geen positief bewijs: de vraag moet opnieuw worden beantwoord, zonder
willekeurig een optie te kiezen of de opgeslagen kopie bij lezen te wijzigen.

Vijftienvragenconcepten, expliciet bewaren, 24-uurs-TTL, herstel na mount,
multi-tabgedrag en de logoutwaarschuwing gebruiken ongewijzigd de bestaande
F3-code. Geen vijfstatusbeoordeling, wettelijke conclusie, automatische
vrijstelling, backend-, database-, auth-, prijs- of financiële wijziging.

## Productreview

PC-001/003/023: korte eerste selectie, minder herhaling.
PC-008/048/070: geen nieuwe juridische gevolgtrekking of zekerheid.
PC-035: CTA beschrijft de bestaande gratis vervolgstap.
PC-043/057: bestaande antwoorden blijven behouden met dezelfde betekenis.
PC-062/064/066: native checkbox/details, zichtbare focus, tekstuele labels,
bestaande kaarten en designtokens. Geen onnodige nummering.

## Validatie en acceptatie

Uitgevoerd op 20 oktober 2026:

- Gerichte regressies: **138/138 tests, 6/6 suites PASS**, één worker.
  Suites: `free-intake-storage`, `free-intake-v2`, `free-intake-v2-presentation`,
  `compliance-free-intake-v2`, `logout-compliance-draft`, `header-logout`.
  Inclusief oude concepten, oorspronkelijke TTL, ongeldige combinaties,
  onbekend/niet herkend, alle 33 onderwerpen zonder duplicaten, hydratatie,
  geblokkeerde opslag en logoutwaarschuwing.
- Volledige `npm run lint`: PASS.
- `npm run build`: PASS, 163/163 pagina's, inclusief ingebouwde TypeScript-check.
  Bestaande waarschuwingen over meerdere lockfiles/workspaceroot en de
  kennis-uploadbestandsanalyse blijven zichtbaar; geen buildfout.
- Standalone `npm run typecheck`: **BASELINE_FAILURE**. Uitsluitend vier
  TS2345-fouten over readonly-arrays in `src/lib/compliance/rule-engine.test.ts`
  op regels 13, 14, 23 en 24. Deze staan al in het gemergede F3-rapport.
  Testbestand en regelengine zijn identiek aan `origin/main`; geen fout uit
  de zeven taakbestanden. Geen unrelated herstel uitgevoerd.
- `git diff --check`: PASS. Secretpatrooncontrole op de zeven taakbestanden:
  nul treffers.

Echte browsercontrole op de lokale productiebuild:
`http://127.0.0.1:3049/wijzers/compliance/scan`. Alleen synthetische antwoorden;
geen werkende databaseverbinding, account, externe mail of productieactie.

- Alle vijf vragen doorlopen; terug/vooruit behoudt antwoorden.
- Machines + Lawaai + OTHER: beide exclusieve alternatieven uit.
  NONE via spatie schakelt concrete keuzes uit; Tab + spatie op UNKNOWN
  schakelt NONE uit. Opnieuw een concrete keuze schakelt UNKNOWN uit.
- Expliciet bewaren en echte paginaherlaad: dezelfde drie keuzes hersteld.
  Afronden verwijdert de opgeslagen kopie; opnieuw openen start leeg.
- BHV-informatiebehoefte + Machines/Lawaai + werknemers: zes kaarten in
  verwachte volgorde, 27 overige onderwerpen standaard ingeklapt.
- Alle vijf antwoorden onbekend: geen schijnselectie, 33 onderwerpen
  ingeklapt; vervolgstap blijft beschikbaar.
- Disclosure open/dicht met Enter/spatie; Tab bereikt de CTA met zichtbare
  focus. CTA opent de bestaande `/wijzers/compliance`.
- Desktop 1280 px en mobiel 390 px: leesbare kaarten/keuzes, bereikbare
  knoppen, geen horizontale overflow (scrollbreedte gelijk aan viewport).
- Bestaande tekstkleuren: secundaire tekst op wit 6,14:1; brand-dark op wit
  14,89:1. Native checkboxlabels, headings en disclosure blijven toegankelijk.
- Browserconsole: geen waarschuwingen of fouten, geen hydratatiefout.
- Nieuwe intake starten: leeg formulier. Geen synthetisch concept achtergelaten.

Werkelijke sessiebeëindiging met een ingelogd account is in deze opdracht
niet opnieuw browsermatig uitgevoerd; de ongewijzigde logout-/opslagcode wordt
door de bestaande gerichte regressies bewaakt. De eerdere F3-browseracceptatie
is afzonderlijk vastgelegd in `compliance-f3-free-intake.md`.

De hierboven beschreven browserrun is het historische bewijs van 20 oktober.
De nieuwe resultaatweergave en de actuele acceptatieafspraken staan in het
integrale reviewrapport. Functionele beoordeling van de nieuwe teksten blijft
een Product Owner-besluit; 200%-zoom is als standaard geaccepteerd.

## Exacte wijzigingsset

- `docs/compliance-f3-ux.md`
- `src/components/public/compliance-free-intake-v2.tsx`
- `src/components/public/compliance-free-intake-v2.test.tsx`
- `src/lib/compliance/free-intake-v2.ts`
- `src/lib/compliance/free-intake-v2.test.ts`
- `src/lib/compliance/free-intake-v2-presentation.ts`
- `src/lib/compliance/free-intake-v2-presentation.test.ts`

De review voegt `src/lib/compliance/free-intake-v2-guidance.ts` en
`docs/compliance-f3-review.md` toe. De totale PR bevat daarmee negen taakbestanden.
Technisch advies en actuele browser-/validatieresultaten staan in het integrale
reviewrapport. Geen merge, productiemigratie of productiedeployment uitgevoerd.
