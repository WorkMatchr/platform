-- Additive, Preview-first persistence for the machine-readable understanding
-- and managed routing profile. Existing drafts remain valid with NULL values.
ALTER TABLE "PublicIntakeDraft"
  ADD COLUMN "caseUnderstandingVersion" VARCHAR(100),
  ADD COLUMN "caseUnderstandingJson" JSONB,
  ADD COLUMN "matchingProfileJson" JSONB,
  ADD COLUMN "caseUnderstandingUpdatedAt" TIMESTAMPTZ(3);

ALTER TABLE "PublicIntakeDraft"
  ADD CONSTRAINT "PublicIntakeDraft_caseUnderstandingVersion_check"
  CHECK (
    ("caseUnderstandingJson" IS NULL AND "caseUnderstandingVersion" IS NULL)
    OR
    ("caseUnderstandingJson" IS NOT NULL AND "caseUnderstandingVersion" = 'case-understanding/1.0.0')
  );

ALTER TABLE "KnowledgeClaim"
  ADD COLUMN "usageScopes" VARCHAR(120)[] NOT NULL DEFAULT ARRAY[]::VARCHAR(120)[];

ALTER TABLE "KnowledgeRule"
  ADD COLUMN "usageScopes" VARCHAR(120)[] NOT NULL DEFAULT ARRAY[]::VARCHAR(120)[];

ALTER TABLE "KnowledgeClaim"
  ADD CONSTRAINT "KnowledgeClaim_usageScopes_check"
  CHECK (array_position("usageScopes", NULL) IS NULL);

DO $$
DECLARE
  taxonomy_id uuid;
  current_version_id uuid;
  next_version_id uuid;
  current_version_number integer;
BEGIN
  SELECT "id" INTO taxonomy_id
  FROM "ProviderTaxonomy"
  WHERE "kind" = 'SPECIALISM';

  IF taxonomy_id IS NULL THEN
    INSERT INTO "ProviderTaxonomy" ("id", "kind", "code", "name", "createdAt")
    VALUES (gen_random_uuid(), 'SPECIALISM', 'SPECIALISM', 'SPECIALISM', CURRENT_TIMESTAMP)
    RETURNING "id" INTO taxonomy_id;
  END IF;

  SELECT "id", "version" INTO current_version_id, current_version_number
  FROM "ProviderTaxonomyVersion"
  WHERE "taxonomyId" = taxonomy_id AND "status" = 'PUBLISHED'
  ORDER BY "version" DESC
  LIMIT 1;

  IF current_version_id IS NULL THEN
    -- Een Preview-database kan de idempotente referentieseed nog niet hebben
    -- gehad. Bouw dan eerst dezelfde basistaxonomie uit de reeds bestaande,
    -- actieve Specialism-referenties; geen gebruikers- of providerdata.
    current_version_id := gen_random_uuid();
    current_version_number := 2;
    INSERT INTO "ProviderTaxonomyVersion" (
      "id", "taxonomyId", "version", "status", "checksum", "publishedAt", "createdAt"
    ) VALUES (
      current_version_id, taxonomy_id, current_version_number, 'PUBLISHED',
      '93ad22c9f8c866884a0db713c1f2acea49ebe94caf2aabab85d5a40255847612',
      CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    );
    INSERT INTO "ProviderTaxonomyTerm" (
      "id", "versionId", "code", "label", "description", "aliases", "sortOrder", "isActive", "createdAt"
    )
    SELECT gen_random_uuid(), current_version_id, "slug", "name", "description", ARRAY[]::TEXT[],
      row_number() OVER (ORDER BY "createdAt", "slug")::integer - 1, true, CURRENT_TIMESTAMP
    FROM "Specialism"
    WHERE "isActive" = true AND "slug" <> 'process-safety-major-hazards';
    INSERT INTO "ProviderSpecialismTaxonomyMap" ("termId", "specialismId")
    SELECT term."id", specialism."id"
    FROM "ProviderTaxonomyTerm" term
    JOIN "Specialism" specialism ON specialism."slug" = term."code"
    WHERE term."versionId" = current_version_id
    ON CONFLICT ("specialismId") DO UPDATE SET "termId" = EXCLUDED."termId";
  END IF;

  -- Cross-discipline specialism approved for intake routing and matching. It
  -- is deliberately not nested below, or equated with, the HVK discipline.
  INSERT INTO "Specialism" (
    "id", "name", "slug", "description", "isActive", "createdAt", "updatedAt"
  ) VALUES (
    gen_random_uuid(), 'Procesveiligheid en majeure gevaren', 'process-safety-major-hazards',
    'Cross-discipline specialisme voor procesveiligheid en majeure-gevarensituaties; vereist aantoonbare relevante ervaring.',
    true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  )
  ON CONFLICT ("slug") DO UPDATE SET
    "name" = EXCLUDED."name", "description" = EXCLUDED."description",
    "isActive" = true, "updatedAt" = CURRENT_TIMESTAMP;

  IF EXISTS (
    SELECT 1 FROM "ProviderTaxonomyTerm"
    WHERE "versionId" = current_version_id AND "code" = 'PROCESS_SAFETY_MAJOR_HAZARDS'
  ) THEN
    RETURN;
  END IF;

  next_version_id := gen_random_uuid();

  UPDATE "ProviderTaxonomyVersion"
  SET "status" = 'RETIRED', "retiredAt" = CURRENT_TIMESTAMP
  WHERE "id" = current_version_id AND "status" = 'PUBLISHED';

  INSERT INTO "ProviderTaxonomyVersion" (
    "id", "taxonomyId", "version", "status", "checksum", "publishedAt", "createdAt"
  ) VALUES (
    next_version_id,
    taxonomy_id,
    current_version_number + 1,
    'PUBLISHED',
    md5('SPECIALISM:' || (current_version_number + 1)::text || ':PROCESS_SAFETY_MAJOR_HAZARDS')
      || md5('WORKMATCHR:' || (current_version_number + 1)::text || ':PROCESS_SAFETY_MAJOR_HAZARDS'),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  );

  INSERT INTO "ProviderTaxonomyTerm" (
    "id", "versionId", "code", "label", "description", "aliases", "sortOrder", "isActive", "createdAt"
  )
  SELECT
    gen_random_uuid(), next_version_id, "code", "label", "description", "aliases", "sortOrder", "isActive", CURRENT_TIMESTAMP
  FROM "ProviderTaxonomyTerm"
  WHERE "versionId" = current_version_id;

  INSERT INTO "ProviderTaxonomyTerm" (
    "id", "versionId", "code", "label", "description", "aliases", "sortOrder", "isActive", "createdAt"
  ) VALUES (
    gen_random_uuid(), next_version_id,
    'PROCESS_SAFETY_MAJOR_HAZARDS',
    'Procesveiligheid en majeure gevaren',
    'Cross-discipline specialisme; kwalificatie vereist een passende professionele achtergrond én aantoonbare relevante ervaring.',
    ARRAY['process safety', 'major hazards', 'Seveso', 'BRZO']::VARCHAR[],
    (SELECT COALESCE(MAX("sortOrder"), -1) + 1 FROM "ProviderTaxonomyTerm" WHERE "versionId" = next_version_id),
    true,
    CURRENT_TIMESTAMP
  );

  INSERT INTO "ProviderSpecialismTaxonomyMap" ("termId", "specialismId")
  SELECT term."id", specialism."id"
  FROM "ProviderTaxonomyTerm" term
  JOIN "Specialism" specialism
    ON specialism."slug" = CASE
      WHEN term."code" = 'PROCESS_SAFETY_MAJOR_HAZARDS' THEN 'process-safety-major-hazards'
      ELSE term."code"
    END
  WHERE term."versionId" = next_version_id
  ON CONFLICT ("specialismId") DO UPDATE SET "termId" = EXCLUDED."termId";
END $$;

ALTER TABLE "KnowledgeRule"
  ADD CONSTRAINT "KnowledgeRule_usageScopes_check"
  CHECK (array_position("usageScopes", NULL) IS NULL);
