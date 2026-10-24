-- Explicit identity for the EXISTING code-based guide v1/report v1.0.
-- This is not publication of the future NL_ARBO/2026-10 configurable framework.
-- No historical runs, questions, results or existing framework rows are changed.
-- A collision intentionally fails; never overwrite unknown reference data.
INSERT INTO "ComplianceFrameworkVersion"
  ("id", "frameworkCode", "version", "status", "title", "methodology", "disclaimer", "checksum", "publishedAt")
VALUES (
  '7e44a647-0549-4d96-a14c-c1d783d11e01', 'NL_ARBO_LEGACY', '1', 'PUBLISHED',
  'Bestaande Compliance-wijzer versie 1',
  'Bestaande 21 vragen en codegebaseerde beoordeling: compliance-guide.ts versie 1, rapportversie 1.0, repositorybaseline d3bce31248cf496f4c0563e210addbcb8d2e721c. Checksum: SHA-256 van compliance-guide.ts met LF-regelafbrekingen. Geen configuratie van het toekomstige NL_ARBO-framework.',
  'Indicatieve zelfbeoordeling; geen certificering of vervanging van professioneel advies.',
  'afc31346f3a0a0e397f1c51c2edd76ca60371f58387403afbed175fee9d830e8', CURRENT_TIMESTAMP
);
