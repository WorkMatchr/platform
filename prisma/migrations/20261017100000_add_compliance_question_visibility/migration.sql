-- Additive; existing published definitions retain null and their original checksum.
ALTER TABLE "ComplianceQuestionDefinition" ADD COLUMN "visibilityCondition" JSONB;
