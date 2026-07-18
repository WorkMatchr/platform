# Module 6A.0 — Providerkwalificatie en onboarding

> **Actuele productcorrectie (16 juli 2026):** alle capaciteitseisen in dit historische ontwerp zijn vervangen door B-173. Aanbieders beslissen per uitnodiging of zij reageren; capaciteit wordt niet meer uitgevraagd of gebruikt voor volledigheid, readiness, selecteerbaarheid of selectie.

## Status

- Fase: ontwerp afgerond.
- Datum: 14 juli 2026.
- Product-owneracceptatie: geslaagd op 14 juli 2026.
- Implementatie van de gekoppelde Module 6A.2: afgerond en product-ownergeaccepteerd op 15 juli 2026.
- Dit 6A.0-ontwerp zelf bevatte geen schemawijzigingen; de geaccepteerde databasefundering is later in Module 6A.2 gerealiseerd.
- Actuele vervolgstatus: Module 6A.3 — Provider-onboardinginterface is de volgende module; 6A.3.0 en 6A.3.1 zijn geaccepteerd en 6A.3.2 is technisch opgeleverd met product-owneracceptatie open.

## 1. Doel

Module 6A.0 ontwerpt hoe WorkMatchr aanbieders zorgvuldig, uitlegbaar en herhaalbaar kwalificeert voordat hun gegevens door een toekomstige Decision Engine mogen worden gebruikt. Het ontwerp dekt de route van een nieuw aanbiederaccount tot en met periodieke herbeoordeling en historische prestaties.

Het doel is niet om nu aanbieders aan opdrachten te koppelen. Het doel is een betrouwbare gegevensbasis en een controleerbaar kwalificatieproces te definiëren, zodat een latere selectie niet steunt op marketingtekst, verouderde verklaringen of onduidelijke aannames.

## 2. Scope

Binnen scope:

- aanbieder-onboarding en dossieropbouw;
- organisatie-, capability-, sector-, regio-, capaciteit-, competentie- en compliancedossiers;
- platformkwalificatie en beroepskwalificatie;
- gegevensverificatie en bewijsvoering;
- readiness en selecteerbaarheid;
- herbeoordeling, schorsing en gecontroleerde herstelroutes;
- eigenaarschap, autorisatie, privacy en audit;
- informatiecontract met de toekomstige Decision Engine;
- voorstel voor database-impact, zonder Prisma te wijzigen.

Buiten scope:

- matching- of scoringslogica;
- het selecteren of tonen van aanbieders bij opdrachten;
- aanbiedersreacties, offertes en contractvorming;
- credits, Mollie en andere betalingen;
- AI-classificatie, AI-verificatie of AI-ranking;
- implementatie van database, services, routes, UI of beheeromgeving;
- definitieve juridische bewaartermijnen en polisvoorwaarden.

## 3. Productprincipes

### 3.1 Garbage in, garbage out

Een uitlegbare beslisuitkomst kan niet beter zijn dan de ingevoerde gegevens. Vrije marketingtekst en ongeverifieerde claims mogen daarom niet stilzwijgend veranderen in selectiecriteria. Ieder beslisgegeven heeft een eigenaar, bron, verificatiestatus, geldigheidsperiode en laatste controlemoment nodig.

### 3.2 Begrippen blijven gescheiden

WorkMatchr behandelt de volgende begrippen als afzonderlijke concepten:

1. **Platformkwalificatie** — de aanbiederorganisatie voldoet aan de minimale eisen om op WorkMatchr actief te zijn.
2. **Beroepskwalificatie** — een organisatie of natuurlijke persoon heeft aantoonbare vakinhoudelijke bevoegdheid voor een specifieke capability.
3. **Readiness** — het dossier is voldoende compleet en actueel om beoordeeld of gebruikt te worden.
4. **Selecteerbaarheid** — de aanbieder mag op dit moment technisch in aanmerking komen voor een concrete opdracht.
5. **Historische prestaties** — observeerbare resultaten uit afgeronde platforminteracties; dit is nooit automatisch bewijs van beroepskwalificatie.

Een positieve status in één categorie impliceert geen positieve status in een andere categorie.

### 3.3 Zelfverklaard is zichtbaar zelfverklaard

Invoer van een aanbieder blijft `SELF_DECLARED` totdat WorkMatchr of een daartoe bevoegde externe bron de invoer controleert. Gebruikers krijgen geen badge of formulering die een sterkere controle suggereert dan daadwerkelijk is uitgevoerd.

### 3.4 Selecteerbaarheid is afgeleid en tijdelijk

`isAvailable` is onvoldoende als selectiegrond. Selecteerbaarheid wordt later afgeleid uit actuele organisatie-, kwalificatie-, compliance-, capability- en capaciteitsgegevens en opnieuw bepaald voor iedere opdracht.

### 3.5 Commerciële status beïnvloedt inhoudelijke kwalificatie niet

Een betaald pakket, creditsaldo of commerciële overeenkomst mag nooit een verificatieniveau, beroepskwalificatie, knock-outuitkomst of inhoudelijke score verhogen.

### 3.6 Minimaal noodzakelijke persoonsgegevens

Organisatiecapaciteiten worden waar mogelijk op organisatieniveau vastgelegd. Gegevens van natuurlijke personen worden alleen opgeslagen wanneer individuele bevoegdheid aantoonbaar nodig is. De Decision Engine ontvangt standaard geen namen, contactgegevens, documentbestanden of andere direct identificerende gegevens.

### 3.7 Geen stille wijzigingen

Beoordeelde dossiergegevens worden niet onzichtbaar overschreven. Relevante wijzigingen maken een nieuwe revisie, kunnen herbeoordeling vereisen en behouden herleidbare historie.

## 4. Analyse van de huidige basis

### 4.1 Reeds aanwezig

Het bestaande model bevat:

- `Organization` met type `PROVIDER` of `BOTH`, status, handelsgegevens en contactvelden;
- `OrganizationMembership` met `OWNER`, `ADMIN` en `MEMBER`;
- `OrganizationLocation` en `OrganizationSector`;
- één `ProviderProfile` per aanbiederorganisatie;
- `ProviderApprovalStatus` met concept-, review-, goedkeurings-, afwijzings- en schorsingsstatus;
- omschrijving, maximale reisafstand, remote-acceptatie en een eenvoudige beschikbaarheidsvlag;
- `ProviderSpecialism` met specialisme, ervaringsjaren en primaire aanduiding;
- `ProviderSector` met sectorervaring;
- `Certification` en `ProviderCertification` met nummer, data en verificatiestatus;
- generieke `AdminActionLog`;
- toekomstige selectierecords en handmatige selectie-uitkomsten.

De bestaande onboarding maakt voor een organisatie van type `PROVIDER` of `BOTH` transactioneel een `ProviderProfile` met status `DRAFT` en `isAvailable = false`. Er bestaat nog geen volledige provider-onboarding of kwalificatiebeheer.

### 4.2 Ontbrekende gegevens

De huidige basis bevat nog niet genoeg betrouwbare informatie voor providerkwalificatie of selectie:

- juridische identiteit en registercontrole zijn niet volledig gemodelleerd;
- aangeboden diensten en capability-niveau ontbreken als afzonderlijk concept;
- specialismen zijn te grof en bewijzen geen bevoegdheid;
- werkgebieden zijn niet gestructureerd vastgelegd;
- beschikbaarheid bevat geen volume, periode, actualiteit of type inzet;
- professionals en hun persoonsgebonden kwalificaties ontbreken;
- verzekeringen, verklaringen en bewijsdocumenten ontbreken;
- verificatiebron, reviewer, methode en verloopdatum zijn niet generiek beschikbaar;
- dossiercompleetheid, readiness en kwalificatiecriteria ontbreken;
- herbeoordelingen, herstelverzoeken en profielrevisies ontbreken;
- historische prestaties zijn nog niet betrouwbaar of statistisch bruikbaar.

### 4.3 Onveilige aannames die verboden moeten worden

- `Organization.employeeCount` is geen beschikbare specialistencapaciteit.
- `OrganizationLocation.province` is geen werkgebied.
- `ProviderProfile.isAvailable` bewijst geen actuele inzetbaarheid.
- `ProviderApprovalStatus.APPROVED` bewijst geen geschiktheid voor iedere opdracht.
- een primair specialisme bewijst geen beroepskwalificatie.
- een certificaatnaam bewijst niet wie certificaathouder is of dat bewijs geldig is.
- ervaringsjaren zonder bron zijn zelfverklaarde invoer.
- sectorregistratie bewijst geen relevante projectervaring.
- vrije tekst mag niet automatisch worden vertaald naar knock-out- of scorecriteria.
- een eerdere selectie of opdracht is geen positieve prestatie zonder een gedefinieerde uitkomst.

## 5. Begrippen en statussen

### 5.1 Provider lifecycle

De aanbevolen lifecycle is:

1. `ACCOUNT_CREATED` — account bestaat, maar nog geen actief providerdossier.
2. `DRAFT` — aanbieder vult het dossier in.
3. `READY_FOR_REVIEW` — minimale invoer en vereiste bewijsstukken zijn aanwezig.
4. `IN_REVIEW` — WorkMatchr beoordeelt een bevroren dossiercandidate.
5. `CHANGES_REQUESTED` — herstelbare tekortkomingen zijn teruggegeven.
6. `QUALIFIED` — platformkwalificatie is verleend met geldigheidsperiode.
7. `SUSPENDED` — tijdelijk niet selecteerbaar door risico, verval of beheerbesluit.
8. `REJECTED` — beoordeling is gemotiveerd afgewezen.
9. `ARCHIVED` — relatie is beëindigd; dossier blijft volgens bewaarbeleid herleidbaar.

Deze namen zijn ontwerptermen. Het bestaande `ProviderApprovalStatus` wordt in Module 6A.2 pas na een afzonderlijk migratiebesluit uitgebreid of vervangen.

### 5.2 Overgangsregels

| Van | Naar | Actor | Hoofdvoorwaarde |
| --- | --- | --- | --- |
| Account | `DRAFT` | `OWNER` of `ADMIN` aanbieder | Actieve organisatie van type `PROVIDER` of `BOTH` |
| `DRAFT` | `READY_FOR_REVIEW` | `OWNER` of `ADMIN` aanbieder | Verplichte dossiers compleet; verklaringen expliciet bevestigd |
| `READY_FOR_REVIEW` | `IN_REVIEW` | Platformbeheerder/reviewer | Reviewcase toegewezen en dossiercandidate bevroren |
| `IN_REVIEW` | `CHANGES_REQUESTED` | Platformreviewer | Bevindingen en herstelpunten vastgelegd |
| `CHANGES_REQUESTED` | `READY_FOR_REVIEW` | `OWNER` of `ADMIN` aanbieder | Herstelpunten verwerkt; nieuwe revisie ingediend |
| `IN_REVIEW` | `QUALIFIED` | Bevoegde platformreviewer | Alle minimumcriteria positief en besluit geaudit |
| `IN_REVIEW` | `REJECTED` | Bevoegde platformreviewer | Redencode en motivering vastgelegd |
| `QUALIFIED` | `SUSPENDED` | Platformbeheerder of automatisch beleid | Kritieke geldigheid verlopen, blokkade of gemotiveerd incident |
| `SUSPENDED` | `IN_REVIEW` | Platformreviewer | Oorzaak hersteld; herbeoordeling gestart |
| Iedere actieve status | `ARCHIVED` | Bevoegde actor | Expliciete beëindiging; downstreamgevolgen gecontroleerd |

Geen statusovergang wordt uitsluitend in de UI afgedwongen. Iedere overgang vereist server-side tenant-, rol-, status-, versie- en beleidscontrole en een append-only auditrecord.

## 6. Dossiermodel

### 6.1 Classificatie van gegevens

Ieder relevant gegeven krijgt minimaal:

- `sourceType`: `SELF_DECLARED`, `DOCUMENT`, `REGISTER`, `PLATFORM_OBSERVATION` of `MANUAL_REVIEW`;
- `verificationStatus`: `UNVERIFIED`, `PENDING`, `VERIFIED`, `REJECTED` of `EXPIRED`;
- `validFrom` en waar relevant `validUntil`;
- `lastReviewedAt` en reviewer of verificatiebron;
- revisie en auditcontext;
- zichtbaarheid: aanbieder, platformreviewer, opdrachtgever of uitsluitend systeem;
- dataclassificatie: openbaar, intern zakelijk, vertrouwelijk of persoonsgegeven.

Diensten, specialismen, sectoren, regio’s en kwalificaties gebruiken centrale, versieerbare taxonomieën. Gepubliceerde taxonomieversies worden niet in-place gewijzigd; nieuwe betekenis of classificatie vereist een nieuwe versie.

### 6.2 Organisatiedossier

Doel: vaststellen wie de contracterende aanbieder is en of deze organisatie op het platform actief mag zijn.

Benodigde gegevens:

- officiële naam, handelsnaam, rechtsvorm en vestigingsland;
- KvK- of buitenlands registratienummer, registerbron en controledatum;
- btw-identificatie waar juridisch of facturatie-technisch vereist;
- statutair en operationeel adres;
- algemene zakelijke contactkanalen;
- tekenbevoegde of dossierverantwoordelijke rol, zonder deze standaard aan opdrachtgevers te tonen;
- organisatieomvang en aantal inzetbare professionals als afzonderlijke begrippen;
- organisatiestatus, providerstatus en reden voor blokkade/schorsing;
- expliciete acceptatie van actuele platformvoorwaarden en relevante verklaringen.

Minimumeis voor review: verifieerbare juridische identiteit, actieve organisatie, bevoegd dossierbeheer en vereiste voorwaardenacceptatie.

### 6.3 Capabilitydossier

Doel: gestructureerd vastleggen welke concrete dienstverlening de aanbieder kan leveren.

Een capability is specifieker dan een algemeen specialisme en bevat:

- capability uit een beheerde, versieerbare taxonomie;
- dienstvorm, bijvoorbeeld onderzoek, advies, begeleiding, toetsing of training;
- leveringsniveau en eventuele wettelijke context;
- organisatieniveau of afhankelijk van gekwalificeerde professionals;
- status, bron, bewijs en geldigheid;
- minimale en maximale opdrachtomvang indien relevant;
- leveringsvorm: op locatie, hybride of remote;
- zelfverklaarde toelichting die niet rechtstreeks scoort.

Een nieuwe of inhoudelijk gewijzigde taxonomieversie mag bestaande bewijsbetekenis niet achteraf veranderen.

### 6.4 Sectordossier

Doel: aantoonbare ervaring per sector onderscheiden van de eigen organisatiesector.

Per providersector:

- sector uit een versieerbare taxonomie;
- ervaringsniveau of bandbreedte;
- relevante projectperiode en actualiteit;
- aantal aantoonbare opdrachten als geaggregeerde indicator, pas na brondefinitie;
- capability waarop de sectorervaring betrekking heeft;
- bron en verificatiestatus.

De bestaande `OrganizationSector` beschrijft de organisatie zelf. `ProviderSector` beschrijft leverervaring en moet daarom niet automatisch uit `OrganizationSector` worden afgeleid.

### 6.5 Werkregiodossier

Doel: bepalen waar en op welke wijze de aanbieder daadwerkelijk kan leveren.

Versie 1 gebruikt uitsluitend centrale, versieerbare regiowaarden voor:

- de twaalf Nederlandse provincies;
- `LANDELIJK` voor fysieke landelijke dekking;
- `REMOTE` voor dienstverlening die volledig op afstand kan plaatsvinden.

Een provider kan meerdere waarden kiezen. `REMOTE` vervangt geen fysieke provincie of `LANDELIJK`, en een organisatielocatie wordt nooit automatisch als werkgebied geïnterpreteerd. Vrije tekst over regio’s is alleen toelichting en geen selectiebron.

### 6.6 Capaciteitsdossier

Doel: een tijdgebonden, controleerbare indicatie geven of de aanbieder nieuwe opdrachten kan aannemen.

Versie 1 legt per capaciteitssnapshot uitsluitend vast:

- accepteert nieuwe opdrachten: ja/nee;
- vroegste startdatum;
- globale capaciteit: `BEPERKT`, `NORMAAL` of `RUIM`;
- datum van laatste bevestiging.

Capaciteitsgegevens zijn maximaal 30 dagen actueel. Daarna is de capaciteit `STALE`, vervalt selecteerbaarheid totdat de provider opnieuw bevestigt en mag de oude waarde niet als actuele score-input gelden.

### 6.7 Competentiedossier: organisatie

Organisatiecompetentie is alleen passend wanneer het vermogen aantoonbaar op organisatieniveau bestaat, bijvoorbeeld:

- gecertificeerd managementsysteem;
- geborgde methodiek of accreditatie;
- dienstverlening waarvoor meerdere gekwalificeerde personen beschikbaar zijn;
- kwaliteits- en escalatieproces.

Een organisatiecompetentie bevat scope, uitgevende instantie, bewijs, geldigheid en verificatie. Zij mag geen individuele, wettelijk persoonsgebonden bevoegdheid vervangen.

### 6.8 Competentiedossier: natuurlijke persoon

Persoonsgebonden beroepskwalificaties worden gekoppeld aan een afzonderlijke professional binnen de providerorganisatie:

- minimale identificatie voor intern beheer;
- relatie en status bij de providerorganisatie;
- beroep/rol en capabilitykoppeling;
- registratie, diploma of certificaat met uitgevende instantie en geldigheid;
- verificatiebron en controlemoment;
- inzetbaarheidsstatus zonder persoonlijke agenda aan opdrachtgevers bloot te stellen;
- bewijsdocumenten met beperkte toegang.

Namen en documenten gaan niet naar de Decision Engine. De engine gebruikt alleen afgeleide feiten zoals: “minimaal één actuele, geverifieerde professional beschikbaar voor capability X”. Toewijzing van een specifieke professional aan een opdracht valt buiten Module 6A.0.

### 6.9 Compliancedossier

Mogelijke complianceonderdelen:

- beroeps- en bedrijfsaansprakelijkheidsverzekering;
- polisdekking, verzekeraar, geldigheidsperiode en relevante limieten;
- vereiste beroepsregistraties en certificaten;
- sanctie-, integriteits- of uitsluitingscontrole voor zover juridisch toegestaan en noodzakelijk;
- informatiebeveiligings- en privacyverklaringen indien de dienstverlening dit vereist;
- voorwaardenacceptatie en verklaringen omtrent juistheid;
- incident, blokkade of herstelmaatregel met streng beperkte zichtbaarheid.

De exacte juridische minimumeisen, grondslagen en bewaartermijnen vereisen product-, juridisch en privacybesluit vóór implementatie.

### 6.10 Historisch dossier

Historie bestaat uit gescheiden bronnen:

- status- en kwalificatiebesluiten;
- dossier- en verificatierevisies;
- platformobservaties zoals reactie, acceptatie, uitvoering en afronding;
- geobjectiveerde klachten of incidenten na hoor en wederhoor;
- toekomstige, methodologisch vastgestelde kwaliteitsuitkomsten.

Historie mag in de eerste Decision Engine-versie niet automatisch scoren. Eerst zijn een betrouwbare gebeurtenisdefinitie, minimale steekproef, correctiemechanisme, biasanalyse en bezwaarprocedure nodig. Het ontbreken van historie bij een nieuwe aanbieder is geen negatieve prestatie.

## 7. Kwalificatiemodel

### 7.1 Platformkwalificatie

Platformkwalificatie beantwoordt uitsluitend: “Mag deze organisatie als aanbieder op WorkMatchr actief zijn?”

Aanbevolen minimumcriteria:

- organisatie is actief, correct getypeerd en juridisch verifieerbaar;
- actieve `OWNER` of bevoegde `ADMIN` beheert het dossier;
- vereiste platformvoorwaarden en juistheidsverklaring zijn geaccepteerd;
- minimaal één capability is ingediend;
- verplichte compliancebewijzen zijn geldig;
- kritieke bevindingen of blokkades ontbreken;
- reviewbesluit heeft actor, tijdstip, criteria-versie, motivering en geldigheidsduur.

Platformkwalificatie zegt niets over geschiktheid voor een concrete opdracht.

### 7.2 Beroepskwalificatie

Beroepskwalificatie wordt per capability vastgelegd en kan rusten op:

- een organisatiebrede bevoegdheid;
- één of meer actuele gekwalificeerde professionals;
- een combinatie van registratie, certificering en aantoonbare ervaring;
- een expliciete criteria-versie.

Een algemene providerstatus mag beroepskwalificatie nooit vervangen.

### 7.3 Readiness

Readiness is een interne, uitlegbare beoordeling van dossierbruikbaarheid:

- `INCOMPLETE` — verplichte invoer ontbreekt;
- `READY_FOR_REVIEW` — compleet genoeg voor menselijke beoordeling;
- `UNDER_REVIEW` — beoordeling loopt;
- `READY_FOR_USE` — vereiste gegevens zijn beoordeeld en actueel;
- `STALE` — één of meer kritieke gegevens moeten worden vernieuwd;
- `BLOCKED` — een kritieke afwijzing of blokkade verhindert gebruik.

Readiness is geen marketingbadge en geen numerieke kwaliteitsscore. De UI toont concrete ontbrekende of verlopen onderdelen en nooit alleen een onverklaard percentage.

### 7.4 Selecteerbaarheid

Een aanbieder is pas kandidaat voor opdrachtspecifieke beoordeling als minimaal:

- organisatie en providerprofiel actief zijn;
- platformkwalificatie geldig is;
- dossier `READY_FOR_USE` is;
- minimaal één relevante beroepskwalificatie geldig is;
- kritieke compliance actueel is;
- capaciteit recent is bevestigd;
- aanbieder nieuwe opdrachten accepteert;
- geen platformblokkade of relevante uitsluiting actief is.

Alle verplichte kwalificatie-, capability-, regio-, capaciteit- en compliancegegevens moeten compleet en actueel zijn. Eén ontbrekend of verlopen verplicht onderdeel voorkomt selecteerbaarheid, zonder andere dossierstatussen te herschrijven.

Daarna volgen pas opdrachtspecifieke knock-outs. Selecteerbaarheid wordt niet als handmatig bewerkbare boolean de primaire waarheid.

## 8. Verificatieniveaus

### 8.1 Geaccepteerde verificatielabels

De zichtbare verificatielabels zijn:

- **Zelf verklaard** — door de provider opgegeven en niet onafhankelijk gecontroleerd;
- **Document gecontroleerd** — het aangeleverde bewijs is gecontroleerd op leesbaarheid, samenhang en aansluiting op de claim;
- **Geverifieerd** — de claim is aanvullend tegen een bevoegde bron, uitgever of register gecontroleerd.

Workflowstatussen zoals in behandeling, afgewezen of verlopen blijven afzonderlijke technische statussen en zijn geen verificatielabel. Leg per controle minimaal `verificationMethod`, `verifiedAt`, `verifiedBy`, `sourceReference`, `validUntil` en `criteriaVersion` vast. Zelfverklaarde gegevens worden nooit automatisch opgewaardeerd.

### 8.2 Geen commerciële verificatieladder

`Premium Verified` wordt niet gebruikt. Er komt geen betaalde route naar een sterkere inhoudelijke status. Verificatie heeft geen commerciële betekenis en levert niet automatisch een hogere selectiescore op. Een publiek label mag uitsluitend de werkelijk uitgevoerde controle samenvatten en moet doorklikbaar uitleggen wat wel en niet is gecontroleerd.

### 8.3 Vier-ogenprincipe

Voor kritieke uitzonderingen, handmatige overrides, schorsing op integriteitsgrond en herstel van een afwijzing wordt een vier-ogenbesluit aanbevolen. Het exacte mandaatmodel blijft een open productbesluit.

## 9. Rollen, eigenaarschap en toegang

### 9.1 Aanbiederorganisatie

- `OWNER`: beheert het volledige eigen dossier en mag juridische en complianceverklaringen indienen en wijzigen.
- `ADMIN`: beheert het volledige eigen dossier en mag juridische en complianceverklaringen indienen en wijzigen.
- `MEMBER`: mag geen juridische of complianceverklaringen indienen of wijzigen en mag niet kwalificeren, indienen of platformstatus wijzigen.

Het huidige brede organisatierechtenmodel moet vóór implementatie worden verfijnd voor providerdossiers. `MEMBER` krijgt geen mutatierecht op kwalificatie-, juridische of compliancegegevens.

### 9.2 Platformrollen

Er zijn later expliciete platformrechten nodig voor:

- reviewer;
- senior reviewer/beslisser;
- compliancebeheerder;
- security- of privacybeheerder;
- support met beperkte inzage;
- auditor met read-only toegang.

De bestaande globale `ADMIN`-rol is zonder fijnmazige bevoegdheden te breed voor gevoelige providerbewijzen.

### 9.3 Decision Engine

De engine krijgt een server-side, read-only projectie met uitsluitend toegestane beslisfeiten. Zij krijgt geen generieke toegang tot dossierdocumenten of persoonsgegevens.

## 10. Security, privacy en documentbeheer

- Tenantcontrole gebruikt altijd de geauthenticeerde gebruiker, actieve membership en actuele organisatiestatus.
- Een `organizationId`, professional-ID of document-ID uit formulier, cookie of route is nooit zelfstandig autorisatiebewijs.
- Bewijsbestanden worden buiten publieke webroots opgeslagen met willekeurige storagekeys, malware-/inhoudscontrole, type- en groottelimieten en versleuteling passend bij de provider.
- Documentmetadata en binaire opslag worden gereconcilieerd; mislukte writes rollen gecontroleerd terug.
- Downloadlinks zijn kortlevend, doelgebonden en geautoriseerd.
- Logs bevatten geen documentinhoud, volledige polisnummers, beroepsregistratienummers, adressen, contactgegevens, tokens of secrets.
- Persoonsgebonden gegevens worden geminimaliseerd en standaard niet aan opdrachtgevers getoond.
- Iedere inzage in gevoelige bewijsstukken en iedere reviewbeslissing wordt geaudit.
- Revisies zijn append-only; correctie maakt een nieuwe versie en vernietigt geen besliscontext.
- Bewaartermijnen, verwijderrechten, wettelijke uitzonderingen en anonimisering moeten vóór implementatie juridisch worden vastgesteld.

## 11. UX-ontwerp

### 11.1 Onboarding in stappen

1. **Organisatie bevestigen** — juridische identiteit en contactverantwoordelijkheid.
2. **Diensten beschrijven** — capabilities selecteren uit begrijpelijke Nederlandse categorieën.
3. **Werkgebied en leveringsvorm** — regio, remote/hybride en reistolerantie.
4. **Capaciteit aangeven** — startmoment en actuele inzetbaarheid.
5. **Kwalificaties onderbouwen** — organisatie- en persoonsgebonden competenties.
6. **Compliance aantonen** — vereiste verklaringen, verzekeringen en bewijsstukken.
7. **Controleren en indienen** — samenvatting, ontbrekende punten en expliciete verklaring.
8. **Review volgen** — status, concrete herstelpunten, reactietermijn en historie.

### 11.2 UX-principes

- Toon waarom een gegeven nodig is en wie het later kan zien.
- Maak onderscheid tussen verplicht, aanbevolen en optioneel.
- Bewaar concepten en ingevulde waarden bij validatiefouten.
- Toon veldfouten bij het veld, focus het eerste foutveld en bied een samenvatting.
- Gebruik geen onverklaarde score, rood-groen als enige betekenis of misleidende badge.
- Toon vervaldata en eerstvolgende actie in gewone Nederlandse taal.
- Laat een aanbieder een reviewcandidate controleren voordat deze wordt bevroren.
- Wijzigingen die herbeoordeling veroorzaken krijgen vooraf een duidelijke waarschuwing.
- Maak afwijzing en schorsing feitelijk, gemotiveerd en voorzien van herstel- of bezwaarroute.
- Houd de flow mobiel bruikbaar, maar ontwerp documentcontrole primair ook voor groter scherm en toetsenbord.

## 12. Voorgestelde database-impact

### 12.1 Waarschijnlijk nieuwe entiteiten

| Voorstel | Doel | Belangrijkste relaties en constraints |
| --- | --- | --- |
| `ProviderCapability` | Dienst/capability per provider | Provider, taxonomie-item, status; uniek per provider en actieve capabilityversie |
| `CapabilityDefinition` en versie | Beheerde capabilitytaxonomie | Immutable gepubliceerde versies; stabiele code |
| `ProviderWorkArea` | Gestructureerd leveringsgebied | Provider, regiocode, leveringsvorm, geldigheid; geen overlappende actieve duplicaten |
| `ProviderCapacitySnapshot` | Tijdgebonden capaciteit | Provider/capability, peildatum, geldigheid; append-only snapshots |
| `ProviderProfessional` | Natuurlijke persoon onder provider | Tenantgebonden, lifecycle, minimale persoonsgegevens; geen cascadeverlies van historie |
| `ProfessionalCompetency` | Persoonsgebonden bevoegdheid | Professional, capability/certificaat, bewijs en geldigheid |
| `ProviderOrganizationCompetency` | Organisatiebrede competentie | Provider, capability, bewijs en geldigheid |
| `ProviderInsurance` | Polis- en dekkingmetadata | Provider, type, periode, verificatie; polisnummer afgeschermd |
| `ProviderDocument` en `ProviderDocumentRevision` | Bewijsmetadata en immutable revisies | Storagekey uniek; checksum; toegangsklasse; geen binaire data in Prisma |
| `ProviderVerificationCase` | Reviewworkflow | Provider, dossiercandidate, reviewer, status, criteria-versie |
| `ProviderVerificationFinding` | Bevinding/herstelpunt | Case, dossieronderdeel, severity, redencode, resolutie |
| `ProviderQualification` | Platform- of beroepskwalificatie | Scope/type, criteria-versie, besluit, geldigheid; append-only besluiten |
| `ProviderProfileRevision` | Bevroren dossiercandidate/snapshot | Provider en revisienummer uniek; snapshotreferenties immutable |
| `ProviderBlock` | Schorsing of uitsluiting | Provider, type, periode, actor, reden; gevoelige details beperkt |
| `ProviderTermsAcceptance` | Expliciete akkoordhistorie | Provider, gebruiker, documentversie en tijdstip uniek |
| `ProviderPerformanceEvent` | Toekomstige genormaliseerde historie | Assignment/provider, gebeurtenistype, bron; pas later voor scoring vrijgeven |

Definitieve normalisatie, namen en constraints worden pas in Module 6A.2 vastgesteld na product-owneracceptatie van 6A.0 en het Decision Engine-contract van 6A.1.

### 12.2 Bestaande modellen

- `ProviderProfile` blijft het één-op-één hoofdpunt bij `Organization`.
- `ProviderSpecialism` kan als overgangs- of presentatiegegeven blijven, maar vervangt geen capability.
- `ProviderSector` moet bron, actualiteit en capabilitycontext krijgen of worden opgevolgd door een ervaringsmodel.
- `ProviderCertification` moet kunnen verwijzen naar organisatie of professional en naar bewijsrevisies.
- `ProviderApprovalStatus` moet worden gemapt op het definitieve lifecyclemodel; bestaande waarden worden niet achteraf semantisch hergebruikt zonder migratieplan.
- `AssignmentProviderSelection` blijft buiten Module 6A.0 en mag de kwalificatiebron niet worden.

### 12.3 Integriteitsregels

- maximaal één actief providerprofiel per organisatie blijft databasebreed afgedwongen;
- gepubliceerde taxonomie- en criteriaversies zijn immutable;
- reviewbesluiten en verificatiehistorie zijn append-only;
- één besluit verwijst naar exact één bevroren dossiercandidate en criteria-versie;
- geldigheidsintervallen zijn intern consistent;
- gevoelige records worden gearchiveerd of geanonimiseerd volgens beleid, niet ongecontroleerd gecascade-deletet;
- revision- en statusupdates gebruiken optimistische concurrencycontrole;
- kritieke statusovergangen en snapshots ontstaan transactioneel.

## 13. Contract met de toekomstige Decision Engine

### 13.1 Toegestane gegevens

De engine mag uitsluitend een gevalideerde projectie lezen met:

- interne provider-ID en snapshot-/revisie-ID;
- actieve organisatie- en providerstatus;
- geldige platformkwalificatie en criteria-versie;
- geldige capabilitycodes en beroepskwalificatiestatus;
- geverifieerde sectorervaring met bronklasse en actualiteit;
- gestructureerde werkgebieden en leveringsvormen;
- recente capaciteitsbandbreedte en vroegste startdatum;
- geldigheidsfeiten van vereiste compliance en verzekeringen;
- actieve blokkades of uitsluitingen als booleans/redencodes;
- geaggregeerde, vooraf goedgekeurde historische indicatoren zodra methodologisch toegestaan;
- verificatieniveau, `validUntil`, laatste controlemoment en herkomstklasse per beslisfeit.

### 13.2 Knock-outgegevens

Een knock-out mag alleen volgen uit expliciet versieerbare regels, bijvoorbeeld:

- organisatie of provider niet actief;
- platformkwalificatie ontbreekt, is verlopen of geschorst;
- verplichte capability of beroepskwalificatie ontbreekt of is verlopen;
- opdrachtspecifiek verplicht certificaat of verzekering ontbreekt;
- opdrachtlocatie valt buiten een geldig werkgebied en remote is niet toegestaan;
- startdatum valt aantoonbaar buiten actuele capaciteit;
- actieve juridische, veiligheids- of platformblokkade;
- expliciete belangenconflict- of uitsluitingsregel.

Een ontbrekend niet-verplicht gegeven is geen impliciete knock-out. Iedere knock-out rapporteert regel-ID, criteriumversie en feitbron.

### 13.3 Scoregegevens

Pas Module 6A.1 bepaalt de formule. Potentieel scorebare gegevens zijn beperkt tot vooraf genormaliseerde en vergelijkbare factoren:

- mate van capability-aansluiting boven het minimum;
- aantoonbare relevante sectorervaring;
- regionale/leveringsfit;
- tijdige en passende capaciteit;
- aanvullende geverifieerde competenties die de opdracht expliciet waardeert;
- later eventueel betrouwbare historische indicatoren met voldoende steekproef.

Een score mag nooit worden verhoogd door betaling, pakket, credits, advertentiebudget, profieltekst, aantal uploads of snelheid van onboarding.

### 13.4 Uitlegbaarheidsrapport

Per beoordeelde provider bevat het rapport minimaal:

- gebruikte assignment- en provider-snapshotversie;
- datum/tijd en Decision Engine-versie;
- toegepaste knock-outregels en uitkomst;
- scorefactoren, gewichten, genormaliseerde waarden en bijdrage;
- ontbrekende of verouderde gegevens en hun behandeling;
- verificatieniveau en bronklasse van ieder gebruikt feit;
- handmatige override met actor, reden en vier-ogenbesluit waar vereist;
- duidelijke scheiding tussen feiten, regels en uiteindelijke rangschikking.

### 13.5 Verboden gegevens

De engine mag niet lezen of gebruiken:

- namen, e-mailadressen, telefoonnummers of privéadressen van professionals;
- documentbestanden, scans, handtekeningen of volledige registratienummers;
- bijzondere persoonsgegevens of gegevens waarvoor geen expliciete noodzaak en grondslag bestaat;
- wachtwoorden, tokens, secrets, sessies of technische securitymetadata;
- vrije marketingtekst als verborgen selectiecriterium;
- commerciële pakketten, creditsaldo, betaalstatus of omzet voor inhoudelijke ranking;
- beschermde kenmerken of evident discriminerende proxies;
- klachten of incidenten zonder vastgestelde status, hoor en wederhoor en correctiemogelijkheid;
- ongeverifieerde claims alsof deze geverifieerd zijn;
- persoonsgegevens uit logs of supportnotities;
- data van andere tenants buiten de expliciet geanonimiseerde en goedgekeurde benchmarkmethodiek.

## 14. Audit, historie en concurrency

- Dossiermutaties leggen actor, tenant, doelrecord, revisie, veldcategorie en tijdstip vast zonder gevoelige inhoud in generieke logs te dupliceren.
- Reviewcases verwijzen naar een immutable dossiercandidate.
- Een kwalificatiebesluit bevat criteria-versie, uitkomst, redencodes, reviewer en geldigheid.
- Herbeoordeling maakt een nieuw besluit en overschrijft het vorige niet.
- Gelijktijdig opslaan gebruikt een verwachte revisie; een conflict geeft een veilige, herstelbare melding.
- Kritieke statusovergangen gebruiken één transactie voor status, besluit en audit.
- Automatisch verval is een expliciete systeemgebeurtenis en geen stille databaseafleiding zonder historie.
- Handmatige overrides zijn tijdelijk, gemotiveerd, gelimiteerd en nooit een manier om ontbrekend bewijs permanent te negeren.

## 15. Geaccepteerde productbesluiten

De product owner heeft op 14 juli 2026 besloten dat:

- platformkwalificatie, beroepskwalificatie, readiness, selecteerbaarheid en historische prestaties afzonderlijke begrippen blijven;
- alleen organisatie-`OWNER` en organisatie-`ADMIN` juridische en complianceverklaringen mogen indienen of wijzigen;
- zelfverklaarde gegevens nooit automatisch als geverifieerd gelden;
- diensten, specialismen, sectoren, regio’s en kwalificaties centrale, versieerbare taxonomieën gebruiken;
- werkgebied in versie 1 bestaat uit Nederlandse provincies, `LANDELIJK` en `REMOTE`;
- capaciteit in versie 1 bestaat uit acceptatie van nieuwe opdrachten, vroegste startdatum, globale capaciteit en laatste bevestigingsdatum;
- capaciteit maximaal 30 dagen actueel blijft;
- de labels **Zelf verklaard**, **Document gecontroleerd** en **Geverifieerd** worden gebruikt;
- `Premium Verified` niet wordt gebruikt;
- verificatie geen commerciële betekenis of automatische scoreverhoging heeft;
- bestaande providerdata behouden blijft, maar zelfverklaard en geen automatisch gevalideerde selectiebron is;
- een provider alleen selecteerbaar is met complete en actuele verplichte kwalificatie-, capability-, regio-, capaciteit- en compliancegegevens;
- bewijsdocumenten veilig, versieerbaar en niet-publiek worden opgeslagen;
- correctie en herbeoordeling een nieuw immutable kwalificatiebesluit schrijven;
- historische prestaties niet in Decision Engine v1 worden gebruikt;
- de Decision Engine alleen een minimale, gevalideerde en versieerbare providerprojectie leest;
- vrije marketingtekst, persoonsgegevens, bewijsdocumenten, credits en betaalstatus de selectie niet beïnvloeden.

### Open productie- en AVG-besluiten

- productieobject-storageprovider, datalocatie, encryptie, back-up en hersteldoelen;
- wettelijke grondslag en minimale set persoonsgegevens voor professionals en reviewers;
- bewaartermijnen, verwijdering, anonimisering en eventuele legal hold per document- en besliscategorie;
- toegangslogging, incidentrespons en periodieke rechtenreview voor bewijsdocumenten;
- definitieve juridische verklaringen, polisvereisten en voorwaardenversies;
- export-, inzage-, correctie- en bezwaarproces voor betrokkenen en providerorganisaties.

## 16. Risico’s en beheersing

| Risico | Gevolg | Ontwerpmaatregel |
| --- | --- | --- |
| Zelfverklaarde gegevens lijken geverifieerd | Misleidende selectie | Bron en verificatiestatus per beslisfeit |
| Verlopen bewijs blijft meetellen | Onbevoegde kandidaat | Geldigheid, `STALE`, automatische herbeoordeling en knock-out |
| Organisatie- en persoonskwalificatie lopen door elkaar | Onjuiste bevoegdheidsclaim | Afzonderlijke entiteiten en scope |
| Readiness wordt een kwaliteitsscore | Misleiding en gaming | Alleen status met concrete ontbrekende onderdelen |
| Commerciële beïnvloeding | Oneerlijke rangschikking | Technische en beleidsmatige scheiding |
| Te veel persoonsgegevens | Privacy- en beveiligingsrisico | Dataminimalisatie en engineprojectie zonder identiteit |
| Reviewbesluit verliest context | Niet uitlegbaar | Immutable dossiercandidate en criteria-versie |
| Nieuwe aanbieders worden benadeeld | Markttoegang en bias | Ontbrekende historie niet negatief scoren |
| Capaciteit veroudert snel | Onrealistische selectie | Korte geldigheid en zichtbare actualiteitsstatus |
| Handmatige override omzeilt beleid | Integriteitsverlies | Reden, expiratie, audit en vier-ogenregel |

## 17. Acceptatiecriteria voor Module 6A.0

Module 6A.0 is product-ownergeaccepteerd. De acceptatie bevestigt dat:

- lifecycle, statussen en overgangsverantwoordelijkheden begrijpelijk zijn;
- platformkwalificatie, beroepskwalificatie, readiness, selecteerbaarheid en historie aantoonbaar gescheiden zijn;
- alle acht dossiers een eigenaar, bron-, verificatie- en geldigheidsmodel hebben;
- organisatie- en persoonscompetenties niet worden vermengd;
- de toegestane, knock-out-, score-, rapportage- en verboden Decision Engine-data expliciet zijn;
- betaalstatus en vrije marketingtekst uitgesloten zijn van inhoudelijke ranking;
- privacy, documenttoegang, versiebeheer, audit en concurrency zijn ontworpen;
- database-impact als voorstel is beschreven zonder bestaande schema’s te wijzigen;
- open productie- en AVG-besluiten zichtbaar zijn en niet als gerealiseerd worden gepresenteerd;
- Module 6A.1 kan starten zonder matchinglogica vooruit te implementeren.

## 18. Gefaseerde vervolgstappen

1. **Module 6A.0 — Ontwerp providerkwalificatie:** afgerond en product-ownergeaccepteerd.
2. **Module 6A.1 — Ontwerp Decision Engine:** afgerond en product-ownergeaccepteerd.
3. **Module 6A.2 — Providerkwalificatie datamodel en services:** afgerond en product-ownergeaccepteerd.
4. **Module 6A.3 — Provider-onboardinginterface:** 6A.3.0 en 6A.3.1 geaccepteerd; 6A.3.2 technisch opgeleverd met product-owneracceptatie open; 6A.3.3 niet gestart.
5. **Module 6A.4 — Decision Engine datamodel en services:** nog niet gestart.
6. **Module 6A.5 — Selectie-interface en acceptatie:** nog niet gestart.

Providerkwalificatie en de Decision Engine zijn met de acceptatie van dit ontwerp nog niet geïmplementeerd.
