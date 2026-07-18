-- Additieve providerverklaring; bestaande historie blijft zelfverklaard en krijgt geen positieve aanname.
ALTER TABLE "ProviderProfessionalQualificationRevision"
ADD COLUMN "isCertified" BOOLEAN NOT NULL DEFAULT false;
