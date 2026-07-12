# Design system WorkMatchr

## Doel

Het design system vormt één visuele en technische basis voor de publieke website en toekomstige applicatieonderdelen. De stijl is licht, rustig, professioneel, toegankelijk en betrouwbaar. Minimaal ongeveer 75% van een publieke pagina hoort uit witte of zeer lichtblauwe oppervlakken te bestaan. Donkerblauw is bedoeld voor tekst, navigatie en kleine contrastaccenten, niet voor opeenvolgende grote secties.

## Design-tokens

De tokens staan centraal in `src/app/globals.css` en zijn via Tailwind CSS beschikbaar. Componenten gebruiken semantische namen in plaats van losse kleurcodes.

### Kleuren

| Token | Waarde | Gebruik |
| --- | --- | --- |
| `brand-primary` | `#1479a6` | Primaire acties en merkaccenten |
| `brand-primary-hover` | `#0d5e80` | Hovertoestand van primaire acties |
| `brand-primary-subtle` | `#e7f5fb` | Subtiele merkvlakken |
| `brand-dark` | `#0b2942` | Navigatie en belangrijke contrastvlakken |
| `background` | `#f7fbfd` | Paginachtergrond |
| `surface` | `#ffffff` | Componentoppervlakken |
| `surface-subtle` | `#eef7fb` | Subtiele secties en kaarten |
| `text-primary` | `#102a3e` | Primaire tekst |
| `text-secondary` | `#496579` | Ondersteunende tekst |
| `text-on-dark` | `#ffffff` | Primaire tekst op donkere vlakken |
| `text-on-dark-muted` | `#d6e9f3` | Ondersteunende tekst op donkere vlakken |
| `border` | `#c8dce7` | Randen en scheidingen |
| `focus` | `#005fcc` | Zichtbare focusring |
| `success` | `#18794e` | Succes en onafhankelijkheid |
| `warning` | `#8a5a00` | Waarschuwingen |
| `error` | `#b42318` | Fouten |

`brand-primary` is tijdelijk. Vervang deze token na oplevering van het definitieve WorkMatchr-logo door de exacte logokleur en controleer daarna alle contrastcombinaties opnieuw.

## Typografie

- Systeemstack: Inter indien lokaal aanwezig, daarna Segoe UI en systeemfonts.
- Display: responsief van 40 tot 76 pixels.
- Heading 1: responsief van 36 tot 64 pixels.
- Heading 2: responsief van 28 tot 40 pixels.
- Heading 3: 20 pixels.
- Body: 16 pixels met 28 pixels regelhoogte.
- Grote bodytekst: 18 pixels met 32 pixels regelhoogte.
- Kleine tekst: 14 pixels met 24 pixels regelhoogte.
- Lopende tekst blijft bij voorkeur binnen circa 65–75 tekens per regel.

## Spacing en breedte

- Mobiele zijmarge: 20 pixels.
- Tablet zijmarge: 32 pixels.
- Desktop zijmarge: 40 pixels.
- Maximale contentbreedte: 1280 pixels.
- Smalle tekstcontainer: 896 pixels.
- Standaard sectieafstand: 80 pixels mobiel en 96 pixels vanaf `sm`.
- Compacte sectieafstand: 48 pixels mobiel en 64 pixels vanaf `sm`.

## Vormgeving

- Controls: radius 10 pixels.
- Cards: radius 16 pixels.
- Badges: volledige pill-radius.
- Schaduwen blijven licht en ondersteunen alleen de hiërarchie.
- Kaarten gebruiken bij voorkeur een rand of lichte achtergrond; schaduw is optioneel en subtiel.
- Focusring: 3 pixels met 3 pixels offset.
- Kleurtransities: 200 milliseconden.
- Tailwind-breakpoints blijven leidend; er zijn geen afwijkende breakpoints toegevoegd.
- Bij `prefers-reduced-motion: reduce` worden animaties en vloeiende scrollbewegingen beperkt.
- Kleurverlopen worden alleen gebruikt wanneer ze inhoudelijk of visueel noodzakelijk zijn.

## Merkrelatie

Het lichtblauw heeft een subtiele visuele relatie met Feenstra Safety Consulting. WorkMatchr blijft een volledig zelfstandig merk, met een eigen naam, productpositie en designsysteem.
