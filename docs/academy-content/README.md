# Academy — drie cursuscontentkandidaten

Controle op 4 november 2026. Branch `codex/academy-content-approval`, gebaseerd op de afzonderlijke lokale LMS-kandidaat `c7e71db1f2850fbee50757b57c84ccf2607e6762`. Dit pakket verandert uitsluitend content, reviewdocumentatie en contenttests. Geen runtime-, schema-, seed- of productieaanpassing.

De drie concepten zijn volledig beschikbaar voor inhoudelijke beoordeling, maar **nog niet integraal READY FOR CONTENT APPROVAL volgens alle technische criteria van de opdracht**. De verliesvrije Academy-beheerintegratie is geblokkeerd. Bij WL-001 zijn bovendien expliciete summatieve dekkingshiaten zichtbaar. Menselijke inhoudelijke/juridische en toetskundige vrijgave blijft OPEN; cursuspublicatie NO-GO.

## Cursussen en omvang

| Cursus | Herkomst → kandidaat | Hoofdstukken / uitleglessen | Blokken | Formatief, inclusief checks | Eindtoets | Kennisbehoud | Raming inclusief examen |
|---|---|---|---:|---:|---:|---:|---|
| WL-001 — RI&E in de praktijk | prototype-0.17 / examen1.1 → COURSE-1.0-DRAFT | 10 / 73 TEXT-uitlegeenheden | 457 | 214, waarvan 51 checks | 50 | 100 | 300 min, waarvan 45 examen |
| WL-002 — Preventiemedewerker in de praktijk | COURSE-1.2 → COURSE-1.3 DRAFT | 10 / 60 lessen met casus en toepassing | 342 | 90, waarvan 30 checks | 50 | 100 | 295 min, waarvan 45 examen |
| WL-003 — Veilig en gezond werken | COURSE-1.0 → COURSE-1.1 DRAFT | 10 / 60 lessen met casus en toepassing | 321 | 90, waarvan 30 checks | 50 | 100 | 288 min, waarvan 50 examen |

Een TEXT-blok is niet bij iedere cursus één volledige les: WL-002/003 gebruiken ook afzonderlijke toepassings- en antwoordmodelblokken. De 111 hoofdstukchecks zijn subsets van de394 formatieve vragen. Er zijn 1120 lesblokken en 844 vragen over de drie banken samen. Er zijn geen nieuwe wettelijke certificeringsclaims toegevoegd.

De ramingen bevatten lezen, scenarioafwegingen, kenniscontroles, reflectie en examen. Woordtellingen en hoofdstukberekeningen staan in de individuele JSON-dossiers. Kennisbehoud na afronding en onderzoek op een echte werkplek zijn niet meegerekend. Geen gemeten pilot of gegarandeerde duur: met name WL-001 kan bij langzamer lezen meer dan vijf uur vragen.

## Scorecard

PASS hieronder betekent structureel aanwezig en technisch gecontroleerd als concept; het is geen menselijke inhoudelijke goedkeuring.

| Onderdeel | WL-001 | WL-002 | WL-003 |
|---|---|---|---|
| Cursusinhoud compleet | PASS als concept | PASS als concept | PASS als concept |
| Leerdoelen compleet | PASS: 104 geïnventariseerd; toetsdekking deels OPEN | PASS: 40 met bindingsvoorstel | PASS: 40 met bindingsvoorstel |
| Hoofdstukken en lessen | PASS | PASS | PASS |
| Praktijkopdrachten | PASS | PASS, inclusief 10 portfolio-opdrachten | PASS, 60 casussen/toepassingen |
| Kenniscontroles | PASS; conversiereview OPEN | PASS, 240 bronvragen behouden | PASS; drie vraagrevisies |
| Eindtoets | BLOCKED voor volledige inhoudelijke acceptatie: 18 doelen niet expliciet,25 gedeeltelijk gedekt | PASS contract/dekking; toetsreview OPEN | PASS contract/dekking; toetsreview OPEN |
| Studieduur 4–5uur | PASS raming; pilot OPEN | PASS raming; pilot OPEN | PASS raming; pilot OPEN |
| Certificaatvoorwaarden | PASS bestaande contract, geen echte uitgifte | PASS bestaande contract, geen echte uitgifte | PASS bestaande contract, geen echte uitgifte |
| Bronnen gecontroleerd | BLOCKED voor volledige juridische acceptatie | BLOCKED voor volledige juridische acceptatie | BLOCKED voor volledige juridische acceptatie |
| Academy-preview | BLOCKED ingelogd; lokale rendererPASS | BLOCKED ingelogd; lokale rendererPASS | BLOCKED ingelogd; lokale rendererPASS |
| Inhoudelijke vrijgave | OPEN | OPEN | OPEN |

## Concrete wijzigingen

- WL-001: alle 455 bronblokken overgenomen, plus zichtbare oriëntatie en afrondingsvoorwaarden. Nieuwe versies voor noodzakelijke vraagtypeconversies; alle oorspronkelijke uitspraken behouden. Onjuist MULTI-type met één juist antwoord hersteld. Atlas-casus en toetsingsnuance verduidelijkt; dubbele vraagstam en examenweergave gecorrigeerd. Alle 214 zichtbare prompts volgen nu de gekoppelde vraagversie. Alle 104 doelen vastgelegd: 61 directe, 25 gedeeltelijke en 18 niet-expliciete summatieve bindingsvoorstellen.
- WL-002: bestaande meest recente Draft 1.2 en alle 240 vragen/antwoordsemantiek behouden. Tien concrete portfolio-opdrachten met antwoordcriteria en zichtbare cursus-/certificaatinstructie toegevoegd.
- WL-003: bestaande 60 lessen en complete banken behouden. Gerichte verduidelijking van maatregelenhiërarchie, beeldscherm-afwisseling en ongevalmelding. Drie inhoudelijk aangepaste vragen hebben nieuwe revisies. Oriëntatie, bronbindingen en studieplanning aangevuld.
- Alle historische bronnen zijn ongewijzigd. Geen bestaande inschrijving, score, certificaat of gepubliceerde cursus aangepast.

## Bronacceptatie

Bereikbare officiële NLA-, Arboportaal-, RVO- en Staatsbladbronnen zijn inhoudelijk geraadpleegd. CHECKED betekent alleen dat de beschreven bronondersteuning is gecontroleerd. Geconsolideerde Arbowet/Arbobesluit waren niet volledig toegankelijk (HTTP 429); bij WL-002 blijven ook AP en SER deels handmatig te verifiëren. De gebruikte AI-bladen uit 2000/2002 dienen uitsluitend als historische achtergrond, niet als actuele wettelijke norm. Geen lange broncitaten of PDF-kopieën opgenomen.

Zie de exacte onderwerpen, URL's, beperkingen en open beslissingen in [WL-001](WL-001-review.md), [WL-002](WL-002-review.md) en [WL-003](WL-003-review.md). Een inhoudelijk reviewer moet toepasselijkheid, uitzonderingen, toetsvragen en bronactualiteit zelf goedkeuren. Reviewer-/goedkeuringsvelden zijn niet namens iemand ingevuld.

## Technische integratiegrens

1. De rijke `AcademyCourseBundle` bevat meerdere vraagblokken per hoofdstuk, afzonderlijke examen-/retentiebanken en bronmetadata. De generieke editor verwacht `authoring.content` in het beperktere `AuthoringCourse`-contract. Een gewone bundleimport maakt die authoringmetadata niet. `src/app/platformbeheer/academy/cursussen/[versionId]/page.tsx` toont zulke versies daarom alleen-lezen. Geen verliesgevende conversie naar één hoofdstukcheck uitgevoerd.
2. `src/lib/learning/academy-import-service.ts` accepteert na omgevingscontrole uitsluitend `neondb` op PostgreSQL 17. De bestaande lokale geïsoleerde acceptatieroute is PostgreSQL 18 met een andere databasenaam. De importguard is niet omzeild. Geen database aangemaakt of gevuld voor een vooraf aantoonbaar geblokkeerde import.
3. Daardoor zijn openen/bewerken/concept opslaan/review aanbieden/publiceren via Academy-beheer voor deze drie rijke kandidaten nog niet end-to-end bewezen. Dit hoort bij de afzonderlijke LMS-integratie; het is geen reden om vragen of content weg te laten. Bestaande algemene LMS-bewijzen zijn niet opnieuw uitgevoerd of opgevoerd als cursusacceptatie.

## Gerichte validatie

De definitieve machineleesbare resultaten staan in `validation.json`.

- Bestaande import-CLI voor iedere JSON zonder `--execute`: DRY_RUN PASS, geen databaseverbinding. Bundleschema, unieke codes/vraagstammen, antwoordsets, hoofdstuk-/bronbindingen en versie-identiteiten geldig.
- Contenttests renderen alle 1120 blokken via de bestaande `LessonContent`, zonder fallback of antwoordkeys in de weergave. Ze controleren zichtbare prompt versus vraagversie, leerdoelen, praktijk-/examenverwijzingen; en alle 844 correcte, ontbrekende en extra-foute antwoordsets via de bestaande scorer.
- Cesuurgrenzen 0/39/40/50 bewezen, steeds 40/50 vereist. Onbeperkt herkansen en geen wettelijke certificaatgeldigheid behouden. Geen echte poging of certificaat gemaakt.
- Gerichte bronbehoudtest voor WL-001 en WL-003; WL-002 volledige vraagsemantiek gelijk aan 1.2. Geen algemene LMS-suite herhaald.
- Lokale alleen-lezen reviewpagina's gebruiken de bestaande lesrenderer en build-CSS. Desktop 1280 en mobiel 390 gecontroleerd, hoofdstuklinks met toetsenbord en geen horizontale documentoverflow in deze reviewharnasopmaak. Lange woorden/bron-URL's worden uitsluitend in het harnas afgebroken. Dit is geen bewijs van de echte ingelogde Academy-shell, noch een gemeten vieruurspilot, echte 200%-zoom of schermlezertest.
- Lint: 0 errors, 4 bestaande `window.location.assign`-waarschuwingen buiten deze wijziging. TypeScript: 0 fouten. Build: exit 0, 176 statische pagina's; 3 bestaande dynamische-filesystemtracingwaarschuwingen in Knowledge-broncode. Eerste build gebruikte geen synthetisch authsecret en logde Better Auth-configuratiemeldingen; herhaling met vluchtig synthetisch secret slaagde zonder die meldingen. Geen productiecredential gebruikt.

## Reproduceren zonder database

```powershell
npx vitest run src/lib/learning/academy-content-release.test.tsx src/lib/learning/wl002-content-remediation.test.ts
npm run academy:import -- --file content/academy/WL-001_COURSE_1.0_DRAFT.json
npm run academy:import -- --file content/academy/WL-002_COURSE_1.3_DRAFT.json
npm run academy:import -- --file content/academy/WL-003_COURSE_1.1_DRAFT.json
```

Voeg geen `--execute` toe voordat de afzonderlijke LMS-integratie en een geïsoleerde doelomgeving zijn geaccepteerd. Optioneel maakt `ACADEMY_CONTENT_PREVIEW=true` tijdens de contenttest lokale HTML onder de genegeerde `.local-storage/academy-content-review`; alleen voor lokale review, niet als publieke cursus aanbieden.

## Gewijzigde bestanden en versiebeheer

Exacte wijzigingsset (14 bestanden):

- `content/academy/WL-001_COURSE_1.0_DRAFT.json`
- `content/academy/WL-002_COURSE_1.3_DRAFT.json`
- `content/academy/WL-003_COURSE_1.1_DRAFT.json`
- `docs/academy-content/WL-001-review.md`
- `docs/academy-content/WL-001-review.json`
- `docs/academy-content/WL-002-review.md`
- `docs/academy-content/WL-002-review.json`
- `docs/academy-content/WL-003-review.md`
- `docs/academy-content/WL-003-review.json`
- `docs/academy-content/README.md`
- `docs/academy-content/checkpoint.md`
- `docs/academy-content/validation.json`
- `src/lib/learning/academy-content-release.test.tsx`
- `docs/README.md` (uitsluitend de Academy-link)

De 29 gerichte tests zijn geslaagd. Diff-/secrets-/metadata-controle: geen bevindingen in deze wijzigingsset. Geen claim dat een patrooncontrole ieder mogelijk geheim kan herkennen.

Deze contentbranch bouwt voort op de nog afzonderlijk te reviewen lokale LMS-commit c7e71db. De contentcommit mag niet als standalone runtime-release op main worden beschouwd. Geen push, nieuwe Draft PR of CI-run uitgevoerd. CI is NOT RUN, geen groene remote-check geclaimd. Geen merge, deployment, featuregate, databasewrite of publicatie.

## Maximaal drie vervolgstappen

1. Inhoudelijk/juridisch en toetskundig reviewen per versie, inclusief WL-001-vraagconversies en expliciete examendekkingshiaten; representatieve pilot voor studieduur en moeilijkheid.
2. In de afzonderlijke LMS-afronding de rijke bundels verliesvrij bewerkbaar/importeerbaar maken en daarna synthetische beheerder-/cursistacceptatie per cursus uitvoeren.
3. Product Owner keurt iedere cursusversie afzonderlijk goed; pas daarna via het bestaande gecontroleerde proces publiceren. Tot die tijd alle drie DRAFT en publicatie NO-GO.

Checksumstrategie: waargenomen bestandshashes zijn van lokale bytes. Bronbehoudtests gebruiken daarnaast SHA-256 over UTF-8 met CRLF naar LF; importbundelchecksums volgen de bestaande canonieke JSON-strategie. Hierdoor veroorzaken Windows/Linux-regelafbrekingen geen inhoudelijke afwijking.
