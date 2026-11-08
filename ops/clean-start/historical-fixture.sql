BEGIN;
DO $$ BEGIN IF current_setting('workmatchr.clean_start_fixture', true) IS DISTINCT FROM 'isolated-v3'
    OR current_database()<>'fixture_old' THEN RAISE EXCEPTION 'fixture only'; END IF; END $$;
INSERT INTO "User"(id,email,"accountType",status,"updatedAt") VALUES ('20000000-0000-4000-8000-000000000001','fixture@example.invalid','PROFESSIONAL','ACTIVE',now());
INSERT INTO "Session" ("userId",token,"expiresAt","updatedAt") VALUES ('20000000-0000-4000-8000-000000000001','synthetic-session-only',now()+interval '1 day',now());
INSERT INTO "Organization" (id,name,"organizationType",status,"updatedAt") VALUES ('20000000-0000-4000-8000-000000000002','Testorganisatie','BOTH','ACTIVE',now());
INSERT INTO "OrganizationMembership" ("organizationId","userId",role,status,"updatedAt") VALUES ('20000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001','OWNER','ACTIVE',now());
INSERT INTO "CreditAccount"  ("organizationId",balance,"availableBalance","updatedAt") VALUES ('20000000-0000-4000-8000-000000000002',25,25,now());
INSERT INTO "ProfessionalSubscription" ("organizationId",status,"planCode","planLabel","amountExclVatCents","vatRateBps","vatAmountCents","amountInclVatCents",currency,"updatedAt") VALUES ('20000000-0000-4000-8000-000000000002','ACTIVE','TEST','Synthetisch',100,2100,21,121,'EUR',now());
INSERT INTO "Assignment" (id,"clientOrganizationId","createdByUserId",title,description,status,"updatedAt") VALUES ('20000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001','Proef','Proefopdracht','READY_FOR_REVIEW',now());
INSERT INTO "AssignmentRevision" ("assignmentId",version,title,description,"allowsRemoteWork","changedByUserId") SELECT id,version,title,description,"allowsRemoteWork","createdByUserId" FROM "Assignment" WHERE id='20000000-0000-4000-8000-000000000003';
UPDATE "Assignment" SET status='OPEN',"publishedAt"=now(),"publishedByUserId"="createdByUserId","publishedVersion"=version WHERE id='20000000-0000-4000-8000-000000000003';
INSERT INTO "AssignmentStatusHistory" ("assignmentId","fromStatus","toStatus","changedByUserId","createdAt") SELECT id,'READY_FOR_REVIEW','OPEN',"publishedByUserId","publishedAt" FROM "Assignment" WHERE id='20000000-0000-4000-8000-000000000003';
INSERT INTO "NotificationOutbox" ("eventId",channel,"templateKey",payload,"idempotencyKey") VALUES ('synth','EMAIL','fixture','{}','fixture-only');
COMMIT;
