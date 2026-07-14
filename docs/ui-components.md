# UI-componenten

Alle componenten staan in `src/components`. Gebruik eerst deze componenten voordat nieuwe lokale stijlen worden toegevoegd.

## Layout

### `Container`

Beheert maximale breedte en responsieve zijmarges. Ondersteunt `size="default"` en `size="narrow"`.

### `Section`

Combineert semantische `<section>`-markup met `Container`. Ondersteunt standaard en compacte verticale spacing.

## Interactie

### `Button`

Varianten: `primary`, `secondary`, `outline` en `ghost`. Ondersteunt `disabled` en `loading`; loading maakt de knop niet-interactief en zet `aria-busy`.

### `LinkButton`

Dezelfde vier visuele varianten als `Button`, bedoeld voor navigatie. Gebruik geen disabled-variant voor links; toon de link niet wanneer navigatie niet beschikbaar is.

## Inhoud

### `Card`

Varianten: `default`, `subtle` en `dark`.

### `Badge`

Varianten: `brand`, `success` en `neutral`. Een Badge is ondersteunende tekst en mag niet uitsluitend door kleur betekenis overbrengen.

### `Heading`

Semantisch element en visuele grootte zijn los instelbaar. Beschikbare groottes: `display`, `h1`, `h2` en `h3`.

### `Text`

Beschikbare groottes: `sm`, `default` en `lg`.

### `IconContainer`

Eenvoudige decoratieve container voor een icoon, nummer of symbool. De container is standaard verborgen voor toegankelijkheidstechnologie; betekenisvolle tekst hoort elders te staan.

### `VisuallyHidden`

Verbergt aanvullende toegankelijke tekst visueel zonder deze uit de accessibility tree te verwijderen.

### Procesvisual

`ProcessVisual` is een originele lokale SVG-component die de route van hulpvraag via vraagverheldering naar maximaal drie specialisten toont. De visual is decoratief (`aria-hidden`) omdat dezelfde informatie in de omliggende tekst staat.

### Demonstratieve intake

De homepage gebruikt een native, gelabelde `textarea` als expliciete voorbeeldinvoer. Deze voorbeeldtekst wordt bewust niet via queryparameters of cookies naar de beveiligde flow meegenomen. De CTA verwijst naar `/hulpvragen/nieuw`, waar na authenticatie de functionele intake start.

### Intakecomponenten

Componenten in `src/components/intakes` leveren overzichtskaarten, status, voortgang, startformulier, dynamische vraagvelden, stapformulier en controlesamenvatting. Alleen formulieren met `useActionState` zijn clientcomponenten; overige intakeweergave blijft server-side. Alle dynamische velden hebben labels, helptekst, foutkoppeling en toetsenbordbediening.

### Opdrachten

Componenten in `src/components/assignments` leveren de centrale statusbadge, overzichtskaarten, opdrachtdetail, het expliciete indienformulier, het bewerkformulier en statusacties. Alleen formulieren zijn clientcomponenten voor `useActionState`, foutfocus, waardebehoud en pendingstatus; lijst, detail en succesweergave blijven server-rendered. Statuslabels komen uitsluitend uit `assignment-presentation.ts`. De UI toont geen UUID’s of enumwaarden en bevat bewust geen publicatie- of matchingknoppen.

## Richtlijnen

- Gebruik semantische componenten en correcte headingniveaus.
- Voeg geen willekeurige hex-codes toe aan componenten.
- Behoud een klikoppervlak van minimaal circa 44 × 44 pixels.
- Vertrouw niet uitsluitend op kleur om status of betekenis over te brengen.
- Maak alleen een clientcomponent wanneer interactie of een browser-API dit vereist.
