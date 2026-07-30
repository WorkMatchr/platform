-- M7B.2: publiceer een nieuwe, versieerbare vakdisciplinetaxonomie.
-- Bestaande capabilities, projecties, dossiers en aanvragen blijven ongewijzigd.

INSERT INTO "Specialism" (
  "id",
  "name",
  "slug",
  "isActive",
  "createdAt",
  "updatedAt"
)
VALUES
  (gen_random_uuid(), 'Ergonoom', 'ergonoom', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Arbeids- en organisatiedeskundige', 'arbeids-en-organisatiedeskundige', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Asbestdeskundige', 'asbest', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Milieudeskundige', 'milieudeskundige', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "isActive" = true,
  "updatedAt" = CURRENT_TIMESTAMP;

DO $$
DECLARE
  taxonomy_id uuid;
  version_id uuid;
BEGIN
  SELECT "id"
  INTO taxonomy_id
  FROM "ProviderTaxonomy"
  WHERE "kind" = 'SPECIALISM';

  IF taxonomy_id IS NULL THEN
    -- Een volledig nieuwe database ontvangt referentiedata pas na
    -- `prisma migrate deploy`. De idempotente seed publiceert daar v2.
    RETURN;
  END IF;

  SELECT "id"
  INTO version_id
  FROM "ProviderTaxonomyVersion"
  WHERE "taxonomyId" = taxonomy_id
    AND "version" = 2;

  IF version_id IS NULL THEN
    version_id := gen_random_uuid();

    INSERT INTO "ProviderTaxonomyVersion" (
      "id",
      "taxonomyId",
      "version",
      "status",
      "checksum",
      "publishedAt",
      "createdAt"
    )
    VALUES (
      version_id,
      taxonomy_id,
      2,
      'PUBLISHED',
      '93ad22c9f8c866884a0db713c1f2acea49ebe94caf2aabab85d5a40255847612',
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    );

    INSERT INTO "ProviderTaxonomyTerm" (
      "id",
      "versionId",
      "code",
      "label",
      "sortOrder",
      "isActive",
      "createdAt"
    )
    SELECT
      gen_random_uuid(),
      version_id,
      term.code,
      term.label,
      term.sort_order,
      true,
      CURRENT_TIMESTAMP
    FROM (
      VALUES
        ('rie', 'RI&E', 0),
        ('bedrijfsarts', 'Bedrijfsarts', 1),
        ('arbodienst', 'Arbodienst', 2),
        ('pmo', 'PMO', 3),
        ('veiligheidskundige', 'Veiligheidskundige', 4),
        ('middelbare-veiligheidskundige', 'Middelbare veiligheidskundige', 5),
        ('hogere-veiligheidskundige', 'Hogere veiligheidskundige', 6),
        ('arbeidshygienist', 'Arbeidshygiënist', 7),
        ('arbeidsdeskundige', 'Arbeidsdeskundige', 8),
        ('verzuimbegeleiding', 'Verzuimbegeleiding', 9),
        ('machineveiligheid', 'Machineveiligheid', 10),
        ('brandveiligheid', 'Brandveiligheid', 11),
        ('operationele-veiligheid', 'Operationele veiligheid', 12),
        ('ergonoom', 'Ergonoom', 13),
        ('arbeids-en-organisatiedeskundige', 'Arbeids- en organisatiedeskundige', 14),
        ('asbest', 'Asbestdeskundige', 15),
        ('milieudeskundige', 'Milieudeskundige', 16)
    ) AS term(code, label, sort_order);
  END IF;

  INSERT INTO "ProviderSpecialismTaxonomyMap" ("termId", "specialismId")
  SELECT term."id", specialism."id"
  FROM "ProviderTaxonomyTerm" term
  JOIN "Specialism" specialism ON specialism."slug" = term."code"
  WHERE term."versionId" = version_id
  ON CONFLICT ("specialismId") DO UPDATE
  SET "termId" = EXCLUDED."termId";

  UPDATE "ProviderTaxonomyVersion"
  SET
    "status" = 'RETIRED',
    "retiredAt" = COALESCE("retiredAt", CURRENT_TIMESTAMP)
  WHERE "taxonomyId" = taxonomy_id
    AND "version" = 1
    AND "status" = 'PUBLISHED';
END $$;
