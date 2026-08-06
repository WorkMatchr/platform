# Knowledge Engine

De WorkMatchr Knowledge Engine is een gecontroleerde kennislaag, geen documentenbibliotheek. De keten is:

`bron → bronversie → kort intern fragment → kandidaat-claim → risicogestuurde broncontrole → validatie → publicatiebesluit → toepassing`.

Een PDF is bronmateriaal. Extractie bewijst niet dat inhoud actueel, juist of juridisch toepasbaar is. Alleen `PUBLISHED` én `VALIDATED` kennis kan standaard door toepassingen worden gevonden. Platformbeheerders beheren broncontrole via `/platformbeheer/kennisbank`; bestaande technische detailroutes onder `/beoordelingen` blijven om koppelingen niet te breken.

De eerste PoC gebruikt AI-01 tot en met AI-05. Deze oude publicaties zijn historisch, auteursrechtelijk beperkt en uitsluitend intern. Claims, eerdere taken en auditgeschiedenis blijven behouden, maar generieke historische taken vormen geen actieve werkvoorraad. De Knowledge Control-uitbreiding maakt niets automatisch gevalideerd of gepubliceerd.

## Knowledge Control

De workflow richt zich op bronnen, actualiteit, consistentie, conflicten, risico en uitzonderingen. Automatische verwerking is standaard. Menselijke aandacht ontstaat alleen bij een concrete uitzondering, voorgenomen publicatie van onvoldoende onderbouwde of hoog-risicokennis, of actief gebruik in situatieadvies. “Broncontrole afgerond” is nooit een advies over een concrete situatie en nooit een impliciet publicatiebesluit.

Professionals kunnen uitsluitend bij bestaande gepubliceerde, gevalideerde kennis een inhoudelijke verbetering melden. Zo’n melding muteert de claim niet en heropent gericht de broncontrole. Algemene vakinformatie gebruikt de vaste contexttekst uit ADR-023 en blijft afgeschermd zolang zij niet afzonderlijk is gepubliceerd.

Zie [ADR-023](adr/ADR-023-gevalideerde-knowledge-engine.md), [kennismodel](knowledge-model.md), [import](knowledge-import.md) en [controle en validatie](knowledge-validation.md).
