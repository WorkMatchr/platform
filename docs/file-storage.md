# Bestandsopslag WorkMatchr

## Organisatielogo’s

Versie 1 accepteert PNG, JPEG en WebP tot 2 MB. SVG is uitgesloten wegens actieve inhoud en sanitizationrisico. Sharp decodeert de werkelijke inhoud, controleert MIME, formaat en dimensies, verwijdert metadata en codeert opnieuw naar WebP met maximaal 1024 × 1024 pixels en behoud van beeldverhouding.

## Lokale ontwikkeling

`OrganizationLogoStorage` abstraheert `save`, `delete`, `read` en de publieke URL. De lokale adapter gebruikt willekeurige UUID-v4-sleutels onder `.local-storage/organization-logos`. Git negeert `.local-storage`. `/media/organization-logos/[storageKey]` accepteert alleen geldige storage keys, geeft uitsluitend WebP terug en voorkomt directory traversal en absolute-padlekken.

## Productie

Lokale schijf is niet geschikt voor Vercel-productie. Zonder geconfigureerde toekomstige object-storageprovider weigert productie de opslag veilig en logt alleen een configuratiefout. Er is nog geen vendor gekozen. Lokale ontwikkellogo’s hoeven niet te worden gemigreerd.

Bij vervangen wordt eerst het nieuwe bestand gevalideerd en opgeslagen, daarna de database bijgewerkt en vervolgens het oude bestand verwijderd. Bij databasefout wordt het nieuwe bestand opgeruimd. Bij verwijderen worden eerst metadata gewist en daarna het bestand verwijderd. Object storage kan later asynchrone orphan-cleanup, back-ups en lifecyclebeleid toevoegen.

## Private providerbewijzen

Module 6A.2 modelleert alleen versioned private metadata, SHA-256 en een afzonderlijk immutable scanbesluit. Bestandsbytes, publieke URLs en lokale paden worden niet in PostgreSQL opgeslagen en de bestaande logo-opslag wordt niet hergebruikt.

De productieadapter voor providerbewijs is bewust nog niet geactiveerd. Voor productie zijn minimaal nodig: private object storage binnen vastgestelde datalocatie, staged upload, MIME/signaturevalidatie, limieten, malwarecontrole, quarantine, korte geautoriseerde reads, encryptie, toegangslogging, retention delete, legal hold, orphan cleanup en hersteltests. Tot die configuratie bestaat, is alleen metadataregistratie vanuit een vertrouwde toekomstige opslagketen toegestaan en faalt inhoudelijk gebruik zonder `CLEAN` scanbesluit gesloten.
