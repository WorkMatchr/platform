# Academy-pilot voor twaalf deelnemers per cursusversie

| Versie | Raming inclusief eerste toets | Inhoudelijke beslissing vóór deelname |
| --- | ---: | --- |
| WL-001 · RI&E in de praktijk · 1.2-r07 | 300 min | 4 P0-correcties open |
| WL-002 · Preventiemedewerker in de praktijk · 1.3-r07 | 295 min | 2 P0-correcties open |
| WL-003 · Veilig en gezond werken · 1.1-r07 | 288 min | 6 P0-correcties open |

De drie bronbundels zijn concepten. Voor menselijke deelname moeten de twaalf besluiten zijn vastgelegd door de aangewezen deskundigen. De lokale publicatiestap van de synthetische proef gebruikt een wegwerpdatabase. De commerciële catalogus en de historische uitgiften hebben een eigen vrijgavepad. [Beslismatrix met de twaalf P0-punten](academy-release-08.md)

## Inschrijven voor €0,00

1. De platformbeheerder opent **Academy → Cursussen → Proefcursist aanwijzen**, kiest het geverifieerde synthetische account, één of meer exacte r07-versies, een gebruikslimiet en de vervaldatum (exclusief, 00.00 UTC). Elke versie heeft twaalf plaatsen. Een dubbele toewijzing gebruikt geen nieuwe plaats.
2. De beheerder ontvangt één persoonlijke code. De cursist kiest **Mijn e-learnings → Mijn pilotuitnodigingen**, ziet €0,00 en wisselt de code in voor de geselecteerde versie. De code alleen verleent geen recht aan een ander account. De bestaande regels voor eerdere inschrijvingen, intrekking en versiebinding gelden ook hier.
3. De inschrijving, het tijdstip en de verwijzing naar de code worden in dezelfde transactie vastgelegd. Bij twee gelijktijdige aanvragen controleert de database de gebruikslimiet onder een lock. De ontvanger krijgt de bestaande cursusinschrijving. Dit pad maakt geen financiële aankoop, providerbetaling, checkout of mandaat aan.
4. De beheerder opent de cursusversie en ziet onder **Studieduurpilot** aan wie de code is toegewezen en wanneer deze is ingewisseld. De cursist kan vanuit de pilotpagina de deelname expliciet beëindigen. Afgeronde resultaten en certificaten worden afzonderlijk bewaard.

**Hergebruik.** PR #125 bevat al de financiële tabel `DiscountCode` met percentage, geldigheid, maximum en aanmaker. De pilot gebruikt 10.000 basispunten en een eigen productbereik dat voor geen creditpakket geldt. De aanvullende toewijzing bindt de code aan account en cursusversie. De aparte ontwikkeling `codex/academy-pricing-promotions-v1` bevat een uitgebreider aanbod met actiecodes en €0-orders. Daar zijn een accountregeling en een actiecode twee elkaar uitsluitende soorten. Haar volledige checkout en financiële migraties zijn geen afhankelijkheid van deze pilot.

## Studieduur en beheer

| Onderdeel | Beschikbaar bewijs |
| --- | --- |
| Bestaande studentadministratie | Versiegebonden inschrijving, start en afronding, voortgang per hoofdstuk, examenhistorie en verifieerbaar certificaat van cursusafronding. De tekst begrenst de uitgifte tot de cursus. |
| Nieuwe meting | De server meet het interval tussen opeenvolgende waarnemingen in hetzelfde zichtbare, gefocuste onderdeel. Het openen van een tab alleen levert nul studietijd op. Intervallen boven 60 seconden, parallelle vensters en vermoedelijke meetgaten tellen niet als actieve tijd. De klok heeft een pauzeknop. Tijdens stil lezen kan de cursist met **Ik studeer** een waarneming geven. |
| Versierapport | Start- en einddatum, actieve les- en oefentijd per hoofdstuk, tijd van poging 1, herkansingen per poging, resultaten, certificaatstatus, pauzes en onverklaarde onderbrekingen. Het totaal bestaat uit les en oefeningen vóór de eerste toets plus de eerste toets. Herhaling en herkansingen verhogen dat totaal niet. |
| Groepsrapport | Aangewezen, begonnen, afgerond, voortijdig beëindigde toegang en onvolledige metingen. Gemiddelde, mediaan, minimum en maximum gebruiken uitsluitend afgeronde inschrijvingen met positieve les- en oefentijd in alle hoofdstukken, een gemeten eerste toets en nul geregistreerde meetgaten. Stilte zonder afmelding geldt niet als uitval. |
| Interpretatie | De uitkomst is een schatting van actieve browsertijd. Lang lezen zonder interactie, offline praktijkwerk en een verbroken verbinding kunnen onderschatting geven. Een technische dekkingscontrole bewijst geen concentratie. Laat proefcursisten per hoofdstuk afwijkingen of offline werk apart doorgeven. Vergelijk bij de eerste deelnemers met een onafhankelijke stopwatch en rapporteer ontbrekende waarnemingen afzonderlijk voordat een openbare studieduur wordt vastgesteld. |

## Synthetische acceptatie

| Handelingen | Waargenomen resultaat |
| --- | --- |
| 1–3. Aanwijzen, code inwisselen en kosteloos inschrijven | Voor elk van de drie exacte versies een eigen geverifieerd account en een 100%-code. Twee starts leveren één inschrijving op. Nul financiële aankopen. Externe providerverbindingen zijn tijdens de browserproef geblokkeerd. |
| 4–6. Starten, pauzeren, hervatten en meten | De drie cursisten doorliepen elk tien hoofdstukken en hervatten na uitloggen op de eigen lespositie. De aparte PostgreSQL-tijdproef meet bij vaste klok exact 10 s les en 5 s oefening. Een pauze van 60 s en een onverklaard gat van 74 s staan buiten het totaal. De klok van een andere cursist kan deze gegevens niet bijwerken. |
| 7–10. Eerste toets, herkansing, certificaat en beheer | Per cursus een onvoldoende eerste poging, een geslaagde herkansing, eigen PDF-download en publieke verificatie. De privédownload is voor een andere ingelogde cursist geweigerd. De beheerder kan de inschrijving en het codegebruik terugvinden. |
| Exclusiviteit en historie | Bij twee verschillende gelijktijdige aanvragen voor de twaalfde plaats slaagde er één. Bij een gebruikslimiet van één kon maar één van twee cursusversies worden ingewisseld. Een verlopen code, verkeerde versie en toegang na intrekking zijn geweigerd. De eerdere WL-001-inschrijving, toetshistorie en de bytes van de eerdere certificaat-PDF zijn met de beginsituatie vergeleken. |
| Reproduceerbaarheid | Vier gerichte unittests, één toets-/historietest en acht Academy-integratietests. De lokale proef past 102 migraties toe in een eigen PostgreSQL 18-database. De beheer- en studentbrowserproef is opgenomen in `scripts/acceptance/academy-students/run.py --assigned-pilot`. Elke proef controleert eigendom vóór opruiming van de eigen container. |

## Zelfstandig nieuwe opleidingen beheren

| Handeling | Status op deze tak |
| --- | --- |
| Nieuwe cursus, hoofdstukken, tekstlessen, oefenvragen en eindtoets | Via het bestaande cursusbeheer. Een synthetisch WL-004-concept dient als proef. |
| Slagingsnorm en poginglimiet | In de editor via **Benodigde goede antwoorden** en **Maximum aantal pogingen**. |
| Sjabloon, certificaatuitgifte en resultaten | Bestaande sjabloonontwerper en cursuskoppeling, toetsgebonden uitgifte, privé-PDF, publieke verificatie en inzage voor bevoegde beheerders. |
| Versiebeheer, review en archiveren | De editor kan een nieuwe conceptversie voorbereiden, importeren en voor review aanbieden. Archiveren van een gepubliceerde versie is geblokkeerd zolang studenten nog moeten afronden. |
| Een nieuwe WL-004 commercieel publiceren of prijzen | Gesloten. WL-004 is een roadmapcursus. De editor kan haar als concept voorbereiden. PR #125 heeft geen scherm voor commerciële cursusprijzen en de runtime heeft een afzonderlijke publicatiecontrole. |

## Privacy en resterende vrijgavevoorwaarden

Voorstel voor de menselijke pilot, ter vaststelling door WorkMatchr. Academy-beheer is verantwoordelijk voor selectie, beperkte toegang en afsluiting. De privacyverantwoordelijke legt vóór uitnodiging het doel, de grondslag, ontvangers, bewaartermijn en afhandeling van inzage of terugtrekking vast. Deelnemers krijgen vooraf uitleg over de meting, pauzeren, de betekenis van het certificaat en de contactroute. De pilot bewaart geen toetsaanslagen, schermbeelden, IP-adressen of antwoordteksten in de tijdmeting. De rapportage toont persoonsgebonden gegevens alleen binnen bevoegd beheer. [Autoriteit Persoonsgegevens over informatie aan betrokkenen](https://autoriteitpersoonsgegevens.nl/nl/zelf-doen/gebruik-uw-privacyrechten/recht-op-informatie)

Voorgestelde termijn voor herleidbare meetgegevens is tot uiterlijk 30 dagen na de vaste cohortsluitdatum, ook bij uitval. Leg die datum bij de uitnodiging vast. Gebruik die periode om meetgaten met deelnemers te duiden en alleen niet-herleidbare groepsuitkomsten te bewaren. Een beheerder controleert de afgeschermde verwijdering van tijdtotalen en meetstatus tegen de afgesproken termijn. Bewaar het bewijs van inschrijving en codegebruik zolang daarvoor een afzonderlijk vastgesteld doel bestaat. Het verwijderen van de toewijzing raakt de toegangscontrole en moet apart van het wissen van tijdmetingen worden beoordeeld. Inschrijvingen, examenresultaten en certificaten volgen hun eigen bewaarbeleid. De termijn is een voorstel; automatische productieopruiming is niet ingericht. [Autoriteit Persoonsgegevens over bewaartermijnen](https://autoriteitpersoonsgegevens.nl/nl/over-privacy/persoonsgegevens/bewaren-van-persoonsgegevens)

Voor menselijke deelname zijn de inhoudelijke P0-besluiten, de privacyafspraken en een afzonderlijk geaccepteerde private pilotomgeving nodig. De technische proef accepteert uitsluitend lokale synthetische accounts op de aangewezen loopback-database. Een introductie in een echte omgeving vereist ook een geautoriseerde toepassing van de additieve migratie en een controle op toegangsintrekking, meetkwaliteit en historische WL-001-inschrijvingen. De studieduurramingen blijven voorlopig.
