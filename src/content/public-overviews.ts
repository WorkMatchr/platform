import type { InternalHref } from './public-homepage'
import { publicRoutes } from './public-routes'

export type PublicOverviewItem = {
  title: string
  description: string
  href?: InternalHref
  status?: string
}

export const serviceOverview = [
  { title: 'RI&E', description: 'Breng arbeidsrisico’s in kaart en vertaal deze naar concrete maatregelen.', href: publicRoutes.rieService, status: 'Beschikbaar' },
  { title: 'Preventiemedewerker', description: 'Ondersteuning bij preventietaken en de uitvoering van arbobeleid.', status: 'In voorbereiding' },
  { title: 'Arbodienstverlening', description: 'Oriëntatie op deskundige ondersteuning voor gezond en veilig werken.', status: 'In voorbereiding' },
  { title: 'Bedrijfsarts', description: 'Inzicht in de rol van de bedrijfsarts bij gezondheid en inzetbaarheid.', status: 'In voorbereiding' },
  { title: 'PMO', description: 'Onderzoek naar werkgerelateerde gezondheidsrisico’s en preventie.', status: 'In voorbereiding' },
  { title: 'Veiligheidskundige ondersteuning', description: 'Deskundige ondersteuning bij complexe veiligheidsvraagstukken.', status: 'In voorbereiding' },
  { title: 'Arbeidshygiënisch onderzoek', description: 'Onderzoek naar blootstelling en gezondheidsrisico’s in de werkomgeving.', status: 'In voorbereiding' },
] as const satisfies readonly PublicOverviewItem[]

export const legalOverview = [
  { title: 'RI&E', description: 'De algemene verplichting om arbeidsrisico’s te inventariseren en evalueren.', href: publicRoutes.rieObligation, status: 'Beschikbaar' },
  { title: 'Preventiemedewerker', description: 'De rol van preventie binnen de organisatie.', status: 'In voorbereiding' },
  { title: 'BHV', description: 'Organisatie van hulp bij incidenten en noodsituaties.', status: 'In voorbereiding' },
  { title: 'Basiscontract arbodienstverlening', description: 'Afspraken over toegang tot wettelijke arbodienstverlening.', status: 'In voorbereiding' },
  { title: 'Voorlichting en onderricht', description: 'Medewerkers informeren over risico’s en veilig werken.', status: 'In voorbereiding' },
  { title: 'Arbeidsgezondheidskundig onderzoek', description: 'Onderzoek gericht op risico’s van het werk voor de gezondheid.', status: 'In voorbereiding' },
] as const satisfies readonly PublicOverviewItem[]

export const sectorOverview = [
  ['Bouw', 'Aandacht voor wisselende werkplekken, fysieke belasting en samenwerking.'],
  ['Industrie', 'Aandacht voor processen, installaties, stoffen en machineveiligheid.'],
  ['Zorg', 'Aandacht voor fysieke en psychosociale belasting en infectierisico’s.'],
  ['Onderwijs', 'Aandacht voor werkdruk, gebouwen en een veilige leeromgeving.'],
  ['Logistiek', 'Aandacht voor transport, opslag, verkeer en fysieke belasting.'],
  ['Overheid en gemeenten', 'Aandacht voor uiteenlopende publieke taken en werkomgevingen.'],
].map(([title, description]) => ({ title, description, status: 'Sectorinformatie in voorbereiding' })) satisfies readonly PublicOverviewItem[]

export const knowledgeCategories = [
  ['Arbowet en verplichtingen', 'Begrijp de algemene kaders en verantwoordelijkheden.'],
  ['RI&E en preventie', 'Herken, beoordeel en beheers arbeidsrisico’s.'],
  ['Veilig en gezond werken', 'Praktische uitleg over arbeidsomstandigheden.'],
  ['Verzuim en inzetbaarheid', 'Informatie over gezondheid, verzuim en preventie.'],
  ['Specialistische ondersteuning', 'Ontdek welke deskundigheid bij een vraag kan passen.'],
].map(([title, description]) => ({ title, description })) satisfies readonly PublicOverviewItem[]
