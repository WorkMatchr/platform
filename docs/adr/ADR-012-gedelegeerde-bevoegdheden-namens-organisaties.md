# ADR-012 — Gedelegeerde bevoegdheden namens organisaties

## Status

Voorgesteld — 15 juli 2026

## Context

WorkMatchr gebruikt `OrganizationMembership` met de rollen `OWNER`, `ADMIN` en `MEMBER` voor tenanttoegang en organisatiebeheer. In Module 5A tot en met 5C mogen alleen actieve `OWNER` en `ADMIN` een intake indienen, een conceptopdracht beheren en een opdracht publiceren. `MEMBER` mag alleen een eigen conceptintake beheren.

Deze rolmatrix is veilig, maar te grof voor organisaties met gedelegeerde mandaten. Een medewerker kan bevoegd zijn een hulpvraag in te dienen zonder organisatiebeheerder te zijn. Omgekeerd hoeft een algemene beheerrol niet automatisch ieder toekomstig commercieel of juridisch procesrecht te geven. Ook indienen, publiceren en gunnen hebben verschillende gevolgen en horen niet als één impliciet recht te worden behandeld.

WorkMatchr mag de interne goedkeuringsstructuur, procuratie of hiërarchie van een organisatie niet bepalen. Het platform moet uitsluitend aantoonbaar controleren of de gebruiker binnen WorkMatchr de gedelegeerde bevoegdheid heeft om de concrete handeling namens de eigen organisatie uit te voeren.

ADR-010 introduceert al een afzonderlijke, tijdgebonden permissionlaag voor platformreview, approval en audit. Die platformpermissions mogen geen organisatiehandelingen toestaan. ADR-012 past hetzelfde scheidingsprincipe toe binnen een organisatiecontext, zonder de platformpermissionlaag te hergebruiken of te vermengen.

## Besluit

### 1. Organisatierol en procesbevoegdheid blijven afzonderlijk

WorkMatchr onderscheidt drie cumulatieve autorisatielagen:

1. actieve account- en platformtoegang;
2. actieve tenanttoegang via `OrganizationMembership`;
3. een effectief organization-scoped procesrecht voor de concrete handeling.

Een procesrecht geeft nooit zelfstandig tenanttoegang. Een platformpermission geeft nooit recht om namens een klant- of providerorganisatie te handelen. Alle lagen worden server-side dicht bij het beschermde gegevensgebruik gecontroleerd. Onder ADR-013 wordt de organisatiecontext deterministisch uit de unieke actieve membership afgeleid en niet uit een actieve-organisatiecookie.

### 2. Er komt een afzonderlijke organization process-permissionlaag

Procesrechten gebruiken stabiele, technisch Engelstalige permissioncodes. De eerste voorgestelde set is:

- `INTAKE_CREATE`;
- `INTAKE_EDIT_OWN`;
- `INTAKE_EDIT_ORGANIZATION`;
- `INTAKE_SUBMIT`;
- `ASSIGNMENT_EDIT`;
- `ASSIGNMENT_PUBLISH`;
- `ASSIGNMENT_WITHDRAW`;
- toekomstig `ASSIGNMENT_AWARD`;
- `PROCESS_PERMISSION_MANAGE`.

Een permissiongrant is gekoppeld aan gebruiker, membership en organisatie; heeft een geldigheidsperiode; registreert grantactor, reden en policyversie; en kan alleen append-only worden ingetrokken. Verlopen of ingetrokken grants worden nooit verwijderd of als actief geïnterpreteerd.

### 3. Bestaande rollen leveren een versieerbare compatibiliteitsbaseline

Om bestaande functionaliteit niet stilzwijgend te verwijderen geldt als voorgesteld initiële baseline:

- `OWNER`: alle bestaande intake- en opdrachtprocesrechten plus permissionbeheer;
- `ADMIN`: de bestaande intake- en opdrachtprocesrechten, zonder automatisch permissionbeheer;
- `MEMBER`: intake starten en eigen conceptintakes wijzigen.

Een `MEMBER` kan door een geldige expliciete grant aanvullende procesrechten krijgen zonder `ADMIN` te worden. Aanvullende rechten voor `ADMIN` kunnen eveneens expliciet worden verleend. De baseline is versioned policy en geen verklaring over de interne juridische volmacht van de organisatie.

De baseline voor het toekomstige `ASSIGNMENT_AWARD` wordt pas bij het gunningsontwerp vastgesteld. Gunning wordt niet afgeleid uit `INTAKE_SUBMIT` of `ASSIGNMENT_PUBLISH`.

### 4. WorkMatchr modelleert geen interne goedkeuringsketen

Een geldige permission betekent uitsluitend dat de gebruiker de handeling binnen WorkMatchr mag uitvoeren. Het platform modelleert in versie 1 geen:

- organisatieschema of managementhiërarchie;
- interne opeenvolgende goedkeuringen;
- procuratie buiten het noodzakelijke procesrecht;
- budgetmandaten;
- juridische verificatie van een externe volmacht.

De interface gebruikt daarom geen tekst als “intern goedgekeurd”. Zij vermeldt de actieve organisatie, de relevante bevoegdheid en de concrete gevolgen van de actie.

### 5. Procesrechten zijn fijnmazig en niet transitief

- `INTAKE_SUBMIT` verleent geen `ASSIGNMENT_PUBLISH`;
- `ASSIGNMENT_PUBLISH` verleent geen `ASSIGNMENT_AWARD`;
- `PROCESS_PERMISSION_MANAGE` verleent geen inhoudelijk procesrecht;
- organisatiepermissions verlenen geen platformreview-, qualification- of auditorrecht;
- intrekken vereist het afzonderlijke domeinrecht en, waar van toepassing, een verplichte reden.

### 6. Autorisatie blijft fail-closed

Een actie wordt geweigerd bij onder meer:

- ontbrekende, toekomstige, verlopen of ingetrokken grant;
- een permission voor een andere organisatie of membership;
- inactieve organisatie of membership;
- geblokkeerd of gearchiveerd account;
- ongeldige objectstatus of tenantbinding;
- ontbrekende permissionpolicyconfiguratie;
- een concurrencyconflict tussen rechtenwijziging en proceshandeling.

Clientstate, cookies, formulieren en zichtbare knoppen zijn nooit de beveiligingsgrens.

### 7. Audit is verplicht

Iedere beschermde proceshandeling legt minimaal vast:

- actor, membership en organisatie;
- permissioncode;
- bron van het effectieve recht: rolbaseline of expliciete grant;
- grant- of policyversie;
- object en objectversie;
- handeling, tijd, uitkomst en veilige redencode.

Grant, intrekking en gebruik blijven historisch herleidbaar. Audit bevat geen wachtwoorden, sessies, tokens, secrets of onnodige persoonsgegevens.

## Gevolgen

### Positief

- Organisaties kunnen verantwoordelijkheden delegeren zonder gebruikers onnodig brede beheerrechten te geven.
- Indienen, publiceren en later gunnen krijgen afzonderlijke, uitlegbare bevoegdheidsgrenzen.
- Bestaande OWNER/ADMIN-functionaliteit kan via een versioned baseline compatibel blijven.
- Autorisatiebesluiten worden reproduceerbaar en auditbaar.
- De aanpak volgt `Governance before Automation` en sluit aan op de gescheiden platformpermissions uit ADR-010.

### Negatief

- Autorisatiequeries en services krijgen een extra laag en meer concurrencygevallen.
- Permissionbeheer, intrekking, verval en periodieke review vragen aanvullende interface en operationeel beleid.
- Een rol alleen is niet langer voldoende context voor hoog-risicohandelingen.
- De juridische betekenis van delegation moet zorgvuldig en terughoudend worden geformuleerd.

### Risico's en beheersing

| Risico | Beheersing |
| --- | --- |
| Te brede grants | Fijnmazige codes, minimale defaults, tijdsgrenzen en periodieke review |
| Cross-tenant grantgebruik | Membership-, organisatie- en objecttenant iedere actie server-side valideren |
| Verlopen recht blijft gecachet | Geen langdurige autorisatiecache; actuele grant bij write opnieuw controleren |
| Permission wordt tijdens actie ingetrokken | Transactionele of expliciet versioned hercontrole met veilige conflictuitkomst |
| WorkMatchr suggereert juridische volmacht | UI vermeldt alleen bevoegdheid binnen WorkMatchr en concrete procesgevolgen |
| Bestaande gebruikers verliezen toegang | Versioned compatibiliteitsbaseline en gefaseerde migratie |

## Afgewezen alternatieven

### Alleen `OWNER`, `ADMIN` en `MEMBER` blijven gebruiken

Afgewezen omdat dit gebruikers dwingt tot te brede rollen en procesrechten niet afzonderlijk auditbaar maakt.

### Nieuwe organisatierollen per proces maken

Afgewezen omdat combinaties snel vermenigvuldigen, rollen tenantbeheer en procesmandaat blijven vermengen en toekomstige uitbreidingen moeilijk versieerbaar worden.

### Interne goedkeuringsketens volledig modelleren

Afgewezen voor versie 1. WorkMatchr zou daarmee organisatiebeleid gaan voorschrijven en onnodige complexiteit en persoonsgegevens introduceren.

### Platformpermissions uit ADR-010 hergebruiken

Afgewezen omdat platformreview en handelen namens een tenant verschillende trust boundaries hebben. Een platformreviewer mag geen opdrachtgeveractie uitvoeren en een organisatiegebruiker mag eigen gegevens niet platformmatig verifiëren.

## Openstaande besluiten vóór acceptatie

1. Welke hoog-risicohandelingen vereisen vanaf introductie altijd een expliciete grant, ondanks rolbaseline?
2. Mag `PROCESS_PERMISSION_MANAGE` later aan een `ADMIN` worden gedelegeerd?
3. Komt er een organisatie-instelling waarbij uitsluitend expliciete grants gelden?
4. Welke exacte bewaartermijn en periodieke review gelden voor grants en audit?
5. Welke juridisch getoetste tekst beschrijft de bevoegdheidsbevestiging bij indienen, publiceren en later gunnen?

## Relatie met andere besluiten

- ADR-003 blijft leidend voor account- en platformrollen.
- ADR-004 blijft leidend voor membershipgebaseerde tenantisolatie; ADR-013 vervangt meerdere memberships en de actieve-organisatiekeuze door maximaal één actieve membership per normaal tenantaccount.
- ADR-006 blijft leidend voor transactionele opdrachtvorming; Module 5D stelt een aanvulling op de zichtbare gereedmeldflow voor.
- ADR-007 blijft leidend voor afzonderlijke, gecontroleerde publicatie.
- ADR-010 blijft leidend voor platformreviewpermissions en vier-ogencontrole.
- ADR-011 bevestigt dat immutable kandidaten en beslisbronnen niet door live-data worden vervangen; ADR-012 past dezelfde governancegedachte toe op bevoegdheidscontrole.
- ADR-013 blijft leidend voor de relatie tussen tenantaccounts, de WorkMatchr-beheerorganisatie, platformrollen en accountlifecycle.

## Implementatiestatus

Niet geïmplementeerd. Acceptatie van deze ADR autoriseert niet automatisch Prisma-, migratie-, service-, route-, UI-, test-, dependency- of configuratiewijzigingen.
