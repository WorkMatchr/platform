-- Static synthetic release manifest. Only executed inside the networkless rehearsal.
BEGIN;
DO $$ BEGIN IF current_setting('workmatchr.clean_start_fixture', true) IS DISTINCT FROM 'isolated-v3'
    OR current_database() NOT IN ('fixture_old','fixture_target') THEN RAISE EXCEPTION 'fixture only'; END IF; END $$;
INSERT INTO "Sector" (id,name,slug,"createdAt","updatedAt") VALUES ('10000000-0000-4000-8000-000000000001','Proefsector','synthetische-sector','2026-01-01','2026-01-01');
INSERT INTO "LearningCourse" (id,slug,code,title,description,"createdAt","updatedAt") VALUES ('10000000-0000-4000-8000-000000000002','proefcursus','SYNTH','Proefcursus','Oefeninhoud','2026-01-01','2026-01-01');
INSERT INTO "LearningCourseVersion" (id,"courseId",version,"createdAt") VALUES ('10000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000002','1','2026-01-01');
INSERT INTO "LearningChapter" (id,"courseVersionId",slug,title,position,"estimatedMinutes","createdAt") VALUES ('10000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000003','oefenen','Oefenen',1,5,'2026-01-01');
INSERT INTO "LearningContentBlock" (id,"chapterId",position,type,data) VALUES ('10000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000004',1,'TEXT','{"text":"Synthetische les"}');
INSERT INTO "LearningExam" (id,"courseId",code,title,"createdAt") VALUES ('10000000-0000-4000-8000-000000000006','10000000-0000-4000-8000-000000000002','SYNTH-EXAM','Proeftoets','2026-01-01');
INSERT INTO "ComplianceFrameworkVersion" (id,"frameworkCode",version,title,methodology,disclaimer,checksum,"createdAt") VALUES ('10000000-0000-4000-8000-000000000007','SYNTH','1','Proefkader','Synthetisch','Test',repeat('a',64),'2026-01-01');
INSERT INTO "ComplianceModuleDefinition" (id,"frameworkVersionId",code,title,category,"defaultAssessmentMode",position,"createdAt") VALUES ('10000000-0000-4000-8000-000000000008','10000000-0000-4000-8000-000000000007','C01','Proefmodule','CORE','FULL',1,'2026-01-01');
INSERT INTO "LearningQuestion" (id,code,"knowledgeArea","learningObjective",type,"questionText",explanation,"correctAnswer") VALUES ('10000000-0000-4000-8000-000000000009','SYN-Q01','Proef','Herken de proef','SINGLE_CHOICE','Welke keuze is juist?','Oefenvraag','{"value":"a"}');
INSERT INTO "LearningQuestionOption" (id,"questionId",value,text,"isCorrect",position) VALUES
('10000000-0000-4000-8000-000000000010','10000000-0000-4000-8000-000000000009','a','A',true,1),
('10000000-0000-4000-8000-000000000011','10000000-0000-4000-8000-000000000009','b','B',false,2);
INSERT INTO "LearningExamVersion" (id,"examId","courseId","courseVersionId",version,"questionCount","maxScore","passingScore","passingPercentage","createdAt") VALUES ('10000000-0000-4000-8000-000000000012','10000000-0000-4000-8000-000000000006','10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000003','1',1,1,1,100,'2026-01-01');
INSERT INTO "LearningExamQuestion" (id,"examVersionId","questionId",code,position,"chapterNumber","cognitiveLevel","knowledgeAreas") VALUES ('10000000-0000-4000-8000-000000000013','10000000-0000-4000-8000-000000000012','10000000-0000-4000-8000-000000000009','E01',1,1,'B',ARRAY['Proef']);
INSERT INTO "ProviderTaxonomy" (id,kind,code,name,"createdAt") VALUES
('10000000-0000-4000-8000-000000000014','SERVICE','SERVICE','Diensten','2026-01-01'),
('10000000-0000-4000-8000-000000000015','SECTOR','SECTOR','Sectoren','2026-01-01');
INSERT INTO "ProviderTaxonomyVersion" (id,"taxonomyId",version,status,checksum,"publishedAt","createdAt") VALUES
('10000000-0000-4000-8000-000000000016','10000000-0000-4000-8000-000000000014',1,'PUBLISHED',repeat('1',64),'2026-01-01','2026-01-01'),
('10000000-0000-4000-8000-000000000017','10000000-0000-4000-8000-000000000015',1,'PUBLISHED',repeat('2',64),'2026-01-01','2026-01-01');
INSERT INTO "ProviderTaxonomyTerm" (id,"versionId",code,label,"sortOrder","createdAt") VALUES
('10000000-0000-4000-8000-000000000018','10000000-0000-4000-8000-000000000016','SYN-SERVICE','Proefdienst',1,'2026-01-01'),
('10000000-0000-4000-8000-000000000019','10000000-0000-4000-8000-000000000017','SYN-SECTOR','Proefsector',1,'2026-01-01');
COMMIT;
