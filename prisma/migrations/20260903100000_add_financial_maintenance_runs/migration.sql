CREATE TABLE "FinancialMaintenanceRun" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMPTZ(3),
    "status" VARCHAR(30) NOT NULL,
    "trigger" VARCHAR(30) NOT NULL,
    "resultCounts" JSONB,
    "errorCodes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialMaintenanceRun_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "FinancialMaintenanceRun_status_check"
        CHECK ("status" IN ('RUNNING', 'SUCCEEDED', 'PARTIAL_FAILURE', 'FAILED')),
    CONSTRAINT "FinancialMaintenanceRun_trigger_check"
        CHECK ("trigger" IN ('SCHEDULER', 'MANUAL_API'))
);

CREATE INDEX "FinancialMaintenanceRun_startedAt_idx"
ON "FinancialMaintenanceRun"("startedAt");

CREATE INDEX "FinancialMaintenanceRun_status_startedAt_idx"
ON "FinancialMaintenanceRun"("status", "startedAt");

CREATE UNIQUE INDEX "FinancialMaintenanceRun_single_running_idx"
ON "FinancialMaintenanceRun" ((1))
WHERE "status" = 'RUNNING';
