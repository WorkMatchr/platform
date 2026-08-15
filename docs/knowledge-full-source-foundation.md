# Volledige Knowledge-bronlaag — fase 1

## Doel en grens

De volledige bronlaag bewaart reproduceerbaar wat aantoonbaar in een gecontroleerd bronbestand staat. Zij vervangt de bestaande claim-, fragment-, citatie-, validatie- en publicatielaag niet. Volledige tekst uit bronnen met beperkte rechten blijft uitsluitend beschikbaar voor `INTERNAL_REVIEWER` en `PLATFORM_ADMIN`.

Fase 1 ondersteunt embedded tekst uit PDF-bestanden. OCR, embeddings, automatische claimgeneratie, Guidance-gebruik en publicatie van volledige brontekst vallen buiten deze fase.

## Immutable extractieketen

- `KnowledgeExtractionRun` legt extractor, versies, configuratie, fingerprint, pagina-aantal en resultaat vast.
- `KnowledgeSourcePage` legt per run de pagina, teksthash, status en OCR-indicatie vast.
- `KnowledgeSourceBlock` legt leesvolgorde, sectie, bloktype, exacte tekst, genormaliseerde zoektekst en hash vast.
- `KnowledgeFragmentBlock` kan een bestaand gecontroleerd fragment aanvullend koppelen aan volledige bronblokken.

Alle vier tabellen zijn databasebreed append-only. Een gewijzigde extractor of configuratie maakt een nieuwe run; bestaande runs worden nooit aangepast of verwijderd. De bestaande `KnowledgeSourceVersion` en bijbehorende claims, fragmenten en citaties worden niet gemuteerd.

## Extractor v1

`WORKMATCHR_PDFJS_EMBEDDED_TEXT` controleert eerst manifest, checksum en PDF-header. PDF.js leest vervolgens de embedded tekst pagina voor pagina. Regels worden in leesvolgorde geplaatst en deterministisch geclassificeerd als kop, alinea, lijstitem, tabel, voetnoot, bijschrift, voorbeeld of herhaalde header/footer. Herhaalde margeregels worden op basis van hun genormaliseerde inhoud gemarkeerd. OCR wordt nooit stilzwijgend uitgevoerd.

De fingerprint bevat de extractoridentiteit, configuratieversie, pagina-/blokvolgorde, bloktypen, sectiepaden en teksthashes. Een identieke extractie is idempotent. Een configuratiewijziging levert een nieuwe fingerprint en een opvolgende extraction run op.

## Interne search v1

`KnowledgeSourceBlock.searchVector` is een PostgreSQL `tsvector`, afgeleid met de Nederlandse full-textconfiguratie en voorzien van een GIN-index. Zoeken gebruikt uitsluitend de nieuwste voltooide run per bronversie en ondersteunt filters op bron, bronversie, pagina, bloktype en temporaliteit. Headers en footers krijgen een lagere rang.

Resultaten bevatten altijd broncode, brontitel, bronversie, temporaliteit, pagina, sectie, bloktype en exacte tekst. De service weigert alle toegang zonder `INTERNAL_REVIEWER` of `PLATFORM_ADMIN`.

## Veiligheidsregels

- Volledige broninhoud is geen gevalideerde actuele kennis.
- Extractie zet niets op `VALIDATED`, `APPROVED` of `PUBLISHED`.
- Bronblokken worden niet door publieke kennisroutes ontsloten.
- Bestaande claimpublicatie en broncontrole blijven ongewijzigd.
- Tabellen worden in fase 1 als kandidaatblok gemarkeerd voor menselijke review.
- Pagina’s zonder embedded tekst blijven herleidbaar als leeg; OCR volgt alleen in een afzonderlijk gecontroleerde fase.
