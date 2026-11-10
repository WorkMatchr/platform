-- Generic editors support up to 100 chapters. Existing rows already satisfy the wider range.
ALTER TABLE "LearningExamQuestion" DROP CONSTRAINT "LearningExamQuestion_chapter_check",
  ADD CONSTRAINT "LearningExamQuestion_chapter_check" CHECK ("chapterNumber" BETWEEN 1 AND 100);
