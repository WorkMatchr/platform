# F4 — juridisch reviewer-dossier (issue #50)

Aanvulling 19 oktober 2026: [RI&E-review in twee deelcontroles](compliance-f4-rie-legal-review.md) werkt de zeven geselecteerde vragen, 21 antwoordregels, 28 antwoordvarianten en beide toetsingsuitzonderingen uit. Dit is een reviewvoorstel; RIETESTING blijft Niet beoordeeld en menselijke vrijgave blijft open.

**NO-GO voor juridische vrijgave en frameworkpublicatie.** Voorbereid op 18 oktober 2026 voor Draft PR #49, NL_ARBO_GUIDE / 2.1. Alle menselijke beslisvelden zijn leeg. Geen claim-, regel-, vraag- of productiestatus gewijzigd.

## Bewijsgrens en werkwijze

De [JSON-matrix](compliance-f4-review-dossier.json) bevat 46 afzonderlijke claimdossiers en 141 afzonderlijke regelbeoordelingen (131 antwoordregels + 10 scope-onzekerheidsregels), exacte bestaande ID’s, templatechecksums, voorwaarden, bronverwijzingen en beslisvelden. De [107 wetsblokken](compliance-f4-review-source-blocks.json) zijn read-only opgehaald; 107/107 SHA-256-hashes van de exacte UTF-8-tekst stemmen overeen met de bestaande inventaris. De bronblok-ID’s zijn geen citatiegoedkeuringen.

De geconsolideerde Arbowet en het Arbobesluit zijn niet onafhankelijk actueel verifieerbaar: algemene URLs geven HTTP 429; de gedateerde URLs geven cachefouten. Bestaande importrevisies 2026-07-01_0 en 2026-08-01_0 blijven REVIEW_REQUIRED. De originele volledige bronbestanden zijn niet opnieuw gehasht. De exact aangehaalde bepalingen staan daarom als kandidaatgrondslag, niet als definitief geverifieerde actuele wet.

VERIFIED_SOURCE = alleen technisch geraadpleegde broninhoud; REVIEW_REQUIRED = nadere review nodig; INSUFFICIENT_EVIDENCE = onvoldoende exact primair bewijs. Dit zijn dossierlabels, geen Knowledge-statussen. Officiële voorlichting ondersteunt interpretatie maar vervangt de wet of de menselijke beoordeling niet.

Een bestaande claimbinding naar F4 ontbreekt voor alle claims. Kandidaten hieronder zijn zoekingangen, geen nieuw gelegde DIRECT_SUPPORT-bindingen. Specialistische historische claims buiten F4 blijven apart herkenbaar; hun ontbrekende artikelen/leden worden niet verzonnen.

## Juridische risico’s — eerst beoordelen

| Prioriteit | Risico | Veilige beperking / vereiste beslissing |
| --- | --- | --- |
| P0 | RI&E-toetsingsvrijstelling | Gezamenlijke 40 uur, DGA, maximaal 25, cao-model/erkend instrument, geldigheid en bedrijfsspecifieke toepassing afzonderlijk bevestigen. RIETESTING-hold behouden. |
| P0 | Werkgeversscope en NVT | Vrijwilligers/ingeleenden/gezag en AB 9.5a ontbreken in een volledige scopebinding; geen algemene vrijstelling. Tien scoperegels blijven Niet beoordeeld. |
| P0 | Arbeidsongevallen | Feitelijke gebeurtenissen en bekendwording ontbreken. Meldkennis/procedure is geen melding/register. Drie ongevalsholds behouden. |
| P0 | Onterecht Op orde | Onbekend/ontbrekend nooit groen. YES is zelfverklaring. NONE_IDENTIFIED bij PSA en NO_SHARED_SITE bij BHV vragen afzonderlijke bewijscontrole. |
| P0 | Wettelijke uitzondering versus algemene voorlichting | Onder meer preventiemedewerker, second opinion en scope niet reduceren tot een algemene samenvatting. |
| P1 | Praktische aanbeveling als wet | CW2-PVA-03 is praktisch; PDCA, BHV-plan, vaste cursussen en diploma’s niet zonder grondslag verplicht stellen. |

### Verschillen en open bronvragen

- Rijksoverheid noemt vrijwilligers in een brede personeelsopsomming; Arboportaal vermeldt specifieke uitzonderingen en AB 9.5a. Een reviewer moet de geconsolideerde scopebepalingen vaststellen; geen vereenvoudigde automatische vrijstelling.
- Rijksoverheid beschrijft vervanging als de werkgever zelf BHV uitvoert. Dat ondersteunt niet automatisch de gecombineerde vraag over aanwijzing én vervanging voor elke organisatie. BHVAPPOINTED blijft geblokkeerd.
- De geïmporteerde sectionPath bij AW 1 bevat genummerde “Onderdeel 12/13”; dat zijn extractielabels, geen te citeren wettelijke letters. Exacte wettelijke lid/onderdeel-identiteit moet met de originele consolidatie worden gecontroleerd.
- AW 5 lid 5 betreft terbeschikkingstelling, niet alle bijzondere groepen. Voor CW2-RIE-02 moeten AW 5 lid 1, AB 1.36 en 1.41 ieder op hun eigen toepasselijkheid worden gekoppeld.
- AI-11 heeft een historisch fragment met sectie “NEE”: extractie/context eerst herstellen of verifiëren. Geen machineveiligheidsoordeel uit die kop.
- Sommige historische claims vragen Arboregeling, Arbeidstijdenwet of medische/ergonomische bronnen buiten AW/AB. Ontbrekende primaire fragmenten zijn expliciet als INSUFFICIENT_EVIDENCE vastgelegd.

## Aanvullende primaire kandidaatfragmenten

Het [bronfragment-supplement](compliance-f4-review-supplement.json) bevat 81 aanvullende opgeslagen AB-fragmenten voor 24 specialistische claims en AB 9.5a (vrijwilligers). Alle 81 teksthashes zijn gecontroleerd; samen 188 fragmenten. Kopblokduplicaten zijn niet als normtekst opgenomen. Dit verandert geen claimstatus of publicatiebinding. De specialistische claims blijven buiten de 141 regels waar geen expliciete kandidaatrelatie bestaat.

Twee claims hebben nog geen primair normfragment: ai-02:c7 is alleen een historisch normenoverzicht; ai-12:review:c2 vraagt daarnaast de Arbeidstijdenwet. Voor medische/ergonomische causaliteit kan een algemeen AB-voorschrift niet zelfstandig volstaan. INSUFFICIENT_EVIDENCE blijft daarom bestaan ook waar een relevant kandidaatartikel is gevonden.

## Broncontrole

| Sleutel | Bron | Bevinding | Controle |
| --- | --- | --- | --- |
| SCOPE | [Algemene rechten & plichten van werkenden](https://www.arboportaal.nl/onderwerpen/rechten-plichten-werkenden/algemene-rechten--plichten-van-werkenden) | Vrijwilligers kennen uitzonderingen; inleners en uitleners hebben verschillende verantwoordelijkheden. De samenvatting vervangt AW 1/16 en AB 9.5a niet. | VERIFIED_SOURCE; WEB_PAGE_CONTENT_READ; 18-10-2026 |
| POLICY | [Arbobeleid](https://www.arboportaal.nl/onderwerpen/arbowet--en--regelgeving/arbobeleid) | Beleid, RI&E, preventie en periodieke evaluatie. Een PDCA-werkwijze is niet hetzelfde als een verplicht managementsysteem. | VERIFIED_SOURCE; WEB_PAGE_CONTENT_READ; 18-10-2026 |
| RIE | [Veelgestelde vragen RI&E](https://www.nlarbeidsinspectie.nl/onderwerpen/aanleveren-rie/veelgestelde-vragen-rie) | De toetsingsplicht kent uitzonderingen. De 40-uursroute betreft gezamenlijke arbeidsduur; de maximaal-25-route vereist aanvullende instrumentvoorwaarden. | VERIFIED_SOURCE; WEB_PAGE_CONTENT_READ; 18-10-2026 |
| RECOGNITION | [Nieuwe erkenningsprocedure branche-RI&E](https://www.arboportaal.nl/actueel/nieuws/2026/06/04/nieuwe-erkenningsprocedure-branche-rie) | Nieuwe procedure vanaf 1 juni 2026; bestaande erkenningen tot hun einddatum. Erkenning van de gebruikte instrumentversie moet afzonderlijk worden bewezen. | VERIFIED_SOURCE; WEB_PAGE_CONTENT_READ; 18-10-2026 |
| PRE | [Wat zegt de wet over de preventiemedewerker?](https://www.arboportaal.nl/onderwerpen/ondersteuning-bij-arbowet/preventiemedewerker/wat-zegt-de-wet-over-de-preventiemedewerker) | Maximaal 25 werknemers is geen onvoorwaardelijke vrijstelling; deskundigheid en positie blijven relevant. | VERIFIED_SOURCE; WEB_PAGE_CONTENT_READ; 18-10-2026 |
| BHV | [Wat zegt de wet over bedrijfshulpverlening?](https://www.arboportaal.nl/onderwerpen/arbozorg/bedrijfshulpverlening/wat-zegt-de-wet-over-bedrijfshulpverlening) | Risicogerichte bezetting en voorbereiding; geen algemene afzonderlijke BHV-planplicht. Een generieke vervanger- of certificaatregel is hiermee niet bewezen. | VERIFIED_SOURCE; WEB_PAGE_CONTENT_READ; 18-10-2026 |
| BC | [Waar moet het basiscontract aan voldoen?](https://www.arboportaal.nl/onderwerpen/ondersteuning-bij-arbowet/basiscontract/waar-moet-het-basiscontract-aan-voldoen) | Ondersteunt taakgerichte afspraken, toegang, werkplekbezoek, second opinion en klachtenprocedure; uitzonderingen per taak afzonderlijk toetsen. | VERIFIED_SOURCE; WEB_PAGE_CONTENT_READ; 18-10-2026 |
| PAGO | [PAGO](https://www.arboportaal.nl/onderwerpen/arbowet--en--regelgeving/arbobeleid/pago) | Aanbieden is verplicht binnen de toepasselijke werkgeversscope; deelname is vrijwillig. Inhoud/frequentie volgen risico’s, niet een universele termijn. | VERIFIED_SOURCE; WEB_PAGE_CONTENT_READ; 18-10-2026 |
| INSTRUCTION | [Voorlichting gezondheidsrisico’s](https://www.arboportaal.nl/onderwerpen/arbozorg/voorlichting-gezondheidsrisicos) | Taak- en risicogericht onderricht; aanpassen bij aanleiding en rekening houden met jeugdigen. Geen universele jaarlijkse cursus afleiden. | VERIFIED_SOURCE; WEB_PAGE_CONTENT_READ; 18-10-2026 |
| CONSULT | [Regels voor raadpleging aangepast per 1 juli 2026](https://www.arboportaal.nl/actueel/nieuws/2026/06/29/regels-voor-raadpleging-van-werknemers-aangepast-per-1-juli-2026) | OR/PVT of bij ontbreken belanghebbende werknemers. Raadpleging, instemming en een WOR-oprichtingsplicht zijn verschillende vragen. | VERIFIED_SOURCE; WEB_PAGE_CONTENT_READ; 18-10-2026 |
| PSA | [Wat zegt de wet over agressie op de werkvloer?](https://www.arboportaal.nl/onderwerpen/psychosociale-arbeidsbelasting/agressie-en-geweld/wat-zegt-de-wet-over-agressie-op-de-werkvloer) | Mogelijke blootstelling, maatregelen en voorlichting. Agressie is één PSA-factor; deze pagina dekt niet zelfstandig het volledige PSA-oordeel. | VERIFIED_SOURCE; WEB_PAGE_CONTENT_READ; 18-10-2026 |
| ACCIDENT | [Arbeidsongevallen](https://www.nlarbeidsinspectie.nl/onderwerpen/arbeidsomstandighedenwet/arbeidsongevallen) | Overlijden, blijvend letsel of ziekenhuisopname vragen melding. Registreren is een afzonderlijke verplichting; proceskennis bewijst geen feitelijke melding. | VERIFIED_SOURCE; WEB_PAGE_CONTENT_READ; 18-10-2026 |
| GOV | [Waar moet mijn werkgever voor zorgen volgens de Arbowet?](https://www.rijksoverheid.nl/documenten/vraag-en-antwoord/arbeidsomstandigheden/waar-moet-mijn-werkgever-voor-zorgen-volgens-de-arbowet) | Vrijwilligers worden breed onder personeel genoemd; vergelijk met de specifieke scope-uitzonderingen. Vervanging bij eigen BHV-uitvoering is niet automatisch een algemene vervangingsregel. | VERIFIED_SOURCE; OFFICIAL_SEARCH_PAGE_CONTENT; 18-10-2026 |
| SCREEN | [Wat zegt de wet over beeldschermwerk?](https://www.arboportaal.nl/onderwerpen/fysieke-belasting/computerwerk/wat-zegt-de-wet-over-beeldschermwerk) | Verwijst naar AB 5.9–5.12 en Arboregeling 5.1–5.3; geen bewijs voor de volledige historische checklist of productiviteitsscore. | VERIFIED_SOURCE; OFFICIAL_SEARCH_PAGE_CONTENT; 18-10-2026 |
| PHYSICAL | [Wat zegt de wet over fysieke belasting?](https://www.arboportaal.nl/onderwerpen/fysieke-belasting/fysieke-over--en-onderbelasting/wat-zegt-de-wet) | Hoofdstuk 5 geeft doelvoorschriften. Een specifieke werkhoogte of taakfrequentie vraagt aanvullende onderbouwing. | VERIFIED_SOURCE; OFFICIAL_SEARCH_PAGE_CONTENT; 18-10-2026 |
| PREGNANCY | [Zwanger](https://www.arboportaal.nl/onderwerpen/rechten-plichten-werkenden/kinderwens-zwanger-borstvoeding-en-werk/zwanger) | AB 1.41 betreft bijzondere risico’s; werktijdclaims vereisen daarnaast Arbeidstijdenwet en persoonlijke context. | VERIFIED_SOURCE; OFFICIAL_SEARCH_PAGE_CONTENT; 18-10-2026 |
| BIO | [Biologische agentia in de wet](https://www.arboportaal.nl/onderwerpen/biologische-agentia/biologische-agentia-in-de-wet) | AB 4.85 vraagt beoordeling van aard, mate en duur van blootstelling; dit bewijst niet dat algemene F4-antwoorden die blootstelling vaststellen. | VERIFIED_SOURCE; OFFICIAL_SEARCH_PAGE_CONTENT; 18-10-2026 |
| BIOMEASURES | [Maatregelen biologische agentia](https://www.arboportaal.nl/onderwerpen/biologische-agentia/maatregelen) | Bio-arbeidshygiënische strategie bevat meer specifieke elementen dan een algemene maatregelhiërarchie. | VERIFIED_SOURCE; OFFICIAL_SEARCH_PAGE_CONTENT; 18-10-2026 |
| ASBESTOS | [Wat zegt arboregelgeving over asbest?](https://www.arboportaal.nl/onderwerpen/risicos-gevaarlijke-stoffen/asbest/wat-zegt-arboregelgeving-over-asbest) | Inventarisatie, risicoklasse en certificering zijn contextafhankelijk. Geen bewijs voor een individuele medische causaliteitsclaim. | VERIFIED_SOURCE; OFFICIAL_SEARCH_PAGE_CONTENT; 18-10-2026 |
| CONFINED | [Verstikkings- en bedwelmingsgevaar](https://www.arboportaal.nl/onderwerpen/inrichting-werkvloer/verstikkings--en-bedwelmingsgevaar) | AB 3.5g is relevante ingang; ventilatie alleen bewijst geen veilige toegang of reddingsvoorziening. | VERIFIED_SOURCE; OFFICIAL_SEARCH_PAGE_CONTENT; 18-10-2026 |
| NOISE | [Gehoorbescherming](https://www.arboportaal.nl/onderwerpen/persoonlijke-beschermingsmiddelen/verschillende-soorten-persoonlijke-beschermingsmiddelen/gehoorbescherming) | Verwijst naar AB 6.8; een actuele geluidsbeoordeling en maatregelenhiërarchie blijven afzonderlijk nodig. | VERIFIED_SOURCE; OFFICIAL_SEARCH_PAGE_CONTENT; 18-10-2026 |
| CMR | [Handreiking vervangingsverplichting CMR-stoffen](https://www.nlarbeidsinspectie.nl/site/binaries/site-content/collections/documents/2019/10/11/handreiking-vervangingsverplichting-cm-stoffen/handreiking-vervangingsverplichting-cmr-stoffen-20250619.pdf) | AB 4.17: technisch uitvoerbare vervanging. Geïndexeerd fragment, geen volledige PDF-/revisiecontrole. | REVIEW_REQUIRED; OFFICIAL_SEARCH_EXCERPT_ONLY; 18-10-2026 |
| LIGHT | [Arbobesluit artikel 6.3](https://www.arboportaal.nl/externe-bronnen/wetgeving/arbobesluit-artikel-6.3---daglicht-en-kunstlicht) | Vindplaats voor verlichting, geen bewijs voor een onvoorwaardelijke uitzichtplicht bij elke scheidingswand. | VERIFIED_SOURCE; OFFICIAL_SEARCH_PAGE_CONTENT; 18-10-2026 |

## Beslisbladen per onderwerp

Beoordeel ook de afzonderlijke claim-/regel-ID’s; goedkeuring van een thema promoveert niets automatisch. Noteer de dossier- en bronrevisie/hash waarop de beslissing rust. Bij wijziging daarvan is herreview nodig.

### RI&E en toetsing

Regels: GENERALPOLICY-YES, GENERALPOLICY-PARTIAL, GENERALPOLICY-NO, RIE-YES, RIE-PARTIAL, RIE-NO, RIEUPDATED-YES, RIEUPDATED-PARTIAL, RIEUPDATED-NO, RIETESTING-YES, RIETESTING-PARTIAL, RIETESTING-NO, CW2-RIE-01-YES, CW2-RIE-01-PARTIAL, CW2-RIE-01-NO, CW2-RIE-02-YES, CW2-RIE-02-PARTIAL, CW2-RIE-02-NO, CW2-RIE-03-YES, CW2-RIE-03-PARTIAL, CW2-RIE-03-NO.

- AW 14 lid 12 a/b en AB 2.14b: 40 gezamenlijke uren; DGA-correctie; maximaal 25 personen; cao-model versus aangemeld instrument; versie/geldigheidsduur; bedrijfsspecifieke toepassing.
- Geen automatische vrijstelling op OTHER, betaalde uren of een globale erkenningsverklaring.
- CW2-RIE-02: AW 5 lid 5 betreft terbeschikkingstelling; bijzondere groepen volgen AW 5 lid 1 plus toepasselijke AB-bepalingen.

- [ ] Goedgekeurd
- [ ] Afgekeurd
- [ ] Aanpassing vereist
- [ ] Aanvullend brononderzoek vereist

Reviewer: __________  Datum: __________  Dossier-/bronrevisie: __________

Onderbouwing en exact beoordeelde claim-/regel-ID’s: __________

Vervolgactie / verantwoordelijke: __________

### Plan van aanpak

Regels: ACTIONPLAN-YES, ACTIONPLAN-PARTIAL, ACTIONPLAN-NO, CW2-PVA-01-YES, CW2-PVA-01-PARTIAL, CW2-PVA-01-NO, CW2-PVA-02-YES, CW2-PVA-02-PARTIAL, CW2-PVA-02-NO, CW2-PVA-03-YES, CW2-PVA-03-PARTIAL, CW2-PVA-03-NO.

- AW 5 lid 3: maatregelen, samenhang en termijnen.
- CW2-PVA-03 blijft praktische aanbeveling; geen verplicht actiehouderveld of formulier verzinnen.

- [ ] Goedgekeurd
- [ ] Afgekeurd
- [ ] Aanpassing vereist
- [ ] Aanvullend brononderzoek vereist

Reviewer: __________  Datum: __________  Dossier-/bronrevisie: __________

Onderbouwing en exact beoordeelde claim-/regel-ID’s: __________

Vervolgactie / verantwoordelijke: __________

### Preventiemedewerker

Regels: PREVENTIONOFFICER-YES, PREVENTIONOFFICER-PARTIAL, PREVENTIONOFFICER-NO, PREVENTIONCONSULTATION-YES, PREVENTIONCONSULTATION-PARTIAL, PREVENTIONCONSULTATION-NO, CW2-PRE-01-YES, CW2-PRE-01-PARTIAL, CW2-PRE-01-NO, CW2-PRE-02-YES, CW2-PRE-02-PARTIAL, CW2-PRE-02-NO, CW2-PRE-03-YES, CW2-PRE-03-PARTIAL, CW2-PRE-03-NO.

- AW 13 leden 1–4/10: eigen werkgever/directeur bij maximaal 25, deskundigheid en uitzonderlijke externe bijstand.
- Instemming op persoon/positie is sterker dan betrokkenheid; OR/PVT-aanwezigheid afzonderlijk vaststellen.

- [ ] Goedgekeurd
- [ ] Afgekeurd
- [ ] Aanpassing vereist
- [ ] Aanvullend brononderzoek vereist

Reviewer: __________  Datum: __________  Dossier-/bronrevisie: __________

Onderbouwing en exact beoordeelde claim-/regel-ID’s: __________

Vervolgactie / verantwoordelijke: __________

### BHV

Regels: BHVORGANIZED-YES, BHVORGANIZED-PARTIAL, BHVORGANIZED-NO, BHVAPPOINTED-YES, BHVAPPOINTED-PARTIAL, BHVAPPOINTED-NO, BHVRISKBASED-YES, BHVRISKBASED-PARTIAL, BHVRISKBASED-NO, BHVPREPARED-YES, BHVPREPARED-PARTIAL, BHVPREPARED-NO, CW2-BHV-01-YES, CW2-BHV-01-PARTIAL, CW2-BHV-01-NO, CW2-BHV-02-YES, CW2-BHV-02-PARTIAL, CW2-BHV-02-NO, CW2-BHV-03-YES, CW2-BHV-03-PARTIAL, CW2-BHV-03-NO, CW2-BHV-03-NO_SHARED_WORKPLACE.

- AW 15 leden 1–3: aanwijzing, taakuitoefening, capaciteit en uitrusting; geen universele 1:50-ratio.
- BHVAPPOINTED combineert aanwijzing en vervanging; nee is niet eenduidig.
- AW 19: meerdere werkgevers op gedeelde werkplekken; NO_SHARED_SITE sluit alleen dit onderdeel uit, niet BHV als geheel.

- [ ] Goedgekeurd
- [ ] Afgekeurd
- [ ] Aanpassing vereist
- [ ] Aanvullend brononderzoek vereist

Reviewer: __________  Datum: __________  Dossier-/bronrevisie: __________

Onderbouwing en exact beoordeelde claim-/regel-ID’s: __________

Vervolgactie / verantwoordelijke: __________

### Basiscontract en bedrijfsarts

Regels: BASICCONTRACT-YES, BASICCONTRACT-PARTIAL, BASICCONTRACT-NO, OCCUPATIONALPHYSICIANACCESS-YES, OCCUPATIONALPHYSICIANACCESS-PARTIAL, OCCUPATIONALPHYSICIANACCESS-NO, EXPERTTASKSCOVERED-YES, EXPERTTASKSCOVERED-PARTIAL, EXPERTTASKSCOVERED-NO, CW2-BC-01-YES, CW2-BC-01-PARTIAL, CW2-BC-01-NO, CW2-BC-02-YES, CW2-BC-02-PARTIAL, CW2-BC-02-NO, CW2-BC-03-YES, CW2-BC-03-PARTIAL, CW2-BC-03-NO.

- AW 14/14a: taakafhankelijke bijstand, schriftelijke afspraken, maatwerk/vangnet.
- Second opinion is behoudens zwaarwegende argumenten; geen UWV-deskundigenoordeel.
- EXPERTTASKSCOVERED bewijst niet alle taakvoorwaarden.

- [ ] Goedgekeurd
- [ ] Afgekeurd
- [ ] Aanpassing vereist
- [ ] Aanvullend brononderzoek vereist

Reviewer: __________  Datum: __________  Dossier-/bronrevisie: __________

Onderbouwing en exact beoordeelde claim-/regel-ID’s: __________

Vervolgactie / verantwoordelijke: __________

### PAGO

Regels: PAGOOFFERED-YES, PAGOOFFERED-PARTIAL, PAGOOFFERED-NO, CW2-PAGO-01-YES, CW2-PAGO-01-PARTIAL, CW2-PAGO-01-NO, CW2-PAGO-02-YES, CW2-PAGO-02-PARTIAL, CW2-PAGO-02-NO.

- AW 18: aanbod versus vrijwillige deelname, risicogerichte inhoud en frequentie.
- CW2-PAGO-02: voorlichtingsvraag bewijst geen zelfstandige wettelijke overtreding; hold behouden.

- [ ] Goedgekeurd
- [ ] Afgekeurd
- [ ] Aanpassing vereist
- [ ] Aanvullend brononderzoek vereist

Reviewer: __________  Datum: __________  Dossier-/bronrevisie: __________

Onderbouwing en exact beoordeelde claim-/regel-ID’s: __________

Vervolgactie / verantwoordelijke: __________

### Voorlichting en onderricht

Regels: INSTRUCTION-YES, INSTRUCTION-PARTIAL, INSTRUCTION-NO, SUPERVISION-YES, SUPERVISION-PARTIAL, SUPERVISION-NO, CW2-INS-01-YES, CW2-INS-01-PARTIAL, CW2-INS-01-NO, CW2-INS-02-YES, CW2-INS-02-PARTIAL, CW2-INS-02-NO.

- AW 8: doeltreffend, taak-/persoonsgericht, passend toezicht.
- Geen verplichte taaltoets, vaste cursuslijst of generieke jaarlijkse cursus afleiden.

- [ ] Goedgekeurd
- [ ] Afgekeurd
- [ ] Aanpassing vereist
- [ ] Aanvullend brononderzoek vereist

Reviewer: __________  Datum: __________  Dossier-/bronrevisie: __________

Onderbouwing en exact beoordeelde claim-/regel-ID’s: __________

Vervolgactie / verantwoordelijke: __________

### PSA

Regels: CW2-PSA-01-YES, CW2-PSA-01-PARTIAL, CW2-PSA-01-NO, CW2-PSA-02-YES, CW2-PSA-02-PARTIAL, CW2-PSA-02-NO, CW2-PSA-02-NONE_IDENTIFIED.

- AW 3 lid 2 en AB 2.15: mogelijke blootstelling telt; ontbreken klachten is geen uitsluiting.
- NONE_IDENTIFIED vereist daadwerkelijk passend onderzoek, ook latente risico’s; geen modulebrede NVT.

- [ ] Goedgekeurd
- [ ] Afgekeurd
- [ ] Aanpassing vereist
- [ ] Aanvullend brononderzoek vereist

Reviewer: __________  Datum: __________  Dossier-/bronrevisie: __________

Onderbouwing en exact beoordeelde claim-/regel-ID’s: __________

Vervolgactie / verantwoordelijke: __________

### Arbeidsongevallen

Regels: ACCIDENTREGISTRATION-YES, ACCIDENTREGISTRATION-PARTIAL, ACCIDENTREGISTRATION-NO, ACCIDENTREPORTING-YES, ACCIDENTREPORTING-PARTIAL, ACCIDENTREPORTING-NO, CW2-ONG-01-YES, CW2-ONG-01-PARTIAL, CW2-ONG-01-NO, CW2-ONG-02-YES, CW2-ONG-02-PARTIAL, CW2-ONG-02-NO.

- AW 9 lid 1: feitelijk ongeval, ernstig gevolg en moment van bekendwording; geen positief oordeel uit meldkennis.
- AW 9 lid 2: gemelde ongevallen én meer dan drie werkdagen verzuim, aard/datum; proces is geen feitelijk register.

- [ ] Goedgekeurd
- [ ] Afgekeurd
- [ ] Aanpassing vereist
- [ ] Aanvullend brononderzoek vereist

Reviewer: __________  Datum: __________  Dossier-/bronrevisie: __________

Onderbouwing en exact beoordeelde claim-/regel-ID’s: __________

Vervolgactie / verantwoordelijke: __________

### Medezeggenschap en werkgeversscope

Regels: C01-SCOPE-UNCERTAIN, C02-SCOPE-UNCERTAIN, C03-SCOPE-UNCERTAIN, C04-SCOPE-UNCERTAIN, C05-SCOPE-UNCERTAIN, C06-SCOPE-UNCERTAIN, C08-SCOPE-UNCERTAIN, C09-SCOPE-UNCERTAIN, WORKERCONSULTATION-YES, WORKERCONSULTATION-PARTIAL, WORKERCONSULTATION-NO, C10-SCOPE-UNCERTAIN, R06-SCOPE-UNCERTAIN.

- AW 1/16 en AB 9.5a: dienstverband, ingeleenden, gezag en vrijwilligers afzonderlijk beoordelen. AB 9.5a is toegevoegd als opgeslagen importfragment; actuele consolidatie en menselijke scopebinding ontbreken.
- AW 12 vanaf 1 juli 2026: OR/PVT of belanghebbende werknemers; geen automatische WOR-oprichtingsplicht.
- Tien scope-onzekerheidsregels vereisen afzonderlijke CONDITION-bindingen. Onbekende scope geeft nooit algemene vrijstelling.

- [ ] Goedgekeurd
- [ ] Afgekeurd
- [ ] Aanpassing vereist
- [ ] Aanvullend brononderzoek vereist

Reviewer: __________  Datum: __________  Dossier-/bronrevisie: __________

Onderbouwing en exact beoordeelde claim-/regel-ID’s: __________

Vervolgactie / verantwoordelijke: __________

## Claimdossiers — alle 46

Iedere huidige claim: DRAFT / UNVALIDATED / HISTORICAL / OUTDATED. De oorspronkelijke citaties en revisies blijven onveranderd in de JSON. Fragmenten hieronder verwijzen naar de bronblokbijlage, inclusief exactText en textHash. Een leeg fragmentoverzicht is een concrete bewijsleemte.

### ai-01:c1 — e5a65199-4402-4b7d-893b-f772e19442f4

Continue zorg voor arbeidsomstandigheden en verzuim is nodig vanwege de verwevenheid met de totale bedrijfsvoering.

- Dossierlabel: **REVIEW_REQUIRED**; hergebruikadvies: CONTEXT.
- Kandidaatgrondslag: AW 3; arbobeleid. Actueel exact artikel/lid bevestigd: nee.
- Bestaande historische bron: AI-01, Derde herziene druk, bronrevisie b7825dca-b14a-4581-a331-68fa672da80b, fragment 70e338a3-8552-4eea-a450-cd37be059f56 (2.1 Inleiding), REVIEW_REQUIRED.
- Primaire kandidaatfragmenten: 3a217a02-e23b-43e4-840f-4cb7c81a833e, 1d7a8c35-4bd7-4eef-b18b-732f1c3427d1, 630ed311-f2ef-41c9-a67e-c555963b628c, 3066773f-9b7e-4e11-885c-a5e5fac7e57b, c74aa276-8225-4e58-9c1e-c42904aed847, f7232824-ba92-4e97-ab81-75f4ab85563a, 811d3b1b-59bf-48ec-aad3-11949cebff28, 1c3acd5d-3ea0-4cb5-bec7-a740a2b7a13c, d340726b-c129-474b-8876-2b73fdf7430e, 60c71fad-17c0-4a16-812a-80bf41b68da2.
- Bronleemte: Actuele consolidatie, volledige context en exacte lidbinding nog door reviewer bevestigen.
- Toepasselijkheid: Historische beleidscontext uit 2002; actuele toepasbaarheid vereist afzonderlijke validatie.
- Uitzonderingen/gevolgtrekking: Praktische context; geen zelfstandige wettelijke eis aan een managementsysteem.
- Kandidaatvragen: GENERALPOLICY. Regels: GENERALPOLICY-YES, GENERALPOLICY-PARTIAL, GENERALPOLICY-NO.
- Conceptadvies: Praktische context; geen zelfstandige wettelijke eis aan een managementsysteem. Hergebruik pas na actuele menselijke review; herformuleer waar de historische uitspraak te breed is.
- Menselijk besluit / reviewer / datum / revisie / onderbouwing / vervolgactie: **niet ingevuld**.

### ai-01:c2 — 43955364-3088-42b4-b165-ab2d63040c21

Een plan-do-check-act-cyclus ondersteunt het plannen, uitvoeren, controleren en bijsturen van beleid.

- Dossierlabel: **REVIEW_REQUIRED**; hergebruikadvies: CONTEXT.
- Kandidaatgrondslag: AW 3 lid 4; AW 5 lid 4. Actueel exact artikel/lid bevestigd: nee.
- Bestaande historische bron: AI-01, Derde herziene druk, bronrevisie b7825dca-b14a-4581-a331-68fa672da80b, fragment 4066f813-0019-4b55-97d9-3def848b7db3 (2.1 Inleiding), REVIEW_REQUIRED.
- Primaire kandidaatfragmenten: 60c71fad-17c0-4a16-812a-80bf41b68da2, 315b197b-5399-4c00-b189-42243095d887.
- Bronleemte: Actuele consolidatie, volledige context en exacte lidbinding nog door reviewer bevestigen.
- Toepasselijkheid: Historische managementbenadering uit 2002; actuele toepasbaarheid vereist afzonderlijke validatie.
- Uitzonderingen/gevolgtrekking: PDCA is een mogelijke werkwijze; de cyclus zelf niet als wettelijk verplicht beoordelen.
- Kandidaatvragen: GENERALPOLICY, RIEUPDATED. Regels: GENERALPOLICY-YES, GENERALPOLICY-PARTIAL, GENERALPOLICY-NO, RIEUPDATED-YES, RIEUPDATED-PARTIAL, RIEUPDATED-NO.
- Conceptadvies: PDCA is een mogelijke werkwijze; de cyclus zelf niet als wettelijk verplicht beoordelen. Hergebruik pas na actuele menselijke review; herformuleer waar de historische uitspraak te breed is.
- Menselijk besluit / reviewer / datum / revisie / onderbouwing / vervolgactie: **niet ingevuld**.

### ai-01:c3 — 4fcbe38c-8d25-4877-8704-7bebb8ed21a8

De evaluatie binnen een RI&E omvat het vergelijken met geldende normen en voorschriften en het bepalen van het relatieve belang van gevaren voor prioritering.

- Dossierlabel: **REVIEW_REQUIRED**; hergebruikadvies: CANDIDATE.
- Kandidaatgrondslag: AW 5 leden 1–4. Actueel exact artikel/lid bevestigd: nee.
- Bestaande historische bron: AI-01, Derde herziene druk, bronrevisie b7825dca-b14a-4581-a331-68fa672da80b, fragment eaf18a8f-ae12-41ca-9ae0-c3a87bd1c439 (3.1.4 Maatwerk), REVIEW_REQUIRED.
- Primaire kandidaatfragmenten: 35058cfe-ea36-434b-a954-a78bcea9b898, 98b99fc6-51e0-4085-a6fd-e52b8bcb405d, dbc1c538-84b0-4ee0-bbed-137fcc21d7cb, 315b197b-5399-4c00-b189-42243095d887, 5b793a72-7f08-4e9a-a1ec-0034781f1a54, 7b97b11b-ec94-45c5-b9a0-66939643a146.
- Bronleemte: Actuele consolidatie, volledige context en exacte lidbinding nog door reviewer bevestigen.
- Toepasselijkheid: Historische RI&E-context uit 2002; wettelijke actualiteit is niet gevalideerd.
- Uitzonderingen/gevolgtrekking: Actuele normen en prioritering zijn bruikbaar voor RI&E, maar claimtype INSPECTION_POINT bewijst geen wettelijke plicht.
- Kandidaatvragen: RIE, CW2-PVA-01. Regels: RIE-YES, RIE-PARTIAL, RIE-NO, CW2-PVA-01-YES, CW2-PVA-01-PARTIAL, CW2-PVA-01-NO.
- Conceptadvies: Actuele normen en prioritering zijn bruikbaar voor RI&E, maar claimtype INSPECTION_POINT bewijst geen wettelijke plicht. Hergebruik pas na actuele menselijke review; herformuleer waar de historische uitspraak te breed is.
- Menselijk besluit / reviewer / datum / revisie / onderbouwing / vervolgactie: **niet ingevuld**.

### ai-01:c4 — e64b1fc3-825d-468f-ab28-9562434a0cb1

De werkgever heeft een sturende rol bij het vaststellen en organiseren van arbeidsomstandighedenbeleid.

- Dossierlabel: **REVIEW_REQUIRED**; hergebruikadvies: CANDIDATE.
- Kandidaatgrondslag: AW 3 leden 1 en 3. Actueel exact artikel/lid bevestigd: nee.
- Bestaande historische bron: AI-01, Derde herziene druk, bronrevisie b7825dca-b14a-4581-a331-68fa672da80b, fragment 08d84092-1b31-4f7d-9c92-8c8ea20d3fb3 (2.6 Actoren en hun taken, verantwoordelijkheden en bevoegdheden; tabel 2.1), REVIEW_REQUIRED.
- Primaire kandidaatfragmenten: 3a217a02-e23b-43e4-840f-4cb7c81a833e, 1d7a8c35-4bd7-4eef-b18b-732f1c3427d1, 630ed311-f2ef-41c9-a67e-c555963b628c, 3066773f-9b7e-4e11-885c-a5e5fac7e57b, c74aa276-8225-4e58-9c1e-c42904aed847, f7232824-ba92-4e97-ab81-75f4ab85563a, 811d3b1b-59bf-48ec-aad3-11949cebff28, d340726b-c129-474b-8876-2b73fdf7430e.
- Bronleemte: Actuele consolidatie, volledige context en exacte lidbinding nog door reviewer bevestigen.
- Toepasselijkheid: Historische beschrijving uit 2002; actuele juridische betekenis vereist afzonderlijke validatie.
- Uitzonderingen/gevolgtrekking: Werkgeversverantwoordelijkheid onderscheiden van gedelegeerde uitvoering; concrete actuele wettelijke claim ontbreekt.
- Kandidaatvragen: GENERALPOLICY. Regels: GENERALPOLICY-YES, GENERALPOLICY-PARTIAL, GENERALPOLICY-NO.
- Conceptadvies: Werkgeversverantwoordelijkheid onderscheiden van gedelegeerde uitvoering; concrete actuele wettelijke claim ontbreekt. Hergebruik pas na actuele menselijke review; herformuleer waar de historische uitspraak te breed is.
- Menselijk besluit / reviewer / datum / revisie / onderbouwing / vervolgactie: **niet ingevuld**.

### ai-01:c5 — dc25a704-e7e4-4e25-9605-ea8fd6e9dbdf

Medewerkers kunnen de werkgever en betrokken deskundigen bijstaan bij het opstellen of toetsen van de RI&E.

- Dossierlabel: **REVIEW_REQUIRED**; hergebruikadvies: REWRITE_REVIEW.
- Kandidaatgrondslag: AW 12, 13 en 14. Actueel exact artikel/lid bevestigd: nee.
- Bestaande historische bron: AI-01, Derde herziene druk, bronrevisie b7825dca-b14a-4581-a331-68fa672da80b, fragment fae4958b-f946-4158-a9ea-9b11eb9b7f35 (3.1.3 Actoren; tabel 3.1), REVIEW_REQUIRED.
- Primaire kandidaatfragmenten: fe300c39-b0f5-48d9-8e35-0eaaec035b98, 0cb02d0e-747c-443c-a0fb-78c43cb18efb, a01406dc-c07f-410e-89cd-5d1769859091, c3c99189-3c19-4222-9bee-def1df609a8e, d65e2e20-707d-4461-b7b2-5f61c0f69048, b7ab4880-9621-4aa9-bad0-38a58f9bca53, a140e09f-ec57-4b66-b3b9-a50e3492551f, c176d6e5-dc10-42dd-95c1-3d87a5ce9090, b368cdfc-ecbd-414a-9695-50ba8b518200, 3605ea9f-72bb-409b-b521-33acd947c375, 2603bf99-de9d-4c4e-b270-8474683494f6, a27c2a69-ce10-47c8-b357-94ba5a5003c9, 2bc72e1c-e04e-4752-b2b8-0ddc4dd4a8fe, 753b761a-5ab4-49fa-b722-b64756edb49a, 9af2c4c5-18da-402e-886a-77a48ea6d15a, 3ede99db-5ed0-4a54-bf3a-3ca1eda73b0d, 6abcd4d0-d23f-435e-9cfc-211c2bc81248, bd43de38-fdc5-48d9-bc37-d13d331bd0d4, bd7c62a3-084d-465e-840b-18ac55c75595.
- Bronleemte: Actuele consolidatie, volledige context en exacte lidbinding nog door reviewer bevestigen.
- Toepasselijkheid: Historische RI&E-context uit 2002; actuele juridische betekenis vereist afzonderlijke validatie.
- Uitzonderingen/gevolgtrekking: Inbreng werknemers niet verwarren met gecertificeerde toetsing; huidige formulering vraagt afbakening.
- Kandidaatvragen: RIE, PREVENTIONOFFICER, WORKERCONSULTATION. Regels: RIE-YES, RIE-PARTIAL, RIE-NO, PREVENTIONOFFICER-YES, PREVENTIONOFFICER-PARTIAL, PREVENTIONOFFICER-NO, WORKERCONSULTATION-YES, WORKERCONSULTATION-PARTIAL, WORKERCONSULTATION-NO.
- Conceptadvies: Inbreng werknemers niet verwarren met gecertificeerde toetsing; huidige formulering vraagt afbakening. Hergebruik pas na actuele menselijke review; herformuleer waar de historische uitspraak te breed is.
- Menselijk besluit / reviewer / datum / revisie / onderbouwing / vervolgactie: **niet ingevuld**.

### ai-01:c6 — afb3f434-8f03-4883-acde-433d0877b324

Samenwerking tussen werkgever en werknemers bij de vormgeving en uitvoering van arbobeleid ondersteunt draagvlak en het benutten van interne kennis.

- Dossierlabel: **REVIEW_REQUIRED**; hergebruikadvies: CONTEXT.
- Kandidaatgrondslag: AW 12. Actueel exact artikel/lid bevestigd: nee.
- Bestaande historische bron: AI-01, Derde herziene druk, bronrevisie b7825dca-b14a-4581-a331-68fa672da80b, fragment d327d663-ce39-44f3-bedf-3fe9889545b2 (2.7.1 Voorschriften), REVIEW_REQUIRED.
- Primaire kandidaatfragmenten: fe300c39-b0f5-48d9-8e35-0eaaec035b98, 0cb02d0e-747c-443c-a0fb-78c43cb18efb, a01406dc-c07f-410e-89cd-5d1769859091, c3c99189-3c19-4222-9bee-def1df609a8e, d65e2e20-707d-4461-b7b2-5f61c0f69048, b7ab4880-9621-4aa9-bad0-38a58f9bca53, a140e09f-ec57-4b66-b3b9-a50e3492551f, c176d6e5-dc10-42dd-95c1-3d87a5ce9090.
- Bronleemte: Actuele consolidatie, volledige context en exacte lidbinding nog door reviewer bevestigen.
- Toepasselijkheid: Historische beleidscontext uit 2002; actuele bevoegdheden zijn niet gevalideerd.
- Uitzonderingen/gevolgtrekking: Samenwerking kan toelichting geven; draagvlak is geen zelfstandig nalevingscriterium.
- Kandidaatvragen: WORKERCONSULTATION. Regels: WORKERCONSULTATION-YES, WORKERCONSULTATION-PARTIAL, WORKERCONSULTATION-NO.
- Conceptadvies: Samenwerking kan toelichting geven; draagvlak is geen zelfstandig nalevingscriterium. Hergebruik pas na actuele menselijke review; herformuleer waar de historische uitspraak te breed is.
- Menselijk besluit / reviewer / datum / revisie / onderbouwing / vervolgactie: **niet ingevuld**.

### ai-01:c7 — f32747d3-26af-4b8e-abf0-fe5442f4306c

Bij de verdeling van taken, verantwoordelijkheden en bevoegdheden is het van belang ook middelen zoals tijd, kennis en budget vast te leggen.

- Dossierlabel: **REVIEW_REQUIRED**; hergebruikadvies: CANDIDATE.
- Kandidaatgrondslag: AW 3 lid 3; AW 5 lid 3. Actueel exact artikel/lid bevestigd: nee.
- Bestaande historische bron: AI-01, Derde herziene druk, bronrevisie b7825dca-b14a-4581-a331-68fa672da80b, fragment 4d35ec8c-7fb8-4c99-b7e3-58b2626514b1 (2.6 Actoren en hun taken, verantwoordelijkheden en bevoegdheden), REVIEW_REQUIRED.
- Primaire kandidaatfragmenten: d340726b-c129-474b-8876-2b73fdf7430e, dbc1c538-84b0-4ee0-bbed-137fcc21d7cb.
- Bronleemte: Actuele consolidatie, volledige context en exacte lidbinding nog door reviewer bevestigen.
- Toepasselijkheid: Historische beleidsaanbeveling uit 2002; actuele toepasbaarheid vereist afzonderlijke validatie.
- Uitzonderingen/gevolgtrekking: Kandidaat voor praktische taakbewaking CW2-PVA-03; geen algemeen verplicht formulier of budgetbedrag afleiden.
- Kandidaatvragen: CW2-PVA-03. Regels: CW2-PVA-03-YES, CW2-PVA-03-PARTIAL, CW2-PVA-03-NO.
- Conceptadvies: Kandidaat voor praktische taakbewaking CW2-PVA-03; geen algemeen verplicht formulier of budgetbedrag afleiden. Hergebruik pas na actuele menselijke review; herformuleer waar de historische uitspraak te breed is.
- Menselijk besluit / reviewer / datum / revisie / onderbouwing / vervolgactie: **niet ingevuld**.

### ai-01:c8 — 328dad12-5c78-4b58-8a16-066429d8753a

Periodieke controle van arbo- en verzuimbeleid omvat onder meer de vraag of gerichte maatregelen en activiteiten effectief zijn.

- Dossierlabel: **REVIEW_REQUIRED**; hergebruikadvies: CANDIDATE.
- Kandidaatgrondslag: AW 3 lid 4; AW 5 lid 4. Actueel exact artikel/lid bevestigd: nee.
- Bestaande historische bron: AI-01, Derde herziene druk, bronrevisie b7825dca-b14a-4581-a331-68fa672da80b, fragment d87fb4c7-5f8f-4eaf-9d8c-7d9f9be507b7 (5 Controle: monitoren van beleid en verbeterplannen), REVIEW_REQUIRED.
- Primaire kandidaatfragmenten: 60c71fad-17c0-4a16-812a-80bf41b68da2, 315b197b-5399-4c00-b189-42243095d887.
- Bronleemte: Actuele consolidatie, volledige context en exacte lidbinding nog door reviewer bevestigen.
- Toepasselijkheid: Historische managementbenadering uit 2002; actuele toepasbaarheid vereist afzonderlijke validatie.
- Uitzonderingen/gevolgtrekking: Effectiviteit/actualisatie beoordelen met huidige omstandigheden; geen vaste universele frequentie afleiden.
- Kandidaatvragen: RIEUPDATED. Regels: RIEUPDATED-YES, RIEUPDATED-PARTIAL, RIEUPDATED-NO.
- Conceptadvies: Effectiviteit/actualisatie beoordelen met huidige omstandigheden; geen vaste universele frequentie afleiden. Hergebruik pas na actuele menselijke review; herformuleer waar de historische uitspraak te breed is.
- Menselijk besluit / reviewer / datum / revisie / onderbouwing / vervolgactie: **niet ingevuld**.

### ai-02:c1 — 4505898d-27a9-4dcc-a766-267e5dac7344

Gezondheidsklachten bij beeldschermwerk werden in deze historische bron in verband gebracht met een combinatie van lange schermtijd, hoge werkdruk en een slechte ergonomische inrichting.

- Dossierlabel: **INSUFFICIENT_EVIDENCE**; hergebruikadvies: OUTSIDE_F4.
- Kandidaatgrondslag: AB 5.9; Arboportaal beeldschermwerk. Actueel exact artikel/lid bevestigd: nee.
- Bestaande historische bron: AI-02, Tweede herziene druk, bronrevisie 1c89b363-3811-4074-95b2-09d57bb92093, fragment 0099a640-4e0b-4b92-ad31-4f69c60884bd (2.2 Spier- en gewrichtsklachten), REVIEW_REQUIRED.
- Primaire kandidaatfragmenten: ontbreken.
- Aanvullende kandidaatbepalingen: AB 5.9. Exacte fragmenten: bf60fbdd-e159-49a4-8105-0ece37babba7, e7bb2bd5-b930-43b0-baec-a4cd6ba3d20c (zie supplement).
- Bronleemte: Aanvullende opgeslagen AB-fragmenten beschikbaar; actuele consolidatie en volledige gevolgtrekking niet bevestigd. Arboregeling, medische of technische bronnen waar vereist blijven open.
- Toepasselijkheid: Historische onderzoekscontext met stand van zaken begin 1997; actuele onderbouwing vereist afzonderlijke validatie.
- Uitzonderingen/gevolgtrekking: Gezondheidsclaim vraagt actuele ergonomische onderbouwing; geen van de 141 regels beoordeelt deze individuele blootstelling.
- Kandidaatvragen: geen F4-koppeling. Regels: geen.
- Conceptadvies: Gezondheidsclaim vraagt actuele ergonomische onderbouwing; geen van de 141 regels beoordeelt deze individuele blootstelling. Niet als F4-bewijs gebruiken; buiten scope of aanvullende primaire onderbouwing nodig.
- Menselijk besluit / reviewer / datum / revisie / onderbouwing / vervolgactie: **niet ingevuld**.

### ai-02:c2 — 7f16124c-b663-4306-ba4f-b09aa082f837

Ondersteunend meubilair kan volgens de bron helpen om statische belasting bij beeldschermwerk minder belastend te maken.

- Dossierlabel: **INSUFFICIENT_EVIDENCE**; hergebruikadvies: OUTSIDE_F4.
- Kandidaatgrondslag: AB 5.12; Arboregeling 5.1. Actueel exact artikel/lid bevestigd: nee.
- Bestaande historische bron: AI-02, Tweede herziene druk, bronrevisie 1c89b363-3811-4074-95b2-09d57bb92093, fragment 85caf352-d3ed-499f-aded-f230fdeffcc1 (5.5.1 Inleiding), REVIEW_REQUIRED.
- Primaire kandidaatfragmenten: ontbreken.
- Aanvullende kandidaatbepalingen: AB 5.4; AB 5.12. Exacte fragmenten: 8091d691-0095-4165-8c59-ae447ae030e8, f4ab2428-7a8a-4408-a672-2c38a60a597c (zie supplement).
- Bronleemte: Aanvullende opgeslagen AB-fragmenten beschikbaar; actuele consolidatie en volledige gevolgtrekking niet bevestigd. Arboregeling, medische of technische bronnen waar vereist blijven open.
- Toepasselijkheid: Historische ergonomische aanbeveling uit 2000; actuele toepasbaarheid vereist afzonderlijke validatie.
- Uitzonderingen/gevolgtrekking: Ergonomische maatregel; toepasselijkheid en huidige inrichtingseisen separaat beoordelen.
- Kandidaatvragen: geen F4-koppeling. Regels: geen.
- Conceptadvies: Ergonomische maatregel; toepasselijkheid en huidige inrichtingseisen separaat beoordelen. Niet als F4-bewijs gebruiken; buiten scope of aanvullende primaire onderbouwing nodig.
- Menselijk besluit / reviewer / datum / revisie / onderbouwing / vervolgactie: **niet ingevuld**.

### ai-02:c3 — 2c6ec9ff-df57-4cca-bf4d-e18a388e9a3c

Bij de beoordeling van een beeldschermwerkplek kan worden nagegaan of stoel en tafel aan de lichaamsafmetingen van de gebruiker kunnen worden aangepast.

- Dossierlabel: **INSUFFICIENT_EVIDENCE**; hergebruikadvies: OUTSIDE_F4.
- Kandidaatgrondslag: AB 5.12; Arboregeling 5.1. Actueel exact artikel/lid bevestigd: nee.
- Bestaande historische bron: AI-02, Tweede herziene druk, bronrevisie 1c89b363-3811-4074-95b2-09d57bb92093, fragment bedd1644-fbcc-4968-8689-acbe274609a3 (5.5.1 Inleiding), REVIEW_REQUIRED.
- Primaire kandidaatfragmenten: ontbreken.
- Aanvullende kandidaatbepalingen: AB 5.4; AB 5.12. Exacte fragmenten: 8091d691-0095-4165-8c59-ae447ae030e8, f4ab2428-7a8a-4408-a672-2c38a60a597c (zie supplement).
- Bronleemte: Aanvullende opgeslagen AB-fragmenten beschikbaar; actuele consolidatie en volledige gevolgtrekking niet bevestigd. Arboregeling, medische of technische bronnen waar vereist blijven open.
- Toepasselijkheid: Historische ergonomische inspectiecontext uit 2000; maatvoering en normen zijn niet actueel gevalideerd.
- Uitzonderingen/gevolgtrekking: Maatvoering niet uit publicatie uit 2000 als actuele norm overnemen.
- Kandidaatvragen: geen F4-koppeling. Regels: geen.
- Conceptadvies: Maatvoering niet uit publicatie uit 2000 als actuele norm overnemen. Niet als F4-bewijs gebruiken; buiten scope of aanvullende primaire onderbouwing nodig.
- Menselijk besluit / reviewer / datum / revisie / onderbouwing / vervolgactie: **niet ingevuld**.

### ai-02:c4 — 65714b58-ae7e-4642-a518-9d4a19969338

Bij invoermiddelen kan worden beoordeeld of de plaatsing en bediening de gebruiker niet tot een ongunstige werkhouding dwingen.

- Dossierlabel: **INSUFFICIENT_EVIDENCE**; hergebruikadvies: OUTSIDE_F4.
- Kandidaatgrondslag: AB 5.12; Arboregeling 5.1. Actueel exact artikel/lid bevestigd: nee.
- Bestaande historische bron: AI-02, Tweede herziene druk, bronrevisie 1c89b363-3811-4074-95b2-09d57bb92093, fragment 7d0de5f4-c9c0-408e-ac0b-6e4363b1b6c5 (4.3.1 Inleiding), REVIEW_REQUIRED.
- Primaire kandidaatfragmenten: ontbreken.
- Aanvullende kandidaatbepalingen: AB 5.4; AB 5.12. Exacte fragmenten: 8091d691-0095-4165-8c59-ae447ae030e8, f4ab2428-7a8a-4408-a672-2c38a60a597c (zie supplement).
- Bronleemte: Aanvullende opgeslagen AB-fragmenten beschikbaar; actuele consolidatie en volledige gevolgtrekking niet bevestigd. Arboregeling, medische of technische bronnen waar vereist blijven open.
- Toepasselijkheid: Historische ergonomische inspectiecontext uit 2000; actuele normen zijn niet gevalideerd.
- Uitzonderingen/gevolgtrekking: Houding en invoermiddelen zijn situatieafhankelijk; geen universele numerieke norm.
- Kandidaatvragen: geen F4-koppeling. Regels: geen.
- Conceptadvies: Houding en invoermiddelen zijn situatieafhankelijk; geen universele numerieke norm. Niet als F4-bewijs gebruiken; buiten scope of aanvullende primaire onderbouwing nodig.
- Menselijk besluit / reviewer / datum / revisie / onderbouwing / vervolgactie: **niet ingevuld**.

### ai-02:c5 — d7b937d5-c8af-46a8-ae43-4d409c6f8bb4

Afwisseling met andersoortig werk kan andere lichamelijke en mentale inspanningen bieden dan beeldschermwerk.

- Dossierlabel: **INSUFFICIENT_EVIDENCE**; hergebruikadvies: OUTSIDE_F4.
- Kandidaatgrondslag: AB 5.8 en 5.10. Actueel exact artikel/lid bevestigd: nee.
- Bestaande historische bron: AI-02, Tweede herziene druk, bronrevisie 1c89b363-3811-4074-95b2-09d57bb92093, fragment 68121b0a-ca64-4624-a182-417f3711841a (3.2 De tijdsduur van het beeldschermwerk en pauzes), REVIEW_REQUIRED.
- Primaire kandidaatfragmenten: ontbreken.
- Aanvullende kandidaatbepalingen: AB 5.8; AB 5.10. Exacte fragmenten: 717b2142-be6f-445e-9e52-0162314f8152, bcca8548-dd80-47d8-a1af-a8536f757c7d, 3241133d-b30b-4ab3-ac9f-be1b6dc56cb5, 5523f9af-d478-49a9-9ef5-490691d735b6, a6185e12-6791-4d56-af10-0f14b0517998, 16420fd2-cd08-41b5-be37-3d3f939cae93, b50f12ad-08ad-49fc-835b-f1242793086e (zie supplement).
- Bronleemte: Aanvullende opgeslagen AB-fragmenten beschikbaar; actuele consolidatie en volledige gevolgtrekking niet bevestigd. Arboregeling, medische of technische bronnen waar vereist blijven open.
- Toepasselijkheid: Historische werkorganisatiecontext uit 2000; duur- en pauzevoorschriften zijn niet actueel gevalideerd.
- Uitzonderingen/gevolgtrekking: Taakafwisseling heeft actuele wettelijke context; duur en toepasselijkheidsuitzonderingen apart controleren.
- Kandidaatvragen: geen F4-koppeling. Regels: geen.
- Conceptadvies: Taakafwisseling heeft actuele wettelijke context; duur en toepasselijkheidsuitzonderingen apart controleren. Niet als F4-bewijs gebruiken; buiten scope of aanvullende primaire onderbouwing nodig.
- Menselijk besluit / reviewer / datum / revisie / onderbouwing / vervolgactie: **niet ingevuld**.

### ai-02:c6 — f8ce0888-9afb-4f65-9dd0-96c9ef7e9803

Software kan als taakgeschikt worden beschouwd wanneer zij de gebruiker ondersteunt bij een effectieve en efficiënte taakuitvoering.

- Dossierlabel: **INSUFFICIENT_EVIDENCE**; hergebruikadvies: OUTSIDE_F4.
- Kandidaatgrondslag: Arboregeling 5.3. Actueel exact artikel/lid bevestigd: nee.
- Bestaande historische bron: AI-02, Tweede herziene druk, bronrevisie 1c89b363-3811-4074-95b2-09d57bb92093, fragment da7b2754-78b0-4fa7-ab5b-dfb33644a102 (7.2.1 Geschikt voor de taak), REVIEW_REQUIRED.
- Primaire kandidaatfragmenten: ontbreken.
- Aanvullende kandidaatbepalingen: AB 5.12. Exacte fragmenten: f4ab2428-7a8a-4408-a672-2c38a60a597c (zie supplement).
- Bronleemte: Aanvullende opgeslagen AB-fragmenten beschikbaar; actuele consolidatie en volledige gevolgtrekking niet bevestigd. Arboregeling, medische of technische bronnen waar vereist blijven open.
- Toepasselijkheid: Historische software-ergonomische aanbeveling uit 2000; actuele toepasbaarheid vereist afzonderlijke validatie.
- Uitzonderingen/gevolgtrekking: Softwaregeschiktheid is contextafhankelijk; geen ongedocumenteerde productiviteitstoets.
- Kandidaatvragen: geen F4-koppeling. Regels: geen.
- Conceptadvies: Softwaregeschiktheid is contextafhankelijk; geen ongedocumenteerde productiviteitstoets. Niet als F4-bewijs gebruiken; buiten scope of aanvullende primaire onderbouwing nodig.
- Menselijk besluit / reviewer / datum / revisie / onderbouwing / vervolgactie: **niet ingevuld**.

### ai-02:c7 — d90e9c3b-c703-4777-ba90-51416937ba0a

AI-02 bevat een historisch overzicht van normen waarnaar het informatieblad verwees.

- Dossierlabel: **INSUFFICIENT_EVIDENCE**; hergebruikadvies: HISTORICAL_ONLY.
- Kandidaatgrondslag: Historische editie; actuele normen niet vastgesteld. Actueel exact artikel/lid bevestigd: nee.
- Bestaande historische bron: AI-02, Tweede herziene druk, bronrevisie 1c89b363-3811-4074-95b2-09d57bb92093, fragment e644603b-9de9-4be9-a931-76bb4797d41c (10 Normen), REVIEW_REQUIRED.
- Primaire kandidaatfragmenten: ontbreken.
- Bronleemte: Geen exact primair artikel/lid/fragment bevestigd; kandidaatgrondslag is slechts een zoekingang. Specialistische bronreview vereist.
- Toepasselijkheid: Uitsluitend historische broninformatie; geldigheid en actuele versies van de genoemde normen zijn niet onderzocht.
- Uitzonderingen/gevolgtrekking: Expliciet historisch normenoverzicht; uitsluitend archief. Niet promoveren tot actuele norm.
- Kandidaatvragen: geen F4-koppeling. Regels: geen.
- Conceptadvies: Expliciet historisch normenoverzicht; uitsluitend archief. Niet promoveren tot actuele norm. Niet als F4-bewijs gebruiken; buiten scope of aanvullende primaire onderbouwing nodig.
- Menselijk besluit / reviewer / datum / revisie / onderbouwing / vervolgactie: **niet ingevuld**.

### ai-02:c8 — 2876cbf5-e5f2-4d22-95d5-8402066ea81c

De checklist in AI-02 is bedoeld om taak, beeldscherm en werkplek langs de in het blad opgenomen aandachtspunten te beoordelen.

- Dossierlabel: **INSUFFICIENT_EVIDENCE**; hergebruikadvies: HISTORICAL_ONLY.
- Kandidaatgrondslag: AB 5.9 biedt geen validatie van deze score. Actueel exact artikel/lid bevestigd: nee.
- Bestaande historische bron: AI-02, Tweede herziene druk, bronrevisie 1c89b363-3811-4074-95b2-09d57bb92093, fragment 17f2c9e2-2cc5-4913-9dfe-9af6c467ab53 (11.1 Inleiding), REVIEW_REQUIRED.
- Primaire kandidaatfragmenten: ontbreken.
- Aanvullende kandidaatbepalingen: AB 5.9. Exacte fragmenten: bf60fbdd-e159-49a4-8105-0ece37babba7, e7bb2bd5-b930-43b0-baec-a4cd6ba3d20c (zie supplement).
- Bronleemte: Aanvullende opgeslagen AB-fragmenten beschikbaar; actuele consolidatie en volledige gevolgtrekking niet bevestigd. Arboregeling, medische of technische bronnen waar vereist blijven open.
- Toepasselijkheid: Historisch hulpmiddel uit 2000; eisen en scoremodel zijn niet actueel of inhoudelijk gevalideerd.
- Uitzonderingen/gevolgtrekking: Historische checklist/score niet gevalideerd als actuele beoordelingsmethodiek.
- Kandidaatvragen: geen F4-koppeling. Regels: geen.
- Conceptadvies: Historische checklist/score niet gevalideerd als actuele beoordelingsmethodiek. Niet als F4-bewijs gebruiken; buiten scope of aanvullende primaire onderbouwing nodig.
- Menselijk besluit / reviewer / datum / revisie / onderbouwing / vervolgactie: **niet ingevuld**.

### ai-03:review:c1 — b7d94561-ba89-4a53-9e28-fc41bf7f4145

Aan het uiterlijk alleen is niet eenduidig vast te stellen of materiaal asbest bevat; twijfel vraagt nader materiaalonderzoek.

- Dossierlabel: **INSUFFICIENT_EVIDENCE**; hergebruikadvies: OUTSIDE_F4.
- Kandidaatgrondslag: AB hoofdstuk 4 afdeling asbest; exact toepasselijk artikel nog te verifiëren. Actueel exact artikel/lid bevestigd: nee.
- Bestaande historische bron: AI-03, 2001 — Tweede herziene druk, bronrevisie d149d554-61c4-462e-9876-183e3e431aeb, fragment eacbadb8-b77f-48f5-a174-111cfbde7c1e (3.4), REVIEW_REQUIRED.
- Primaire kandidaatfragmenten: ontbreken.
- Aanvullende kandidaatbepalingen: AB 4.54a. Exacte fragmenten: b9706b4f-4e2a-405a-ac43-28cf6e5d9046, 3703dd94-f513-4f13-a5d3-360e6fb9dfe8, 012503be-1b3d-4c80-a7b4-487d1f004dbe, c4a09ea5-1fdf-492d-8843-374f8f09465e, 6ba5d678-9cd7-4f5d-a8dd-28e6bdc2f192, b6787701-7541-48fc-bbca-9de5c4572878, 18204c0b-ddce-4164-8a1f-6e1b29dc6dfe, 407f6853-3df7-4709-9a04-d36da82ae1eb, beb3b40b-aa39-4311-ac35-0a4fbe3fa1f8, e630c4ad-441f-46bf-baf7-8a87c2f2b981 (zie supplement).
- Bronleemte: Aanvullende opgeslagen AB-fragmenten beschikbaar; actuele consolidatie en volledige gevolgtrekking niet bevestigd. Arboregeling, medische of technische bronnen waar vereist blijven open.
- Toepasselijkheid: Historische vakinhoudelijke herkenningsregel; actuele inventarisatie- en certificatie-eisen moeten worden gecontroleerd.
- Uitzonderingen/gevolgtrekking: Materiaalherkenning/asbestinventarisatie vraagt deskundigheid en actuele uitzonderingen; geen F4-regel.
- Kandidaatvragen: geen F4-koppeling. Regels: geen.
- Conceptadvies: Materiaalherkenning/asbestinventarisatie vraagt deskundigheid en actuele uitzonderingen; geen F4-regel. Niet als F4-bewijs gebruiken; buiten scope of aanvullende primaire onderbouwing nodig.
- Menselijk besluit / reviewer / datum / revisie / onderbouwing / vervolgactie: **niet ingevuld**.

### ai-03:review:c2 — 25e57824-f15c-4545-859e-e743c3c8b989

Ingeademde asbestvezels kunnen in de longen achterblijven en blootstelling kan pas na jaren ernstige gezondheidsschade veroorzaken.

- Dossierlabel: **INSUFFICIENT_EVIDENCE**; hergebruikadvies: OUTSIDE_F4.
- Kandidaatgrondslag: Actuele primaire medische bron ontbreekt. Actueel exact artikel/lid bevestigd: nee.
- Bestaande historische bron: AI-03, 2001 — Tweede herziene druk, bronrevisie d149d554-61c4-462e-9876-183e3e431aeb, fragment 2a3045df-fe3d-4706-82d0-2c061522e4ac (1.3), REVIEW_REQUIRED.
- Primaire kandidaatfragmenten: ontbreken.
- Aanvullende kandidaatbepalingen: AB 4.45 lid 1. Exacte fragmenten: 5e8203fc-0426-45b1-b355-30888d8b0d76 (zie supplement).
- Bronleemte: Aanvullende opgeslagen AB-fragmenten beschikbaar; actuele consolidatie en volledige gevolgtrekking niet bevestigd. Arboregeling, medische of technische bronnen waar vereist blijven open.
- Toepasselijkheid: Historische gezondheidskundige bron; actualiseren met RIVM, Arboportaal, Arbeidsinspectie en actuele regelgeving.
- Uitzonderingen/gevolgtrekking: Kritieke gezondheidsclaim: actuele medische onderbouwing én onafhankelijke bron vereist; niet beschikbaar in claimbinding.
- Kandidaatvragen: geen F4-koppeling. Regels: geen.
- Conceptadvies: Kritieke gezondheidsclaim: actuele medische onderbouwing én onafhankelijke bron vereist; niet beschikbaar in claimbinding. Niet als F4-bewijs gebruiken; buiten scope of aanvullende primaire onderbouwing nodig.
- Menselijk besluit / reviewer / datum / revisie / onderbouwing / vervolgactie: **niet ingevuld**.

### ai-04:review:c1 — a59c1724-b062-44af-9bbe-7714af0bb9c6

Een geluidsbeoordeling moet opnieuw worden uitgevoerd wanneer de geluidssituatie wijzigt of de eerdere beoordeling mogelijk onjuist is.

- Dossierlabel: **INSUFFICIENT_EVIDENCE**; hergebruikadvies: OUTSIDE_F4.
- Kandidaatgrondslag: AB 6.7; exacte voorwaarden opnieuw beoordelen. Actueel exact artikel/lid bevestigd: nee.
- Bestaande historische bron: AI-04, 2000 — Tweede herziene druk, bronrevisie 35cd9574-c48d-41dc-be52-8fd9b87fe0a5, fragment 4518b1e9-5acd-462e-bdde-bf4842b5998e (15), REVIEW_REQUIRED.
- Primaire kandidaatfragmenten: ontbreken.
- Aanvullende kandidaatbepalingen: AB 6.7 lid 1; AB 6.7 lid 2. Exacte fragmenten: 3890403d-3aa6-47d2-afad-e1d696a90198, b54b0346-8db2-484a-b0d3-9f957c231737 (zie supplement).
- Bronleemte: Aanvullende opgeslagen AB-fragmenten beschikbaar; actuele consolidatie en volledige gevolgtrekking niet bevestigd. Arboregeling, medische of technische bronnen waar vereist blijven open.
- Toepasselijkheid: Historische methodische regel; actuele wettelijke meet- en beoordelingsvereisten verifiëren.
- Uitzonderingen/gevolgtrekking: Blootstellingsmeting afhankelijk van werkelijke geluidsrisico's; oude grenswaarden niet hergebruiken.
- Kandidaatvragen: geen F4-koppeling. Regels: geen.
- Conceptadvies: Blootstellingsmeting afhankelijk van werkelijke geluidsrisico's; oude grenswaarden niet hergebruiken. Niet als F4-bewijs gebruiken; buiten scope of aanvullende primaire onderbouwing nodig.
- Menselijk besluit / reviewer / datum / revisie / onderbouwing / vervolgactie: **niet ingevuld**.

### ai-04:review:c2 — eb267676-f173-49a2-a70d-c0b254ccc038

Bij lawaaibestrijding wordt eerst onderzocht of reductie aan de bron mogelijk is, voordat maatregelen in de overdrachtsweg of bij werknemers worden ingezet.

- Dossierlabel: **INSUFFICIENT_EVIDENCE**; hergebruikadvies: OUTSIDE_F4.
- Kandidaatgrondslag: AB 6.8. Actueel exact artikel/lid bevestigd: nee.
- Bestaande historische bron: AI-04, 2000 — Tweede herziene druk, bronrevisie 35cd9574-c48d-41dc-be52-8fd9b87fe0a5, fragment c827e40c-7ff7-43db-a393-fc097fb7bef7 (8.1), REVIEW_REQUIRED.
- Primaire kandidaatfragmenten: ontbreken.
- Aanvullende kandidaatbepalingen: AB 6.8 lid 1; AB 6.8 lid 2. Exacte fragmenten: bf65ecac-acce-4973-98cb-ae8306f99083, 16ce6f6f-8b29-4853-baf4-35a8c22fa78d, df248ddb-69aa-4fa5-9360-2eafaf2fe994, 3aca7749-3ba9-42e1-8d90-8d33a31652af, 3459f0f3-ec5b-4e08-b313-6bd72c01b4b0, afe2e21b-b591-4800-9441-929d3212fd11, fd45b289-a568-4486-b7b4-06496ccec342, 871ce33d-ac30-4717-bcf1-1873e08fcb54, ee85aa54-e27d-4b56-b423-0ecf694a41c1, 9df6f309-b4bc-44d2-9815-68bc0642ef8e, 7af72765-4a27-4e40-b22b-449b61bd301b, c2c4ecc7-2cbb-4238-b5fa-ffad1632fb4d, 27248587-8696-41cd-a012-c48d4ef05812 (zie supplement).
- Bronleemte: Aanvullende opgeslagen AB-fragmenten beschikbaar; actuele consolidatie en volledige gevolgtrekking niet bevestigd. Arboregeling, medische of technische bronnen waar vereist blijven open.
- Toepasselijkheid: Historische arbeidshygiënische strategie; actualiseren met Arbobesluit, Arbeidsinspectie, Arboportaal en arbocatalogi.
- Uitzonderingen/gevolgtrekking: Arbeidshygiënische volgorde bruikbaar; directe actuele claim ontbreekt.
- Kandidaatvragen: geen F4-koppeling. Regels: geen.
- Conceptadvies: Arbeidshygiënische volgorde bruikbaar; directe actuele claim ontbreekt. Niet als F4-bewijs gebruiken; buiten scope of aanvullende primaire onderbouwing nodig.
- Menselijk besluit / reviewer / datum / revisie / onderbouwing / vervolgactie: **niet ingevuld**.

### ai-05:review:c1 — 1e6cce86-745f-4aa1-ae96-1563cb1b51a1

Voor het betreden van een besloten ruimte is doeltreffende ventilatie nodig en zijn herhalingsmetingen nodig wanneer blijvende veilige omstandigheden onzeker zijn.

- Dossierlabel: **INSUFFICIENT_EVIDENCE**; hergebruikadvies: OUTSIDE_F4.
- Kandidaatgrondslag: AB 3.5g; Arboportaal verstikkingsgevaar. Actueel exact artikel/lid bevestigd: nee.
- Bestaande historische bron: AI-05, 2000 — Tweede herziene druk, bronrevisie 502b5cf1-144d-4aaa-89d5-f1165dde47f9, fragment 7a10e1a8-13d3-4809-aa0f-69e2530c2fab (19), REVIEW_REQUIRED.
- Primaire kandidaatfragmenten: ontbreken.
- Aanvullende kandidaatbepalingen: AB 3.5g lid 1; AB 3.5g lid 2; AB 3.5g lid 4. Exacte fragmenten: 1bd38ed1-58ab-4675-8b00-f042bfc53292, 12a8dc44-de5f-4fb2-a770-f697c47a2c15, df19a197-b3ad-483a-8e4a-edec0731835d, 97c678f4-2f12-4454-ac4f-dc94ad47678e, 75bd7694-54a5-4d80-8859-9774f0cbe635 (zie supplement).
- Bronleemte: Aanvullende opgeslagen AB-fragmenten beschikbaar; actuele consolidatie en volledige gevolgtrekking niet bevestigd. Arboregeling, medische of technische bronnen waar vereist blijven open.
- Toepasselijkheid: Historische veiligheidsmethodiek; grenswaarden, meetcriteria en uitzonderingen vereisen actuele regelgeving en Arbeidsinspectie/Arboportaal.
- Uitzonderingen/gevolgtrekking: Kritiek beslotenruimterisico: ventilatie alleen is geen veiligverklaring; specialistische meet-/reddingsvoorwaarden ontbreken.
- Kandidaatvragen: geen F4-koppeling. Regels: geen.
- Conceptadvies: Kritiek beslotenruimterisico: ventilatie alleen is geen veiligverklaring; specialistische meet-/reddingsvoorwaarden ontbreken. Niet als F4-bewijs gebruiken; buiten scope of aanvullende primaire onderbouwing nodig.
- Menselijk besluit / reviewer / datum / revisie / onderbouwing / vervolgactie: **niet ingevuld**.

### ai-05:review:c2 — 65b56e92-248e-48fc-b0dd-57206f319a94

De noodprocedure voor werkzaamheden in een besloten ruimte moet verantwoordelijkheden en technische en organisatorische noodmaatregelen vastleggen.

- Dossierlabel: **INSUFFICIENT_EVIDENCE**; hergebruikadvies: OUTSIDE_F4.
- Kandidaatgrondslag: AB 3.5g; AW 15. Actueel exact artikel/lid bevestigd: nee.
- Bestaande historische bron: AI-05, 2000 — Tweede herziene druk, bronrevisie 502b5cf1-144d-4aaa-89d5-f1165dde47f9, fragment af7c1f58-852d-4da0-87fa-3c259acb0467 (19), REVIEW_REQUIRED.
- Primaire kandidaatfragmenten: ontbreken.
- Aanvullende kandidaatbepalingen: AB 3.5g lid 4. Exacte fragmenten: df19a197-b3ad-483a-8e4a-edec0731835d, 97c678f4-2f12-4454-ac4f-dc94ad47678e, 75bd7694-54a5-4d80-8859-9774f0cbe635 (zie supplement).
- Bronleemte: Aanvullende opgeslagen AB-fragmenten beschikbaar; actuele consolidatie en volledige gevolgtrekking niet bevestigd. Arboregeling, medische of technische bronnen waar vereist blijven open.
- Toepasselijkheid: Historische noodorganisatieprincipes; actuele eisen en sectorale arbocatalogi moeten worden gekruisvalideerd.
- Uitzonderingen/gevolgtrekking: Redding besloten ruimte is niet gedekt door algemene BHV-claim; aparte deskundige review en tweede onafhankelijke bron.
- Kandidaatvragen: geen F4-koppeling. Regels: geen.
- Conceptadvies: Redding besloten ruimte is niet gedekt door algemene BHV-claim; aparte deskundige review en tweede onafhankelijke bron. Niet als F4-bewijs gebruiken; buiten scope of aanvullende primaire onderbouwing nodig.
- Menselijk besluit / reviewer / datum / revisie / onderbouwing / vervolgactie: **niet ingevuld**.

### ai-06:review:c1 — 222b9fff-b457-430d-8bdd-4a6d6886e488

Vervanging door een minder gevaarlijke stof of proces is de meest effectieve bronmaatregel tegen blootstelling aan kankerverwekkende stoffen.

- Dossierlabel: **INSUFFICIENT_EVIDENCE**; hergebruikadvies: OUTSIDE_F4.
- Kandidaatgrondslag: AB 4.17; Arboportaal kankerverwekkende stoffen. Actueel exact artikel/lid bevestigd: nee.
- Bestaande historische bron: AI-06, 2000 — Tweede herziene druk, bronrevisie 3863eda1-535a-4ffa-8e92-a402a5cd8600, fragment 072c0c2a-536d-4559-abde-e9b4b5960a1a (3.1), REVIEW_REQUIRED.
- Primaire kandidaatfragmenten: ontbreken.
- Aanvullende kandidaatbepalingen: AB 4.17. Exacte fragmenten: 08e8d3f7-3e94-4391-841e-bdb4b8ac87ea (zie supplement).
- Bronleemte: Aanvullende opgeslagen AB-fragmenten beschikbaar; actuele consolidatie en volledige gevolgtrekking niet bevestigd. Arboregeling, medische of technische bronnen waar vereist blijven open.
- Toepasselijkheid: Historische arbeidshygiënische methodiek; actuele substitutieplicht en uitzonderingen verifiëren in wetgeving en Arbeidsinspectie/Arboportaal.
- Uitzonderingen/gevolgtrekking: Substitutie-eis kent actuele stof-/technische context; historische categorieën niet overnemen.
- Kandidaatvragen: geen F4-koppeling. Regels: geen.
- Conceptadvies: Substitutie-eis kent actuele stof-/technische context; historische categorieën niet overnemen. Niet als F4-bewijs gebruiken; buiten scope of aanvullende primaire onderbouwing nodig.
- Menselijk besluit / reviewer / datum / revisie / onderbouwing / vervolgactie: **niet ingevuld**.

### ai-06:review:c2 — 5f8e2489-5668-44af-bb6f-08d9ec335558

Ademhalingsbescherming mag niet de enige beheersmaatregel zijn wanneer technische maatregelen zoals gesloten systemen of afzuiging uitvoerbaar zijn.

- Dossierlabel: **INSUFFICIENT_EVIDENCE**; hergebruikadvies: OUTSIDE_F4.
- Kandidaatgrondslag: AB 4.18; AW 3 lid 1 onder b. Actueel exact artikel/lid bevestigd: nee.
- Bestaande historische bron: AI-06, 2000 — Tweede herziene druk, bronrevisie 3863eda1-535a-4ffa-8e92-a402a5cd8600, fragment 672ef1bd-ef27-493c-b95a-ff876ef6424a (18), REVIEW_REQUIRED.
- Primaire kandidaatfragmenten: ontbreken.
- Aanvullende kandidaatbepalingen: AB 4.18 lid 1; AB 4.18 lid 2; AB 4.18 lid 3; AB 4.18 lid 4. Exacte fragmenten: 9dbd6bed-103d-48ad-926a-b411c4b3d794, fedd9909-6def-4fbb-9346-75eb7198eec3, abce80a0-497c-45f9-92e9-2e5e3a4ac4fc, 1700e2d6-a886-491a-9d3f-5c531176dce0 (zie supplement).
- Bronleemte: Aanvullende opgeslagen AB-fragmenten beschikbaar; actuele consolidatie en volledige gevolgtrekking niet bevestigd. Arboregeling, medische of technische bronnen waar vereist blijven open.
- Toepasselijkheid: Historische beheersstrategie; actuele grenswaarden en wettelijke formulering niet overnemen zonder kruisvalidatie.
- Uitzonderingen/gevolgtrekking: Hiërarchie maatregelen niet reduceren tot voldoende PPE; actuele blootstellingsvoorwaarden ontbreken.
- Kandidaatvragen: geen F4-koppeling. Regels: geen.
- Conceptadvies: Hiërarchie maatregelen niet reduceren tot voldoende PPE; actuele blootstellingsvoorwaarden ontbreken. Niet als F4-bewijs gebruiken; buiten scope of aanvullende primaire onderbouwing nodig.
- Menselijk besluit / reviewer / datum / revisie / onderbouwing / vervolgactie: **niet ingevuld**.

### ai-07:review:c1 — c35649f8-43a8-4aff-9457-ecff8f1c73bc

De beleving van het binnenklimaat verschilt sterk tussen personen, waardoor een klimaatbeoordeling niet uitsluitend op één individuele ervaring kan steunen.

- Dossierlabel: **INSUFFICIENT_EVIDENCE**; hergebruikadvies: OUTSIDE_F4.
- Kandidaatgrondslag: AB 6.1; exacte comfortclaim nog te verifiëren. Actueel exact artikel/lid bevestigd: nee.
- Bestaande historische bron: AI-07, 2000 — Tweede herziene druk, bronrevisie f93481cc-8cb6-4d41-8c56-32608d93ea87, fragment 20fca7f4-0513-490b-a333-b8795f785b38 (06), REVIEW_REQUIRED.
- Primaire kandidaatfragmenten: ontbreken.
- Aanvullende kandidaatbepalingen: AB 6.1. Exacte fragmenten: 7f6ec87e-7464-42c9-99d5-a10f04d7cc75, 5a259d9f-ff97-4b69-a283-dbdb3820a3b2 (zie supplement).
- Bronleemte: Aanvullende opgeslagen AB-fragmenten beschikbaar; actuele consolidatie en volledige gevolgtrekking niet bevestigd. Arboregeling, medische of technische bronnen waar vereist blijven open.
- Toepasselijkheid: Historische vakinhoudelijke duiding; actuele normen en comfortcriteria moeten afzonderlijk worden gecontroleerd.
- Uitzonderingen/gevolgtrekking: Comfortbeleving is geen zelfstandig juridisch temperatuurcriterium.
- Kandidaatvragen: geen F4-koppeling. Regels: geen.
- Conceptadvies: Comfortbeleving is geen zelfstandig juridisch temperatuurcriterium. Niet als F4-bewijs gebruiken; buiten scope of aanvullende primaire onderbouwing nodig.
- Menselijk besluit / reviewer / datum / revisie / onderbouwing / vervolgactie: **niet ingevuld**.

### ai-07:review:c2 — 3ca81aa1-ef3d-4a9d-be5c-b24fe5503c20

Bij het plaatsen van scheidingswanden in kantoren moet aandacht blijven voor daglicht en uitzicht.

- Dossierlabel: **INSUFFICIENT_EVIDENCE**; hergebruikadvies: OUTSIDE_F4.
- Kandidaatgrondslag: AB 6.3; toepasselijkheid en uitzondering nog te verifiëren. Actueel exact artikel/lid bevestigd: nee.
- Bestaande historische bron: AI-07, 2000 — Tweede herziene druk, bronrevisie f93481cc-8cb6-4d41-8c56-32608d93ea87, fragment cb199fe9-1a15-47fb-aab0-62ff97793ee2 (24), REVIEW_REQUIRED.
- Primaire kandidaatfragmenten: ontbreken.
- Aanvullende kandidaatbepalingen: AB 6.3. Exacte fragmenten: 81e932c0-c3f1-46c5-84dc-0d628dabc9d0, a1f20ffa-2d2b-4468-b74a-dd70366fc789, 8fecff5d-1e2b-4487-a783-2c3c64ea6902, 7f343c89-031c-404b-9f2a-6a22a29d178b (zie supplement).
- Bronleemte: Aanvullende opgeslagen AB-fragmenten beschikbaar; actuele consolidatie en volledige gevolgtrekking niet bevestigd. Arboregeling, medische of technische bronnen waar vereist blijven open.
- Toepasselijkheid: Historisch kantoorontwerpprincipe; actuele bouwkundige en arbokaders verifiëren.
- Uitzonderingen/gevolgtrekking: Aanbevolen daglicht/uitzicht niet presenteren als onvoorwaardelijke eis voor elke scheidingswand.
- Kandidaatvragen: geen F4-koppeling. Regels: geen.
- Conceptadvies: Aanbevolen daglicht/uitzicht niet presenteren als onvoorwaardelijke eis voor elke scheidingswand. Niet als F4-bewijs gebruiken; buiten scope of aanvullende primaire onderbouwing nodig.
- Menselijk besluit / reviewer / datum / revisie / onderbouwing / vervolgactie: **niet ingevuld**.

### ai-08:review:c1 — 3bd81597-2868-4124-9eb3-1a5207ffe6ed

De samenstelling van het takenpakket kan worden gebruikt om afwisseling van werkhoudingen te bevorderen.

- Dossierlabel: **INSUFFICIENT_EVIDENCE**; hergebruikadvies: OUTSIDE_F4.
- Kandidaatgrondslag: AB 5.2 en 5.3. Actueel exact artikel/lid bevestigd: nee.
- Bestaande historische bron: AI-08, 2000 — Tweede herziene druk, bronrevisie f1ef2aa1-2edb-4b31-8aa3-b89abd3c837b, fragment fdfc5a11-b34b-4318-abe4-e8d940703160 (1.2), REVIEW_REQUIRED.
- Primaire kandidaatfragmenten: ontbreken.
- Aanvullende kandidaatbepalingen: AB 5.2; AB 5.3; AB 5.4. Exacte fragmenten: fe7251d8-d00b-4ac9-934c-5f058b9fe17d, 4686ce88-3e98-4d3f-aed9-0aadc31f4e97, f61cb83e-5e45-45b7-8722-442e791a815a, 19dd31f3-ef18-41d0-be2d-15c9d47ee507, 8091d691-0095-4165-8c59-ae447ae030e8 (zie supplement).
- Bronleemte: Aanvullende opgeslagen AB-fragmenten beschikbaar; actuele consolidatie en volledige gevolgtrekking niet bevestigd. Arboregeling, medische of technische bronnen waar vereist blijven open.
- Toepasselijkheid: Historische ergonomische methodiek; actuele TNO-, Arboportaal- en arbocatalogusbronnen gewenst.
- Uitzonderingen/gevolgtrekking: Taakvariatie als maatregel vraagt actuele risico-inventarisatie; geen vaste wettelijke wisselfrequentie afleiden.
- Kandidaatvragen: geen F4-koppeling. Regels: geen.
- Conceptadvies: Taakvariatie als maatregel vraagt actuele risico-inventarisatie; geen vaste wettelijke wisselfrequentie afleiden. Niet als F4-bewijs gebruiken; buiten scope of aanvullende primaire onderbouwing nodig.
- Menselijk besluit / reviewer / datum / revisie / onderbouwing / vervolgactie: **niet ingevuld**.

### ai-08:review:c2 — cee34d3e-508e-4159-9801-80bcff6bd494

Een te laag of te hoog werkvlak kan ongunstige houdingen veroorzaken; afstemming op werkhoogte en lichaamslengte is daarom relevant.

- Dossierlabel: **INSUFFICIENT_EVIDENCE**; hergebruikadvies: OUTSIDE_F4.
- Kandidaatgrondslag: AB 5.2 en 5.3. Actueel exact artikel/lid bevestigd: nee.
- Bestaande historische bron: AI-08, 2000 — Tweede herziene druk, bronrevisie f1ef2aa1-2edb-4b31-8aa3-b89abd3c837b, fragment eef44148-a66e-4970-96d0-e708fd407b86 (4.2.4), REVIEW_REQUIRED.
- Primaire kandidaatfragmenten: ontbreken.
- Aanvullende kandidaatbepalingen: AB 5.2; AB 5.3; AB 5.4. Exacte fragmenten: fe7251d8-d00b-4ac9-934c-5f058b9fe17d, 4686ce88-3e98-4d3f-aed9-0aadc31f4e97, f61cb83e-5e45-45b7-8722-442e791a815a, 19dd31f3-ef18-41d0-be2d-15c9d47ee507, 8091d691-0095-4165-8c59-ae447ae030e8 (zie supplement).
- Bronleemte: Aanvullende opgeslagen AB-fragmenten beschikbaar; actuele consolidatie en volledige gevolgtrekking niet bevestigd. Arboregeling, medische of technische bronnen waar vereist blijven open.
- Toepasselijkheid: Historische ergonomische basis; maatvoering en normatieve eisen vereisen actuele kruisvalidatie.
- Uitzonderingen/gevolgtrekking: Werkhoogte afhankelijk van taak/persoon; oude maatvoering geen actuele universele norm.
- Kandidaatvragen: geen F4-koppeling. Regels: geen.
- Conceptadvies: Werkhoogte afhankelijk van taak/persoon; oude maatvoering geen actuele universele norm. Niet als F4-bewijs gebruiken; buiten scope of aanvullende primaire onderbouwing nodig.
- Menselijk besluit / reviewer / datum / revisie / onderbouwing / vervolgactie: **niet ingevuld**.

### ai-09:review:c1 — c2cbaf61-1ae7-4e17-8227-d32451160363

Een RI&E voor biologische agentia moet rekening houden met de categorie agentia, mogelijke ziekten, allergene of toxische effecten en relevante onderzoeksresultaten.

- Dossierlabel: **INSUFFICIENT_EVIDENCE**; hergebruikadvies: OUTSIDE_F4.
- Kandidaatgrondslag: AB 4.85; Arboportaal biologische agentia. Actueel exact artikel/lid bevestigd: nee.
- Bestaande historische bron: AI-09, 2000 — Tweede herziene druk, bronrevisie d9218c25-8209-4119-b5f9-fbaa94eb2d98, fragment 86d33541-d0bf-433d-a01b-79aee5105b5f (15), REVIEW_REQUIRED.
- Primaire kandidaatfragmenten: ontbreken.
- Aanvullende kandidaatbepalingen: AB 4.85. Exacte fragmenten: 637a166f-8c40-4905-a025-85b4a47194f9, 9de30ba0-1c88-4263-9a26-bae0cdc47145, 6018f797-7de5-40ad-9bfb-f344b87a5075, 46b8e495-c38c-472d-bcac-aa0acd8c7033, 9db1f80f-5d11-4681-8d4a-f80089dff7b5, 729d0a5e-eaad-471a-9ca9-461eb41360b9, e8e09ef5-b527-476d-9888-0f6813930853, b3b70bc5-7e4f-44fb-befb-3b753775ff40 (zie supplement).
- Bronleemte: Aanvullende opgeslagen AB-fragmenten beschikbaar; actuele consolidatie en volledige gevolgtrekking niet bevestigd. Arboregeling, medische of technische bronnen waar vereist blijven open.
- Toepasselijkheid: Historische beoordelingsmethodiek; actuele classificaties en wettelijke RI&E-eisen verifiëren via RIVM, Arboportaal en wetgeving.
- Uitzonderingen/gevolgtrekking: Blootstelling/categorieën van agentia afzonderlijk vaststellen; algemene F4-vragen bevatten die feiten niet.
- Kandidaatvragen: geen F4-koppeling. Regels: geen.
- Conceptadvies: Blootstelling/categorieën van agentia afzonderlijk vaststellen; algemene F4-vragen bevatten die feiten niet. Niet als F4-bewijs gebruiken; buiten scope of aanvullende primaire onderbouwing nodig.
- Menselijk besluit / reviewer / datum / revisie / onderbouwing / vervolgactie: **niet ingevuld**.

### ai-09:review:c2 — 05879725-8124-4130-be34-9e0049523e0d

Beheersing van biologische agentia volgt een volgorde van bronbeperking, beperking van blootstellingsduur, collectieve maatregelen en pas daarna persoonlijke beschermingsmiddelen.

- Dossierlabel: **INSUFFICIENT_EVIDENCE**; hergebruikadvies: OUTSIDE_F4.
- Kandidaatgrondslag: AB 4.87; Arboportaal maatregelen biologische agentia. Actueel exact artikel/lid bevestigd: nee.
- Bestaande historische bron: AI-09, 2000 — Tweede herziene druk, bronrevisie d9218c25-8209-4119-b5f9-fbaa94eb2d98, fragment 9279997d-b65f-440f-b26f-2e354427767c (15), REVIEW_REQUIRED.
- Primaire kandidaatfragmenten: ontbreken.
- Aanvullende kandidaatbepalingen: AB 4.87. Exacte fragmenten: 7cadf8f0-89eb-4dad-ac71-6ff63cf43ff1 (zie supplement).
- Bronleemte: Aanvullende opgeslagen AB-fragmenten beschikbaar; actuele consolidatie en volledige gevolgtrekking niet bevestigd. Arboregeling, medische of technische bronnen waar vereist blijven open.
- Toepasselijkheid: Historische arbeidshygiënische strategie; actualiseren met actuele wetgeving, RIVM en sectorale guidance.
- Uitzonderingen/gevolgtrekking: Maatregelenhiërarchie vraagt werkelijke blootstelling en huidige classificatie.
- Kandidaatvragen: geen F4-koppeling. Regels: geen.
- Conceptadvies: Maatregelenhiërarchie vraagt werkelijke blootstelling en huidige classificatie. Niet als F4-bewijs gebruiken; buiten scope of aanvullende primaire onderbouwing nodig.
- Menselijk besluit / reviewer / datum / revisie / onderbouwing / vervolgactie: **niet ingevuld**.

### ai-10:c1 — 8e3409a2-d63d-44eb-a8e2-d096f16233d2

Volgens deze historische bron blijft de werkgever verantwoordelijk voor de BHV-organisatie wanneer een externe beveiligingsdienst een deel van de BHV-taken uitvoert.

- Dossierlabel: **REVIEW_REQUIRED**; hergebruikadvies: CANDIDATE.
- Kandidaatgrondslag: AW 15 lid 1. Actueel exact artikel/lid bevestigd: nee.
- Bestaande historische bron: AI-10, Uitgave 2001, bronrevisie 0734b34e-2d0c-4281-b580-3863b6591a0e, fragment 7f5636a3-e867-4bb2-8dd1-21919573e801 (2.1 Maatgevende factoren > Inschakeling externe deskundigen), REVIEW_REQUIRED.
- Primaire kandidaatfragmenten: b2f98c5f-e834-4ed6-a4fc-18f4dc83a153.
- Bronleemte: Actuele consolidatie, volledige context en exacte lidbinding nog door reviewer bevestigen.
- Toepasselijkheid: Historische verantwoordelijkheidsduiding uit 2001; vóór actueel gebruik toetsen aan geldende wetgeving en contractuele afspraken.
- Uitzonderingen/gevolgtrekking: Werkgeversverantwoordelijkheid kan worden hergebruikt als context na actuele review; uitbesteding is geen algemene vrijstelling.
- Kandidaatvragen: BHVORGANIZED. Regels: BHVORGANIZED-YES, BHVORGANIZED-PARTIAL, BHVORGANIZED-NO.
- Conceptadvies: Werkgeversverantwoordelijkheid kan worden hergebruikt als context na actuele review; uitbesteding is geen algemene vrijstelling. Hergebruik pas na actuele menselijke review; herformuleer waar de historische uitspraak te breed is.
- Menselijk besluit / reviewer / datum / revisie / onderbouwing / vervolgactie: **niet ingevuld**.

### ai-10:c10 — 9f4496f1-de92-4f47-9571-cea4037ae6be

Deze historische bron beschrijft dat het hoofd BHV in de eerste minuten leidinggeeft en dat professionele hulpdiensten bij aankomst de operationele leiding overnemen.

- Dossierlabel: **REVIEW_REQUIRED**; hergebruikadvies: CONTEXT.
- Kandidaatgrondslag: AW 15 ondersteunt niet automatisch deze bevelstructuur. Actueel exact artikel/lid bevestigd: nee.
- Bestaande historische bron: AI-10, Uitgave 2001, bronrevisie 0734b34e-2d0c-4281-b580-3863b6591a0e, fragment dc29d7c8-39f2-4918-b4fa-0f5d492fed82 (7.5 Gezagsverhouding bij een incident of calamiteit), REVIEW_REQUIRED.
- Primaire kandidaatfragmenten: b2f98c5f-e834-4ed6-a4fc-18f4dc83a153, 51cbd43d-cef7-4996-aad2-ffbb40b65913, 2cd49602-38a9-46a2-bc63-86b3c85be91d, 1b866171-9cf8-4800-8743-ca38f28f805a, cc5e9c5c-ac13-4951-b496-23cc8fb9ce47, a7937e40-a533-473f-9c8e-6739eaea23c3.
- Bronleemte: Actuele consolidatie, volledige context en exacte lidbinding nog door reviewer bevestigen.
- Toepasselijkheid: Historische gezagsduiding; actuele incidentorganisatie, bevoegdheden en lokale afspraken toetsen.
- Uitzonderingen/gevolgtrekking: Hoofd-BHV/overdracht niet als algemene wettelijke organisatiestructuur gebruiken; lokale afspraken nodig.
- Kandidaatvragen: geen F4-koppeling. Regels: geen.
- Conceptadvies: Hoofd-BHV/overdracht niet als algemene wettelijke organisatiestructuur gebruiken; lokale afspraken nodig. Hergebruik pas na actuele menselijke review; herformuleer waar de historische uitspraak te breed is.
- Menselijk besluit / reviewer / datum / revisie / onderbouwing / vervolgactie: **niet ingevuld**.

### ai-10:c2 — b08465d5-52b8-45a2-84a2-d619a428cac4

Deze historische bron beschrijft incidentscenario’s als redelijkerwijs mogelijke incidenten of calamiteiten en gebruikt ze als input voor gelijktijdige BHV-bezetting, opleidingskeuze en oefeningen.

- Dossierlabel: **REVIEW_REQUIRED**; hergebruikadvies: CANDIDATE.
- Kandidaatgrondslag: AW 15 lid 3 en AW 5. Actueel exact artikel/lid bevestigd: nee.
- Bestaande historische bron: AI-10, Uitgave 2001, bronrevisie 0734b34e-2d0c-4281-b580-3863b6591a0e, fragment 5ff25619-d1e6-4ccb-b91d-456415807876 (2.1 Maatgevende factoren > Incidentscenario's), REVIEW_REQUIRED.
- Primaire kandidaatfragmenten: 35058cfe-ea36-434b-a954-a78bcea9b898, a7937e40-a533-473f-9c8e-6739eaea23c3.
- Bronleemte: Actuele consolidatie, volledige context en exacte lidbinding nog door reviewer bevestigen.
- Toepasselijkheid: Historische vakmethodiek; actuele risico’s, scenario’s en organisatiecontext blijven bepalend.
- Uitzonderingen/gevolgtrekking: Scenario's helpen risicogebaseerde organisatie; geen verplicht standaardformat.
- Kandidaatvragen: BHVRISKBASED. Regels: BHVRISKBASED-YES, BHVRISKBASED-PARTIAL, BHVRISKBASED-NO.
- Conceptadvies: Scenario's helpen risicogebaseerde organisatie; geen verplicht standaardformat. Hergebruik pas na actuele menselijke review; herformuleer waar de historische uitspraak te breed is.
- Menselijk besluit / reviewer / datum / revisie / onderbouwing / vervolgactie: **niet ingevuld**.

### ai-10:c3 — cad71720-8279-4bb9-ba36-14ad8e8bfd99

Volgens deze historische bron volgen de vorm en het aantal BHV’ers uit de risico-inventarisatie en de maatgevende factoren.

- Dossierlabel: **REVIEW_REQUIRED**; hergebruikadvies: CANDIDATE.
- Kandidaatgrondslag: AW 15 lid 3. Actueel exact artikel/lid bevestigd: nee.
- Bestaande historische bron: AI-10, Uitgave 2001, bronrevisie 0734b34e-2d0c-4281-b580-3863b6591a0e, fragment d181b90e-4b68-4ff4-a8d1-614ec9e9266d (2.1 Maatgevende factoren > Vorm en aantal), REVIEW_REQUIRED.
- Primaire kandidaatfragmenten: a7937e40-a533-473f-9c8e-6739eaea23c3.
- Bronleemte: Actuele consolidatie, volledige context en exacte lidbinding nog door reviewer bevestigen.
- Toepasselijkheid: Geen actuele vaste aantalsnorm afleiden; de verderop in de bron genoemde historische 1-op-50-regel is bewust niet als claim opgenomen.
- Uitzonderingen/gevolgtrekking: Alleen risicogebaseerde bezetting; oude 1:50-norm uitdrukkelijk niet hergebruiken.
- Kandidaatvragen: BHVRISKBASED. Regels: BHVRISKBASED-YES, BHVRISKBASED-PARTIAL, BHVRISKBASED-NO.
- Conceptadvies: Alleen risicogebaseerde bezetting; oude 1:50-norm uitdrukkelijk niet hergebruiken. Hergebruik pas na actuele menselijke review; herformuleer waar de historische uitspraak te breed is.
- Menselijk besluit / reviewer / datum / revisie / onderbouwing / vervolgactie: **niet ingevuld**.

### ai-10:c4 — 4dc8e6f8-e2f3-40b4-a9e0-828983a8a411

Bij het bepalen van de BHV-organisatie noemt deze historische bron het aantal personen dat zich bij een ongeval of brand niet zelfstandig in veiligheid kan brengen als maatgevende factor.

- Dossierlabel: **REVIEW_REQUIRED**; hergebruikadvies: CANDIDATE.
- Kandidaatgrondslag: AW 15 lid 2 onder c en lid 3. Actueel exact artikel/lid bevestigd: nee.
- Bestaande historische bron: AI-10, Uitgave 2001, bronrevisie 0734b34e-2d0c-4281-b580-3863b6591a0e, fragment 00e311f6-266e-4d1b-a174-b703564ece1d (2.1 Maatgevende factoren > Zelfredzaamheid), REVIEW_REQUIRED.
- Primaire kandidaatfragmenten: 51cbd43d-cef7-4996-aad2-ffbb40b65913, 2cd49602-38a9-46a2-bc63-86b3c85be91d, 1b866171-9cf8-4800-8743-ca38f28f805a, cc5e9c5c-ac13-4951-b496-23cc8fb9ce47, a7937e40-a533-473f-9c8e-6739eaea23c3.
- Bronleemte: Actuele consolidatie, volledige context en exacte lidbinding nog door reviewer bevestigen.
- Toepasselijkheid: Historische scenarioduiding; per actuele locatie en doelgroep opnieuw beoordelen.
- Uitzonderingen/gevolgtrekking: Niet-zelfredzaamheid is scenariofactor, geen zelfstandig bewijs dat BHV voldoet.
- Kandidaatvragen: CW2-BHV-02, BHVRISKBASED. Regels: BHVRISKBASED-YES, BHVRISKBASED-PARTIAL, BHVRISKBASED-NO, CW2-BHV-02-YES, CW2-BHV-02-PARTIAL, CW2-BHV-02-NO.
- Conceptadvies: Niet-zelfredzaamheid is scenariofactor, geen zelfstandig bewijs dat BHV voldoet. Hergebruik pas na actuele menselijke review; herformuleer waar de historische uitspraak te breed is.
- Menselijk besluit / reviewer / datum / revisie / onderbouwing / vervolgactie: **niet ingevuld**.

### ai-10:c5 — 94ee9e0f-a995-4eab-8e24-16070e8ee5b0

Deze historische bron noemt voor vastlegging in het BHV-plan onder meer alarmnummers, incidentprocedures, taakverdeling, verantwoordelijkheden, roosters, plattegronden en opvang van externe hulpverleners.

- Dossierlabel: **REVIEW_REQUIRED**; hergebruikadvies: CONTEXT.
- Kandidaatgrondslag: AW 15; sectorspecifieke eisen afzonderlijk. Actueel exact artikel/lid bevestigd: nee.
- Bestaande historische bron: AI-10, Uitgave 2001, bronrevisie 0734b34e-2d0c-4281-b580-3863b6591a0e, fragment 2283cb77-4593-47c7-8dec-4577bb765b6e (3.1 BHV-plan), REVIEW_REQUIRED.
- Primaire kandidaatfragmenten: b2f98c5f-e834-4ed6-a4fc-18f4dc83a153, 51cbd43d-cef7-4996-aad2-ffbb40b65913, 2cd49602-38a9-46a2-bc63-86b3c85be91d, 1b866171-9cf8-4800-8743-ca38f28f805a, cc5e9c5c-ac13-4951-b496-23cc8fb9ce47, a7937e40-a533-473f-9c8e-6739eaea23c3.
- Bronleemte: Actuele consolidatie, volledige context en exacte lidbinding nog door reviewer bevestigen.
- Toepasselijkheid: Historische planinhoud; actuele eisen, middelen, rollen en gegevensminimalisatie afzonderlijk toetsen.
- Uitzonderingen/gevolgtrekking: BHV-plan is praktische invulling; geen universele afzonderlijke planplicht uit historische lijst afleiden.
- Kandidaatvragen: BHVRISKBASED. Regels: BHVRISKBASED-YES, BHVRISKBASED-PARTIAL, BHVRISKBASED-NO.
- Conceptadvies: BHV-plan is praktische invulling; geen universele afzonderlijke planplicht uit historische lijst afleiden. Hergebruik pas na actuele menselijke review; herformuleer waar de historische uitspraak te breed is.
- Menselijk besluit / reviewer / datum / revisie / onderbouwing / vervolgactie: **niet ingevuld**.

### ai-10:c6 — cedfbcff-57b2-4d8d-8ad5-42f55e7845f3

Volgens deze historische bron wordt de keuze voor oproep- en alarmeringsmiddelen afgestemd op risico’s en bedrijfstype en worden communicatie en alarmering tijdens ontruimingsoefeningen geoefend.

- Dossierlabel: **REVIEW_REQUIRED**; hergebruikadvies: CANDIDATE.
- Kandidaatgrondslag: AW 15 leden 2–3. Actueel exact artikel/lid bevestigd: nee.
- Bestaande historische bron: AI-10, Uitgave 2001, bronrevisie 0734b34e-2d0c-4281-b580-3863b6591a0e, fragment 31aa4699-0894-46be-9171-a4818ce10850 (3.2 Alarmering en communicatie), REVIEW_REQUIRED.
- Primaire kandidaatfragmenten: 51cbd43d-cef7-4996-aad2-ffbb40b65913, 2cd49602-38a9-46a2-bc63-86b3c85be91d, 1b866171-9cf8-4800-8743-ca38f28f805a, cc5e9c5c-ac13-4951-b496-23cc8fb9ce47, a7937e40-a533-473f-9c8e-6739eaea23c3.
- Bronleemte: Actuele consolidatie, volledige context en exacte lidbinding nog door reviewer bevestigen.
- Toepasselijkheid: Historische ontwerp- en oefenduiding; actuele techniek, toegankelijkheid en bedrijfscontext toetsen.
- Uitzonderingen/gevolgtrekking: Alarmeringsmiddelen afhankelijk van risico's en bereikbaarheid; concrete inrichting controleren.
- Kandidaatvragen: CW2-BHV-01. Regels: CW2-BHV-01-YES, CW2-BHV-01-PARTIAL, CW2-BHV-01-NO.
- Conceptadvies: Alarmeringsmiddelen afhankelijk van risico's en bereikbaarheid; concrete inrichting controleren. Hergebruik pas na actuele menselijke review; herformuleer waar de historische uitspraak te breed is.
- Menselijk besluit / reviewer / datum / revisie / onderbouwing / vervolgactie: **niet ingevuld**.

### ai-10:c7 — bb8a37f8-dc53-454c-a807-4df2e5aeb63e

Deze historische bron onderscheidt vier hoofdtaken voor de BHV-organisatie: eerste hulp, bestrijding van een beginnende brand, leiding bij ontruiming en communicatie.

- Dossierlabel: **REVIEW_REQUIRED**; hergebruikadvies: REWRITE_REVIEW.
- Kandidaatgrondslag: AW 15 lid 2 onder a–c. Actueel exact artikel/lid bevestigd: nee.
- Bestaande historische bron: AI-10, Uitgave 2001, bronrevisie 0734b34e-2d0c-4281-b580-3863b6591a0e, fragment 4cd9c5e9-6911-4d7d-a137-4c8ba42be8c8 (2.2 Taken BHV-ers), REVIEW_REQUIRED.
- Primaire kandidaatfragmenten: 51cbd43d-cef7-4996-aad2-ffbb40b65913, 2cd49602-38a9-46a2-bc63-86b3c85be91d, 1b866171-9cf8-4800-8743-ca38f28f805a, cc5e9c5c-ac13-4951-b496-23cc8fb9ce47.
- Bronleemte: Actuele consolidatie, volledige context en exacte lidbinding nog door reviewer bevestigen.
- Toepasselijkheid: Historische taakindeling; actuele wettelijke taakomschrijving en organisatorische invulling valideren.
- Uitzonderingen/gevolgtrekking: Historische indeling in vier taken niet gelijkstellen aan de actuele wettelijke opsomming.
- Kandidaatvragen: BHVORGANIZED. Regels: BHVORGANIZED-YES, BHVORGANIZED-PARTIAL, BHVORGANIZED-NO.
- Conceptadvies: Historische indeling in vier taken niet gelijkstellen aan de actuele wettelijke opsomming. Hergebruik pas na actuele menselijke review; herformuleer waar de historische uitspraak te breed is.
- Menselijk besluit / reviewer / datum / revisie / onderbouwing / vervolgactie: **niet ingevuld**.

### ai-10:c8 — 4e5427c0-8c67-47ed-aeaa-c6b69d126f20

Volgens deze historische bron hoort de opleiding of cursus van BHV’ers aan te sluiten op de bedrijfsrisico’s uit de risico-inventarisatie en eventuele incidentscenario’s.

- Dossierlabel: **REVIEW_REQUIRED**; hergebruikadvies: CANDIDATE.
- Kandidaatgrondslag: AW 15 lid 3. Actueel exact artikel/lid bevestigd: nee.
- Bestaande historische bron: AI-10, Uitgave 2001, bronrevisie 0734b34e-2d0c-4281-b580-3863b6591a0e, fragment 8479eac7-ea2d-44ae-82ff-e6173e408213 (4.1 Inleiding), REVIEW_REQUIRED.
- Primaire kandidaatfragmenten: a7937e40-a533-473f-9c8e-6739eaea23c3.
- Bronleemte: Actuele consolidatie, volledige context en exacte lidbinding nog door reviewer bevestigen.
- Toepasselijkheid: Historische opleidingsduiding; geen cursusduur of herhalingsinterval uit 2001 als actuele eis gebruiken.
- Uitzonderingen/gevolgtrekking: Opleiding afgestemd op risico/taak; geen universele herhalingsfrequentie of certificeringsplicht claimen.
- Kandidaatvragen: BHVPREPARED. Regels: BHVPREPARED-YES, BHVPREPARED-PARTIAL, BHVPREPARED-NO.
- Conceptadvies: Opleiding afgestemd op risico/taak; geen universele herhalingsfrequentie of certificeringsplicht claimen. Hergebruik pas na actuele menselijke review; herformuleer waar de historische uitspraak te breed is.
- Menselijk besluit / reviewer / datum / revisie / onderbouwing / vervolgactie: **niet ingevuld**.

### ai-10:c9 — 60f7515b-e26c-4f5f-a38a-bdf0eb192f7b

Deze historische bron beschrijft dat incidentscenario’s uit de risico-inventarisatie als oefenscenario’s kunnen worden gebruikt.

- Dossierlabel: **REVIEW_REQUIRED**; hergebruikadvies: CONTEXT.
- Kandidaatgrondslag: AW 15 lid 3. Actueel exact artikel/lid bevestigd: nee.
- Bestaande historische bron: AI-10, Uitgave 2001, bronrevisie 0734b34e-2d0c-4281-b580-3863b6591a0e, fragment 7b9e0728-a869-4ace-9c7c-ed0c4caa492b (5.1 Oefenscenario's), REVIEW_REQUIRED.
- Primaire kandidaatfragmenten: a7937e40-a533-473f-9c8e-6739eaea23c3.
- Bronleemte: Actuele consolidatie, volledige context en exacte lidbinding nog door reviewer bevestigen.
- Toepasselijkheid: Historische oefenduiding; geen vaste oefenfrequentie uit deze bron als actuele norm gebruiken.
- Uitzonderingen/gevolgtrekking: Scenario-oefening is praktische methode; aanwezigheid van oefenplan geen nalevingsbewijs.
- Kandidaatvragen: BHVPREPARED. Regels: BHVPREPARED-YES, BHVPREPARED-PARTIAL, BHVPREPARED-NO.
- Conceptadvies: Scenario-oefening is praktische methode; aanwezigheid van oefenplan geen nalevingsbewijs. Hergebruik pas na actuele menselijke review; herformuleer waar de historische uitspraak te breed is.
- Menselijk besluit / reviewer / datum / revisie / onderbouwing / vervolgactie: **niet ingevuld**.

### ai-11:review:c1 — 4aa93016-518c-456b-9a92-415e826bcf73

Wanneer een afscherming geregeld moet worden geopend voor controle, kan een transparante vaste afscherming controle buiten de gevaarlijke zone ondersteunen.

- Dossierlabel: **INSUFFICIENT_EVIDENCE**; hergebruikadvies: EXTRACTION_REVIEW.
- Kandidaatgrondslag: AB hoofdstuk 7; exact artikel en bronfragment ontbreken. Actueel exact artikel/lid bevestigd: nee.
- Bestaande historische bron: AI-11, 2000 — Tweede herziene druk, bronrevisie 7e05c491-424b-4b3e-80b3-34306f8af6a8, fragment 4b3abe6c-f86d-4cf5-a0f7-5be418b78ae6 (NEE), REVIEW_REQUIRED.
- Primaire kandidaatfragmenten: ontbreken.
- Aanvullende kandidaatbepalingen: AB 7.7 lid 1; AB 7.7 lid 6; AB 7.7 lid 7. Exacte fragmenten: 41a162e3-4140-4f3d-b57b-71fa43e65f62, 5a2f753f-051a-48b6-9b94-e36c240f4920, 42583ec3-6112-4b86-b9e4-636746af5a00 (zie supplement).
- Bronleemte: Aanvullende opgeslagen AB-fragmenten beschikbaar; actuele consolidatie en volledige gevolgtrekking niet bevestigd. Arboregeling, medische of technische bronnen waar vereist blijven open.
- Toepasselijkheid: Historisch ontwerpvoorbeeld; materiaal-, afstands- en normvereisten moeten actueel worden gevalideerd.
- Uitzonderingen/gevolgtrekking: Fragmentsectie is 'NEE': mogelijke extractie-/contextfout. Eerst originele passage valideren, geen conclusie uit kop.
- Kandidaatvragen: geen F4-koppeling. Regels: geen.
- Conceptadvies: Fragmentsectie is 'NEE': mogelijke extractie-/contextfout. Eerst originele passage valideren, geen conclusie uit kop. Niet als F4-bewijs gebruiken; buiten scope of aanvullende primaire onderbouwing nodig.
- Menselijk besluit / reviewer / datum / revisie / onderbouwing / vervolgactie: **niet ingevuld**.

### ai-11:review:c2 — 415bd227-6b90-421f-98c0-a82d9c447f21

Ook nadat een gevaarlijke machinebeweging is gestopt kan restenergie aanwezig blijven.

- Dossierlabel: **INSUFFICIENT_EVIDENCE**; hergebruikadvies: OUTSIDE_F4.
- Kandidaatgrondslag: AB hoofdstuk 7; deskundige technische review vereist. Actueel exact artikel/lid bevestigd: nee.
- Bestaande historische bron: AI-11, 2000 — Tweede herziene druk, bronrevisie 7e05c491-424b-4b3e-80b3-34306f8af6a8, fragment c0a9e577-dcda-406a-9692-eeacff0236bb (26), REVIEW_REQUIRED.
- Primaire kandidaatfragmenten: ontbreken.
- Aanvullende kandidaatbepalingen: AB 7.5 lid 2; AB 7.5 lid 3. Exacte fragmenten: 206e4e27-12b7-47b4-9ce9-db918ccd1641, daa5ec3a-1585-44c5-ae0c-b58c72c3a8fd (zie supplement).
- Bronleemte: Aanvullende opgeslagen AB-fragmenten beschikbaar; actuele consolidatie en volledige gevolgtrekking niet bevestigd. Arboregeling, medische of technische bronnen waar vereist blijven open.
- Toepasselijkheid: Tijdloos veiligheidskundig gevaar; actuele machinerichtlijnen en Arbeidsinspectie/normalisatie blijven nodig voor uitvoering.
- Uitzonderingen/gevolgtrekking: Restenergie na stop is specifieke machineveiligheid; geen algemene F4-positiefregel.
- Kandidaatvragen: geen F4-koppeling. Regels: geen.
- Conceptadvies: Restenergie na stop is specifieke machineveiligheid; geen algemene F4-positiefregel. Niet als F4-bewijs gebruiken; buiten scope of aanvullende primaire onderbouwing nodig.
- Menselijk besluit / reviewer / datum / revisie / onderbouwing / vervolgactie: **niet ingevuld**.

### ai-12:review:c1 — bfa3a12c-b177-4ab3-97a9-1e7030a9557b

Een RI&E moet gevaren voor zwangere werknemers en werknemers die borstvoeding geven herkenbaar meenemen.

- Dossierlabel: **REVIEW_REQUIRED**; hergebruikadvies: CANDIDATE.
- Kandidaatgrondslag: AB 1.41; AW 5; Arboportaal zwangerschap. Actueel exact artikel/lid bevestigd: nee.
- Bestaande historische bron: AI-12, 2000 — Tweede herziene druk, bronrevisie ce758624-ef86-47ff-8ff9-267967d8653b, fragment 4a942886-4ce2-4afe-92d5-b01e2aefb43b (vogelvlucht), REVIEW_REQUIRED.
- Primaire kandidaatfragmenten: 8b37edfd-3550-4f62-a33c-d76d4804c3e4, 35058cfe-ea36-434b-a954-a78bcea9b898.
- Bronleemte: Actuele consolidatie, volledige context en exacte lidbinding nog door reviewer bevestigen.
- Toepasselijkheid: Historische wettelijke duiding; actuele verplichtingen, terminologie en maatregelen verifiëren in wetgeving, Arboportaal en professionele guidance.
- Uitzonderingen/gevolgtrekking: Kandidaat bij bijzondere groepen; zwangerschap/blootstelling en specifieke maatregelen apart vaststellen.
- Kandidaatvragen: CW2-RIE-02. Regels: CW2-RIE-02-YES, CW2-RIE-02-PARTIAL, CW2-RIE-02-NO.
- Conceptadvies: Kandidaat bij bijzondere groepen; zwangerschap/blootstelling en specifieke maatregelen apart vaststellen. Hergebruik pas na actuele menselijke review; herformuleer waar de historische uitspraak te breed is.
- Menselijk besluit / reviewer / datum / revisie / onderbouwing / vervolgactie: **niet ingevuld**.

### ai-12:review:c2 — b05b24d4-2f9f-4819-9b3e-746913f020fe

Onregelmatige werktijden, avond- of nachtarbeid en overwerk kunnen voor zwangere werknemers extra belastend zijn.

- Dossierlabel: **INSUFFICIENT_EVIDENCE**; hergebruikadvies: OUTSIDE_F4.
- Kandidaatgrondslag: ATW 4:5–4:8: actuele primaire revisie nog te verifiëren. Actueel exact artikel/lid bevestigd: nee.
- Bestaande historische bron: AI-12, 2000 — Tweede herziene druk, bronrevisie ce758624-ef86-47ff-8ff9-267967d8653b, fragment ceb4c11b-9af9-4d5d-aabe-1ea44f46769c (4.1.2), REVIEW_REQUIRED.
- Primaire kandidaatfragmenten: ontbreken.
- Bronleemte: Geen exact primair artikel/lid/fragment bevestigd; kandidaatgrondslag is slechts een zoekingang. Specialistische bronreview vereist.
- Toepasselijkheid: Historische gezondheidskundige duiding; actuele medische richtlijnen, Arbeidstijdenwet en NVAB/Arboportaal vereist.
- Uitzonderingen/gevolgtrekking: Nacht-/overwerkclaim vereist mede Arbeidstijdenwet en individuele medische context; ontbreekt in bindings.
- Kandidaatvragen: geen F4-koppeling. Regels: geen.
- Conceptadvies: Nacht-/overwerkclaim vereist mede Arbeidstijdenwet en individuele medische context; ontbreekt in bindings. Niet als F4-bewijs gebruiken; buiten scope of aanvullende primaire onderbouwing nodig.
- Menselijk besluit / reviewer / datum / revisie / onderbouwing / vervolgactie: **niet ingevuld**.

### ai-13:review:c1 — c27e847c-a303-4619-83a4-4765d1f1817f

Een ergonomische inrichting van kassawerk begint met een analyse van handelingen, frequenties en benodigde apparatuur.

- Dossierlabel: **INSUFFICIENT_EVIDENCE**; hergebruikadvies: OUTSIDE_F4.
- Kandidaatgrondslag: AB 5.2 en 5.3. Actueel exact artikel/lid bevestigd: nee.
- Bestaande historische bron: AI-13, 2000 — Tweede herziene druk, bronrevisie 18970ac2-bea8-4c82-90fa-b4c940a5aeeb, fragment 3cee5159-046c-403b-8e3b-9fe852d0c36a (5.7), REVIEW_REQUIRED.
- Primaire kandidaatfragmenten: ontbreken.
- Aanvullende kandidaatbepalingen: AB 5.2; AB 5.3; AB 5.4. Exacte fragmenten: fe7251d8-d00b-4ac9-934c-5f058b9fe17d, 4686ce88-3e98-4d3f-aed9-0aadc31f4e97, f61cb83e-5e45-45b7-8722-442e791a815a, 19dd31f3-ef18-41d0-be2d-15c9d47ee507, 8091d691-0095-4165-8c59-ae447ae030e8 (zie supplement).
- Bronleemte: Aanvullende opgeslagen AB-fragmenten beschikbaar; actuele consolidatie en volledige gevolgtrekking niet bevestigd. Arboregeling, medische of technische bronnen waar vereist blijven open.
- Toepasselijkheid: Historische ergonomische methodiek; actuele TNO- en arbocatalogusbronnen gewenst voor maatvoering.
- Uitzonderingen/gevolgtrekking: Taakanalyse kassawerk is praktische ergonomische invulling; niet een algemene F4-plicht.
- Kandidaatvragen: geen F4-koppeling. Regels: geen.
- Conceptadvies: Taakanalyse kassawerk is praktische ergonomische invulling; niet een algemene F4-plicht. Niet als F4-bewijs gebruiken; buiten scope of aanvullende primaire onderbouwing nodig.
- Menselijk besluit / reviewer / datum / revisie / onderbouwing / vervolgactie: **niet ingevuld**.

### ai-13:review:c2 — de1ee47b-f2ab-4c17-81b5-01c0266c05f3

Kassamedewerkers kunnen door hun geldcontact een verhoogd risico lopen op winkelcriminaliteit en geweld, waarna opvang nodig kan zijn.

- Dossierlabel: **REVIEW_REQUIRED**; hergebruikadvies: CANDIDATE.
- Kandidaatgrondslag: AW 3 lid 2; AB 2.15. Actueel exact artikel/lid bevestigd: nee.
- Bestaande historische bron: AI-13, 2000 — Tweede herziene druk, bronrevisie 18970ac2-bea8-4c82-90fa-b4c940a5aeeb, fragment 099723f6-ebfe-4871-98e9-902421d83618 (6.4), REVIEW_REQUIRED.
- Primaire kandidaatfragmenten: 1c3acd5d-3ea0-4cb5-bec7-a740a2b7a13c, 906e0ad5-ecb2-4366-b86e-1a0e97980e66.
- Bronleemte: Actuele consolidatie, volledige context en exacte lidbinding nog door reviewer bevestigen.
- Toepasselijkheid: Historische psychosociale arbeidsbelasting; actuele wetgeving, Arbeidsinspectie, Arboportaal en branche-arbocatalogi moeten worden gekruisvalideerd.
- Uitzonderingen/gevolgtrekking: Agressierisico kan PSA-context ondersteunen, maar kassawerkclaim is geen volledige PSA-policybinding.
- Kandidaatvragen: CW2-PSA-01. Regels: CW2-PSA-01-YES, CW2-PSA-01-PARTIAL, CW2-PSA-01-NO.
- Conceptadvies: Agressierisico kan PSA-context ondersteunen, maar kassawerkclaim is geen volledige PSA-policybinding. Hergebruik pas na actuele menselijke review; herformuleer waar de historische uitspraak te breed is.
- Menselijk besluit / reviewer / datum / revisie / onderbouwing / vervolgactie: **niet ingevuld**.

## Regelmatrix — 131 antwoordregels en 10 scoperegels

De exacte voorwaarden, kandidaatfragmenten, alle antwoorduitkomsten en templatechecksums staan per ID in JSON. Onderstaande status is de bestaande configuratie, niet een juridisch vrijgegeven conclusie. De grondslag en uitzonderingen worden per regel opnieuw weergegeven; de negen holds blijven ongewijzigd.

| Regel | Karakter / grondslag | Toepasselijkheid / uitzondering | Status / onbekend | Reviewadvies |
| --- | --- | --- | --- | --- |
| GENERALPOLICY-YES (P0) | LEGAL_REQUIREMENT; AW 3 leden 1–4 | Samenhangend beleid is verplicht; een ja-antwoord is alleen indicatief en geen bewijs van alle onderdelen van artikel 3. | IN_ORDER; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Alleen indicatieve zelfverklaring over dit onderdeel; geen bewijs van volledige naleving.  |
| GENERALPOLICY-PARTIAL (P1) | LEGAL_REQUIREMENT; AW 3 leden 1–4 | Samenhangend beleid is verplicht; een ja-antwoord is alleen indicatief en geen bewijs van alle onderdelen van artikel 3. | ACTION_REQUIRED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Een tekortkoming is alleen gerechtvaardigd als toepasselijke plicht, feiten en antwoordbetekenis vaststaan; gedeeltelijk/nee kan ook onduidelijkheid maskeren.  |
| GENERALPOLICY-NO (P1) | LEGAL_REQUIREMENT; AW 3 leden 1–4 | Samenhangend beleid is verplicht; een ja-antwoord is alleen indicatief en geen bewijs van alle onderdelen van artikel 3. | ACTION_REQUIRED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Een tekortkoming is alleen gerechtvaardigd als toepasselijke plicht, feiten en antwoordbetekenis vaststaan; gedeeltelijk/nee kan ook onduidelijkheid maskeren.  |
| RIE-YES (P0) | LEGAL_REQUIREMENT; AW 5 lid 1 | Schriftelijke risico-inventarisatie met bijzondere groepen; een bestaanverklaring bewijst niet de kwaliteit. | IN_ORDER; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Alleen indicatieve zelfverklaring over dit onderdeel; geen bewijs van volledige naleving.  |
| RIE-PARTIAL (P1) | LEGAL_REQUIREMENT; AW 5 lid 1 | Schriftelijke risico-inventarisatie met bijzondere groepen; een bestaanverklaring bewijst niet de kwaliteit. | ACTION_REQUIRED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Een tekortkoming is alleen gerechtvaardigd als toepasselijke plicht, feiten en antwoordbetekenis vaststaan; gedeeltelijk/nee kan ook onduidelijkheid maskeren.  |
| RIE-NO (P1) | LEGAL_REQUIREMENT; AW 5 lid 1 | Schriftelijke risico-inventarisatie met bijzondere groepen; een bestaanverklaring bewijst niet de kwaliteit. | ACTION_REQUIRED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Een tekortkoming is alleen gerechtvaardigd als toepasselijke plicht, feiten en antwoordbetekenis vaststaan; gedeeltelijk/nee kan ook onduidelijkheid maskeren.  |
| RIEUPDATED-YES (P0) | LEGAL_REQUIREMENT; AW 5 lid 4 | Actualiseren bij aanleiding; geen vaste wettelijke jaarlijkse update opgelegd. | IN_ORDER; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Alleen indicatieve zelfverklaring over dit onderdeel; geen bewijs van volledige naleving.  |
| RIEUPDATED-PARTIAL (P1) | LEGAL_REQUIREMENT; AW 5 lid 4 | Actualiseren bij aanleiding; geen vaste wettelijke jaarlijkse update opgelegd. | ACTION_REQUIRED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Een tekortkoming is alleen gerechtvaardigd als toepasselijke plicht, feiten en antwoordbetekenis vaststaan; gedeeltelijk/nee kan ook onduidelijkheid maskeren.  |
| RIEUPDATED-NO (P1) | LEGAL_REQUIREMENT; AW 5 lid 4 | Actualiseren bij aanleiding; geen vaste wettelijke jaarlijkse update opgelegd. | ACTION_REQUIRED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Een tekortkoming is alleen gerechtvaardigd als toepasselijke plicht, feiten en antwoordbetekenis vaststaan; gedeeltelijk/nee kan ook onduidelijkheid maskeren.  |
| RIETESTING-YES (P0) | LEGAL_REQUIREMENT; AW 14 lid 1 onder a en leden 12–13; AB 2.14b leden 1–4 | OTHER sluit een geldig cao-model niet uit; betaalde uren sluiten DGA niet uit. Erkenning vereist exacte instrumentversie, sector en geldigheid. | NOT_ASSESSED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Bestaande hold behouden. Geen positief of negatief nalevingsoordeel uit dit antwoord. **HOLD behouden.** |
| RIETESTING-PARTIAL (P0) | LEGAL_REQUIREMENT; AW 14 lid 1 onder a en leden 12–13; AB 2.14b leden 1–4 | OTHER sluit een geldig cao-model niet uit; betaalde uren sluiten DGA niet uit. Erkenning vereist exacte instrumentversie, sector en geldigheid. | NOT_ASSESSED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Bestaande hold behouden. Geen positief of negatief nalevingsoordeel uit dit antwoord. **HOLD behouden.** |
| RIETESTING-NO (P0) | LEGAL_REQUIREMENT; AW 14 lid 1 onder a en leden 12–13; AB 2.14b leden 1–4 | OTHER sluit een geldig cao-model niet uit; betaalde uren sluiten DGA niet uit. Erkenning vereist exacte instrumentversie, sector en geldigheid. | NOT_ASSESSED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Bestaande hold behouden. Geen positief of negatief nalevingsoordeel uit dit antwoord. **HOLD behouden.** |
| CW2-RIE-01-YES (P0) | LEGAL_REQUIREMENT; AW 5 lid 1; AW 1 begrip arbeidsplaats | Alle relevante arbeid meenemen; thuiswerk/werk bij derden alleen als aanwezig. | IN_ORDER; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Alleen indicatieve zelfverklaring over dit onderdeel; geen bewijs van volledige naleving.  |
| CW2-RIE-01-PARTIAL (P1) | LEGAL_REQUIREMENT; AW 5 lid 1; AW 1 begrip arbeidsplaats | Alle relevante arbeid meenemen; thuiswerk/werk bij derden alleen als aanwezig. | ACTION_REQUIRED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Een tekortkoming is alleen gerechtvaardigd als toepasselijke plicht, feiten en antwoordbetekenis vaststaan; gedeeltelijk/nee kan ook onduidelijkheid maskeren.  |
| CW2-RIE-01-NO (P1) | LEGAL_REQUIREMENT; AW 5 lid 1; AW 1 begrip arbeidsplaats | Alle relevante arbeid meenemen; thuiswerk/werk bij derden alleen als aanwezig. | ACTION_REQUIRED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Een tekortkoming is alleen gerechtvaardigd als toepasselijke plicht, feiten en antwoordbetekenis vaststaan; gedeeltelijk/nee kan ook onduidelijkheid maskeren.  |
| CW2-RIE-02-YES (P0) | LEGAL_REQUIREMENT; AW 5 leden 1 en 5; AB 1.36 lid 1; AB 1.41 | Bijzondere groepen meenemen waar relevant; geen namen, zwangerschap of medische data verzamelen. | IN_ORDER; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Alleen indicatieve zelfverklaring over dit onderdeel; geen bewijs van volledige naleving.  |
| CW2-RIE-02-PARTIAL (P1) | LEGAL_REQUIREMENT; AW 5 leden 1 en 5; AB 1.36 lid 1; AB 1.41 | Bijzondere groepen meenemen waar relevant; geen namen, zwangerschap of medische data verzamelen. | ACTION_REQUIRED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Een tekortkoming is alleen gerechtvaardigd als toepasselijke plicht, feiten en antwoordbetekenis vaststaan; gedeeltelijk/nee kan ook onduidelijkheid maskeren.  |
| CW2-RIE-02-NO (P1) | LEGAL_REQUIREMENT; AW 5 leden 1 en 5; AB 1.36 lid 1; AB 1.41 | Bijzondere groepen meenemen waar relevant; geen namen, zwangerschap of medische data verzamelen. | ACTION_REQUIRED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Een tekortkoming is alleen gerechtvaardigd als toepasselijke plicht, feiten en antwoordbetekenis vaststaan; gedeeltelijk/nee kan ook onduidelijkheid maskeren.  |
| CW2-RIE-03-YES (P0) | LEGAL_REQUIREMENT; AW 5 lid 6 | Iedere werknemer moet kennis kunnen nemen van de RI&E. | IN_ORDER; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Alleen indicatieve zelfverklaring over dit onderdeel; geen bewijs van volledige naleving.  |
| CW2-RIE-03-PARTIAL (P1) | LEGAL_REQUIREMENT; AW 5 lid 6 | Iedere werknemer moet kennis kunnen nemen van de RI&E. | ACTION_REQUIRED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Een tekortkoming is alleen gerechtvaardigd als toepasselijke plicht, feiten en antwoordbetekenis vaststaan; gedeeltelijk/nee kan ook onduidelijkheid maskeren.  |
| CW2-RIE-03-NO (P1) | LEGAL_REQUIREMENT; AW 5 lid 6 | Iedere werknemer moet kennis kunnen nemen van de RI&E. | ACTION_REQUIRED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Een tekortkoming is alleen gerechtvaardigd als toepasselijke plicht, feiten en antwoordbetekenis vaststaan; gedeeltelijk/nee kan ook onduidelijkheid maskeren.  |
| C01-SCOPE-UNCERTAIN (P0) | LEGAL_REQUIREMENT; AW 1 leden 1–2; scope-afwijkingen vereisen afzonderlijke beoordeling | AW 1/16 en AB 9.5a: dienstverband, ingeleenden, gezag en vrijwilligers afzonderlijk beoordelen. AB 9.5a is opgenomen in het bronfragment-supplement; actuele consolidatie en juridische scopebinding blijven onbevestigd. AW 12 vanaf 1 juli 2026: OR/PVT of belanghebbende werknemers; geen automatische WOR-oprichtingsplicht. Tien scope-onzekerheidsregels vereisen afzonderlijke CONDITION-bindingen. Onbekende scope geeft nooit algemene vrijstelling. | NOT_ASSESSED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Scope-onzekerheid behouden; AW 1 bewijst niet alle afzonderlijke verplichtingen of uitzonderingen. Geen NVT-vrijstelling.  |
| ACTIONPLAN-YES (P0) | LEGAL_REQUIREMENT; AW 5 lid 3 | Plan is onderdeel van RI&E en bevat maatregelen en termijnen. | IN_ORDER; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Alleen indicatieve zelfverklaring over dit onderdeel; geen bewijs van volledige naleving.  |
| ACTIONPLAN-PARTIAL (P1) | LEGAL_REQUIREMENT; AW 5 lid 3 | Plan is onderdeel van RI&E en bevat maatregelen en termijnen. | ACTION_REQUIRED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Een tekortkoming is alleen gerechtvaardigd als toepasselijke plicht, feiten en antwoordbetekenis vaststaan; gedeeltelijk/nee kan ook onduidelijkheid maskeren.  |
| ACTIONPLAN-NO (P1) | LEGAL_REQUIREMENT; AW 5 lid 3 | Plan is onderdeel van RI&E en bevat maatregelen en termijnen. | ACTION_REQUIRED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Een tekortkoming is alleen gerechtvaardigd als toepasselijke plicht, feiten en antwoordbetekenis vaststaan; gedeeltelijk/nee kan ook onduidelijkheid maskeren.  |
| CW2-PVA-01-YES (P0) | LEGAL_REQUIREMENT; AW 5 lid 3 | Maatregelen horen bij de geïnventariseerde risico’s. | IN_ORDER; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Alleen indicatieve zelfverklaring over dit onderdeel; geen bewijs van volledige naleving.  |
| CW2-PVA-01-PARTIAL (P1) | LEGAL_REQUIREMENT; AW 5 lid 3 | Maatregelen horen bij de geïnventariseerde risico’s. | ACTION_REQUIRED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Een tekortkoming is alleen gerechtvaardigd als toepasselijke plicht, feiten en antwoordbetekenis vaststaan; gedeeltelijk/nee kan ook onduidelijkheid maskeren.  |
| CW2-PVA-01-NO (P1) | LEGAL_REQUIREMENT; AW 5 lid 3 | Maatregelen horen bij de geïnventariseerde risico’s. | ACTION_REQUIRED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Een tekortkoming is alleen gerechtvaardigd als toepasselijke plicht, feiten en antwoordbetekenis vaststaan; gedeeltelijk/nee kan ook onduidelijkheid maskeren.  |
| CW2-PVA-02-YES (P0) | LEGAL_REQUIREMENT; AW 5 lid 3 | Uitvoeringstermijnen zijn expliciet vereist. | IN_ORDER; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Alleen indicatieve zelfverklaring over dit onderdeel; geen bewijs van volledige naleving.  |
| CW2-PVA-02-PARTIAL (P1) | LEGAL_REQUIREMENT; AW 5 lid 3 | Uitvoeringstermijnen zijn expliciet vereist. | ACTION_REQUIRED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Een tekortkoming is alleen gerechtvaardigd als toepasselijke plicht, feiten en antwoordbetekenis vaststaan; gedeeltelijk/nee kan ook onduidelijkheid maskeren.  |
| CW2-PVA-02-NO (P1) | LEGAL_REQUIREMENT; AW 5 lid 3 | Uitvoeringstermijnen zijn expliciet vereist. | ACTION_REQUIRED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Een tekortkoming is alleen gerechtvaardigd als toepasselijke plicht, feiten en antwoordbetekenis vaststaan; gedeeltelijk/nee kan ook onduidelijkheid maskeren.  |
| CW2-PVA-03-YES (P0) | PRACTICAL_RECOMMENDATION; AW 3 lid 3 als context; geen afzonderlijk formatvoorschrift | Bewakingsafspraak operationaliseert taakverdeling; geen claim dat een specifiek actiehouderveld verplicht is. | IN_ORDER; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Alleen indicatieve zelfverklaring over dit onderdeel; geen bewijs van volledige naleving.  |
| CW2-PVA-03-PARTIAL (P1) | PRACTICAL_RECOMMENDATION; AW 3 lid 3 als context; geen afzonderlijk formatvoorschrift | Bewakingsafspraak operationaliseert taakverdeling; geen claim dat een specifiek actiehouderveld verplicht is. | ATTENTION_REQUIRED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Alleen praktisch verbeterpunt; niet als wettelijke overtreding presenteren.  |
| CW2-PVA-03-NO (P1) | PRACTICAL_RECOMMENDATION; AW 3 lid 3 als context; geen afzonderlijk formatvoorschrift | Bewakingsafspraak operationaliseert taakverdeling; geen claim dat een specifiek actiehouderveld verplicht is. | ATTENTION_REQUIRED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Alleen praktisch verbeterpunt; niet als wettelijke overtreding presenteren.  |
| C02-SCOPE-UNCERTAIN (P0) | LEGAL_REQUIREMENT; AW 1 leden 1–2; scope-afwijkingen vereisen afzonderlijke beoordeling | AW 1/16 en AB 9.5a: dienstverband, ingeleenden, gezag en vrijwilligers afzonderlijk beoordelen. AB 9.5a is opgenomen in het bronfragment-supplement; actuele consolidatie en juridische scopebinding blijven onbevestigd. AW 12 vanaf 1 juli 2026: OR/PVT of belanghebbende werknemers; geen automatische WOR-oprichtingsplicht. Tien scope-onzekerheidsregels vereisen afzonderlijke CONDITION-bindingen. Onbekende scope geeft nooit algemene vrijstelling. | NOT_ASSESSED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Scope-onzekerheid behouden; AW 1 bewijst niet alle afzonderlijke verplichtingen of uitzonderingen. Geen NVT-vrijstelling.  |
| PREVENTIONOFFICER-YES (P0) | LEGAL_REQUIREMENT; AW 13 leden 1–4 en 10 | Aanwijzing is niet de enige geldige uitvoering: werkgever/directeur bij maximaal 25, voldoende deskundigheid, of bijzondere externe bijstand. | NOT_ASSESSED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Bestaande hold behouden. Geen positief of negatief nalevingsoordeel uit dit antwoord. **HOLD behouden.** |
| PREVENTIONOFFICER-PARTIAL (P0) | LEGAL_REQUIREMENT; AW 13 leden 1–4 en 10 | Aanwijzing is niet de enige geldige uitvoering: werkgever/directeur bij maximaal 25, voldoende deskundigheid, of bijzondere externe bijstand. | NOT_ASSESSED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Bestaande hold behouden. Geen positief of negatief nalevingsoordeel uit dit antwoord. **HOLD behouden.** |
| PREVENTIONOFFICER-NO (P0) | LEGAL_REQUIREMENT; AW 13 leden 1–4 en 10 | Aanwijzing is niet de enige geldige uitvoering: werkgever/directeur bij maximaal 25, voldoende deskundigheid, of bijzondere externe bijstand. | NOT_ASSESSED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Bestaande hold behouden. Geen positief of negatief nalevingsoordeel uit dit antwoord. **HOLD behouden.** |
| PREVENTIONCONSULTATION-YES (P0) | LEGAL_REQUIREMENT; AW 13 lid 1 | Betrokkenheid is zwakker dan instemming; ontbreken OR/PVT geeft niet automatisch een overtreding van dit specifieke instemmingsrecht. | NOT_ASSESSED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Bestaande hold behouden. Geen positief of negatief nalevingsoordeel uit dit antwoord. **HOLD behouden.** |
| PREVENTIONCONSULTATION-PARTIAL (P0) | LEGAL_REQUIREMENT; AW 13 lid 1 | Betrokkenheid is zwakker dan instemming; ontbreken OR/PVT geeft niet automatisch een overtreding van dit specifieke instemmingsrecht. | NOT_ASSESSED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Bestaande hold behouden. Geen positief of negatief nalevingsoordeel uit dit antwoord. **HOLD behouden.** |
| PREVENTIONCONSULTATION-NO (P0) | LEGAL_REQUIREMENT; AW 13 lid 1 | Betrokkenheid is zwakker dan instemming; ontbreken OR/PVT geeft niet automatisch een overtreding van dit specifieke instemmingsrecht. | NOT_ASSESSED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Bestaande hold behouden. Geen positief of negatief nalevingsoordeel uit dit antwoord. **HOLD behouden.** |
| CW2-PRE-01-YES (P0) | LEGAL_REQUIREMENT; AW 13 leden 4 en 10 | Voldoende deskundigheid en ervaring voor aanwezige risico’s; geen universeel diploma. | IN_ORDER; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Alleen indicatieve zelfverklaring over dit onderdeel; geen bewijs van volledige naleving.  |
| CW2-PRE-01-PARTIAL (P1) | LEGAL_REQUIREMENT; AW 13 leden 4 en 10 | Voldoende deskundigheid en ervaring voor aanwezige risico’s; geen universeel diploma. | ACTION_REQUIRED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Een tekortkoming is alleen gerechtvaardigd als toepasselijke plicht, feiten en antwoordbetekenis vaststaan; gedeeltelijk/nee kan ook onduidelijkheid maskeren.  |
| CW2-PRE-01-NO (P1) | LEGAL_REQUIREMENT; AW 13 leden 4 en 10 | Voldoende deskundigheid en ervaring voor aanwezige risico’s; geen universeel diploma. | ACTION_REQUIRED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Een tekortkoming is alleen gerechtvaardigd als toepasselijke plicht, feiten en antwoordbetekenis vaststaan; gedeeltelijk/nee kan ook onduidelijkheid maskeren.  |
| CW2-PRE-02-YES (P0) | LEGAL_REQUIREMENT; AW 13 lid 4 | Genoeg tijd en uitrusting; geen vast minimum aantal uren. | IN_ORDER; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Alleen indicatieve zelfverklaring over dit onderdeel; geen bewijs van volledige naleving.  |
| CW2-PRE-02-PARTIAL (P1) | LEGAL_REQUIREMENT; AW 13 lid 4 | Genoeg tijd en uitrusting; geen vast minimum aantal uren. | ACTION_REQUIRED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Een tekortkoming is alleen gerechtvaardigd als toepasselijke plicht, feiten en antwoordbetekenis vaststaan; gedeeltelijk/nee kan ook onduidelijkheid maskeren.  |
| CW2-PRE-02-NO (P1) | LEGAL_REQUIREMENT; AW 13 lid 4 | Genoeg tijd en uitrusting; geen vast minimum aantal uren. | ACTION_REQUIRED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Een tekortkoming is alleen gerechtvaardigd als toepasselijke plicht, feiten en antwoordbetekenis vaststaan; gedeeltelijk/nee kan ook onduidelijkheid maskeren.  |
| CW2-PRE-03-YES (P0) | LEGAL_REQUIREMENT; AW 13 lid 7 onder a–c | Drie kerntaken; uitvoering kan medewerking zijn, geen exclusieve verantwoordelijkheid. | IN_ORDER; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Alleen indicatieve zelfverklaring over dit onderdeel; geen bewijs van volledige naleving.  |
| CW2-PRE-03-PARTIAL (P1) | LEGAL_REQUIREMENT; AW 13 lid 7 onder a–c | Drie kerntaken; uitvoering kan medewerking zijn, geen exclusieve verantwoordelijkheid. | ACTION_REQUIRED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Een tekortkoming is alleen gerechtvaardigd als toepasselijke plicht, feiten en antwoordbetekenis vaststaan; gedeeltelijk/nee kan ook onduidelijkheid maskeren.  |
| CW2-PRE-03-NO (P1) | LEGAL_REQUIREMENT; AW 13 lid 7 onder a–c | Drie kerntaken; uitvoering kan medewerking zijn, geen exclusieve verantwoordelijkheid. | ACTION_REQUIRED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Een tekortkoming is alleen gerechtvaardigd als toepasselijke plicht, feiten en antwoordbetekenis vaststaan; gedeeltelijk/nee kan ook onduidelijkheid maskeren.  |
| C03-SCOPE-UNCERTAIN (P0) | LEGAL_REQUIREMENT; AW 1 leden 1–2; scope-afwijkingen vereisen afzonderlijke beoordeling | AW 1/16 en AB 9.5a: dienstverband, ingeleenden, gezag en vrijwilligers afzonderlijk beoordelen. AB 9.5a is opgenomen in het bronfragment-supplement; actuele consolidatie en juridische scopebinding blijven onbevestigd. AW 12 vanaf 1 juli 2026: OR/PVT of belanghebbende werknemers; geen automatische WOR-oprichtingsplicht. Tien scope-onzekerheidsregels vereisen afzonderlijke CONDITION-bindingen. Onbekende scope geeft nooit algemene vrijstelling. | NOT_ASSESSED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Scope-onzekerheid behouden; AW 1 bewijst niet alle afzonderlijke verplichtingen of uitzonderingen. Geen NVT-vrijstelling.  |
| BASICCONTRACT-YES (P0) | LEGAL_REQUIREMENT; AW 14 leden 4–5 | Schriftelijke afspraken deskundige bijstand; maatwerk/vangnet niet gelijkstellen aan alleen een commerciële productnaam. | IN_ORDER; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Alleen indicatieve zelfverklaring over dit onderdeel; geen bewijs van volledige naleving.  |
| BASICCONTRACT-PARTIAL (P1) | LEGAL_REQUIREMENT; AW 14 leden 4–5 | Schriftelijke afspraken deskundige bijstand; maatwerk/vangnet niet gelijkstellen aan alleen een commerciële productnaam. | ACTION_REQUIRED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Een tekortkoming is alleen gerechtvaardigd als toepasselijke plicht, feiten en antwoordbetekenis vaststaan; gedeeltelijk/nee kan ook onduidelijkheid maskeren.  |
| BASICCONTRACT-NO (P1) | LEGAL_REQUIREMENT; AW 14 leden 4–5 | Schriftelijke afspraken deskundige bijstand; maatwerk/vangnet niet gelijkstellen aan alleen een commerciële productnaam. | ACTION_REQUIRED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Een tekortkoming is alleen gerechtvaardigd als toepasselijke plicht, feiten en antwoordbetekenis vaststaan; gedeeltelijk/nee kan ook onduidelijkheid maskeren.  |
| OCCUPATIONALPHYSICIANACCESS-YES (P0) | LEGAL_REQUIREMENT; AW 14 lid 1 onder c 3° en lid 2 onder e | Doeltreffende preventieve toegang; geen toestemming van werkgever als onnodige drempel. | IN_ORDER; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Alleen indicatieve zelfverklaring over dit onderdeel; geen bewijs van volledige naleving.  |
| OCCUPATIONALPHYSICIANACCESS-PARTIAL (P1) | LEGAL_REQUIREMENT; AW 14 lid 1 onder c 3° en lid 2 onder e | Doeltreffende preventieve toegang; geen toestemming van werkgever als onnodige drempel. | ACTION_REQUIRED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Een tekortkoming is alleen gerechtvaardigd als toepasselijke plicht, feiten en antwoordbetekenis vaststaan; gedeeltelijk/nee kan ook onduidelijkheid maskeren.  |
| OCCUPATIONALPHYSICIANACCESS-NO (P1) | LEGAL_REQUIREMENT; AW 14 lid 1 onder c 3° en lid 2 onder e | Doeltreffende preventieve toegang; geen toestemming van werkgever als onnodige drempel. | ACTION_REQUIRED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Een tekortkoming is alleen gerechtvaardigd als toepasselijke plicht, feiten en antwoordbetekenis vaststaan; gedeeltelijk/nee kan ook onduidelijkheid maskeren.  |
| EXPERTTASKSCOVERED-YES (P0) | LEGAL_REQUIREMENT; AW 14 lid 1 onder a–c en lid 4 | Alle relevante taken zijn niet met één ongespecificeerd antwoord vast te stellen; aanstellingskeuring en RI&E-toetsing kennen voorwaarden. | NOT_ASSESSED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Bestaande hold behouden. Geen positief of negatief nalevingsoordeel uit dit antwoord. **HOLD behouden.** |
| EXPERTTASKSCOVERED-PARTIAL (P0) | LEGAL_REQUIREMENT; AW 14 lid 1 onder a–c en lid 4 | Alle relevante taken zijn niet met één ongespecificeerd antwoord vast te stellen; aanstellingskeuring en RI&E-toetsing kennen voorwaarden. | NOT_ASSESSED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Bestaande hold behouden. Geen positief of negatief nalevingsoordeel uit dit antwoord. **HOLD behouden.** |
| EXPERTTASKSCOVERED-NO (P0) | LEGAL_REQUIREMENT; AW 14 lid 1 onder a–c en lid 4 | Alle relevante taken zijn niet met één ongespecificeerd antwoord vast te stellen; aanstellingskeuring en RI&E-toetsing kennen voorwaarden. | NOT_ASSESSED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Bestaande hold behouden. Geen positief of negatief nalevingsoordeel uit dit antwoord. **HOLD behouden.** |
| CW2-BC-01-YES (P0) | LEGAL_REQUIREMENT; AW 14 lid 2 onder f en lid 5 | Bedrijfsarts kan iedere arbeidsplaats bezoeken; geen vaste bezoekfrequentie. | IN_ORDER; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Alleen indicatieve zelfverklaring over dit onderdeel; geen bewijs van volledige naleving.  |
| CW2-BC-01-PARTIAL (P1) | LEGAL_REQUIREMENT; AW 14 lid 2 onder f en lid 5 | Bedrijfsarts kan iedere arbeidsplaats bezoeken; geen vaste bezoekfrequentie. | ACTION_REQUIRED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Een tekortkoming is alleen gerechtvaardigd als toepasselijke plicht, feiten en antwoordbetekenis vaststaan; gedeeltelijk/nee kan ook onduidelijkheid maskeren.  |
| CW2-BC-01-NO (P1) | LEGAL_REQUIREMENT; AW 14 lid 2 onder f en lid 5 | Bedrijfsarts kan iedere arbeidsplaats bezoeken; geen vaste bezoekfrequentie. | ACTION_REQUIRED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Een tekortkoming is alleen gerechtvaardigd als toepasselijke plicht, feiten en antwoordbetekenis vaststaan; gedeeltelijk/nee kan ook onduidelijkheid maskeren.  |
| CW2-BC-02-YES (P0) | LEGAL_REQUIREMENT; AW 14 lid 2 onder g en lid 5 | Second opinion, behoudens zwaarwegende argumenten; niet hetzelfde als UWV-deskundigenoordeel. | IN_ORDER; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Alleen indicatieve zelfverklaring over dit onderdeel; geen bewijs van volledige naleving.  |
| CW2-BC-02-PARTIAL (P1) | LEGAL_REQUIREMENT; AW 14 lid 2 onder g en lid 5 | Second opinion, behoudens zwaarwegende argumenten; niet hetzelfde als UWV-deskundigenoordeel. | ACTION_REQUIRED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Een tekortkoming is alleen gerechtvaardigd als toepasselijke plicht, feiten en antwoordbetekenis vaststaan; gedeeltelijk/nee kan ook onduidelijkheid maskeren.  |
| CW2-BC-02-NO (P1) | LEGAL_REQUIREMENT; AW 14 lid 2 onder g en lid 5 | Second opinion, behoudens zwaarwegende argumenten; niet hetzelfde als UWV-deskundigenoordeel. | ACTION_REQUIRED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Een tekortkoming is alleen gerechtvaardigd als toepasselijke plicht, feiten en antwoordbetekenis vaststaan; gedeeltelijk/nee kan ook onduidelijkheid maskeren.  |
| CW2-BC-03-YES (P0) | LEGAL_REQUIREMENT; AW 14 lid 2 onder h en lid 5 | Adequate klachtenprocedure voor dienstverlening bedrijfsarts. | IN_ORDER; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Alleen indicatieve zelfverklaring over dit onderdeel; geen bewijs van volledige naleving.  |
| CW2-BC-03-PARTIAL (P1) | LEGAL_REQUIREMENT; AW 14 lid 2 onder h en lid 5 | Adequate klachtenprocedure voor dienstverlening bedrijfsarts. | ACTION_REQUIRED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Een tekortkoming is alleen gerechtvaardigd als toepasselijke plicht, feiten en antwoordbetekenis vaststaan; gedeeltelijk/nee kan ook onduidelijkheid maskeren.  |
| CW2-BC-03-NO (P1) | LEGAL_REQUIREMENT; AW 14 lid 2 onder h en lid 5 | Adequate klachtenprocedure voor dienstverlening bedrijfsarts. | ACTION_REQUIRED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Een tekortkoming is alleen gerechtvaardigd als toepasselijke plicht, feiten en antwoordbetekenis vaststaan; gedeeltelijk/nee kan ook onduidelijkheid maskeren.  |
| C04-SCOPE-UNCERTAIN (P0) | LEGAL_REQUIREMENT; AW 1 leden 1–2; scope-afwijkingen vereisen afzonderlijke beoordeling | AW 1/16 en AB 9.5a: dienstverband, ingeleenden, gezag en vrijwilligers afzonderlijk beoordelen. AB 9.5a is opgenomen in het bronfragment-supplement; actuele consolidatie en juridische scopebinding blijven onbevestigd. AW 12 vanaf 1 juli 2026: OR/PVT of belanghebbende werknemers; geen automatische WOR-oprichtingsplicht. Tien scope-onzekerheidsregels vereisen afzonderlijke CONDITION-bindingen. Onbekende scope geeft nooit algemene vrijstelling. | NOT_ASSESSED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Scope-onzekerheid behouden; AW 1 bewijst niet alle afzonderlijke verplichtingen of uitzonderingen. Geen NVT-vrijstelling.  |
| BHVORGANIZED-YES (P0) | LEGAL_REQUIREMENT; AW 3 lid 1 onder e; AW 15 lid 1 | Organisatieplicht; geen vast aantal BHV’ers per werknemer. | IN_ORDER; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Alleen indicatieve zelfverklaring over dit onderdeel; geen bewijs van volledige naleving.  |
| BHVORGANIZED-PARTIAL (P1) | LEGAL_REQUIREMENT; AW 3 lid 1 onder e; AW 15 lid 1 | Organisatieplicht; geen vast aantal BHV’ers per werknemer. | ACTION_REQUIRED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Een tekortkoming is alleen gerechtvaardigd als toepasselijke plicht, feiten en antwoordbetekenis vaststaan; gedeeltelijk/nee kan ook onduidelijkheid maskeren.  |
| BHVORGANIZED-NO (P1) | LEGAL_REQUIREMENT; AW 3 lid 1 onder e; AW 15 lid 1 | Organisatieplicht; geen vast aantal BHV’ers per werknemer. | ACTION_REQUIRED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Een tekortkoming is alleen gerechtvaardigd als toepasselijke plicht, feiten en antwoordbetekenis vaststaan; gedeeltelijk/nee kan ook onduidelijkheid maskeren.  |
| BHVAPPOINTED-YES (P0) | LEGAL_REQUIREMENT; AW 15 leden 1 en 3 | Aanwijzing en vervanging zijn gecombineerd; nee zegt niet welk onderdeel ontbreekt. Geen algemene eis tot benoemde vervanger afleiden. | NOT_ASSESSED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Bestaande hold behouden. Geen positief of negatief nalevingsoordeel uit dit antwoord. **HOLD behouden.** |
| BHVAPPOINTED-PARTIAL (P0) | LEGAL_REQUIREMENT; AW 15 leden 1 en 3 | Aanwijzing en vervanging zijn gecombineerd; nee zegt niet welk onderdeel ontbreekt. Geen algemene eis tot benoemde vervanger afleiden. | NOT_ASSESSED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Bestaande hold behouden. Geen positief of negatief nalevingsoordeel uit dit antwoord. **HOLD behouden.** |
| BHVAPPOINTED-NO (P0) | LEGAL_REQUIREMENT; AW 15 leden 1 en 3 | Aanwijzing en vervanging zijn gecombineerd; nee zegt niet welk onderdeel ontbreekt. Geen algemene eis tot benoemde vervanger afleiden. | NOT_ASSESSED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Bestaande hold behouden. Geen positief of negatief nalevingsoordeel uit dit antwoord. **HOLD behouden.** |
| BHVRISKBASED-YES (P0) | LEGAL_REQUIREMENT; AW 5 lid 1; AW 15 lid 3 | Aantal en organisatie moeten adequaat zijn; geen universele ratio of verplicht BHV-plan. | IN_ORDER; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Alleen indicatieve zelfverklaring over dit onderdeel; geen bewijs van volledige naleving.  |
| BHVRISKBASED-PARTIAL (P1) | LEGAL_REQUIREMENT; AW 5 lid 1; AW 15 lid 3 | Aantal en organisatie moeten adequaat zijn; geen universele ratio of verplicht BHV-plan. | ACTION_REQUIRED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Een tekortkoming is alleen gerechtvaardigd als toepasselijke plicht, feiten en antwoordbetekenis vaststaan; gedeeltelijk/nee kan ook onduidelijkheid maskeren.  |
| BHVRISKBASED-NO (P1) | LEGAL_REQUIREMENT; AW 5 lid 1; AW 15 lid 3 | Aantal en organisatie moeten adequaat zijn; geen universele ratio of verplicht BHV-plan. | ACTION_REQUIRED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Een tekortkoming is alleen gerechtvaardigd als toepasselijke plicht, feiten en antwoordbetekenis vaststaan; gedeeltelijk/nee kan ook onduidelijkheid maskeren.  |
| BHVPREPARED-YES (P0) | LEGAL_REQUIREMENT; AW 15 lid 3 | Voldoende opleiding en uitrusting; geen vaste cursus, diploma of jaarlijkse herhaling uit deze vraag afleiden. | IN_ORDER; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Alleen indicatieve zelfverklaring over dit onderdeel; geen bewijs van volledige naleving.  |
| BHVPREPARED-PARTIAL (P1) | LEGAL_REQUIREMENT; AW 15 lid 3 | Voldoende opleiding en uitrusting; geen vaste cursus, diploma of jaarlijkse herhaling uit deze vraag afleiden. | ACTION_REQUIRED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Een tekortkoming is alleen gerechtvaardigd als toepasselijke plicht, feiten en antwoordbetekenis vaststaan; gedeeltelijk/nee kan ook onduidelijkheid maskeren.  |
| BHVPREPARED-NO (P1) | LEGAL_REQUIREMENT; AW 15 lid 3 | Voldoende opleiding en uitrusting; geen vaste cursus, diploma of jaarlijkse herhaling uit deze vraag afleiden. | ACTION_REQUIRED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Een tekortkoming is alleen gerechtvaardigd als toepasselijke plicht, feiten en antwoordbetekenis vaststaan; gedeeltelijk/nee kan ook onduidelijkheid maskeren.  |
| CW2-BHV-01-YES (P0) | LEGAL_REQUIREMENT; AW 8 lid 1; AW 3 lid 1 onder e; AW 15 lid 2 onder c | Doeltreffende informatie over bijstand en alarmering; geen verplicht uniform nummer. | IN_ORDER; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Alleen indicatieve zelfverklaring over dit onderdeel; geen bewijs van volledige naleving.  |
| CW2-BHV-01-PARTIAL (P1) | LEGAL_REQUIREMENT; AW 8 lid 1; AW 3 lid 1 onder e; AW 15 lid 2 onder c | Doeltreffende informatie over bijstand en alarmering; geen verplicht uniform nummer. | ACTION_REQUIRED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Een tekortkoming is alleen gerechtvaardigd als toepasselijke plicht, feiten en antwoordbetekenis vaststaan; gedeeltelijk/nee kan ook onduidelijkheid maskeren.  |
| CW2-BHV-01-NO (P1) | LEGAL_REQUIREMENT; AW 8 lid 1; AW 3 lid 1 onder e; AW 15 lid 2 onder c | Doeltreffende informatie over bijstand en alarmering; geen verplicht uniform nummer. | ACTION_REQUIRED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Een tekortkoming is alleen gerechtvaardigd als toepasselijke plicht, feiten en antwoordbetekenis vaststaan; gedeeltelijk/nee kan ook onduidelijkheid maskeren.  |
| CW2-BHV-02-YES (P0) | LEGAL_REQUIREMENT; AW 3 lid 1 onder e; AW 15 lid 2 onder c | Alarmeren/evacueren omvat werknemers en andere aanwezigen. | IN_ORDER; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Alleen indicatieve zelfverklaring over dit onderdeel; geen bewijs van volledige naleving.  |
| CW2-BHV-02-PARTIAL (P1) | LEGAL_REQUIREMENT; AW 3 lid 1 onder e; AW 15 lid 2 onder c | Alarmeren/evacueren omvat werknemers en andere aanwezigen. | ACTION_REQUIRED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Een tekortkoming is alleen gerechtvaardigd als toepasselijke plicht, feiten en antwoordbetekenis vaststaan; gedeeltelijk/nee kan ook onduidelijkheid maskeren.  |
| CW2-BHV-02-NO (P1) | LEGAL_REQUIREMENT; AW 3 lid 1 onder e; AW 15 lid 2 onder c | Alarmeren/evacueren omvat werknemers en andere aanwezigen. | ACTION_REQUIRED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Een tekortkoming is alleen gerechtvaardigd als toepasselijke plicht, feiten en antwoordbetekenis vaststaan; gedeeltelijk/nee kan ook onduidelijkheid maskeren.  |
| CW2-BHV-03-YES (P0) | LEGAL_REQUIREMENT; AW 19 lid 1 in samenhang met AW 3 lid 1 onder e | Samenwerking meerdere werkgevers; schriftelijke vastlegging niet in alle gevallen verplicht. Geen gedeelde werkplek sluit alleen dit deel uit. | IN_ORDER; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Alleen indicatieve zelfverklaring over dit onderdeel; geen bewijs van volledige naleving.  |
| CW2-BHV-03-PARTIAL (P0) | LEGAL_REQUIREMENT; AW 19 lid 1 in samenhang met AW 3 lid 1 onder e | Samenwerking meerdere werkgevers; schriftelijke vastlegging niet in alle gevallen verplicht. Geen gedeelde werkplek sluit alleen dit deel uit. | ACTION_REQUIRED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Een tekortkoming is alleen gerechtvaardigd als toepasselijke plicht, feiten en antwoordbetekenis vaststaan; gedeeltelijk/nee kan ook onduidelijkheid maskeren.  |
| CW2-BHV-03-NO (P0) | LEGAL_REQUIREMENT; AW 19 lid 1 in samenhang met AW 3 lid 1 onder e | Samenwerking meerdere werkgevers; schriftelijke vastlegging niet in alle gevallen verplicht. Geen gedeelde werkplek sluit alleen dit deel uit. | ACTION_REQUIRED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Een tekortkoming is alleen gerechtvaardigd als toepasselijke plicht, feiten en antwoordbetekenis vaststaan; gedeeltelijk/nee kan ook onduidelijkheid maskeren.  |
| CW2-BHV-03-NO_SHARED_WORKPLACE (P0) | LEGAL_REQUIREMENT; AW 19 lid 1 in samenhang met AW 3 lid 1 onder e | Samenwerking meerdere werkgevers; schriftelijke vastlegging niet in alle gevallen verplicht. Geen gedeelde werkplek sluit alleen dit deel uit. | IN_ORDER; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Een tekortkoming is alleen gerechtvaardigd als toepasselijke plicht, feiten en antwoordbetekenis vaststaan; gedeeltelijk/nee kan ook onduidelijkheid maskeren.  |
| C05-SCOPE-UNCERTAIN (P0) | LEGAL_REQUIREMENT; AW 1 leden 1–2; scope-afwijkingen vereisen afzonderlijke beoordeling | AW 1/16 en AB 9.5a: dienstverband, ingeleenden, gezag en vrijwilligers afzonderlijk beoordelen. AB 9.5a is opgenomen in het bronfragment-supplement; actuele consolidatie en juridische scopebinding blijven onbevestigd. AW 12 vanaf 1 juli 2026: OR/PVT of belanghebbende werknemers; geen automatische WOR-oprichtingsplicht. Tien scope-onzekerheidsregels vereisen afzonderlijke CONDITION-bindingen. Onbekende scope geeft nooit algemene vrijstelling. | NOT_ASSESSED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Scope-onzekerheid behouden; AW 1 bewijst niet alle afzonderlijke verplichtingen of uitzonderingen. Geen NVT-vrijstelling.  |
| PAGOOFFERED-YES (P0) | LEGAL_REQUIREMENT; AW 18; AW 14 lid 1 onder c 1° | Werkgever biedt risicogericht onderzoek; werknemer hoeft niet deel te nemen; geen universeel interval. | IN_ORDER; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Alleen indicatieve zelfverklaring over dit onderdeel; geen bewijs van volledige naleving.  |
| PAGOOFFERED-PARTIAL (P1) | LEGAL_REQUIREMENT; AW 18; AW 14 lid 1 onder c 1° | Werkgever biedt risicogericht onderzoek; werknemer hoeft niet deel te nemen; geen universeel interval. | ACTION_REQUIRED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Een tekortkoming is alleen gerechtvaardigd als toepasselijke plicht, feiten en antwoordbetekenis vaststaan; gedeeltelijk/nee kan ook onduidelijkheid maskeren.  |
| PAGOOFFERED-NO (P1) | LEGAL_REQUIREMENT; AW 18; AW 14 lid 1 onder c 1° | Werkgever biedt risicogericht onderzoek; werknemer hoeft niet deel te nemen; geen universeel interval. | ACTION_REQUIRED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Een tekortkoming is alleen gerechtvaardigd als toepasselijke plicht, feiten en antwoordbetekenis vaststaan; gedeeltelijk/nee kan ook onduidelijkheid maskeren.  |
| CW2-PAGO-01-YES (P0) | LEGAL_REQUIREMENT; AW 18; AW 14 lid 1 onder c 1° | Bedrijfsarts adviseert risicogericht over inhoud/frequentie; geen vast interval. | IN_ORDER; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Alleen indicatieve zelfverklaring over dit onderdeel; geen bewijs van volledige naleving.  |
| CW2-PAGO-01-PARTIAL (P1) | LEGAL_REQUIREMENT; AW 18; AW 14 lid 1 onder c 1° | Bedrijfsarts adviseert risicogericht over inhoud/frequentie; geen vast interval. | ACTION_REQUIRED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Een tekortkoming is alleen gerechtvaardigd als toepasselijke plicht, feiten en antwoordbetekenis vaststaan; gedeeltelijk/nee kan ook onduidelijkheid maskeren.  |
| CW2-PAGO-01-NO (P1) | LEGAL_REQUIREMENT; AW 18; AW 14 lid 1 onder c 1° | Bedrijfsarts adviseert risicogericht over inhoud/frequentie; geen vast interval. | ACTION_REQUIRED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Een tekortkoming is alleen gerechtvaardigd als toepasselijke plicht, feiten en antwoordbetekenis vaststaan; gedeeltelijk/nee kan ook onduidelijkheid maskeren.  |
| CW2-PAGO-02-YES (P0) | LEGAL_REQUIREMENT; AW 18 en officiële PAGO-voorlichting | Vrijwillige deelname is bevestigd, maar zelfstandige wettelijke plicht om precies deze uitleg te geven is hiermee niet bewezen. | NOT_ASSESSED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Bestaande hold behouden. Geen positief of negatief nalevingsoordeel uit dit antwoord. **HOLD behouden.** |
| CW2-PAGO-02-PARTIAL (P0) | LEGAL_REQUIREMENT; AW 18 en officiële PAGO-voorlichting | Vrijwillige deelname is bevestigd, maar zelfstandige wettelijke plicht om precies deze uitleg te geven is hiermee niet bewezen. | NOT_ASSESSED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Bestaande hold behouden. Geen positief of negatief nalevingsoordeel uit dit antwoord. **HOLD behouden.** |
| CW2-PAGO-02-NO (P0) | LEGAL_REQUIREMENT; AW 18 en officiële PAGO-voorlichting | Vrijwillige deelname is bevestigd, maar zelfstandige wettelijke plicht om precies deze uitleg te geven is hiermee niet bewezen. | NOT_ASSESSED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Bestaande hold behouden. Geen positief of negatief nalevingsoordeel uit dit antwoord. **HOLD behouden.** |
| C06-SCOPE-UNCERTAIN (P0) | LEGAL_REQUIREMENT; AW 1 leden 1–2; scope-afwijkingen vereisen afzonderlijke beoordeling | AW 1/16 en AB 9.5a: dienstverband, ingeleenden, gezag en vrijwilligers afzonderlijk beoordelen. AB 9.5a is opgenomen in het bronfragment-supplement; actuele consolidatie en juridische scopebinding blijven onbevestigd. AW 12 vanaf 1 juli 2026: OR/PVT of belanghebbende werknemers; geen automatische WOR-oprichtingsplicht. Tien scope-onzekerheidsregels vereisen afzonderlijke CONDITION-bindingen. Onbekende scope geeft nooit algemene vrijstelling. | NOT_ASSESSED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Scope-onzekerheid behouden; AW 1 bewijst niet alle afzonderlijke verplichtingen of uitzonderingen. Geen NVT-vrijstelling.  |
| INSTRUCTION-YES (P0) | LEGAL_REQUIREMENT; AW 8 leden 1–2 | Doeltreffende taak- en risicogerichte voorlichting; geen vaste cursuslijst. | IN_ORDER; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Alleen indicatieve zelfverklaring over dit onderdeel; geen bewijs van volledige naleving.  |
| INSTRUCTION-PARTIAL (P1) | LEGAL_REQUIREMENT; AW 8 leden 1–2 | Doeltreffende taak- en risicogerichte voorlichting; geen vaste cursuslijst. | ACTION_REQUIRED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Een tekortkoming is alleen gerechtvaardigd als toepasselijke plicht, feiten en antwoordbetekenis vaststaan; gedeeltelijk/nee kan ook onduidelijkheid maskeren.  |
| INSTRUCTION-NO (P1) | LEGAL_REQUIREMENT; AW 8 leden 1–2 | Doeltreffende taak- en risicogerichte voorlichting; geen vaste cursuslijst. | ACTION_REQUIRED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Een tekortkoming is alleen gerechtvaardigd als toepasselijke plicht, feiten en antwoordbetekenis vaststaan; gedeeltelijk/nee kan ook onduidelijkheid maskeren.  |
| SUPERVISION-YES (P0) | LEGAL_REQUIREMENT; AW 8 leden 3–4 | Toezicht op instructies en PBM, passend bij feitelijk werk; geen 24/7-toezichtnorm. | IN_ORDER; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Alleen indicatieve zelfverklaring over dit onderdeel; geen bewijs van volledige naleving.  |
| SUPERVISION-PARTIAL (P1) | LEGAL_REQUIREMENT; AW 8 leden 3–4 | Toezicht op instructies en PBM, passend bij feitelijk werk; geen 24/7-toezichtnorm. | ACTION_REQUIRED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Een tekortkoming is alleen gerechtvaardigd als toepasselijke plicht, feiten en antwoordbetekenis vaststaan; gedeeltelijk/nee kan ook onduidelijkheid maskeren.  |
| SUPERVISION-NO (P1) | LEGAL_REQUIREMENT; AW 8 leden 3–4 | Toezicht op instructies en PBM, passend bij feitelijk werk; geen 24/7-toezichtnorm. | ACTION_REQUIRED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Een tekortkoming is alleen gerechtvaardigd als toepasselijke plicht, feiten en antwoordbetekenis vaststaan; gedeeltelijk/nee kan ook onduidelijkheid maskeren.  |
| CW2-INS-01-YES (P0) | LEGAL_REQUIREMENT; AW 8 leden 1–2 en 5 | Doeltreffend en op taken/persoon afgestemd; geen verplichte specifieke taaltoets. | IN_ORDER; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Alleen indicatieve zelfverklaring over dit onderdeel; geen bewijs van volledige naleving.  |
| CW2-INS-01-PARTIAL (P1) | LEGAL_REQUIREMENT; AW 8 leden 1–2 en 5 | Doeltreffend en op taken/persoon afgestemd; geen verplichte specifieke taaltoets. | ACTION_REQUIRED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Een tekortkoming is alleen gerechtvaardigd als toepasselijke plicht, feiten en antwoordbetekenis vaststaan; gedeeltelijk/nee kan ook onduidelijkheid maskeren.  |
| CW2-INS-01-NO (P1) | LEGAL_REQUIREMENT; AW 8 leden 1–2 en 5 | Doeltreffend en op taken/persoon afgestemd; geen verplichte specifieke taaltoets. | ACTION_REQUIRED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Een tekortkoming is alleen gerechtvaardigd als toepasselijke plicht, feiten en antwoordbetekenis vaststaan; gedeeltelijk/nee kan ook onduidelijkheid maskeren.  |
| CW2-INS-02-YES (P0) | LEGAL_REQUIREMENT; AW 8 leden 1–2; AW 5 lid 4 | Aanpassen bij gewijzigde omstandigheden, niet automatisch jaarlijkse cursus. | IN_ORDER; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Alleen indicatieve zelfverklaring over dit onderdeel; geen bewijs van volledige naleving.  |
| CW2-INS-02-PARTIAL (P1) | LEGAL_REQUIREMENT; AW 8 leden 1–2; AW 5 lid 4 | Aanpassen bij gewijzigde omstandigheden, niet automatisch jaarlijkse cursus. | ACTION_REQUIRED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Een tekortkoming is alleen gerechtvaardigd als toepasselijke plicht, feiten en antwoordbetekenis vaststaan; gedeeltelijk/nee kan ook onduidelijkheid maskeren.  |
| CW2-INS-02-NO (P1) | LEGAL_REQUIREMENT; AW 8 leden 1–2; AW 5 lid 4 | Aanpassen bij gewijzigde omstandigheden, niet automatisch jaarlijkse cursus. | ACTION_REQUIRED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Een tekortkoming is alleen gerechtvaardigd als toepasselijke plicht, feiten en antwoordbetekenis vaststaan; gedeeltelijk/nee kan ook onduidelijkheid maskeren.  |
| C08-SCOPE-UNCERTAIN (P0) | LEGAL_REQUIREMENT; AW 1 leden 1–2; scope-afwijkingen vereisen afzonderlijke beoordeling | AW 1/16 en AB 9.5a: dienstverband, ingeleenden, gezag en vrijwilligers afzonderlijk beoordelen. AB 9.5a is opgenomen in het bronfragment-supplement; actuele consolidatie en juridische scopebinding blijven onbevestigd. AW 12 vanaf 1 juli 2026: OR/PVT of belanghebbende werknemers; geen automatische WOR-oprichtingsplicht. Tien scope-onzekerheidsregels vereisen afzonderlijke CONDITION-bindingen. Onbekende scope geeft nooit algemene vrijstelling. | NOT_ASSESSED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Scope-onzekerheid behouden; AW 1 bewijst niet alle afzonderlijke verplichtingen of uitzonderingen. Geen NVT-vrijstelling.  |
| ACCIDENTREGISTRATION-YES (P0) | LEGAL_REQUIREMENT; AW 9 lid 2 | Een proces zegt niet of alle registratieplichtige ongevallen geregistreerd zijn; ontbreken proces is niet per definitie ontbrekend register. | NOT_ASSESSED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Bestaande hold behouden. Geen positief of negatief nalevingsoordeel uit dit antwoord. **HOLD behouden.** |
| ACCIDENTREGISTRATION-PARTIAL (P0) | LEGAL_REQUIREMENT; AW 9 lid 2 | Een proces zegt niet of alle registratieplichtige ongevallen geregistreerd zijn; ontbreken proces is niet per definitie ontbrekend register. | NOT_ASSESSED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Bestaande hold behouden. Geen positief of negatief nalevingsoordeel uit dit antwoord. **HOLD behouden.** |
| ACCIDENTREGISTRATION-NO (P0) | LEGAL_REQUIREMENT; AW 9 lid 2 | Een proces zegt niet of alle registratieplichtige ongevallen geregistreerd zijn; ontbreken proces is niet per definitie ontbrekend register. | NOT_ASSESSED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Bestaande hold behouden. Geen positief of negatief nalevingsoordeel uit dit antwoord. **HOLD behouden.** |
| ACCIDENTREPORTING-YES (P0) | LEGAL_REQUIREMENT; AW 9 lid 1 | Kennis van de meldplicht bewijst niet of concrete gebeurtenissen tijdig zijn gemeld. | NOT_ASSESSED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Bestaande hold behouden. Geen positief of negatief nalevingsoordeel uit dit antwoord. **HOLD behouden.** |
| ACCIDENTREPORTING-PARTIAL (P0) | LEGAL_REQUIREMENT; AW 9 lid 1 | Kennis van de meldplicht bewijst niet of concrete gebeurtenissen tijdig zijn gemeld. | NOT_ASSESSED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Bestaande hold behouden. Geen positief of negatief nalevingsoordeel uit dit antwoord. **HOLD behouden.** |
| ACCIDENTREPORTING-NO (P0) | LEGAL_REQUIREMENT; AW 9 lid 1 | Kennis van de meldplicht bewijst niet of concrete gebeurtenissen tijdig zijn gemeld. | NOT_ASSESSED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Bestaande hold behouden. Geen positief of negatief nalevingsoordeel uit dit antwoord. **HOLD behouden.** |
| CW2-ONG-01-YES (P0) | LEGAL_REQUIREMENT; AW 9 lid 1 en uitleg Nederlandse Arbeidsinspectie | Later bekend geworden ernstig gevolg triggert melding, maar procedurevraag bewijst feitelijke naleving niet. | NOT_ASSESSED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Bestaande hold behouden. Geen positief of negatief nalevingsoordeel uit dit antwoord. **HOLD behouden.** |
| CW2-ONG-01-PARTIAL (P0) | LEGAL_REQUIREMENT; AW 9 lid 1 en uitleg Nederlandse Arbeidsinspectie | Later bekend geworden ernstig gevolg triggert melding, maar procedurevraag bewijst feitelijke naleving niet. | NOT_ASSESSED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Bestaande hold behouden. Geen positief of negatief nalevingsoordeel uit dit antwoord. **HOLD behouden.** |
| CW2-ONG-01-NO (P0) | LEGAL_REQUIREMENT; AW 9 lid 1 en uitleg Nederlandse Arbeidsinspectie | Later bekend geworden ernstig gevolg triggert melding, maar procedurevraag bewijst feitelijke naleving niet. | NOT_ASSESSED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Bestaande hold behouden. Geen positief of negatief nalevingsoordeel uit dit antwoord. **HOLD behouden.** |
| CW2-ONG-02-YES (P0) | LEGAL_REQUIREMENT; AW 9 lid 2 | Alle gemelde ongevallen plus meer dan drie werkdagen verzuim; aard en datum. Geen algemene wettelijke bewaartermijn afleiden. | IN_ORDER; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Alleen indicatieve zelfverklaring over dit onderdeel; geen bewijs van volledige naleving.  |
| CW2-ONG-02-PARTIAL (P0) | LEGAL_REQUIREMENT; AW 9 lid 2 | Alle gemelde ongevallen plus meer dan drie werkdagen verzuim; aard en datum. Geen algemene wettelijke bewaartermijn afleiden. | ACTION_REQUIRED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Een tekortkoming is alleen gerechtvaardigd als toepasselijke plicht, feiten en antwoordbetekenis vaststaan; gedeeltelijk/nee kan ook onduidelijkheid maskeren.  |
| CW2-ONG-02-NO (P0) | LEGAL_REQUIREMENT; AW 9 lid 2 | Alle gemelde ongevallen plus meer dan drie werkdagen verzuim; aard en datum. Geen algemene wettelijke bewaartermijn afleiden. | ACTION_REQUIRED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Een tekortkoming is alleen gerechtvaardigd als toepasselijke plicht, feiten en antwoordbetekenis vaststaan; gedeeltelijk/nee kan ook onduidelijkheid maskeren.  |
| C09-SCOPE-UNCERTAIN (P0) | LEGAL_REQUIREMENT; AW 1 leden 1–2; scope-afwijkingen vereisen afzonderlijke beoordeling | AW 1/16 en AB 9.5a: dienstverband, ingeleenden, gezag en vrijwilligers afzonderlijk beoordelen. AB 9.5a is opgenomen in het bronfragment-supplement; actuele consolidatie en juridische scopebinding blijven onbevestigd. AW 12 vanaf 1 juli 2026: OR/PVT of belanghebbende werknemers; geen automatische WOR-oprichtingsplicht. Tien scope-onzekerheidsregels vereisen afzonderlijke CONDITION-bindingen. Onbekende scope geeft nooit algemene vrijstelling. | NOT_ASSESSED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Scope-onzekerheid behouden; AW 1 bewijst niet alle afzonderlijke verplichtingen of uitzonderingen. Geen NVT-vrijstelling.  |
| WORKERCONSULTATION-YES (P0) | LEGAL_REQUIREMENT; AW 12 leden 1–2, versie 2026-07-01 | Sinds 1 juli 2026 raadpleging voor alle bedrijven, via OR/PVT of bij ontbreken belanghebbende werknemers; geen vaste vergaderfrequentie. | IN_ORDER; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Alleen indicatieve zelfverklaring over dit onderdeel; geen bewijs van volledige naleving.  |
| WORKERCONSULTATION-PARTIAL (P1) | LEGAL_REQUIREMENT; AW 12 leden 1–2, versie 2026-07-01 | Sinds 1 juli 2026 raadpleging voor alle bedrijven, via OR/PVT of bij ontbreken belanghebbende werknemers; geen vaste vergaderfrequentie. | ACTION_REQUIRED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Een tekortkoming is alleen gerechtvaardigd als toepasselijke plicht, feiten en antwoordbetekenis vaststaan; gedeeltelijk/nee kan ook onduidelijkheid maskeren.  |
| WORKERCONSULTATION-NO (P1) | LEGAL_REQUIREMENT; AW 12 leden 1–2, versie 2026-07-01 | Sinds 1 juli 2026 raadpleging voor alle bedrijven, via OR/PVT of bij ontbreken belanghebbende werknemers; geen vaste vergaderfrequentie. | ACTION_REQUIRED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Een tekortkoming is alleen gerechtvaardigd als toepasselijke plicht, feiten en antwoordbetekenis vaststaan; gedeeltelijk/nee kan ook onduidelijkheid maskeren.  |
| C10-SCOPE-UNCERTAIN (P0) | LEGAL_REQUIREMENT; AW 1 leden 1–2; scope-afwijkingen vereisen afzonderlijke beoordeling | AW 1/16 en AB 9.5a: dienstverband, ingeleenden, gezag en vrijwilligers afzonderlijk beoordelen. AB 9.5a is opgenomen in het bronfragment-supplement; actuele consolidatie en juridische scopebinding blijven onbevestigd. AW 12 vanaf 1 juli 2026: OR/PVT of belanghebbende werknemers; geen automatische WOR-oprichtingsplicht. Tien scope-onzekerheidsregels vereisen afzonderlijke CONDITION-bindingen. Onbekende scope geeft nooit algemene vrijstelling. | NOT_ASSESSED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Scope-onzekerheid behouden; AW 1 bewijst niet alle afzonderlijke verplichtingen of uitzonderingen. Geen NVT-vrijstelling.  |
| CW2-PSA-01-YES (P0) | LEGAL_REQUIREMENT; AW 3 lid 2; AW 5 lid 1; AB 2.15 lid 1 | Mogelijke blootstelling onderzoeken; geen sectorfilter of ontbreken klacht als uitsluiting. | IN_ORDER; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Alleen indicatieve zelfverklaring over dit onderdeel; geen bewijs van volledige naleving.  |
| CW2-PSA-01-PARTIAL (P1) | LEGAL_REQUIREMENT; AW 3 lid 2; AW 5 lid 1; AB 2.15 lid 1 | Mogelijke blootstelling onderzoeken; geen sectorfilter of ontbreken klacht als uitsluiting. | ACTION_REQUIRED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Een tekortkoming is alleen gerechtvaardigd als toepasselijke plicht, feiten en antwoordbetekenis vaststaan; gedeeltelijk/nee kan ook onduidelijkheid maskeren.  |
| CW2-PSA-01-NO (P1) | LEGAL_REQUIREMENT; AW 3 lid 2; AW 5 lid 1; AB 2.15 lid 1 | Mogelijke blootstelling onderzoeken; geen sectorfilter of ontbreken klacht als uitsluiting. | ACTION_REQUIRED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Een tekortkoming is alleen gerechtvaardigd als toepasselijke plicht, feiten en antwoordbetekenis vaststaan; gedeeltelijk/nee kan ook onduidelijkheid maskeren.  |
| CW2-PSA-02-YES (P0) | LEGAL_REQUIREMENT; AW 3 lid 2; AB 2.15 lid 1 | Maatregelen bij vastgestelde/mogelijke blootstelling; NONE_IDENTIFIED alleen bij bevestigd onderzoek, geen volledige PSA-vrijstelling. | IN_ORDER; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Alleen indicatieve zelfverklaring over dit onderdeel; geen bewijs van volledige naleving.  |
| CW2-PSA-02-PARTIAL (P0) | LEGAL_REQUIREMENT; AW 3 lid 2; AB 2.15 lid 1 | Maatregelen bij vastgestelde/mogelijke blootstelling; NONE_IDENTIFIED alleen bij bevestigd onderzoek, geen volledige PSA-vrijstelling. | ACTION_REQUIRED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Een tekortkoming is alleen gerechtvaardigd als toepasselijke plicht, feiten en antwoordbetekenis vaststaan; gedeeltelijk/nee kan ook onduidelijkheid maskeren.  |
| CW2-PSA-02-NO (P0) | LEGAL_REQUIREMENT; AW 3 lid 2; AB 2.15 lid 1 | Maatregelen bij vastgestelde/mogelijke blootstelling; NONE_IDENTIFIED alleen bij bevestigd onderzoek, geen volledige PSA-vrijstelling. | ACTION_REQUIRED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Een tekortkoming is alleen gerechtvaardigd als toepasselijke plicht, feiten en antwoordbetekenis vaststaan; gedeeltelijk/nee kan ook onduidelijkheid maskeren.  |
| CW2-PSA-02-NONE_IDENTIFIED (P0) | LEGAL_REQUIREMENT; AW 3 lid 2; AB 2.15 lid 1 | Maatregelen bij vastgestelde/mogelijke blootstelling; NONE_IDENTIFIED alleen bij bevestigd onderzoek, geen volledige PSA-vrijstelling. | IN_ORDER; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Controleer adequaat PSA-onderzoek en mogelijke blootstelling. Geen risico gevonden is geen bewezen algemene afwezigheid.  |
| R06-SCOPE-UNCERTAIN (P0) | LEGAL_REQUIREMENT; AW 1 leden 1–2; scope-afwijkingen vereisen afzonderlijke beoordeling | AW 1/16 en AB 9.5a: dienstverband, ingeleenden, gezag en vrijwilligers afzonderlijk beoordelen. AB 9.5a is opgenomen in het bronfragment-supplement; actuele consolidatie en juridische scopebinding blijven onbevestigd. AW 12 vanaf 1 juli 2026: OR/PVT of belanghebbende werknemers; geen automatische WOR-oprichtingsplicht. Tien scope-onzekerheidsregels vereisen afzonderlijke CONDITION-bindingen. Onbekende scope geeft nooit algemene vrijstelling. | NOT_ASSESSED; ontbrekend/onbekend: Niet beoordeeld, bekende zelfstandige tekortkoming blijft zichtbaar | Scope-onzekerheid behouden; AW 1 bewijst niet alle afzonderlijke verplichtingen of uitzonderingen. Geen NVT-vrijstelling.  |

## Knowledge-publicatieketen en dry-run

De bestaande CLI `npx tsx scripts/check-compliance-f4-publication.ts --check` gebruikt een afzonderlijk aangeleverde COMPLIANCE_REVIEW_DATABASE_URL en een REPEATABLE READ / READ ONLY-transactie. Geen env-autoloading of apply-pad. Er is geen productiedry-run gedraaid met lokale credentials; de productiecontrole bleef beperkt tot SELECT-metadata: 85 migraties, 46 claims, 0 frameworkregistraties 2.1.

| Voorwaarde | Technische controle | Nog nodig voor juridische vrijgave |
| --- | --- | --- |
| Bronrevisie | CURRENT/REVIEWED, periode, supersession, hashformaat | Originele volledige broninhoud/actualiteit en review bevestigen |
| Directe steun | DIRECT_SUPPORT, PRIMARY_LEGAL bij wettelijke regel, citatiefragment/hash | Semantische entailment van iedere claim naar iedere regel menselijk beoordelen |
| Toepasselijkheid | Niet-lege toepasselijkheid, NL, expliciete scope-CONDITION | Vrije tekst kan niet automatisch de juiste uitzonderingen bewijzen |
| Conflicten/intrekking | Relaties, kruisvalidatie, ingetrokken validaties, bronstatus | Onbekende/niet-geregistreerde inhoudelijke conflicten opsporen |
| Menselijke review | Reviewer-ID, VALIDATED, datums/verval, intrekkingen | Deskundigheid, onafhankelijkheid en reikwijdte review inhoudelijk bevestigen |
| Checksums | Fragmenttekst, bronbinding, vaste vraag-/regeltemplate, framework | Volledig bronbestand opnieuw verifiëren; geen goedkeuring uit een hash afleiden |
| Publicatie | Runtime weigert ongeldige bewijsset; DRAFT inspecteerbaar | Geen operationele writer vrijgegeven; apart akkoord + atomair hercontroleren |

De bestaande PostgreSQL-test op de gedeelde inspector is geen juridische bronacceptatie. De CLI en regressietests worden afzonderlijk gerapporteerd hieronder.

## Validatie en voortgang

Uitgevoerd op 18 oktober 2026 in de bestaande F4-worktree:

- Gerichte Compliance/Knowledge/rapport/route/UI-regressies: **328/328 tests, 20/20 suites PASS**. Daarvan acht dossiercontroles op volledige dekking, bestaande identiteiten/statussen, 188 teksthashes, kandidaatverwijzingen, negen holds en lege menselijke beslissingen.
- Geisoleerde PostgreSQL 17-harness: **86/86 migraties, nul failed/onverwacht**, checksums gecontroleerd; herhaald deploy laat de registratie ongewijzigd. Migratie 86 uitsluitend tijdelijk lokaal toegepast met toestemming.
- Echte read-only publicatie-CLI tegen die nieuwe testdatabase: exit 2 / NO_GO / FRAMEWORK_NOT_REGISTERED; alle 141 verwachte regels ontbreken en zowel frameworkaantal als migratiehistorie blijven ongewijzigd. Dit is een negatieve technische preflight, geen juridische acceptatie of productie-dry-run.
- Route-naar-service, zes gelijktijdige identieke F4-aanvragen naar exact een beoordeling/tien resultaten, idempotentie, OWNER/ADMIN/MEMBER, tenantisolatie, verlopen membership, bronintrekking/checksumdrift en historische snapshots: PASS in de bestaande databaseharness.
- Cleanup: alleen de speciaal aangemaakte testdatabase verwijderd; database-inventaris voor en na is gelijk. Geen bestaande database gewijzigd. Niet-blokkerende bestaande pg-waarschuwing over gelijktijdige client.query-aanroepen geregistreerd.
- Volledige lint: PASS. Productiebuild: PASS (165 pagina's). Bestaande waarschuwingen: meerdere lockfiles/workspaceroot en Knowledge-uploadbestandstracing.
- Standalone TypeScript: **BASELINE_FAILURE**, uitsluitend vier TS2345 readonly-arrayfouten in src/lib/compliance/rule-engine.test.ts:13,14,23,24. Geen fout in de taakbestanden; niet gerepareerd binnen deze opdracht. De succesvolle Next-productiebuild vervangt deze standalone controle niet.
- Diff-check: PASS. Secrets-patterncontrole op de acht taakbestanden: PASS; geen credentials of persoonsgegevens opgenomen. Geen claim dat hiermee een externe secretscanner is gedraaid.

Exacte wijzigingsset: docs/README.md, docs/compliance-f4-legal-matrix.md, docs/compliance-f4-review-dossier.md, docs/compliance-f4-review-dossier.json, docs/compliance-f4-review-source-blocks.json, docs/compliance-f4-review-supplement.json, scripts/test-compliance-runs-database.ts en src/lib/compliance/compliance-f4-review-dossier.test.ts.

Juridische beoordeling blijft OPEN. F4 blijft uit; geen runtimecode, claimstatus, frameworkregistratie, productiemigratie of historisch rapport wordt met dit dossier gewijzigd. PR #49 blijft Draft; issue #50 blijft open voor menselijke bronacceptatie.

## Besluitadvies

**NO-GO.** Het dossier is een controleerbare voorbereiding, geen afgeronde wettelijke bronacceptatie. Vereist: onafhankelijk actuele geconsolideerde bepalingen, ontbrekende primaire citaties/revisies, beoordeling van alle gevolgtrekkingen en uitzonderingen, lege menselijke beslisvelden invullen door bevoegde reviewers, daarna een nieuwe technische preflight en afzonderlijke PO-vrijgave. De negen holds blijven behouden. Historische uitkomsten blijven intact.
