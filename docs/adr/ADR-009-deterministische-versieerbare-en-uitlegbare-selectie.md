# ADR-009 — Deterministische, versieerbare en uitlegbare selectie

## Status

Geaccepteerd door de product owner op 14 juli 2026.

## Datum

14 juli 2026.

## Context

WorkMatchr selecteert per gepubliceerde opdracht maximaal drie geschikte providers. De selectie moet later kunnen worden gereconstrueerd zonder veranderlijke providerprofielen, verborgen scores, AI, commerciële invloed of handmatige vervanging. ADR-008 bepaalt dat de Decision Engine alleen een minimale, gevalideerde en versieerbare providerprojectie mag lezen en dat kwalificatieconcepten gescheiden blijven.

## Besluit

1. Decision Engine v1 is volledig deterministisch en gebruikt geen AI, embeddings of semantische black box.
2. Een selectie gebruikt exact één immutable opdrachtsnapshot, één immutable providerprojectie per kandidaat, één engineversie en één gepubliceerde wegingsmodelversie.
3. Kandidaatverzameling, knock-outfase, scoring, tie-break en top-driemarkering zijn afzonderlijke, opeenvolgende fasen.
4. Knock-outcriteria zijn binair, geven geen punten en bewaren gestandaardiseerde redenen en bronfeiten.
5. Scoring gebruikt alleen expliciet geactiveerde criteria en integerberekeningen. Teller, noemer, punten en exacte genormaliseerde score worden bewaard.
6. Historische prestaties, vrije marketingtekst, persoonsgegevens, bewijsdocumenten, credits en betaalstatus beïnvloeden v1 niet.
7. Verificatielabels blijven zichtbaar, maar een sterker label geeft niet automatisch meer punten wanneer het criteriumminimum al is gehaald.
8. Rangschikking is aflopend op exacte score, gevolgd door een gepubliceerde lexicografische tie-breakketen en als laatste een reproduceerbare gelijke-kanshash.
9. De volledige interne rangorde wordt bewaard; maximaal drie kandidaten krijgen `selected = true`. Reservekandidaten worden niet automatisch geactiveerd.
10. Iedere afgeronde ronde krijgt een immutable Decision Report met inputversies, regels, uitkomsten, scores, rang, tie-breakers, checksums en auditcontext.
11. Een afgeronde ronde wordt nooit aangepast. Correctie of nieuwe brondata vereist een expliciet gekoppelde nieuwe ronde.
12. Selectie activeert geen uitnodiging, providerrecht, credits, betaling, offerte of notificatie.
13. Maximaal drie geselecteerden, één resultaat per ronde/provider, modelimmutability en append-only historie worden databasebreed ondersteund.
14. De uitvoering gebruikt een crash-safe freeze- en finalisatiegrens; gedeeltelijke resultaten worden nooit als afgerond zichtbaar.
15. Selectie start niet automatisch na publicatie. Alleen een bevoegde organisatie-`OWNER` of organisatie-`ADMIN` start selectie expliciet voor een `OPEN`-opdracht.
16. Bij drie, twee, één of nul geschikte providers worden respectievelijk drie, twee, één of nul providers geselecteerd. Er vindt geen kunstmatige aanvulling plaats.
17. De volledige interne rangorde mag worden bewaard, maar reservekandidaten worden niet automatisch geactiveerd. Een vervolgselectie vereist een expliciete nieuwe actie.
18. De opdrachtgever ziet kwalitatieve uitleg, geschiktheidsredenen en relevante criteria, maar geen exacte interne puntenscores, volledige ranglijst of concurrentinformatie.
19. Iedere run bevat een versieerbare interne Confidence Check. Deze geeft context over kandidaatvolume, datacompleetheid en uitzonderingen, maar beïnvloedt selectie, score en rang niet.
20. `Explainability before Score` geldt als ontwerpprincipe: WorkMatchr communiceert eerst waarom een provider geschikt is en niet primair de interne berekening.
21. De v1-gewichten zijn capabilities 40%, sectorfit 25%, leveringsvoorkeur 15%, gewenste start 10% en aanvullende kwalificaties 10%. Wijzigingen vereisen een nieuwe modelversie.
22. De minimumscore is 60% van uitsluitend de actieve criteria.
23. Tie-breakers zijn achtereenvolgens aanvullende capabilityscore, sectorfit, gewenste startscore, leveringsvoorkeurscore en een reproduceerbare cryptografische hash.
24. Betaling, credits, bedrijfsgrootte, historische prestaties en commerciële status beïnvloeden tie-breakers niet. Historische prestaties blijven volledig buiten Decision Engine v1.

## Gevolgen

Positief:

- iedere uitkomst is reproduceerbaar en auditbaar;
- harde eisen kunnen niet worden gemaskeerd door punten;
- latere profiel- of modelwijzigingen veranderen oude selecties niet;
- commerciële en persoonsdata blijven buiten de selectielaag;
- nieuwe providers worden niet door ontbrekende historie benadeeld;
- uitnodigingen en credits blijven afzonderlijke domeinen.

Nadelig of kostbaar:

- provider- en opdrachtsprojecties, modelbeheer en meerdere historietabellen zijn nodig;
- foutcorrectie vereist een nieuwe ronde in plaats van een recordedit;
- taxonomie-, criteria- en checksumbeheer verhogen implementatie- en beheerlast;
- fairness- en distributiemonitoring zijn vóór marktintroductie nodig;
- Confidence-drempels, bewijsminima, modelactivatie en juridische/AVG-uitwerking vereisen nog implementatie- of marktbesluiten.

## Alternatieven

### Eén berekende score in `AssignmentProviderSelection`

Afgewezen omdat bronversies, uitgesloten kandidaten, knock-outs, modelversie en volledige rangorde ontbreken.

### Knock-outs als score nul

Afgewezen omdat een harde wettelijke of operationele uitsluiting dan niet helder te onderscheiden is van een zwakke voorkeurmatch.

### Actuele providerprofielen opnieuw lezen

Afgewezen omdat een oude selectie na profielwijziging niet meer reproduceerbaar is.

### AI- of embeddingmatching

Afgewezen voor v1 vanwege gebrek aan deterministische uitlegbaarheid, versieerbaarheid en toetsbare criteriagrenzen.

### Handmatige top drie

Afgewezen als normale route omdat willekeur, commerciële beïnvloeding en niet-reproduceerbare vervanging kunnen ontstaan.

### Automatische uitnodiging na selectie

Afgewezen binnen 6A omdat toegang, berichten, reacties, credits en herstel afzonderlijke contracten vereisen.

## Resterende open implementatie- en marktbesluiten

- definitieve knock-outset en capabilityspecifieke bewijsminima;
- exacte Confidence Check-drempels en redenencodes;
- modelactivatie en vier-ogenbeheer;
- juridische kwalificatie, bewaartermijnen en bezwaarproces.

## Gerelateerde documentatie

- [Module 6A.1 — Decision Engine v1](../module-6a-decision-engine-ontwerp.md)
- [Module 6A.0 — Providerkwalificatie en onboarding](../module-6a0-providerkwalificatie-ontwerp.md)
- [ADR-008 — Providerkwalificatie als fundament voor selectie](ADR-008-providerkwalificatie-als-fundament-voor-selectie.md)
- [ADR-007 — Gecontroleerde opdrachtpublicatie](ADR-007-gecontroleerde-opdrachtpublicatie.md)

ADR-009 is geaccepteerd. De genoemde open punten wijzigen de architectuurkeuze niet, maar moeten vóór de betreffende implementatie of marktintroductie worden afgerond.
