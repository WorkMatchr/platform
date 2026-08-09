-- WorkMatchr Pro: plan cancellation without mutating the current paid-period status.
ALTER TABLE "ProfessionalSubscription"
  ADD COLUMN "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "cancellationRequestedAt" TIMESTAMPTZ(3),
  ADD COLUMN "cancellationEffectiveAt" TIMESTAMPTZ(3);

ALTER TABLE "ProfessionalSubscription"
  ADD CONSTRAINT "ProfessionalSubscription_cancellation_schedule_check" CHECK (
    (
      "cancelAtPeriodEnd" = false
      AND "cancellationRequestedAt" IS NULL
      AND "cancellationEffectiveAt" IS NULL
    )
    OR
    (
      "cancelAtPeriodEnd" = true
      AND "cancellationRequestedAt" IS NOT NULL
      AND "cancellationEffectiveAt" IS NOT NULL
      AND "cancellationEffectiveAt" >= "cancellationRequestedAt"
      AND "status" IN ('ACTIVE', 'PAST_DUE')
    )
  );

CREATE INDEX "ProfessionalSubscription_cancelAtPeriodEnd_cancellationEffectiveAt_idx"
  ON "ProfessionalSubscription"("cancelAtPeriodEnd", "cancellationEffectiveAt");
