# D2B — versleutelde PostgreSQL-back-up en synthetisch herstel

Publieke technische beschrijving. Gedetailleerde infrastructuur- en productieobservaties blijven in een afzonderlijk afgeschermd lokaal dossier buiten Git en synchronisatiemappen. Dit document bevat geen verbinding, omgevingsidentiteit, toegangsroute of productiegegevens.

## Voorkeursroute en grenzen

Een PostgreSQL custom-format dump wordt rechtstreeks naar GnuPG gestreamd. De dumpclient krijgt alleen de publieke ontvangerssleutel; de hersteloperator beheert de private sleutel afzonderlijk. Geen onversleutelde dump op disk en geen wachtwoorden in procesargumenten, Git of logs. OpenPGP-integriteitsbescherming en een afzonderlijk beschermd SHA256-manifest worden vóór SQL-restore gecontroleerd. Een hash alleen bewijst geen herkomst.

De restoreproef gebruikt een nieuwe gepinde PostgreSQL 18-container zonder netwerk, gepubliceerde poorten, persistente databasevolumes of providercredentials. Decryptie wordt begrensd in RAM volledig geverifieerd vóór restore. Host/swapversleuteling blijft noodzakelijk: RAM/tmpfs is geen bewijs tegen swap of geheugendumps.

| Route | Sterkte | Nog te bewijzen vóór echte gegevens |
|---|---|---|
| PostgreSQL-dump en geïsoleerde restore | Synthetisch getest; overdraagbaar archief; expliciete sleutel- en rolgrenzen | Opslagacceptatie, onafhankelijke sleutelbewaring, volledige writerstop, echte restore en productiecutover |
| Provider-herstelbranch | Mogelijke beheerde point-in-time route | Ondersteunde toegangsafscherming inclusief overgenomen credentials, capaciteit, kosten en cleanup |

De dumpstrategie is de technische voorkeurskandidaat, geen goedkeuring voor productie-export. Een consistente dump voorkomt geen verlies van transacties die na de snapshot worden gecommit. De provider-herstelroute wordt niet opnieuw gestart binnen dit pakket.

## Reproduceerbare synthetische proef

Windows, Docker Linux-engine, GnuPG en de gepinde PostgreSQL-image zijn vereist. Geen database-URL als invoer; synthetische credentials uitsluitend in geheugen. Uitvoerbewijs gaat naar private lokale opslag, nooit naar docs/evidence.

    node scripts/test-d2b-encrypted-recovery.mjs --synthetic-only
    node scripts/test-d2b-encrypted-recovery.mjs --synthetic-only --d2c-controls
    node scripts/test-d2b-encrypted-recovery.mjs --synthetic-only --d2d-controls

De controles omvatten schema, constraints, indexes, triggers, functies, registry/checksums, owners/ACL's, RLS, aggregaten, verkeerde sleutel, corruptie, timeout, onvolledige dump, overschrijven en exacte cleanup van uitsluitend eigen resources. De D2D-variant exporteert een passphrase-beschermde synthetische sleutel en herstelt via import in een lege keyring. Dit bewijst geen onafhankelijk herstel na hostverlies.

## Beveiliging en vervolg

Alleen geautoriseerde operator en achtervang krijgen toegang. Sleutels, ontgrendeling en archieven worden gescheiden beheerd. Retentie en holds worden per run vooraf vastgesteld; geen klok mag het enige actieve herstelpunt verwijderen. Bij cleanupfout toegang beperkt houden, eigenaar waarschuwen en dezelfde resources controleren. Verwijdering op SSD is geen bewezen forensische wissing.

Echte export, restore, writers beperken, rollen/grants wijzigen en productiecutover vereisen afzonderlijk akkoord. Geen echte back-up, herstelbranch of restore is met deze publieke voorbereiding uitgevoerd. Zie het [gecombineerde runbook](d2d-d3-d4-final-production-migration-readiness.md).
