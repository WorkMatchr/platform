# D2C/D3 — operatorvoorwaarden en gesloten herstelroute

Publieke, omgevingsneutrale beschrijving. Alle actuele host-, project-, branch-, database-, rol-, deployment- en toegangsgegevens worden uitsluitend in een afgeschermd operatorplan buiten Git bewaard. Geen productietoegang wordt door deze documentatie verleend.

## Twee afzonderlijk gereviewde documenten

- Kopieer operator-plan.example.json naar goedgekeurde private opslag en vul uitsluitend na afzonderlijk akkoord de scope, doelidentiteit, run-ID, maximaal vijftien minuten geldig uitvoeringsvenster en alle bewijsvoorwaarden in.
- Een bevoegde reviewer legt dezelfde doelidentiteit onafhankelijk vast in een afzonderlijk targetbeleid volgens target-policy.example.json. Dat bestand staat buiten Git en synchronisatiemappen en is niet hetzelfde bestand als het uitvoeringsplan. Controleer host/project/branch via onafhankelijk providerbewijs; de database-identiteitsquery bewijst niet zelfstandig de providerbranch.
- De publieke voorbeelden bevatten null/false en zijn niet uitvoerbaar. Geen ingebouwde productiehost, credentialfallback of automatische targetselectie. Het lokale beleid is een operatorcontrole, geen vervanging van OS-toegangsbeveiliging of menselijke toestemming.

Beide documenten hebben beperkte OS-rechten. Bewaar credentials afzonderlijk; plaats geen wachtwoord of verbinding in deze JSON-documenten. De dumpclient gebruikt een veilig verstrekt passfile, TLS verify-full en read-only transacties. De scriptuitvoer bevat geen ruwe subprocessfouten.

## Default: uitsluitend offline plan

    node scripts/d2c-archive-stage.mjs backup ops/recovery/operator-plan.example.json
    node scripts/d2c-archive-stage.mjs restore ops/recovery/operator-plan.example.json

Latere echte uitvoering is alleen toegestaan na de G1/G2-voorwaarden uit het gecombineerde runbook. Syntax ter review, nu niet uitvoeren:

    node scripts/d2c-archive-stage.mjs backup <private-plan.json> --execute <absolute-private-target-policy.json>
    node scripts/d2c-archive-stage.mjs restore <private-plan.json> --execute <absolute-private-target-policy.json>

De runner vereist alle gates, exact overeenkomende doelvelden, een gepinde client/target met juiste runlabel, geen hostpoorten, tmpfs en bij restore geen netwerk. Zij weigert overschrijven, een niet-lege target en een ontbrekende of verlopen goedkeuring. De back-uprol moet beperkte bevoegdheden hebben; de herstelowner wordt exact vanuit het gereviewde lokale beleid gebruikt. loaded:true is geen integriteitsacceptatie.

## Preflight en privileges

ops/recovery/d2c-preflight.sql is read-only met statement- en locktimeouts. Zij verzamelt registry/checksums en integriteitsaggregaten, geen rijpayloads. Resultaten zijn operationeel vertrouwelijk en blijven lokaal. De offline comparator vergelijkt met het afzonderlijke doelbeleid en de repositorymigraties:

    node scripts/audit-d2c-preflight.mjs <private-read-only-evidence.json> <absolute-private-target-policy.json>

De comparator controleert de gereviewde 85→93-keten. Writerdrain, leases en identiteit moeten opnieuw in het uitvoeringsvenster worden bewezen. Nooit migrate resolve, reset of handmatige registry-aanpassingen gebruiken om een afwijking te verbergen.

prepare-backup-role.sql is een afzonderlijk te autoriseren voorstel, standaard gesloten. Beperkte CONNECT/USAGE/SELECT, zonder superuser/createdb/createrole/replication/bypassrls. RLS, foreign tables, large objects en SECURITY DEFINER vereisen afzonderlijke review. Geen productieprivileges zijn door deze voorbereiding gewijzigd.

## Acceptatie

De Windows-uitvoerder gebruikt PowerShell 7 en `/usr/bin/gpg` in de WSL-distributie Ubuntu. Plaats de publieke sleutelring in een afgeschermde directory onder `/dev/shm` en vergelijk de fingerprint met het private sleutelregister. Het optionele `archiveRoot` in het operatorplan kiest een lokale submap onder `%LOCALAPPDATA%\WorkMatchr` op C:. Maak daar vooraf de afgeschermde runmap aan. Zet in het afzonderlijk gereviewde doelbeleid de Windows-volume-GUID (`volumeId`) en het NTFS-volumeserienummer (`volumeSerial`) van de kaart. Deze gegevens horen buiten Git.

De uitvoerder voltooit GPG lokaal, controleert het kaartvolume en de maprechten en leest de kopie terug. Alleen ciphertext gaat naar de kaart. Een onderbreking kan een ciphertextbestand met de extensie `.partial` achterlaten. Een volgende poging weigert dezelfde naam. Het lokale succesmanifest wordt pas na verificatie van de definitieve kaartkopie aangemaakt. Bewaar het vertrouwde manifest afzonderlijk voor herstel. Bij een onderbreking vergelijkt de operator eerst het resterende lokale archief, de kaart en het manifest voordat een nieuwe handeling wordt toegestaan.

Voor een onafhankelijke sleutelproef bewaart de primaire beheerder een versleutelde export van de private decryptiesleutel op medium A. De achtervang bewaart een tweede, afzonderlijk versleutelde export op medium B op een andere afgesloten locatie. Bewaar de twee ontgrendelgegevens afzonderlijk van de media en de archiefkaart. Controleer per beheerder op een schoon herstelapparaat met een lege tijdelijke sleutelring de fingerprint, GPG-integriteit en de verwachte inhoudshash van hetzelfde synthetische archief. Registreer alleen datum, beheerrol en resultaat. Twee imports op dezelfde laptop bewijzen de technische kopieën. Fysieke overdracht en onafhankelijk herstel bij laptopuitval vereisen afzonderlijk bewijs.

Synthetische tests bewijzen de bouwstenen, geen productieschrijfpauze of echte restore. Een productierun blijft NO-GO zolang onafhankelijke sleutelbewaring, hostacceptatie, operatorbevoegdheden, writerstop en terugschakeling niet zijn bewezen en goedgekeurd.
