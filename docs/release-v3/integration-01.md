# Integratie ACCOUNT-01, ACCOUNT-02 en Marketplace

Doeldatum 1 januari 2027. De uitgangscommit van Marketplace-herstel is `199992b544d612dbf86463feca1cc1a0e40496a7`. Deze bevat B4 `abf3cc705c7e830edb6532504cc30d09d2b357ff`. De wijzigingen uit de lokale ACCOUNT-01-commit `e16be9632acbc99dbe81f779bad7651e8d06c750` zijn opgenomen via `45219977e0d48ee50bd3b17e92ab1eb68e63644b`.

| Onderdeel | Gedrag van de kandidaat |
| --- | --- |
| Account | De organisatieroute en bestaande dossierlinks blijven bereikbaar. Mijn dienstverlening bundelt sectoren, diensten, specialismen, leveringsvormen en werkgebied. |
| ACCOUNT-02 | Voor een nieuwe of bestaande dienstverlenende organisatie tellen organisatie, sector, dienst met leveringsvorm en werkgebied. De aanmelddatum van een uitgenodigde medewerker verandert de eisen niet. |
| Kwalificatie | Vier ingevulde onderdelen maken indiening mogelijk. Voor Marketplace-deelname moet de actuele dossierbasis zijn goedgekeurd, met een geldig platformbesluit, besluiten voor alle actieve diensten en een actuele projectie. |
| Historie | De overgang leest de feitelijke dossiergegevens. Beslissingen, kwalificatiebewijzen en oude revisies blijven behouden. Een verouderde projectie opent geen uitnodiging. |
| Financiële vrijgave | De kandidaat bevat de bestaande credit- en offertestroom. Commerciële publicatie vereist afzonderlijk herstel van de Pro-keten en integrale releaseacceptatie. |

De acceptatie gebruikt synthetische organisaties, een lokale mailtransportfixture en PostgreSQL. De releasebranch is uitgesloten van automatische Vercel-deployments. De exacte testuitslagen en beperkingen staan in de bijbehorende Draft PR.
