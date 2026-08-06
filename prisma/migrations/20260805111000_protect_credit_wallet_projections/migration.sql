-- CreditAccount bevat uitsluitend afgeleide compatibiliteitsprojecties.
-- Alleen de CreditTransaction-trigger mag deze projecties vernieuwen.
CREATE OR REPLACE FUNCTION "refresh_credit_account_from_ledger"()
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

CREATE OR REPLACE FUNCTION "protect_credit_account_ledger_projections"()
RETURNS trigger AS $$
BEGIN
  IF pg_trigger_depth() = 1 AND (
    NEW.balance IS DISTINCT FROM OLD.balance
    OR NEW."availableBalance" IS DISTINCT FROM OLD."availableBalance"
    OR NEW."reservedBalance" IS DISTINCT FROM OLD."reservedBalance"
    OR NEW."spentBalance" IS DISTINCT FROM OLD."spentBalance"
  ) THEN
    RAISE EXCEPTION 'CreditAccount saldi zijn uitsluitend afleidbaar uit CreditTransaction';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "CreditAccount_protect_ledger_projections"
BEFORE UPDATE ON "CreditAccount"
FOR EACH ROW EXECUTE FUNCTION "protect_credit_account_ledger_projections"();
