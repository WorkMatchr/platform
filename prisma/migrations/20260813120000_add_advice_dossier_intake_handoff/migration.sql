CREATE TABLE "AdviceDossierIntakeHandoff" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "adviceDossierId" UUID NOT NULL,
    "adviceDossierVersionId" UUID NOT NULL,
    "intakeId" UUID NOT NULL,
    "createdByUserId" UUID NOT NULL,
    "dossierCodeSnapshot" VARCHAR(32) NOT NULL,
    "originalHelpRequestSnapshot" TEXT NOT NULL,
    "situationSummarySnapshot" TEXT NOT NULL,
    "subjectSnapshot" VARCHAR(200) NOT NULL,
    "primaryProfessionalRequirementSnapshot" JSONB,
    "additionalProfessionalRequirementsSnapshot" JSONB NOT NULL,
    "contextAnswersSnapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdviceDossierIntakeHandoff_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdviceDossierIntakeHandoff_adviceDossierId_key" ON "AdviceDossierIntakeHandoff"("adviceDossierId");
CREATE UNIQUE INDEX "AdviceDossierIntakeHandoff_adviceDossierVersionId_key" ON "AdviceDossierIntakeHandoff"("adviceDossierVersionId");
CREATE UNIQUE INDEX "AdviceDossierIntakeHandoff_intakeId_key" ON "AdviceDossierIntakeHandoff"("intakeId");
CREATE INDEX "AdviceDossierIntakeHandoff_createdByUserId_createdAt_idx" ON "AdviceDossierIntakeHandoff"("createdByUserId", "createdAt");
CREATE INDEX "AdviceDossierIntakeHandoff_intakeId_idx" ON "AdviceDossierIntakeHandoff"("intakeId");

ALTER TABLE "AdviceDossierIntakeHandoff"
  ADD CONSTRAINT "AdviceDossierIntakeHandoff_adviceDossierId_fkey"
  FOREIGN KEY ("adviceDossierId") REFERENCES "AdviceDossier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdviceDossierIntakeHandoff"
  ADD CONSTRAINT "AdviceDossierIntakeHandoff_adviceDossierVersionId_fkey"
  FOREIGN KEY ("adviceDossierVersionId") REFERENCES "AdviceDossierVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdviceDossierIntakeHandoff"
  ADD CONSTRAINT "AdviceDossierIntakeHandoff_intakeId_fkey"
  FOREIGN KEY ("intakeId") REFERENCES "Intake"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdviceDossierIntakeHandoff"
  ADD CONSTRAINT "AdviceDossierIntakeHandoff_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION prevent_advice_dossier_intake_handoff_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Advice dossier intake handoffs are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "AdviceDossierIntakeHandoff_prevent_update"
BEFORE UPDATE ON "AdviceDossierIntakeHandoff"
FOR EACH ROW EXECUTE FUNCTION prevent_advice_dossier_intake_handoff_mutation();

CREATE TRIGGER "AdviceDossierIntakeHandoff_prevent_delete"
BEFORE DELETE ON "AdviceDossierIntakeHandoff"
FOR EACH ROW EXECUTE FUNCTION prevent_advice_dossier_intake_handoff_mutation();
