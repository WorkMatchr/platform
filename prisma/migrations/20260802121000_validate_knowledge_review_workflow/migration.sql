-- Nieuwe enumwaarden zijn pas na de voorgaande migratie veilig bruikbaar in constraints.
ALTER TABLE "KnowledgeReviewTask"
  ADD CONSTRAINT "KnowledgeReviewTask_completion_check"
  CHECK (
    ("status" IN ('CONTENT_APPROVED', 'REJECTED') AND "completedAt" IS NOT NULL AND "completedById" IS NOT NULL)
    OR "status" NOT IN ('CONTENT_APPROVED', 'REJECTED')
  );
