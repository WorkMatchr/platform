-- Professionele creditwallet: het append-only grootboek wordt de autoritatieve
-- bron voor totaal, reservering en beschikbaar saldo. Bestaande projectievelden
-- blijven uitsluitend voor achterwaartse compatibiliteit bestaan.

ALTER TABLE "CreditTransaction"
  ADD COLUMN "totalDelta" INTEGER,
  ADD COLUMN "reservedDelta" INTEGER,
  ADD COLUMN "auditMetadata" JSONB;

-- Vertaal bestaande immutable mutaties naar de nieuwe expliciete dimensies.
ALTER TABLE "CreditTransaction" DISABLE TRIGGER "CreditTransaction_append_only_v2";
ALTER TABLE "CreditTransaction" DISABLE TRIGGER "CreditTransaction_append_only";

UPDATE "CreditTransaction"
SET
  "totalDelta" = CASE
    WHEN "type" IN ('RESERVATION', 'RESERVATION_RELEASE') THEN 0
    WHEN "type" = 'CONSUMPTION' THEN -ABS("amount")
    ELSE "amount"
  END,
  "reservedDelta" = CASE
    WHEN "type" = 'RESERVATION' THEN ABS("amount")
    WHEN "type" IN ('RESERVATION_RELEASE', 'CONSUMPTION') THEN -ABS("amount")
    ELSE 0
  END,
  "auditMetadata" = COALESCE(
    "auditMetadata",
    jsonb_build_object('schemaVersion', 1, 'migration', '20260805110000')
  );

ALTER TABLE "CreditTransaction" ENABLE TRIGGER "CreditTransaction_append_only_v2";
ALTER TABLE "CreditTransaction" ENABLE TRIGGER "CreditTransaction_append_only";

-- Een legacyaccount kon vóór deze migratie een beginsaldo hebben zonder
-- grootboekregel. Leg het verschil éénmalig append-only vast; verander of
-- verwijder bestaande mutaties niet.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "CreditAccount" ca
    LEFT JOIN "CreditTransaction" ct ON ct."creditAccountId" = ca."id"
    GROUP BY ca."id", ca."reservedBalance"
    HAVING ca."reservedBalance" <> COALESCE(SUM(ct."reservedDelta"), 0)::INTEGER
  ) THEN
    RAISE EXCEPTION 'Creditwalletmigratie gestopt: bestaand gereserveerd saldo wijkt af van het immutable grootboek.';
  END IF;
END;
$$;

WITH derived AS (
  SELECT
    ca."id" AS "creditAccountId",
    ca."availableBalance" + ca."reservedBalance" AS "expectedTotal",
    COALESCE(SUM(ct."totalDelta"), 0)::INTEGER AS "derivedTotal"
  FROM "CreditAccount" ca
  LEFT JOIN "CreditTransaction" ct ON ct."creditAccountId" = ca."id"
  GROUP BY ca."id", ca."availableBalance", ca."reservedBalance"
)
INSERT INTO "CreditTransaction" (
  "id", "creditAccountId", "type", "amount", "totalDelta", "reservedDelta",
  "balanceBefore", "balanceAfter", "availableBefore", "availableAfter",
  "reservedBefore", "reservedAfter", "spentBefore", "spentAfter",
  "reason", "description", "referenceType", "idempotencyKey", "auditMetadata", "createdAt"
)
SELECT
  gen_random_uuid(),
  d."creditAccountId",
  'ADMIN_ADJUSTMENT'::"CreditTransactionType",
  d."expectedTotal" - d."derivedTotal",
  d."expectedTotal" - d."derivedTotal",
  0,
  d."derivedTotal",
  d."expectedTotal",
  d."derivedTotal",
  d."expectedTotal",
  0,
  0,
  0,
  0,
  'Veilige migratie van bestaand creditsaldo.',
  'Eenmalige openingsmutatie voor een legacyprojectie zonder volledige ledgerhistorie.',
  'MIGRATION_OPENING_BALANCE',
  'MIGRATION:CREDIT-WALLET:' || d."creditAccountId"::text,
  jsonb_build_object('schemaVersion', 1, 'migration', '20260805110000', 'legacyOpeningBalance', true),
  CURRENT_TIMESTAMP
FROM derived d
WHERE d."expectedTotal" <> d."derivedTotal";

ALTER TABLE "CreditTransaction"
  ALTER COLUMN "totalDelta" SET NOT NULL,
  ALTER COLUMN "reservedDelta" SET NOT NULL;

ALTER TABLE "CreditTransaction"
  ADD CONSTRAINT "CreditTransaction_ledger_delta_check" CHECK (
    ("type" IN ('PURCHASE', 'REFUND', 'CONTRIBUTION_BONUS') AND "totalDelta" > 0 AND "reservedDelta" = 0)
    OR ("type" = 'RESERVATION' AND "totalDelta" = 0 AND "reservedDelta" > 0)
    OR ("type" = 'RESERVATION_RELEASE' AND "totalDelta" = 0 AND "reservedDelta" < 0)
    OR ("type" = 'CONSUMPTION' AND "totalDelta" < 0 AND "reservedDelta" = "totalDelta")
    OR ("type" IN ('ADMIN_ADJUSTMENT', 'ADMIN_CORRECTION') AND "totalDelta" <> 0 AND "reservedDelta" = 0)
    OR ("type" NOT IN ('PURCHASE', 'REFUND', 'CONTRIBUTION_BONUS', 'RESERVATION', 'RESERVATION_RELEASE', 'CONSUMPTION', 'ADMIN_ADJUSTMENT', 'ADMIN_CORRECTION'))
  );

-- Bestaande walletdata moet al bij een professionele tenant horen. De migratie
-- verwijdert niets en stopt fail-closed wanneer eerst een databesluit nodig is.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "CreditAccount" ca
    JOIN "Organization" o ON o."id" = ca."organizationId"
    WHERE o."organizationType" NOT IN ('PROVIDER', 'BOTH')
       OR o."systemKey" IS NOT NULL
       OR NOT EXISTS (
         SELECT 1
         FROM "OrganizationMembership" om
         JOIN "User" u ON u."id" = om."userId"
         WHERE om."organizationId" = o."id"
           AND om."status" = 'ACTIVE'
           AND u."status" = 'ACTIVE'
           AND u."accountType" = 'PROFESSIONAL'
       )
  ) THEN
    RAISE EXCEPTION 'Creditwalletmigratie gestopt: een bestaande wallet hoort niet aantoonbaar bij een professionele organisatie.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION "workmatchr_validate_professional_credit_wallet"()
RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "Organization" o
    WHERE o."id" = NEW."organizationId"
      AND o."organizationType" IN ('PROVIDER', 'BOTH')
      AND o."systemKey" IS NULL
      AND EXISTS (
        SELECT 1
        FROM "OrganizationMembership" om
        JOIN "User" u ON u."id" = om."userId"
        WHERE om."organizationId" = o."id"
          AND om."status" = 'ACTIVE'
          AND u."status" = 'ACTIVE'
          AND u."accountType" = 'PROFESSIONAL'
      )
  ) THEN
    RAISE EXCEPTION 'Een creditwallet is uitsluitend toegestaan voor een professionele organisatie.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "CreditAccount_professional_only"
BEFORE INSERT OR UPDATE OF "organizationId" ON "CreditAccount"
FOR EACH ROW EXECUTE FUNCTION "workmatchr_validate_professional_credit_wallet"();

CREATE OR REPLACE FUNCTION "workmatchr_validate_credit_ledger_insert"()
RETURNS trigger AS $$
DECLARE
  current_total INTEGER;
  current_reserved INTEGER;
  next_total INTEGER;
  next_reserved INTEGER;
BEGIN
  IF NEW."idempotencyKey" IS NULL OR btrim(NEW."idempotencyKey") = '' THEN
    RAISE EXCEPTION 'Iedere nieuwe creditmutatie vereist een idempotentiesleutel.';
  END IF;
  IF NEW."createdByUserId" IS NULL THEN
    RAISE EXCEPTION 'Iedere nieuwe creditmutatie vereist een actor.';
  END IF;
  IF NEW."reason" IS NULL OR length(btrim(NEW."reason")) < 3 THEN
    RAISE EXCEPTION 'Iedere nieuwe creditmutatie vereist een reden.';
  END IF;

  PERFORM 1 FROM "CreditAccount" WHERE "id" = NEW."creditAccountId" FOR UPDATE;

  SELECT
    COALESCE(SUM("totalDelta"), 0)::INTEGER,
    COALESCE(SUM("reservedDelta"), 0)::INTEGER
  INTO current_total, current_reserved
  FROM "CreditTransaction"
  WHERE "creditAccountId" = NEW."creditAccountId";

  next_total := current_total + NEW."totalDelta";
  next_reserved := current_reserved + NEW."reservedDelta";
  IF next_total < 0 OR next_reserved < 0 OR next_total - next_reserved < 0 THEN
    RAISE EXCEPTION 'Creditmutatie geweigerd: totaal, reservering of beschikbaar saldo wordt negatief.';
  END IF;

  NEW."balanceBefore" := current_total - current_reserved;
  NEW."balanceAfter" := next_total - next_reserved;
  NEW."availableBefore" := current_total - current_reserved;
  NEW."availableAfter" := next_total - next_reserved;
  NEW."reservedBefore" := current_reserved;
  NEW."reservedAfter" := next_reserved;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "CreditTransaction_validate_ledger_insert"
BEFORE INSERT ON "CreditTransaction"
FOR EACH ROW EXECUTE FUNCTION "workmatchr_validate_credit_ledger_insert"();

CREATE OR REPLACE FUNCTION "workmatchr_refresh_credit_projection"()
RETURNS trigger AS $$
DECLARE
  ledger_total INTEGER;
  ledger_reserved INTEGER;
BEGIN
  SELECT
    COALESCE(SUM("totalDelta"), 0)::INTEGER,
    COALESCE(SUM("reservedDelta"), 0)::INTEGER
  INTO ledger_total, ledger_reserved
  FROM "CreditTransaction"
  WHERE "creditAccountId" = NEW."creditAccountId";

  UPDATE "CreditAccount"
  SET
    "balance" = ledger_total - ledger_reserved,
    "availableBalance" = ledger_total - ledger_reserved,
    "reservedBalance" = ledger_reserved,
    "updatedAt" = CURRENT_TIMESTAMP
  WHERE "id" = NEW."creditAccountId";
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "CreditTransaction_refresh_projection"
AFTER INSERT ON "CreditTransaction"
FOR EACH ROW EXECUTE FUNCTION "workmatchr_refresh_credit_projection"();

CREATE INDEX "CreditTransaction_creditAccountId_createdAt_idx"
ON "CreditTransaction"("creditAccountId", "createdAt");
