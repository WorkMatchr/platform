import { publicLearningPrices } from './public-learning-prices'

// Editorial public presentation only. No Learning runtime, pricing API or enrollment data.
export const publicLearning = {
  title: 'RI&E in de praktijk',
  status: 'Binnenkort beschikbaar',
  href: '/e-learning/rie-in-de-praktijk',
  ...publicLearningPrices,
  chapters: [
    'Waarom een RI&E?',
    'Wie doet wat?',
    'Risico’s inventariseren',
    'Risico’s beoordelen',
    'Maatregelen bepalen',
    'Plan van Aanpak: van risico naar actie',
    'Toetsing van de RI&E',
    'RI&E actueel houden',
    'Van papier naar praktijk',
    'Integrale praktijkcasus',
  ],
} as const
