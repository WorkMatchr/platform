# Commerciële start op 1 januari 2027

**Operationeel besluit op 8 november 2026: NO-GO voor omschakeling.** De lokale proef bewijst dat een nieuw klantdomein leeg kan beginnen met gecontroleerde referentie-inhoud. Voor productie ontbreken een actueel hersteld checkpoint, onafhankelijk bewijs dat alle schrijvers gesloten kunnen worden, financiële aansluiting bij beide providers en acceptatie op de definitieve releasecommit. Platformbeheer beheert dit dossier. De leidende V3-sessie beheert de softwareacceptatie.

## 1. Productiepeiling

De peiling gebruikte de Vercel-productiealias, uitsluitend namen en doelomgevingen van variabelen, Neon-catalogusmetadata, geaggregeerde SELECTs, publieke HTTP HEAD/DNS en GitHub Actions. De private peiling bevat de aantallen, identiteiten en tijdstippen. De afzonderlijke queries zijn geen simultaan checkpoint.

| Onderdeel | Vastgesteld | Voor omschakeling bewijzen |
| --- | --- | --- |
| Hosting | Acht projecten zichtbaar in het team. De repositoryfilter geeft één gekoppeld project. De productiealias staat READY op main `ecf2f578c31f654298d4eaf071fc16b3022d5dd1`. Het laatste Preview-resultaat van dit project stond op ERROR. | Verifieer de exacte definitieve SHA, het commerciële doel en afzonderlijke acceptatietargets. Inventariseer oude deployments, aliassen, forwarders, directe clients en jobs als mogelijke schrijvers. |
| Domeinen | HEAD op www.workmatchr.nl gaf 200. De apex en beide publieke vkam-adviseur.nl-varianten gaven 308 naar de HTTPS-www-homepage. | Herhaal voor registratie, account en callbackroutes op het goedgekeurde doel. Pin de vorige READY-deployment. |
| Database | Neon PostgreSQL 18.6. 85 geslaagde registraties, nul onafgemaakte. Alle 85 checksums verklaard tegen repositorybytes met LF of CRLF. De onderzochte main bevat 95 migraties; het verschil bestaat uit tien bestanden. Productie heeft 457 geldige foreign keys. | Nieuwe lege database, apart beschermd archief en eigen rechten. Verifieer runtime-identiteit van app én workers en onafhankelijk alle Preview-overrides. Gebruik voor de eindkandidaat een nieuw hashmanifest. |
| Auth | Better Auth beheert accounts en sessies. Production heeft de verwachte namen voor oorsprong en secret. Code gebruikt standaard uitgeschakeld ingelogd blijven. | Nieuwe operator met minimaal recht, MFA en gecontroleerde achtervang. Controleer een oude sessie op alle nieuwe toegangspunten en behoud uitsluitend de afzonderlijk goedgekeurde archieftoegang. |
| Mail | Resend-bindingen zijn als Production-namen aanwezig. De inventaris van 1 november verifieerde workmatchr.nl, SPF en DKIM. De publieke TXT-records voor de vastgelegde DKIM-, verzend- en DMARC-hosts zijn op 8 november aanwezig. | Huidige afzender, provideraccount, domeinscope en ontvanger bevestigen. Daarna afzonderlijk geautoriseerde ontvangstproef met aflever- én ontvangstbewijs. |
| Mollie en Jortt | De omgevingsnamen en bestaande Mollie-webhookroute zijn aangetroffen. WorkMatchr heeft financiële historie en externe verwijzingen. De P1.4-peiling van 6 november documenteert echte providerbetalingen uit de ontwikkelperiode. | Live-/testprofiel, mandaten, incassoplanning, eventuele onderweg zijnde transacties, administratie, aflettering en nummerreeks extern bevestigen. Deze peiling kon geen afzonderlijke gekoppelde providersessie gebruiken. |
| Scheduler | Vercel plant finance om 03:00 UTC. GitHub plant Marketplace elke 15 minuten. De laatste geplande dispatchjob slaagde. De recente financiële runhistorie bevat succesvolle runs. De feitelijke GitHub-starttijden vertonen een gat van meerdere uren. | Onafhankelijke hartslag, ouderdom van achterstand, aangewezen ontvanger en ontvangstbewijs. Een geslaagde dispatch is geen telling van verwerkte outboxrecords. Onderzoek ook idle workers, retries en alle onderhoudsroutes. |
| Herstel | Een oudere handmatige Neon-snapshot, geen automatisch snapshotschema, zes uur projectherstelgeschiedenis bij de peiling. De bestaande D2B-proef toont synthetisch versleuteld herstel. | Tijdstip, volledigheid, onafhankelijke sleuteltoegang en herstel van een nieuwe productiecheckpoint op een volledig geïsoleerd doel. |

De private lijst bevat uitsluitend variabelenamen. Aanwezigheid is geen bewijs voor database-identiteit, API-modus, verleende rechten of de waarde van een featuregate. De financiële, contact-, Academy- en Compliance-gates vergen afzonderlijke vrijgave.

## 2. Scheiding van gegevens

**Gebruik een nieuw leeg doel.** Houd de historische omgeving afgeschermd beschikbaar voor bevoegde inzage, financiële aansluiting en toepasselijke bewaartermijnen. De aanduiding testorganisatie bepaalt de behandeling van een echt betaald bedrag of uitgereikte factuur niet. Gebruik geen algemene delete-, truncate-, reseed- of replayopdracht op de historische administratie.

| Gegevens in de historische omgeving | Beslissing voor het nieuwe doel | Bewijs bij overdracht |
| --- | --- | --- |
| User, Account, Session, Verification, TwoFactor, lidmaatschappen, adminuitnodigingen | Nieuwe identiteiten en afzonderlijk geautoriseerde beheerders. Geen tokens, sessies, resetlinks of oude rechten overnemen. | Nul klanten en oude memberships/sessies, nieuwe beheerlogin apart gecontroleerd. |
| Organisaties, locaties, sector-/specialismekeuzes en logo’s | Organisatierijen isoleren. Alleen de goedgekeurde platformidentiteit als nieuwe configuratie inrichten. | Nul klantorganisaties; tellers onderscheiden platformorganisatie en systeembeheerder. |
| Dienstverleners, professionals, werkgebieden, verzekeringen, bewijsstukken, verklaringen, kwalificaties en dossierbesluiten | Als historische samenhang bewaren. Geen profielen, beoordelingen, projecties of toestemming omzetten naar commerciële autorisatie. | Nul profielen, bestaande uitnodigingslinks falen gesloten; geen testdossier als grondslag. |
| Intake, adviesdossier, Request, Assignment, matching, uitnodiging, deelname, offerte, berichten en gunning | Historie isoleren inclusief snapshots en audit. | Nul open én afgeronde testopdrachten, offertes, gunningen en berichten. |
| Credits, wallets, reserveringen, ledger en kortingsgebruik | Geen testbalans/initiële boeking. Archief bewaart de keten met aankoop, organisatie, deelname, gunning en tegenboeking. | Nul wallets, mutaties en reserveringen in het klantdomein; eerste saldo ontstaat via het vrijgegeven proces. |
| Abonnement, incasso, betaling, refund, factuur, creditfactuur, teller, factuurregels en Jortt-sync | Historische administratie en externe identiteit samen houden. Nummerbeheer expliciet overdragen. | Bevestigd eindregister, nul testabonnementen, meegenomen testopenposten en herbruikbare oude mandaten. |
| Academy-profiel, inschrijving, voortgang, poging, certificaat, reminder en consent | Isoleren. Oude certificaatverificatie en eventuele bewaarplicht expliciet besluiten. | Nul deelnemersrecords. Historisch identificatienummer levert nooit een nieuw certificaat op. |
| Compliance-runs, antwoorden, resultaten, acties | Gescheiden bewaren met gebruikte framework- en rapportversie. | Nul historische klantbeoordelingen in het doel. Oude resultaten blijven reproduceerbaar in het archief. |
| Contact, Marketplace-notificaties, outbox, leases, scheduler-, security- en auditrecords | Oude queue uitsluitend gecontroleerd afsluiten/reconcilieren. Bewaar bewijs met beperkte toegang; kopieer geen retry- of deduplicatiestatus naar een nieuwe klant. | Nul oude jobs én geen leveringen vanuit het archief. Onzekere provideracceptatie blijft een handmatig incident. |
| Uploads, Blob-objecten, bronartefacten, PDF’s en mailboxkopieën | Alleen goedgekeurde inhoudsassets per digest en licentie opnemen. Houd klantbestanden en financiële PDF’s in het passende archief. | Afzonderlijke private opslagbinding, oude URL’s ontoegankelijk voor nieuwe tenants. Controleer ook verweesde objecten, ACL, back-ups en providerretentie. |

Inventariseer FK’s in beide richtingen en per kolom, inclusief samengestelde sleutels, self-references, verplichte aanmakers, polymorfe referenties en JSON. De catalogus toont ruim honderd directe tabelparen naar User of Organization. Bestandskeys, callbacks, provider-ID’s en inhoud in JSON zijn daarnaast afzonderlijke bewijspunten. Een ontbrekende tabel op schema 85 betekent *niet geïnstalleerd*. Dat is geen nulmeting van leerdata elders.

## 3. Positieve toelatingslijst

Per toegelaten release-item bevat het besloten manifest de bron-SHA, natuurlijke sleutel, versie, vaste inhoudsdigest, afhankelijkheden, verantwoordelijke, gebruiksgrond en (voor content) review en rechten. Leg het manifest vóór de import vast. Alles buiten het manifest blijft achter; ontbrekende bewijsstukken blokkeren het betreffende item. Gegevens uit een schoner ogende testorganisatie zijn geen referentiedata.

| Toelaatbare categorie | Afhankelijkheden en voorwaarden |
| --- | --- |
| Sectoren, diensten, specialismen, kwalificatie-/regiotaxonomieën | Versies, termen, parent-child-relatie en canonieke mappings als één gecontroleerde set. Organisatieselecties, ervaringen en persoonsbewijzen uitsluiten. |
| Producten, prijzen en Marketplace-regelset | Vastgestelde productcodes, versies, bedragen, btw-basis, geldigheid en ranges. Een regelset kan aan een testbeheerder gekoppeld zijn; deze afhankelijkheid is daadwerkelijk aangetroffen. Formele heruitgifte op een bevoegde identiteit vereist besluit en nieuw bewijs. |
| Academy | Cursus en versie, hoofdstuk, blok, vragen, opties, toetsversie en vraagvolgorde. Valideer licentie, JSON, asset, checksum en status. Scheid vragenbank van pogingen/certificaten. Het actuele productieschema bevat geen cursus-, deelnemer- of certificaattabel. Wijs de goedgekeurde contentbron buiten deze productiebranch aan. |
| Compliance en Knowledge | Behoud goedgekeurde frameworkidentiteit, module, vragen/opties, regels en gereviewde bronrevisies met directe ondersteuning. Auteur-/reviewerverwijzingen komen voor. Historisch besluit nooit opnieuw toeschrijven. Onvoldoende bewijs houdt een versie in concept. |
| Publicatie- en technische configuratie | Vastgezette migraties, referentievraagsets, statische codes en uitvoerbare configuratie uitsluitend uit gereviewde bestanden. Verifieer grants, triggers, functies, extensions, sleutels, routes en externe bindings per doel. Een gepubliceerd label alleen is onvoldoende. |
| Systeembeheer | Nieuw aantoonbaar bevoegd beheer met vierogencontrole op bootstrap en rechten. Bewaar toewijzingsbewijs privé. Geen export van accounts, credentials, providersecret of toestemmingen van gebruikers. |

Herhaal de manifestvergelijking na de definitieve integratie. Een testcatalogus die de peiling passeert verleent geen juridische of commerciële publicatierechten.

## 4. Financieel omschakelplan en providers

1. **Financieel beheer** maakt een besloten manifest per externe betaling en abonnement. Bind providerprofiel, live/testmodus, geverifieerd bedrag en valuta, unieke lokale aankoop/verlengen, bronfactuur en eventuele credit, ledger, settlement, kosten, refund, Jortt-document en afzonderlijke betaalboeking. Bewaar verschillen en eigenaar. P1.4 bevat reeds geconstateerde hiaten; gebruik de bestaande herstelprocedure van de financiële kandidaat.
2. **Mollie-beheer** leest de actuele contracten, mandate-statussen, eerstvolgende datums en reeds aangemaakte SEPA-betalingen op het juiste profiel. Controleer ook providerbetalingen zonder lokale rij. Documenteer welke nog kunnen incasseren of later een webhook/retry/chargeback opleveren. Testclassificatie in WorkMatchr bewijst geen testmodus bij Mollie. Geen annulering, refund of nieuwe incasso krachtens dit dossier.
3. **Platformbeheer** scheidt routes en rechten van beide administraties. Een oud event mag uitsluitend in historische reconciliatie landen. Verifieer providerprofiel en oorspronkelijke betalingsbinding server-side; onbekende events gaan in quarantaine. Bewijs met een dubbele, vertraagde en onbekende synthetische callback dat geen nieuw recht, factuur, credit of afboeking ontstaat. Deze geïntegreerde financiële test valt bij de leidende kandidaat.
4. **Boekhouding** controleert bij Jortt of ieder echt document bestaat, bedragen en btw kloppen en de betaling precies eenmaal is afgeletterd. Lokale SYNCED is onvoldoende. Stem failed/ambigue pogingen en verschillen eerst af. Een creditfactuur, refund of opzegging vergt per handeling apart akkoord.
5. **Boekhouding en tweede beoordelaar** leggen laatste uitgegeven nummer, gereserveerde nummers en volgende geldige reeks vast. De applicatie bewaakt uniciteit in één database. Nieuwe database en oude administratie samen vereisen een door de boekhouder goedgekeurde reeks zonder dubbelen. Test de nummerovergang met synthetische gegevens; kopieer geen testfacturen om een teller te vullen.
6. **Afsluitbewijs** is nul commerciële testopenposten, testcredits, actieve testabonnementen en actieve testmandaten in de nieuwe keten én volledige afhandeling of afscherming van de oude providercontracten. Een lege database beëindigt geen externe incasso. Financiële gegevens en bewijs blijven gedurende de toepasselijke bewaartermijn toegankelijk. Facturen worden doorgaans zeven jaar bewaard; specifieke transacties vallen onder tien jaar. [Belastingdienst – facturen bewaren](https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/zakelijk/btw/administratie_bijhouden/facturen_maken/uw_facturen_bewaren)

## 5. Checkpoint, omschakeling en terugkeer

Volg het [database-upgraderunbook](../database-upgrade-preparation.md) en de [D2B-herstelprocedure](../d2b-postgresql-backup-recovery-decision.md). Platformbeheer en een onafhankelijke hersteloperator tekenen het writer- en bevoegdhedenmanifest af. Controleer naast Vercel-aliassen alle oude deployments, directe SQL-clients, cron, outbox, webhookingress en beheerprocessen. Onbekende schrijver of onzekere delivery stopt de omschakeling.

- **Vóór het venster:** autoriseer afzonderlijk één actuele versleutelde checkpoint en proefherstel in een netwerkgeïsoleerd doel. Bind bron, tijd, schema, rollen, rechten, integriteit, factuur-/periodetellingen, ledger en historie. Verifieer sleutelherstel door de tweede operator en leg gemeten herstelduur en haalbaar gegevensverlies vast. Zes uur historie is geen gemeten RTO.
- **In het goedgekeurde venster:** sluit ingress en writers, bewijs de pauze onafhankelijk, neem de afgesproken laatste checkpoint. Registreer externe events buiten het gepauzeerde doel. Houd oude deployments en consumers afgeschermd. Bouw het nieuwe doel uit het goedgekeurde schema en manifest; test nulstanden, hashes, FK’s, assets, toegangsrechten en externe isolatie. Iedere afwijking stopt vóór routewisseling.
- **Heropening:** eerst read-only smokechecks en beheer, daarna geautoriseerde registratie, vervolgens afzonderlijk financiële ingang en workers. Leg per stap begin-/eindtijd, verantwoordelijke, gates, doelidentiteit en bewijs vast. Bevestig dat uitsluitend de aangewezen administratie een provider-event kan afhandelen en een replay geen dubbel financieel gevolg heeft.
- **Rollback vóór de eerste nieuwe write:** na bewijs van nul mutaties kan de operator op apart akkoord de vastgezette oude READY-app en bijbehorende schema-/providerbinding herstellen. Vergelijk externe gebeurtenissen uit het venster vóór heropening.
- **Na registratie of de eerste echte betaling:** stop nieuwe verwerking en behoud beide administraties. Reconcilieer elk event, nummer, bedrag, recht, outboxbericht en reeds door de provider geaccepteerde actie. Geen alias terugzetten op een oud schema, database terugspoelen, nummer hergebruiken of financiële replay zonder gezamenlijk herstelbesluit. Kies gericht forward-herstel waar een provideractie onomkeerbaar is.

## 6. Dry-run en grenzen van het bewijs

Voer in de eigen worktree `python ops/clean-start/simulate.py` uit met een lokaal aanwezige postgres:18-image. De tool accepteert geen doel-URL. Hij bindt geen poorten of hostmappen, gebruikt een eigen netwerkloze container en ruimt uitsluitend die container en zijn tijdelijke opslag op. De schemahash is vastgezet op de 95 migratiebestanden van de gemeten main. Er wordt geen productie-export ingelezen.

De proef bouwt een leeg schema en twee synthetische databases. De historische fixture bevat een professionele gebruiker, actieve sessie, organisatie, actief abonnement, 25 testcredits, een gepubliceerde opdracht met revisie en historie, en een wachtend bericht. Het nieuwe doel bouwt de toegelaten inhoud opnieuw uit een vast manifest. Een extra onbeoordeelde cursus in de bron blijft achter.

| Controle | Uitkomst op 8 november |
| --- | --- |
| Schema en referentiële integriteit | PASS. 95 schemabestanden, 510 foreign keys, nul ongevalideerde relaties. |
| Lege klantadministratie | PASS. 29 operationele tabellen afzonderlijk op nul. Overige tabellen buiten de referentieset zijn rij-voor-rij via geordende hashes aan het schone bootstrapresultaat getoetst. |
| Inhoudsbehoud | PASS. 15 tabeldigests voor sector-/diensttaxonomie, cursus/versie, les, toets/versie, vraag/opties, toetskoppeling en Compliance-framework/module. Bootstrap-specialismen en mappings apart met de lege basis vergeleken. |
| Onbekende afhankelijkheid | PASS. Een toegevoegde FK van cursus naar gebruiker in de historische fixture leidde tot BLOCKED in de controle. Geen afhankelijkheid verwijderd om de proef te laten slagen. |
| Productiebeveiliging | De proef test inhoudsselectie en nulstanden. Werkelijk providerverkeer, publicatierechten, fysieke assets, onafhankelijke productiebackup, archief-ACL’s, runtimebindingen en een volledige productieschrijfpauze blijven afzonderlijke acceptaties. |

## 7. Kalender, nazorg en beslismatrix

Alle dagen zijn kalenderdagen in Europe/Amsterdam. Plan een benoemde bevoegde bezetting voor de feestdagen.

| Moment | Verantwoordelijke en aftekenbaar resultaat |
| --- | --- |
| T−14 · 18 december | Platformbeheer controleert aliassen, schrijvers en isolatie. Hersteloperator levert vers checkpoint- en restorebewijs met RPO/RTO. Financiën sluit Mollie en Jortt aan en wijst afwijkingen toe. |
| T−7 · 25 december | Releaseverantwoordelijke bevriest integratie-SHA, migratiehashes, asset- en inhoudsmanifest. Finance, privacy en inhoudseigenaren besluiten over hun blokkades. Onbezette kritieke rol of onbekende afhankelijkheid verschuift het venster. |
| T−1 · 31 december | Onafhankelijke controle van nieuwe doelidentiteit, lege klantketen, geheime bindings via veilige beheerroute, geselecteerde financiële reeks, hersteltoegang, echte alarmontvanger en gesloten gates. Leg uiterste terugkeermoment vast. |
| T · 1 januari | PO geeft schriftelijk GO voor uitsluitend afgesproken stappen. Operators volgen het venster hierboven. Eerste echte registratie en betaling alleen op afzonderlijk akkoord. Financieel beheer sluit provider, klant-PDF, beheer, ledger en Jortt-document plus betaling volledig aan vóór opschaling. |
| D+1–2 · 2–3 januari | Dagelijks per ploeg controle op 5xx, oudste webhook/outbox, daadwerkelijke cronstart, sessiefouten, incasso zonder registratie en dubbele factuur. Ontvangst en behandelaar registreren. |
| D+3–6 · 4–7 januari | Elke dag aansluiting op settlement, refund, btw, abonnementsperiode, openstaande posten en aflettering. Achterstallige of onzekere events escaleren naar platformbeheer/boekhouding. Herhaal archiefafscherming en nieuwe-doelbackupcontrole. |
| D+7 · 8 januari | PO, operations en financiën beoordelen alle open incidenten, overdracht aan regulier beheer, privacyretentie en archieftoegang. Bij een onverklaarde financiële afwijking blijft de betreffende betaalroute gesloten. |

| Poort | Advies | Vereist sluitbewijs |
| --- | --- | --- |
| Ontwerp en lokale clean-start | **GO voor onafhankelijke beoordeling** | Bewijs bewaren; op bevroren eindschema manifestverschillen beoordelen en proef herhalen. |
| Archief en herstel | **NO-GO** | Actuele checkpoint geïsoleerd hersteld, onafhankelijke rechten/sleutel en metingen. |
| Productieomschakeling | **NO-GO** | Alle schrijvers aangetoond stil, uniek doel, operator en tweede beoordelaar beschikbaar; goedgekeurde bewaartermijnen en data-/assetmanifest. |
| Financiën, e-mail en incidentopvolging | **NO-GO** | Mollie/Jortt providerbewijs en nummerbeheer, veilige oude callbacks, bewezen afzender/ontvangst, onafhankelijke watchdog plus ontvangst en opvolging. |
| Commerciële livegang | **NO-GO** | Technisch akkoord van de leidende sessie inclusief financiële reparaties en expliciet PO-besluit voor migratie, publicatie en afzonderlijke provideracceptatie. |

**Eerstvolgende handeling:** financieel beheer sluit de reeds geïdentificeerde echte incasso’s en lokale Jortt-afwijkingen privé aan op Mollie en Jortt. Tegelijk kan de hersteloperator de éénmalige checkpoint-/restoreautorisatie indienen. Beide bewijzen horen bij het T−14-dossier; een verwachte incasso vóór 18 december vereist eerdere beoordeling.
