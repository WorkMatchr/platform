# ADR-003 — Better Auth en platformrollen

- **Status:** geaccepteerd voor technische test van Module 4A
- **Datum:** 12 juli 2026

## Context

WorkMatchr heeft veilige persoonlijke accounts nodig zonder het bestaande zakelijke `User`-model en zijn relaties te dupliceren of te beschadigen.

## Besluit

- Better Auth 1.6.23 verzorgt e-mail/wachtwoordauthenticatie.
- De officiële Prisma-adapter gebruikt PostgreSQL en databasegebaseerde sessies.
- Het bestaande `User` blijft de enige gebruikersbron; Better Auth `name` is gemapt op `displayName`.
- `Session`, `Account`, `Verification` en `RateLimit` zijn afzonderlijke authmodellen.
- E-mailverificatie is verplicht; wachtwoorden zijn minimaal 12 tekens.
- Resend is voorbereid als productieprovider; lokale consolemail is uitsluitend development-only.
- Autorisatie vindt dicht bij server-side gegevensgebruik plaats.
- Alleen platformrollen `USER` en `ADMIN` vallen binnen Module 4A.
- Organisatieautorisatie, social login, MFA en passkeys vallen buiten deze module.

## Alternatieven

- Auth.js: volwassen, maar Better Auth biedt hier een directere geïntegreerde e-mail/wachtwoord-, verificatie-, reset- en database-rate-limitfundering.
- Clerk en Supabase Auth: beheerde diensten met extra leveranciersafhankelijkheid en een lastiger gedeeld bestaand User-model.
- Zelfbouw: afgewezen vanwege risico’s rond hashing, cookies, tokens, CSRF en sessierotatie.

## Gevolgen

Authschemawijzigingen lopen via Prisma-migraties. Productie vereist een sterk geheim, Resend-configuratie, trusted-origin/proxycontrole en monitoring. Statuswijzigingen moeten later via centrale services alle sessies direct kunnen intrekken; Module 4A borgt dit bij sessieaanmaak en ieder beveiligd servergebruik.
