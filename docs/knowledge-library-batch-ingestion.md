# Knowledge Library batch ingestion

De Knowledge Library batchfoundation inventariseert lokale bronbibliotheken vóór onboarding. Zij bouwt voort op Multi-Source voor bronidentiteit en Full-Source voor extractie; zij introduceert geen tweede import- of retrievalstraat.

## Grenzen

- `npm run knowledge:library-batch -- --root <map> --limit 100` is read-only en maakt uitsluitend een rapport.
- Maximaal 100 bestanden worden technisch geïnventariseerd; maximaal 10 bestanden kunnen per proef volledig worden geëxtraheerd met `--extract 10`.
- Alleen `READY` is later kandidaat voor onboarding. Alle andere statussen vereisen review of herstel.
- De runner schrijft niet naar een database, valideert geen inhoud en publiceert niets.
- Een mapnaam of bestandsnaam is nooit voldoende voor `READY`. Daarvoor zijn checksum-gebonden, gecontroleerde canonieke metadata vereist: broncode en -identiteit, HTTPS-URL, autoriteitsstatus, jurisdictie, toepassingsscope en versie/jaar.
- `--metadata <json>` leest een lokaal reviewmanifest met `schemaVersion: 1` en een `documents`-array. Iedere regel is gebonden aan relatief pad én SHA-256. Het manifest blijft buiten Git naast de lokale bronbibliotheek en is daardoor bij replay deterministisch herbruikbaar zonder eenmalige hardcoding in scripts.
- Een ontbrekende regel, gewijzigde checksum, ongeldige HTTPS-URL of incomplete scope blijft fail-closed en kan nooit `READY` worden.

Een manifestregel bevat minimaal het gecontroleerde relatieve pad, checksum, broncode, titel, uitgever, versie of jaar, canonieke HTTPS-URL en identiteit, autoriteits- en temporaliteitsstatus, jurisdictie en applicability. Bijvoorbeeld:

```json
{
  "schemaVersion": 1,
  "documents": [
    {
      "relativePath": "nvab/richtlijn.pdf",
      "checksum": "<sha256>",
      "sourceCode": "NVAB-RICHTLIJN",
      "title": "Gecontroleerde titel",
      "publisher": "NVAB",
      "publicationYear": 2026,
      "canonicalUrl": "https://voorbeeld.nl/canonieke-bron",
      "canonicalIdentity": "NVAB:RICHTLIJN",
      "authorityStatus": "PROFESSIONAL_REFERENCE",
      "temporalStatus": "CURRENT",
      "jurisdiction": "NL",
      "applicabilityScope": "Nederlandse arbeidsgezondheidszorg",
      "scopeCode": "GENERAL",
      "scopeEffect": "APPLIES"
    }
  ]
}
```

## Statussen

`READY`, `NEEDS_METADATA_REVIEW`, `POSSIBLE_DUPLICATE`, `VERSION_CONFLICT`, `SOURCE_IDENTITY_UNCERTAIN` en `EXTRACTION_UNSUPPORTED` zijn fail-closed uitkomsten. Een checksumduplicaat en een gelijke bronidentiteit/versie met afwijkende inhoud worden afzonderlijk gemeld.

## Documentfamilies

`KnowledgeDocumentFamily` en `KnowledgeDocumentFamilyMember` koppelen reeds ge-onboarde, immutable bronversies. Rollen zijn `PRIMARY_GUIDELINE`, `BACKGROUND_EVIDENCE`, `SUMMARY`, `CHECKLIST`, `APPENDIX` en `TOOL`. Families en leden zijn append-only. De inventarisatie stelt alleen een familie voor wanneer rol én stabiele bestandsstam expliciet herkenbaar zijn.

## Hervatten en replay

De inventarisatie is een deterministische scan. Een afgebroken batch kan met dezelfde selectie opnieuw worden gestart. Checksums, extractiefingerprints en statussen blijven gelijk bij identieke input; er bestaat geen halfgeschreven ingesttoestand.

De Production-ingest gebruikt `ingestKnowledgeLibraryDocument`. Extractie wordt volledig afgerond vóór de eerste databasewrite; onboarding, bronversie, artifact, applicability, extraction run, pagina's en blokken worden daarna in één serializable Prisma-transactie geschreven. Een extractiefout schrijft niets en iedere databasefout rolt de volledige documentingest terug. De bestaande afzonderlijke onboarding- en full-source-services hergebruiken dezelfde transactionele kern. Een volledig opgeslagen document wordt bij identieke replay zonder duplicaten hergebruikt.

Full-source tekst wordt vóór hashing en opslag uitsluitend ontdaan van PostgreSQL-onveilige `U+0000`-tekens. De extraction run registreert het aantal verwijderde NUL-bytes als waarschuwing; alle overige tekst blijft ongemoeid. Grote extracties schrijven binnen dezelfde transactie eerst de run, daarna de pagina's en vervolgens blokken in begrensde batches. De bestaande page/run-foreign keys blijven daarbij onverkort leidend.

## Retrieval (ontwerp, nog read-only)

Latere retrieval blijft bovenop bestaande `KnowledgeSourceBlock`-search werken. Filters/ranking horen rekening te houden met `authorityStatus`, `temporalStatus`, jurisdictie, applicability, documenttype, canonieke bronfamilie, sector en evidence-/validatiestatus. Een documentfamilie mag aanvullende achtergrond of tools ophalen, maar nooit lagere autoriteit of verouderde inhoud stilzwijgend boven actuele primaire bronnen rangschikken. Er komt geen antwoordgenerator, embeddinglaag of tweede retrieval-engine bij.

## Exception-driven rapport

Het rapport toont READY, metadatareview, duplicaten, versieconflicten, extractiefouten, onzekere identiteiten, geschatte pagina's/blokken en potentiële documentfamilies. Menselijke controle blijft daarmee gericht op uitzonderingen.
