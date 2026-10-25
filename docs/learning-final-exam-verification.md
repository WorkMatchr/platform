# WL-001 eindtoets v1.0 — verificatieverslag

## Status

**TECHNICALLY ACCEPTED PROTOTYPE** na de beschreven controles. De inhoud blijft **CONTENT REVIEW REQUIRED**; de eindtoets blijft **ASSESSMENT VALIDATION REQUIRED** totdat vakinhoudelijke review en een studentpilot hebben plaatsgevonden. Dit prototype is niet production-ready.

## 1. Git

- Branch: `codex/learning-vertical-slice-current`.
- Start-HEAD: `1b36eaf8268515bd94f46eb0430d39b77a8f025e`.
- Eind-HEAD en commit-SHA worden na de commit in de oplevering gerapporteerd.
- Worktree: `C:\Users\feens\.codex\worktrees\learning-vertical-slice-current\WorkMatchr`.
- De oorspronkelijke OneDrive-checkout is ongemoeid gelaten.
- Merge: nee. Deployment: nee.

## 2. Architectuur

De eindtoets gebruikt een aparte Exam/ExamVersion/ExamQuestion/ExamAttempt/ExamAnswer-laag en de bestaande versioneerbare Learning Question Bank. De gepubliceerde mapping en poginghistorie zijn immutable. Antwoorden vóór inzending zijn wijzigbare drafts; server-side scoring legt score, percentage en passstatus atomair vast. De bestaande hoofdstukcompletion is niet omgebogen naar examstatus.

Student-readmodels sturen geen correcte antwoorden, optiecorrectheid, uitleg of feedback mee. Mutaties controleren sessie, enrollment, ownership, attemptstatus en vraag-/optielidmaatschap server-side. Een unieke pogingconstraint, transactie en idempotent submit beschermen tegen dubbele actieve pogingen en dubbele submission. Resultaatfeedback is afgeleid van foute vragen en de immutable knowledge-area-mapping.

## 3. Datamodel en migratie

- Additieve migratie: `20260927210000_add_learning_final_exam`.
- Totaal in de repository: 84 migraties; alle 84 zijn vanaf nul toegepast in de geïsoleerde lokale PostgreSQL-testdatabase. `migrate status` meldde schema up-to-date; pending 0, failed 0.
- De migratie is niet toegepast op de gedeelde ontwikkel- of productiedatabase. Geen bestaande migratie is aangepast.
- Runtimepreflight tegen de actuele Learning-tabellen slaagde. Een apart upgradepad op een vóór-exam bestaande database is niet getest.
- Geen destructieve Learning-DDL of cascadeverwijdering van pogingen/resultaten.

## 4. ExamVersion en content

- Cursusversie: `prototype-0.17`; H1–H10 blijven op posities 1–10. Eerdere cursus- en vraagversies zijn behouden.
- Exam: `WL-001-FINAL`; immutable gepubliceerde ExamVersion: `WL-001-EXAM-1.0`.
- Exact 50 vragen E01–E50, posities 1–50; 208 antwoordopties; 42 `SINGLE_CHOICE` en 8 `MULTI_CHOICE`.
- Hoofdstukverdeling H1–H10: 3, 4, 5, 6, 6, 5, 5, 4, 4, 8.
- Cognitieve metadata: B 7, T 24, A 19. Difficulty-metadata: niveau 1: 4, niveau 2: 18, niveau 3: 27, niveau 4: 1.
- Kritieke leerdoelmarkering: 20 vragen.
- Correcte posities bij single choice: A 9, B 9, C 14, D 10. Er is geen vaste antwoordpositie.
- De canonical bank is `prisma/seed-data/WL-001_FINAL_EXAM_v1.0_CANONICAL_QUESTION_BANK.md`. E13 en E39 gebruiken de later aangeleverde definitieve vervangingen. E31–E34 zijn in test-/documentatiemetadata gemarkeerd als `CONTENT REVIEW REQUIRED — LEGAL`; hiervoor is geen nieuwe kolom of migratie toegevoegd.
- Beperkte distractorpolish, zonder sleutel-, leerdoel-, type-, mapping- of scorewijziging: E15 (wachten tot letsel), E19 (techniek pas na ongeval), E24 (standaard alle maatregelen tegelijk), E26 (alleen beter opletten), E27 (onderzoek nooit in PvA), E29 (wachten op letsel), E35 (vaste vervaldatum), E37 (wachten op periodieke review), E38 (signalen negeren), E46 (wachten tot letsel), E49 (alleen periodieke review) en E50 (eerst een volledige nieuwe cyclus). Alleen de betrokken afleidertekst is realistischer gemaakt.
- Cesuur/configuratie: 40/50 = 80%; maxScore 50; geen tijdslimiet; geen poginglimiet.
- MULTI_CHOICE-score: uitsluitend de exacte correcte set = 1 punt; iedere andere combinatie, inclusief gedeeltelijk juist of onbeantwoord, = 0. Geen deelpunten.

## 5. Scoring

De scoringspolicy is getest op single-choice correct/onjuist/onbeantwoord en multi-select exacte set, ontbrekende juiste optie, extra foutieve optie, volledig fout en onbeantwoord. Cesuurtests bevatten 39/50 = niet behaald, 40/50 = behaald, 41/50 = behaald, 50/50 = behaald en 0/50 = niet behaald. Eerder slagen blijft geldig bij latere pogingen.

## 6. Autorisatie en beveiliging

Gerichte runtimecontrole bevestigde dat de eindtoets pas start na afronding van H1–H10 en met een eigen enrollment. Een andere gebruiker kan de poging/uitslag niet lezen of wijzigen. De readmodel-payload bevat geen antwoordmodel. Pogingen voor een vraag buiten de exammapping en ongeldige antwoordopties worden geweigerd. Conceptantwoorden kunnen worden gewijzigd; na submission zijn antwoord- en resultaatmutaties geblokkeerd. Dubbel starten hervat dezelfde actieve poging; dubbel submitten levert dezelfde uitslag op. Pogingnummering en herkansing beginnen zonder overgenomen antwoorden.

## 7. Database en seed

Een tijdelijke lokale PostgreSQL-database is uitsluitend op `localhost` aangemaakt. De volledige keten met 84 migraties is vanaf nul uitgevoerd; Learning-seed en examseed zijn ieder tweemaal uitgevoerd. De controle bevestigde één WL-001-cursus, `prototype-0.17`, H1–H10 op posities 1–10, één examidentiteit, één gepubliceerde v1.0, E01–E50, 208 opties, de juiste cesuur en unieke posities/codes. Historische CourseVersions en bestaande Learning-activiteit zijn door de runner gecontroleerd.

De database bevatte alleen tijdelijke `example.invalid` browserfixture-accounts en acceptatiepogingen. Na de browsercontrole is de disposable database verwijderd, waarmee ook die accounts en pogingen zijn verwijderd. Geen bestaande gedeelde database of historische productie-/ontwikkeldata is gebruikt of gewijzigd.

## 8. Tests

- Gerichte content-, policy- en player-tests: 3 bestanden; 12 passed, 0 failed, 0 skipped.
- Geïsoleerde Learning-databaserunner: PASS; fresh migration chain, seed-idempotentie, runtime-autorisatie, secrecy, exact scoring, immutability, retries en historie.
- Runtime-integratietest in de runner: 1 scenario geslaagd; bevat hoofdstuktoegang, dubbele start, verborgen answer key, eigenaarschap, antwoordvalidatie, 39/50, dubbele inzending, immutability, poging 2 op exact 40/50 en behoud van de eerdere pass na poging 3.
- Volledige Vitest-suite: 2.014 tests — 1.987 passed, 7 failed, 20 skipped; 319 testbestanden (309 geslaagd, 7 met failures, 3 overgeslagen).
- Dezelfde zeven failuregroepen als de vóór de eindtoets vastgelegde H10-baseline (1.975 passed, 7 failed, 19 skipped, 315 bestanden): publieke-contentwoordlimiet (1), assignment-querytests (2), subscription-cancellationdatums (2), public-intake-context-question (1), public-intake-guidance-presentatie (1). Deze failures zijn bestaande niet-Learning-baselineproblemen; er is geen nieuwe exam-/Learning-failuregroep aangetoond. Delta t.o.v. H10: +12 passed, gelijk aantal failures, +1 skipped en +4 testbestanden.
- `ops/marketplace-notifications/dispatch.test.mjs` is geen Vitest-suite en is separaat met `node --test` uitgevoerd: 10 passed, 0 failed.

## 9. Build en technische checks

- `npm run lint`: PASS, exit 0.
- `npm run typecheck`: standaard incrementele opdracht stuitte op Windows EPERM bij `tsconfig.tsbuildinfo`; `npx tsc --noEmit --incremental false`: PASS.
- `npm run db:validate`: PASS.
- `prisma migrate status`: PASS op de disposable lokale database, 84 applied, 0 pending, 0 failed.
- `npm run build`: PASS, exit 0. Prisma Generate, compile, TypeScript (2,1 minuten) en statische generatie van alle 131 pagina's zijn geslaagd.
- Bekende NFT-tracingwaarschuwing uit `next.config.ts` betreft de Knowledge-uploadketen en is niet door Learning veroorzaakt.
- `git diff --check`: PASS vóór de eindcommit.
- Geen `next-env.d.ts`-wijziging wordt beoogd; gegenereerde Prisma- en Next-output wordt niet gecommit.

## 10. Browserflow

Op de lokale desktopflow zijn het startscherm, eligibility, 50-vragenplayer, single choice, multi-select, save-status, refresh, terug/vooruit, verlaten/hervatten, antwoordstatus, onbeantwoorde waarschuwing, historie, herkansing en uitslag gecontroleerd. De tweede poging hervatte na verlaten op vraag 2 met de bewaarde multi-select. Poging 1 leverde 0/50 en `herkansing mogelijk` op. Poging 2 werd server-side in de uitsluitend tijdelijke testdatabase met exact 40 correcte antwoorden klaargezet en via de normale UI ingeleverd: uitslag 40/50, 80%, `Geslaagd`. De pagina toonde geen antwoordblad of kwalificatieclaim. `Mijn e-learnings` toonde de cursusstatus en uitslag; een latere actieve poging nam de eerder behaalde status niet weg.

Tijdens iedere multi-select staat zichtbaar: “Meerdere antwoorden zijn mogelijk. Selecteer alle juiste antwoorden.” Een gedeeltelijke selectie bleef als concept zichtbaar en werd niet direct beoordeeld.

## 11. Desktop

Gecontroleerd op de beschikbare desktopbrowser, inner viewport 1280×720. Start-/resultaatscherm, vraagkaart, lange casus en het 50-vragenoverzicht waren bruikbaar. Gemeten `document.documentElement.scrollWidth` en `clientWidth` waren gelijk; geen horizontale overflow vastgesteld. Na navigatie verschoof focus naar de vraagheading.

## 12. Mobiel

Getest met echte viewportoverride op 390×844 en 500×900. Start-/resultaatscherm, vraag 2 (multi-select), lange examcasus en 50-vragenoverzicht zijn gecontroleerd. De layout stapelde, tekst en bediening waren bereikbaar en er was geen horizontale overflow: documentbreedte en viewportbreedte waren gelijk (390/390 respectievelijk 500/500 CSS-pixels). Checkboxen en antwoordkaarten bleven goed bedienbaar. Screenshots waren tijdens verificatie inline zichtbaar; er is geen screenshotbestand naar de repository geëxporteerd.

## 13. Accessibility

Op hoofdlijnen gecontroleerd: radiobuttons en checkboxes met labels, vraagstatus, huidige positie met `aria-current`, beantwoord/onbeantwoord als tekststatus, focus op de vraagheading en semantische submitwaarschuwing. Een volledige screenreader-/accessibility-audit is niet uitgevoerd en blijft onderdeel van integrale review.

## 14. Console en server

De browserconsole toonde bij de eindcontrole geen Learning-fout of waarschuwing. De ontwikkellog liet succesvolle exam GET-/save-/positie-/submit-/resultaatrequests zien. Een tijdelijke lokale testhelper had aanvankelijk twee mislukte seedrequests doordat een single-choice antwoord in het testfixture als array werd opgeslagen; de helper is voor de grensscoretest gecorrigeerd en daarna verwijderd. De normale examflow leverde vervolgens succesvolle requests op. Deze helper maakte geen deel uit van de productwijziging.

## 15. Product- en contentreview

De toets bevat veel toepassings- en analysevragen; de metadataverdeling is B 7, T 24, A 19. Er zijn 42 single-choicevragen met gevarieerde antwoordposities en 8 multi-selectvragen. De browserflow bevestigde dat de player geen directe goed/foutfeedback of correct antwoord toont.

De automatische antwoordlengtecontrole vond bij 34 van de 42 single-choicevragen dat de correcte optie de langste is. Gemiddeld telt de correcte optie 104 tekens tegenover 57 tekens per afleider. De langste reeks met dezelfde correcte antwoordpositie is twee vragen. Omdat de aangeleverde bank canoniek is en de laatste opdracht alleen beperkte afleiderpolish toestaat wanneer een afleider evident onplausibel is, zijn de definitieve vraag- en antwoordteksten niet verder herschreven. Dit is een concreet risico op antwoordlek en moet vóór studentpilot/publicatie inhoudelijk worden opgelost.

De doublurecheck van E11/E16/E44 laat zien dat E16 en E44 sterk op elkaar lijken: beide gebruiken hoofdpijnsignalen en onbekende blootstellingsgegevens en vragen om ontbrekende informatie vóór beoordeling te verzamelen. E11 toetst de eerste stap bij een onduidelijke middelenbeoordeling; E16/E44 toetsen grotendeels dezelfde onzekerheidsredenering, waarbij E44 ook deskundigheid noemt. Deze overlap is vastgelegd als inhoudelijk reviewpunt; de canonieke vraagbank is hiervoor niet aangepast.

De indicatieve duur is 45–60 minuten; feitelijke toetstijd en itemkwaliteit zijn niet met studenten gevalideerd. De cesuur van 80% is een voorlopig pilotbesluit. E31–E34 vragen expliciet juridische review. Voor E01–E50 als geheel blijven wettelijke actualiteit, arbotechnische juistheid, terminologie, bronbasis, didactische vereenvoudiging, vraag-/afleiderkwaliteit en toetsvaliditeit formele reviewpunten. Technische tests vormen geen juridische of psychometrische goedkeuring.

## 16. Openstaande punten

- Formele integrale juridische/arbotechnische contentreview, inclusief E31–E34.
- Inhoudsdeskundige toetsreview en studentpilot; evalueer daarna cesuur, duur en itemkwaliteit.
- Herzie vóór studentpilot/publicatie het systematische antwoordlengtepatroon (34/42 correct langste) en de overlap tussen E16 en E44 via een nieuwe door de inhoudseigenaar goedgekeurde bankversie.
- Volledige accessibilityreview en bredere cursusreview.
- Upgradepad op een reeds bestaande Learning-database is niet afzonderlijk getest.
- De zeven bestaande niet-Learning-testsuitefailures blijven volgens baseline open.

## 17. Buiten scope

Geen certificaat/bewijs, kennisbehoud, commerce/checkout, random vraagpool, analyticsdashboard, H11, merge of deployment. WL-001 is hiermee niet production-ready.

---

## WL-001-EXAM-1.1 — legal/content quality revision

### Status

**TECHNICALLY ACCEPTED PROTOTYPE**. De beperkte browseracceptatie is **NON-BLOCKING REVIEW** en staat geregistreerd als **NOT TESTED — TOOLING LIMITATION**: er was geen bereikbare lokale app en geen bestaande ingelogde browsersessie. Er zijn geen nieuwe browserpogingen gedaan, geen account aangemaakt, geen voorwaarden geaccepteerd en geen gedeelde database gewijzigd. De geautomatiseerde content-, service-, runtime-, scoring-, autorisatie- en secrecy-controles zijn wel uitgevoerd zoals hieronder beschreven. **CONTENT REVIEW REQUIRED — LEGAL** blijft gelden voor E31–E34, E39 en E44. **ASSESSMENT VALIDATION REQUIRED** blijft gelden totdat toetsreview en pilot/studentvalidatie hebben plaatsgevonden.

### Git en versie

- Branch: `codex/learning-vertical-slice-current`.
- Start-HEAD: `2bce51129df23710b699a83cdc483354f35621d5`.
- Implementatiecommit: `6a52bc7b3a0cc3b1aee895bcc9f49694df34fafe` (`fix(learning): refine WL-001 exam legal content`).
- Eind-HEAD na deze documentatie-update wordt via de definitieve Git-eindcontrole gerapporteerd.
- Worktree: `C:\Users\feens\.codex\worktrees\learning-vertical-slice-current\WorkMatchr`.
- In de geïsoleerde preflight was `WL-001-EXAM-1.1` de gepubliceerde versie en selecteerden nieuwe pogingen haar. De gewone lokale ontwikkeldatabase heeft de exam-migratie nog pending en is niet bijgewerkt; daar is v1.1 dus niet gepubliceerd.
- `WL-001-EXAM-1.0`-vraaginhoud, opties, mapping, scoringinstellingen, antwoorden en attempts zijn onveranderd geverifieerd. Alleen de lifecycle-status van de v1.0-versierij gaat naar `RETIRED`, vereist door de unieke constraint van één gepubliceerde versie per toets; dit wijzigt geen toetsinhoud of historische uitslagen.
- Geen merge of deployment.

### Inhoud en versiebeheer

De v1.1-bank bevat exact E01–E50, 42 single-choicevragen en 8 multi-choicevragen, 208 opties en hoofdstukverdeling 3/4/5/6/6/5/5/4/4/8. De cesuur is 40/50 (80%), maxScore 50, zonder tijdslimiet, poginglimiet, deelpunten of negatieve punten. Multi-select geeft alleen een punt voor exact de volledige correcte set. De zichtbare multi-selectinstructie noemt dat meerdere antwoorden mogelijk zijn en vraagt alle juiste antwoorden te selecteren.

Veertig gewijzigde vragen hebben een nieuwe `LearningQuestion`-versie gekregen; daaronder vallen tekst-/feedbackupdates en de nieuwe canonieke E44. De overige tien ongewijzigde vragen hergebruiken hun bestaande QuestionVersion. Geen nieuwe schemawijziging of migratie is toegevoegd. De initiële complete v1.0/v1.1-seedcontrole voerde de volledige 84-migratieketen uit en seedde Learning, exam v1.0 en exam v1.1 elk tweemaal.

E13 en E39 volgen de door de gebruiker aangeleverde definitieve vervangingen, aangevuld met de juridische feedback uit de aanvulling. E44 is de nieuwe integrale vraag over gezondheidssignalen, onzekerheid, passende deskundigheid en tijdelijke beheersing. E16 blijft gericht op de vraag of een verantwoord oordeel al mogelijk is bij ontbrekende informatie. Een contentinvariant houdt deze verschillende leerdoelen uit elkaar.

E31–E34, E39 en E44 zijn in de bestaande content-/testmetadata gemarkeerd als `CONTENT REVIEW REQUIRED — LEGAL`; er is geen reviewkolom of migratie toegevoegd. Specialistisch onderzoek of advies en formele RI&E-toetsing zijn verschillende functies. Welke deskundigheid nodig is, hangt af van het onderwerp en het toepasselijke wettelijke kader. De juridische aanscherpingen zijn gecontroleerd tegen actuele informatie van [Steunpunt RI&E](https://www.rie.nl/hulpmiddelen/branche-rie-instrumenten), [de Steunpunt RI&E-checklist voor maximaal 40 uur](https://www.rie.nl/instrumenten/checklist-gezondheidsrisicos-max-40-uur-medewerkers-in-dienst), [Arboportaal over uitzendkrachten](https://www.arboportaal.nl/onderwerpen/rechten-plichten-werkenden/uitzendkracht), [Arboportaal over de RI&E](https://www.arboportaal.nl/onderwerpen/arbowet--en--regelgeving/risico-inventarisatie---evaluatie) en [Arboportaal over kerndeskundigen](https://www.arboportaal.nl/onderwerpen/ondersteuning-bij-arbowet/arbodeskundigen-kerndeskundigen). Dit is geen formele juridische goedkeuring.

De externe review-PDF noemde ontbrekende teksten. De technische Markdown-bank is volledig geparseerd: alle 50 codes, iedere vraagstam, opties, correcte set en feedback zijn aanwezig. De PDF-melding is daarom als review-artifact/extractiepunt behandeld, niet als ontbrekende examcontent.

### Antwoordlengte en vraagkwaliteit

De analyse omvat alle 42 single-choicevragen. Voor v1.0 waren 33 correcte opties strikt langer dan iedere afleider en was er één tie: 34/42 (81,0%) correct-opties deelden de maximale lengte. In v1.1 zijn 10 correct-opties strikt langer en is er één tie: 11/42 (26,2%) delen de maximale lengte; het percentage strikt langste daalde naar 23,8%. Correcte antwoordposities bleven A/B/C/D = 9/9/14/10 en de langste identieke letterreeks is twee.

De 40 gewijzigde codes zijn E01, E03–E08, E10–E11, E13–E14, E16–E24, E25–E26, E28–E35, E37, E39–E40, E42, E44, E46–E50. De tien ongewijzigde vragen zijn E02, E09, E12, E15, E27, E36, E38, E41, E43 en E45. Bij die tien is de correcte optie niet uniek de langste; E45 deelt de maximale lengte met een afleider. Daarom was tekstwijziging niet nodig om het patroon te verminderen. De tests vergelijken voor alle 50 vragen de vraagtypen en correcte sets en bewaken de antwoordlengteverdeling.

### Database, seed en historische integriteit

- Geïsoleerde lokale PostgreSQL-database: `workmatchr_learning_15284_1790588862762`; uitsluitend aangemaakt voor deze preflight.
- Fresh install: 84/84 migraties applied, 0 pending, 0 failed.
- Learning-seed, v1.0 examseed en v1.1 examseed zijn elk tweemaal uitgevoerd.
- Runtimecontrole bevestigde 50 unieke v1.1-mappings op posities 1–50, juiste H1–H10-verdeling, 40 nieuwe QuestionVersions en 162 bijbehorende optie-rijen.
- v1.0 attempts, answers, mappings, QuestionVersions en opties zijn vóór/na publicatie byte-voor-byte vergeleken; geen inhoudelijke verschillen. De bestaande v1.0 attempt bleef via het resultaatreadmodel reproduceerbaar.
- De werkelijke lokale ontwikkeldatabase is alleen read-only geraadpleegd: 84 migratiebestanden, waarvan de exam-migratie `20260927210000_add_learning_final_exam` daar nog pending was. Deze ronde heeft die database niet gemigreerd of anderszins gewijzigd. De geïsoleerde database was volledig up-to-date.
- De tijdelijke preflightdatabase is uitsluitend voor seed- en runtimeverificatie gebruikt en daarna verwijderd. Geen gedeelde of productiegegevens zijn gebruikt.

### Tests en technische checks

- Gerichte finale content-/policy-/player-tests: 3 bestanden, 18 passed, 0 failed, 0 skipped. De database-seedrunner liet daarnaast de runtime-integratiescenario’s voor v1.0 en v1.1 slagen; deze controleren onder meer versie-selectie, answer secrecy, autorisatie, scoring, submission, herkansing en historische uitslag. `ops/marketplace-notifications/dispatch.test.mjs` is afzonderlijk met node:test uitgevoerd: 10 passed, 0 failed.
- Volledige suite met `DATABASE_URL` naar de geïsoleerde tijdelijke database: 2.024 tests, 1.997 passed, 7 failed, 20 skipped; 319 bestanden (310 passed, 6 failed, 3 skipped). Dezelfde zeven bestaande, niet-Learning-baselinefailures: publieke-contentwoordlimiet (1), assignment-querytests (2), subscription-cancellationdatums (2), public-intake-context-question (1), public-intake-guidance-presentatie (1). Ten opzichte van het eerder vastgelegde v1.0-resultaat (1.987 passed, 7 failed, 20 skipped; 319 bestanden) zijn er 10 extra geslaagde tests en geen extra failures. De dispatch-file blijft buiten Vitest en is apart groen via node:test.
- `npm run lint`: PASS.
- `npx tsc --noEmit --incremental false`: PASS.
- `npm run db:validate`: PASS.
- `prisma migrate status`: PASS op de geïsoleerde preflightdatabase, 84 applied / 0 pending / 0 failed. Op de gewone lokale ontwikkeldatabase is de bestaande exam-migratie pending; deze is niet uitgevoerd.
- `npm run build`: PASS na uitvoering in de aangewezen worktree; Prisma Client gegenereerd, compile en TypeScript groen, 131 statische pagina’s gegenereerd. De build gaf de bestaande Knowledge/NFT-tracingwaarschuwing en Better Auth default-secretwaarschuwingen tijdens statische generatie; er waren geen buildfouten. De normale sandboxrun had eerst EPERM op gegenereerde bestanden; dezelfde build met de voor deze worktree benodigde verhoogde schrijfrechten slaagde.
- `git diff --check`: PASS na de laatste testwijziging.

### Browsercontrole en open punten

**BROWSER ACCEPTANCE: NOT TESTED — TOOLING LIMITATION.** Reden: geen bereikbare lokale app en geen bestaande ingelogde browsersessie. De browseracceptatie is geclassificeerd als **NON-BLOCKING REVIEW**, niet als technisch productfalen. Er zijn in deze afrondingsronde geen browserpogingen gedaan. Niet browsermatig bevestigd zijn: de v1.1-weergave van E31/E32/E39/E44, de zichtbare MULTI_CHOICE-instructie, antwoord opslaan, refresh/resume, submission en scoring in de UI, en de v1.0-historieweergave.

Wel via geautomatiseerde tests en geïsoleerde database-runtime geverifieerd: de volledige E01–E50-bank en correcte antwoordsets; v1.1-versieselectie voor nieuwe attempts; de multi-choiceinstructie in de generieke renderer; draft-save en resume op servicelaag; geen correct-answer/feedback-leakage tijdens `IN_PROGRESS`; server-side scoring en submission; en behoud/reproduceerbaarheid van v1.0-mappings en historische pogingen. Deze controles bewijzen niet dat de genoemde content of flows visueel correct in de browser worden weergegeven.

Open blijven: browseracceptatie als non-blocking review, formele juridische/arbotechnische review voor E31–E34, E39 en E44, en studentpilot/toetsvalidatie. De testresultaten hieronder zijn afkomstig uit de eerder uitgevoerde runs; in deze afrondingsronde is uitsluitend documentatie gewijzigd en zijn tests niet opnieuw gedraaid. Niet gebouwd: certificaat, kennisbehoud, commerce of analytics. Merge en deployment: nee.
