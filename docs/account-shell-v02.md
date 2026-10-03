# Klantaccount-shell v0.2

V0.2 is standaard voor de bestaande ingelogde klant-/organisatieomgeving. De previewvlag is niet meer nodig. Publieke routes en Platformbeheer behouden hun bestaande shell. Accounttypes, autorisatie, organisatiecontext, navigatiegroepen, formulieren en acties blijven ongewijzigd.

Dezelfde ApplicationChrome rendert de bestaande header, mobiele accountnavigatie en pagina-inhoud. De afgebakende CSS-module verzorgt 1200px contentbreedte, responsieve marges, compacte linkerzijbalk, lichtblauw organisatievlak, marine koppen en rustige cards. Bestaande Button/LinkButton- en focusstijlen blijven leidend.

## Rollback

De oorspronkelijke shellmarkup en classes blijven behouden. Stel expliciet NEXT_PUBLIC_ACCOUNT_SHELL_VERSION=v01 in en maak een nieuwe build (lokaal: server herstarten) om de v0.2-stijllaag uit te schakelen. Zonder deze waarde is v0.2 actief. De instelling wijzigt uitsluitend presentatie en verleent geen toegang.

## Acceptatie

Dashboard, organisatie, opdrachten, adviesdossiers, account, actieve navigatie, desktop/mobiel, keyboard/focus, logout en herlogin zijn met een geïsoleerde synthetische opdrachtgever gecontroleerd. De product owner heeft de handmatige browseracceptatie inclusief echte 200%-zoom goedgekeurd. Tests bewaken de standaard in development/productie, expliciete rollback en ongewijzigde context/navigatie/formulierinhoud voor OWNER, ADMIN en MEMBER.
