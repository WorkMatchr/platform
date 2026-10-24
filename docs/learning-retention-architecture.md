# WorkMatchr Learning — kennisbehoud v1 architectuurpreflight

**Status:** oorspronkelijke architectuurpreflight, bijgewerkt met de prototype-implementatie onderaan dit document. PostgreSQL-runtime/migratie/seed niet getest of toegepast. Retentiebank blijft DRAFT.
**Repositorymoment:** branch `codex/learning-vertical-slice-current`, HEAD `6095114089baa551e58c5e03a8260327444956d4`.

## Doel en invarianten

Kennisbehoud is een afzonderlijk, vrijwillig programma voor WL-001 na de bestaande cursuscompletion en een geslaagde eindtoets. Het is geen examen en is geen voorwaarde voor, of wijziging van, een behaald certificaat. Een deelnemer kiest expliciet voor de 12-weekse deelname; toestemming, toestemmingstekstversie en programmaversie moeten historisch herleidbaar zijn. De looptijd wordt gerekend vanaf `startedAt` in twaalf vaste vensters van elk zeven etmalen. Het model moet maximaal twaalf weekchecks met elk precies vijf vaste vraagversies kunnen bewaren, met de opgegeven afsluitperiode van 30 dagen.

## Herbruikbare architectuur

| Behoefte | Bestaand fundament | Gebruik/beperking |
| --- | --- | --- |
| Eligibility en cursusidentiteit | `LearningCourse`, `LearningCourseVersion`, `LearningEnrollment`, `LearningChapterProgress` | Gebruik de eigen enrollment, cursusversie en bestaande server-side H1–H10-completioncontrole. Niet afleiden uit alleen een clientstatus. |
| Geslaagde toets | `LearningExamAttempt`, `LearningExamVersion`, `LearningExamQuestion`, `LearningExamAnswer` | Server-side kan de eerste geslaagde WL-001-poging en de bijbehorende immutable knowledge-area-mapping als beginsignaal gebruiken. Correcte antwoorden blijven server-only. |
| Vraagversies en antwoordopties | `LearningQuestion`, `LearningQuestionOption` | Hergebruik de immutable, versieerbare vraagrecords en exact-set/single-choice scoring waar passend. De bestaande Question Bank bevat geen retention-only status, kritisch-conceptveld of zelfstandige hoofdstukkoppeling. |
| Resultaat- en performancegegevens | `LearningExamQuestion.knowledgeAreas`; `LearningQuestionAttempt` | Examenperformance is herleidbaar tot de examversie. Formatieve pogingen zijn cursusgebonden. Er is nog geen retentionperformanceprojectie; die kan in v1 uit append-only retentionantwoorden worden afgeleid. |
| Eigenaarschap en privacy | Better Auth `User`; samengestelde Learning-FK's; server-side userfilters | Deelname, weekchecks en antwoorden moeten via samengestelde relaties en services aan dezelfde gebruiker/enrollment worden gebonden. Bestaande autorisatie blijft de grens. |
| Transactionele mailintentie | `NotificationOutbox` | Kan een idempotente intent per vrijgegeven weekcheck opslaan. Geen mail rechtstreeks vanuit een page/action. |
| Mailbezorging en onderhoud | beveiligde `/api/maintenance/marketplace`, bestaande certificate- en assignmentworkers, GitHub Actions workflow | De worker/route is schedule-agnostisch en draait achter de bestaande beveiliging; de productieworkflow wordt alleen op `main` uitgevoerd wanneer `MARKETPLACE_NOTIFICATIONS_ENABLED=true`. Kennisbehoud vereist een afzonderlijke template/worker en releasecontrole; de bestaande workflow of providerconfiguratie wordt hier niet geactiveerd of aangepast. |
| Certificaat | `LearningCertificate` | Alleen een afzonderlijk, onveranderlijk bewijs van eerdere afronding. Stoppen, missen of fout beantwoorden verandert certificaat of examstatus nooit. |
| Jaarherinnering en jaarcheck | Aparte `LearningAnnualReminder` en `LearningRetentionAnnualCheck`-modellen | Jaarherinnering heeft eigen expliciete toestemming, loopt vanaf de eerste geslaagde eindtoets op kalenderjaarbasis en is niet gekoppeld aan certificaatverval. Per reminder hoort maximaal één brede 10-vragencheck uit R001–R100. |

## Ontbrekende domeinobjecten

De bestaande schema's modelleren geen vrijwillig programma, toestemming, deelnemersstatus, vaste weekvensters, gepubliceerde retentionbank, gecompileerde weekvraagset of bijbehorende antwoordhistorie. Een afzonderlijke additieve migratie is daarom nodig voordat de databaseflow wordt gebruikt. De oorspronkelijke retentionmigratie blijft ongewijzigd; migratie `20260930120000_correct_learning_retention_publication_policy` vervangt de jaarcheckguard forward-only. De migratiestatus kon in deze werkboom niet worden opgevraagd: `.env`/`DATABASE_URL` ontbreekt. In deze werkronde is geen migratie uitgevoerd; de status in relevante databases is NOT TESTED.

## Kleinste passende modelrichting

De volgende scheiding ondersteunt versiebeheer en voorkomt dat formatieve/examrecords een nieuwe betekenis krijgen. Exacte Prisma-namen en constraints worden vastgesteld bij de volledige modelspecificatie en migration review.

1. **Programma-identiteit en immutable programmaversie** — stabiel WL-001-retentionprogramma plus versie met duur, vijf posities per week, 30-daagse naloop, selectiebeleidversie, consentversie en gepubliceerde lifecycle. Een bestaande deelname verwijst altijd naar de versie waarmee zij begon.
2. **Question Bank-versie/mapping** — een afzonderlijke retentionbankversie koppelt uitsluitend gepubliceerde retentionvraagversies aan hoofdstuk, knowledge area, cognitief niveau, difficulty, critical-concept- en eventuele legal-reviewmetadata. Question Bank-vragen worden niet uit examvragen gekopieerd of als examcontent gepresenteerd.
3. **Deelname** — user, bestaande WL-001 LearningEnrollment, course version, program version, status en consent-/start-/stop-/completiontimestamps. Databaseconstraints en een partiële unieke index moeten dubbele actieve deelnames voor dezelfde gebruiker en opleiding voorkomen.
4. **Weekcheck en vaste vraagkoppelingen** — unieke `(participation, weekNumber)` voor 1–12, vast `availableAt`/`closesAt` en onveranderlijke vraagkoppelingen op posities 1–5. De check wordt één keer samengesteld en hergebruikt bij refresh/resume; selectie mag niet bij iedere page load draaien.
5. **Antwoorden** — retention-specifieke antwoordrecords die aan weekcheck én exacte QuestionVersion vastzitten, met eigenaar, antwoord, juistheid en antwoordtijd. Database-FK's moeten vraaglidmaatschap en dezelfde participant/user afdwingen; dit blijft gescheiden van `LearningQuestionAttempt` en `LearningExamAnswer`.

De programmacontent en questionmapping worden na publicatie beschermd tegen mutatie volgens het bestaande Learning-/examversioneringspatroon. Gebruikte opties, correcte sets en verklarende feedback blijven gebonden aan de concrete `LearningQuestion`-versie. Geen retentie-/selectiesnapshot hoeft overbodig te dupliceren wat reproduceerbaar uit immutable mapping en antwoordevents kan worden afgeleid.

## Selectie, tijdvensters en meldingen: gekozen v1-regels

- Week `n` begint op `startedAt + (n - 1) × 7 × 24 uur`; alle zakelijke tijden zijn UTC `timestamptz`. Dit is bewust een vast verstreken interval van zeven etmalen, geen lokale kalenderweek die bij DST een andere lengte krijgt. Week 1 is direct beschikbaar. Alle checks sluiten op `startedAt + 12 × 7 dagen + 30 dagen`; gemiste vensters verlengen het programma niet. Op dat exacte sluitmoment vervalt antwoordmogelijkheid.
- Een selector gebruikt v1-versieerde, transparante gewichten voor persoonlijke exam-/retentionsignalen, brede kernonderwerpen en recency; critical concepts krijgen beperkte weging zonder volledige hoofdstukdekking te verdringen. De exacte weging, fallback, tie-break en de vierweekse herhalingsguard moeten door selectiecode/tests worden vastgelegd. Een aangemaakte weekset blijft daarna onveranderlijk.
- Weekchecks worden lazy/idempotent bij het beschikbaar worden van iedere week aangemaakt; de read-route mag `ensure-current-week` uitvoeren. Er worden bij opt-in geen 60 vragen vooraf gekozen. Een unieke deelname/weekconstraint voorkomt duplicaten; vaste vraagversies worden één keer toegewezen en hergebruikt.
- Catch-up maakt iedere inmiddels beschikbare check binnen de gezamenlijke sluitperiode aan. Alleen de actuele week krijgt een initiële weekmail-intent; oude catch-upweken geven geen mailstorm. Per deelname/week is de intent uniek. Direct vóór bezorging moet worker de gestopte status opnieuw controleren; stoppen blokkeert nog niet verzonden mail.
- De v1-weekmail is een transactionele opleidingsmail, alleen na expliciete opt-in. Geen vragen of antwoorden in de mail, geen marketing, en geen provider/cron activeren tijdens implementatie. Een mailfout verandert de checkstatus niet.
- De deelname wordt automatisch `COMPLETED` na 12 × 7 etmalen, ook als checks openstaan. Open checks blijven tot het gezamenlijke moment + 30 dagen antwoordbaar. Na `stoppedAt` ontstaan geen nieuwe checks of mails; de antwoordflow wordt eveneens geblokkeerd om toestemming na uitschrijving niet voort te zetten. Eerder opgeslagen checks/antwoorden blijven historisch leesbaar. Stoppen is in v1 niet hervatbaar; hoogstens één cyclus per enrollment/program version.
- Een jaarherinnering is een los opt-inrecord per behaalde cursus, onafhankelijk van retention. `scheduledFor` is de UTC-calendar-year anniversary van de eerste geldige passdatum; 29 februari wordt in een niet-schrikkeljaar 28 februari. Er is maximaal één reminder en één bijbehorende 10-vragencheck; ingetrokken consent blokkeert verzending. De jaarcheck kan geen certificaat verlengen of vernieuwen.
- De jaarcheck is een aparte brede kennischeck van tien vragen, niet het eindexamen. De selector legt één gepubliceerde retentionvraag uit ieder hoofdstuk H1–H10 vast. Exam-/retentionsignalen mogen alleen licht meewegen bij de keuze binnen een hoofdstuk; zij mogen de hoofdstukdekking niet vernauwen. De selectie wordt bij checkaanmaak vastgelegd en daarna niet opnieuw berekend.

## Preflightstatus en open beslispunten

> Dit deel beschrijft de architectuurstand bij de initiële preflight; de huidige implementatiestatus en open punten staan in **Verticale prototypeflow** hieronder.

- Branch/HEAD gecontroleerd: `codex/learning-vertical-slice-current` / `6095114089baa551e58c5e03a8260327444956d4`; worktree was schoon.
- H1–H10, prototype-0.17, exam v1.0/v1.1, examattempts, Question Bank en certificaatmodellen zijn aanwezig volgens de actuele Learning-documentatie/schema.
- Exam-v1.1 gebruikt 50 concrete `LearningQuestion`-versies, met hoofdstuk-/knowledge-area-mapping op `LearningExamQuestion`; de vraagbank zelf heeft geen algemeen retentionlabel.
- Mail/outbox en beveiligde maintenance-API plus GitHub Actions workflow bestaan. Productie-workflow activeert alleen op de default branch met expliciete Actions-variable; deze preflight heeft niets geactiveerd.
- `npm run db:validate` slaagde met een tijdelijke syntactische placeholder-URL; Prisma valideert daarmee alleen het schema en maakt geen databaseverbinding. `prisma migrate status` is `NOT TESTED` doordat geen echte `DATABASE_URL` beschikbaar is. Geen gedeelde database is benaderd of aangepast.
- De volledige regels voor vraagbeantwoording, weekgeneratie, catch-up, e-mail, consent/stoppen en jaarherinnering zijn aangeleverd. Deel 10 stopt voorlopig midden in §142; jaarcheckfeedback/-afronding en de latere tests/acceptatie-, privacyretentie-/releasepoorten en commitinstructies blijven open totdat de ontbrekende opdrachttekst is aangeleverd.

## Inhoud en selector

De canonieke draftbank staat in src/lib/learning/learning-retention-content.ts; zij is nog niet ge-seed of als gepubliceerde Learning-content beschikbaar. De bank bevat R001–R100, hoofdstukverdeling 5/10/10/15/15/10/10/8/8/9, QuestionVersion 1, SINGLE_CHOICE/MULTI_CHOICE, exacte antwoordsets, afzonderlijke goede/foutfeedback en metadata. De huidige cognitieve classificatie is 20% begrip, 55% toepassing en 25% analyse. Juridisch gevoelige items zijn intern legalReview gemarkeerd en blijven draft tot review. Tests bewaken dat questionstammen niet letterlijk met de v1.1-examstammen samenvallen. Bij de eerste antwoordlengteanalyse was 33 van de 63 single-choiceitems (52,4%) het correcte antwoord uniek het langst. Na beperkte inkorting van veertien correcte opties is dit 21 van 63 (33,3%). De antwoordposities zijn A/B/C/D 14/14/16/19; de bank blijft DRAFT tot de gehele inhoudelijke publicatiegate is geaccepteerd.

`src/lib/learning/learning-retention-selector.ts` bevat een pure, versioned selector (WL-001-RETENTION-SELECT-1.0). Hij weigert STOPPED deelname en niet-gepubliceerde vragen, levert exact vijf unieke vraagversies in de expliciete 2 persoonlijke / 2 kern / 1 spreidingsmix, gebruikt exam- en retentionfoutpercentages als persoonlijke signalen, een vierweekse herhalingsguard met fallback wanneer anders geen set kan worden samengesteld en deterministische tie-breaks. De Prisma-service legt de set bij aanmaak persistent vast. De runtime haalt de zwaktes uit de eerste geslaagde examattempt en uit eerdere weekantwoorden.

`src/lib/learning/learning-retention-policy.ts` bevat antwoord- en feedbackbeleid, hervatpositie, statussen, checkvensters, actuele-weekmailregel en calendar-year date arithmetic. Multi-select blijft binair exact-set voor de checkscore; de feedbacksplit benoemt na definitief beantwoorden geselecteerde juiste, gemiste juiste en geselecteerde onjuiste opties zonder deelpunten.

`selectRetentionAnnualQuestions` in `src/lib/learning/learning-retention-selector.ts` selecteert exact tien gepubliceerde, unieke vraagversies, één per hoofdstuk 1–10. Een kennisgebiedsignaal heeft uitsluitend beperkte invloed op de keuze binnen het hoofdstuk. De check kan dus niet door adaptiviteit tot enkele zwakke onderwerpen vernauwen. De bestaande jaarcheckservice slaat selectie en antwoorden persistent op.

## Verticale prototypeflow

De wekelijkse service staat in `src/lib/learning/learning-retention-service.ts`; de framework-onafhankelijke orchestratietests staan in `learning-retention-runtime-core.test.ts`. De route onder `/e-learnings/[courseSlug]/kennisbehoud` toont een expliciete, niet vooraf aangevinkte opt-in, de twaalf-weekse status, afzonderlijke jaarconsent en de stopactie. Een weekroute toont één vraag tegelijk met native radio-/checkboxbediening, expliciete multi-selectinstructie, definitieve servercontrole, feedback, voortgang, hervatten en eindresultaat. Antwoordsleutels worden vóór definitief beantwoorden uit het client-readmodel weggelaten. STOPPED blokkeert nieuwe antwoorden; bestaande resultaten blijven als historie leesbaar.

Weekchecks ontstaan lazy/idempotent bij openen of via `ensureRetentionSchedule`; de schedulerhook maakt beschikbare gemiste weken veilig aan, geeft alleen de actuele week een outbox-intent en gebruikt database-uniciteit voor herhaalde runs. Stoppen markeert nog pending weekmail als niet-bezorgbaar. De afzonderlijke worker controleert deelname/consent opnieuw vóór bezorging en heeft geen route/cron-koppeling in deze wijziging. `runLearningRetentionMaintenance` is de schedule-agnostische hook voor weekgeneratie plus annual reminder intents. Productieplanning en outboxbezorging zijn niet geactiveerd.

De jaarherinnering wordt los van deelname ingeschakeld op basis van de eerste pass en H1–H10-completion. De jaarlijkse speler wordt na de due reminder beschikbaar, maakt exact tien persistent geselecteerde vragen met één item uit elk hoofdstuk, beoordeelt server-side en toont score 0–10 en hoofdstuklinks zonder cesuur of certificaatwijziging. Jaarmail-intents gebruiken dezelfde aparte, niet-geactiveerde retentionworker.

### Verificatie en beperkingen

- Geautomatiseerde bank-, publication-policy-, selector-, policy- en in-memory orchestratietests zijn beschikbaar. Deze bewijzen niet dat de Prisma-services, migraties, locks, outboxqueries of databasetriggers op PostgreSQL werken.
- **DATABASE RUNTIME NOT TESTED — ENVIRONMENT LIMITATION**: geen `DATABASE_URL`/geïsoleerde PostgreSQL beschikbaar; geen migratie, seed of gedeelde databasewijziging uitgevoerd.
- **BROWSER ACCEPTANCE: NOT TESTED — TOOLING LIMITATION**: geen bestaande geauthenticeerde browsersessie; geen account aangemaakt en geen echte mail verzonden.
- Er is geen daadwerkelijke `LearningRetentionProgramVersion` gepubliceerd. R001–R100 zijn uitsluitend canonieke repositorycontent met status DRAFT; studenten kunnen de bank niet selecteren totdat formele review, veilige database-publicatie en programmaversiepublicatie afzonderlijk zijn goedgekeurd.
- Handmatige keyboard-, responsive- en screenreaderreview blijft open. Geen WCAG 2.2 A/AA-conformiteitsclaim.
- `docs/learning-retention-content-review.md` blijft leidend voor aantallen, antwoordlengte, verdelingen en legal-reviewstatus.
