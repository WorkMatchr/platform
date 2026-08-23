# Kennisimport

## Platformbeheer-upload v1

De beheerroute `/platformbeheer/kennisbank/bronnen/uploaden` vormt een dunne laag boven de bestaande atomische Knowledge Library-ingest. De route is uitsluitend toegankelijk voor actieve platform-OWNER/ADMIN en ondersteunt in v1 alleen PDF tot 10 MB.

De volgorde is bewust fail-closed: controle van extensie, MIME, PDF-magic bytes en grootte; SHA-256 en deterministische extractie; een preview met voorstellen en mogelijke checksumduplicate; menselijke controle van canonieke identiteit, bronfamilie, autoriteit, temporaliteit en scope; daarna pas expliciete bevestiging. De bestaande atomische ingest schrijft bron, versie, artifact, applicability, extraction run, pagina's en bronblokken. De versie blijft `REVIEW_REQUIRED`; uploaden valideert of publiceert nooit automatisch.

De ingest legt actor, checksum, aantallen en uploadorigin vast in de append-only Knowledge-audittrail. Een identieke checksum volgt de bestaande idempotentie- en conflictregels.

De duurzame provider voor bronartifacts is Vercel Private Blob via de bestaande `KnowledgeSourceUploadStorage`-adapter. De runtime gebruikt Vercel OIDC en een expliciete store-ID; Preview en Production hebben afzonderlijke private stores en een omgevingsmismatch faalt gesloten. Uploaden is alleen beschikbaar wanneer de eigen environment volledig is gekoppeld. Lokale Vercel-filesystemopslag, publieke Blob-URLs en base64 in normale databasevelden zijn niet toegestaan.

De adapter bewaart het originele PDF-bestand onder een immutable SHA-256-key en overschrijft nooit. Een checksumduplicate wordt idempotent hergebruikt. Platformbeheer leest het origineel uitsluitend via de geautoriseerde serverroute `/platformbeheer/kennisbank/bronnen/<sourceVersionId>/origineel`; de interne Blob-locator en provider-URL worden niet aan de browser verstrekt. V1 heeft bewust geen deletepad.

Zet bronnen buiten Git in de bestaande categorieÃ«n onder `local-sources/`. Het genegeerde lokale manifest in `local-sources/knowledge/` koppelt logische broncodes aan paden relatief aan deze bronroot, bronsoorten en SHA-256-checksums. Absolute paden en broninhoud komen niet in database of auditlog. In de database staat alleen een logische `manifest:<relatief-pad>`-referentie.

De generieke pipeline ondersteunt `ai-bladen`, `arbocatalogi`, `beleidsregels`, `inspectie`, `jurisprudentie`, `knowledge`, `normen`, `rivm`, `ser` en `tno`. `legislation` is de container voor `arbowet`, `arbobesluit` en `arboregeling`; een toekomstige submap blijft generiek `LEGISLATION` totdat een specifiekere mapping wordt toegevoegd. De bronsoort wordt expliciet in manifest en importpakket vastgelegd. De database gebruikt de bestaande brede typen `AI_SHEET`, `LEGISLATION`, `REGULATION`, `ARBOCATALOGUE`, `INSPECTORATE_GUIDANCE`, `CASE_LAW`, `STANDARD`, `PROFESSIONAL_GUIDANCE`, `OTHER` en `RESEARCH`; `sourceFamily` bewaart de specifieke bronfamilie.

```bash
npm run knowledge:validate -- data/knowledge/poc/AI-01.v1.json
npm run knowledge:preview -- data/knowledge/poc/AI-01.v1.json
npm run knowledge:import -- data/knowledge/poc/AI-01.v1.json --confirm
npm run knowledge:correct -- data/knowledge/poc/AI-01.v1.json --confirm --reason="Concrete reden voor de correctie"
npm run knowledge:batch -- data/knowledge/poc/AI-03.v1.json data/knowledge/poc/AI-04.v1.json
```

## Veilige batchvoorbereiding

`knowledge:batch` valideert maximaal tien importpakketten per run en schrijft nooit naar de database. De runner hergebruikt het bestaande manifest, contract 1.1, de bron-/checksumcontrole, fragmenthashvalidatie, fingerprinting en optioneel de bestaande read-only preview (`--preview`). Er bestaat bewust geen batch-importmodus.

Stel voor lokale bronbestanden `KNOWLEDGE_SOURCE_ROOT` en `KNOWLEDGE_SOURCE_MANIFEST` in op de bestaande, genegeerde bronmap en het lokale manifest. Zonder `--preview` opent de runner geen databaseverbinding. Met `--preview` wordt uitsluitend de bestaande read-only preview per technisch geldige bron uitgevoerd.

Het rapport toont per bron claim- en risicotellingen, technische status, inhoudelijke uitzonderingen en gereedheid voor een afzonderlijke Production-preflight. Legacy 1.0, ontbrekende expliciete risico's, niet-herleidbare passages, niet-directe citaties en onveilige statussen blokkeren fail-closed. HIGH/CRITICAL-, gezondheids- en normatieve claims blijven zichtbaar voor menselijke review; de runner verlaagt nooit risico's en neemt geen publicatie- of validatiebesluiten.

Zonder `--confirm` wordt niets geschreven. Validatie controleert schema, metadata, limieten, referenties, duplicaten, temporaliteit, veilige JSON en copyrightlimieten. Preview verifieert manifest, PDF-header, checksum, bronsoort en databaseconflicten. Import is één serializable transactie; elke fout rolt alles terug. Een pakket wordt uitsluitend idempotent hergebruikt wanneer de canonieke inhoudsfingerprint overeenkomt. Daarin tellen bronidentificatie, claimtekst en -type, fragmenttekst of -hash, pagina, sectie en citatierelatie mee. Gelijke aantallen zijn nooit voldoende.

Een inhoudelijk afwijkende replay wordt fail-closed geweigerd. Het afzonderlijke `knowledge:correct`-commando is uitsluitend bedoeld voor een aantoonbaar foutieve, nog `DRAFT` en `UNVALIDATED` import van exact dezelfde broneditie en checksum. Het schrijft een nieuwe `importRevision`, koppelt die append-only aan de voorgaande revisie en maakt nieuwe conceptclaims, fragmenten en citaties. De oude revisie blijft ongewijzigd en auditbaar; actuele kennisqueries gebruiken alleen de bladrevisie. Een tweede identieke correctierun hergebruikt die revisie. Correcties van gepubliceerde of gevalideerde kennis blijven geweigerd.

Per bron worden titel, uitgever, editie, publicatie- of wijzigingsdatum, sector/toepassingsgebied, checksum, logisch bronpad, temporaliteit en metadata-status vastgelegd voor zover aantoonbaar. Als alleen een jaar bekend is, blijft het datumveld leeg; de pipeline verzint geen 1 januari. Ontbrekende of conflicterende gegevens worden niet ingevuld: `metadataStatus` blijft dan `INCOMPLETE` of `UNCERTAIN`, de onzekerheid wordt expliciet beschreven en de bron blijft fail-closed. Historische of onzekere claims krijgen een broncontrolestatus, maar vormen zonder concrete publicatie- of gebruiksuitzondering geen algemene menselijke werkvoorraad.

Iedere conceptclaim vereist een citatie naar een geïmporteerd fragment met minimaal een pagina of sectie. Alle claims blijven `DRAFT` en `UNVALIDATED`; import publiceert of keurt nooit kennis goed.

### Expliciete claimrisico's

Knowledge-importcontract `1.1` vereist voor iedere claim een expliciete `controlRisk`: `LOW`, `MEDIUM`, `HIGH` of `CRITICAL`. Dit veld wordt opgeslagen door zowel de normale import als het immutable correctiepad en maakt deel uit van de inhoudsfingerprint. Een risicowijziging is daardoor altijd een inhoudelijke wijziging en kan nooit als identieke replay worden behandeld.

Legacy-pakketten met contract `1.0` blijven valideerbaar, maar een ontbrekend risico wordt uitsluitend conservatief als `CRITICAL` genormaliseerd. Daardoor bepaalt de database-default nooit stilzwijgend het risico van een nieuwe legacy-import. Een bestaande revisie met een oudere fingerprint wordt niet automatisch herschreven; voor een inhoudelijk beoordeelde lagere classificatie is een expliciet `1.1`-correctiepakket nodig.

### Reviewed claims koppelen aan een bestaande Full-Source-versie

Een reeds geregistreerde en volledig geëxtraheerde bronversie krijgt later gecontroleerde claims via `knowledge:attach-preview` en `knowledge:attach`. Deze route maakt geen nieuwe bronversie of extractierun. Ieder contract-1.1-fragment bevat daarvoor `sourceBlockEvidence` met de bestaande `sourceVersionId`, exacte `sourceBlockId`, evidence-rol en opgeslagen blokteksthash.

De preview en transactionele attach controleren fail-closed dat ieder blok bestaat, bij exact dezelfde bronversie en een `COMPLETED` extractierun hoort, dat de blokhash gelijk is en dat de gecontroleerde passage letterlijk in het opgegeven blok staat. Er vindt tijdens de write geen fuzzy matching plaats. Claims, fragmenten, citaties en `KnowledgeFragmentBlock`-relaties worden atomair geschreven. Een identieke replay hergebruikt de attachment; hergebruikte codes met afwijkende inhoud of evidence worden geweigerd.

Deze attachmentroute ondersteunt bewust alleen topics, claims, fragmenten en citaties. Zij wijzigt nooit `KnowledgeSource`, `KnowledgeSourceVersion`, artifacts, extraction runs, pagina's of bronblokken. Bestaande 1.0/1.1-importpakketten zonder block-evidence blijven compatibel met de bestaande import- en correctieroutes, maar zijn niet geldig voor `knowledge:attach`.

PDF is in v1 het enige betrouwbare extractieformaat. `.doc` wordt alleen geïnventariseerd als `LEGACY_DOC` en `UNSUPPORTED_FOR_EXTRACTION`; het bestand wordt niet geopend of geconverteerd. De pipeline voert geen downloads, webscraping of automatische juridische beoordeling uit. Nieuwe bronnen worden toegevoegd via een manifestregel en conceptpakket, zonder nieuw Prisma-model.

## Lokaal manifest v2

Gebruik `config/knowledge-sources.example.json` als vormvoorbeeld. `logicalPath` is relatief aan `KNOWLEDGE_SOURCE_ROOT`. Toegestane `sourceKind`-waarden zijn:

- `AI_SHEET`
- `ARBO_WET`
- `ARBO_DECREE`
- `ARBO_REGULATION`
- `ARBOCATALOGUE`
- `POLICY_RULE`
- `LABOUR_INSPECTORATE_PUBLICATION`
- `TNO_PUBLICATION`
- `JURISPRUDENCE`
- `KNOWLEDGE`
- `STANDARD`
- `RIVM_PUBLICATION`
- `SER_PUBLICATION`
- `LEGISLATION` (generieke toekomstige wetgevingssubmap)

Onbekende top-level mappen worden fail-closed geweigerd. Geneste paden binnen een bekende bronmap zijn toegestaan. De mapnaam bepaalt alleen de bronfamilie; metadata, actualiteit, gezag en publiceerbaarheid worden nog steeds afzonderlijk en expliciet gevalideerd. Import blijft altijd `DRAFT` en `UNVALIDATED` en publiceert niets automatisch.

Manifest v1 met één lokale `fileName` blijft voor bestaande AI-PoC-bronnen ondersteund.
