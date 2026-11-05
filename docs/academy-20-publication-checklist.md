# Academy 2.0 — publicatievoorbereiding en releasechecklist

Datum: 5 november 2026. Status: **Draft-review; productiepublicatie NO-GO**.

## Afbakening en bron

Start: `c7e71db1f2850fbee50757b57c84ccf2607e6762`, 274 gewijzigde bestanden. Actuele main `a315db8c7738b8862a92d9f8517b0315e3b14d1f` is zonder conflict in `codex/lms-20-platform-release` geïntegreerd. De bestaande contentwerkmap met niet-gecommitteerde wijzigingen is onaangeraakt. De review gebruikt een eigen worktree en synthetische lokale PostgreSQL 18-database.

Product Owner-besluit: geen video. Ondersteund zijn tekst, afbeeldingen, kennisvragen, eindtoetsen en certificaten. Videotypen ontbreken in de editor en worden server-side geweigerd; MP4/WebM/VTT-uploads worden geweigerd. Geen streaming- of ondertitelingsvoorziening vereist. Historische migraties, inclusief het ongebruikte VIDEO-enum, zijn niet herschreven.

## Gerichte correcties

- Een nieuwe examenspoging selecteert uitsluitend de gepubliceerde examenversie binnen de ingeschreven cursusversie. De integrale historische cursusproef reproduceerde dat de ongesorteerde selectie uit PUBLISHED/RETIRED soms v1.0 koos na publicatie van v1.1; de database weigerde dit terecht. Historische poging-/resultaatlezers blijven ongewijzigd. De echte cursusproef controleert nu expliciet de gekozen gepubliceerde versie.

- Het opgeslagen `courseVersion` wordt meegelezen en aan de PDF-renderer doorgegeven bij eerste certificaatverzending en expliciete herverzending. Dit voorkomt een fout bij `ACADEMY-CERT-2.0`; de proef gebruikt een mocktransport.
- De shellsnapshot volgt de al geïmplementeerde Academy-startlink `/platformbeheer/academy/cursussen` in plaats van `/vragen`. Geen stylingwijziging.
- De uitsluitend lokale WP17-acceptatiepreflight vergelijkt de volledige actuele worktreeketen, niet het verouderde vaste aantal 95. Exacte migratienamen, checksums, lokale database-identiteit en gesloten gates blijven vereist. De PostgreSQL-harness verifieert dit tegen 109 werkelijk uitgevoerde migraties.
- De historische D2C-offlinefixture bevat expliciet de oorspronkelijke 93 migratienamen. Nieuwe Academy-migraties vervuilen zo niet het bewijs voor de oude 85+8-keten. De contactharness gebruikt dezelfde vaste historische namen voor baseline-85 en de complete worktree voor actuele-ketenmodus. De synthetische rollentest vergelijkt het expliciet doorgegeven actuele migratieaantal, ook na restore. De werkelijke productiepreflight en de gepinde externe WP17B-provisioning zijn niet aangepast of versoepeld.

## Samenhang en migraties

| Afhankelijkheid | Behoud / vrijgavevoorwaarde |
|---|---|
| WP15 | Bestaande finance, credits en outbox worden hergebruikt. Provider-, fiscale, juridische en commerciële vrijgave blijven apart. |
| WP16 | Historische vraag-/resultaatbescherming en upgradecontroles blijven in de bestaande migratieharness. Geen herstel- of migratieautorisatie overgenomen. |
| WP17 | Preview-isolatie, rollen/TLS-controles en gesloten gates blijven leidend. Een Preview-blokkade mag niet worden omzeild. |
| F3/F4/Advieswijzer | Geen wijziging aan hun vraagsets, opslag of beslisregels; de volledige regressierun omvat deze onderdelen. F4 blijft uit. |
| Certificaatontwerper PR #92 | Afzonderlijke ontwikkeling; geen overname van de ontwerper. Dezelfde gerichte cursusversiecorrectie bij later integreren vergelijken, niet dubbel implementeren. |
| Juridische PR #64 | Onaangeroerd; Academy-conceptvoorwaarden zijn geen juridische publicatiegoedkeuring. |

Keten: **95 main + 14 additieve Academy-migraties = 109**. Namen, Git-checksums en Windows-artifactchecksums staan in `lms-20-migration-manifest.json`. Geen nieuwe migratie in deze afronding. Alle 95 main-bestanden moeten inhoudelijk identiek blijven. Eerder bewezen main-95 → 109 wordt behouden; de huidige schone keten en de herhaalde officiële deploy zijn opnieuw getest. Productiemigraties: **NOT EXECUTED**. De oude productiestand van 85 is uitsluitend historisch dossierbewijs, geen nieuwe productieobservatie.

## Browser- en toegankelijkheidsbewijs

Nieuw uitgevoerd met een echte Better Auth-sessie van een synthetische platformbeheerder:

- Cursusoverzicht en bestaande conceptversie geopend; alleen Tekst/Afbeelding beschikbaar.
- PNG via de echte uploadcontrol verzonden: HTTP 200 en melding `Bestand veilig opgeslagen`.
- Tekstles gewijzigd, concept opgeslagen, pagina herladen: tekst en mediapad behouden.
- Preview toont tekst en daadwerkelijk geladen afbeelding met tekstalternatief (`complete` en positieve `naturalWidth`).
- Mobiele breedte 390 px: documentbreedte 375 px, geen horizontale documentoverflow. Toetsenbord-Tab bereikt de volgende link met zichtbare `solid` focusoutline.

De browserbeveiliging stopte daarna de bediening omdat de actieve Windows-browser-URL niet betrouwbaar kon worden vastgesteld. Geen omweg gebruikt. **Echte 200%-zoom en zelfstandige schermlezerbediening blijven OPEN.** Toegankelijkheidsboom/focus is geen vervanging voor een schermlezerproef. De eerder gedownloade/gerenderde PDF, decodering van QR, intrekking en lokale verificatie blijven historisch bewijs; nieuwe regressies controleren generatie en versiecontract. Volledige PDF/UA-conformiteit is niet bewezen.

De eerdere volledige cursistflow (hoofdstukcheck, voortgang na herladen, gezakt/herkansing/geslaagd, certificaat, intrekking en uitloggen) staat in `lms-20-platform-release.md`. Deze is niet als opnieuw uitgevoerd aangemerkt. De huidige echte PostgreSQL-authoringproef controleert dezelfde serveracties, eigenaarsisolatie en gelijktijdige examenvastlegging.

De afzonderlijke WP16-dump/restoretak van de bestaande integriteitsharness is expliciet uitsluitend voor GitHub Actions met een servicecontainer-ID toegestaan. Een lokale poging werd vóór dump/restore door die guard geweigerd; de guard is niet omzeild en `GITHUB_ACTIONS` is niet nagebootst. De lokale eindrun gebruikt de normale migratie-/rechtenmodus. Het exacte-head CI-resultaat moet het aanvullende restorebewijs leveren.

## Definitieve acceptatievoorwaarden

- [x] Geen videovereisten of video-aanbod in deze release.
- [x] Cursus/hoofdstuk/tekst/afbeelding beheer en persistente preview synthetisch getest.
- [x] Gesloten gate vóór beschermd gegevensgebruik; bestaande authenticatie behouden.
- [x] Open/onbetaalde order geeft geen cursusrechten; betaalstatusherhaling is idempotent (synthetische provider).
- [x] Gratis toegang uitsluitend via expliciete prijsversie en bestaande gratis sandboxflow.
- [ ] Echte 200%-zoom op de huidige editor en cursistweergave.
- [ ] Zelfstandige schermlezerbediening en volledige PDF-toegankelijkheidsacceptatie.
- [ ] Menselijke cursus-/examenvraag-/certificaatinhoudacceptatie per cursusversie.
- [ ] Rijke WL-001/002/003-contentimport en generieke editorintegratie: bestaande importer is bewust op geïsoleerde PG17/neondb-doelen begrensd; deze PG18-proef bewijst hem niet. Geïmporteerde bundles bevatten geen `sourceMetadata.authoring` en blijven in de generieke editor `LEGACY_VERSION_READ_ONLY`. Geen verliesgevende omzetting of guardomzeiling uitgevoerd; certificaat-PR #92 meldt dezelfde afhankelijkheid.
- [ ] Private duurzame media-opslag voor de beoogde omgeving geaccepteerd.
- [ ] Productie-betaalroute/provider-, fiscale en juridische acceptatie. De huidige commerce/pricing heeft bewust nog een testomgevingsgrens; die is niet opgeheven.
- [ ] Actueel herstelbewijs, exact migratieartifact en afzonderlijk geautoriseerd migratievenster.
- [ ] Exacte PR-head-CI en Preview-isolatie beoordelen vóór mergebesluit.

## Veilige release- en rollbackvolgorde

1. Draft review van broncode, content en deze acceptatiepunten; geen automatisch mergeadvies op basis van alleen groene tests.
2. Ontbrekende toegankelijkheid en geïsoleerde provider/media-acceptatie afronden; testomgevingsgrenzen pas in afzonderlijk gereviewde wijziging geschikt maken voor productie.
3. Herstel-/migratieautorisatie op actuele productie-identiteit en exact artifact. Volledige benodigde keten vóór Academy-runtimevrijgave.
4. Afzonderlijke deployment- en featurevrijgave na postflight. Tot die tijd blijven LMS, F4 en contact gesloten.
5. Rollback: LMS-gate sluiten en vorige applicatierelease herstellen. Geen historische resultaten, migratieregistraties of additieve tabellen verwijderen.

## Actuele kwaliteitsresultaten

Een skip of browserbeperking is geen PASS. Suites overlappen en worden niet opgeteld.

| Controle | Werkelijk resultaat |
|---|---|
| Volledige regressierun | 3.991 PASS, 0 FAIL, 99 SKIP; 460 bestanden geslaagd en 22 integratiebestanden bewust overgeslagen. De afzonderlijke PostgreSQL-harnessen hieronder voeren de betreffende databasecontroles echt uit. |
| Gerichte finale hertest | 39/39 PASS: focus, certificaatworker, financiële PDF, shellsnapshot, lokale WP17-grens. |
| Scheduler | 14/14 PASS. |
| Authoring PostgreSQL | 4/4 PASS; echte acties, concurrency, resultaat-/certificaatuniciteit, eigenaarsisolatie en intrekking. |
| Commerce PostgreSQL | 2/2 PASS; één/vijf plaatsen, pending zonder toegang, dubbele betaalstatus zonder dubbele effecten, refunds uitsluitend mock. |
| Volledige PostgreSQL-cursusflow | PASS: 109 migraties, versie-upgrade, 50 vragen/10 hoofdstukken, historische resultaten, concurrency en retentie. |
| Better Auth PostgreSQL | PASS voor opdrachtgever, professional en beheerder: sessiecookie/24 uur, persistent/7 dagen, vernieuwing, intrekking, verlopen sessies, tenantisolatie en foutinjectie. |
| Contact/outbox PostgreSQL | PASS: 27 gevallen op de actuele 109-keten én 27 op de historische 85-baseline; geen providercalls. |
| Historische D2C-fixture | 17/17 PASS. |
| Migratie-/rechtenintegriteit | PASS: historische upgrade 93/93, schone keten 109/109, exacte checksums/herhaling, 13 rolverboden en 96 expliciet geweigerde mutatie-/privilegepogingen. Lokale cleanup/inventarisvergelijking PASS. |
| Volledige lint | PASS: nul fouten, vier bestaande waarschuwingen over authnavigatie; geen nieuwe waarschuwingen. |
| Diff/secrets/private metadata | PASS, inclusief alle uitgaande committoevoegingen en expliciet gecontroleerde staged bestandsset. |
| Standalone TypeScript | PASS; nul fouten na correctie van twee te ruim doorgegeven mailvelden. |
| Productiebuild | PASS met gesloten gates, onbruikbare lokale databaseplaceholder en tijdelijke procesgebonden authsleutel. Eerste poging miste die authconfiguratie en werd terecht geweigerd. Drie bestaande Knowledge-tracingwaarschuwingen. |

De standaard PDF-testlimiet van 5 seconden werd op deze host tweemaal overschreden. Met expliciete `--testTimeout=20000` slagen byte-reproduceerbaarheid en alle zes PDF-tests zonder gewijzigde assertions of financiële runtimecode. De volledige foutloze eindrun is met deze limiet uitgevoerd. De focuscontrole wacht nu op het bestaande React-effect; geen functionaliteit veranderd.

De release neemt de reeds gepinde Better Auth/adapter/core-versie 1.7.7 uit de aangewezen startcommit mee. Dit is een gedeelde dependencywijziging tegenover main, hoewel `src/lib/auth.ts` zelf ongewijzigd is. Sessiecompatibiliteit is daarom afzonderlijk in de bestaande synthetische PostgreSQL-harness voor alle drie de rollen gecontroleerd (PASS).

Screenshot van de echte synthetische editorpreview: [reviewbewijs](evidence/lms20/editor-preview.png).

## Opruiming en reviewstatus

De eigen lokale acceptatieserver is gestopt. De zelf aangemaakte container, het eigen volume, synthetische database/accounts/sessies, lokale testcredentials en mediafixtures zijn verwijderd. De inventarisvergelijking bevestigt behoud van de drie bestaande containers en 27 volumes. De tijdelijke LMS-gate is gesloten doordat het lokale proces is beëindigd; productie/Preview-configuraties zijn niet aangepast.

De uitgaande commitgeschiedenis en staged wijzigingen zijn gecontroleerd op secrets en specifieke private infrastructuurmetadata. Testgeheimen en logs staan niet in Git. De volledige bestandslijst staat in `lms-20-change-manifest.txt`. **GO voor afzonderlijke Draft-review; NO-GO voor productiepublicatie en automatische merge.** De open acceptatiepunten hierboven blijven bindend.
