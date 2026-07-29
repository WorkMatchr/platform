# ADR-021 — Van dienstgestuurd naar hulpvraaggestuurd platform

## Status

**Accepted — 27 juli 2026**

Deze ADR legt een product- en architectuurrichting vast. De status `Accepted` autoriseert geen code-, database-, migratie-, route-, test- of configuratiewijzigingen. Implementatie begint pas na afzonderlijke goedkeuring van de voorgestelde fasering.

## Context

WorkMatchr is ontstaan als platform dat organisaties verbindt met maximaal drie passende arbo- en veiligheidsprofessionals. In de bestaande architectuur wordt een hulpvraag daarom relatief vroeg vertaald naar een dienst, capability, opdrachtclassificatie en uiteindelijk een selectie van dienstverleners.

Die keten is technisch sterk: vraagsets en antwoorden zijn versieerbaar, historie is append-only, opdrachten en publicaties gebruiken immutable snapshots, providerkwalificatie is fail-closed en matching is deterministisch en uitlegbaar. De productingang is echter nog te vaak dienstgestuurd. Begrippen als RI&E, bedrijfsarts, arbeidshygiënist en veiligheidskundige verschijnen al voordat vaststaat welk probleem de ondernemer werkelijk wil oplossen.

Een ondernemer begint doorgaans niet met een correct geclassificeerde dienstvraag. De ondernemer ervaart bijvoorbeeld:

- onduidelijkheid over wettelijke verplichtingen;
- een verandering in werkzaamheden of organisatie;
- een incident, klacht of terugkerend risico;
- uitval, verzuim of zorgen over gezondheid;
- onzekerheid over een bestaand document of proces;
- behoefte aan betrouwbare uitleg voordat externe hulp wordt ingekocht.

De huidige publieke homepage en Module 7 bewegen al richting herkenbare situaties, kennis vóór dienstverlening en gerichte vraagverheldering. Deze ADR maakt die beweging leidend voor het gehele product.

## Probleemstelling

Een dienstgestuurde architectuur veroorzaakt vijf structurele risico’s:

1. **Premature classificatie.** Het platform kiest impliciet al een oplossing voordat de situatie voldoende is begrepen.
2. **Cognitieve belasting.** De ondernemer moet vaktermen, wettelijke rollen en diensten begrijpen om de juiste ingang te kiezen.
3. **Tunnelvisie.** Eén herkenbaar signaal kan naar meerdere kennis- of oplossingsrichtingen wijzen, maar een vroeg gekozen dienst vernauwt de route.
4. **Verkeerde downstreamdata.** Matching kan technisch correct zijn op basis van een onjuist of te vroeg vastgesteld servicecriterium.
5. **Onvoldoende productdifferentiatie.** Een catalogus van diensten en professionals maakt WorkMatchr vergelijkbaar met een gewone marktplaats, terwijl de kernwaarde juist ligt in begrijpen, duiden en verantwoord doorgeleiden.

## Besluit

WorkMatchr wordt architectonisch hulpvraaggestuurd.

De primaire keten wordt:

```text
situatie of probleem
→ verduidelijkte hulpvraag
→ bevestigde feiten en onzekerheden
→ relevante kennis en wettelijke context
→ mogelijke oplossingsrichtingen
→ besluit of professionele ondersteuning wenselijk is
→ vereisten aan professionele ondersteuning
→ deterministische matching
→ maximaal drie passende professionals
```

Een dienst, capability of beroepsrol is geen verplichte ingang en geen vroege systeemaanname. Deze begrippen blijven bestaan als downstreamtaxonomieën voor kennis, uitvoering, kwalificatie en matching.

De gebruiker bevestigt zijn situatie en relevante feiten voordat een professionele ondersteuningsbehoefte als selectie-input mag worden gebruikt. Onzekerheid blijft als expliciete toestand bestaan en wordt niet stil ingevuld.

## Missie

> WorkMatchr helpt ondernemers met een vraag, uitdaging of probleem om inzicht te krijgen in hun situatie, betrouwbare kennis te vinden en – wanneer nodig – de juiste professionele ondersteuning te vinden.

## Productvisie

WorkMatchr verkoopt geen vooraf gekozen dienst. Het platform ondersteunt een ondernemer bij vier opeenvolgende doelen:

1. **Begrijpen:** wat speelt er, welke feiten zijn bekend en wat is nog onzeker?
2. **Weten:** welke betrouwbare kennis, verplichtingen en handelingsmogelijkheden zijn relevant?
3. **Beslissen:** is zelf handelen verantwoord, is nader onderzoek nodig of is professionele ondersteuning wenselijk?
4. **Verbinden:** welke aantoonbaar gekwalificeerde professional past bij de bevestigde behoefte?

WorkMatchr helpt de gebruiker om een goed besluit te nemen, maar neemt zijn bestuurlijke, juridische of professionele verantwoordelijkheid niet over.

## Nieuw domeinmodel

### Situation

De herkenbare aanleiding waarmee de gebruiker begint. Een situatie is breed en menselijk geformuleerd, bijvoorbeeld “Er is een incident gebeurd” of “Ik weet niet of wij alles goed geregeld hebben”. Een situatie is geen dienstclassificatie.

### HelpRequest

De door de gebruiker bevestigde omschrijving van de vraag, uitdaging of het probleem. De originele invoer blijft als broninhoud behouden; latere verduidelijking overschrijft die bron niet.

### ContextFact

Een herleidbaar, getypeerd feit dat door de gebruiker is gegeven, uit een betrouwbare bron komt of door een expliciete regel is afgeleid. Elk feit heeft minimaal een bron, status, versie en eventuele geldigheid.

### Uncertainty

Een expliciet gemarkeerde onbekende of onbevestigde omstandigheid. Onzekerheid is geen fout en wordt niet automatisch negatief of positief geïnterpreteerd.

### GuidanceQuestion

Een versieerbare vraag met een aantoonbaar beslisdoel. Een vraag mag alleen worden gesteld wanneer het antwoord een relevant feit, een relevante onzekerheid of een noodzakelijke procesbeslissing oplevert.

### GuidanceOutcome

Een reproduceerbare uitkomst van de Guidance Engine met:

- samenvatting van de bevestigde situatie;
- relevante feiten en onzekerheden;
- kennisbehoeften;
- mogelijke oplossingsrichtingen;
- reden waarom professionele ondersteuning wel, mogelijk of niet direct nodig is;
- gebruikte regelset- en bronversies.

Een GuidanceOutcome is geen diagnose, juridisch besluit, opdracht of matchresultaat.

### KnowledgeNeed

Een expliciete behoefte aan uitleg of wettelijke context. Een KnowledgeNeed verwijst naar gecontroleerde kennisobjecten en kan op zichzelf een geldig eindpunt zijn zonder account, opdracht of professional.

### SolutionDirection

Een niet-commerciële oplossingsrichting, zoals intern controleren, beleid actualiseren, nader onderzoek doen, direct veiligheidsmaatregelen treffen of deskundige ondersteuning overwegen. Een oplossingsrichting is nog geen product of dienst.

### ProfessionalSupportNeed

De door de gebruiker bevestigde noodzaak of wens voor externe professionele ondersteuning. Dit object vormt de grens tussen guidance en marktverwerking.

### ProfessionalRequirement

Een minimale, versieerbare selectieprojectie van de gewenste uitkomst en noodzakelijke expertise. Zij kan capability-, kwalificatie-, sector-, regio-, leveringsvorm- en compliancecriteria bevatten, maar alleen wanneer deze herleidbaar zijn naar bevestigde feiten, expliciete voorkeuren of gepubliceerde regels.

### Assignment

Een opdracht blijft het zakelijke, tenantgebonden procesobject nadat een bevoegde gebruiker expliciet indient. Niet iedere HelpRequest of GuidanceOutcome wordt een Assignment.

### ProviderCapability en ProfessionalQualification

Deze bestaande downstreambegrippen blijven nodig om aantoonbaar te beschrijven wat een dienstverlener kan en welke professional bevoegd is. Zij worden gekoppeld aan problemen, gewenste uitkomsten en ondersteuningsbehoeften, maar vervangen die niet.

## Ontwerpprincipes

### Hulpvraag vóór dienst

Een brede situatie wordt nooit automatisch vertaald naar één dienst. Diensten verschijnen pas nadat de gebruiker de situatie begrijpt en professionele ondersteuning relevant blijkt.

### Feiten vóór classificatie

Een systeemclassificatie moet terug te voeren zijn op bevestigde feiten en een gepubliceerde regelset. Het platform bewaart onderscheid tussen gebruikersinhoud, systeeminterpretatie en formele procesbesluiten.

### Kennis is een volwaardig resultaat

Een gebruiker mag eindigen met betrouwbare uitleg en concrete eerste stappen. Registratie, opdrachtvorming of matching is niet voor iedere hulpvraag de gewenste conversie.

### Onzekerheid blijft zichtbaar

“Dat weet ik niet” is betekenisvolle informatie. De engine bepaalt expliciet of de onzekerheid veilig kan blijven bestaan, later opnieuw moet worden gevraagd of professionele beoordeling nodig maakt.

### Oplossingsrichting vóór professionele rol

Het systeem motiveert eerst welk resultaat of welk soort ondersteuning nodig kan zijn. Pas daarna wordt vastgesteld welke capability of beroepskwalificatie daarbij hoort.

### Geen verborgen diagnose

WorkMatchr geeft geen medische diagnose, juridisch oordeel of professionele eindbeoordeling. Acute of risicovolle situaties gebruiken vooraf goedgekeurde, fail-closed verwijspaden.

### Confirm before consequence

Een afgeleide classificatie met gevolgen voor opdrachtvorming of matching wordt zichtbaar gemaakt en door de gebruiker bevestigd of gecorrigeerd.

### Versieerbaar en reproduceerbaar

Vragen, regels, kennisrelaties, classificaties en professionele vereisten hebben versies. Historische uitkomsten blijven reconstrueerbaar.

### Governance before Automation

Een guidance-uitkomst publiceert geen opdracht, start geen matching en nodigt geen professional uit. Iedere vervolgstap behoudt bestaande bevoegdheids- en bevestigingsgrenzen.

## UX-gevolgen

- De primaire publieke ingang gebruikt situaties, vragen en problemen in gewone ondernemerstaal.
- Diensten en professionaltypen blijven vindbaar voor bezoekers die al weten wat zij zoeken, maar zijn niet de standaardroute.
- De Advieswijzer stelt alleen vragen met een aantoonbaar beslisdoel en toont waarom informatie nodig is.
- De gebruiker ziet eerst een begrijpelijke situatiesamenvatting, relevante kennis en mogelijke vervolgstappen.
- Een professionele route wordt geformuleerd als “welke ondersteuning kan helpen” en niet als een onverklaarde dienstconclusie.
- De gebruiker kan een systeeminterpretatie aanpassen voordat deze downstreamgevolgen heeft.
- Een informatieroute kan zonder account eindigen.
- Registratie wordt pas gevraagd wanneer bewaren, indienen of een persoonlijke vervolgactie aantoonbare waarde heeft.
- UX-termen zoals “dienst kiezen”, “provider selecteren” en technische classificatiecodes verdwijnen uit de vroege flow.
- Bestaande toegankelijkheidsprincipes, compacte presentatie, focusbeheer en foutbehoud blijven leidend.

## Gevolgen voor de Guidance Engine

De deterministische intake-engine wordt productmatig de **Guidance Engine**. De naam maakt duidelijk dat zij de gebruiker begeleidt en geen formeel besluit overneemt.

De Guidance Engine:

- leest situaties, antwoorden, feiten, onzekerheden, vraagdefinities en versieerbare regels;
- bepaalt de volgende relevante vraag;
- voorkomt dubbele vragen;
- levert GuidanceOutcomes, KnowledgeNeeds en mogelijke SolutionDirections;
- motiveert elke afleiding met bronfeiten en regelcodes;
- bepaalt of voldoende informatie bestaat voor een samenvatting;
- bepaalt niet zelfstandig welke provider wordt geselecteerd;
- maakt geen Assignment;
- start geen matching;
- gebruikt in de eerste versies geen AI.

De term **Decision Engine** blijft uitsluitend bruikbaar voor de reeds bestaande, afzonderlijke deterministische selectielaag zolang die documentatie niet gecontroleerd is hernoemd. Nieuwe documentatie moet `Guidance Engine` en `Matching Engine` strikt onderscheiden.

## Gevolgen voor Matching

De Matching Engine blijft deterministisch, versieerbaar, uitlegbaar en auditbaar. Knock-outs, scoring, tie-breakers, maximaal drie kandidaten, immutable rapporten en uitsluiting van commerciële invloed blijven intact.

De inputgrens verandert:

```text
voorheen:
opdracht met vroeg gekozen dienst/capability
→ matching

voortaan:
bevestigde GuidanceOutcome
→ expliciete ProfessionalSupportNeed
→ versieerbare ProfessionalRequirement
→ bevoegde indiening en publicatie
→ matching
```

Matching interpreteert geen vrije hulpvraagtekst. Zij leest uitsluitend een gecontroleerde, immutable ProfessionalRequirement-/opdrachtsnapshot. De herkomst van ieder hard of gewogen criterium blijft herleidbaar naar:

- een bevestigd gebruikersfeit;
- een expliciete gebruikersvoorkeur;
- een gepubliceerde domeinregel;
- een bevoegde menselijke correctie met audit.

## Gevolgen voor professional-profielen

Professional- en providerprofielen blijven noodzakelijk, maar hun presentatiemodel verschuift:

- van “welke diensten verkoopt u?” naar “bij welke problemen en gewenste uitkomsten kunt u aantoonbaar ondersteunen?”;
- capabilities blijven centrale, versieerbare taxonomiecodes;
- persoonsgebonden kwalificaties blijven gescheiden van organisatieclaims;
- marketingtekst blijft buiten selectie;
- probleem-, uitkomst- en capabilityrelaties moeten expliciet worden beheerd;
- providerkwalificatie, verificatie, readiness en selecteerbaarheid blijven afzonderlijk;
- een provider kan niet zelf bepalen voor welke hulpvragen hij matcht door vrije tekst of tags toe te voegen;
- de Trusted Provider Projection blijft minimaal en bevat alleen gevalideerde selectiefeiten.

ADR-008, ADR-010 en ADR-011 blijven leidend voor bewijs, review, vier ogen en immutable dossiercandidates.

## Gevolgen voor het Kenniscentrum

Het Kenniscentrum wordt niet alleen per dienst of wettelijke verplichting ontsloten, maar ook via:

- herkenbare situaties;
- ondernemersvragen;
- feiten en onzekerheden;
- risico- en verandertriggers;
- oplossingsrichtingen;
- momenten waarop professionele ondersteuning verstandig is.

Kennisobjecten behouden bronnen, controledatum, publicatiestatus en inhoudstype. Nieuwe relaties worden expliciet, directioneel en versieerbaar. Populariteit of commerciële waarde bepaalt niet welke kennis als eerste wordt getoond.

Een kennisartikel kan het passende eindresultaat van een guidanceflow zijn. Een CTA naar dienstverlening is contextueel en volgt pas na de inhoudelijke uitleg.

## Gevolgen voor toekomstige AI-classificatie

AI kan in een toekomstige, afzonderlijk goedgekeurde fase helpen om vrije tekst te structureren of mogelijke categorieën voor te stellen. AI krijgt geen bevoegdheid om:

- een definitieve hulpvraagclassificatie vast te stellen;
- een professionele noodzaak te bepalen;
- een hard matchingcriterium te creëren;
- een opdracht te publiceren;
- een provider te selecteren;
- wettelijke of medische zekerheid te suggereren.

Minimale toekomstige voorwaarden:

- expliciete AI-governance en privacygrondslag;
- bekende model- en promptversie;
- doelgebonden minimale invoer;
- geen training op gebruikersinhoud zonder afzonderlijke grondslag;
- bron- en evidencebeleid;
- zichtbare onzekerheid;
- deterministische validatie van toegestane output;
- gebruiker bevestigt of corrigeert de interpretatie;
- menselijke review bij hoog risico;
- audit van voorstel, gebruikte context en uiteindelijke bevestiging;
- veilige uitval naar deterministische vragen en regels.

AI is ondersteunend en nooit de primaire waarheid.

## Niet-doelen

Deze ADR:

- implementeert geen nieuwe intakeflow;
- wijzigt geen Prisma-schema, database of migratie;
- hernoemt geen bestaande code;
- vervangt geen bestaande historische data;
- bouwt geen AI, LLM, embedding of vector search;
- ontwerpt geen medische triage of juridisch adviessysteem;
- maakt geen publieke providerzoekmachine;
- wijzigt geen credits, offertes, gunning, berichten of betalingen;
- schaft diensten, capabilities of professionele kwalificaties niet af;
- maakt matching niet probabilistisch of semantisch;
- past bestaande ADR’s in deze sessie niet aan.

## Praktijkvoorbeelden

### Voorbeeld 1 — Nieuwe medewerkers

De ondernemer zegt: “Wij nemen voor het eerst personeel aan en weten niet wat wij moeten regelen.”

WorkMatchr:

1. stelt vragen over organisatiecontext en bestaande maatregelen;
2. toont betrouwbare kennis over relevante werkgeversverplichtingen;
3. maakt zichtbaar welke zaken intern kunnen worden geregeld;
4. benoemt onzekerheden;
5. stelt pas daarna mogelijke professionele ondersteuning voor.

Het systeem kiest niet bij de eerste zin automatisch “RI&E-dienst”.

### Voorbeeld 2 — Bijna-ongeval

De ondernemer meldt een bijna-ongeval.

WorkMatchr:

1. controleert via goedgekeurde veiligheidsregels of onmiddellijke actie of externe melding relevant kan zijn;
2. helpt feiten, betrokken werkzaamheden en bestaande maatregelen structureren;
3. toont passende kennis over onderzoek en preventie;
4. onderscheidt directe beheersmaatregelen van later onderzoek;
5. vertaalt een bevestigde ondersteuningsbehoefte eventueel naar vereisten voor incidentonderzoek of veiligheidsadvies.

### Voorbeeld 3 — Verzuim en gezondheidsklachten

De ondernemer meldt oplopend verzuim.

WorkMatchr:

1. vraagt geen medische dossiers of diagnoses;
2. verduidelijkt zakelijke context en het gewenste handelingsdoel;
3. toont algemene kennis en verantwoordelijkheden;
4. maakt duidelijk wanneer contact met bestaande arbodienst of bedrijfsarts passend kan zijn;
5. voorkomt dat WorkMatchr zelf een medische conclusie trekt.

### Voorbeeld 4 — Bestaande RI&E

De ondernemer weet al dat de RI&E moet worden geactualiseerd.

WorkMatchr mag deze concrete hulpvraag als gerichte ingang gebruiken, maar controleert nog steeds relevante context. De gebruiker hoeft niet door brede oriënterende vragen die geen nieuw beslisfeit opleveren.

### Voorbeeld 5 — Alleen informatie

De ondernemer vraagt wat een preventiemedewerker doet.

WorkMatchr toont betrouwbare uitleg, wettelijke context en praktische vervolgstappen. Er ontstaat niet automatisch een conceptopdracht en registratie is niet verplicht.

## Consequenties

### Positief

- WorkMatchr sluit beter aan op de taal en het denkproces van ondernemers.
- Kennis, guidance en matching vormen één begrijpelijke maar begrensde keten.
- Matching krijgt betrouwbaardere en beter herleidbare input.
- Informatievraag en commerciële conversie worden niet verward.
- Het platform onderscheidt zich van catalogi en algemene marktplaatsen.
- Toekomstige AI kan binnen een duidelijke, controleerbare grens worden toegevoegd.

### Negatief en kostbaar

- intake-, kennis-, opdracht- en matchingcontracten moeten opnieuw op elkaar worden afgestemd;
- bestaande dienstgestuurde entrypoints en classificaties vragen compatibiliteitsbeleid;
- probleem-, uitkomst-, kennis- en capabilitytaxonomieën vragen inhoudelijk beheer;
- uitleg en bevestiging voegen soms bewuste frictie toe;
- analytics moeten informatie-uitkomsten waarderen en niet alleen opdrachtconversie;
- bestaande termen “Decision Engine” en “matching” zijn in documentatie niet overal eenduidig.

### Risico’s

- een te breed hulpvraagmodel kan tot lange of vage intakeflows leiden;
- een te vroege oplossingssuggestie kan dienststuring onder een andere naam worden;
- onbeheerste taxonomieën kunnen nieuwe semantische inconsistentie creëren;
- informatie kan onbedoeld als individueel juridisch of medisch advies worden gelezen;
- een guidanceclassificatie kan downstream te veel autoriteit krijgen;
- backward compatibility kan historische rapporten onreproduceerbaar maken wanneer versiegrenzen ontbreken.

Deze risico’s worden beheerst met korte doelgerichte vragen, expliciete onzekerheid, gebruikerbevestiging, versiebeheer, immutable snapshots, fail-closed overdrachtsgrenzen en afzonderlijke acceptatie per implementatiefase.

## Relatie met bestaande besluiten

Wanneer deze ADR inhoudelijk conflicteert met een lager architectuur- of modulebesluit, is de hulpvraaggestuurde richting leidend. Bestaande historie en geïmplementeerde transacties worden niet stil herschreven. De precieze conflicten en vereiste aanvullingen staan in de [architectuur- en impactanalyse](../adr-021-hulpvraaggestuurde-productarchitectuur-impactanalyse.md).

## Implementatiestatus

- Implementatiefase A introduceert uitsluitend de losstaande, getypeerde domeinfundering.
- Implementatiefase B voegt het immutable hulpvraag- en Guidance Contract en structurele validatie toe.
- Implementatiefase C voegt Guidance Engine v2 toe als pure, deterministische placeholder-pipeline zonder inhoudelijke classificatie.
- De eerste expliciete ruleset voegt uitsluitend kennisgerichte regels toe voor `RIE`, `INCIDENT` en `HAZARDOUS_SUBSTANCES`; professionele ondersteuning blijft optioneel en onbevestigd.
- Implementatiefase E voegt [Clarification Engine v1](../clarification-engine-v1.md) toe als afzonderlijke, deterministische bepaling van maximaal één volgende verduidelijkingsvraag.
- Implementatiefase F koppelt de bestaande Public Intake via een [immutable, afgeleid draft-read-model](../public-intake-guidance-handoff.md) aan Clarification Engine v1 en Guidance Engine v2, zonder nieuwe persistence of downstreamproces.

Deze fasen zijn beschreven in de [Guidance Domain Foundation](../guidance-domain-foundation.md). Bestaande intake-, opdracht-, matching-, provider- en kennisflows gebruiken de contracten en engine nog niet.

---

## Addendum A — AI Intake Classifier

### Doel en afbakening

De AI Intake Classifier mag uitsluitend helpen bij het begrijpen van de eerste
vrije hulpvraag. De classifier doet een voorstel voor een bekend onderwerp,
zodat de ondernemer niet bij iedere vrije vraag met dezelfde neutrale
onderwerpkeuze hoeft te beginnen.

Het voorstel is nooit een vastgesteld feit, besluit of GuidanceOutcome. De
gebruiker bevestigt of corrigeert het voorstel voordat de bestaande
deterministische Clarification Engine het als `Situation.code` mag gebruiken.

> AI helpt WorkMatchr de ondernemer beter te begrijpen.
>
> AI neemt nooit beslissingen namens WorkMatchr.

### Architectuur en verantwoordelijkheidsgrens

```text
vrije hulpvraag
→ AI Intake Classifier
→ voorgesteld onderwerp
→ gebruiker bevestigt of corrigeert
→ Clarification Engine
→ Guidance Engine
→ GuidanceOutcome
```

De AI Intake Classifier is een optionele, niet-gezaghebbende laag vóór de
Clarification Engine. De bestaande deterministische flow blijft de betrouwbare
fallback en de enige route wanneer geen geldig, bevestigd voorstel beschikbaar
is.

De classifier mag:

- vrije tekst analyseren;
- één bekend primair onderwerp voorstellen;
- één bekend secundair onderwerp voorstellen;
- een confidencecategorie teruggeven;
- alternatieve bekende onderwerpen voorstellen.

De classifier mag nooit:

- wettelijke, medische of inhoudelijke eindconclusies trekken;
- professionele ondersteuning verplicht stellen;
- een professional, dienstverlener of dienst kiezen;
- een opdracht starten of publiceren;
- matching, selectie of uitnodigingen uitvoeren;
- een GuidanceOutcome produceren;
- databasegegevens, drafts, antwoorden of lifecycle-statussen muteren.

### Confidence en presentatie

Confidence bepaalt alleen hoe voorzichtig WorkMatchr het voorstel presenteert.
Confidence heeft geen zelfstandig gevolg voor guidance, opdrachtvorming of
matching.

| Confidence | Presentatie |
| --- | --- |
| Hoog | Toon één voorstel met: “Wij denken dat uw vraag hierover gaat.” De gebruiker bevestigt of corrigeert. |
| Midden | Toon meerdere bekende mogelijke onderwerpen. De gebruiker kiest expliciet. |
| Laag | Toon geen AI-voorstel en gebruik de bestaande neutrale vraag: “Waar gaat uw vraag vooral over?” |

De precieze, versieerbare drempels voor hoog, midden en laag worden pas in een
afzonderlijke implementatiebeslissing vastgesteld. Een hoge confidence vervangt
nooit gebruikersbevestiging.

### Strikt outputcontract

De classifier retourneert uitsluitend een strikt gevalideerd object. Het
conceptuele contract bevat:

```text
PrimarySubject
SecondarySubjects
Confidence
Alternatives
```

Voor dit contract gelden de volgende regels:

- `PrimarySubject` is één bekende onderwerpcode, inclusief de veilige code
  `UNKNOWN`;
- `SecondarySubjects` bevat nul of meer unieke bekende onderwerpcodes;
- `Confidence` is uitsluitend `HIGH`, `MEDIUM` of `LOW`;
- `Alternatives` bevat uitsluitend unieke bekende onderwerpcodes;
- het resultaat bevat geen vrije tekst, advies, HTML, uitleg, wetsinterpretatie
  of professionele vereisten.

Alle onderwerpcodes komen uit een vooraf toegestane, versieerbare taxonomie.
Een output wordt pas aan de gebruiker getoond nadat schema, omvang, typen en
toegestane waarden server-side zijn gevalideerd.

### Security en fail-safe

AI-output is onbevoegde invoer en wordt nooit rechtstreeks vertrouwd. WorkMatchr:

- accepteert uitsluitend bekende onderwerp- en subonderwerpcodes;
- verwerpt onbekende waarden en extra velden;
- begrenst invoer- en uitvoerlengte;
- behandelt modeltekst buiten het outputcontract als ongeldig;
- gebruikt het resultaat niet als bevestigd `ContextFact`;
- voorkomt dat instructies uit gebruikersinvoer bevoegdheden of systeemregels
  wijzigen;
- houdt de classifier buiten database- en lifecyclemutaties.

WorkMatchr valt volledig terug op de huidige deterministische onderwerpvraag
wanneer de classifier:

- niet bereikbaar is of een timeout geeft;
- geen resultaat retourneert;
- ongeldige of onvolledige output levert;
- een onbekende code retourneert;
- een lage confidence aangeeft.

Een AI-storing blokkeert de intake dus niet en veroorzaakt geen inhoudelijke
conclusie. De gebruiker kan altijd zelf een bekend onderwerp kiezen of de
unsupported, fail-closed route volgen.

### Consequenties en niet-doelen

Het addendum verandert de verantwoordelijkheden van de Clarification Engine,
Guidance Engine, Matching Engine en bestaande governance niet. AI levert alleen
een corrigeerbaar voorstel aan de gebruiker. Pas de expliciet bevestigde keuze
mag de deterministische keten binnengaan.

Implementatiefase H realiseert de optionele provider-onafhankelijke classifier
en de eerste OpenAI-implementatie. De technische werking, configuratie,
privacygrens en fallback staan in
[AI Intake Classifier v1](../ai-intake-classifier-v1.md). Het AI-resultaat
wordt niet persistent opgeslagen; alleen de expliciete bevestiging of correctie
van de gebruiker volgt het bestaande antwoordpad.

Ook na implementatiefase H worden geen GuidanceOutcome,
ProfessionalRequirement, Assignment of matchingcriteria door AI afgeleid.
