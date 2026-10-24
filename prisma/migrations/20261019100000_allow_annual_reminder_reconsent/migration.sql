CREATE TABLE "LearningAnnualReminderConsentEvent" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "reminderId" UUID NOT NULL,
  "eventType" VARCHAR(16) NOT NULL,
  "occurredAt" TIMESTAMPTZ(3) NOT NULL,
  "consentVersion" VARCHAR(40) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LearningAnnualReminderConsentEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LearningAnnualReminderConsentEvent_eventType_check" CHECK ("eventType" IN ('CONSENTED', 'REVOKED')),
  CONSTRAINT "LearningAnnualReminderConsentEvent_consentVersion_check" CHECK (length(trim("consentVersion")) > 0),
  CONSTRAINT "LearningAnnualReminderConsentEvent_reminderId_fkey" FOREIGN KEY ("reminderId") REFERENCES "LearningAnnualReminder"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "LearningAnnualReminderConsentEvent_reminderId_occurredAt_idx"
  ON "LearningAnnualReminderConsentEvent"("reminderId", "occurredAt");

-- Preserve the consent state that existed before this migration.
INSERT INTO "LearningAnnualReminderConsentEvent" ("reminderId", "eventType", "occurredAt", "consentVersion")
SELECT "id", 'CONSENTED', "consentedAt", "consentVersion"
FROM "LearningAnnualReminder";

INSERT INTO "LearningAnnualReminderConsentEvent" ("reminderId", "eventType", "occurredAt", "consentVersion")
SELECT "id", 'REVOKED', "revokedAt", "consentVersion"
FROM "LearningAnnualReminder"
WHERE "revokedAt" IS NOT NULL;

CREATE FUNCTION "learning_annual_reminder_consent_event_guard"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Annual reminder consent events are append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "LearningAnnualReminderConsentEvent_guard"
  BEFORE UPDATE OR DELETE ON "LearningAnnualReminderConsentEvent"
  FOR EACH ROW EXECUTE FUNCTION "learning_annual_reminder_consent_event_guard"();

CREATE OR REPLACE FUNCTION "learning_annual_reminder_guard"() RETURNS trigger AS $$
DECLARE
  consent_changed BOOLEAN;
  revocation_changed BOOLEAN;
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Annual reminder consent history cannot be deleted'; END IF;

  IF (to_jsonb(NEW) - ARRAY['consentedAt', 'consentVersion', 'revokedAt', 'sentAt']::text[])
      IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['consentedAt', 'consentVersion', 'revokedAt', 'sentAt']::text[]) THEN
    RAISE EXCEPTION 'Annual reminder identity and schedule are immutable';
  END IF;

  IF OLD."sentAt" IS NOT NULL AND NEW."sentAt" IS DISTINCT FROM OLD."sentAt" THEN
    RAISE EXCEPTION 'Annual reminder delivery history is immutable';
  END IF;

  consent_changed := NEW."consentedAt" IS DISTINCT FROM OLD."consentedAt"
    OR NEW."consentVersion" IS DISTINCT FROM OLD."consentVersion";
  revocation_changed := NEW."revokedAt" IS DISTINCT FROM OLD."revokedAt";

  IF consent_changed THEN
    IF OLD."revokedAt" IS NULL OR OLD."sentAt" IS NOT NULL
      OR NEW."revokedAt" IS NOT NULL OR NEW."consentedAt" < OLD."consentedAt"
      OR length(trim(NEW."consentVersion")) = 0
      OR NOT EXISTS (
        SELECT 1 FROM "LearningAnnualReminderConsentEvent" event
        WHERE event."reminderId" = OLD."id"
          AND event."eventType" = 'CONSENTED'
          AND event."occurredAt" = NEW."consentedAt"
          AND event."consentVersion" = NEW."consentVersion"
      ) THEN
      RAISE EXCEPTION 'Annual reminder re-consent requires an unsent revoked reminder and matching consent history';
    END IF;
  END IF;

  IF revocation_changed THEN
    IF OLD."sentAt" IS NOT NULL OR (NEW."revokedAt" IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM "LearningAnnualReminderConsentEvent" event
      WHERE event."reminderId" = OLD."id"
        AND event."eventType" = 'REVOKED'
        AND event."occurredAt" = NEW."revokedAt"
        AND event."consentVersion" = OLD."consentVersion"
    )) OR (NEW."revokedAt" IS NULL AND (OLD."revokedAt" IS NULL OR NOT consent_changed)) THEN
      RAISE EXCEPTION 'Annual reminder revocation requires matching consent history and an unsent reminder';
    END IF;
  END IF;

  IF consent_changed AND revocation_changed AND OLD."revokedAt" IS NULL THEN
    RAISE EXCEPTION 'Annual reminder cannot revoke and re-consent in one update';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
