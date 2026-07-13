-- CreateEnum
CREATE TYPE "IntakeQuestionnaireVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'RETIRED');

-- CreateEnum
CREATE TYPE "IntakeQuestionCategory" AS ENUM ('HELP_REQUEST', 'DESIRED_OUTCOME', 'SITUATION', 'IMPACT', 'URGENCY', 'LOCATION', 'WORK_MODE', 'PLANNING', 'CONSTRAINTS');

-- CreateEnum
CREATE TYPE "IntakeQuestionInputType" AS ENUM ('SHORT_TEXT', 'LONG_TEXT', 'NUMBER', 'BOOLEAN', 'DATE', 'SINGLE_SELECT', 'MULTI_SELECT', 'ORGANIZATION_LOCATION');

-- DropIndex
DROP INDEX "Assignment_intakeId_idx";

-- Voeg de nieuwe intakevelden eerst nullable toe. Een gecontroleerde backfill en
-- de NOT NULL-constraints volgen nadat vraagsetversie 1 is vastgelegd.
ALTER TABLE "Intake" ADD COLUMN "questionnaireVersionId" UUID,
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "IntakeQuestionnaire" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "IntakeQuestionnaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntakeQuestionnaireVersion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "questionnaireId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "IntakeQuestionnaireVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "IntakeQuestionnaireVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntakeQuestion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "questionnaireVersionId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "category" "IntakeQuestionCategory" NOT NULL,
    "inputType" "IntakeQuestionInputType" NOT NULL,
    "label" TEXT NOT NULL,
    "helpText" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL,
    "minLength" INTEGER,
    "maxLength" INTEGER,
    "minNumber" DECIMAL(12,2),
    "maxNumber" DECIMAL(12,2),
    "minSelections" INTEGER,
    "maxSelections" INTEGER,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "IntakeQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntakeQuestionOption" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "questionId" UUID NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isExclusive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "IntakeQuestionOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntakeAnswer" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "intakeId" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "textValue" TEXT,
    "numberValue" DECIMAL(12,2),
    "booleanValue" BOOLEAN,
    "dateValue" DATE,
    "organizationLocationId" UUID,
    "updatedByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "IntakeAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntakeAnswerOption" (
    "intakeAnswerId" UUID NOT NULL,
    "optionId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntakeAnswerOption_pkey" PRIMARY KEY ("intakeAnswerId","optionId")
);

-- CreateTable
CREATE TABLE "IntakeAnswerRevision" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "intakeAnswerId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "textValue" TEXT,
    "numberValue" DECIMAL(12,2),
    "booleanValue" BOOLEAN,
    "dateValue" DATE,
    "organizationLocationId" UUID,
    "changedByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntakeAnswerRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntakeAnswerRevisionOption" (
    "intakeAnswerRevisionId" UUID NOT NULL,
    "optionId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntakeAnswerRevisionOption_pkey" PRIMARY KEY ("intakeAnswerRevisionId","optionId")
);

-- CreateTable
CREATE TABLE "IntakeStatusHistory" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "intakeId" UUID NOT NULL,
    "fromStatus" "IntakeStatus",
    "toStatus" "IntakeStatus" NOT NULL,
    "changedByUserId" UUID NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntakeStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IntakeQuestionnaire_slug_key" ON "IntakeQuestionnaire"("slug");

-- CreateIndex
CREATE INDEX "IntakeQuestionnaire_isActive_idx" ON "IntakeQuestionnaire"("isActive");

-- CreateIndex
CREATE INDEX "IntakeQuestionnaireVersion_questionnaireId_idx" ON "IntakeQuestionnaireVersion"("questionnaireId");

-- CreateIndex
CREATE INDEX "IntakeQuestionnaireVersion_status_idx" ON "IntakeQuestionnaireVersion"("status");

-- CreateIndex
CREATE INDEX "IntakeQuestionnaireVersion_publishedAt_idx" ON "IntakeQuestionnaireVersion"("publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "IntakeQuestionnaireVersion_questionnaireId_version_key" ON "IntakeQuestionnaireVersion"("questionnaireId", "version");

-- CreateIndex
CREATE INDEX "IntakeQuestion_questionnaireVersionId_idx" ON "IntakeQuestion"("questionnaireVersionId");

-- CreateIndex
CREATE INDEX "IntakeQuestion_category_idx" ON "IntakeQuestion"("category");

-- CreateIndex
CREATE UNIQUE INDEX "IntakeQuestion_questionnaireVersionId_key_key" ON "IntakeQuestion"("questionnaireVersionId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "IntakeQuestion_questionnaireVersionId_sortOrder_key" ON "IntakeQuestion"("questionnaireVersionId", "sortOrder");

-- CreateIndex
CREATE INDEX "IntakeQuestionOption_questionId_idx" ON "IntakeQuestionOption"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "IntakeQuestionOption_questionId_value_key" ON "IntakeQuestionOption"("questionId", "value");

-- CreateIndex
CREATE UNIQUE INDEX "IntakeQuestionOption_questionId_sortOrder_key" ON "IntakeQuestionOption"("questionId", "sortOrder");

-- CreateIndex
CREATE INDEX "IntakeAnswer_intakeId_idx" ON "IntakeAnswer"("intakeId");

-- CreateIndex
CREATE INDEX "IntakeAnswer_questionId_idx" ON "IntakeAnswer"("questionId");

-- CreateIndex
CREATE INDEX "IntakeAnswer_organizationLocationId_idx" ON "IntakeAnswer"("organizationLocationId");

-- CreateIndex
CREATE INDEX "IntakeAnswer_updatedByUserId_idx" ON "IntakeAnswer"("updatedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "IntakeAnswer_intakeId_questionId_key" ON "IntakeAnswer"("intakeId", "questionId");

-- CreateIndex
CREATE INDEX "IntakeAnswerOption_optionId_idx" ON "IntakeAnswerOption"("optionId");

-- CreateIndex
CREATE INDEX "IntakeAnswerRevision_intakeAnswerId_idx" ON "IntakeAnswerRevision"("intakeAnswerId");

-- CreateIndex
CREATE INDEX "IntakeAnswerRevision_organizationLocationId_idx" ON "IntakeAnswerRevision"("organizationLocationId");

-- CreateIndex
CREATE INDEX "IntakeAnswerRevision_changedByUserId_idx" ON "IntakeAnswerRevision"("changedByUserId");

-- CreateIndex
CREATE INDEX "IntakeAnswerRevision_createdAt_idx" ON "IntakeAnswerRevision"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "IntakeAnswerRevision_intakeAnswerId_version_key" ON "IntakeAnswerRevision"("intakeAnswerId", "version");

-- CreateIndex
CREATE INDEX "IntakeAnswerRevisionOption_optionId_idx" ON "IntakeAnswerRevisionOption"("optionId");

-- CreateIndex
CREATE INDEX "IntakeStatusHistory_intakeId_createdAt_idx" ON "IntakeStatusHistory"("intakeId", "createdAt");

-- CreateIndex
CREATE INDEX "IntakeStatusHistory_changedByUserId_idx" ON "IntakeStatusHistory"("changedByUserId");

-- CreateIndex
CREATE INDEX "IntakeStatusHistory_toStatus_idx" ON "IntakeStatusHistory"("toStatus");

-- Stop expliciet bij bestaande dubbele opdrachtkoppelingen. De migratie verwijdert
-- of kiest nooit stilzwijgend een opdracht.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Assignment"
    WHERE "intakeId" IS NOT NULL
    GROUP BY "intakeId"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Module 5A-migratie gestopt: meerdere opdrachten verwijzen naar dezelfde intake.';
  END IF;
END $$;

-- CreateIndex
CREATE UNIQUE INDEX "Assignment_intakeId_key" ON "Assignment"("intakeId");

-- CreateIndex
CREATE INDEX "Intake_questionnaireVersionId_idx" ON "Intake"("questionnaireVersionId");

-- CreateIndex
CREATE INDEX "Intake_clientOrganizationId_status_updatedAt_idx" ON "Intake"("clientOrganizationId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "Intake_createdByUserId_status_updatedAt_idx" ON "Intake"("createdByUserId", "status", "updatedAt");

-- AddForeignKey
ALTER TABLE "IntakeQuestionnaireVersion" ADD CONSTRAINT "IntakeQuestionnaireVersion_questionnaireId_fkey" FOREIGN KEY ("questionnaireId") REFERENCES "IntakeQuestionnaire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntakeQuestion" ADD CONSTRAINT "IntakeQuestion_questionnaireVersionId_fkey" FOREIGN KEY ("questionnaireVersionId") REFERENCES "IntakeQuestionnaireVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntakeQuestionOption" ADD CONSTRAINT "IntakeQuestionOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "IntakeQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intake" ADD CONSTRAINT "Intake_questionnaireVersionId_fkey" FOREIGN KEY ("questionnaireVersionId") REFERENCES "IntakeQuestionnaireVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntakeAnswer" ADD CONSTRAINT "IntakeAnswer_intakeId_fkey" FOREIGN KEY ("intakeId") REFERENCES "Intake"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntakeAnswer" ADD CONSTRAINT "IntakeAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "IntakeQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntakeAnswer" ADD CONSTRAINT "IntakeAnswer_organizationLocationId_fkey" FOREIGN KEY ("organizationLocationId") REFERENCES "OrganizationLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntakeAnswer" ADD CONSTRAINT "IntakeAnswer_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntakeAnswerOption" ADD CONSTRAINT "IntakeAnswerOption_intakeAnswerId_fkey" FOREIGN KEY ("intakeAnswerId") REFERENCES "IntakeAnswer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntakeAnswerOption" ADD CONSTRAINT "IntakeAnswerOption_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "IntakeQuestionOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntakeAnswerRevision" ADD CONSTRAINT "IntakeAnswerRevision_intakeAnswerId_fkey" FOREIGN KEY ("intakeAnswerId") REFERENCES "IntakeAnswer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntakeAnswerRevision" ADD CONSTRAINT "IntakeAnswerRevision_organizationLocationId_fkey" FOREIGN KEY ("organizationLocationId") REFERENCES "OrganizationLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntakeAnswerRevision" ADD CONSTRAINT "IntakeAnswerRevision_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntakeAnswerRevisionOption" ADD CONSTRAINT "IntakeAnswerRevisionOption_intakeAnswerRevisionId_fkey" FOREIGN KEY ("intakeAnswerRevisionId") REFERENCES "IntakeAnswerRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntakeAnswerRevisionOption" ADD CONSTRAINT "IntakeAnswerRevisionOption_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "IntakeQuestionOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntakeStatusHistory" ADD CONSTRAINT "IntakeStatusHistory_intakeId_fkey" FOREIGN KEY ("intakeId") REFERENCES "Intake"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntakeStatusHistory" ADD CONSTRAINT "IntakeStatusHistory_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Eerste, niet-persoonlijke vraagset. Deterministische UUID's maken de migratie,
-- seedvalidatie en toekomstige verwijzingen herleidbaar.
INSERT INTO "IntakeQuestionnaire" (
  "id", "slug", "name", "isActive", "createdAt", "updatedAt"
) VALUES (
  '00000000-0000-4000-8000-000000005000',
  'client-occupational-health-and-safety',
  'Arbo en veiligheid — opdrachtgever',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

INSERT INTO "IntakeQuestionnaireVersion" (
  "id", "questionnaireId", "version", "status", "publishedAt", "createdAt", "updatedAt"
) VALUES (
  '00000000-0000-4000-8000-000000005001',
  '00000000-0000-4000-8000-000000005000',
  1,
  'DRAFT',
  NULL,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

INSERT INTO "IntakeQuestion" (
  "id", "questionnaireVersionId", "key", "category", "inputType", "label", "helpText",
  "isRequired", "sortOrder", "minLength", "maxLength", "minNumber", "maxNumber",
  "minSelections", "maxSelections", "createdAt", "updatedAt"
) VALUES
  (
    '00000000-0000-4000-8000-000000005101', '00000000-0000-4000-8000-000000005001',
    'HELP_REQUEST_DESCRIPTION', 'HELP_REQUEST', 'LONG_TEXT', 'Waarbij heeft Uw organisatie hulp nodig?',
    'Beschrijf kort wat er speelt. U hoeft nog niet te weten welke specialist U nodig heeft. Vermeld geen namen, medische gegevens, BSN’s, wachtwoorden of andere vertrouwelijke persoonsgegevens.',
    true, 10, 20, 2000, NULL, NULL, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  (
    '00000000-0000-4000-8000-000000005102', '00000000-0000-4000-8000-000000005001',
    'HELP_REQUEST_TOPICS', 'HELP_REQUEST', 'MULTI_SELECT', 'Welke onderwerpen spelen bij Uw hulpvraag?',
    'Kies maximaal drie onderwerpen. Kies ‘Dat weet ik nog niet’ wanneer geen onderwerp passend of duidelijk is.',
    true, 20, NULL, NULL, NULL, NULL, 1, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  (
    '00000000-0000-4000-8000-000000005103', '00000000-0000-4000-8000-000000005001',
    'DESIRED_OUTCOME_DESCRIPTION', 'DESIRED_OUTCOME', 'LONG_TEXT', 'Wat wilt U met de ondersteuning bereiken?',
    'Beschrijf het gewenste resultaat, bijvoorbeeld een praktisch advies, een veilige werkwijze of duidelijkheid over vervolgstappen.',
    true, 30, 10, 1500, NULL, NULL, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  (
    '00000000-0000-4000-8000-000000005104', '00000000-0000-4000-8000-000000005001',
    'SITUATION_DESCRIPTION', 'SITUATION', 'LONG_TEXT', 'Wat is de huidige situatie en wat heeft U al gedaan?',
    'Beschrijf alleen informatie die nodig is om de situatie te begrijpen. Noem geen personen en voeg geen medische of andere bijzondere persoonsgegevens toe.',
    true, 40, 20, 3000, NULL, NULL, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  (
    '00000000-0000-4000-8000-000000005105', '00000000-0000-4000-8000-000000005001',
    'IMPACT_AREAS', 'IMPACT', 'MULTI_SELECT', 'Wie of wat merkt gevolgen van deze situatie?',
    'Kies maximaal vier opties. U kunt deze vraag ook overslaan.',
    false, 50, NULL, NULL, NULL, NULL, 1, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  (
    '00000000-0000-4000-8000-000000005106', '00000000-0000-4000-8000-000000005001',
    'AFFECTED_EMPLOYEE_COUNT', 'IMPACT', 'NUMBER', 'Om hoeveel medewerkers gaat het ongeveer?',
    'Een schatting is voldoende. Laat dit veld leeg wanneer het aantal niet bekend of niet van toepassing is.',
    false, 60, NULL, NULL, 1, 1000000, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  (
    '00000000-0000-4000-8000-000000005107', '00000000-0000-4000-8000-000000005001',
    'SUPPORT_URGENCY', 'URGENCY', 'SINGLE_SELECT', 'Hoe snel wilt U ondersteuning?',
    'Is er direct gevaar voor mensen? Volg dan eerst de noodprocedure van Uw organisatie en bel bij een acute noodsituatie 112. WorkMatchr is geen nood- of meldpunt.',
    true, 70, NULL, NULL, NULL, NULL, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  (
    '00000000-0000-4000-8000-000000005108', '00000000-0000-4000-8000-000000005001',
    'PREFERRED_WORK_MODE', 'WORK_MODE', 'SINGLE_SELECT', 'Hoe kan de ondersteuning volgens U het beste plaatsvinden?',
    'Dit is een voorkeur en geen garantie over de latere uitvoering.',
    true, 80, NULL, NULL, NULL, NULL, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  (
    '00000000-0000-4000-8000-000000005109', '00000000-0000-4000-8000-000000005001',
    'PRIMARY_LOCATION', 'LOCATION', 'ORGANIZATION_LOCATION', 'Op welke locatie speelt Uw hulpvraag vooral?',
    'Kies de belangrijkste actieve locatie. Bij volledig werken op afstand is deze vraag niet verplicht.',
    false, 90, NULL, NULL, NULL, NULL, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  (
    '00000000-0000-4000-8000-000000005110', '00000000-0000-4000-8000-000000005001',
    'PREFERRED_START_DATE', 'PLANNING', 'DATE', 'Vanaf wanneer wilt U bij voorkeur ondersteuning?',
    'Kies alleen een datum wanneer U al een voorkeur heeft. U kunt dit veld anders leeg laten.',
    false, 100, NULL, NULL, NULL, NULL, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  (
    '00000000-0000-4000-8000-000000005111', '00000000-0000-4000-8000-000000005001',
    'EXPECTED_ENGAGEMENT_SIZE', 'PLANNING', 'SINGLE_SELECT', 'Welke omvang van de ondersteuning verwacht U ongeveer?',
    'De keuze is een eerste inschatting en bepaalt nog geen opdrachttype of aanbieder.',
    false, 110, NULL, NULL, NULL, NULL, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  (
    '00000000-0000-4000-8000-000000005112', '00000000-0000-4000-8000-000000005001',
    'CONSTRAINTS_DESCRIPTION', 'CONSTRAINTS', 'LONG_TEXT', 'Zijn er belangrijke randvoorwaarden waarmee rekening moet worden gehouden?',
    'Denk bijvoorbeeld aan werktijden, toegang tot een locatie, vereiste afstemming of andere praktische beperkingen. Vermeld geen persoonsgegevens of secrets.',
    false, 120, NULL, 2000, NULL, NULL, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  );

INSERT INTO "IntakeQuestionOption" (
  "id", "questionId", "value", "label", "sortOrder", "isActive", "isExclusive", "createdAt", "updatedAt"
) VALUES
  ('00000000-0000-4000-8000-000000006101', '00000000-0000-4000-8000-000000005102', 'RISK_INVENTORY_EVALUATION', 'RI&E of plan van aanpak', 10, true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-000000006102', '00000000-0000-4000-8000-000000005102', 'WORKPLACE_OPERATIONAL_SAFETY', 'Veilig werken of veiligheid op de werkvloer', 20, true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-000000006103', '00000000-0000-4000-8000-000000005102', 'MACHINERY_WORK_EQUIPMENT', 'Machines, gereedschap of arbeidsmiddelen', 30, true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-000000006104', '00000000-0000-4000-8000-000000005102', 'HAZARDOUS_SUBSTANCES', 'Gevaarlijke stoffen', 40, true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-000000006105', '00000000-0000-4000-8000-000000005102', 'ERGONOMICS_PHYSICAL_LOAD', 'Ergonomie of lichamelijke belasting', 50, true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-000000006106', '00000000-0000-4000-8000-000000005102', 'PSYCHOSOCIAL_WORKLOAD', 'Werkdruk, ongewenst gedrag of sociale veiligheid', 60, true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-000000006107', '00000000-0000-4000-8000-000000005102', 'OCCUPATIONAL_HEALTH_EMPLOYABILITY', 'Gezondheid, verzuim of duurzame inzetbaarheid', 70, true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-000000006108', '00000000-0000-4000-8000-000000005102', 'EMERGENCY_RESPONSE_FIRE_SAFETY', 'BHV, brandveiligheid of ontruiming', 80, true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-000000006109', '00000000-0000-4000-8000-000000005102', 'INCIDENT_INVESTIGATION', 'Ongeval, incident of onderzoek', 90, true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-000000006110', '00000000-0000-4000-8000-000000005102', 'TRAINING_SAFETY_CULTURE', 'Training, instructie of veiligheidscultuur', 100, true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-000000006111', '00000000-0000-4000-8000-000000005102', 'POLICY_COMPLIANCE', 'Beleid, wetgeving of naleving', 110, true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-000000006112', '00000000-0000-4000-8000-000000005102', 'OTHER', 'Anders', 120, true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-000000006113', '00000000-0000-4000-8000-000000005102', 'NOT_SURE', 'Dat weet ik nog niet', 130, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-000000006114', '00000000-0000-4000-8000-000000005105', 'EMPLOYEES', 'Medewerkers', 10, true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-000000006115', '00000000-0000-4000-8000-000000005105', 'MANAGERS', 'Leidinggevenden', 20, true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-000000006116', '00000000-0000-4000-8000-000000005105', 'TEMPORARY_WORKERS_CONTRACTORS', 'Inleenkrachten of opdrachtnemers', 30, true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-000000006117', '00000000-0000-4000-8000-000000005105', 'VISITORS_CUSTOMERS', 'Bezoekers, klanten, cliënten, patiënten of leerlingen', 40, true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-000000006118', '00000000-0000-4000-8000-000000005105', 'WORK_PROCESS', 'Een werkproces of afdeling', 50, true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-000000006119', '00000000-0000-4000-8000-000000005105', 'LOCATION', 'Een locatie of vestiging', 60, true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-000000006120', '00000000-0000-4000-8000-000000005105', 'ENTIRE_ORGANIZATION', 'De hele organisatie', 70, true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-000000006121', '00000000-0000-4000-8000-000000005105', 'NOT_SURE', 'Dat weet ik nog niet', 80, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-000000006122', '00000000-0000-4000-8000-000000005107', 'AS_SOON_AS_POSSIBLE', 'Zo snel mogelijk, bij voorkeur binnen enkele dagen', 10, true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-000000006123', '00000000-0000-4000-8000-000000005107', 'WITHIN_FOUR_WEEKS', 'Binnen vier weken', 20, true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-000000006124', '00000000-0000-4000-8000-000000005107', 'WITHIN_THREE_MONTHS', 'Binnen één tot drie maanden', 30, true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-000000006125', '00000000-0000-4000-8000-000000005107', 'AFTER_THREE_MONTHS', 'Later dan drie maanden', 40, true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-000000006126', '00000000-0000-4000-8000-000000005107', 'NO_FIXED_PREFERENCE', 'Geen vaste voorkeur of nog onbekend', 50, true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-000000006127', '00000000-0000-4000-8000-000000005108', 'ON_SITE', 'Op locatie', 10, true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-000000006128', '00000000-0000-4000-8000-000000005108', 'HYBRID', 'Deels op locatie en deels op afstand', 20, true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-000000006129', '00000000-0000-4000-8000-000000005108', 'REMOTE', 'Volledig op afstand', 30, true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-000000006130', '00000000-0000-4000-8000-000000005108', 'NOT_SURE', 'Dat weet ik nog niet', 40, true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-000000006131', '00000000-0000-4000-8000-000000005111', 'SINGLE_CONSULTATION', 'Een eenmalig advies of gesprek', 10, true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-000000006132', '00000000-0000-4000-8000-000000005111', 'SHORT_ASSIGNMENT', 'Een korte opdracht van enkele dagen', 20, true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-000000006133', '00000000-0000-4000-8000-000000005111', 'TEMPORARY_PROJECT', 'Een tijdelijk traject tot ongeveer drie maanden', 30, true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-000000006134', '00000000-0000-4000-8000-000000005111', 'LONGER_TERM_SUPPORT', 'Ondersteuning voor een langere periode', 40, true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-000000006135', '00000000-0000-4000-8000-000000005111', 'NOT_SURE', 'Dat weet ik nog niet', 50, true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

UPDATE "IntakeQuestionnaireVersion"
SET "status" = 'PUBLISHED', "publishedAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = '00000000-0000-4000-8000-000000005001';

-- Legacy-preflight: alleen volledig herleidbare intakes kunnen veilig worden
-- gekoppeld. Vrije tekst blijft de onveranderlijke oorspronkelijke bronopname.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "Intake"
    WHERE "clientOrganizationId" IS NULL OR "createdByUserId" IS NULL
  ) THEN
    RAISE EXCEPTION 'Module 5A-migratie gestopt: bestaande intakes missen een organisatie of maker.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "Intake"
    WHERE CHAR_LENGTH(BTRIM("freeText")) < 20 OR CHAR_LENGTH("freeText") > 2000
  ) THEN
    RAISE EXCEPTION 'Module 5A-migratie gestopt: bestaande intake-freeText valt buiten 20 tot 2000 tekens.';
  END IF;
END $$;

UPDATE "Intake"
SET "questionnaireVersionId" = '00000000-0000-4000-8000-000000005001'
WHERE "questionnaireVersionId" IS NULL;

INSERT INTO "IntakeAnswer" (
  "intakeId", "questionId", "version", "textValue", "updatedByUserId", "createdAt", "updatedAt"
)
SELECT
  intake."id",
  '00000000-0000-4000-8000-000000005101',
  1,
  intake."freeText",
  intake."createdByUserId",
  intake."createdAt",
  intake."updatedAt"
FROM "Intake" AS intake
ON CONFLICT ("intakeId", "questionId") DO NOTHING;

INSERT INTO "IntakeAnswerRevision" (
  "intakeAnswerId", "version", "textValue", "changedByUserId", "createdAt"
)
SELECT
  answer."id",
  answer."version",
  answer."textValue",
  answer."updatedByUserId",
  answer."updatedAt"
FROM "IntakeAnswer" AS answer
WHERE answer."questionId" = '00000000-0000-4000-8000-000000005101'
ON CONFLICT ("intakeAnswerId", "version") DO NOTHING;

INSERT INTO "IntakeStatusHistory" (
  "intakeId", "fromStatus", "toStatus", "changedByUserId", "createdAt"
)
SELECT "id", NULL, "status", "createdByUserId", "createdAt"
FROM "Intake";

ALTER TABLE "Intake"
  ALTER COLUMN "clientOrganizationId" SET NOT NULL,
  ALTER COLUMN "createdByUserId" SET NOT NULL,
  ALTER COLUMN "questionnaireVersionId" SET NOT NULL;

-- Harde PostgreSQL-constraints die Prisma niet declaratief kan uitdrukken.
ALTER TABLE "IntakeQuestionnaire"
  ADD CONSTRAINT "IntakeQuestionnaire_slug_name_check" CHECK (
    NULLIF(BTRIM("slug"), '') IS NOT NULL AND NULLIF(BTRIM("name"), '') IS NOT NULL
  );

ALTER TABLE "IntakeQuestionnaireVersion"
  ADD CONSTRAINT "IntakeQuestionnaireVersion_version_check" CHECK ("version" > 0),
  ADD CONSTRAINT "IntakeQuestionnaireVersion_publication_check" CHECK (
    ("status" = 'DRAFT' AND "publishedAt" IS NULL)
    OR ("status" IN ('PUBLISHED', 'RETIRED') AND "publishedAt" IS NOT NULL)
  );

CREATE UNIQUE INDEX "IntakeQuestionnaireVersion_one_published_key"
  ON "IntakeQuestionnaireVersion"("questionnaireId")
  WHERE "status" = 'PUBLISHED';

ALTER TABLE "IntakeQuestion"
  ADD CONSTRAINT "IntakeQuestion_identity_check" CHECK (
    NULLIF(BTRIM("key"), '') IS NOT NULL AND NULLIF(BTRIM("label"), '') IS NOT NULL
  ),
  ADD CONSTRAINT "IntakeQuestion_sortOrder_check" CHECK ("sortOrder" >= 0),
  ADD CONSTRAINT "IntakeQuestion_length_bounds_check" CHECK (
    ("minLength" IS NULL OR "minLength" >= 0)
    AND ("maxLength" IS NULL OR "maxLength" >= 0)
    AND ("minLength" IS NULL OR "maxLength" IS NULL OR "minLength" <= "maxLength")
  ),
  ADD CONSTRAINT "IntakeQuestion_number_bounds_check" CHECK (
    "minNumber" IS NULL OR "maxNumber" IS NULL OR "minNumber" <= "maxNumber"
  ),
  ADD CONSTRAINT "IntakeQuestion_selection_bounds_check" CHECK (
    ("minSelections" IS NULL OR "minSelections" >= 0)
    AND ("maxSelections" IS NULL OR "maxSelections" >= 1)
    AND ("minSelections" IS NULL OR "maxSelections" IS NULL OR "minSelections" <= "maxSelections")
  ),
  ADD CONSTRAINT "IntakeQuestion_bounds_by_type_check" CHECK (
    ("inputType" IN ('SHORT_TEXT', 'LONG_TEXT') OR ("minLength" IS NULL AND "maxLength" IS NULL))
    AND ("inputType" = 'NUMBER' OR ("minNumber" IS NULL AND "maxNumber" IS NULL))
    AND ("inputType" IN ('SINGLE_SELECT', 'MULTI_SELECT') OR ("minSelections" IS NULL AND "maxSelections" IS NULL))
  );

ALTER TABLE "IntakeQuestionOption"
  ADD CONSTRAINT "IntakeQuestionOption_value_label_check" CHECK (
    NULLIF(BTRIM("value"), '') IS NOT NULL AND NULLIF(BTRIM("label"), '') IS NOT NULL
  ),
  ADD CONSTRAINT "IntakeQuestionOption_sortOrder_check" CHECK ("sortOrder" >= 0);

ALTER TABLE "Intake"
  ADD CONSTRAINT "Intake_version_check" CHECK ("version" > 0),
  ADD CONSTRAINT "Intake_freeText_check" CHECK (
    CHAR_LENGTH(BTRIM("freeText")) BETWEEN 20 AND 2000
  );

ALTER TABLE "IntakeAnswer"
  ADD CONSTRAINT "IntakeAnswer_version_check" CHECK ("version" > 0),
  ADD CONSTRAINT "IntakeAnswer_scalar_value_check" CHECK (
    num_nonnulls("textValue", "numberValue", "booleanValue", "dateValue", "organizationLocationId") <= 1
  );

ALTER TABLE "IntakeAnswerRevision"
  ADD CONSTRAINT "IntakeAnswerRevision_version_check" CHECK ("version" > 0),
  ADD CONSTRAINT "IntakeAnswerRevision_scalar_value_check" CHECK (
    num_nonnulls("textValue", "numberValue", "booleanValue", "dateValue", "organizationLocationId") <= 1
  );

ALTER TABLE "IntakeStatusHistory"
  ADD CONSTRAINT "IntakeStatusHistory_transition_check" CHECK (
    "fromStatus" IS NULL OR "fromStatus" <> "toStatus"
  ),
  ADD CONSTRAINT "IntakeStatusHistory_reason_check" CHECK (
    "reason" IS NULL OR NULLIF(BTRIM("reason"), '') IS NOT NULL
  );

-- Gepubliceerde en gepensioneerde vraagsetversies zijn inhoudelijk immutable.
CREATE FUNCTION "protect_intake_questionnaire_version"() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD."status" <> 'DRAFT' THEN
      RAISE EXCEPTION 'Gepubliceerde of gepensioneerde vraagsetversies mogen niet worden verwijderd.';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD."status" = 'RETIRED' THEN
    RAISE EXCEPTION 'Een gepensioneerde vraagsetversie is immutable.';
  END IF;

  IF OLD."status" = 'PUBLISHED' THEN
    IF NEW."status" = 'RETIRED'
      AND NEW."id" = OLD."id"
      AND NEW."questionnaireId" = OLD."questionnaireId"
      AND NEW."version" = OLD."version"
      AND NEW."publishedAt" IS NOT DISTINCT FROM OLD."publishedAt"
      AND NEW."createdAt" = OLD."createdAt"
    THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Een gepubliceerde vraagsetversie is immutable; alleen pensioneren is toegestaan.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "IntakeQuestionnaireVersion_immutable_trigger"
BEFORE UPDATE OR DELETE ON "IntakeQuestionnaireVersion"
FOR EACH ROW EXECUTE FUNCTION "protect_intake_questionnaire_version"();

CREATE FUNCTION "protect_intake_question"() RETURNS trigger AS $$
DECLARE
  old_status "IntakeQuestionnaireVersionStatus";
  new_status "IntakeQuestionnaireVersionStatus";
BEGIN
  IF TG_OP <> 'INSERT' THEN
    SELECT "status" INTO old_status
    FROM "IntakeQuestionnaireVersion"
    WHERE "id" = OLD."questionnaireVersionId";

    IF old_status <> 'DRAFT' THEN
      RAISE EXCEPTION 'Vragen van een gepubliceerde of gepensioneerde vraagsetversie zijn immutable.';
    END IF;
  END IF;

  IF TG_OP <> 'DELETE' THEN
    SELECT "status" INTO new_status
    FROM "IntakeQuestionnaireVersion"
    WHERE "id" = NEW."questionnaireVersionId";

    IF new_status <> 'DRAFT' THEN
      RAISE EXCEPTION 'Vragen kunnen alleen binnen een conceptvraagsetversie worden gewijzigd.';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "IntakeQuestion_immutable_trigger"
BEFORE INSERT OR UPDATE OR DELETE ON "IntakeQuestion"
FOR EACH ROW EXECUTE FUNCTION "protect_intake_question"();

CREATE FUNCTION "protect_intake_question_option"() RETURNS trigger AS $$
DECLARE
  version_status "IntakeQuestionnaireVersionStatus";
  question_type "IntakeQuestionInputType";
  target_question_id UUID;
BEGIN
  target_question_id := CASE WHEN TG_OP = 'DELETE' THEN OLD."questionId" ELSE NEW."questionId" END;

  SELECT version."status", question."inputType"
  INTO version_status, question_type
  FROM "IntakeQuestion" AS question
  JOIN "IntakeQuestionnaireVersion" AS version ON version."id" = question."questionnaireVersionId"
  WHERE question."id" = target_question_id;

  IF version_status <> 'DRAFT' THEN
    RAISE EXCEPTION 'Opties van een gepubliceerde of gepensioneerde vraagsetversie zijn immutable.';
  END IF;

  IF TG_OP <> 'DELETE' AND question_type NOT IN ('SINGLE_SELECT', 'MULTI_SELECT') THEN
    RAISE EXCEPTION 'Vraagopties zijn alleen toegestaan voor keuze- en meerkeuzevragen.';
  END IF;

  IF TG_OP = 'UPDATE' AND NEW."questionId" <> OLD."questionId" THEN
    RAISE EXCEPTION 'Een vraagoptie mag niet naar een andere vraag worden verplaatst.';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "IntakeQuestionOption_immutable_trigger"
BEFORE INSERT OR UPDATE OR DELETE ON "IntakeQuestionOption"
FOR EACH ROW EXECUTE FUNCTION "protect_intake_question_option"();

-- De oorspronkelijke vrije hulpvraag blijft een bronopname en wordt nooit
-- gesynchroniseerd met latere, actuele antwoorden.
CREATE FUNCTION "protect_intake_free_text"() RETURNS trigger AS $$
BEGIN
  IF NEW."freeText" IS DISTINCT FROM OLD."freeText" THEN
    RAISE EXCEPTION 'Intake.freeText is een immutable bronopname.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Intake_freeText_immutable_trigger"
BEFORE UPDATE OF "freeText" ON "Intake"
FOR EACH ROW EXECUTE FUNCTION "protect_intake_free_text"();

-- Revisies en statushistorie zijn append-only. Alleen INSERT is toegestaan.
CREATE FUNCTION "prevent_append_only_change"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% is append-only en mag niet worden gewijzigd of verwijderd.', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "IntakeAnswerRevision_append_only_trigger"
BEFORE UPDATE OR DELETE ON "IntakeAnswerRevision"
FOR EACH ROW EXECUTE FUNCTION "prevent_append_only_change"();

CREATE TRIGGER "IntakeAnswerRevisionOption_append_only_trigger"
BEFORE UPDATE OR DELETE ON "IntakeAnswerRevisionOption"
FOR EACH ROW EXECUTE FUNCTION "prevent_append_only_change"();

CREATE TRIGGER "IntakeStatusHistory_append_only_trigger"
BEFORE UPDATE OR DELETE ON "IntakeStatusHistory"
FOR EACH ROW EXECUTE FUNCTION "prevent_append_only_change"();

-- Een revisie moet exact de actuele antwoordversie vastleggen en zonder gaten
-- aansluiten op de eerdere revisies.
CREATE FUNCTION "validate_intake_answer_revision_sequence"() RETURNS trigger AS $$
DECLARE
  current_answer_version INTEGER;
  expected_revision_version INTEGER;
BEGIN
  SELECT "version" INTO current_answer_version
  FROM "IntakeAnswer"
  WHERE "id" = NEW."intakeAnswerId";

  SELECT COALESCE(MAX("version"), 0) + 1 INTO expected_revision_version
  FROM "IntakeAnswerRevision"
  WHERE "intakeAnswerId" = NEW."intakeAnswerId";

  IF NEW."version" <> current_answer_version OR NEW."version" <> expected_revision_version THEN
    RAISE EXCEPTION 'Antwoordrevisie sluit niet aan op de actuele antwoordversie.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "IntakeAnswerRevision_sequence_trigger"
BEFORE INSERT ON "IntakeAnswerRevision"
FOR EACH ROW EXECUTE FUNCTION "validate_intake_answer_revision_sequence"();
