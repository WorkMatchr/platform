# ADR-010 — Fijnmazige platformrollen voor providerverificatie en kwalificatie

## Status

Geaccepteerd door de product owner op 14 juli 2026.

## Context

WorkMatchr heeft momenteel platformrollen `USER` en `ADMIN`. De brede rol `ADMIN` is onvoldoende als autorisatiebasis voor gevoelige providerbewijzen, verificaties, kwalificatiebesluiten, blokkades en audits. Providerorganisatie-rollen `OWNER`, `ADMIN` en `MEMBER` regelen uitsluitend toegang binnen de eigen tenant en mogen geen platformkwalificatie van eigen gegevens verlenen.

ADR-008 vereist betrouwbare, gescheiden verificatie en kwalificatie. Module 6A.2 voegt daarom een fijnmazige, tijdgebonden en auditeerbare platformbevoegdheidslaag toe zonder Better Auth of `User` als identitybron te vervangen.

## Besluit

### 1. Afzonderlijke platformbevoegdheden

De volgende permissions worden ontworpen:

- `PROVIDER_REVIEWER` — mag toegewezen providerdossiers en minimaal noodzakelijke bewijsversies beoordelen en verification decisions registreren;
- `PROVIDER_APPROVER` — mag formele platform- en capabilityqualification decisions nemen en hoog-risicoblokkades of herstel besluiten;
- `PROVIDER_AUDITOR` — mag immutable dossiers, besluiten en auditcontext read-only inspecteren, maar niets muteren.

Een gebruiker kan meerdere permissions hebben. Toekenningen hebben scope, `validFrom`, optioneel `validUntil`, toekennende actor, reden en append-only historie.

### 2. Scheiding met providerrollen

- `OrganizationMembershipRole.OWNER` en `.ADMIN` mogen providerdata beheren en indienen, maar niet verifiëren, kwalificeren of blokkeren.
- `MEMBER` blijft read-only voor niet-gevoelige providerdelen.
- Een platformpermission geeft geen tenantmembership en geen recht om providerdata namens de organisatie te wijzigen.
- Heeft één persoon zowel provider- als platformrechten, dan mag deze geen eigen organisatie of economisch verbonden provider beoordelen. De service controleert belangenconflict server-side.

### 3. Vier-ogencontrole

Een hoog-risicobesluit vereist minimaal twee verschillende actuele bevoegde actoren:

1. een `PROVIDER_REVIEWER` legt review, gebruikte bewijsversies en advies vast;
2. een andere `PROVIDER_APPROVER` neemt het formele besluit.

De database en service bewaken `reviewedByUserId != approvedByUserId`. UI-scheiding alleen is onvoldoende.

### 4. Hoog-risicobesluiten

Voorlopig worden als hoog risico aangemerkt:

- platformkwalificatie verlenen, afwijzen, schorsen, herstellen of laten vervallen;
- capabilityqualification verlenen wanneer een gereguleerde beroepskwalificatie vereist is;
- verification naar `VERIFIED` verhogen voor een gereguleerd bewijsfeit;
- een juridische, security- of complianceblokkade opleggen of opheffen;
- een uitzondering op gepubliceerde kwalificatiecriteria toestaan.

Deze lijst geldt voor Module 6A.2. Een toekomstige uitbreiding of uitzonderingspolicy vereist een nieuw expliciet besluit.

### 5. Reviewer

Een reviewer:

- ziet alleen toegewezen cases en noodzakelijke bewijsstukken;
- kan geen platformqualification finaliseren;
- kan geen eigen review formeel goedkeuren;
- registreert methode, criteria-versie, evidence revisions, reason codes en geldig interval;
- kan herstelpunten voorstellen;
- krijgt geen toegang tot credits, betaling, selectie of commerciële data.

### 6. Approver

Een approver:

- beoordeelt de frozen dossiercandidate, review en criteria-versie;
- neemt een immutable formeel qualification/block/recovery decision;
- kan een onvolledige of verlopen review niet goedkeuren;
- moet een afwijking gemotiveerd als nieuwe decision vastleggen;
- kan een eerder besluit niet wijzigen of verwijderen.

### 7. Auditor

Een auditor:

- heeft read-only toegang tot expliciet toegestane immutable historie;
- kan projecties, checksums, actorbevoegdheden en besluitketens reconstrueren;
- kan geen case claimen, bewijsstatus wijzigen of besluit nemen;
- krijgt alleen persoonsgegevens of bewijsinhoud wanneer dit aantoonbaar noodzakelijk en gelogd is.

### 8. Bestaande `PlatformRole.ADMIN`

`PlatformRole.ADMIN` blijft tijdelijk bestaan voor huidige platformfuncties, maar krijgt niet automatisch provider-reviewer- of approverrechten.

Migratiepad:

1. permissionmodellen additief toevoegen;
2. nieuwe qualificationservices uitsluitend expliciete actuele permissions laten accepteren;
3. bestaande admins inventariseren zonder automatische grants;
4. bevoegdheden handmatig en geaudit toekennen na productbesluit;
5. optioneel tijdelijk read-only toegang geven voor migratiecontrole, nooit formele hoog-risicobesluiten;
6. later beoordelen of `PlatformRole.ADMIN` alleen bootstrap/platformbeheer blijft of verder wordt opgesplitst.

Zolang geen approver expliciet is toegewezen, faalt kwalificatie in productie veilig. Een verborgen fallback naar `ADMIN` is verboden.

### 9. Autorisatie en audit

Iedere gevoelige service controleert binnen de transactie:

- actieve `User.status`;
- actuele permission en geldigheidsinterval;
- casescope of providercontext;
- belangenconflict;
- vier-ogenregel;
- verwachte recordversie;
- toegestane statusovergang.

Audit legt permission, actor, tenant/provider, case/decision, bronversies, reason code, tijdstip en resultaat vast. Tokens, documentinhoud, vrije motivering en volledige persoonsgegevens worden niet gelogd.

## Gevolgen

Positief:

- providerrollen en platformtoezicht blijven strikt gescheiden;
- gevoelige bewijsinzage wordt minimaal en auditeerbaar;
- hoog-risicobesluiten kunnen niet door één actor worden voorbereid én goedgekeurd;
- een brede platformadmin krijgt geen impliciet kwalificatiemandaat;
- besluitbevoegdheid is historisch reconstrueerbaar.

Nadelig of kostbaar:

- extra permission-, assignment- en audittabellen zijn nodig;
- beheer van toekenning, intrekking, verval en belangenconflicten vereist services en later een beheerinterface;
- vier-ogencontrole verhoogt doorlooptijd en operationele personeelsbehoefte;
- productiekwalificatie kan niet starten zonder minimaal bevoegde reviewer en approver.

## Alternatieven

### Alle platformadmins mogen alles

Afgewezen vanwege te ruime toegang, onvoldoende functiescheiding en gebrekkige herleidbaarheid.

### Alleen organisatierollen gebruiken

Afgewezen omdat een provider eigen claims dan inhoudelijk zou kunnen verifiëren of kwalificeren.

### Vier ogen alleen in de UI

Afgewezen omdat directe servicecalls, fouten of toekomstige routes de regel kunnen omzeilen.

### Eén rol `PROVIDER_MANAGER`

Afgewezen omdat review, formeel besluit en onafhankelijke audit dan onvoldoende gescheiden zijn.

## Openstaande implementatie- en productiepunten

- vereiste onafhankelijkheid en omgang met belangenconflicten;
- wie permissions mag toekennen en intrekken;
- scope: globaal, taxonomie/capability, regio of specifieke case;
- maximale geldigheidsduur en periodieke rechtenreview;
- noodprocedure bij incidenten en afwezigheid;
- minimale auditbewaartermijn;
- welke read-only overgangstoegang bestaande admins tijdelijk krijgen.

## Gerelateerde documentatie

- [Module 6A.2.1 — Implementatieplan providerkwalificatie](../module-6a2-providerkwalificatie-implementatieplan.md)
- [Module 6A.2.0 — Technische impactanalyse](../module-6a2-providerkwalificatie-technisch-ontwerp.md)
- [ADR-008 — Providerkwalificatie als fundament voor selectie](ADR-008-providerkwalificatie-als-fundament-voor-selectie.md)
- [ADR-009 — Deterministische, versieerbare en uitlegbare selectie](ADR-009-deterministische-versieerbare-en-uitlegbare-selectie.md)
- [ADR-003 — Better Auth en platformrollen](ADR-003-better-auth-en-platformrollen.md)

ADR-010 is geaccepteerd. De openstaande implementatie- en productiepunten wijzigen de functiescheiding niet.
