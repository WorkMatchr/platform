CREATE TYPE "ComplianceActionStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_EXTERNAL', 'DONE', 'NOT_APPLICABLE');

CREATE TYPE "ComplianceActionEventType" AS ENUM ('CREATED', 'STATUS_CHANGED', 'ASSIGNEE_CHANGED', 'DUE_DATE_CHANGED');

CREATE TABLE "ComplianceAction" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "arboGuideRunId" UUID NOT NULL,
  "subjectCode" VARCHAR(80) NOT NULL,
  "findingCode" VARCHAR(80) NOT NULL,
  "title" VARCHAR(240) NOT NULL,
  "description" TEXT NOT NULL,
  "priority" "CompliancePriority" NOT NULL,
  "serviceSuggestionCode" VARCHAR(80),
  "assignedUserId" UUID,
  "dueAt" TIMESTAMPTZ(3),
  "status" "ComplianceActionStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ComplianceAction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ComplianceActionEvent" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "complianceActionId" UUID NOT NULL,
  "eventType" "ComplianceActionEventType" NOT NULL,
  "actorUserId" UUID NOT NULL,
  "previousStatus" "ComplianceActionStatus",
  "newStatus" "ComplianceActionStatus",
  "previousAssigneeId" UUID,
  "newAssigneeId" UUID,
  "previousDueAt" TIMESTAMPTZ(3),
  "newDueAt" TIMESTAMPTZ(3),
  "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ComplianceActionEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ComplianceAction_arboGuideRunId_findingCode_key"
  ON "ComplianceAction"("arboGuideRunId", "findingCode");
CREATE INDEX "ComplianceAction_arboGuideRunId_status_idx"
  ON "ComplianceAction"("arboGuideRunId", "status");
CREATE INDEX "ComplianceAction_assignedUserId_status_idx"
  ON "ComplianceAction"("assignedUserId", "status");
CREATE INDEX "ComplianceAction_dueAt_status_idx"
  ON "ComplianceAction"("dueAt", "status");
CREATE INDEX "ComplianceActionEvent_complianceActionId_occurredAt_idx"
  ON "ComplianceActionEvent"("complianceActionId", "occurredAt");
CREATE INDEX "ComplianceActionEvent_actorUserId_occurredAt_idx"
  ON "ComplianceActionEvent"("actorUserId", "occurredAt");

ALTER TABLE "ComplianceAction"
  ADD CONSTRAINT "ComplianceAction_arboGuideRunId_fkey"
  FOREIGN KEY ("arboGuideRunId") REFERENCES "ArboGuideRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ComplianceAction"
  ADD CONSTRAINT "ComplianceAction_assignedUserId_fkey"
  FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ComplianceActionEvent"
  ADD CONSTRAINT "ComplianceActionEvent_complianceActionId_fkey"
  FOREIGN KEY ("complianceActionId") REFERENCES "ComplianceAction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ComplianceActionEvent"
  ADD CONSTRAINT "ComplianceActionEvent_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION "protect_compliance_action_origin"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."arboGuideRunId" IS DISTINCT FROM OLD."arboGuideRunId"
    OR NEW."subjectCode" IS DISTINCT FROM OLD."subjectCode"
    OR NEW."findingCode" IS DISTINCT FROM OLD."findingCode"
    OR NEW."title" IS DISTINCT FROM OLD."title"
    OR NEW."description" IS DISTINCT FROM OLD."description"
    OR NEW."priority" IS DISTINCT FROM OLD."priority"
    OR NEW."serviceSuggestionCode" IS DISTINCT FROM OLD."serviceSuggestionCode"
    OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt"
  THEN
    RAISE EXCEPTION 'ComplianceAction origin is immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "ComplianceAction_protect_origin"
BEFORE UPDATE ON "ComplianceAction"
FOR EACH ROW EXECUTE FUNCTION "protect_compliance_action_origin"();

CREATE OR REPLACE FUNCTION "protect_compliance_action_event_append_only"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'ComplianceActionEvent is append-only';
END;
$$;

CREATE TRIGGER "ComplianceActionEvent_no_update"
BEFORE UPDATE ON "ComplianceActionEvent"
FOR EACH ROW EXECUTE FUNCTION "protect_compliance_action_event_append_only"();

CREATE TRIGGER "ComplianceActionEvent_no_delete"
BEFORE DELETE ON "ComplianceActionEvent"
FOR EACH ROW EXECUTE FUNCTION "protect_compliance_action_event_append_only"();
