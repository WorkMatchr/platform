# Zoeken in publieke kennis v1

## Scope

De client-side zoekfunctie op `/kenniscentrum` doorzoekt uitsluitend live typed detailcontent: kennis, diensten, wettelijke verplichtingen en sectoren. Tools, overzichten, private routes en noindex-content zijn uitgesloten.

## Ranking

De centrale pure functie normaliseert hoofdletters en diakritische tekens en vereist bij meerdere woorden dat ieder woord ergens in titel, aliases, samenvatting of contenttype voorkomt. Ranking is transparant:

1. exacte titel;
2. titel bevat de volledige zoekterm;
3. alias of zoekterm;
4. samenvatting;
5. contenttype;
6. overige volledige woorddekking.

Gelijke scores worden stabiel alfabetisch gesorteerd. Er is geen fuzzy search, AI, externe dienst of database.

## Interface en URL-state

Het zoekformulier heeft een zichtbaar label, native zoekveld, submitknop, typefilters met `aria-pressed`, live resultaataantal, semantische resultatenlijst, reset en eerlijke nulresultaatmelding. Query en filter staan in `?q=` en `?type=`; queryvarianten komen niet in de sitemap.

Zonder query of filter blijven uitgelichte kennisartikelen en categorieën zichtbaar. Terug- en vooruitnavigatie herstellen de URL-state.
