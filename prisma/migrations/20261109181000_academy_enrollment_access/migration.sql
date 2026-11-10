-- Nullable access dates preserve every historical enrollment and support the existing editor and media authorization.
ALTER TABLE "LearningEnrollment"
  ADD COLUMN "accessExpiresAt" TIMESTAMPTZ(3),
  ADD COLUMN "accessRevokedAt" TIMESTAMPTZ(3);
