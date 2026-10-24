# WP10 — LMS: technische en inhoudelijke acceptatie

Datum: 24 oktober 2026; aangevuld en opnieuw getest voor WP11. WP09 staat in Draft PR #58. Geen productieactie, mail, betaling, juridische vrijgave of cursuspublicatie buiten de wegwerptestdatabase.

## Onderzochte versies

**Actuele main:** `a49b59507139ef7121634705da19f781b17845f0`. Hier staan de publieke `/e-learning`-aankondigingen, WL-001-programma en prijs-/roadmapcontent. De pagina zegt terecht dat kopen, inschrijven en starten nog niet mogelijk zijn. `src/lib/learning`, de interactieve `/e-learnings`-routes en Learning-modellen/migraties ontbreken op main. PR's #4, #11 en #15 betreffen de publieke presentatie, geen geïntegreerde LMS-runtime.

**Bestaande gecommitteerde kandidaat:** `b7188ebf1cbc3c2ecf96e1a3eb8069df1763340e` op `codex/wl001-main-integration`, geïnspecteerd in een nieuwe geïsoleerde checkout `wp10-lms-candidate`. De oorspronkelijke worktree bevat aanvullende lokale bootstrap-/test-impersonationwijzigingen; die zijn niet overgenomen, gewijzigd of als geteste versie gepresenteerd. De kandidaat is gebaseerd op `5d41fa8`, vóór de F3-merge. Het verschil met actuele main bevat ook teruggedraaide F3-opslag/logoutcode. Een directe vervanging van main door deze kandidaat is daarom **niet veilig**. Geen integratiemerge uitgevoerd.

Dit rapport en de geteste correctiepatch vormen een afzonderlijke documentatie-PR op actuele main. Zij publiceren niet ongemerkt de grote LMS-kandidaat. De definitieve kandidaattests gelden voor de genoemde commit **plus** `docs/wp10-learning-runtime-repair.patch`, niet voor actuele main of een toekomstige geïntegreerde versie.

## Architectuur

Learning hergebruikt `User`, Better Auth, PostgreSQL/Prisma en de bestaande outbox. `LearningProfile` is een capability; STUDENT is geen nieuwe globale platformrol. De prototypeopleiding is gratis voor actieve gebruikers; reguliere commerciële rechten zijn nog geen betaalflow.

De kandidaat bevat Course/Version, Chapter/ContentBlock, Question/Option, Enrollment, ChapterProgress, QuestionAttempt/InteractionAttempt, Exam/Version/Mapping/Attempt/Answer, Certificate en vrijwillig Retention-programma/deelname/weekcheck/jaarcheck. Inschrijvingen en resultaten zijn persoonlijk op User-ID gescheiden; er is geen werkgeversdashboard dat vanzelf leerresultaten van organisatieleden mag inzien. Gepubliceerde versies en ingediende resultaten hebben databaseguards; updates van prototypecontent verlopen via nieuwe versies.

Server Actions gebruiken `requireLearningUser`, actuele ACTIVE-status en een eigen enrollment. Reads filteren op User-ID. De courseplayer ontvangt geen correcte opties. Oefeningen geven feedback na beantwoorden; SINGLE_CHOICE direct, multi-select en matching/sortering na expliciete controle. De bestaande documentatie kiest dit bewust zodat een meervoudige selectie afgemaakt kan worden. Fout beantwoorde formatieve oefeningen blokkeren hoofdstukcompletion niet. Eindtoets: vijftig vragen, exacte antwoordsets, 40/50 geslaagd, immutable submission en herkansing. Deze norm is niet gewijzigd.

Er zijn **91 migraties** in de kandidaat tegenover 85 op main: zes Learning-migraties, inclusief de forward-only correctie voor opnieuw toestemming geven aan een jaarherinnering. Geen migratie is naar deze main-gebaseerde auditbranch overgenomen. Het verouderde harnas verwachtte 90. De correctie vergelijkt nu de volledige bestandslijst, iedere SHA-256-checksum, succesvolle registratie en ongewijzigde migratiehistorie na herhaling. Geen historische migratie is aangepast.

## Inhoud WL-001 en didactische review

De kandidaat bevat `prototype-0.17`, H1–H10 en eindtoets v1.0/v1.1. Formele inhoudsreview, studentvalidatie en certificaat/PDF-toegankelijkheidsacceptatie zijn nog vereist. Een WorkMatchr-certificaat van afronding is geen wettelijke beroepskwalificatie.

| Hoofdstuk | Onderzocht | Reviewadvies |
|---|---|---|
| H1 — Waarom een RI&E? | Gevaar/risico, praktijkvoorbeelden, basis/PvA, keuze- en koppeloefeningen. | Een sorteeroefening noemt “gevaar”/“risico” al letterlijk in de opties (`WL001-H1-GEVAAR-RISICO`). Dat is een didactische cue; laat reviewer beoordelen of dit oefening of kenniscontrole moet zijn. Niet zelfstandig norm gewijzigd. |
| H2 — Wie doet wat? | Werkgever blijft verantwoordelijk, preventiemedewerker, werknemers/vertegenwoordiging, deskundigen en matchingoefeningen. | Precieze raadplegings-/medezeggenschapsuitspraken en wijzigingen per juli 2026 vragen expliciete juridische bronrevisie/review. |
| H3 — Inventariseren | Risicosignalering, bestaande case-/multi-selectblokken en vijf hoofdstukcheckvragen. | Geen automatische zekerheid uit het niet selecteren van een risico; casus is didactisch en geen complete bedrijfsspecifieke RI&E. |
| H4 — Beoordelen | Waarschijnlijkheid/gevolg, blootstelling, maatregelen, restrisico en prioriteit. | Scorecategorieën zijn methodevoorbeelden, geen universele wettelijke grens. Geen norm of cesuur veranderd. |
| H5 — Maatregelen | Bronaanpak/collectief/organisatorisch/PBM en STOP, restrisico. | Specifieke voorschriften en voorwaarden voor lagere maatregelen blijven inhoudelijke review. |
| H6 — Plan van aanpak | Van risico naar actie, verantwoordelijke, termijn en opvolging. | Controleer casusvolledigheid met docent; geen fictieve algemene wettelijke actietermijn toegevoegd. |
| H7 — Toetsing | Aantal alleen geeft geen vrijstelling; passend erkend branche-instrument/voorwaarden, scope deskundige. | Hoogste juridische prioriteit: ≤25, gezamenlijke arbeidsduur ≤40 uur, cao/branche-erkenning, vrijwilligersscope, systeem-/scopetoets. Geen automatische vrijstelling of menselijke goedkeuring. |
| H8 — Actueel houden | Veranderingen, ervaring en inzichten; geen vaste geldigheidsduur van vijf jaar of verplichte volledige jaarlijkse herhaling. | Organisatiespecifieke aanleiding onderscheiden van een praktische periodieke review. |
| H9 — Papier naar praktijk | Implementatie, communicatie, controle en feedback. | Didactische vereenvoudiging onderscheiden van volledige naleving. |
| H10 — Integrale casus | Combinatie eerdere leerdoelen en hoofdstukcheck. | Samenhang/realistische moeilijkheid en assessmentvalidatie nog met studenten beoordelen. |

Primaire bronnen opnieuw bereikbaar op 24 oktober 2026: [Arboportaal RI&E](https://www.arboportaal.nl/onderwerpen/arbowet--en--regelgeving/risico-inventarisatie---evaluatie), [Arbeidsinspectie RI&E/PvA](https://www.nlarbeidsinspectie.nl/onderwerpen/arbeidsomstandighedenwet/risico-inventarisatie-evaluatie-en-plan-van-aanpak), [Arbeidsinspectie arbokerndeskundigen](https://www.nlarbeidsinspectie.nl/onderwerpen/arbeidsomstandighedenwet/arbokerndeskundigen) en [toetsingspublicatie van 18 december 2025](https://www.nlarbeidsinspectie.nl/site/binaries/site-content/collections/documents/2025/12/18/toetsen-van-de-ri-en-e/toetsen-van-de-ri-en-e-20251218.pdf). Deze ondersteunen de hoofdlijn risico-inventarisatie/PvA en de rol van deskundige toetsing. Zij vormen geen volledige juridische goedkeuring van iedere cursusvraag. De formele toetsingsuitzonderingen moeten op geconsolideerde wet/lid en actuele erkenningsvoorwaarden worden afgetekend; WP03/issue #50 geeft hiervoor het afzonderlijke dossier. Geen inhoudelijke cursusbronstatus is gepromoveerd.

## Wekelijkse herhaling en mail

Implementatie is aanwezig in de kandidaat, niet op main. Twaalf weekvensters, vijf vaste vraagversies per week, een versiegebonden selector met 2 persoonlijke / 2 kern / 1 spreidingsvraag, maximaal twaalf checks en een afzonderlijke jaarconsent met tien hoofdstukvragen. Retentionbank R001–R100 blijft canoniek DRAFT. Er is geen productieprogramma gepubliceerd.

De schedulerhook is schedule-agnostisch; gemiste weekchecks kunnen worden aangemaakt en alleen de actuele week krijgt een mail-intent. De retentionworker hercontroleert deelname, stop/consent, actieve gebruiker en geverifieerd adres. De maintenance-route van deze kandidaat verwerkt wel certificaatmails maar koppelt de retentionworker niet aan de productiescheduler. Geen nieuwe scheduler aangelegd of geactiveerd. De SDK-foutclassificatie uit WP09/#58 is een latere gedeelde integratieafhankelijkheid.

## Testresultaten en beperkingen

- Main: **24/24 publieke Learning-tests PASS**, twee bestanden. Geen verborgen inschrijving of betaalactie op de aankondigingspagina's.
- Definitieve kandidaat-unitset: `vitest run learning --maxWorkers=2`: **173 PASS, 14 SKIPPED**, 31 bestanden PASS en zes PostgreSQL-bestanden overgeslagen zonder databasevariabele. Overgeslagen tests zijn niet als PASS geteld; onderstaande expliciete PostgreSQL-runs leveren het afzonderlijke runtimebewijs.
- Gecorrigeerd canoniek `test-learning-database.ts`: **PASS**, 91/91 migraties, alle checksums, herhaalde deploy zonder registrywijziging, seedherhaling, exam v1.0 → v1.1, ongewijzigde historische attempts/answers/options/versies en runtime-autorisatie/scoring. Eigen database automatisch verwijderd.
- Finale concurrency- en hoofdstukproef: **9/9 PASS**, twee bestanden, 46,65 s. Zes gelijktijdige starts en zes blockupdates behouden precies één inschrijving en consistente voortgang.
- Volledige H1–H10-serviceketen plus concurrency: **3/3 PASS**, 71,87 s. Alle blokken via normale services; 0/50 onvoldoende voltooit de cursus niet; twee gelijktijdige 50/50-submissions leveren één blijvende cursusafronding. Replays van onvoldoende en voldoende veranderen die afronding niet. Geen handmatig COMPLETED-fixture in deze proef.
- Retention-PostgreSQL: **PASS** met uitsluitend fake mailtransport; deelname, vaste vijfvragenweek, concurrency/replay, stop, opnieuw toestemming en jaarcontrole. De eerste losse retentieproef had onvoldoende v1.1-fixtures; de hertest met twee geschikte synthetische examenkandidaten slaagde. Geen scoring- of consentregel versoepeld.
- Echte lokale HTTP-applicatie op 127.0.0.1:3057: **PASS** voor Better Auth-login, eigenaar ziet afgeronde cursus/geslaagd resultaat, logout verwijdert sessie, nieuwe login behoudt identiek historisch resultaat, tweede account/organisatie ziet geen enrollment en krijgt not-found voor het vreemde resultaat; **0 sessies na afloop**. Next.js kan redirects/not-found na streaming via een 200-response met redirect/404-marker uitdrukken; beide markers en afwezigheid van resultaatinhoud zijn gecontroleerd. Dit is geen browserinteractie-/hydratatiebewijs.
- Aanvullende echte LMS-browsercontrole: **BLOCKED** door initialisatiefout van CUA (`failed to write kernel assets`, Windows pad niet gevonden), ook na reset. Publieke main-browsercontrole eerder uitgevoerd; geen volledige nieuwe player/mobile/zoom-PASS geclaimd.
- Kandidaat: volledige lint **PASS**, standalone TypeScript **PASS**, productiebuild **PASS**. Gerichte lint en TypeScript na toevoegen van de laatste test eveneens PASS. Deze oudere kandidaat heeft niet de vier readonly-arraybaselinefouten van actuele main.
- Testinstallatieproblemen afzonderlijk opgelost zonder package-/lockfilewijziging: onvolledige Next-extractie, daarna twee fysieke React-kopieën door een Next-junction. Next/React/ReactDOM zijn uitsluitend in deze testcheckout aan één bestaande installatie gekoppeld na vergelijking van identieke lockfile-integrities. De aanvankelijke zes `Invalid hook call`-testfouten zijn daarna verdwenen; geen componentcode aangepast om deze toolingfout te maskeren.

Definitieve cleanup: eigen LMS-database verwijderd na 91 succesvolle registraties en nul sessies; eigen account-/finance-/overige integratiedatabases verwijderd. De bestaande database-OID/namen en rol-OID/namen zijn behouden. Geen resterende taakdatabase; lokale server 3057 gestopt; private fixturebestanden met credentials verwijderd. Dit bewijst behoud van de gecontroleerde identiteiten, geen universele checksumcontrole op alle bestaande bedrijfsgegevens. Bestaande databases zijn niet voor deze proeven gebruikt.

## Bevestigde concurrencyfouten en afgebakende correctie

Op de ongewijzigde kandidaat faalde de aanvullende PostgreSQL-proef tweemaal: zes gelijktijdige starts leverden wel één enrollment op, maar niet zes normale redirects; zes gelijktijdig afgeronde tekstblokken leverden zes opgeslagen interacties op, maar slechts **3%** geprojecteerde voortgang tegenover de verwachte **21%**. De initialisatie van hoofdstukprogress gebruikte find/create zonder serialisatie. De voortgangstelling en update konden elkaar passeren.

In de afzonderlijke testkopie is een minimale correctie bewezen: vergrendel de bestaande User-row binnen de starttransactie, en vergrendel de bestaande Enrollment-row vóór interaction-upsert/count/progress-update. Dit serialiseert alleen dezelfde gebruiker respectievelijk inschrijving; geen nieuwe rol, schema, score, vraag of prijs. De nieuwe concurrencyproef plus zeven bestaande hoofdstukruntimegevallen slagen daarna: **9/9 PASS**. Reads, eigenaarschap en de bestaande fail-closed antwoordtransactie blijven behouden.

De correctie staat reviewbaar in `docs/wp10-learning-runtime-repair.patch`, inclusief twee gewone integratietestbestanden die zonder expliciete lokale testdatabase worden overgeslagen. Deze patch bevat daarnaast:

1. De striktere migratie-/checksumcontrole hierboven.
2. Een expliciete v1.0-historyfixture voor de achtereenvolgende v1.0/v1.1-test. De juiste geslaagde historische poging wordt gecontroleerd; de 40/50-cesuur, historie-assertions en antwoordpolicy blijven intact.
3. Cursusafronding in dezelfde transactie als een **nieuwe geslaagde** examsubmission: alleen de eigen IN_PROGRESS-inschrijving van exact dezelfde courseVersion wordt COMPLETED met de submissiondatum. Mislukte examens en bestaande submissions worden niet herschreven. Geen backfill van historische enrollments.

De patch bevat vier gewijzigde kandidaatbestanden (`scripts/test-learning-database.ts`, `src/app/e-learnings/actions.ts`, `src/lib/learning/learning-final-exam-runtime.integration.test.ts`, `src/lib/learning/learning-final-exam-service.ts`) en twee nieuwe tests (`learning-full-course-runtime.integration.test.ts`, `learning-concurrency-runtime.integration.test.ts`). Hij is geen actieve productcode op main: Learning-modellen/routes bestaan daar nog niet. Reverse-apply-check tegen de geteste kandidaat slaagt. Pas hem na review toe in een gerichte LMS-integratie die actuele F3-code behoudt, en draai gecombineerde tests opnieuw. De oorspronkelijke LMS-worktree is ongemoeid gelaten.

## Controlepunten LMS-01–LMS-50

PASS hieronder betreft het genoemde bewijs op de geïsoleerde kandidaat, tenzij expliciet main staat. Het is geen algemene productieacceptatie. BLOCKED betekent een concreet ontbrekende voorwaarde; NOT TESTED betekent dat geen voldoende runtime-/browserbewijs is geleverd.

| Code | Status | Bewijs / resterend punt |
|---|---|---|
| LMS-01 | PASS | Main en gecommitteerde kandidaat apart geïnventariseerd; routes/modellen/branches herleidbaar. |
| LMS-02 | PASS | Bestaande User/Prisma/outbox; geen concurrerende account- of betaalarchitectuur. |
| LMS-03 | PASS | Learning-capability, actieve gebruiker server-side; geen nieuwe globale STUDENT-rol. |
| LMS-04 | PASS | Canoniek harnas hersteld: 91 migraties, volledige lijst/checksums, nul fouten, seed/replay en ongewijzigde registry. |
| LMS-05 | PASS | v1.0/v1.1-historyfixture consistent; scoring/historie-assertions behouden, canonieke runtime opnieuw PASS. |
| LMS-06 | PASS | Main aanbod bewust aankondiging; catalogusunit-/presentatietests groen. |
| LMS-07 | PASS | Hoofdstukken, toets en certificaatbeperking aanwezig; prijs ongewijzigd. |
| LMS-08 | PASS | Bestaande action/runtime maakt één eigen enrollment; gelijktijdigheid na patch groen. |
| LMS-09 | PASS | Unieke user/version-grens; zes starts na patch zonder ongecontroleerde initialisatiefout. |
| LMS-10 | PASS | Queryservice filtert persoonlijke enrollments; outsider ontvangt geen resultaten. |
| LMS-11 | PASS | Tien geordende hoofdstukken, versiegebonden blokken. |
| LMS-12 | PASS | Getypeerde rendering en contenttests; formatieve blokvoltooiing blijft bestaand beleid. |
| LMS-13 | NOT TESTED | Volledige geïntegreerde browsernavigatie is niet door unit-/servicetests bewezen. |
| LMS-14 | PASS | Actieve user, eigen enrollment, bestaande course/version-status; exam vereist tien afgeronde hoofdstukken. |
| LMS-15 | PASS | H1–H10, v1.0/v1.1-exam en 50 unieke examposities aanwezig; formele contentreview apart. |
| LMS-16 | PASS | Single/multi/true-false/case/sorting-matching volgens bestaande answer-policy. |
| LMS-17 | PASS | Servervalidatie, vreemde question/block/answer afgewezen; exact-set scoring. |
| LMS-18 | PASS | Bestaande directe single-choicefeedback; multi/sorting pas na expliciete controle. Geen norm gewijzigd. |
| LMS-19 | PASS | Gescheiden examherkansingen, immutable ingediende antwoorden; formatieve historie behouden. |
| LMS-20 | PASS | Dubbele blockcompletion blijft één interactie; gelijktijdige projection na patch consistent. |
| LMS-21 | BLOCKED | Leerdoelmatrix aanwezig; docent-/assessmentvalidatie niet door technische tests vervangen. |
| LMS-22 | BLOCKED | H1 inhoud onderzocht; didactische answer-cue ter beoordeling. |
| LMS-23 | BLOCKED | H2 juridische rollen/medezeggenschap vereisen bronrevisie en menselijke review. |
| LMS-24 | BLOCKED | H3 inhoud/risicoselectie gecontroleerd; studentvalidatie open. |
| LMS-25 | BLOCKED | H4–H10 onderzocht, toetsingsuitzonderingen en methodevoorbeelden niet juridisch vrijgegeven. |
| LMS-26 | PASS | Bevestigde 3%-versus-21%-race lokaal hersteld en met PostgreSQL bewezen; main-integratie open. |
| LMS-27 | PASS | Zeven runtimegevallen hervatten zonder extra attempt, versie behouden. |
| LMS-28 | PASS | Onvolledige hoofdstukken geweigerd; volledige formatieve interacties kunnen ook met nul correcte antwoorden afronden, volgens bestaand ontwerp. |
| LMS-29 | PASS | Geslaagde nieuwe examsubmission voltooit eigen courseVersion-inschrijving atomair; onvoldoende doet dit niet; replay behoudt completiondatum. |
| LMS-30 | PASS | H1–H10 → onvoldoende → herkansing → geslaagd → completion via services; echte login/logout/nieuwe sessie behoudt identiek resultaat. Browserinteractie blijft apart open. |
| LMS-31 | BLOCKED | Retentioncode aanwezig in kandidaat, bank canoniek DRAFT; niet op main of productie geactiveerd. |
| LMS-32 | PASS | Vijf vastgelegde unieke vragen/week, twaalf vensters; selector en lokale runtime. |
| LMS-33 | PASS | Bestaande 2 persoonlijk/2 kern/1 spreiding-policy en vraagversies; geen willekeurig nieuwe didactiek. |
| LMS-34 | BLOCKED | Bestaande retentionworker niet aan maintenance gekoppeld; uitsluitend mocktransport getest. |
| LMS-35 | PASS | Lokale retentionruntime: concurrente creatie, replay, stop/re-consent, jaarconsent en fake mail; geen echte bezorgclaim. |
| LMS-36 | PASS | Eigen user/enrollment, actieve status, geen aankoop of organisatie-impersonation toegevoegd. |
| LMS-37 | PASS | Outsider kan player, resultaten en persoonlijke certificaatdownload niet lezen. Publieke certificaatvelden blijven expliciet beperkt. |
| LMS-38 | PASS | Kritieke toegang en scoring server-side; juiste antwoorden niet in voorafgaand player-readmodel. |
| LMS-39 | BLOCKED | Concrete bewaartermijnen/verwijderprocedure en publieke certificaatprivacy nog operationeel/juridisch accepteren. |
| LMS-40 | PASS | Immutable poging/certificaatguards en vreemde antwoorden geweigerd; databaseconstraints getest. |
| LMS-41 | NOT TESTED | Definitieve volledige studentreis op geïntegreerde branch ontbreekt. |
| LMS-42 | NOT TESTED | Geen volledige desktop/mobile studentbrowsermatrix bewezen; publieke mainpagina apart gecontroleerd. |
| LMS-43 | NOT TESTED | Publieke skiplink werkt; volledige player-/PDF-schermlezeracceptatie open. |
| LMS-44 | NOT TESTED | Eerdere PO-zoomafspraak behouden; geen nieuwe volledige LMS-zoomtest uitgevoerd. |
| LMS-45 | BLOCKED | Racecorrectie lokaal groen; aanvullende browserbediening start niet (CUA padfout), volledige browserstorings-/herstelacceptatie open. |
| LMS-46 | NOT TESTED | Nieuwe student via volledige geïntegreerde browserketen nog niet geaccepteerd. |
| LMS-47 | NOT TESTED | Service-/contenttests zijn geen volledige handmatige cursusdoorloop. |
| LMS-48 | PASS | Werkelijke PostgreSQL-hervatting, echte Better Auth-sessiewisseling en eigenaarschap via lokale HTTP-app bewezen; browserbeperking apart. |
| LMS-49 | BLOCKED | Technische cursusafrondingsketen PASS; formele certificaat-/didactische en geïntegreerde browseracceptatie open. |
| LMS-50 | PASS | Negatieve toegang/antwoorden, zes gelijktijdige starts/updates en bestaande examconcurrency onderzocht; patch hertest groen. |

## Releaseadvies

**TECHNICAL NO-GO** voor geïntegreerde LMS-vrijgave: runtime staat niet op actuele main, integratie moet F3 behouden en alle relevante runtime/browsergrenzen moeten groen zijn.

**SECURITY NO-GO** voor integrale productieacceptatie: naast specifieke LMS-resultaten blijven de WP05-dependencybevindingen en operationele privacy-/retentieacceptatie gelden.

**CONTENT REVIEW READY** als prototype voor een inhoudelijk deskundige; **geen inhoudelijke/juridische goedkeuring**. Retentievragen blijven DRAFT; geen nieuwe certificeringsclaims.

**LMS REVIEW READY** voor review van het afgebakende prototype, de concrete patch en de testbewijzen. **FUNCTIONAL RELEASE NOT READY**: volledige geïntegreerde browseracceptatie en inhoudelijke/didactische vrijgave ontbreken. Reviewgereed is geen releasegoedkeuring.

**LMS RELEASE NOT READY.** Geen merge, deployment, productiegegevens, betaalde inschrijving of echte e-mail. Voortgang van alle werkpakketten staat in [het overkoepelende overzicht](work-packages-01-10-overview.md).
