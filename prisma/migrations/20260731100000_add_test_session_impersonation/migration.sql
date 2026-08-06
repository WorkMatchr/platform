-- Development/test-only account switching remains part of the existing
-- Better Auth session. Existing sessions stay regular actor sessions.

ALTER TABLE "Session"
  ADD COLUMN "impersonatedUserId" UUID,
  ADD COLUMN "impersonationStartedAt" TIMESTAMPTZ(3);

ALTER TABLE "Session"
  ADD CONSTRAINT "Session_impersonation_complete_check"
  CHECK (
    ("impersonatedUserId" IS NULL AND "impersonationStartedAt" IS NULL)
    OR
    (
      "impersonatedUserId" IS NOT NULL
      AND "impersonationStartedAt" IS NOT NULL
      AND "impersonatedUserId" <> "userId"
    )
  );

ALTER TABLE "Session"
  ADD CONSTRAINT "Session_impersonatedUserId_fkey"
  FOREIGN KEY ("impersonatedUserId")
  REFERENCES "User"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

CREATE INDEX "Session_impersonatedUserId_idx"
  ON "Session"("impersonatedUserId");
