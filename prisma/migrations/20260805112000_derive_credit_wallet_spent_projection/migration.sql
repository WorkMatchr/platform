-- Vul ook de historische besteedprojectie uitsluitend vanuit het grootboek.
CREATE OR REPLACE FUNCTION "workmatchr_refresh_credit_projection"()
RETURNS trigger AS $$
DECLARE
  ledger_total INTEGER;
  ledger_reserved INTEGER;
  ledger_spent INTEGER;
BEGIN
  SELECT
    COALESCE(SUM("totalDelta"), 0)::INTEGER,
    COALESCE(SUM("reservedDelta"), 0)::INTEGER,
    GREATEST(
      0,
      COALESCE(SUM(
        CASE
          WHEN type IN ('CONSUMPTION', 'PARTICIPATION_PAYMENT') THEN -"totalDelta"
          WHEN type IN ('REFUND', 'WITHDRAWAL_REFUND') THEN -"totalDelta"
          ELSE 0
        END
      ), 0)
    )::INTEGER
  INTO ledger_total, ledger_reserved, ledger_spent
  FROM "CreditTransaction"
  WHERE "creditAccountId" = NEW."creditAccountId";

  UPDATE "CreditAccount"
  SET
    balance = ledger_total - ledger_reserved,
    "availableBalance" = ledger_total - ledger_reserved,
    "reservedBalance" = ledger_reserved,
    "spentBalance" = ledger_spent,
    version = version + 1,
    "updatedAt" = CURRENT_TIMESTAMP
  WHERE id = NEW."creditAccountId";
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Deze naam is nooit aan een trigger gekoppeld en wordt opgeruimd.
DROP FUNCTION IF EXISTS "refresh_credit_account_from_ledger"();
