-- Allow the only valid lifecycle transition for a published taxonomy version,
-- while keeping its identity, content checksum and publication timestamp immutable.
CREATE OR REPLACE FUNCTION workmatchr_protect_published_provider_taxonomy()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD."status" IN ('PUBLISHED', 'RETIRED') THEN
      RAISE EXCEPTION 'Gepubliceerde of gepensioneerde providertaxonomie is immutable';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD."status" = 'RETIRED' THEN
    RAISE EXCEPTION 'Gepensioneerde providertaxonomie is immutable';
  END IF;

  IF OLD."status" = 'PUBLISHED' THEN
    IF NEW."status" <> 'RETIRED'
      OR NEW."id" <> OLD."id"
      OR NEW."taxonomyId" <> OLD."taxonomyId"
      OR NEW."version" <> OLD."version"
      OR NEW."checksum" IS DISTINCT FROM OLD."checksum"
      OR NEW."publishedAt" IS DISTINCT FROM OLD."publishedAt"
      OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt"
      OR NEW."retiredAt" IS NULL THEN
      RAISE EXCEPTION 'Gepubliceerde providertaxonomie is immutable';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION workmatchr_protect_published_provider_configuration()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD."status" IN ('PUBLISHED', 'RETIRED') THEN
      RAISE EXCEPTION 'Gepubliceerde of gepensioneerde providerconfiguratie is immutable';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD."status" = 'RETIRED' THEN
    RAISE EXCEPTION 'Gepensioneerde providerconfiguratie is immutable';
  END IF;

  IF OLD."status" = 'PUBLISHED' THEN
    IF NEW."status" <> 'RETIRED'
      OR NEW."id" <> OLD."id"
      OR NEW."version" <> OLD."version"
      OR NEW."effectiveFrom" IS DISTINCT FROM OLD."effectiveFrom"
      OR NEW."effectiveUntil" IS DISTINCT FROM OLD."effectiveUntil"
      OR NEW."checksum" IS DISTINCT FROM OLD."checksum"
      OR NEW."publishedAt" IS DISTINCT FROM OLD."publishedAt"
      OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt" THEN
      RAISE EXCEPTION 'Gepubliceerde providerconfiguratie is immutable';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "immutable_published_capability_requirement_config"
BEFORE UPDATE OR DELETE ON "ProviderCapabilityRequirementConfig"
FOR EACH ROW EXECUTE FUNCTION workmatchr_protect_published_provider_configuration();

CREATE TRIGGER "immutable_published_insurance_requirement_config"
BEFORE UPDATE OR DELETE ON "ProviderInsuranceRequirementConfig"
FOR EACH ROW EXECUTE FUNCTION workmatchr_protect_published_provider_configuration();

CREATE OR REPLACE FUNCTION workmatchr_protect_published_capability_requirement()
RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "ProviderCapabilityRequirementConfig"
    WHERE "id" = OLD."configId" AND "status" IN ('PUBLISHED', 'RETIRED')
  ) THEN
    RAISE EXCEPTION 'Vereiste van gepubliceerde capabilityconfiguratie is immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "immutable_published_capability_requirement"
BEFORE UPDATE OR DELETE ON "ProviderCapabilityQualificationRequirement"
FOR EACH ROW EXECUTE FUNCTION workmatchr_protect_published_capability_requirement();

CREATE OR REPLACE FUNCTION workmatchr_protect_published_insurance_requirement()
RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "ProviderInsuranceRequirementConfig"
    WHERE "id" = OLD."configId" AND "status" IN ('PUBLISHED', 'RETIRED')
  ) THEN
    RAISE EXCEPTION 'Vereiste van gepubliceerde verzekeringsconfiguratie is immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "immutable_published_insurance_requirement"
BEFORE UPDATE OR DELETE ON "ProviderInsuranceRequirement"
FOR EACH ROW EXECUTE FUNCTION workmatchr_protect_published_insurance_requirement();

CREATE OR REPLACE FUNCTION workmatchr_protect_active_provider_term_version()
RETURNS trigger AS $$
BEGIN
  IF OLD."status" IN ('ACTIVE', 'RETIRED') THEN
    RAISE EXCEPTION 'Actieve of gepensioneerde voorwaardenversie is immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "immutable_active_provider_term_version"
BEFORE UPDATE OR DELETE ON "ProviderTermDocumentVersion"
FOR EACH ROW EXECUTE FUNCTION workmatchr_protect_active_provider_term_version();

CREATE UNIQUE INDEX "ProviderTermDocumentVersion_one_active_per_document"
ON "ProviderTermDocumentVersion" ("documentId") WHERE "status" = 'ACTIVE';

CREATE TRIGGER "immutable_providerplatformpermissiongrant"
BEFORE UPDATE OR DELETE ON "ProviderPlatformPermissionGrant"
FOR EACH ROW EXECUTE FUNCTION workmatchr_reject_provider_history_mutation();
