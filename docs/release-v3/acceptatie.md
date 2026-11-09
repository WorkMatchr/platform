# Integratieacceptatie V3.0

De tweede integratiesessie is vergeleken op commit `c0c153648a14f48df5e1780c6f56df5cbf7b0f15`. De enige unieke commit voegt een herkomstnotitie en de Vercel-uitsluiting van die eigen branch toe. ACCOUNT-01 is reeds vertegenwoordigd door `4521997`. De notitie bevestigt de vier gelijke onderdelen voor bestaande en nieuwe organisaties, versiegebonden kwalificatie en behoud van historie. De tweede werkboom leverde een geslaagde 85-migratieproef en webpackbuild op. Het lokale verschil in `next-env.d.ts` komt uit de frameworkbuild. PR #118 blijft de enige integratiebranch voor vrijgave.

Dezelfde synthetische professional registreerde zich met e-mailverificatie, maakte een organisatie aan en vulde de vier matchingonderdelen in. Tussen indienen en openen van de uitnodiging doorliep het dossier een afzonderlijke beoordeling met twee bevoegde beheerders, één platformbesluit en twee dienstbesluiten. Alle drie hadden een beoordelaar, goedkeurder, geldigheid en dezelfde goedgekeurde dossierbasis.

Op de lokale PostgreSQL 18-fixture met 85 gecontroleerde migratiechecksums heeft de matchingservice een gepubliceerde opdracht daadwerkelijk gerangschikt. Van de testorganisaties werd precies één organisatie uitgenodigd. De outbox leverde één bericht aan het synthetische transport met het juiste adres en de juiste uitnodigingslink. Een tweede dispatch claimde nul berichten. In de browser opende de professional de opdracht, betaalde uit zijn testwallet, bewaarde en heropende het offerteconcept en diende de offerte in. De opdrachtgever kon de offerte lezen. De gunningsservice registreerde één gunning, ook na herhaling. Na een expliciete schorsing weigerden zowel de directe uitnodigingspagina als het dashboard toegang. De gunning en controles op afschrijving en onveranderlijkheid zijn in de database uitgevoerd.

| Browserbewijs | Controle |
| --- | --- |
| [Registratie](browser/registratie-bevestiging.png) en [checklist](browser/checklist-vier-onderdelen.png) | Registratie, vier verplichte onderdelen |
| [Kwalificatie](browser/kwalificatie-desktop.png) | Afzonderlijke beoordeling |
| [Mobiel](browser/offerte-mobiel-bewaard.png) en [zoom](browser/offerte-zoom.png) | Bewaard concept, desktop, tablet, mobiel en 200% |
| [Opdrachtgever](browser/offerte-opdrachtgever.png) en [schorsing](browser/uitnodiging-na-schorsing.png) | Ingediende offerte en ingetrokken toegang |

De oude PostgreSQL-fixtures voor deelname, uitnodigingen en offertes kenden alleen een projectie of een ongebonden kwalificatie. De fixtures hebben nu voor hun positieve scenario een actuele beoordeelde dossierbasis nodig. De afzonderlijke end-to-end-proef oefent de daadwerkelijke kwalificatieprocedure. De negatieve scenario’s behouden de controles op ingetrokken bevoegdheden, tenantisolatie en verouderde projecties.

## Repetitie schone start

Het draaiboek staat in [de release-inventaris](README.md). De controle in [check-synthetic-checkpoint.py](../../ops/release-v3/check-synthetic-checkpoint.py) accepteert alleen een lokale Docker-engine en een correct gemarkeerde, tijdelijke testcontainer met PostgreSQL 18. Ze maakt binnen die fixture een synthetisch checkpoint, herstelt dat in een nieuwe database en vergelijkt iedere publieke tabel op aantal en de volledige multiset van rijvingerafdrukken. Ook het FK-overzicht en de aantallen in de read-only inventaris moeten overeenkomen. Alleen de eigen herstelkopie en het tijdelijke bestand worden na afloop opgeruimd.

Vóór een daadwerkelijke schone start moet platformbeheer elk bestaand financieel of auditrecord en de gekoppelde identiteiten kunnen behouden. Een nulstand vereist een afzonderlijk gevalideerde nieuwe administratie of een expliciet goedgekeurd overgangsmanifest. Een betaald Pro-abonnement, openstaande providertransactie of wettelijke bewaarplicht blokkeert het verwijderen van het bijbehorende account. Een echte back-up, aantoonbare herstelbaarheid van de bedoelde omgeving en afzonderlijke toestemming voor omschakeling blijven nodig.


## Financiële kandidaat en hersteloefening

De afzonderlijke financiële kandidaat is PR #119 op `ccb299fc2199128a7336472dc92e90f108145d15`. FIN-01 koppelt verlengingen aan de daadwerkelijk betaalde bron. FIN-02 bewaart de langste betaalde periode. FIN-03 voorkomt dat verouderde of identieke foutberichten de status of het aantal pogingen opnieuw wijzigen. Een later mislukt incassotijdvak blijft zichtbaar wanneer een eerdere geslaagde betaling alsnog binnenkomt. Jortt-aflevering en betaalaflettering bij de externe provider staan open.

Bij de schone-startproef op een synthetische financiële fixture zijn 236 tabellen volledig vergeleken na herstel. Met `--clean-start` is daarnaast een leeg doel opgebouwd en op 23 referentietabellen, alle FK-constraints en tien lege operationele tabellen gecontroleerd. De volledige betaal-, factuur- en auditgeschiedenis bleef aanwezig in de herstelkopie. Deze tabelkeuze hoort bij deze fixture. Voor de echte configuratie is nog een beoordeelde toelatingslijst met afhankelijkheden en bewijsplichten nodig.

De exacte Actions-resultaten en acceptatie van de samengestelde head staan bij de Draft PR.
