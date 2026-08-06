# Kennisimport

Zet bronnen buiten Git in `local-sources/knowledge/`. Het genegeerde lokale manifest koppelt logische broncodes aan bestandsnamen en SHA-256-checksums. Absolute paden, lokale bestandsnamen en broninhoud komen niet in database of auditlog.

```bash
npm run knowledge:validate -- data/knowledge/poc/AI-01.v1.json
npm run knowledge:preview -- data/knowledge/poc/AI-01.v1.json
npm run knowledge:import -- data/knowledge/poc/AI-01.v1.json --confirm
```

Zonder `--confirm` wordt niets geschreven. Validatie controleert schema, limieten, referenties, duplicaten, temporaliteit, veilige JSON en copyrightlimieten. Preview verifieert manifest, PDF-header en checksum. Import is één serializable transactie; elke fout rolt alles terug.

PDF is in v1 het enige extractieformaat. `.doc` wordt alleen geïnventariseerd als `LEGACY_DOC` en `UNSUPPORTED_FOR_EXTRACTION`; het bestand wordt niet geopend of geconverteerd. Nieuwe broncodes vereisen geen nieuw Prisma-model.
