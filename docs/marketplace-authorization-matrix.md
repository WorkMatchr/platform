# Autorisatiematrix Marketplace v1

## Platformcontext voor Marketplace Rules

| Zichtbare rol | Bestaande technische grondslag | Regels | Credits | Betrouwbaarheid | Platformtoegang |
| --- | --- | --- | --- | --- | --- |
| Platformeigenaar | `PlatformRole.ADMIN` + actief `WORKMATCHR_PLATFORM`-membership `OWNER` | wijzigen | muteren | besluiten | uitnodigen, rollen wijzigen, blokkeren/intrekken |
| Platformbeheerder | `PlatformRole.ADMIN` + actief membership `ADMIN` | wijzigen | muteren | besluiten | alleen bekijken |
| Platformauditor | `PlatformRole.ADMIN` + actief membership `MEMBER` | lezen | lezen | lezen | alleen bekijken |

De laatste actieve platformeigenaar, zelfblokkering en toegang zonder actieve platformcontext worden server-side geweigerd. Er is geen concurrerend rollenmodel toegevoegd.

| Handeling | Client OWNER/ADMIN | Provider OWNER/ADMIN | Provider MEMBER | Reviewer | Approver | Auditor | Platformbeheer |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Dossier beheren/indienen | Nee | Ja | Lezen | Nee | Nee | Lezen | Beperkt |
| Dossier reviewen | Nee | Nee | Nee | Ja | Lezen | Lezen | Alleen met expliciete permission |
| Kwalificeren | Nee | Nee | Nee | Voorbereiden | Ja, vier ogen | Lezen | Geen impliciet recht |
| Selectie starten | Eigen opdracht | Nee | Nee | Nee | Nee | Audit | Interventie met reden |
| Uitnodiging bekijken | Nee | Eigen organisatie | Eigen organisatie, lezen | Nee | Nee | Audit | Audit |
| Deelnemen/offerte indienen | Nee | Ja | Nee | Nee | Nee | Nee | Nee |
| Offertes bekijken | Eigen opdracht | Alleen eigen | Alleen eigen, lezen | Nee | Nee | Audit | Alleen expliciet beleid |
| Gunnen | Eigen opdracht | Nee | Nee | Nee | Nee | Audit | Geen normale flow |
| Credits lezen | Nee | Eigen organisatie | Eigen organisatie | Nee | Nee | Audit | Ja |
| Credits toekennen/corrigeren | Nee | Nee | Nee | Nee | Nee | Lezen | Ja, met reden |
| Bericht sturen | Eigen kanaal | Eigen kanaal | Nee | Nee | Nee | Lezen | Nee |
| Notificaties lezen | Alleen eigen | Alleen eigen | Alleen eigen | Alleen eigen | Alleen eigen | Alleen eigen | Alleen eigen |

Iedere rij wordt server-side opnieuw gevalideerd. UI-verbergen verleent of ontneemt geen recht.
