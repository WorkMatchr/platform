-- Forward only. No backfill: pre-existing entitlements retain their terms.
ALTER TABLE "LearningEnrollment" ADD COLUMN "accessActivatedAt" timestamptz(3), ADD COLUMN "accessExpiresAt" timestamptz(3);
ALTER TABLE "LearningAcademyOrder" ADD COLUMN "accessPolicyVersion" varchar(80);
ALTER TABLE "LearningEnrollment" ADD CONSTRAINT "LearningEnrollment_access_period" CHECK (("accessActivatedAt" IS NULL AND "accessExpiresAt" IS NULL) OR ("accessActivatedAt" IS NOT NULL AND "accessExpiresAt" IS NOT NULL AND "accessExpiresAt" > "accessActivatedAt"));
ALTER TABLE "LearningAcademyOrder" ADD CONSTRAINT "LearningAcademyOrder_access_policy" CHECK ("accessPolicyVersion" IS NULL OR "accessPolicyVersion" = 'ACADEMY-ACCESS-2026-10-30');
CREATE FUNCTION public.academy_access_period_immutable() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $$
BEGIN
 IF OLD."accessActivatedAt" IS NOT NULL AND (NEW."accessActivatedAt" IS DISTINCT FROM OLD."accessActivatedAt" OR NEW."accessExpiresAt" IS DISTINCT FROM OLD."accessExpiresAt") THEN RAISE EXCEPTION 'ACADEMY_ACCESS_PERIOD_IMMUTABLE'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "LearningEnrollment_access_period_immutable" BEFORE UPDATE ON "LearningEnrollment" FOR EACH ROW EXECUTE FUNCTION public.academy_access_period_immutable();

ALTER TABLE public."User" ADD COLUMN "registrationLegalEvidence" jsonb;
CREATE TABLE public."LegalAgreementEvidence" (
 "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "userId" uuid NOT NULL REFERENCES public."User"(id) ON DELETE RESTRICT,
 "documentId" varchar(80) NOT NULL, "documentVersion" varchar(80) NOT NULL, "contentHash" varchar(64) NOT NULL CHECK ("contentHash" ~ '^[a-f0-9]{64}$'),
 "evidenceKind" varchar(40) NOT NULL CHECK ("evidenceKind" IN ('CONTRACT_ACCEPTANCE','INFORMATION_PRESENTED')),
 "context" varchar(80) NOT NULL, "contextId" varchar(120) NOT NULL, "documentSnapshot" jsonb NOT NULL, "recordedAt" timestamptz(3) NOT NULL DEFAULT now(),
 UNIQUE ("userId","context","contextId","documentId")
);
CREATE TRIGGER "LegalAgreementEvidence_immutable" BEFORE UPDATE OR DELETE ON public."LegalAgreementEvidence" FOR EACH ROW EXECUTE FUNCTION public.financial_immutable_record();
CREATE FUNCTION public.registration_legal_evidence() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $$
DECLARE d jsonb;
BEGIN
 IF TG_OP='UPDATE' THEN
   IF NEW."registrationLegalEvidence" IS DISTINCT FROM OLD."registrationLegalEvidence" THEN RAISE EXCEPTION 'REGISTRATION_EVIDENCE_IMMUTABLE'; END IF;
   RETURN NEW;
 END IF;
 IF NEW."registrationLegalEvidence" IS NOT NULL THEN
  IF NEW."registrationLegalEvidence"->>'context' IS DISTINCT FROM 'REGISTRATION' OR jsonb_typeof(NEW."registrationLegalEvidence"->'documents') IS DISTINCT FROM 'array' OR jsonb_array_length(NEW."registrationLegalEvidence"->'documents') IS DISTINCT FROM 2 THEN RAISE EXCEPTION 'REGISTRATION_EVIDENCE_INVALID'; END IF;
  FOR d IN SELECT value FROM jsonb_array_elements(NEW."registrationLegalEvidence"->'documents') LOOP
   INSERT INTO public."LegalAgreementEvidence" ("userId","documentId","documentVersion","contentHash","evidenceKind",context,"contextId","documentSnapshot")
   VALUES (NEW.id,d->>'id',d->>'version',d->>'sha256',d->>'kind','REGISTRATION',NEW.id::text,d);
  END LOOP;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "User_registration_evidence_insert" AFTER INSERT ON public."User" FOR EACH ROW EXECUTE FUNCTION public.registration_legal_evidence();
CREATE TRIGGER "User_registration_evidence_update" BEFORE UPDATE ON public."User" FOR EACH ROW EXECUTE FUNCTION public.registration_legal_evidence();

CREATE TABLE public."AcademyWithdrawalRequest" (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "requestKey" uuid NOT NULL UNIQUE,
 "orderReference" varchar(120) NOT NULL, email varchar(320) NOT NULL,
 "declarationVersion" varchar(80) NOT NULL CHECK ("declarationVersion" = 'ACADEMY-WITHDRAWAL-2026-10-30'),
 "receivedAt" timestamptz(3) NOT NULL DEFAULT now()
);
CREATE INDEX "AcademyWithdrawalRequest_receivedAt_idx" ON public."AcademyWithdrawalRequest"("receivedAt");
CREATE TRIGGER "AcademyWithdrawalRequest_immutable" BEFORE UPDATE OR DELETE ON public."AcademyWithdrawalRequest" FOR EACH ROW EXECUTE FUNCTION public.financial_immutable_record();
CREATE TABLE public."AcademyReviewEvent" (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "caseId" uuid NOT NULL, "requestKey" uuid NOT NULL UNIQUE,
 "actorUserId" uuid NOT NULL REFERENCES public."User"(id) ON DELETE RESTRICT,
 "subjectUserId" uuid NOT NULL REFERENCES public."User"(id) ON DELETE RESTRICT,
 kind varchar(40) NOT NULL CHECK (kind IN ('CERTIFICATE_NAME','CERTIFICATE_ERROR','FRAUD','EXAM_QUESTION','EXAM_SCORE','PRIVACY')),
 action varchar(40) NOT NULL CHECK (action IN ('REQUESTED','RECEIVED','UPDATE','ACCEPTED','REJECTED','REVOKED')),
 "targetId" uuid NOT NULL, reason varchar(2000) NOT NULL CHECK (length(trim(reason)) >= 10), details jsonb NOT NULL,
 "createdAt" timestamptz(3) NOT NULL DEFAULT now()
);
CREATE INDEX "AcademyReviewEvent_caseId_createdAt_idx" ON public."AcademyReviewEvent"("caseId","createdAt");
CREATE INDEX "AcademyReviewEvent_subjectUserId_createdAt_idx" ON public."AcademyReviewEvent"("subjectUserId","createdAt");
CREATE TRIGGER "AcademyReviewEvent_immutable" BEFORE UPDATE OR DELETE ON public."AcademyReviewEvent" FOR EACH ROW EXECUTE FUNCTION public.financial_immutable_record();

-- Database enforcement complements serializable service locking.
CREATE UNIQUE INDEX "AcademyReviewEvent_first_request" ON public."AcademyReviewEvent"("caseId") WHERE action='REQUESTED';
CREATE UNIQUE INDEX "AcademyReviewEvent_terminal_decision" ON public."AcademyReviewEvent"("caseId") WHERE action IN ('ACCEPTED','REJECTED','REVOKED');
CREATE FUNCTION public.academy_review_context() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $$
DECLARE first_event public."AcademyReviewEvent"%ROWTYPE;
BEGIN
 IF NEW.action='REQUESTED' THEN
   IF NEW."actorUserId"<>NEW."subjectUserId" THEN RAISE EXCEPTION 'REVIEW_REQUEST_OWNER_REQUIRED'; END IF;
   IF NOT EXISTS(SELECT 1 FROM public."User" WHERE id=NEW."actorUserId" AND status='ACTIVE' AND "emailVerified") THEN RAISE EXCEPTION 'REVIEW_ACTIVE_ACCOUNT_REQUIRED'; END IF;
   IF NEW.kind IN ('CERTIFICATE_NAME','CERTIFICATE_ERROR','FRAUD') AND NOT EXISTS(SELECT 1 FROM public."LearningCertificate" WHERE id=NEW."targetId" AND "userId"=NEW."subjectUserId") THEN RAISE EXCEPTION 'REVIEW_TARGET_OWNER_REQUIRED'; END IF;
   IF NEW.kind IN ('EXAM_QUESTION','EXAM_SCORE') AND NOT EXISTS(SELECT 1 FROM public."LearningExamAttempt" WHERE id=NEW."targetId" AND "userId"=NEW."subjectUserId" AND status='SUBMITTED') THEN RAISE EXCEPTION 'REVIEW_TARGET_OWNER_REQUIRED'; END IF;
   IF NEW.kind='PRIVACY' AND NEW."targetId"<>NEW."subjectUserId" THEN RAISE EXCEPTION 'REVIEW_TARGET_OWNER_REQUIRED'; END IF;
 ELSE
   SELECT * INTO STRICT first_event FROM public."AcademyReviewEvent" WHERE "caseId"=NEW."caseId" AND action='REQUESTED';
   IF NEW."subjectUserId"<>first_event."subjectUserId" OR NEW.kind<>first_event.kind OR NEW."targetId"<>first_event."targetId" THEN RAISE EXCEPTION 'REVIEW_CONTEXT_IMMUTABLE'; END IF;
   IF NOT EXISTS(SELECT 1 FROM public."User" u JOIN public."OrganizationMembership" m ON m."userId"=u.id JOIN public."Organization" o ON o.id=m."organizationId" WHERE u.id=NEW."actorUserId" AND u.status='ACTIVE' AND u."platformRole"='ADMIN' AND m.status='ACTIVE' AND m.role IN ('OWNER','ADMIN') AND o.status='ACTIVE' AND o."systemKey"='WORKMATCHR_PLATFORM') THEN RAISE EXCEPTION 'REVIEW_OPERATOR_REQUIRED'; END IF;
   IF NEW.action='REVOKED' AND NEW.kind NOT IN ('FRAUD','CERTIFICATE_ERROR') THEN RAISE EXCEPTION 'REVIEW_REVOCATION_CONTEXT_REQUIRED'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "AcademyReviewEvent_context" BEFORE INSERT ON public."AcademyReviewEvent" FOR EACH ROW EXECUTE FUNCTION public.academy_review_context();
CREATE FUNCTION public.academy_seat_access_window() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $$
DECLARE o public."LearningAcademyOrder"%ROWTYPE; paid_at timestamptz;
BEGIN
 IF NEW.status NOT IN ('INVITED','ACTIVE') OR (TG_OP='UPDATE' AND OLD.status='ACTIVE') THEN RETURN NEW; END IF;
 SELECT * INTO STRICT o FROM public."LearningAcademyOrder" WHERE id=NEW."orderId";
 IF o."accessPolicyVersion" IS NOT NULL AND o.quantity=5 THEN
  SELECT "paidAt" INTO paid_at FROM public."FinancialPurchase" WHERE id=o."purchaseId";
  IF paid_at IS NULL OR CURRENT_TIMESTAMP >= ((paid_at AT TIME ZONE 'UTC') + interval '1 year') AT TIME ZONE 'UTC' THEN RAISE EXCEPTION 'ACADEMY_UNUSED_SEAT_EXPIRED'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "LearningAcademySeat_access_window" BEFORE INSERT OR UPDATE ON public."LearningAcademySeat" FOR EACH ROW EXECUTE FUNCTION public.academy_seat_access_window();
