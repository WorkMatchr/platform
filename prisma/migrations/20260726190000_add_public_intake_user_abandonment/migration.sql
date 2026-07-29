-- Module 7, Werkset 7.3a: expliciete, terminale beëindiging door de gebruiker.
-- De bestaande waarde ABANDONED blijft ongewijzigd voor legacyrecords en wordt niet meer
-- door nieuwe applicatielogica geschreven.

ALTER TYPE "PublicIntakePhase" ADD VALUE IF NOT EXISTS 'ABANDONED_BY_USER';
ALTER TYPE "PublicIntakePhase" ADD VALUE IF NOT EXISTS 'ABANDONED_TIMEOUT';
ALTER TYPE "PublicIntakePhase" ADD VALUE IF NOT EXISTS 'EXPIRED';

ALTER TYPE "PublicIntakeEventType" ADD VALUE IF NOT EXISTS 'DRAFT_ABANDONED_BY_USER';

ALTER TABLE "PublicIntakeEvent"
  DROP CONSTRAINT "PublicIntakeEvent_phase_check";

ALTER TABLE "PublicIntakeEvent"
  ADD CONSTRAINT "PublicIntakeEvent_phase_check" CHECK (
    (
      "type" IN ('PHASE_CHANGED', 'DRAFT_ABANDONED_BY_USER')
      AND "fromPhase" IS NOT NULL
      AND "toPhase" IS NOT NULL
    )
    OR
    (
      "type" NOT IN ('PHASE_CHANGED', 'DRAFT_ABANDONED_BY_USER')
      AND "fromPhase" IS NULL
      AND "toPhase" IS NULL
    )
  );

CREATE OR REPLACE FUNCTION workmatchr_validate_public_intake_draft_update() RETURNS trigger AS $$
BEGIN
  IF OLD."entryPoint" <> NEW."entryPoint"
    OR OLD."originalInput" IS DISTINCT FROM NEW."originalInput"
    OR OLD."selectedRequestKey" IS DISTINCT FROM NEW."selectedRequestKey"
    OR OLD."flowVersion" <> NEW."flowVersion"
    OR OLD."startedAt" <> NEW."startedAt"
    OR OLD."expiresAt" <> NEW."expiresAt" THEN
    RAISE EXCEPTION 'De bron- en sessievelden van een publieke intake zijn immutable.';
  END IF;

  IF OLD."phase" <> NEW."phase" AND NOT (
    (OLD."phase" = 'STARTED' AND NEW."phase" IN ('CLARIFYING', 'ABANDONED', 'ABANDONED_BY_USER'))
    OR (OLD."phase" = 'CLARIFYING' AND NEW."phase" IN ('SUMMARY_PRESENTED', 'ABANDONED', 'ABANDONED_BY_USER'))
    OR (OLD."phase" = 'SUMMARY_PRESENTED' AND NEW."phase" IN ('CLARIFYING', 'REGISTRATION_STARTED', 'ABANDONED', 'ABANDONED_BY_USER'))
    OR (OLD."phase" = 'REGISTRATION_STARTED' AND NEW."phase" IN ('SUMMARY_PRESENTED', 'ACCOUNT_LINKED', 'ABANDONED', 'ABANDONED_BY_USER'))
    OR (OLD."phase" = 'ACCOUNT_LINKED' AND NEW."phase" = 'SUBMITTED')
    OR (OLD."phase" = 'ABANDONED' AND NEW."phase" IN ('CLARIFYING', 'SUMMARY_PRESENTED'))
  ) THEN
    RAISE EXCEPTION 'Ongeldige publieke intakefase-overgang.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
