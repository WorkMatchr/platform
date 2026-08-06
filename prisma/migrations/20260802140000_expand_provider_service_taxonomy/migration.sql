-- Publiceer de uitgebreidere dienstentaxonomie als immutable versie 2.
-- Bestaande capabilities blijven naar hun oorspronkelijke termversie verwijzen.

DO $$
DECLARE
  taxonomy_id uuid;
  version_id uuid;
BEGIN
  SELECT "id"
  INTO taxonomy_id
  FROM "ProviderTaxonomy"
  WHERE "kind" = 'SERVICE';

  IF taxonomy_id IS NULL THEN
    -- Op een lege database publiceert de expliciete seed versie 2.
    RETURN;
  END IF;

  SELECT "id"
  INTO version_id
  FROM "ProviderTaxonomyVersion"
  WHERE "taxonomyId" = taxonomy_id
    AND "version" = 2;

  IF version_id IS NULL THEN
    version_id := gen_random_uuid();

    UPDATE "ProviderTaxonomyVersion"
    SET "status" = 'RETIRED', "retiredAt" = COALESCE("retiredAt", CURRENT_TIMESTAMP)
    WHERE "taxonomyId" = taxonomy_id
      AND "version" < 2
      AND "status" = 'PUBLISHED';

    INSERT INTO "ProviderTaxonomyVersion" (
      "id", "taxonomyId", "version", "status", "checksum", "publishedAt", "createdAt"
    )
    VALUES (
      version_id,
      taxonomy_id,
      2,
      'PUBLISHED',
      '09ec4bb8d162e43c5e26c51f956287cfe0e5c7f4e23b92fcb99112109f8947dc',
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    );

    INSERT INTO "ProviderTaxonomyTerm" (
      "id", "versionId", "code", "label", "sortOrder", "isActive", "createdAt"
    )
    SELECT gen_random_uuid(), version_id, term.code, term.label, term.sort_order, true, CURRENT_TIMESTAMP
    FROM (
      VALUES
        ('RISK_ASSESSMENT', 'RI&E', 0),
        ('OCCUPATIONAL_SAFETY', 'Arbeidsveiligheid', 1),
        ('ABSENCE_REINTEGRATION', 'Verzuim en re-integratie', 2),
        ('OCCUPATIONAL_EXPERT_ADVICE', 'Arbeidsdeskundig advies', 3),
        ('REINTEGRATION_FIRST_TRACK', 'Re-integratie eerste spoor', 4),
        ('REINTEGRATION_SECOND_TRACK', 'Re-integratie tweede spoor', 5),
        ('PMO', 'Preventief medisch onderzoek (PMO)', 6),
        ('PAGO', 'Periodiek arbeidsgezondheidskundig onderzoek (PAGO)', 7),
        ('OCCUPATIONAL_PHYSICIAN', 'Bedrijfsarts', 8),
        ('OCCUPATIONAL_HEALTH_SERVICE', 'Arbodienstverlening', 9),
        ('ERGONOMICS', 'Ergonomie', 10),
        ('OCCUPATIONAL_HYGIENE', 'Arbeidshygiëne', 11),
        ('MACHINERY_SAFETY', 'Machineveiligheid', 12),
        ('INCIDENT_INVESTIGATION', 'Incidentonderzoek', 13),
        ('EMERGENCY_RESPONSE', 'BHV en ontruiming', 14),
        ('SAFETY_ADVICE', 'Veiligheidsadvies', 15),
        ('IMPLEMENTATION_SUPPORT', 'Ondersteuning bij implementatie', 16),
        ('AUDIT_AND_INSPECTION', 'Audit en inspectie', 17),
        ('TRAINING', 'Opleiding en training', 18)
    ) AS term(code, label, sort_order);
  END IF;

  UPDATE "ProviderTaxonomyVersion"
  SET "status" = 'RETIRED', "retiredAt" = COALESCE("retiredAt", CURRENT_TIMESTAMP)
  WHERE "taxonomyId" = taxonomy_id
    AND "version" < 2
    AND "status" = 'PUBLISHED';
END $$;
