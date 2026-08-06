CREATE TYPE "AccountType" AS ENUM ('CLIENT', 'PROFESSIONAL');

ALTER TABLE "User" ADD COLUMN "accountType" "AccountType";

UPDATE "User" AS account
SET "accountType" = CASE
  WHEN organization."organizationType" IN ('PROVIDER', 'BOTH') THEN 'PROFESSIONAL'::"AccountType"
  WHEN organization."organizationType" = 'CLIENT' THEN 'CLIENT'::"AccountType"
  ELSE NULL
END
FROM "OrganizationMembership" AS membership
JOIN "Organization" AS organization ON organization.id = membership."organizationId"
WHERE membership."userId" = account.id
  AND organization."organizationType" <> 'PLATFORM_OPERATOR';

INSERT INTO "AccountProvisioningEvent" (
  id,
  "eventType",
  "subjectUserId",
  "actorUserId",
  "organizationId",
  "membershipId",
  "occurredAt",
  "reasonCode",
  metadata,
  "correlationId",
  "idempotencyKey",
  "schemaVersion",
  "createdAt"
)
SELECT
  gen_random_uuid(),
  'MIGRATED_UNKNOWN'::"AccountProvisioningEventType",
  account.id,
  NULL,
  membership."organizationId",
  membership.id,
  now(),
  'ACCOUNT_TYPE_BACKFILLED_FROM_ORGANIZATION',
  jsonb_build_object(
    'migrationVersion', 'ACCOUNT_TYPE_V1',
    'organizationType', organization."organizationType",
    'accountType', account."accountType"
  ),
  'account-type-v1:migration',
  'account-type-v1:' || account.id::text,
  1,
  now()
FROM "User" AS account
JOIN "OrganizationMembership" AS membership ON membership."userId" = account.id
JOIN "Organization" AS organization ON organization.id = membership."organizationId"
WHERE account."accountType" IS NOT NULL
  AND organization."organizationType" <> 'PLATFORM_OPERATOR'
ON CONFLICT ("idempotencyKey") DO NOTHING;

CREATE OR REPLACE FUNCTION "syncTenantAccountTypeFromMembership"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  organization_type "OrganizationType";
  current_account_type "AccountType";
  expected_account_type "AccountType";
BEGIN
  SELECT "organizationType"
  INTO organization_type
  FROM "Organization"
  WHERE id = NEW."organizationId";

  IF organization_type = 'PLATFORM_OPERATOR' THEN
    RETURN NEW;
  END IF;

  expected_account_type := CASE
    WHEN organization_type = 'CLIENT' THEN 'CLIENT'::"AccountType"
    WHEN organization_type IN ('PROVIDER', 'BOTH') THEN 'PROFESSIONAL'::"AccountType"
    ELSE NULL
  END;

  SELECT "accountType"
  INTO current_account_type
  FROM "User"
  WHERE id = NEW."userId"
  FOR UPDATE;

  IF current_account_type IS NULL THEN
    UPDATE "User"
    SET "accountType" = expected_account_type,
        "updatedAt" = now()
    WHERE id = NEW."userId";
  ELSIF current_account_type <> expected_account_type THEN
    RAISE EXCEPTION 'Account type is incompatible with organization type'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "OrganizationMembership_sync_tenant_account_type"
AFTER INSERT OR UPDATE OF "userId", "organizationId"
ON "OrganizationMembership"
FOR EACH ROW
EXECUTE FUNCTION "syncTenantAccountTypeFromMembership"();

CREATE INDEX "User_accountType_idx" ON "User"("accountType");
