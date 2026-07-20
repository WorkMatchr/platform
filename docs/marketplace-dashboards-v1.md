# Marktplaatsdashboards v1

## Opdrachtgever

Toont eigen opdrachten, status, aantal uitnodigingen, ingediende offertes, deadlines, gunning en notificaties. Bevoegde gebruikers starten selectie, vergelijken offertes, berichten en gunnen.

## Dienstverlener

Toont dossier-, readiness-, kwalificatie- en selecteerbaarheidsstatus, uitnodigingen, offertes, creditstanden en notificaties. Blokkades worden in begrijpelijke taal gepresenteerd.

## Platformbeheer

Toont begrensde aantallen voor review, actieve marktprocessen, notificatiefouten en recente creditcorrecties. Alleen de combinatie actieve User, `PlatformRole.ADMIN` en actieve membership bij `WORKMATCHR_PLATFORM` verleent beheerrechten.

Reviewer en approver gebruiken hun bestaande actieve platformpermission met een actieve membership bij `WORKMATCHR_PLATFORM`. De auditor gebruikt zijn bestaande permission juist zonder organisatiemembership. Vanuit het platformdashboard opent `/beheer/dossiers` de begrensde beoordelingswachtrij. De reviewer- en approveracties worden afzonderlijk server-side afgedwongen; de auditor blijft read-only. Alleen de centrale platformadmin ziet marktplaats-, match- en creditmutaties.

Queries zijn tenantgebonden, gepagineerd of begrensd en tonen geen concurrentinformatie.
