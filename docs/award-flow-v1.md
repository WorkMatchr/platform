# Gunningsflow v1

Een actieve opdrachtgever-`OWNER` of -`ADMIN` kiest één geldige ingediende offerte en motiveert de keuze. De `Serializable` transactie maakt precies één immutable `AwardDecision`, zet de gekozen offerte op `AWARDED`, wijst overige ingediende offertes af, zet de opdracht op `AWARDED`, schrijft bestaande en nieuwe audit/historie en maakt veilige notificaties.

De winnaar ziet de gunning. Afgewezen providers zien alleen hun eigen uitkomst en niet wie won. Alleen het winnaarskanaal blijft open. Een correctie na gunning is geen normale v1-flow en vereist later een afzonderlijke escalatiebeslissing.
