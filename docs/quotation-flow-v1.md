# Offerteflow v1

## Statussen

`DRAFT → SUBMITTED → AWARDED | REJECTED`; daarnaast zijn `WITHDRAWN` en `EXPIRED` voorbereid.

Een provider accepteert één geldige uitnodiging. Deelname en creditreservering ontstaan in dezelfde transactie. Een conceptofferte gebruikt immutable versies met prijs, prijsuitleg, aanpak, planning, optionele voorwaarden en geldigheid. Servertijd bewaakt de deadline. Indiening en consumptie van de reservering zijn atomair en idempotent.

Providers zien uitsluitend hun eigen offerte, versies, deelname, creditmutaties en kanaal. De opdrachtgever ziet ingediende offertes voor de eigen opdracht. Veilige bijlagen zijn nog niet beschikbaar.
