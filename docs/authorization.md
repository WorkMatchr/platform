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

## Intake indienen en opdrachten lezen

- alleen een actuele `OWNER` of `ADMIN` van dezelfde actieve organisatie mag een intake indienen;
- de Server Action bepaalt de actieve organisatie server-side en geeft alleen de laatst bekende intakeversie door voor een service-side concurrencycontrole;
- een `MEMBER` kan niet indienen en ziet alleen een opdracht die uit de eigen intake is gevormd;
- `requireAssignmentViewer` controleert gebruiker, actieve membership, actieve organisatie, tenant en bronintakemaker voordat opdrachtgegevens worden geladen;
- een niet-bestaande opdracht en een opdracht buiten de tenant leveren dezelfde veilige uitkomst op;
- de succesroute, lijst en detailroute voeren ieder opnieuw autorisatie uit.

`OWNER` en `ADMIN` mogen een opdracht beheren via `requireAssignmentManager`. Deze helper controleert opnieuw gebruiker, membership, organisatietype, organisatiecontext, tenant en opdrachtstatus. `MEMBER` heeft geen mutatierecht. Verborgen IDs en versies begrenzen uitsluitend het record en concurrency; zij verlenen nooit toegang.
