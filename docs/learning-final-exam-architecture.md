# WL-001 eindtoets — architectuurpreflight en datamodel

## Besluit

De bestaande Learning-modellen dekken een formatieve cursusvraag en hoofdstukvoortgang, maar geen afsluitende toets met conceptantwoorden, verborgen answer key, atomische submission en een immutable resultaat. Daarom krijgt WL-001 een afzonderlijke, beperkte eindtoetslaag. De centrale LearningQuestion/LearningQuestionOption Question Bank blijft de inhoudsbron; examversies bewaren uitsluitend de vraagset, volgorde en toetsmatrijsmetadata.

## Preflight §15

**Bestaand:** LearningCourse/LearningCourseVersion, LearningEnrollment, LearningChapterProgress, de versieerbare LearningQuestion Question Bank, LearningQuestionOption, bestaande server-side gebruikersautorisatie en actieve-accountcontrole.

**Veilig hergebruikt:** de cursusversie (prototype-0.17) en enrollment vormen de toegangsscope; examvragen verwijzen naar de bestaande Question Bank-versie via de stabiele rij-ID; bestaande User-ID en actieve LearningEnrollment bepalen eigenaarschap. De exam-readmodel selecteert expliciet uitsluitend vraagtekst en niet-gecorrigeerde antwoordoptietekst.

**Niet herbruikbaar:** LearningQuestionAttempt geeft formatieve correctheid/feedback per antwoord terug en slaat geen draftstatus per afsluitende poging op. LearningChapterProgress kan geen examresultaat of poginghistorie representeren. De bestaande completion-status betekent hoofdstukcompletion en mag niet worden omgebogen tot exam-pass.

**Ontbrekend en daarom toegevoegd:** stabiele Exam-identiteit; immutable ExamVersion met CourseVersion- en configuratiereferentie; geordende mapping naar Question Bank-vragen; toetsmatrijsmetadata; per-gebruiker ExamAttempt; upsertbare draftantwoorden; definitieve score, percentage en passed-snapshot. Een additive Prisma-migratie is dus noodzakelijk.

## Relaties en invarianten

- LearningExam is de stabiele toetsidentiteit, gekoppeld aan één cursus.
- LearningExamVersion is gekoppeld aan de exacte LearningCourseVersion; voor v1 is de identiteit WL-001-FINAL / WL-001-EXAM-1.0.
- LearningExamQuestion verwijst naar één bestaande Question Bank-vraag en bewaart E01–E50-code, positie, hoofdstuk, cognitief niveau B/T/A, één of meer knowledge areas en de kritieke-leerdoelmarkering. Vraagtekst, opties en correctheid worden niet gedupliceerd.
- LearningExamAttempt koppelt exact één gebruiker, enrollment, examversie en cursusversie. De database voorkomt twee actieve pogingen voor dezelfde enrollment/toets en bewaart de maxscore en cesuur bij de poging.
- LearningExamAnswer is uniek per poging/vraag. Samengestelde foreign keys eisen dat vraag en versie bij dezelfde examversie horen en dat poging en antwoord bij dezelfde gebruiker/enrollment horen.
- Alleen de database- en serverlaag berekent score. Een poging begint ongescoord; de database weigert inconsistente of onvolledige submissionresultaten. Ingediende pogingen en hun antwoorden zijn immutable.
- Een gepubliceerde ExamVersion en zijn mapping zijn immutable. De gedeelde Question Bank-bescherming wordt uitgebreid zodat vragen ook immutable zijn wanneer zij in een gepubliceerde ExamVersion voorkomen.
- Foreign keys gebruiken RESTRICT; er is geen cascade-delete van pogingen of resultaten.
- Resultaten per knowledge area zijn reproduceerbaar afleidbaar uit de immutable exammapping, Question Bank-vragen en vastgelegde antwoorden; er is geen duplicatieve arearesultaattabel nodig.

## V1-configuratie

questionCount = 50, maxScore = 50, passingScore = 40, passingPercentage = 80, timeLimitMinutes = null en attemptLimit = null. Een vraag levert alleen 1 punt op wanneer een single choice exact juist is of de multi-selectset exact overeenkomt. Onbeantwoord en iedere andere combinatie leveren 0 op. De status van H1–H10 blijft afzonderlijk van toetsstatus en verandert niet door deze migratie.

## Migratie

Migratie `20260927210000_add_learning_final_exam` is forward-only en additive. De volledige keten met alle 84 repositorymigraties is vanaf nul uitgevoerd op de tijdelijke database uit `scripts/test-learning-database.ts`; de bestaande Learning-runtime-, seed-idempotentie- en historie-invarianten slaagden. De tijdelijke database is na afloop verwijderd. De migratie is niet toegepast op de gedeelde ontwikkel- of productiedatabase. Een upgradepad op een bestaande database is nog niet afzonderlijk getest.

## Canonieke examcontent en beperkte kwaliteitscorrecties

De enige inhoudelijke bron van waarheid is `prisma/seed-data/WL-001_FINAL_EXAM_v1.0_CANONICAL_QUESTION_BANK.md`, aangeleverd door de gebruiker. E13 en E39 zijn vervangen door de laatste door de gebruiker verstrekte versies. E31–E34 zijn intern gemarkeerd als `CONTENT REVIEW REQUIRED — LEGAL` via `finalExamLegalReviewCodes`; hiervoor is geen datamodelveld of migratie toegevoegd. De precieze juridische inhoud blijft menselijke review vereisen.

Vóór publicatie is alleen beperkte afleiderpolish uitgevoerd waar de oorspronkelijke optie evident karikaturaal was. In E15, E19, E24, E26, E27, E29, E35, E37, E38, E46, E49 en E50 zijn respectievelijk opties die neerkwamen op niets doen tot letsel, techniek pas na een ongeval, standaard alles tegelijk, alleen beter opletten, onderzoek nooit in een PvA, wachten op letsel, een vaste vervaldatum, wachten tot een periodieke review, signalen negeren of eerst een volledige nieuwe cyclus starten realistischer verwoord. Geen correcte optie, sleutel, hoofdstuk, vraagtype, mapping, puntentelling of cesuur is gewijzigd. De volledige lijst staat ook in het verificatieverslag.

Er is een aparte Question Bank-seed en immutable `WL-001-EXAM-1.0` op de geïsoleerde database gevalideerd. De preflightdatabase is tijdelijk en na afloop verwijderd; de gedeelde ontwikkel-/productiedatabase is niet gemigreerd of geseed. Een fresh-installketen met 84 migraties en twee seedruns is geslaagd.

De generieke scoringspolicy gebruikt de bestaande Question Bank-vorm: een SINGLE_CHOICE-correct antwoord staat als array met precies één value opgeslagen; MULTI_CHOICE vereist een exacte set. Alleen de exacte correcte set levert één punt op; elke andere combinatie levert nul op. De studentpayload verwijdert answer key, uitleg en optiecorrectheidsvlaggen. De examplayer vermeldt bij iedere MULTI_CHOICE: “Meerdere antwoorden zijn mogelijk. Selecteer alle juiste antwoorden.” Gerichte tests leggen deze regels vast.
