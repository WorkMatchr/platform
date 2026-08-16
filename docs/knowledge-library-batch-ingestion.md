# Knowledge Library batch ingestion

De Knowledge Library batchfoundation inventariseert lokale bronbibliotheken vóór onboarding. Zij bouwt voort op Multi-Source voor bronidentiteit en Full-Source voor extractie; zij introduceert geen tweede import- of retrievalstraat.

## Grenzen

- `npm run knowledge:library-batch -- --root <map> --limit 100` is read-only en maakt uitsluitend een rapport.
- Maximaal 100 bestanden worden technisch geïnventariseerd; maximaal 10 bestanden kunnen per proef volledig worden geëxtraheerd met `--extract 10`.
- Alleen `READY` is later kandidaat voor onboarding. Alle andere statussen vereisen review of herstel.
- De runner schrijft niet naar een database, valideert geen inhoud en publiceert niets.
- Metadata wordt alleen afgeleid uit een gecontroleerde mapnaam of expliciet bestandskenmerk. `--metadata <json>` kan gecontroleerde metadata aanleveren zonder de heuristiek te verruimen.

## Statussen

`READY`, `NEEDS_METADATA_REVIEW`, `POSSIBLE_DUPLICATE`, `VERSION_CONFLICT`, `SOURCE_IDENTITY_UNCERTAIN` en `EXTRACTION_UNSUPPORTED` zijn fail-closed uitkomsten. Een checksumduplicaat en een gelijke bronidentiteit/versie met afwijkende inhoud worden afzonderlijk gemeld.

## Documentfamilies

`KnowledgeDocumentFamily` en `KnowledgeDocumentFamilyMember` koppelen reeds ge-onboarde, immutable bronversies. Rollen zijn `PRIMARY_GUIDELINE`, `BACKGROUND_EVIDENCE`, `SUMMARY`, `CHECKLIST`, `APPENDIX` en `TOOL`. Families en leden zijn append-only. De inventarisatie stelt alleen een familie voor wanneer rol én stabiele bestandsstam expliciet herkenbaar zijn.

## Hervatten en replay

De inventarisatie is een deterministische scan. Een afgebroken batch kan met dezelfde selectie opnieuw worden gestart. Checksums, extractiefingerprints en statussen blijven gelijk bij identieke input; er bestaat geen halfgeschreven ingesttoestand.

## Retrieval (ontwerp, nog read-only)

Latere retrieval blijft bovenop bestaande `KnowledgeSourceBlock`-search werken. Filters/ranking horen rekening te houden met `authorityStatus`, `temporalStatus`, jurisdictie, applicability, documenttype, canonieke bronfamilie, sector en evidence-/validatiestatus. Een documentfamilie mag aanvullende achtergrond of tools ophalen, maar nooit lagere autoriteit of verouderde inhoud stilzwijgend boven actuele primaire bronnen rangschikken. Er komt geen antwoordgenerator, embeddinglaag of tweede retrieval-engine bij.

## Exception-driven rapport

Het rapport toont READY, metadatareview, duplicaten, versieconflicten, extractiefouten, onzekere identiteiten, geschatte pagina's/blokken en potentiële documentfamilies. Menselijke controle blijft daarmee gericht op uitzonderingen.
