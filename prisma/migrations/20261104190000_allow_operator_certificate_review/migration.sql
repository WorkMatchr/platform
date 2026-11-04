-- Forward-only: authorized operators may open certificate error/fraud reviews in their own identity.
-- Existing owner, context, active-account, terminal-decision and append-only guards remain enforced.
CREATE OR REPLACE FUNCTION public.academy_review_context() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $$
DECLARE first_event public."AcademyReviewEvent"%ROWTYPE;
BEGIN
 IF NEW.action='REQUESTED' THEN
   IF NEW."actorUserId"<>NEW."subjectUserId" THEN
     IF NEW.kind NOT IN ('CERTIFICATE_ERROR','FRAUD') OR NEW.details->>'source' IS DISTINCT FROM 'PLATFORM_OPERATOR'
       OR NOT EXISTS(SELECT 1 FROM public."User" u JOIN public."OrganizationMembership" m ON m."userId"=u.id JOIN public."Organization" o ON o.id=m."organizationId"
         WHERE u.id=NEW."actorUserId" AND u.status='ACTIVE' AND u."emailVerified" AND u."platformRole"='ADMIN'
           AND m.status='ACTIVE' AND m.role IN ('OWNER','ADMIN') AND o.status='ACTIVE' AND o."systemKey"='WORKMATCHR_PLATFORM')
     THEN RAISE EXCEPTION 'REVIEW_REQUEST_OWNER_REQUIRED'; END IF;
   END IF;
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
