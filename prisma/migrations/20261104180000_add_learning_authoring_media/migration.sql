-- Additive LMS media support; existing course/exam snapshots and protection triggers remain intact.
ALTER TYPE "LearningContentBlockType" ADD VALUE 'VIDEO';
ALTER TABLE "LearningExamQuestion" DROP CONSTRAINT "LearningExamQuestion_chapter_check";
ALTER TABLE "LearningExamQuestion" ADD CONSTRAINT "LearningExamQuestion_chapter_check" CHECK ("chapterNumber" BETWEEN 1 AND 100);
