# Providerkwalificatie v1

## Bronnen en uitkomst

Zelfverklaarde feiten, verificatie, platformkwalificatie, capabilitykwalificatie, readiness, selecteerbaarheid en Trusted Provider Projection blijven afzonderlijk. Positieve besluiten vereisen actuele configuratie, vier ogen en geldige bronversies. Verlopen kwalificaties vallen buiten de geldige basis en maken de provider fail-closed niet-selecteerbaar voor de betreffende dienst.

De selectielaag leest alleen een actuele, niet-geïnvalideerde `TrustedProviderProjection`. Deze bevat gecontroleerde capabilities, sectoren en werkgebieden, maar geen persoonsgegevens, bewijsbytes, marketingtekst, credits, betaling, capaciteit of historische prestaties.

Voor M7B.2 bevat een capability naast de dienst waar beschikbaar de
concrete vakdiscipline als `specialismCode`. De SPECIALISM-taxonomie v2
voegt `ergonoom`, `arbeids-en-organisatiedeskundige`, `asbest` en
`milieudeskundige` toe. Zelfverklaarde profieltekst of een functietitel
levert nooit automatisch een projectie of eligibility op.

## Dienstbesluiten en eigendom

Elk besluit over een dienst controleert in dezelfde serialiseerbare transactie of die dienst bij het beoordeelde profiel hoort. Een ontbrekende of vreemde dienst geeft dezelfde afwijzing vóór het opslaan van het besluit, het verhogen van de profielversie en het intrekken van de projectie. Kwalificatie en herstel vereisen een actieve dienst met de bestaande inhoudelijke bewijsbasis. Een negatief besluit over een eigen gearchiveerde dienst blijft mogelijk en maakt die dienst nooit actief.

De bestaande afzonderlijke foreign keys controleren of beide records bestaan. Een samengestelde foreign key zou ook toekomstige rechtstreekse database-invoer kunnen beschermen. Dat vraagt een unieke samengestelde sleutel, controle van historische koppelingen en een afzonderlijke migratie. Deze servicereparatie werkt op de bestaande 85 migraties.
