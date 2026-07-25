-- ADR-013 Contract: een User kan maximaal één actuele OrganizationMembership hebben.
-- Deze migratie muteert geen bestaande memberships en stopt fail-closed bij conflicten.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "OrganizationMembership"
    GROUP BY "userId"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'ADR-013 contract geblokkeerd: los alle multi-membershipconflicten handmatig op voordat deze migratie wordt toegepast.';
  END IF;
END
$$;

DROP INDEX IF EXISTS "OrganizationMembership_userId_idx";

CREATE UNIQUE INDEX "OrganizationMembership_userId_key"
  ON "OrganizationMembership"("userId");
