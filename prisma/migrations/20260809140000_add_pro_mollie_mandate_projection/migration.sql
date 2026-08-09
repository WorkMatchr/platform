-- Additieve, privacyveilige Mollie-mandaatprojectie voor WorkMatchr Pro.
-- Bestaande abonnementen blijven compatibel; er wordt geen providerdata afgeleid of gebackfilld.
ALTER TABLE "ProfessionalSubscription"
  ADD COLUMN "mollieMandateStatus" VARCHAR(20),
  ADD COLUMN "mollieMandateMethod" VARCHAR(30),
  ADD COLUMN "mollieMandateVerifiedAt" TIMESTAMPTZ(3);

ALTER TABLE "ProfessionalSubscription"
  ADD CONSTRAINT "ProfessionalSubscription_mandate_projection_check" CHECK (
    (
      "mollieMandateId" IS NULL
      AND "mollieMandateStatus" IS NULL
      AND "mollieMandateMethod" IS NULL
      AND "mollieMandateVerifiedAt" IS NULL
    )
    OR
    (
      "mollieMandateId" LIKE 'mdt\_%' ESCAPE '\'
      AND "mollieMandateStatus" = 'valid'
      AND "mollieMandateMethod" IN ('directdebit', 'creditcard')
      AND "mollieMandateVerifiedAt" IS NOT NULL
    )
  );

CREATE INDEX "ProfessionalSubscription_mollieMandateStatus_mollieMandateMethod_idx"
  ON "ProfessionalSubscription"("mollieMandateStatus", "mollieMandateMethod");
