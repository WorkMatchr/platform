# RI&E-kenniscluster — Module P1.3

**Status:** technisch opgeleverd; product-owneracceptatie open.
**Inhoudelijk gecontroleerd:** 19 juli 2026.

## Routes

- `/kenniscentrum/moet-ik-een-rie-hebben`: vraaggestuurde publieksuitleg;
- `/diensten/rie`: uitleg over mogelijke deskundige ondersteuning;
- `/wettelijke-verplichtingen/rie`: algemene wettelijke context.

## Content- en bronnenmodel

De compile-time typeveilige content staat onder `src/content/knowledge/`. Een document bevat een stabiel ID, type, slug, titel, samenvatting, publicatiestatus, controledatum, secties, gerelateerde onderwerpen, CTA’s en bronnen. Een bron bevat bronsoort, bronhouder, locatie, bewijsniveau en validatiestatus.

De drie inhoudstypen zijn bewust gescheiden:

1. `EXPLANATION`: begrijpelijk antwoord op een bezoekersvraag;
2. `LEGAL_OBLIGATION`: algemene wettelijke context zonder individuele conclusie;
3. `SERVICE`: uitleg over mogelijke ondersteuning en verantwoordelijkheden.

Dit is een migreerbare eerste basis, geen databasegestuurd contentmodel en geen volledige Validation Engine.

## Gebruikte bronnen

- Arbeidsomstandighedenwet, artikel 5 — primaire wettelijke norm voor RI&E, plan van aanpak en actualisatie;
- Nederlandse Arbeidsinspectie — officiële uitleg over inhoud, toezicht en hoofdlijnen van toetsing;
- Rijksoverheid — officiële publieksuitleg over werkgeverschap, personeel en het plan van aanpak.

De inhoud parafraseert de bronnen en neemt geen lange citaten over. Toetsingsuitzonderingen worden conditioneel beschreven, omdat personeelsomvang, branche en het gebruikte instrument de uitkomst beïnvloeden.

## Redactionele waarborgen

- geen individueel juridisch advies;
- geen absolute conclusie zonder organisatiecontext;
- geen populariteits-, trend-, prijs- of premiumclaims;
- bronlinks openen herkenbaar extern;
- publicatiestatus, bewijsniveau, validatiestatus en controledatum zijn zichtbaar;
- werkgeversverantwoordelijkheid blijft expliciet;
- WorkMatchr presenteert zich niet als uitvoerder van iedere RI&E.

## Buiten scope

Prisma, CMS, AI, Product Intelligence, automatische bronmonitoring, FAQ-schema en een generieke Knowledge Graph zijn niet toegevoegd.

## Relationele laag P1.7

P1.7 koppelt de drie RI&E-routes via stabiele content-ID’s aan elkaar en aan de Advieswijzer. De kennisroute leidt primair naar wettelijke context, de verplichtingenroute naar praktische uitleg en de dienstroute naar begeleide vraagverheldering. Iedere pagina toont daarnaast maximaal één aanvullend inhoudelijk item. Zelfverwijzingen, duplicaten, private routes en niet-indexeerbare content worden fail closed geweigerd.

De pagina’s houden hun oorspronkelijke inhoudelijke rol en bronnen. P1.7 voegt geen automatische keywordlinks, nieuwe RI&E-inhoud, structured data, CMS of dynamische routegeneratie toe.
