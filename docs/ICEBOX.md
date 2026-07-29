# Icebox WorkMatchr

## Doel

De Icebox bevat productideeën die mogelijk waardevol zijn, maar waarvoor nog geen goedgekeurde scope, prioriteit, planning of implementatiebesluit bestaat.

Een vermelding in dit document is:

- geen toezegging;
- geen roadmapstatus;
- geen architectuurbesluit;
- geen toestemming om implementatie te starten.

Een idee verlaat de Icebox pas na expliciete product-ownerprioritering. Daarna volgt, afhankelijk van de impact, eerst productonderzoek, een ontwerp, een ADR of een afzonderlijke moduleopdracht.

## AI en geautomatiseerde ondersteuning

- AI-gestuurde intake;
- automatische selectie of vertakking van vraagbomen;
- AI-ondersteuning bij het opstellen van opdrachten;
- AI-matching of semantische matching;
- verdere optimalisatie van de Advieswijzer buiten de huidige deterministische flow.

Voor deze ideeën blijven de Founding Principles leidend. Uitlegbaarheid, betrouwbare data, governance en menselijke verantwoordelijkheid gaan vóór automatisering.

## Publieke content en Product Intelligence

- contentbeheer of een KIP/CMS voor publieke kennis;
- Product Intelligence op basis van privacyveilige, geaggregeerde signalen;
- automatische bronmonitoring en redactionele hercontrole;
- een inhoudelijk volwaardige publieke route voor specialisten;
- uitbreiding van publieke onderwerpen, sectoren en beroepsgroepen na voldoende officiële bronanalyse.

Zoektelemetrie of gedragsanalyse wordt niet geactiveerd voordat privacy-, cookie-, retentie- en meetbesluiten zijn vastgesteld.

## Gebruikerservaring en kanalen

- mobiele WorkMatchr-app;
- agenda-integraties;
- sessiebeheer voor gebruikers;
- aanbiedersadvies over de kwaliteit en volledigheid van het dienstverlenersprofiel.

Deze ideeën mogen bestaande server-side autorisatie, tenantisolatie en auditgrenzen niet omzeilen.

## Identiteit en toegangscomfort

- MFA en passkeys;
- social login.

Deze opties worden alleen heroverwogen na een afzonderlijke security- en privacybeoordeling. Better Auth blijft de centrale authenticatiebron.

## Integraties en ecosysteem

- externe API-koppelingen;
- koppelingen met agenda- of planningssystemen;
- toekomstige export- en integratiekanalen voor organisaties.

Voor iedere koppeling moeten doelbinding, minimale gegevensuitwisseling, autorisatie, audit, beschikbaarheid en leveranciersrisico vooraf zijn vastgesteld.

## Marktuitbreiding

- uitbreiding naar België;
- uitbreiding naar Duitsland.

Marktuitbreiding vereist afzonderlijk onderzoek naar wetgeving, terminologie, taxonomie, lokalisatie, dienstverlening en operationele verantwoordelijkheid.

## Vertrouwen, reputatie en kwaliteit

- reviews van dienstverlening;
- aanvullende feedbackmechanismen;
- aanbiedersadvies over profielkwaliteit.

Reviews of prestaties mogen niet zonder expliciet fairness-, bezwaar-, verificatie- en governancebesluit de kwalificatie of selectie beïnvloeden.

## Bewust niet in de Icebox

De volgende onderwerpen zijn geen vrijblijvende ideeën en blijven daarom in hun bestaande register:

- geplande of lopende modules: [Roadmap](03-roadmap.md);
- technisch noodzakelijke verbeteringen: [Technical debt](technical-debt.md);
- bekende bedreigingen en beheersmaatregelen: [Bekende risico’s](known-risks.md);
- genomen of voorgestelde architectuurbesluiten: [ADR’s](adr/);
- accountverwijdering, retentie en purge: afzonderlijke lifecycle- en productievoorbereiding;
- credits kopen, Mollie, facturatie en refunds: afzonderlijke toekomstige betaalmodule;
- productieopslag, monitoring, back-ups en outboxworkers: productievoorbereiding.

## Bron en onderhoud

Deze eerste versie consolideert de expliciet geparkeerde ideeën uit:

- [Bekende ideeën](known-ideas.md);
- [Roadmap](03-roadmap.md);
- [Voortgang](05-voortgang.md);
- [Technical debt](technical-debt.md);
- [Module 6C — Platformbeheer](module-6c-platformbeheer.md).

Bij toevoeging van een idee worden minimaal categorie, aanleiding en eventuele randvoorwaarden vastgelegd. Afgeronde, afgewezen of geprioriteerde ideeën worden niet stilzwijgend verwijderd, maar met een verwijzing naar het opvolgende besluit of document verplaatst.
