import type { ComplianceModuleCode } from './free-intake'

type TopicGuidance = { about: string; check: string; next: string; source: string }
const arbo = (path: string) => `https://www.arboportaal.nl/onderwerpen/${path}`
const rie = 'https://www.nlarbeidsinspectie.nl/onderwerpen/aanleveren-rie/veelgestelde-vragen-rie'

// Orientation copy, not assessment rules or a Knowledge/framework publication.
// Sources checked 2026-10-22; scope and verification limits: docs/compliance-f3-review.md.
export const freeIntakeV2Guidance: Record<ComplianceModuleCode, TopicGuidance> = {
  C01: {
    about: 'Een RI&E brengt arbeidsrisico’s in kaart. Het aantal werknemers alleen bepaalt niet of deskundige toetsing nodig is.',
    check: 'Zijn de huidige werkzaamheden, locaties en groepen werkenden in uw RI&E opgenomen?',
    next: 'Leg ontbrekende of gewijzigde werkzaamheden naast uw RI&E en bespreek twijfel over toetsing met een arbodeskundige.',
    source: rie,
  },
  C02: {
    about: 'Het plan van aanpak hoort bij de RI&E en maakt duidelijk welke maatregelen u gaat nemen.',
    check: 'Staat per maatregel wie deze uitvoert en wanneer, en is de voortgang bekend?',
    next: 'Bespreek de openstaande maatregelen met de verantwoordelijken en werk de planning bij.',
    source: rie,
  },
  C03: {
    about: 'De preventiemedewerker helpt bij de RI&E en de uitvoering van maatregelen voor gezond en veilig werken.',
    check: 'Is duidelijk wie deze rol vervult en welke tijd, kennis en ondersteuning beschikbaar zijn?',
    next: 'Bespreek de taakverdeling met de betrokken medewerker en de werknemersvertegenwoordiging waar die aanwezig is.',
    source: arbo('ondersteuning-bij-arbowet/preventiemedewerker'),
  },
  C04: {
    about: 'Het basiscontract legt afspraken met een arbodienst of bedrijfsarts vast, ook over preventieve ondersteuning.',
    check: 'Is het contract beschikbaar en weten medewerkers hoe zij de bedrijfsarts kunnen bereiken?',
    next: 'Loop de afspraken met uw arbodienst of bedrijfsarts na; kijk verder dan alleen verzuimbegeleiding.',
    source: arbo('ondersteuning-bij-arbowet/basiscontract'),
  },
  C05: {
    about: 'BHV gaat over eerste hulp, brandbestrijding en ontruiming. De inrichting hangt samen met de risico’s en omstandigheden van uw organisatie.',
    check: 'Wie kan tijdens de verschillende werktijden en op elke locatie hulp bieden, ook bij afwezigheid?',
    next: 'Loop een noodscenario met de betrokkenen door en controleer alarmering, bereikbaarheid en vluchtroutes.',
    source: arbo('arbozorg/bedrijfshulpverlening'),
  },
  C06: {
    about: 'Een PAGO is gericht op gezondheidsrisico’s van het werk. Het aanbod hoort aan te sluiten op die risico’s; deelname door werknemers is vrijwillig.',
    check: 'Is met de bedrijfsarts besproken welk onderzoek bij de werkzaamheden past en wanneer dit wordt aangeboden?',
    next: 'Bespreek het aanbod met de bedrijfsarts aan de hand van de RI&E, zonder medische gegevens in deze intake vast te leggen.',
    source: arbo('arbowet--en--regelgeving/arbobeleid/pago'),
  },
  C07: {
    about: 'Bij verzuim is een duidelijke taakverdeling tussen werkgever, werknemer en bedrijfsarts van belang.',
    check: 'Weten medewerkers hoe zij zich ziekmelden en wie begeleiding en vervolgafspraken organiseert?',
    next: 'Controleer uw verzuimprocedure met de arbodienst. Vraag medewerkers niet zelf naar diagnoses.',
    source: arbo('verzuim-en-re-integratie/verzuim'),
  },
  C08: {
    about: 'Uitleg over veilig werken moet aansluiten op de werkzaamheden en begrijpelijk zijn voor de betrokken werkenden.',
    check: 'Krijgen nieuwe en tijdelijke werkenden passende instructie, en wordt gecontroleerd of zij die begrijpen?',
    next: 'Kies één veelvoorkomende taak en loop de instructie en toepassing samen met de uitvoerders na.',
    source: arbo('arbozorg/voorlichting-gezondheidsrisicos'),
  },
  C09: {
    about: 'Melden aan de Arbeidsinspectie en intern registreren zijn verschillende zaken. Bij overlijden, ziekenhuisopname of blijvend letsel door een arbeidsongeval geldt een directe meldplicht.',
    check: 'Is bekend wie bij een ongeval hulp inschakelt, de meldplicht controleert en de registratie verzorgt?',
    next: 'Controleer de officiële meldinstructie. Wacht bij een mogelijk meldingsplichtig ongeval niet op afronding van deze wijzer.',
    source: 'https://www.nlarbeidsinspectie.nl/onderwerpen/arbeidsomstandighedenwet/arbeidsongevallen',
  },
  C10: {
    about: 'Werknemers betrekken bij arbeidsomstandigheden helpt knelpunten zichtbaar maken. De vorm van medezeggenschap hangt onder meer af van de organisatieomvang.',
    check: 'Hoe kunnen werkenden knelpunten bespreken, en welke OR, PVT of andere overlegvorm is er?',
    next: 'Bespreek de RI&E en voorgenomen maatregelen in de passende overlegvorm; deze intake bepaalt niet welke vorm verplicht is.',
    source: arbo('ondersteuning-bij-arbowet/ondernemingsraad-or'),
  },
  R01: {
    about: 'Veilig werken met machines en gereedschap vraagt aandacht voor gebruik, onderhoud en eventuele keuringen.',
    check: 'Zijn afschermingen intact, instructies beschikbaar en onderhoud en benodigde keuringen bijgehouden?',
    next: 'Loop de gebruikte arbeidsmiddelen na met een deskundige medewerker en bespreek geconstateerde gebreken.',
    source: arbo('veiligheid-op-het-werk/arbeidsmiddelen'),
  },
  R02: {
    about: 'Persoonlijke beschermingsmiddelen moeten passen bij de risico’s en de gebruiker. Alleen hun aanwezigheid bewijst niet dat het werk veilig is.',
    check: 'Is duidelijk waarvoor elk middel bedoeld is, hoe het wordt gebruikt en wanneer vervanging nodig is?',
    next: 'Controleer de keuze en gebruiksinstructie aan de hand van de RI&E en de informatie van de fabrikant.',
    source: arbo('persoonlijke-beschermingsmiddelen/persoonlijke-beschermingsmiddelen-en-de-risico-inventarisatie-en--evaluatie'),
  },
  R03: {
    about: 'Blootstelling kan ontstaan door gebruikte producten én door stoffen die tijdens het werk vrijkomen, zoals stof of damp.',
    check: 'Welke stoffen komen voor, bij welke taken en welke informatie over gevaren en blootstelling is beschikbaar?',
    next: 'Maak een overzicht van producten en processen en laat onzekerheden over blootstelling deskundig beoordelen.',
    source: arbo('risicos-gevaarlijke-stoffen'),
  },
  R04: {
    about: 'Tillen, duwen, trekken, herhalen en langdurig dezelfde houding kunnen lichamelijk belastend zijn.',
    check: 'Welke taken kosten veel kracht, duren lang of bieden weinig afwisseling?',
    next: 'Bekijk een representatieve werktaak met de uitvoerder en zoek naar minder belastende werkwijzen of hulpmiddelen.',
    source: arbo('fysieke-belasting'),
  },
  R05: {
    about: 'Bij beeldschermwerk spelen inrichting, werkhouding en afwisseling een rol, ook bij thuiswerken.',
    check: 'Zijn stoel, scherm en werkhoogte passend ingesteld en is afwisseling mogelijk?',
    next: 'Bespreek de inrichting en het werkritme met de gebruiker en laat knelpunten zo nodig beoordelen.',
    source: arbo('fysieke-belasting/computerwerk'),
  },
  R06: {
    about: 'Werkdruk en ongewenst gedrag, zoals pesten of agressie, vallen onder psychosociale arbeidsbelasting (PSA).',
    check: 'Kunnen medewerkers knelpunten veilig bespreken en weten zij waar zij ondersteuning vinden?',
    next: 'Bespreek organisatorische oorzaken en maatregelen. Leg in deze intake geen persoonlijke klachten of incidentdetails vast.',
    source: arbo('psychosociale-arbeidsbelasting'),
  },
  R07: {
    about: 'Bij geluid zijn zowel het niveau als de blootstellingsduur van belang. Uw keuze zegt nog niet of een grenswaarde wordt overschreden.',
    check: 'Bij welke machines of taken is veel geluid aanwezig en hoelang worden mensen eraan blootgesteld?',
    next: 'Breng die taken in beeld en laat beoordelen of metingen en aanvullende maatregelen nodig zijn.',
    source: arbo('fysische-factoren/geluid'),
  },
  R08: {
    about: 'Gereedschap en voertuigen kunnen trillingen overbrengen op handen, armen of het hele lichaam.',
    check: 'Welke middelen trillen, hoelang worden zij gebruikt en wat is bekend over onderhoud en blootstelling?',
    next: 'Vergelijk gebruiksduur en fabrikantinformatie en vraag deskundig advies bij onduidelijke blootstelling.',
    source: arbo('fysische-factoren/trillingen-en-schokken'),
  },
  R09: {
    about: 'Valgevaar hangt af van de werkplek en werkwijze, niet alleen van de hoogte.',
    check: 'Zijn werkvloeren, toegang, randen en gebruikte hulpmiddelen geschikt voor de taak?',
    next: 'Laat vooraf een veilige werkmethode bepalen; beschouw een ladder of harnas niet vanzelf als voldoende oplossing.',
    source: arbo('inrichting-werkvloer/werken-op-hoogte'),
  },
  R10: {
    about: 'Voor jongeren gelden leeftijdsafhankelijke beperkingen en voorwaarden voor werkzaamheden en toezicht.',
    check: 'Welke taken voeren jongeren uit en is nagegaan of die taken bij hun leeftijd en begeleiding passen?',
    next: 'Controleer de officiële regels per leeftijd en taak voordat werkzaamheden worden toegewezen.',
    source: arbo('rechten-plichten-werkenden/jong-werkenden'),
  },
  R11: {
    about: 'Bepaalde arbeidsrisico’s vragen extra aandacht rond zwangerschap en borstvoeding.',
    check: 'Is bekend welke werkzaamheden aanpassing kunnen vragen en hoe hierover vertrouwelijk advies wordt gevraagd?',
    next: 'Bespreek werkgerelateerde risico’s met de bedrijfsarts; deze intake vraagt geen persoonlijke medische informatie.',
    source: arbo('rechten-plichten-werkenden/kinderwens-zwanger-borstvoeding-en-werk'),
  },
  R12: {
    about: 'Contact met mensen, dieren, afval of biologisch materiaal kan blootstelling aan ziekteverwekkers geven.',
    check: 'Bij welke handelingen kan contact ontstaan, en welke hygiëne- en beschermingsmaatregelen zijn afgesproken?',
    next: 'Breng de blootstellingsroutes in kaart en laat specifieke risico’s zo nodig beoordelen.',
    source: arbo('biologische-agentia'),
  },
  R13: {
    about: 'Bij alleen werken kan hulp later beschikbaar zijn. Welke afspraken nodig zijn, hangt af van de taak en omgeving.',
    check: 'Hoe slaat iemand alarm en wie reageert wanneer contact uitblijft?',
    next: 'Test de bereikbaarheid en noodprocedure met de betrokken werkenden.',
    source: arbo('inrichting-werkvloer/alleen-werken'),
  },
  R14: {
    about: 'Bij nacht- en ploegendiensten spelen werktijden, rust en herstel een rol; er kunnen specifieke regels gelden.',
    check: 'Zijn feitelijke werktijden, pauzes en rust tussen diensten bekend?',
    next: 'Leg het rooster naast de toepasselijke arbeidstijdenregels en bespreek knelpunten met de planner.',
    source: arbo('arbowet--en--regelgeving/werk--en-rusttijden-arbeidstijdenwet'),
  },
  R15: {
    about: 'Op locaties van anderen zijn afstemming en duidelijke afspraken over arbeidsrisico’s van belang.',
    check: 'Wie geeft locatie-instructies en hoe worden risico’s, noodprocedures en verantwoordelijkheden afgestemd?',
    next: 'Bespreek de taak en omstandigheden vóór aanvang met de contactpersoon op locatie.',
    source: arbo('arbowet--en--regelgeving/verantwoord-opdrachtgeverschap'),
  },
  R16: {
    about: 'Waar voertuigen en mensen samenkomen, kan aanrijdgevaar ontstaan.',
    check: 'Zijn looproutes, rijroutes, kruisingen en laad- of losplaatsen overzichtelijk?',
    next: 'Loop de verkeersbewegingen op een druk moment na en bespreek mogelijkheden om mensen en voertuigen te scheiden.',
    source: arbo('inrichting-werkvloer/aanrijdgevaar'),
  },
  R17: {
    about: 'Hitte, kou en andere omgevingsfactoren kunnen de belasting van het werk vergroten.',
    check: 'Wanneer ontstaan ongunstige omstandigheden en welke beschutting, afwisseling of pauzemogelijkheden zijn er?',
    next: 'Maak praktische afspraken voor die omstandigheden en bespreek twijfel over gezondheidsrisico’s met een deskundige.',
    source: arbo('fysische-factoren'),
  },
  R18: {
    about: 'Een bruikbare werkplek biedt passende ruimte, toegang en inrichting voor het werk.',
    check: 'Zijn werkplekken en doorgangen vrij en passen verlichting en inrichting bij de werkzaamheden?',
    next: 'Loop de werkplek samen met de gebruikers na en leg concrete verbeterpunten vast.',
    source: arbo('inrichting-werkvloer'),
  },
  R19: {
    about: 'Brandgevaar vraagt aandacht voor ontstekingsbronnen, brandbare materialen en de mogelijkheid om veilig te vluchten.',
    check: 'Zijn brandbare materialen, ontstekingsbronnen en vluchtroutes in beeld?',
    next: 'Bespreek preventie en noodafspraken; laat mogelijke explosierisico’s afzonderlijk deskundig beoordelen.',
    source: arbo('veiligheid-op-het-werk/brandveiligheid'),
  },
  R20: {
    about: 'Elektrische installaties en werkzaamheden kunnen gevaar opleveren, ook bij onderhoud of storingen.',
    check: 'Wie mag welke werkzaamheden uitvoeren en hoe wordt voorkomen dat onverwacht spanning aanwezig is?',
    next: 'Laat de werkwijze en staat van installaties door een passende deskundige beoordelen.',
    source: arbo('inrichting-werkvloer/elektriciteit'),
  },
  R21: {
    about: 'De soort straling, bron en blootstelling bepalen welke risico’s nader onderzocht moeten worden.',
    check: 'Welke apparatuur of processen geven straling af en welke veiligheidsinformatie is beschikbaar?',
    next: 'Laat vaststellen om welk type straling het gaat en welke beoordeling en bescherming daarbij passen.',
    source: arbo('fysische-factoren'),
  },
  R22: {
    about: 'Bij drukapparatuur hangen eisen aan gebruik en keuring onder meer af van het type en de kenmerken van de apparatuur.',
    check: 'Zijn identificatie, onderhoudsinformatie en eventuele keuringsdocumenten beschikbaar?',
    next: 'Laat per apparaat vaststellen welke keuringen en onderhoudsafspraken van toepassing zijn.',
    source: arbo('veiligheid-op-het-werk/arbeidsmiddelen/drukapparatuur-keuringen-en-ce-markeringen'),
  },
  R23: {
    about: 'Een mengsel van lucht met brandbaar gas, damp of stof kan onder bepaalde omstandigheden ontplofbaar zijn.',
    check: 'Waar kunnen zulke mengsels ontstaan en welke ontstekingsbronnen zijn daar mogelijk?',
    next: 'Laat een deskundige vaststellen of explosieveiligheidsmaatregelen en een nadere beoordeling nodig zijn.',
    source: arbo('inrichting-werkvloer/explosieve-atmosfeer'),
  },
}
