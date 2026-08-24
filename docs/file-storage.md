# Bestandsopslag WorkMatchr

## Organisatielogo’s

Versie 1 accepteert PNG, JPEG en WebP tot 2 MB. SVG is uitgesloten wegens actieve inhoud en sanitizationrisico. Sharp decodeert de werkelijke inhoud, controleert MIME, formaat en dimensies, verwijdert metadata en codeert opnieuw naar WebP met maximaal 1024 × 1024 pixels en behoud van beeldverhouding.

## Lokale ontwikkeling

`OrganizationLogoStorage` abstraheert `save`, `delete`, `read` en de publieke URL. De lokale adapter gebruikt willekeurige UUID-v4-sleutels onder `.local-storage/organization-logos`. Git negeert `.local-storage`. `/media/organization-logos/[storageKey]` accepteert alleen geldige storage keys, geeft uitsluitend WebP terug en voorkomt directory traversal en absolute-padlekken.

## Productie

Lokale schijf is niet geschikt voor Vercel-productie. Zonder geconfigureerde toekomstige object-storageprovider weigert productie de opslag veilig en logt alleen een configuratiefout. Er is nog geen vendor gekozen. Lokale ontwikkellogo’s hoeven niet te worden gemigreerd.

### Knowledge-bronbestanden

Knowledge Source Upload v1 gebruikt een afzonderlijke `KnowledgeSourceUploadStorage`-adapter omdat bron-PDF's private, immutable artifacts zijn. De productieadapter gebruikt Vercel Private Blob met OIDC; tests gebruiken uitsluitend een in-memory adapter. Het originele document blijft private en wordt alleen server-side gelezen na platformbeheer-autorisatie.

Object keys zijn deterministisch en checksumgebonden: `knowledge-source-uploads/v1/sha256/<prefix>/<sha256>.pdf`. De adapter gebruikt `access: private`, schakelt overschrijven en willekeurige suffixen uit en verifieert bij iedere read opnieuw contenttype, grootte en SHA-256. Een identieke herupload hergebruikt hetzelfde object; afwijkende bytes onder dezelfde identiteit falen gesloten. In PostgreSQL staat uitsluitend de interne locator en de immutable bronmetadata, nooit een publieke of private Blob-URL.

De Vercel serverbundle houdt `pdfjs-dist` en de noodzakelijke native `@napi-rs/canvas`-runtime extern en neemt die runtime expliciet mee voor de uploadroute. Daardoor gebruikt Preview dezelfde bestaande deterministische PDF-extractor als lokale en database-ingests.

Preview en Production moeten ieder een eigen private Blob-store hebben. De runtime vereist `KNOWLEDGE_UPLOAD_BLOB_STORE_ID`, `KNOWLEDGE_UPLOAD_BLOB_ENVIRONMENT` en een door Vercel verstrekt `VERCEL_OIDC_TOKEN`; een omgevingsmismatch of ontbrekende configuratie schakelt uploaden fail-closed uit. De stores worden alleen aan hun eigen Vercel-environment gekoppeld. Er is in v1 bewust geen deletefunctie: bronartifacts blijven immutable en retentie/verwijdering vereist een afzonderlijk besluit.

## Private providerbewijzen

Module 6A.2 modelleert alleen versioned private metadata, SHA-256 en een afzonderlijk immutable scanbesluit. Bestandsbytes, publieke URLs en lokale paden worden niet in PostgreSQL opgeslagen en de bestaande logo-opslag wordt niet hergebruikt.

De productieadapter voor providerbewijs is bewust nog niet geactiveerd. Voor productie zijn minimaal nodig: private object storage binnen vastgestelde datalocatie, staged upload, MIME/signaturevalidatie, limieten, malwarecontrole, quarantine, korte geautoriseerde reads, encryptie, toegangslogging, retention delete, legal hold, orphan cleanup en hersteltests. Tot die configuratie bestaat, is alleen metadataregistratie vanuit een vertrouwde toekomstige opslagketen toegestaan en faalt inhoudelijk gebruik zonder `CLEAN` scanbesluit gesloten.
