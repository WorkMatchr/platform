-- Better Auth 1.6.23 two-factor foundation. Existing accounts remain opt-in.
ALTER TYPE "AccountProvisioningEventType" ADD VALUE IF NOT EXISTS 'TWO_FACTOR_ENROLLED';
ALTER TYPE "AccountProvisioningEventType" ADD VALUE IF NOT EXISTS 'TWO_FACTOR_RESET';

ALTER TABLE "User" ADD COLUMN "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "TwoFactor" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "secret" TEXT NOT NULL,
    "backupCodes" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT true,
    "failedVerificationCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMPTZ(3),

    CONSTRAINT "TwoFactor_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TwoFactor_secret_idx" ON "TwoFactor"("secret");
CREATE INDEX "TwoFactor_userId_idx" ON "TwoFactor"("userId");

ALTER TABLE "TwoFactor"
  ADD CONSTRAINT "TwoFactor_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
