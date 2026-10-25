# Werkpakket 3 — juridische bronacceptatie F4

Peildatum 23 oktober 2026. Onderzochte code: `c807f174b242766bae87b261a65909a6205ecbad`,
Draft PR #49 / issue #50, `NL_ARBO_GUIDE / 2.1`.
Werkpakket 2 is vastgelegd in [het technische rapport](compliance-f4-technical-acceptance.md).
Dit vervolg wijzigt uitsluitend documentatie. Geen menselijke goedkeuring,
claimpromotie, frameworkregistratie of wijziging van normatieve regels.

## Resultaat en bewijsgrens

**TECHNICAL GO voor aanbieding van de bestaande bron-/reviewmechanismen.**
De afzonderlijke volledige F4-release blijft technisch NO-GO volgens werkpakket 2.
**LEGAL REVIEW NOT READY voor definitieve bronacceptatie.** Het dossier is wel
bruikbaar voor een deskundige om de hieronder benoemde ontbrekende bewijzen en
beslissingen te behandelen. Er is geen juridische vrijgave.

Opnieuw gecontroleerd: 46 unieke claimdossiers, 141 regelbindingen (131 antwoordregels
en tien scope-onzekerheidsregels), negen holds over 27 antwoordregels, 48 vraag- en
contextdefinities. Alle 188 opgeslagen fragmenten hebben de verwachte SHA-256 van
de exacte UTF-8-tekst. Nul ingevulde menselijke beslissingen. Dit bewijst integriteit
van het dossier, niet de actualiteit of geldigheid van de wet.

De complete matrices blijven de bron van waarheid voor afzonderlijke identiteiten:

- [Claim- en regelmatrix Markdown](compliance-f4-review-dossier.md) en
  [JSON](compliance-f4-review-dossier.json): alle claims/regels, bronfragmenten,
  voorwaarden, antwoorduitkomsten, vervolgacties en lege reviewerbeslisvelden.
- [Vraag-/regelchecksums](compliance-f4-legal-matrix.json): alle 48 definities en 141 templates.
- [Historische claiminventaris](compliance-f4-claim-review.json): feitelijke statusobservatie
  van 18 oktober; in dit werkpakket niet als actuele productieobservatie voorgesteld.
- [107 bronblokken](compliance-f4-review-source-blocks.json) en
  [81 aanvullende blokken](compliance-f4-review-supplement.json).
- [RI&E-deelcontrole](compliance-f4-rie-legal-review.md): zeven vragen, antwoordvarianten,
  twee toetsingsuitzonderingen en voorstellen die nog niet geactiveerd zijn.
- [Verificatiemanifest van dit werkpakket](compliance-f4-legal-acceptance.json):
  exacte dossierbestanden/hashes en controledatum, zonder nieuwe Knowledge-ID's.

## Actualiteit van de primaire bronnen

De actuele consolidaties van [Arbowet](https://wetten.overheid.nl/BWBR0010346/),
[Arbobesluit](https://wetten.overheid.nl/BWBR0008498/),
[Arboregeling](https://wetten.overheid.nl/BWBR0008587/) en
[Arbeidstijdenwet](https://wetten.overheid.nl/BWBR0007671/) gaven bij deze controle
HTTP 429. De opgeslagen revisies 2026-07-01_0 en 2026-08-01_0 zijn daarom niet
opgewaardeerd tot geverifieerde actuele consolidaties. Een bevoegde reviewer moet
de geldende tekst, wijzigingsketen en relevante uitzonderingen vaststellen.

Officiële voorlichting is aanvullend, geen vervanging voor wet of bronclaimreview:

| Onderwerp | Opnieuw geraadpleegd bewijs en gevolg voor review |
| --- | --- |
| RI&E/PvA/toetsing | [NLA FAQ](https://www.nlarbeidsinspectie.nl/onderwerpen/aanleveren-rie/veelgestelde-vragen-rie) ondersteunt RI&E/PvA en noemt 40 gezamenlijke uren en maximaal 25 met erkend instrument. De vereenvoudigde uitleg is geen volledige bewijsvoering van cao-route, DGA-correctie of individuele instrumentgeldigheid. |
| Erkenningsprocedure | [Arboportaal 4 juni 2026](https://www.arboportaal.nl/actueel/nieuws/2026/06/04/nieuwe-erkenningsprocedure-branche-rie): vernieuwde procedure per 1 juni; geen nieuwe erkenning zonder cao-partijen via de vervallen alternatieve route; bestaande erkenningen tot einddatum. Geen bewijs van een concreet instrumentbesluit. |
| Toepassing instrument | [Steunpunt toetsing](https://www.rie.nl/over-rie/toetsen): branche moet passen en erkenning moet gelden bij afronding van de RI&E. [Erkenningsproces](https://www.rie.nl/voor-brancheorganisaties/hoe-maak-je-een-branche-rie) is beheerprocedure, geen verleende erkenning. |
| Werkgeversscope | [Arboportaal](https://www.arboportaal.nl/onderwerpen/rechten-plichten-werkenden/algemene-rechten--plichten-van-werkenden) onderscheidt ingeleenden/vrijwilligers. [Rijksoverheid](https://www.rijksoverheid.nl/documenten/vraag-en-antwoord/arbeidsomstandigheden/waar-moet-mijn-werkgever-voor-zorgen-volgens-de-arbowet) gebruikt een brede personeelsopsomming. AW 1/16 en AB 9.5a afzonderlijk beoordelen; geen algemene vrijstelling uit een samenvatting. |
| Preventie | [Preventiemedewerker](https://www.arboportaal.nl/onderwerpen/ondersteuning-bij-arbowet/preventiemedewerker/wat-zegt-de-wet-over-de-preventiemedewerker) ondersteunt aanwijzing, deskundigheid, tijd en OR/PVT-instemming; omvang alleen beslist niet alle voorwaarden. |
| BHV | [BHV-voorlichting](https://www.arboportaal.nl/onderwerpen/arbozorg/bedrijfshulpverlening/wat-zegt-de-wet-over-bedrijfshulpverlening) beschrijft risicogerichte organisatie, opleiding en uitrusting. Geen universeel aantal, BHV-plan of certificaat uit afleiden. |
| Basiscontract | [Contractvoorwaarden](https://www.arboportaal.nl/onderwerpen/ondersteuning-bij-arbowet/basiscontract/waar-moet-het-basiscontract-aan-voldoen) zijn taakgericht; toegang, second opinion en klachtenprocedure blijven afzonderlijke voorwaarden. Algemene bevestiging bewijst niet alle taken. |
| PAGO | [PAGO](https://www.arboportaal.nl/onderwerpen/arbowet--en--regelgeving/arbobeleid/pago): aanbieden en vrijwillige deelname onderscheiden; inhoud/frequentie risicogericht. Niet iedere ontbrekende uitleg is zelfstandig bewijs van schending van de aanbiedingsplicht. |
| Voorlichting | [Voorlichting](https://www.arboportaal.nl/onderwerpen/arbozorg/voorlichting-gezondheidsrisicos): taak-/risicogericht, aanpassen bij aanleiding, extra aandacht voor jeugdigen. Geen algemene jaarlijkse cursus uit afleiden. |
| Raadpleging | [Wijziging per 1 juli 2026](https://www.arboportaal.nl/actueel/nieuws/2026/06/29/regels-voor-raadpleging-van-werknemers-aangepast-per-1-juli-2026) ondersteunt raadpleging ook zonder OR/PVT. Raadpleging, instemming en WOR-oprichtingsplicht blijven verschillende vragen. |
| PSA | Bestaande agressiepagina gaf timeout. [Officiële werkdrukuitleg](https://www.arboportaal.nl/onderwerpen/psychosociale-arbeidsbelasting/werkdruk/wat-zegt-de-wet) ondersteunt inventarisatie, maatregelen en voorlichting. Eén PSA-factor dekt niet zelfstandig het volledige PSA-oordeel. |
| Arbeidsongevallen | [NLA](https://www.nlarbeidsinspectie.nl/onderwerpen/arbeidsomstandighedenwet/arbeidsongevallen): meldcriteria, later bekend geworden gevolgen en registratie afzonderlijk. Procedurekennis bewijst geen feitelijke melding of register. |

Specialistische historische claims zijn opnieuw tegen de beschikbare officiële
zoekingangen bekeken: beeldschermwerk, fysieke belasting, zwangerschap, biologische
agentia, asbest, besloten ruimten, geluid en daglicht. De URLs staan per claim in het
bestaande dossier. Deze onderwerpen vormen geen extra geïmplementeerde F4-modules.
Algemene AB-doelvoorschriften bewijzen niet automatisch een historische ergonomische
maatvoering, medische causaliteit, checklistscore of veilige machineconfiguratie.
De daglichtpagina is slechts een doorverwijzing naar de niet bereikbare consolidatie.
De bestaande NLA CMR-PDF-link gaf nu 404; de zoekindex bevat nog de publicatie uit 2025.
Een zoekindexresultaat is geen actuele volledige documentverificatie. Geen vervangende
bronrevisie verzonnen; bronbewijs voor de betreffende claims blijft open.

## J01–J10 — regelcontrole en uitzonderingen

| Controle | Bevinding en veilige consequentie |
| --- | --- |
| J01 toepasselijkheid | HASEMPLOYEES=YES is context voor algemene regels; OTHERS/VOLUNTEERS/ZERO is geen bewezen vrijstelling. Tien afzonderlijke scopeclaims ontbreken. |
| J02 uitzonderingen | Geen automatische toetsingsvrijstelling vrijgeven. Uitzonderingsmatrix hieronder en bestaande RI&E-review zijn leidend voor menselijke beoordeling. |
| J03 drempels | 40 gezamenlijke uren en in de regel maximaal 25 personen zijn verschillende routes. DGA, instrumentversie, branche en peildatum zijn ontbrekende feiten. |
| J04 onbekend | Bestaande evaluator/tests geven ontbrekend/UNKNOWN geen automatisch positief of NVT-oordeel; bekende tekortkoming blijft zichtbaar. |
| J05 vijf statussen | Technisch contract en prioriteit zijn getest; juridische draagkracht per Ja/Gedeeltelijk/Nee is nog niet goedgekeurd. |
| J06 voldoende bewijs | Zelfverklaring en proceskennis zijn geen auditbewijs. Negen holds behouden; 141 bindings missen actuele goedgekeurde juridische afleiding. |
| J07 samenhang | Zichtbaarheid en filtering beschermen tegen verborgen antwoorden. CW2-BHV-03-NO_SHARED_WORKPLACE en CW2-PSA-02-NONE_IDENTIFIED vragen expliciete review van de positieve gevolgtrekking. Geen blanket NVT. |
| J08 bronbinding | Templatehashes kloppen; boundRuleChecksum en frameworkchecksum blijven leeg zolang echte beoordeelde bindings ontbreken. |
| J09 conflicten | Policy blokkeert conflicten/ingetrokken reviews. Semantische strijd tussen voorlichting en wet vereist menselijke beoordeling, niet automatisch de gunstigste bron kiezen. |
| J10 actualiteit | Vier actuele wettelijke consolidaties niet opnieuw leesbaar; bronreviews en volledige wijzigingsketen blijven open. |

| Uitzondering / afbakening | Benodigd bewijs vóór een conclusie | Huidig veilig resultaat |
| --- | --- | --- |
| RI&E-toetsing, maximaal 40 uur | AW 14 lid 12 a / lid 13 a en AB 2.14b lid 1; gezamenlijke arbeidsduur, toepasselijke DGA-correctie | RIETESTING Niet beoordeeld; RI&E zelf niet vrijgesteld |
| RI&E-toetsing, maximaal 25 | AW 14 lid 12 b / lid 13 b, AB 2.14b leden 2–4; toepasselijk cao-model of erkend instrument, versie, geldigheid, eigen omstandigheden | RIETESTING Niet beoordeeld |
| Werkgever als preventiemedewerker | Omvang plus deskundigheid, beschikbaarheid en overige AW 13-voorwaarden | PREVENTIONOFFICER hold |
| Geen OR/PVT | Directe raadpleging en eventuele instemming afzonderlijk vaststellen; geen algemene vrijstelling | Scope-/instemmingsreview open |
| Geen gedeelde arbeidsplaats | Feitelijke samenwerking en AW 19-scope; geen afleiding dat gehele BHV op orde is | Bestaande regel niet geactiveerd; review nodig |
| Geen PSA-factor gevonden | Kwaliteit en volledigheid inventarisatie; geen bewijs uit niet-aangevinkte risico's | Positieve afleiding nog niet juridisch vrijgegeven |
| Geen meldingsplichtig ongeval bekend | Werkelijke gebeurtenissen en later bekend geworden gevolgen; registratie apart | Drie ongevalsholds behouden |

## Negen holds en menselijke beslissingen

Alle negen blijven ongewijzigd. De volgende bewijzen moeten per Ja/Gedeeltelijk/Nee
worden beoordeeld; UNKNOWN/ontbrekend wordt niet alsnog positief gemaakt.

| Vraag | Ontbrekend bewijs / beslissing |
| --- | --- |
| RIETESTING | Volledige beide uitzonderingen, uren/personen, cao/instrument en toepassingsdatum. |
| PREVENTIONOFFICER | Uitvoerder, deskundigheid, omvang en voorwaarden voor interne/externe uitvoering. |
| PREVENTIONCONSULTATION | Aanwezigheid OR/PVT en vereiste instemming met persoon én positie. |
| BHVAPPOINTED | Aanwijzing en feitelijke beschikbaarheid apart; samengesteld antwoord is ambigu. |
| EXPERTTASKSCOVERED | Toepasselijkheid en uitvoering per deskundige taak. |
| CW2-PAGO-02 | Rechtsgrond voor uitleg over vrijwilligheid versus aanbieden zelf. |
| ACCIDENTREGISTRATION | Registratieplichtige gebeurtenissen en werkelijk register. |
| ACCIDENTREPORTING | Meldingsplichtige gebeurtenis en werkelijke tijdige melding. |
| CW2-ONG-01 | Tijdstip bekendwording ernstige gevolgen en daaropvolgende melding. |

## Geprioriteerde bevindingen

- **Kritiek, releaseblokkerend:** ontbrekende actuele primaire bronacceptatie en
  menselijke gevolgtrekkingsreview voor alle 141 bindings. Geen inhoudelijke GO.
- **Hoog:** onterechte toetsingsvrijstelling of werkgeversscope; negen holds,
  zelfstandige scopeclaims en versie-/tijdvoorwaarden blijven noodzakelijk.
- **Hoog:** ongevalsprocedure verwarren met feitelijke naleving; geen bewijs dat
  relevante gebeurtenis afwezig is uit alleen een positief procesantwoord.
- **Middel:** CW2-RIE-02 noemt AW 5 lid 5 in de kandidaatmatrix; dit betreft
  terbeschikkingstelling, niet de algemene bijzondere-groepenplicht. Het bestaande
  RI&E-supplement verduidelijkt dit. Correctie van een uiteindelijke juridische
  binding pas na review; geen normatieve runtimewijziging.
- **Middel:** ai-02:c7 en ai-12:review:c2 hebben geen bevestigd primair normfragment.
  Historisch normenoverzicht respectievelijk ATW/medische context nog open.
- **Middel:** ai-11:review:c1 heeft een verdachte extractiekop; originele context
  vereist. CMR-PDF momenteel 404; geen actuele bronverificatie claimen.
- **Laag:** technische dossierlabels zijn geen Knowledge-status. Oude
  productieobservatie en huidige lokale verificatie blijven expliciet gescheiden.

## Technische verificatie en publicatiegrens

63/63 bestaande bron-/publicatieregressies in vijf suites opnieuw PASS op 23 oktober.
Die controleren alle claim-/regelidentiteiten, 188 fragmenthashes, negen holds,
lege reviewerbeslissingen, verlopen reviews, conflicten, primaire ondersteuning,
scopeclaims en checksums. Geen test maakt een onbewezen juridische uitkomst normatief.

De runtime-loader en read-only inspector gebruiken dezelfde Knowledge-policy,
vereisen menselijke validatie, actuele bronrevisie, directe citaties en correcte
hashes; alleen PUBLISHED of reviewedAt is onvoldoende. Scope krijgt een aparte
CONDITION-claim. Historische snapshots worden niet herberekend.

De in werkpakket 2 opnieuw uitgevoerde lokale CLI-dry-run gaf NO_GO /
FRAMEWORK_NOT_REGISTERED / 141 ontbrekende regels, zonder writes. Geen actuele
productiequery in dit werkpakket. De schrijvende publicatietransactie en haar
atomaire hercontrole zijn niet bewezen door deze read-only inspector en moeten
vóór latere publicatie afzonderlijk worden gereviewd.

Geen productcode gewijzigd na werkpakket 2: volledige lint en productiebuild
(165 routes) daarvan blijven van toepassing. Standalone TypeScript heeft exact
de vier bekende readonly-arraybaselinefouten; geen nieuwe taakfout. Diff-/secretscheck
wordt vóór commit uitgevoerd. Er is voor deze documentreview geen extra testdatabase
aangemaakt; eerdere tijdelijke databases zijn verwijderd.

## Vereiste reviewerhandelingen

Gebruik de tien bestaande onderwerpbeslisbladen en alle individuele lege
`humanDecision`-velden. Leg per claim/regel vast: akkoord, aanpassen, aanvullend
bewijs of afwijzen; reviewer, datum, exact beoordeelde revisie/checksum, onderbouwing
en vervolgactie. Geen algemene vink voor het gehele dossier.

1. Actuele geconsolideerde bronnen en uitzonderingen verifiëren.
2. Historische kandidaten onderscheiden van nieuwe actuele DIRECT_SUPPORT-bindingen.
3. De tien scopevoorwaarden en negen holds afzonderlijk beslissen.
4. Elke gevolgtrekking en praktische/wettelijke classificatie vastleggen.
5. Pas daarna het bestaande frameworkpublicatieplan, transactiecontrole en een
   nieuwe dry-run voorbereiden onder afzonderlijke autorisatie.

De onafhankelijke publieke en overige technische werkpakketten kunnen voortgaan;
zij geven geen toestemming voor F4-publicatie. PR #49 blijft Draft en F4 blijft uit.
