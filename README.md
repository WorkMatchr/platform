# WorkMatchr

WorkMatchr wordt een volledig onafhankelijk platform dat organisaties koppelt aan passende arbo- en veiligheidsspecialisten. Per opdracht worden maximaal drie aanbieders objectief geselecteerd; betaalde voorkeursposities bestaan niet.

Module 1, **Module 2A: design system en huisstijl** en **Module 2B: publieke homepage** zijn afgerond. Module 3: database en datamodel is de volgende module. Authenticatie, betalingen, matching en andere bedrijfsfunctionaliteit worden pas in latere modules toegevoegd.

## Vereisten

- Node.js 24 LTS
- npm 11 of nieuwer

## Installeren

```bash
npm install
```

## Lokaal starten

```bash
npm run dev
```

Open daarna [http://localhost:3001](http://localhost:3001). Start WorkMatchr expliciet op deze poort met `npm run dev -- --port 3001`; poort 3000 wordt gebruikt door een ander project.

## Kwaliteitscontroles

```bash
npm run lint
npm run typecheck
npm run build
```

## Projectstructuur

```text
src/
  app/                 # App Router, metadata en globale stijlen
  components/
    layout/            # Herbruikbare layoutcomponenten
    ui/                # Herbruikbare interfacecomponenten
  lib/                 # Gedeelde technische hulpfuncties (wanneer nodig)
  types/               # Gedeelde TypeScript-typen (wanneer nodig)
docs/                  # Product-, architectuur- en voortgangsdocumentatie
```

Lees [docs/README.md](docs/README.md) voor de documentatie-index, [PROJECT_PRINCIPLES.md](PROJECT_PRINCIPLES.md) voor de projectprincipes en [AGENTS.md](AGENTS.md) voor de werkafspraken voor Codex.

## Status

Module 2A en Module 2B zijn handmatig goedgekeurd en afgerond. De actuele status staat in [docs/05-voortgang.md](docs/05-voortgang.md).
