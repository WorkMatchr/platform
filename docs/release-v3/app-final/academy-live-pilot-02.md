# Academy · besluitkaart voor de betaalde pilot

Deze kandidaat betreft drie persoonlijke plaatsen in totaal voor WL-001 1.2-r07, WL-002 1.3-r07 en WL-003 1.1-r07. De bestaande inschrijvingen en certificaten houden hun historische versie. De reguliere consumentenprijs is €149,00 per opleiding. De korting van €147,51 geeft een te betalen bedrag van €1,49.

## Nederlandse verkoop

Feenstra Safety Consulting is de verkoper. WorkMatchr is de handelsnaam. Gebruik bij een zakelijke aankoop de bevoegde organisatie en bij een particuliere aankoop de factuurgegevens van de koper. Beperk de eerste drie transacties tot vooraf gecontroleerde Nederlandse kopers. Controleer fiscale woon- of vestigingsplaats en eventuele bijzondere behandeling voordat een code wordt uitgegeven.

| Fiscale behandeling | Reguliere factuur | Pilotfactuur |
| --- | --- | --- |
| Deelname verkoper aan KOR op transactiedatum | €149,00 | €1,49. Vermeld de kleineondernemersregeling. Laat btw-tarief en btw-bedrag weg. |
| Na bevestigde beëindiging, Nederlandse verkoop tegen 21% | €123,14 + €25,86 | €1,23 + €0,26 = €1,49 |

Voor deze drie opleidingen is geen afzonderlijke onderwijsvrijstelling vastgesteld. Archiveer de beschikking en het bewijs van bevoegd besluit buiten Git. Leg uitsluitend de definitieve Nederlandse ingangsdatum en een interne beslisreferentie vast in de afgeschermde fiscale configuratie. Een streefdatum is onvoldoende. Controleer de omzetgrens vóór elke echte pilottransactie. Voor vrijwillige afmelding noemt de Belastingdienst de eerste dag van het aangiftetijdvak en indiening uiterlijk vier weken vooraf. [Afmelding KOR](https://www.belastingdienst.nl/wps/wcm/connect/nl/btw/content/afmelden-kor) · [Factuureisen KOR](https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/zakelijk/btw/administratie_bijhouden/facturen_maken/factuureisen/aangepaste_regels_facturen/u_maakt_gebruik_van_de_kleineondernemersregeling)

De checkout legt de aangeboden prijs vast. De geverifieerde ontvangst, facturatie en beschikbaarstelling kunnen in verschillende fiscale regimes vallen. Bij zo’n grens blokkeert de verwerking tot de boekhouder de peildatum en grondslag voor deze aankoop heeft vastgelegd. Bij een verplichte vooraffactuur blijft de huidige betaalroute gesloten. Zie de [procedure voor fiscale vastlegging](../../fin-recovery-05.md). De datum wordt gelezen in Europe/Amsterdam. Een laat ontvangen webhook, jaarwisseling of latere herdownload verandert een uitgegeven factuur niet. Een ontbrekende betaaldatum blokkeert de verwerking. Onderzoek een ontbrekende bevestiging via Mollie voordat een beheerder herstel initieert.

## Operationele vrijgave

1. Leg de twaalf P0-inhoudsbesluiten, consumentenvoorwaarden en de privacygrondslag, toegang en retentie voor studieobservaties en financiële gegevens vast. Een pilotcursist geeft zelf offline minuten en evaluatie per onderwerp op. Rapporteer deze afzonderlijk van de gemeten tijd. Een synthetische doorloop meet geen menselijke studieduur.
2. Controleer de geïntegreerde build, het schema inclusief de aanvullende pilotmigratie en afscherming van oudere verwerkers. Laat de inhoudsbeheerder iedere exacte r07-versie binnen de afgeschermde pilot gereedzetten. Controleer bestaande inschrijvingen vóór een versieovergang.
3. Controleer het juiste Mollie-profiel en de juiste Jortt-administratie en handelsnaam. Verifieer de grootboekrekening en de Jortt-categorie voor vrijgestelde prestaties. Documentontvangst en betaalaflettering vereisen afzonderlijk bewijs. [Jortt API](https://developer.jortt.nl/)
4. Activeer de betaalpilot uitsluitend na het afzonderlijke productiebesluit. De signalen voor betaalde pilot, LMS-runtime en fiscale bevestiging zijn standaard gesloten. Configureer bij een bevestigde fiscale overgang de datum en beslisreferentie samen. Voor onduidelijke of buitenlandse gevallen blijft verkoop gesloten.
5. Wijs per geverifieerd account één versiegebonden code met vervaldatum toe. Controleer per betaling het bedrag, unieke betaalreferentie, factuur-PDF, Jortt-document, betaalaflettering, één inschrijving en certificaatverificatie. Stop vóór de volgende deelnemer bij een afwijking. Een onbekend checkoutresultaat vergt reconciliatie van de bestaande betaalintentie. Een gemelde terugbetaling of chargeback vereist handmatige financiële beoordeling. De toepassing kan toegang intrekken zonder zelf een refund uit te voeren.

## Particuliere herroeping en studieduur (ACADEMY-LIVE-03)

Ter aftekening voor maximaal drie persoonlijke codes. Elke code geeft 99% korting op €149. De voorgestelde toegang begint op het bevestigde betaalmoment en duurt één kalenderjaar. Een nieuwe betaalde inschrijving bewaart de vervaldatum. Historische rechten behouden hun eigen einddatum.

De koper kiest **Overeenkomst herroepen** in Account → Academy-aankopen, controleert de naam en de opleiding en kiest **Herroeping bevestigen**. De browser ontvangt meteen een tekstbestand met de verklaring, aankoop en ontvangsttijd (UTC). Dezelfde koper kan dit bestand opnieuw downloaden, ook na sluiting van de verkoop. Het financiële event bewaart de eerste ontvangsttijd. De functie blijft beschikbaar bij twijfel over een verlengde bedenktijd. [Artikel 6:230oa BW](https://zoek.officielebekendmakingen.nl/stb-2026-153.html)

Platformbeheer controleert dagelijks Financiën → Betalingen → Openstaande Academy-herroepingen. Controleer de aankoopbevestiging, de toepasselijke bedenktijd en de oorspronkelijke Mollie-betaling. Behandel ook een gestarte of afgeronde cursus. Bij tijdige herroeping autoriseert de beheerder het volledige betaalde bedrag. Regel de terugbetaling onverwijld, uiterlijk binnen veertien dagen na ontvangst. Bij een betwiste termijn legt de beheerder de beoordeling voor aan de pilotverantwoordelijke. De ontvangstdatum blijft leidend.

De autorisatie beëindigt toekomstige toegang. De bestaande Mollie-dispatch en read-only reconciliatie volgen één refund op de oorspronkelijke betaling. Na een onzekere uitkomst controleert beheer de bestaande referentie. Een definitieve providerbevestiging maakt één spiegelcreditnota en één Jortt-opdracht. De oorspronkelijke factuur levert de btw-behandeling. Bij een onzekere Jortt-aanmaak controleert beheer de bestaande credit op de bronfactuur. Controleer de feitelijke bankafwikkeling afzonderlijk.

Leg bij elke betaalde uitnodiging de vaste sluitdatum van de studiemeting vast. Voorgesteld einde is het vroegste van cohortsluiting, afronding, intrekking of toegangsverval. Het dagelijkse onderhoud begint op dag 29 met wissen van tijdvakken, klokstatus, offline minuten, onderbrekingen en pilotevaluatie. Inschrijving, voortgang, toetsen, certificaten, facturen en financiële audit hebben eigen doelen en bewaarbeleid. Het groepsgemiddelde per versie vereist drie volledige metingen en wordt op een kwartier afgerond. Bij minder deelnemers wordt geen groepsduur getoond.

Productieactivering van de opruiming vereist afzonderlijk akkoord voor `ACADEMY_PILOT_RETENTION_ENABLED`. Controleer dagelijks in het onderhoudslog de categorie `academyMeasurements`. Bij een gemiste run start de bevoegde beheerder het bestaande financiële onderhoud handmatig en controleert de uitkomst vóór dag 30. Bij aanhoudende database- of scheduleruitval is de harde bovengrens niet gegarandeerd. Stel de pilot uit als operationele opvolging ontbreekt.

## Herhaalbare acceptatie

De lokale runner maakt een eigen PostgreSQL 18-database aan en ruimt deze op. De test voor de financiële koppelingen gebruikt `python scripts/acceptance/academy-students/run.py --paid-pilot --database-only`. Voor de drie browsertrajecten wordt `--paid-pilot` zonder `--database-only` gebruikt na een lokale productiebuild. De Mollie- en mailimitaties zijn uitsluitend onderdeel van de testrunner. De 100%-proef blijft afzonderlijk reproduceerbaar met `--assigned-pilot`.

De prijslogica komt uit de bestaande Academy-prijsontwikkeling. De betaalintentie, kortingscode, factuur, webhook en Jortt-opdracht gebruiken de bestaande financiële registratie. De technische voorbereiding vormt geen toestemming voor een uitnodiging, een betaling of een productiepublicatie.
