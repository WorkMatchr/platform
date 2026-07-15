# WorkMatchr

WorkMatchr wordt een volledig onafhankelijk platform dat organisaties koppelt aan passende arbo- en veiligheidsspecialisten. Per opdracht worden maximaal drie aanbieders objectief geselecteerd; betaalde voorkeursposities bestaan niet.

Module 1 tot en met Module 4B zijn afgerond. Module 5C is afgerond en product-ownergeaccepteerd; Module 5A en Module 5B.2 houden hun afzonderlijke acceptatiestatus. Module 6A.0, Module 6A.1 en Module 6A.2 zijn afgerond en product-ownergeaccepteerd. Module 6A.3 is de volgende module en is nog niet gestart; de Decision Engine, matching, uitnodigingen, credits en Mollie zijn nog niet geïmplementeerd.

## Vereisten

- Node.js 24 LTS
- npm 11 of nieuwer
- Docker Desktop of een compatibele Docker Compose-omgeving

## Installeren

```bash
npm install
Copy-Item .env.example .env
docker compose up -d
npm run db:deploy
npm run db:seed
```

Vul voor authenticatie lokaal minimaal `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` en `NEXT_PUBLIC_APP_URL` in. Zonder Resend-configuratie worden verificatie- en resetlinks uitsluitend buiten productie als development-only naar de serverterminal geschreven. Gebruik in productie altijd een sterk willekeurig geheim en een afzonderlijke WorkMatchr-Resendconfiguratie.

`ORGANIZATION_LOGO_STORAGE=local` is uitsluitend voor lokale ontwikkeling. Productie weigert logo-opslag veilig totdat een object-storageprovider is geïmplementeerd.

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
npm test
npm audit
```

## Databasecommando's

```bash
npm run db:format
npm run db:validate
npm run db:generate
npm run db:migrate
npm run db:deploy
npm run db:seed
npm run db:studio
```

`npm run db:reset` verwijdert alle gegevens uit de ingestelde database en is uitsluitend bedoeld voor een expliciet gekozen lokale ontwikkelomgeving. Controleer vóór ieder migratie- of resetcommando altijd `DATABASE_URL`.

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
prisma/                # Datamodel, migraties en idempotente seed
docker-compose.yml     # Lokale PostgreSQL 17-omgeving
```

Lees [docs/README.md](docs/README.md) voor de documentatie-index, [PROJECT_PRINCIPLES.md](PROJECT_PRINCIPLES.md) voor de projectprincipes en [AGENTS.md](AGENTS.md) voor de werkafspraken voor Codex.

## Status

Module 1 tot en met Module 4B zijn afgerond. Module 5C is volledig afgerond en product-ownergeaccepteerd; Module 5A en Module 5B.2 houden hun afzonderlijke acceptatiestatus. Module 6A.0 — Ontwerp providerkwalificatie, Module 6A.1 — Ontwerp Decision Engine en Module 6A.2 — Providerkwalificatie datamodel en services zijn afgerond en product-ownergeaccepteerd. Module 6A.3 — Provider-onboardinginterface is de volgende module en is nog niet gestart; Module 6A.4 en Module 6A.5 zijn eveneens niet gestart. De actuele status staat in [docs/05-voortgang.md](docs/05-voortgang.md).
