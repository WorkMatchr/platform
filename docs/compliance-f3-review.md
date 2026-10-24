# Integrale F3-review — PR #52 / issue #51

Reviewdatum: 23 oktober 2026. Basis: `9c6f0056189d668e494c563b774c04034a18672f`.
`origin/main`: `a49b59507139ef7121634705da19f781b17845f0`.
De bestaande PR was open, Draft en mergeable; de worktree was schoon.
Daarom is veilig verdergewerkt op `codex/compliance-f3-ux`, zonder andere PR's
of worktrees over te nemen. Dit document vervangt de eerdere inhoudelijke
resultaatacceptatie in `compliance-f3-ux.md`, niet het historische testbewijs.

## Bevestigde tekortkomingen en herstel

| Bevinding | Ernst / oorzaak | Herstel |
| --- | --- | --- |
| Resultaatkaart gaf vooral een algemene verkenningszin. | Middel: presentatie bevatte alleen aanleiding en één generieke suggestie; onvoldoende bruikbaar na vijf vragen. | Elk van de 33 onderwerpen heeft context, een concrete controlevraag, een vervolgstap en een officiële bronlink. Maximaal vier uitgewerkte kaarten; overige onderwerpen afzonderlijk uitklapbaar binnen een gesloten restgroep. |
| Werkgeversbasis, herkenning en interesse waren onvoldoende te onderscheiden. | Middel: dezelfde kaartpresentatie voor verschillende soorten aanleiding. | Tekstuele categorie per onderwerp; interesse is geen bewijs van toepasselijkheid. Uitleg dat volgorde geen urgentiescore is en onbekend/niet geselecteerd geen vrijstelling oplevert. |
| Geen expliciete uitleg over scope bij geen werknemers in dienst. | Laag: de conservatieve regels werkten, maar de toelichting kon duidelijker. | Scopewaarschuwing over werk onder gezag, vrijwilligers en zelfstandigen. Geen nieuwe automatische verplichting of uitzondering. |
| FI2-04-alternatieven waren eerder dubbelzinnig. | Middel, al hersteld in de uitgangscommit van PR #52. | Behoud en uitgebreidere regressiecontrole van OTHER versus NONE_RECOGNIZED/UNKNOWN. Geen herinterpretatie van oude antwoorden. |

Geen nieuwe fout vastgesteld in de opslaglease, hydratatie, exclusiviteit,
logout of toepasselijkheidsengine. Die code is niet ter gelegenheid van deze
review herschreven. De tests zijn uitgebreid om dit aantoonbaar te bewaken.

## Ontwerp- en versiegrens

- `FREE_INTAKE/2.0`, optiecodes, toepasselijkheidsversie en opslagenvelop 3 blijven
  gelijk. Dit is oriëntatiepresentatie, geen nieuwe vragen- of regelversie.
- Alle 33 onderwerpen blijven eenmaal beschikbaar; geen onderwerp krijgt een
  vijfstatusoordeel, score, vrijstelling of vastgestelde tekortkoming.
- Maximaal vier kaarten: informatiebehoefte, directe werksignalen, daarna de
  bestaande werkgeversbasis; stabiele codevolgorde bij gelijke prioriteit.
- `OTHER` bevestigt geen concreet risico. `NONE_RECOGNIZED` en `UNKNOWN` zijn
  exclusief; sector en interesse vormen geen toepasselijkheidsbewijs.
- De nieuwe guidance-data is copy met links, geen tweede Knowledge- of
  beoordelingssysteem. Er wordt niets in een framework gepubliceerd.
- De bestaande CTA blijft `/wijzers/compliance`. De gebruiker leest expliciet
  dat deze vijf antwoorden niet automatisch meegaan; de vervolgwijzer heeft
  zijn bestaande account-/organisatievoorwaarden.
- PR #40 en #49, F4, prijzen, database, auth en historische rapporten blijven
  buiten deze wijziging.

## Inhoud en primaire bronnen

Alle links in `free-intake-v2-guidance.ts` verwijzen naar Arboportaal (SZW) of
de Nederlandse Arbeidsinspectie. Ze zijn op de reviewdatum met de webtool
opgehaald via zoeken/openen. Dit bewijst toegankelijke officiële uitleg, niet juridische
certificering, een onveranderlijke bronrevisie of menselijke goedkeuring.
De twee directe geconsolideerde wetpagina's
`wetten.overheid.nl/BWBR0010346/` en `wetten.overheid.nl/BWBR0008498/`
gaven **HTTP 429**. Een onafhankelijke vergelijking met de volledige actuele
wettekst kon daardoor niet worden afgerond. Er zijn geen nieuwe toetsingsregels,
numerieke grenswaarden of uitzonderingsbesluiten op basis van die ontbrekende
verificatie geïntroduceerd.

### Vraagcontrole

| Vraag | Controle / juridische grens |
| --- | --- |
| FI2-01 personeel | Vijf bestaande keuzes behouden. Werknemers, anderen onder gezag en vrijwilligers blijven onderscheiden. Geen werknemers betekent niet dat alle arboregels vervallen. |
| FI2-02 sector | Zes bestaande sectoren plus anders/onbekend; uitsluitend oriëntatie, geen afgeleide wettelijke plicht. |
| FI2-03 aantal | Personen, geen FTE. 0 wordt expliciet bevestigd; tegenstrijdige personeelskeuze blokkeert verdergaan. De grens 25 alleen geeft geen toetsingsvrijstelling. |
| FI2-04 werk | 25 signalen plus OTHER/NONE_RECOGNIZED/UNKNOWN. Niet-herkend is geen afwezigheid. Geen medische of vrije persoonsgegevens nodig. |
| FI2-05 interesse | Twaalf bestaande opties; stuurt volgorde, geen wettelijke toepasselijkheid. |

### Onderwerpcontrole

De onderstaande grenzen gelden ook wanneer een kaart op basis van alleen
interesse wordt geopend. De controlepunten zijn praktische suggesties, geen
uitputtende wettelijke checklist. De exacte bron per onderwerp staat naast de
tekst in de guidance-data en is zichtbaar op de kaart.

| Codes | Onderwerp en getoetste grens | Primaire toelichting |
| --- | --- | --- |
| C01–C02 | RI&E/plan van aanpak; geen automatische vrijstelling op alleen personeelsaantal. Maximaal 25 vereist aanvullende instrumentvoorwaarden; gezamenlijke arbeidsduur is niet in F3 uitgevraagd. Daarom geen uitzondering berekenen. | [Arbeidsinspectie RI&E-vragen](https://www.nlarbeidsinspectie.nl/onderwerpen/aanleveren-rie/veelgestelde-vragen-rie) |
| C03 | Preventietaken, tijd, deskundigheid; geen automatische zelfvervulling op basis van omvang. | [Preventiemedewerker](https://www.arboportaal.nl/onderwerpen/ondersteuning-bij-arbowet/preventiemedewerker) |
| C04 | Contract en toegang tot bedrijfsarts, ook preventie; geen contractbeoordeling. | [Basiscontract](https://www.arboportaal.nl/onderwerpen/ondersteuning-bij-arbowet/basiscontract) |
| C05 | Hulpverlening/brand/ontruiming; geen vaste BHV-ratio of verplichte jaarlijkse herhaling afgeleid. | [BHV](https://www.arboportaal.nl/onderwerpen/arbozorg/bedrijfshulpverlening/wat-zegt-de-wet-over-bedrijfshulpverlening) |
| C06 | Risicogericht PAGO; onderscheid aanbod en vrijwillige deelname; geen vaste frequentie. | [PAGO](https://www.arboportaal.nl/onderwerpen/arbowet--en--regelgeving/arbobeleid/pago) |
| C07–C08 | Verzuimafspraken en begrijpelijke werkinstructie; geen medische diagnose opvragen, geen individuele re-integratiebeoordeling. | [Verzuim](https://www.arboportaal.nl/onderwerpen/verzuim-en-re-integratie/verzuim), [voorlichting](https://www.arboportaal.nl/onderwerpen/arbozorg/voorlichting-gezondheidsrisicos) |
| C09 | Meldplicht bij overlijden/ziekenhuisopname/blijvend letsel; melding en registratie onderscheiden. Niet wachten op deze wijzer. Details en latere bekendwording via de officiële instructie. | [Arbeidsongevallen](https://www.nlarbeidsinspectie.nl/onderwerpen/arbeidsomstandighedenwet/arbeidsongevallen) |
| C10 | Inspraak passend bij organisatie; F3 beslist niet welke medezeggenschapsvorm verplicht is. | [OR](https://www.arboportaal.nl/onderwerpen/ondersteuning-bij-arbowet/ondernemingsraad-or) |
| R01, R22 | Gebruik, onderhoud, eventuele keuring; drukapparatuur vraagt beoordeling per type. Geen universele keuringsfrequentie. | [Arbeidsmiddelen](https://www.arboportaal.nl/onderwerpen/veiligheid-op-het-werk/arbeidsmiddelen), [drukapparatuur](https://www.arboportaal.nl/onderwerpen/veiligheid-op-het-werk/arbeidsmiddelen/drukapparatuur-keuringen-en-ce-markeringen) |
| R02 | PBM passend bij risico/gebruiker, aanwezigheid bewijst geen veilige situatie. | [PBM en RI&E](https://www.arboportaal.nl/onderwerpen/persoonlijke-beschermingsmiddelen/persoonlijke-beschermingsmiddelen-en-de-risico-inventarisatie-en--evaluatie) |
| R03, R12 | Stoffen/processen en biologische blootstellingsroutes eerst inventariseren; geen blootstellingsnorm afleiden. | [Stoffen](https://www.arboportaal.nl/onderwerpen/risicos-gevaarlijke-stoffen), [biologische agentia](https://www.arboportaal.nl/onderwerpen/biologische-agentia) |
| R04–R05, R18 | Belasting, werkhouding, inrichting; praktische controle, geen verplichte productspecificaties. | [Fysieke belasting](https://www.arboportaal.nl/onderwerpen/fysieke-belasting), [beeldschermwerk](https://www.arboportaal.nl/onderwerpen/fysieke-belasting/computerwerk), [werkplek](https://www.arboportaal.nl/onderwerpen/inrichting-werkvloer) |
| R06 | PSA omvat werkdruk en ongewenst gedrag; geen persoonsgegevens/klachtendetails verzamelen. | [PSA](https://www.arboportaal.nl/onderwerpen/psychosociale-arbeidsbelasting) |
| R07–R08, R17, R21 | Geluid/trillingen/klimaat/straling: inventarisatie en deskundige beoordeling, geen overschrijding uit een checkbox. | [Geluid](https://www.arboportaal.nl/onderwerpen/fysische-factoren/geluid), [trillingen](https://www.arboportaal.nl/onderwerpen/fysische-factoren/trillingen-en-schokken), [fysische factoren](https://www.arboportaal.nl/onderwerpen/fysische-factoren) |
| R09 | Valgevaar niet uitsluitend aan hoogte koppelen; geen automatische goedkeuring ladder/harnas. | [Hoogte](https://www.arboportaal.nl/onderwerpen/inrichting-werkvloer/werken-op-hoogte) |
| R10–R11 | Leeftijd en werkgebonden kwetsbaarheid vragen nadere voorwaarden; geen individuele medische conclusie. | [Jong werkenden](https://www.arboportaal.nl/onderwerpen/rechten-plichten-werkenden/jong-werkenden), [zwangerschap/werk](https://www.arboportaal.nl/onderwerpen/rechten-plichten-werkenden/kinderwens-zwanger-borstvoeding-en-werk) |
| R13–R14 | Alleenwerk: bereikbare hulp; nacht-/ploegendienst: rooster/rust. Geen generiek verbod of roosternorm berekend. | [Alleenwerk](https://www.arboportaal.nl/onderwerpen/inrichting-werkvloer/alleen-werken), [werktijden](https://www.arboportaal.nl/onderwerpen/arbowet--en--regelgeving/werk--en-rusttijden-arbeidstijdenwet) |
| R15–R16 | Locatieafstemming en verkeersbewegingen; concrete controle zonder aansprakelijkheidsuitspraak. | [Opdrachtgeverschap](https://www.arboportaal.nl/onderwerpen/arbowet--en--regelgeving/verantwoord-opdrachtgeverschap), [aanrijdgevaar](https://www.arboportaal.nl/onderwerpen/inrichting-werkvloer/aanrijdgevaar) |
| R19–R20, R23 | Brand, elektriciteit en explosie: risico's/werkwijze laten beoordelen; geen ATEX-zone of bevoegdheid automatisch vaststellen. | [Brand](https://www.arboportaal.nl/onderwerpen/veiligheid-op-het-werk/brandveiligheid), [elektriciteit](https://www.arboportaal.nl/onderwerpen/inrichting-werkvloer/elektriciteit), [explosie](https://www.arboportaal.nl/onderwerpen/inrichting-werkvloer/explosieve-atmosfeer) |

Werkgeversscope apart: [algemene rechten/plichten](https://www.arboportaal.nl/onderwerpen/rechten-plichten-werkenden/algemene-rechten--plichten-van-werkenden)
en [vrijwilligers](https://www.arboportaal.nl/onderwerpen/rechten-plichten-werkenden/vrijwilliger).
Er wordt geen vrijstelling afgeleid voor vrijwilligers, derden of zelfstandigen.
Een reviewer moet bij toekomstige juridische beslisregels de actuele
geconsolideerde bepalingen en uitzonderingen opnieuw rechtstreeks verifiëren.

## Automatische validatie

Finale gerichte run: **162/162 tests, 6/6 suites PASS** (35,25 s).

```text
npm run test -- --maxWorkers=1 src/lib/compliance/free-intake-storage.test.ts src/lib/compliance/free-intake-v2.test.ts src/lib/compliance/free-intake-v2-presentation.test.ts src/components/public/compliance-free-intake-v2.test.tsx src/components/auth/logout-compliance-draft.test.tsx src/components/layout/header-logout.test.tsx
```

- 6.720 combinaties: alle 5 personeelskeuzes × 4 omvangkeuzes × 28 FI2-04-opties
  × 12 interesses. Zelfde toepasselijkheid als het domein, alle 33 onderwerpen
  eenmaal, maximaal vier kaarten, geen onterechte werkgeverscategorie.
- Onafhankelijke verwachte mapping voor alle 25 concrete werksignalen en alle
  300 tweetallen, naast de 25 enkelvoudige gevallen. Onbekend en niet herkend
  leveren nooit afwezigheid op. Dit is niet een brute-forcecontrole van alle
  mogelijke subsets van de meerkeuzevragen; die claim wordt niet gemaakt.
- UI: ontbrekende eerdere antwoorden blokkeren afronden; teruggaan behoudt
  selectie; resultaatfocus; afronden en opnieuw beginnen wissen de kopie.
- Opslag: uitsluitend expliciet, 24 uur zonder verlenging, TTL-grens,
  legacy/A07-concepten, corrupte/geblokkeerde opslag, stale tabs en hydratatie.
- Logout: waarschuwing, annuleren, gerichte wissing, signOut-aanroep en
  foutafhandeling met mocks. Dit bewijst niet zelfstandig een echte
  serversessiebeëindiging; eerder synthetisch browser-/databasebewijs staat
  in `compliance-f3-free-intake.md` en is niet als nieuwe test geteld.
- Eerste testpoging in de sandbox stopte vóór tests door EPERM op de Vite-cache.
  De finale run buiten die sandbox slaagde; assertions/limieten niet versoepeld.
- Volledige lint: PASS. Standalone TypeScript: **BASELINE_FAILURE**, uitsluitend
  vier TS2345 readonly-arrayfouten in `rule-engine.test.ts:13,14,23,24`.
  Dit bestand en de regelengine zijn identiek aan `origin/main`; geen nieuwe
  fout in taakbestanden. Geen unrelated herstel.

- Productiebuild: PASS, 163/163 pagina's en ingebouwde TypeScript-check geslaagd.
  Bekende waarschuwingen: meerdere worktree-lockfiles/rootdetectie en brede
  kennisbank-NFT-filetracing. Geen taakgerelateerde buildfout.
- Diff-check: PASS. Secretpatrooncontrole op uitsluitend de taakbestanden:
  nul treffers. Geen lokale configuratie, database, account of screenshot in Git.

## Browseracceptatie op de finale build

De Windows-host en de browser bereikten
`http://127.0.0.1:3049/wijzers/compliance/scan`; HTTP 200. Server uit deze
worktree, alleen localhost, F4/contactformulier uit, geen echte databaseverbinding.

- Ontbrekend antwoord: zichtbare fout, focus op eerste radio; geen overslaan.
- Alle vijf vragen, terug/vooruit en behouden sector/personeelskeuze: PASS.
- Machines + Lawaai + OTHER, daarna NONE en UNKNOWN met spatie: exclusiviteit
  bevestigd. Nieuwe concrete keuze schakelt UNKNOWN uit.
- Expliciet bewaren, echte herlaad op vraag 4, Machines/Lawaai hersteld: PASS.
- Voorbeeld werknemers/Industrie/1–25/Machines+Lawaai/BHV: vier kaarten
  BHV, arbeidsmiddelen, geluid en RI&E; 29 overige onderwerpen gesloten.
  Concrete controlevragen/vervolgstappen/bronnen zichtbaar.
- Uitsluitend onbekende antwoorden: geen shortlist, 33 overige onderwerpen;
  geen vrijstelling. Vrijwilligers + expliciet 0 + geen situatie herkend:
  eveneens 0+33 en zichtbare scopewaarschuwing.
- Disclosure open met Enter, dicht met spatie; Tab naar herstartknop heeft
  zichtbare outline (2,4 CSS-px in de browser). Resultaatheading krijgt focus.
- CTA opent de bestaande `/wijzers/compliance`, met de publieke toelichting
  en bestaande login/registratiegate; geen antwoorden in URL of automatische
  overname. Geen account aangemaakt.
- Desktop 1280, tablet 768, mobiel 390 en aanvullende reflowbreedte 640:
  scrollbreedte niet groter dan viewport; geen overlappende/afgesneden controls.
  Desktop twee kolommen, mobiel één; CTA's blijven bereikbaar.
- Tekstcontrast op wit: primaire linkkleur 4,87:1, secundaire tekst 6,14:1,
  brand-dark 14,89:1 (bestaande tokens). H1/H2/H3-hiërarchie, native labels,
  radio/checkbox/details, termen/definities en zichtbare focus behouden.
- Console: geen errors/warnings of hydratatiefouten tijdens de browserrun.
  Serverlog bevat alleen de bekende worktree-rootwaarschuwing.
- Na nieuwe intake en herlaad: lege vraag 1, nul geselecteerde antwoorden,
  geen hersteld concept. Precieze sleutelwissing aanvullend met tests bewezen.
- Screenshots buiten Git: `f3-review-result-desktop.png` en
  `f3-review-result-mobile.png` in de Codex-visualisatiemap.

## Alle 25 controlepunten

PASS is beperkt tot het hieronder genoemde bewijs. Een mocktest wordt niet
voorgesteld als een actuele ingelogde browsertest. Technische gereedheid is
geen productievrijgave of menselijke juridische eindgoedkeuring.

| Controle | Status | Bewijs / beperking |
| --- | --- | --- |
| F3-01 begrijpelijke vragen | PASS | Vijf vragen, helpteksten en vijf personeelsopties gecontroleerd; geen overbodige nameninstructie bij FI2-01. |
| F3-02 antwoordopties | PASS | OTHER onderscheiden; NONE/UNKNOWN exclusief, ook via toetsenbord en oude opslag. |
| F3-03 combinaties | PASS | 6.720 combinaties en 325 enkel-/dubbele signaalgevallen; geen claim alle mogelijke subsets uitputtend getest te hebben. |
| F3-04 nuttig compact resultaat | PASS | Vier uitgewerkte kaarten, rest gesloten; nieuw screenshot. Definitieve tekstwaardering blijft PO-review. |
| F3-05 onderscheid aanleiding | PASS | Werkgeversbasis, werksituatie, informatiebehoefte en nog niet onderzocht zichtbaar onderscheiden. |
| F3-06 concrete begeleiding | PASS | Alle 33 onderwerpen context, praktische vraag, vervolgstap en bron; eerste vier direct zichtbaar. |
| F3-07 onbekend niet afwezig | PASS | Geen automatische uitsluiting; onbekend/geen herkenning/0 in tests en browser. |
| F3-08 vervolgstap | PASS | Bestaande CTA aangeklikt; geen automatische antwoordoverdracht expliciet vermeld. |
| F3-09 navigatie | PASS | Alle vijf, terug/vooruit, foutfocus, herstart. |
| F3-10 selecties/herstel | PASS | Native invoer, exclusiviteit met spatie, opgeslagen herstel na herladen. |
| F3-11 bewaartermijn | PASS | Expliciete lease; grensgevallen met gecontroleerde klok getest, niet 24 uur in browser gewacht. |
| F3-12 wissen/herstart | PASS | Opslagtests plus schone vraag 1 na afronden/herstart/herladen. |
| F3-13 zonder account | PASS | Volledige intake anoniem; geen database of netwerk nodig voor antwoorden/resultaat. |
| F3-14 responsive | PASS | 1280/768/390 px, aanvullend 640 px reflow, geen horizontale overflow. |
| F3-15 toegankelijkheid/zoom | PASS | Labels, semantiek, focus, toetsenbord, contrast; 200% PO-standaardacceptatie, nieuwe echte zoom niet automatisch gemeten. |
| F3-16 automatische validatie | PASS | 162 tests, lint/build groen; standalone TS bevat alleen vier vastgestelde baselinefouten. |
| F3-17 juridische conclusies | PASS | Geen nieuwe beoordelingsregel, vrijstelling, vijfstatus of tekortkoming. |
| F3-18 primaire broncontrole | PASS | Officiële toelichtingen gecontroleerd; directe wetten.overheid.nl-verificatie BLOCKED door 429, geen nieuwe wettelijke beslisregels daarop gebaseerd. |
| F3-19 productgrens | PASS | Oriëntatiedisclaimer, geen certificering, F4/betaalde scan niet geactiveerd. |
| F3-20 privacy/sessies | PASS | Nieuwe echte login/logout- en accountwisselingproef op geïsoleerde lokale database; onbewaard/bewaard concept, annuleren, bevestigen, tweede tabblad en nul resterende sessies gecontroleerd op 23 oktober. |
| F3-21 bevindingen afhandelen | PASS | Bevestigde inhoudelijke tekortkomingen hersteld; geen overige taakregressie gevonden. |
| F3-22 finale checks | PASS | Finale testset/lint/typecheck/build/diff/secretcontrole uitgevoerd; baseline apart. |
| F3-23 volledige finale intake | PASS | Specifiek, uitsluitend onbekend en nul werknemers doorlopen op laatste productiebuild. |
| F3-24 PR-gereedheid | PASS | Geïsoleerde taakdiff, bestaande Draft PR #52; geen mergebesluit of productieclaim. |
| F3-25 releasechecklist | PASS | Onderstaande controle- en rollbackstappen; geen productiehandeling uitgevoerd. |

## Wijzigingsset en technisch advies

Deze reviewcommit wijzigt uitsluitend:

- `docs/compliance-f3-review.md` (nieuw)
- `docs/compliance-f3-ux.md`
- `src/components/public/compliance-free-intake-v2.tsx`
- `src/components/public/compliance-free-intake-v2.test.tsx`
- `src/lib/compliance/free-intake-v2-guidance.ts` (nieuw)
- `src/lib/compliance/free-intake-v2-presentation.ts`
- `src/lib/compliance/free-intake-v2-presentation.test.ts`
- `src/lib/compliance/free-intake-v2.test.ts`

De bestaande eerdere PR-wijziging aan `free-intake-v2.ts` exporteert uitsluitend
de bestaande mappings. Dit bestand is in de reviewcommit niet opnieuw gewijzigd.
Geen package, lockfile, routing, sessiecode, opslagcode, migratie of backend gewijzigd.
De door Next gegenereerde `next-env.d.ts`-padwijziging is teruggebracht en uitgesloten.

**Actueel technisch advies: GO voor technische afronding van werkpakket 1.**
Alle 25 controlepunten hebben technisch bewijs; de ontbrekende ingelogde
browserproef is op 23 oktober uitgevoerd. De eerdere Dockerblokkade is opgelost.
De bekende standalone TypeScript-baseline en beperkte rechtstreekse wetstoegang
blijven expliciet zichtbaar. Dit is geen juridische of Product Owner-vrijgave
en geen toestemming voor merge/deployment. PR blijft Draft.
De exacte commit en actuele CI/previewstatus staan in PR #52; historische
checkresultaten mogen niet als bewijs voor een nieuwe commit worden gebruikt.

## Releasechecklist — geen uitvoering

1. Beoordeel de compacte kaarten en praktische copy als gratis oriëntatie.
   Dit is geen menselijke juridische certificering of F4-vrijgave.
2. Controleer exacte PR-head, diff en actuele CI/preview; neem geen A07/F4-code
   of lokale configuratie mee. CI bevat niet automatisch alle 162 F3-tests;
   de lokale gerichte run blijft afzonderlijk bewijs.
3. Behoud de bestaande antwoorden, 24-uurslease, logoutwaarschuwing en CTA.
4. Merge en productie-uitrol vereisen afzonderlijk akkoord. Geen migratie nodig.
5. Controleer na eventuele uitrol anoniem de vijf vragen, specifieke en onbekende
   antwoorden, bewaren/herladen, disclosure, CTA, opnieuw beginnen en console.
   Controleer in een geautoriseerde testomgeving opnieuw logout als auth of
   opslag ondertussen gewijzigd is.
6. Rollback: revert de presentatiecommit(s). Geen nieuwe opslagversie, database-
   of frameworkrollback nodig. Bestaande concepten behouden dezelfde betekenis.

## Menselijke acceptatie en beperkingen

- Product Owner heeft 200% zoom als standaard geaccepteerd; geen nieuwe
  afzonderlijke zoomgoedkeuring gevraagd. Een smallere viewport is alleen
  aanvullende reflowcontrole, geen bewijs van echte browserzoom.
- Definitieve waardering van de nieuwe resultaatteksten blijft Product Owner-
  review. Nieuwe juridische beslisregels vereisen afzonderlijke inhoudelijke
  review en liggen buiten F3.
- De ingelogde browser-/databaseproef van 23 oktober hieronder vult de eerdere
  anonieme controle aan; de logout- en sessiecode zijn niet gewijzigd.
- Geen claims over productiedeployment, productieaccounts of database-integriteit
  op basis van deze lokale presentatiechecks.

## Vervolgcontrole opeenvolgende werkpakketten — 22 oktober 2026

- Actuele PR #52-head: `f627cfd372c75dd274c33bc14385f5b7c1ab907a`;
  branch `codex/compliance-f3-ux`, OPEN/Draft. Worktree vóór deze rapportaanvulling schoon.
- Na fetch is `origin/main` nog `a49b59507139ef7121634705da19f781b17845f0`.
- Dezelfde zes gerichte suites opnieuw uitgevoerd: **162/162 PASS**, 6/6 suites,
  58,59 seconden. Opslag, TTL, legacy, exclusiviteit, hydratatie, logoutwaarschuwing
  en headerlogout blijven gedekt. Er is geen productcode gewijzigd.
- GitHub `verify` runs `39833243631` en `39833251865`: PASS op bovenstaande head.
  Bestaande Vercel-preview: PASS. Er is geen nieuwe deployment gestart.
- Lokale openbare intake op `http://127.0.0.1:3049/wijzers/compliance/scan`
  browsermatig bereikbaar: lege eerste vraag, vijf opties, correcte toelichting.
  Deze server heeft geen werkende testdatabase en bewijst geen ingelogde sessie.
- Docker Linux-engine niet bereikbaar: named pipe `dockerDesktopLinuxEngine`
  ontbreekt; PostgreSQL-poort 5432 gesloten. Docker Desktop is gestart, maar
  `docker-desktop` WSL-distributie en `com.docker.service` blijven gestopt.
  De service kon met de beschikbare Windows-rechten niet worden geopend/gestart.
- Geen nieuwe database, synthetische gebruiker of sessie aangemaakt. Geen
  bestaande database, gebruikers of migratiegeschiedenis gewijzigd.
- **F3-20 blijft NOT TESTED; uitvoering BLOCKED door lokale testinfrastructuur.**
  Voor de volledige technische afsluiting is een werkende lokale Docker-engine
  nodig, gevolgd door een nieuwe geïsoleerde database en de daadwerkelijke
  login/logout-/accountisolatieproef. De vraag aan de Product Owner staat open.
- Lint/build zijn in deze documentatieronde niet opnieuw uitgevoerd: broncode
  ongewijzigd, eerdere resultaten hierboven. Diff-check opnieuw PASS.

Volgens de expliciete volgordevoorwaarde beginnen werkpakket 2 (F4 technische
controle) en werkpakket 3 (juridisch dossier #50) pas na technische afronding
van F3. Zij zijn in deze ronde **NOT STARTED**, niet goedgekeurd of afgekeurd.
PR #49, issue #50, A07 en alle F4-bestanden blijven ongemoeid. Hun afzonderlijke
rapporten volgen bij uitvoering; er wordt geen onderzoek geclaimd dat niet is gedaan.

## Afronding sessieacceptatie — 23 oktober 2026

- Getest op PR-head `8b82fa6b5934c395b44ce586ee0c76ce524df6e1`, zonder
  productcodewijzigingen. De zes gerichte suites slagen opnieuw: **162/162**,
  6/6 suites, 75,25 seconden.
- Nieuwe geïsoleerde database `workmatchr_f3_browser_test_4460_1792735636136`
  op lokale PostgreSQL 17; 85/85 migraties werkelijk vanaf nul uitgevoerd,
  nul mislukte migraties en alle namen/checksums gelijk aan de worktree.
- Twee synthetische example.invalid-accounts in afzonderlijke organisaties,
  met bestaande Better Auth-wachtwoordhashing en reguliere inlogflow.
  Server uitsluitend lokaal op 3050; geen externe mailtransportcredentials.
- Onbewaarde invoer: logoutwaarschuwing zichtbaar, annuleren behoudt invoer
  en sessie; bevestigen beëindigt de echte sessie en wist het concept.
  `/dashboard` verwijst daarna naar inloggen; database telt nul sessies.
- Expliciet bewaard concept: vraag 2 met Industrie na herladen hersteld.
  Tweede tabblad herstelt dezelfde keuze. Escape sluit de logoutdialoog,
  behoudt invoer en geeft focus terug aan Uitloggen. Bevestigen wist het
  concept; het tweede tabblad toont de verwijdermelding en een lege vraag 1.
- Account B ziet uitsluitend organisatie B en een lege intake, zonder
  sector/antwoord van account A. Daarna ook B uitgelogd: nul sessies en nul
  opgeslagen beoordelingen in de tijdelijke database. Geen consolewaarschuwingen,
  fouten of hydratatiefouten in de gecontroleerde browsertab.
- Opslagwissing is browsermatig vastgesteld via reset, herladen en accountwisseling;
  de exacte opslagkeys/TTL worden aanvullend door de regressietests bewezen.
- Acceptatieserver gestopt; uitsluitend deze tijdelijke database en de genegeerde
  `.local-storage/f3-acceptance/`-fixtures/logs verwijderd. Database- en rolidentiteiten
  vóór en na zijn gelijk. Bestaande databases zijn niet aangepast; geen algemene
  inhoudschecksum van bestaande databases geclaimd. De publieke PO-server op 3049
  blijft beschikbaar.
- Geen testgeheimen of fixtures toegevoegd aan Git. Alleen de twee F3-rapporten
  worden bijgewerkt. Werkpakket 1 is technisch afgerond; werkpakket 2 mag starten.
- Finale volledige lint en productiebuild PASS (163 routes). Eerste buildpoging
  miste DATABASE_URL; herhaling met uitsluitend onbereikbare lokale buildplaceholder
  en tijdelijke processecret slaagt. Geen productieverbinding. Standalone TypeScript
  bevestigt uitsluitend de vier bestaande TS2345-readonly-arrayfouten in
  `rule-engine.test.ts` (13, 14, 23, 24). Diff-check en secrets-patrooncontrole PASS.
  De gegenereerde next-env-padwijziging is weer uitgesloten.
