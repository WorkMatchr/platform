-- Preserve all existing course/retention protections and restore the exam branch
-- lost when the retention migration replaced this shared helper.
CREATE OR REPLACE FUNCTION "learning_question_is_editable"(question_id UUID) RETURNS BOOLEAN AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM "LearningContentBlock" block
    JOIN "LearningChapter" chapter ON chapter."id" = block."chapterId"
    JOIN "LearningCourseVersion" version ON version."id" = chapter."courseVersionId"
    WHERE block."questionId" = question_id AND version."status" IN ('PUBLISHED', 'RETIRED')
  ) AND NOT EXISTS (
    SELECT 1 FROM "LearningExamQuestion" mapping
    JOIN "LearningExamVersion" version ON version."id" = mapping."examVersionId"
    WHERE mapping."questionId" = question_id AND version."status" IN ('PUBLISHED', 'RETIRED')
  ) AND NOT EXISTS (
    SELECT 1 FROM "LearningRetentionQuestion" metadata
    WHERE metadata."questionId" = question_id AND metadata."status" IN ('PUBLISHED', 'RETIRED')
  ) AND NOT EXISTS (
    SELECT 1 FROM "LearningRetentionWeeklyQuestion" assignment
    JOIN "LearningRetentionQuestion" metadata ON metadata."id" = assignment."retentionQuestionId"
    WHERE metadata."questionId" = question_id
  ) AND NOT EXISTS (
    SELECT 1 FROM "LearningRetentionAnnualQuestion" assignment
    JOIN "LearningRetentionQuestion" metadata ON metadata."id" = assignment."retentionQuestionId"
    WHERE metadata."questionId" = question_id
  );
$$ LANGUAGE sql STABLE;
