-- Forward-only repair: retention must not remove the final-exam publication guard.
-- Preserve function identity, ownership, ACLs and all existing retention conditions.
CREATE OR REPLACE FUNCTION public.learning_question_is_editable(question_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = pg_catalog
AS $learning_publication_guard$
  SELECT NOT EXISTS (
    SELECT 1 FROM public."LearningContentBlock" block
    JOIN public."LearningChapter" chapter ON chapter."id" = block."chapterId"
    JOIN public."LearningCourseVersion" version ON version."id" = chapter."courseVersionId"
    WHERE block."questionId" = question_id AND version."status" IN ('PUBLISHED', 'RETIRED')
  ) AND NOT EXISTS (
    SELECT 1 FROM public."LearningExamQuestion" mapping
    JOIN public."LearningExamVersion" version ON version."id" = mapping."examVersionId"
    WHERE mapping."questionId" = question_id AND version."status" IN ('PUBLISHED', 'RETIRED')
  ) AND NOT EXISTS (
    SELECT 1 FROM public."LearningRetentionQuestion" retention_question
    WHERE retention_question."questionId" = question_id
      AND retention_question."status" IN ('PUBLISHED', 'RETIRED')
  ) AND NOT EXISTS (
    SELECT 1 FROM public."LearningRetentionWeeklyQuestion" assignment
    JOIN public."LearningRetentionQuestion" retention_question ON retention_question."id" = assignment."retentionQuestionId"
    WHERE retention_question."questionId" = question_id
  ) AND NOT EXISTS (
    SELECT 1 FROM public."LearningRetentionAnnualQuestion" assignment
    JOIN public."LearningRetentionQuestion" retention_question ON retention_question."id" = assignment."retentionQuestionId"
    WHERE retention_question."questionId" = question_id
  );
$learning_publication_guard$;
