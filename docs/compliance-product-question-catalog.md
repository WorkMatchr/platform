# Compliance-productontwerp — vraagcatalogus en bronnen

Concept bij het [functioneel ontwerp](compliance-product-redesign.md), 15 oktober 2026. Geen gepubliceerde configuratie. Vraagcodes hieronder zijn voorstellen voor een **nieuwe** frameworkversie; bestaande vraagcodes blijven historisch geldig. Dit document bevat geen nieuwe juridische certificering.

## 1. De 21 bestaande vragen, exact uit de component

Bron: `src/components/public/compliance-guide.tsx` op `d3bce31248cf496f4c0563e210addbcb8d2e721c`. Iedere vraag heeft momenteel `YES / NO / UNKNOWN` (Ja / Nee / Dat weet ik niet). Onderstaande velden behouden hun herkomst; v2 wijzigt alleen na goedkeuring de versiegebonden toepasselijkheid en beoordeling.

| Nr. | Bestaande key | Huidige vraagstelling | Doelonderwerp v2 |
|---|---|---|---|
| 1 | hasEmployees | Heeft uw organisatie werknemers? | Profiel; FI2-01 bevestigen, niet dubbel invullen |
| 2 | generalPolicy | Is binnen uw organisatie een samenhangend arbobeleid geregeld? | C01, algemene context |
| 3 | rie | Heeft uw organisatie een actuele RI&E? | C01 |
| 4 | actionPlan | Is er een plan van aanpak bij de RI&E? | C02 |
| 5 | rieUpdated | Wordt de RI&E aangepast bij relevante veranderingen of nieuwe risico’s? | C01 |
| 6 | rieTesting | Is deskundige toetsing geregeld wanneer die voor uw RI&E verplicht is? | C01, alleen na voldoende toepasselijkheidscontrole |
| 7 | preventionOfficer | Is minimaal één preventiemedewerker aangewezen? | C03, werkgeversrol onder voorwaarden erkennen |
| 8 | preventionConsultation | Is de werknemersvertegenwoordiging betrokken bij persoon en positie van de preventiemedewerker waar dat vereist is? | C03; OR/PVT-instemming onderscheiden van algemene raadpleging |
| 9 | bhvOrganized | Is bedrijfshulpverlening georganiseerd? | C05 |
| 10 | bhvAppointed | Zijn één of meer BHV’ers aangewezen en is vervanging geregeld? | C05 |
| 11 | bhvRiskBased | Sluit de BHV-organisatie aantoonbaar aan op de RI&E, bezetting, locaties en bedrijfsrisico’s? | C05 |
| 12 | bhvPrepared | Zijn passende opleiding, oefeningen en middelen geregeld? | C05 |
| 13 | basicContract | Is er een basiscontract met een arbodienst of bedrijfsarts? | C04 |
| 14 | occupationalPhysicianAccess | Kunnen werknemers de bedrijfsarts ook preventief en zonder onnodige drempels raadplegen? | C04 |
| 15 | expertTasksCovered | Zijn de relevante wettelijke deskundige taken in de arbodienstverlening geborgd? | C04 |
| 16 | pagoOffered | Wordt periodiek een PAGO aangeboden dat aansluit op de arbeidsrisico’s? | C06 |
| 17 | instruction | Krijgen werknemers passende voorlichting en instructie over werkzaamheden en arbeidsrisico’s? | C08 |
| 18 | supervision | Wordt waar nodig toezicht gehouden op veilig gebruik van arbeidsmiddelen en persoonlijke beschermingsmiddelen? | C08 |
| 19 | workerConsultation | Worden werknemers aantoonbaar geraadpleegd over relevante arbo-onderwerpen? | C10 |
| 20 | accidentRegistration | Is er een proces voor het registreren van relevante arbeidsongevallen? | C09 |
| 21 | accidentReporting | Is bekend dat overlijden, ziekenhuisopname of blijvend letsel direct bij de Nederlandse Arbeidsinspectie moet worden gemeld? | C09 |

Daarnaast: `employeeCount` = ONE_TO_25/MORE_THAN_25; `representation` = OR/PVT/DIRECT/NONE/UNKNOWN. Dit zijn **23 bestaande antwoordvelden**, geen 21 totaalvelden. V2 behoudt beide contextgegevens: aantal vanuit bevestigde intake, vertegenwoordiging op relevante stap. Geen verborgen extra inhoudelijke vragen. De bestaande `hasEmployees=NO`-kortsluiting naar negen NVT-resultaten wordt niet naar v2 gekopieerd.

Twintig bestaande inhoudelijke vragen + 25 nieuwe = **45 inhoudelijke vragen**. Met werkgeversprofielbevestiging zijn dat 46 vraagdefinities, exclusief twee contextvelden. De vijf voorafgaande intakevragen zijn een afzonderlijk product. Toon de feitelijke dynamische voortgang en laat de telafspraak door PO accepteren; geen gegarandeerde 46 totale clicks of velden.

## 2. Gemeenschappelijk antwoord- en regelcontract

**Antwoordset S:** Ja (`YES`), Gedeeltelijk (`PARTIAL`), Nee (`NO`), Dat weet ik niet (`UNKNOWN`). Leeg/ongeldig blijft ontbrekend en telt nooit als een positief antwoord. Geen standaard vooraf geselecteerd JA. Elke nieuwe vraag hieronder gebruikt S tenzij expliciet anders vermeld.

**Voorwaarde E:** werknemers bevestigd of andere werkenden onder leiding met nog te bepalen werkgeversscope. Bij onbekende scope blijven vragen bereikbaar, maar een juridische tekortkoming/NVT wordt niet zonder toepasselijkheidsbewijs toegekend. Alleen vrijwilligers/geen werkenden: algemene basiswijzer blijft begrensd, relevante specialistische regels nog niet beoordeeld. Geen sectorale blanketvrijstelling.

**Voorwaarde P(x):** E en bestaande parentvoorziening x is niet expliciet NO. Bij parent-NO: detailvraag overslaan als afhankelijk detail; parent tekortkoming blijft zichtbaar. Bij parent UNKNOWN: detailvraag mag worden beantwoord om feitelijke informatie te verzamelen, maar detail-JA maakt parent niet stil JA. Tegenstrijdigheid → gebruiker laten corrigeren, geen groen.

**Regel W (wettelijke basis):** bij bevestigde toepasselijkheid JA → positieve deelbevinding; NO of PARTIAL → Actie vereist op het concreet ontbrekende onderdeel; UNKNOWN/leeg/ongeldig → Niet beoordeeld + informatie-actie. JA is geen geheel groen onderwerp wanneer andere controles openstaan. **Regel R (aanbevolen borging):** JA → positieve deelbevinding; NO/PARTIAL → Aandacht nodig, expliciet aanbeveling; UNKNOWN → Niet beoordeeld. Een wenselijke registratiewijze zonder aparte wettelijke plicht wordt nooit op zichzelf een wettelijke overtreding.

Individuele vragen kennen geen vrij te kiezen NVT-antwoord. Alleen een versiegebonden toepasselijkheidsregel kan dit opleveren. Iedere regel krijgt later een stabiele regelcode, bronbinding, reasonCode, finding en actie; bijvoorbeeld `CW2-RIE-01-NO`, niet alleen een totaalscore. Gemeenschappelijke W/R-regels plus de uitzonderingen hieronder vormen de antwoord→uitkomst-specificatie.

## 3. Vijf aanvullende RI&E-vragen

### CW2-RIE-01 — Dekking werkzaamheden

**Vraag:** “Zijn alle werkzaamheden en werkplekken van uw organisatie in de RI&E meegenomen, ook thuiswerk en werk bij anderen als dat voorkomt?”

- Opties: S. Voorwaarde: P(rie). Regel: W.
- Grondslag/bronnen: Arbowet art. 5 lid 1; [S1](#s1--rie-en-plan-van-aanpak). Geen verplichting tot een los document per locatie suggereren.
- Actie: neem ontbrekende werkzaamheden/werkplekken op en laat hun risico's beoordelen.
- Overlap: bestaande `rie` vraagt aanwezigheid/actualiteit, niet dekking. Hergebruik semantiek van bestaande C01-Q02; geen tweede C01-Q02-vraag tegelijk tonen.

### CW2-RIE-02 — Groepen werkenden

**Vraag:** “Is in de RI&E bekeken of bepaalde groepen extra bescherming nodig hebben, bijvoorbeeld jongeren, uitzendkrachten of werk waarbij zwangerschap of borstvoeding extra aandacht vraagt?”

- Opties: S. Voorwaarde: P(rie), ook zonder vinkje in FI2-04. Regel: W; JA betekent dat de controle is uitgevoerd, niet dat zulke personen aanwezig zijn.
- Grondslag/bronnen: Arbowet art. 5 lid 1 en bijzondere bepalingen Arbobesluit; [S1](#s1--rie-en-plan-van-aanpak), [S10](#s10--wettekst-en-verificatiegrens).
- Actie: controleer relevante groepen en leg passende werkgerichte maatregelen vast, zonder personen/medische informatie in WorkMatchr.
- Overlap: C01-Q07 hergebruiken met aangescherpte versie; geen ongefundeerde NVT-optie uit oude detailconfig overnemen.

### CW2-RIE-03 — Inzage

**Vraag:** “Kunnen werknemers de RI&E inzien?”

- Opties: S. Voorwaarde: P(rie). Regel: W.
- Grondslag/bronnen: Arbowet art. 5 lid 6; [S10](#s10--wettekst-en-verificatiegrens).
- Actie: maak de RI&E toegankelijk en leg uit waar werknemers deze kunnen vinden.
- Overlap: andere betekenis dan `workerConsultation` (meedenken); sluit aan bij C01-Q10, niet nogmaals stellen.

### CW2-RIE-04 — Gezamenlijke arbeidsduur

**Vraag:** “Werkt uw betaalde personeel samen in totaal maximaal 40 uur per week?”

- Opties: Ja / Nee / Dat weet ik niet. Voorwaarde: E met betaald personeel; bij onzekere scope tonen, geen vrijstelling afleiden. Gaat om totale arbeidsduur, niet uren per persoon of 40 FTE.
- Grondslag/bronnen: Arbowet art. 14 lid 12; [S2](#s2--toetsing-en-uitzonderingen).
- Regel: alleen context, nooit tekortkoming wegens antwoord NO. YES maakt een **mogelijke** toetsingsuitzondering; pas na controle van scope/feiten definitief. UNKNOWN → toetsingsvraag Niet beoordeeld wanneer de uitzondering bepalend is. Gewoon te toetsen bij betrouwbare uitsluiting van uitzonderingen; geen onnauwkeurige conclusie “verplicht” uit ontbrekende uren.
- Actie bij onzekerheid: controleer gezamenlijke uren en toepasselijke uitzonderingsgrond; laat bij twijfel de toetsingsroute beoordelen.
- Overlap: werknemerstelling is personen; deze vraag vult de ontbrekende urenuitzondering aan.

### CW2-RIE-05 — Gebruikt instrument

**Vraag:** “Met welk instrument is uw RI&E gemaakt?”

- Opties: een **erkend branche-instrument uit een gecontroleerde catalogus** (`RECOGNIZED_INSTRUMENT`, met versie/branche als selectie binnen deze vraag); **ander instrument of eigen RI&E** (`OTHER`); **dat weet ik niet** (`UNKNOWN`). Geen vrije zelfverklaarde erkenning. Catalogus is een later te verifiëren bronbinding, bestaat nog niet bewezen in de runtime.
- Voorwaarde: P(rie) en 1–25 werknemers of aantal onbekend. Bij bewezen >25 en geen relevante andere uitzondering is het instrument niet nodig voor deze vrijstellingsroute.
- Grondslag/bronnen: Arbowet art. 14 lid 12 en Arbobesluit art. 2.14b; [S2](#s2--toetsing-en-uitzonderingen), [S3](#s3--branche-erkenning).
- Regel: gecontroleerde passende branche/versie + toepasselijke erkenning + maximaal 25 personen kan toetsing NVT maken; niet de RI&E zelf. OTHER is geen tekortkoming: toetsing kan gewoon geregeld zijn. Onbekend aantal/branche/versie/erkenning → vrijstelling niet vastgesteld, geen JA of NVT. Toon `rieTesting` met feitelijke hulp: is toetsing uitgevoerd; gebruiker hoeft niet zelf de wettelijke uitzondering te kwalificeren.
- Actie: controleer gebruikte instrumentversie en geldige erkenning; bij ontbrekende vereiste toetsing deskundige inschakelen. Een inmiddels verlopen cataloguserkenning maakt een historische RI&E niet automatisch ongeldig; relevante datum en overgangsregels eerst beoordelen.
- Overlap: `rieTesting` registreert uitvoering; deze vraag levert de ontbrekende feiten voor de uitzonderingsroute. C01-Q08/Q08A niet als extra derde vergelijkbare vragen toevoegen.

## 4. Drie aanvullende plan-van-aanpakvragen

### CW2-PVA-01 — Concrete maatregelen

**Vraag:** “Staat in het plan van aanpak welke maatregelen u neemt voor de gevonden risico's?” Opties S; voorwaarde P(actionPlan); regel W. Grondslag Arbowet art. 5 lid 3, bron [S1](#s1--rie-en-plan-van-aanpak). Actie: verbind ontbrekende maatregelen aan de vastgestelde risico's. Overlap: `actionPlan` toetst aanwezigheid, deze vraag de minimale inhoud.

### CW2-PVA-02 — Termijnen

**Vraag:** “Staat bij de maatregelen binnen welke termijn ze worden uitgevoerd?” Opties S; voorwaarde P(actionPlan); regel W. Grondslag Arbowet art. 5 lid 3, bron [S1](#s1--rie-en-plan-van-aanpak). Actie: leg uitvoertermijnen vast passend bij de risico's; WorkMatchr verzint geen wettelijke uniforme termijn. Overlap: concrete planning ontbreekt in de huidige vragen.

### CW2-PVA-03 — Opvolging

**Vraag:** “Is afgesproken wie de uitvoering van de maatregelen bewaakt?” Opties S; voorwaarde P(actionPlan); regel R. Basis: praktische borging van Arbowet art. 3/5, geen zelfstandige plicht tot een specifiek WorkMatchr-format; [S1](#s1--rie-en-plan-van-aanpak), [S9](#s9--arbobeleid-en-instructie). Actie: wijs een verantwoordelijke functie aan en spreek een controlemoment af. Geen naam/persoonsgegeven vragen. Overlap: geen huidige vraag naar uitvoeringseigenaarschap.

## 5. Drie aanvullende preventiemedewerkervragen

### CW2-PRE-01 — Deskundigheid

**Vraag:** “Heeft degene die de preventietaken uitvoert voldoende kennis en ervaring voor de risico's in uw organisatie?” Opties S; voorwaarde P(preventionOfficer), inclusief werkgever die taken zelf uitvoert; regel W. Grondslag Arbowet art. 13, [S4](#s4--preventiemedewerker). Actie: bepaal benodigde deskundigheid en organiseer passende ondersteuning/scholing; geen universeel verplicht diploma claimen. Overlap: benoeming is niet deskundigheid.

### CW2-PRE-02 — Tijd en middelen

**Vraag:** “Krijgt degene die de preventietaken uitvoert voldoende tijd en middelen om dit goed te doen?” Opties S; voorwaarde P(preventionOfficer); regel W. Grondslag Arbowet art. 13, [S4](#s4--preventiemedewerker). Actie: maak ruimte en middelen beschikbaar passend bij taken/risico's; geen vast urenaantal. Overlap: geen duplicatie van persoon/positie-instemming.

### CW2-PRE-03 — Uitvoering taken

**Vraag:** “Werkt de preventiemedewerker mee aan de RI&E, het adviseren over maatregelen en de uitvoering daarvan?” Opties S; voorwaarde P(preventionOfficer); regel W. Grondslag Arbowet art. 13 lid 7, [S4](#s4--preventiemedewerker). Actie: organiseer de ontbrekende taak en samenwerking met werknemersvertegenwoordiging/deskundigen. Overlap: bestaande `preventionConsultation` gaat over betrokkenheid bij benoeming, niet taakuitvoering. Geen externe vervanging van interne preventie automatisch als voldoende beoordelen.

## 6. Drie aanvullende BHV-vragen

### CW2-BHV-01 — Alarmering

**Vraag:** “Weten werkenden hoe zij bij een noodsituatie hulp inschakelen en de BHV bereiken?” Opties S; voorwaarde P(bhvOrganized); regel W. Grondslag Arbowet art. 8/15, [S5](#s5--bhv). Actie: maak alarmering bekend en controleer dat deze op de werkplek werkt. Overlap: aangewezen BHV'ers bewijst nog geen bereikbaarheid/bekendheid.

### CW2-BHV-02 — Evacuatie

**Vraag:** “Is geregeld hoe werkenden en andere aanwezigen bij gevaar in veiligheid worden gebracht?” Opties S; voorwaarde P(bhvOrganized); regel W. Grondslag Arbowet art. 15 lid 2, [S5](#s5--bhv). Actie: regel passende ontruimings-/veiligheidsafspraken, ook voor personen die hulp nodig hebben. Geen algemene verplichting tot een specifiek certificaat of vast jaarlijks oefenritme. Overlap: verdieping van noodtaak; niet opleiding/oefenmiddelen opnieuw vragen.

### CW2-BHV-03 — Samenwerking op gedeelde locaties

**Vraag:** “Zijn de afspraken over noodsituaties afgestemd met andere werkgevers op gedeelde werkplekken?” Opties S plus **Wij delen geen werkplek met andere werkgevers** (`NO_SHARED_WORKPLACE`). Voorwaarde E en gedeelde/derdenlocatie mogelijk; onbekend FI2-04 sluit de vraag niet uit. Grondslag Arbowet art. 19 in samenhang met art. 15; [S5](#s5--bhv), [S10](#s10--wettekst-en-verificatiegrens). Regel W; NO_SHARED_WORKPLACE kan alleen deze deelvraag uitsluiten na consistentiecontrole, nooit BHV geheel. Actie: stem verantwoordelijkheden, alarmering en evacuatie af. Overlap: `bhvRiskBased` is algemene inrichting, geen specifieke ketenafspraak.

## 7. Drie aanvullende basiscontractvragen

### CW2-BC-01 — Werkplekbezoek

**Vraag:** “Is afgesproken dat de bedrijfsarts de werkplekken kan bezoeken?” Opties S; voorwaarde P(basicContract); regel W. Grondslag Arbowet art. 14, [S6](#s6--basiscontract). Actie: borg werkplektoegang in afspraken en uitvoering. Overlap: preventief spreekuur voor werknemer is iets anders dan toegang tot werkplek.

### CW2-BC-02 — Second opinion

**Vraag:** “Is geregeld hoe een werknemer een second opinion bij een andere bedrijfsarts kan aanvragen?” Opties S; voorwaarde P(basicContract); regel W. Grondslag Arbowet art. 14 en uitwerking Arbobesluit, [S6](#s6--basiscontract). Actie: regel route en bekendheid; geen gelijkstelling aan UWV-deskundigenoordeel. Overlap: specifiek contractonderdeel naast algemene `expertTasksCovered`.

### CW2-BC-03 — Klachten over bedrijfsarts

**Vraag:** “Is duidelijk hoe werknemers een klacht over de dienstverlening van de bedrijfsarts kunnen indienen?” Opties S; voorwaarde P(basicContract); regel W. Grondslag Arbowet art. 14, [S6](#s6--basiscontract). Actie: controleer klachtenprocedure en maak vindbaar. Overlap: geen klachten over WorkMatchr of algemeen PSA-meldpunt; afzonderlijk onderwerp.

## 8. Twee aanvullende PAGO-vragen

### CW2-PAGO-01 — Inhoud en frequentie

**Vraag:** “Heeft de bedrijfsarts geadviseerd over de inhoud en frequentie van het PAGO op basis van de arbeidsrisico's?” Opties S; voorwaarde P(pagoOffered); regel W voor risicogerichte deskundige invulling, geen willekeurige vaste frequentie. Grondslag Arbowet art. 14/18, [S7](#s7--pago). Actie: vraag bedrijfsarts passend advies; algemeen leefstijl-PMO niet automatisch voldoende. Overlap: aanbod versus deskundig bepaalde inhoud/ritme.

### CW2-PAGO-02 — Vrijwillige deelname

**Vraag:** “Is aan werknemers uitgelegd dat zij zelf kunnen kiezen of zij deelnemen aan het aangeboden PAGO?” Opties S; voorwaarde P(pagoOffered); regel W voor het vrijwillige PAGO. Grondslag aanbodplicht art. 18 en [S7](#s7--pago); bijzondere verplichte keuringen zijn een andere route en worden niet als vrijwillig PAGO beoordeeld. Actie: informeer over aanbod en vrije keuze; geen deelnamepercentages of medische uitslagen opvragen. Overlap: geen huidige vraag over werknemerskeuze.

## 9. Twee aanvullende instructievragen

### CW2-INS-01 — Begrijpelijke instructie

**Vraag:** “Zijn instructies begrijpelijk voor de mensen die het werk doen, rekening houdend met taal, kennis en ervaring?” Opties S; voorwaarde P(instruction); regel W. Grondslag Arbowet art. 8, [S9](#s9--arbobeleid-en-instructie), [S10](#s10--wettekst-en-verificatiegrens). Actie: pas uitleg aan doelgroep aan en controleer begrip. Geen standaard verplichte taaltest. Overlap: aanwezigheid instructie is nog geen doeltreffende instructie.

### CW2-INS-02 — Verandering van werk

**Vraag:** “Is geregeld dat werknemers passende instructie krijgen wanneer hun werk, arbeidsmiddelen of risico's veranderen?” Opties S; voorwaarde P(instruction); regel W. Grondslag Arbowet art. 8, [S9](#s9--arbobeleid-en-instructie). Actie: borg actualisatie bij veranderingen; geen verplichte jaarlijkse cursus verzinnen. Overlap: `supervision` toetst toezicht tijdens werk, niet gewijzigde instructie.

## 10. Twee aanvullende PSA-vragen

### CW2-PSA-01 — Inventariseren

**Vraag:** “Zijn werkdruk en ongewenst gedrag als mogelijke risico's in de RI&E onderzocht?” Opties S; voorwaarde E, niet afhankelijk van PSA-vinkje; regel W. Grondslag Arbowet art. 3 lid 2 en Arbobesluit art. 2.15; [S8](#s8--psa). Actie: onderzoek deze risico's met werknemers; geen nulrisico veronderstellen door afwezigheid van klachten. Overlap: nieuw expliciet onderwerp; `generalPolicy` zegt hier onvoldoende over.

### CW2-PSA-02 — Maatregelen

**Vraag:** “Zijn passende maatregelen tegen de vastgestelde risico's van werkdruk en ongewenst gedrag opgenomen in het plan van aanpak?” Opties S plus **Er zijn bij het onderzoek geen PSA-risico's vastgesteld** (`NONE_IDENTIFIED`). Voorwaarde E en PSA-01 niet NO; bij NO toont parentactie eerst. Regel W; NONE_IDENTIFIED + expliciet uitgevoerd onderzoek + geen tegengesteld bekend signaal maakt alleen deze maatregelvraag niet toepasselijk. PSA-onderwerp niet volledig NVT. Bij twijfel → Niet beoordeeld. Grondslag Arbobesluit art. 2.15, [S8](#s8--psa). Actie: neem gerichte maatregelen op en informeer betrokkenen; geen universele vertrouwenspersoonplicht claimen. Overlap: algemene PvA-maatregelvraag wordt voor dit onderwerp alleen opnieuw gevraagd wanneer het concrete PSA-antwoord ontbreekt; bij aantoonbare volledige eerdere beantwoording hergebruiken en minder vragen tonen.

## 11. Twee aanvullende ongevallenvragen

### CW2-ONG-01 — Later bekend geworden gevolgen

**Vraag:** “Is geregeld dat een arbeidsongeval alsnog direct wordt gemeld als ziekenhuisopname of blijvend letsel pas later bekend wordt?” Opties S; voorwaarde E; regel W. Grondslag Arbowet art. 9 lid 1, [S11](#s11--arbeidsongevallen). Actie: regel wie vervolggegevens beoordeelt en direct meldt; bij een actueel mogelijk meldingsplichtig ongeval eerst officiële meldroute, niet wachten op de wijzer. Overlap: `accidentReporting` noemt criteria, niet de latere informatieplicht.

### CW2-ONG-02 — Omvang registratie

**Vraag:** “Omvat de ongevallenregistratie alle gemelde arbeidsongevallen én ongevallen met meer dan drie werkdagen verzuim, met ten minste aard en datum?” Opties S; voorwaarde P(accidentRegistration); regel W. Grondslag Arbowet art. 9 lid 2, [S10](#s10--wettekst-en-verificatiegrens), [S11](#s11--arbeidsongevallen). Actie: controleer scope en minimale velden van het eigen register; geen ongeval-/slachtofferdata uploaden. Overlap: procesaanwezigheid versus juiste registratiedrempel. Niet “drie dagen of meer” gebruiken.

## 12. Samenloop, conditietests en afbakening betaald

Verdeling: RIE 5 + PVA 3 + PRE 3 + BHV 3 + BC 3 + PAGO 2 + INS 2 + PSA 2 + ONG 2 = **25**. Alle codes zijn uniek. Elke vraag specificeert antwoordopties, voorwaarde, grondslag, bron, regel en actie. De beoordeling van geschiktheid blijft indicatief; een bron rechtvaardigt niet automatisch iedere gekozen productstatus. W/R is een voorstel voor beoordeling, geen citaat uit wetgeving.

De bestaande C01-detailconfig is een derde, niet aan de 21-vragen-UI gelijk te stellen set. C01-Q02/Q07/Q10 overlappen de nieuwe RIE-01/02/03; Q08/Q08A raken de toetsingsroute. Hergebruik één feit in dezelfde nieuwe versie. Q03/Q04/Q05/Q05A/Q06/Q09 zijn niet stil als zes extra gratis vragen toegevoegd. Geen dubbele versie-identiteit; maak expliciete mappings en golden tests. Meer diepgang in bewijsdocumenten, volledige uitzonderingsbeoordeling en specialistische maatregelen hoort in het toekomstige scanontwerp, zonder wettelijke basisinformatie te onthouden aan gratis gebruikers.

Voor alle W/R-vragen test later YES/NO/PARTIAL/UNKNOWN/ontbrekend/ongeldig, parent NO/UNKNOWN/YES, en heropenen na parentwijziging. Extra waarheidstabellen: werknemers 25 versus 26; uren 40 versus meer/onbekend; instrument passend/ongeldig/verlopen/niet bevestigd; geen gedeelde werkplek versus derdenlocatie; PSA NONE_IDENTIFIED versus positief risicosignaal. NVT en positieve bevinding nooit via `notEquals(NO)` afleiden. Vooraf gevulde feiten blijven corrigeerbaar; oude verborgen antwoorden worden uitgesloten van evaluatie zonder de historische snapshot te wissen.

## 13. Primaire bronnen en verificatiegrenzen

Geraadpleegd via web op **15 oktober 2026**. Links hieronder zijn onderbouwing voor dit ontwerp, geen wijziging van `public-sources.ts`, KnowledgeClaim-status of bestaande contentreviewdatums. Geen volledige wetstekst overgenomen.

### S1 — RI&E en plan van aanpak

[Nederlandse Arbeidsinspectie, Veelgestelde vragen RI&E](https://www.nlarbeidsinspectie.nl/onderwerpen/aanleveren-rie/veelgestelde-vragen-rie) koppelt RI&E/PvA/toetsing aan art. 5 en 14 en beschrijft maatregelen en termijnen. [Arboportaal, RI&E](https://www.arboportaal.nl/onderwerpen/arbowet--en--regelgeving/risico-inventarisatie---evaluatie) bevestigt inventarisatie van arbeidsrisico's. Bereikbaar/inhoud gelezen. Detailgrondslag voor inzage en bijzondere groepen aanvullend via S10 te controleren vóór publicatie van regels.

### S2 — Toetsing en uitzonderingen

[Nederlandse Arbeidsinspectie, Veelgestelde vragen RI&E](https://www.nlarbeidsinspectie.nl/onderwerpen/aanleveren-rie/veelgestelde-vragen-rie), onderdeel Wettelijke documenten: <=25 met erkend branche-instrument, uitsluitend vrijwilligers, en betaald personeel gezamenlijk <=40 uur. Geen algemene uitzondering “klein bedrijf”. Deze samenvatting is geen complete scopebepaling voor gemengde/uitzend-/bijzondere situaties; bij onduidelijkheid geen automatische vrijstelling.

### S3 — Branche-erkenning

[Arboportaal, nieuwe erkenningsprocedure, 4 juni 2026](https://www.arboportaal.nl/actueel/nieuws/2026/06/04/nieuwe-erkenningsprocedure-branche-rie) en [Steunpunt RI&E, branche-instrumenten](https://www.rie.nl/hulpmiddelen/branche-rie-instrumenten). Vernieuwde procedure per 1 juni 2026; bestaande erkenningen houden hun einddatum. Een toekomstige catalogus moet versie, branche, geldigheidsperiode en bronrevisie vastleggen. Hier geen erkenningen geïmporteerd.

### S4 — Preventiemedewerker

[Arboportaal, wettelijke preventietaken](https://www.arboportaal.nl/onderwerpen/ondersteuning-bij-arbowet/preventiemedewerker/wat-zegt-de-wet-over-de-preventiemedewerker): art. 13, deskundigheid, tijd, taken en betrokkenheid. Bij maximaal 25 werknemers kan de werkgever onder voorwaarden zelf preventietaken uitvoeren. Geen algemene vrijstelling of algemene externe vervanging afleiden.

### S5 — BHV

[Arboportaal, wet over BHV](https://www.arboportaal.nl/onderwerpen/arbozorg/bedrijfshulpverlening/wat-zegt-de-wet-over-bedrijfshulpverlening) en [bedrijfsnoodplan in de praktijk](https://www.arboportaal.nl/onderwerpen/veiligheid-op-het-werk/bedrijfsnoodplan/bedrijfsnoodplan-in-de-praktijk). Risicogebaseerde organisatie, opleiding en middelen; geen vast aantal per vijftig werknemers. Juridische reikwijdte samenwerking art. 19 nog naast actuele wettekst verifiëren; een praktisch noodplanadvies niet als universele afzonderlijke documentplicht presenteren.

### S6 — Basiscontract

[Arboportaal, onderdelen basiscontract](https://www.arboportaal.nl/onderwerpen/ondersteuning-bij-arbowet/basiscontract/waar-moet-het-basiscontract-aan-voldoen) en [second opinion](https://www.arboportaal.nl/onderwerpen/ondersteuning-bij-arbowet/bedrijfsarts/second-opinion). Onderbouwen werkplektoegang, second opinion en klachtenprocedure. Zelfverklaring over deze drie onderdelen is geen volledige contractreview of automatische medische-keuringsplicht.

### S7 — PAGO

[Arboportaal, PAGO](https://www.arboportaal.nl/onderwerpen/arbowet--en--regelgeving/arbobeleid/pago). Risicogericht aanbod, bedrijfsartsadvies over inhoud/frequentie, vrijwillige deelname; bijzonder voorgeschreven keuringen onderscheiden. Geen medische uitkomsten, diagnoses of deelnamegegevens opslaan.

### S8 — PSA

[Arboportaal, psychosociale arbeidsbelasting](https://www.arboportaal.nl/onderwerpen/psychosociale-arbeidsbelasting). Werkdruk/ongewenst gedrag en preventiebeleid. Artikelen 3 lid 2 Arbowet en 2.15 Arbobesluit vormen de juridische ankers; geen klacht betekent niet dat risico afwezig is. Volledige actuele artikellezing blijft S10-controlepunt.

### S9 — Arbobeleid en instructie

[Arboportaal, arbobeleid](https://www.arboportaal.nl/onderwerpen/arbowet--en--regelgeving/arbobeleid). Voorlichting, instructie en toezicht. Voor begrijpelijkheid/doeltreffendheid en veranderde omstandigheden art. 8 vóór regelpublicatie volledig controleren. Toewijzing van een uitvoeringsbewaker is hier een aanbevolen borgingsmaatregel, geen beweerde aparte wettelijke administratieplicht.

### S10 — Wettekst en verificatiegrens

[Arbeidsomstandighedenwet](https://wetten.overheid.nl/BWBR0010346/) en [Arbeidsomstandighedenbesluit](https://wetten.overheid.nl/BWBR0008498/). Beide rechtstreekse pagina's leverden in het gebruikte webgereedschap een ophaalfout. Daarom **geen claim dat de volledige geconsolideerde teksten op peildatum integraal zijn gecontroleerd**. Officiële Arboportaal/NLA-uitleg is wel gelezen; een geïndexeerde historische wetten.nl-versie bevestigt de formulering van art. 9 lid 2, maar is geen actuele geconsolideerde vervanging.

Vóór inhoudelijke regelpublicatie: deskundige review van art. 1/3/5/8/9/12/13/14/15/18/19 en relevante Arbobesluit-bepalingen, met versie en peildatum. Vooral scope/uitzonderingen, inzage, doelmatige instructie en samenwerking moeten aan de actuele artikellezing worden gekoppeld. Dit is een concrete resterende inhoudelijke acceptatie, geen reden om alvast brede juridische zekerheid te presenteren.

### S11 — Arbeidsongevallen

[Nederlandse Arbeidsinspectie, arbeidsongevallen](https://www.nlarbeidsinspectie.nl/onderwerpen/arbeidsomstandighedenwet/arbeidsongevallen) bevestigt criteria en alsnog direct melden bij later bekend geworden gevolgen. [Meldroute](https://www.nlarbeidsinspectie.nl/onderwerpen/ik-wil-iets-melden/arbeidsongeval-melden) is bereikbaar. Bronnen verschillen in verkorte registratietekst (“meer dan 3 dagen” versus elders “minimaal drie dagen”); ontwerp gebruikt art. 9 lid 2 **meer dan drie werkdagen** en laat actuele wetsconsolidatie nog controleren. Meldpagina noemt ook besmettingsgevaar; niet zonder onderscheid gelijkstellen aan de algemene art. 9-ongevalscriteria. Eventuele aparte biologische meldplichten vallen onder toekomstige verdieping.

### S12 — Werknemersraadpleging

[Arboportaal, wijziging per 1 juli 2026](https://www.arboportaal.nl/actueel/nieuws/2026/06/29/regels-voor-raadpleging-van-werknemers-aangepast-per-1-juli-2026). Gebruik bij de bestaande `workerConsultation`-vraag; ontbreken van OR/PVT is geen vrijstelling voor raadpleging. Maak in nieuwe regels onderscheid tussen algemene raadpleging en specifieke instemming. Geen extra duplicatieve vraag toegevoegd.
