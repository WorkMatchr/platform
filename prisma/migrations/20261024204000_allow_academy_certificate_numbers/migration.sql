-- Preserve every historical WM-RIE number; permit the shared Academy prefix
-- for other courses. No certificate or learner data is updated.
ALTER TABLE "LearningCertificate" DROP CONSTRAINT "LearningCertificate_number_format_check";
ALTER TABLE "LearningCertificate" ADD CONSTRAINT "LearningCertificate_number_format_check"
  CHECK ("certificateNumber" ~ '^WM-(RIE|ACA)-[0-9]{4}-[0-9A-F]{24}$') NOT VALID;
ALTER TABLE "LearningCertificate" VALIDATE CONSTRAINT "LearningCertificate_number_format_check";
