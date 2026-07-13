# Organisatieautorisatie WorkMatchr

## Centrale serverhelpers

- `getActiveOrganizationContext`: leest actieve memberships en valideert een eventuele organisatiekeuze;
- `requireOrganizationMembership`: vereist een actieve membership voor een niet-gearchiveerde organisatie;
- `requireOrganizationRole`: vereist één van de opgegeven organisatierollen;
- `requireManageableOrganization`: staat alleen `OWNER` en `ADMIN` toe bij een wijzigbare organisatie;
- `canManageOrganization`: pure beleidsfunctie voor hergebruik en regressietests.

## Regels

De gebruiker moet actueel `ACTIVE` zijn en de membership moet `ACTIVE` zijn. `OWNER` en `ADMIN` mogen wijzigen; `MEMBER` mag alleen bekijken. `ARCHIVED` is niet toegankelijk en `SUSPENDED` is niet wijzigbaar. Een organizationId uit cookie of formulier wordt altijd gekoppeld aan de actuele gebruiker opgezocht. Fouten onthullen niet of een niet-toegankelijke organisatie bestaat.

Platformrollen en organisatierollen zijn verschillende autorisatielagen. Een platformbeheerder krijgt in Module 4B niet automatisch toegang tot organisaties; de toekomstige beheerinterface krijgt afzonderlijke, auditeerbare bevoegdheden.
