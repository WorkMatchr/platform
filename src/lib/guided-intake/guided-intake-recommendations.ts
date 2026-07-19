import { publicRoutes } from '@/content/public-routes'
import type { GuidedAnswers, GuidedRecommendation } from './guided-intake-types'

type RecommendationRule = {
  id: string
  matches: (answers: GuidedAnswers) => boolean
  build: (answers: GuidedAnswers) => GuidedRecommendation
}

const sharedKnowledgeLinks = [
  { label: 'Lees wanneer een RI&E nodig is', href: publicRoutes.rieQuestion },
  { label: 'Bekijk de wettelijke context', href: publicRoutes.rieObligation },
] as const

function contextReason(answers: GuidedAnswers) {
  if (answers.EMPLOYEE_COUNT === 'MORE_THAN_TWENTY_FIVE') {
    return 'Bij meer dan 25 werkenden kan deskundige toetsing extra aandacht vragen; de precieze toepassing hangt af van uw situatie.'
  }
  if (answers.EMPLOYEE_COUNT === 'TWO_TO_TWENTY_FIVE') {
    return 'Voor organisaties tot en met 25 werkenden kunnen onder voorwaarden andere toetsingsregels gelden.'
  }
  return 'Ook bij één werkende is het belangrijk arbeidsrisico’s passend en aantoonbaar in kaart te brengen.'
}

function timingAction(answers: GuidedAnswers) {
  if (answers.DESIRED_TIMING === 'SOON') return 'Plan op korte termijn wie de inventarisatie of controle coördineert.'
  if (answers.DESIRED_TIMING === 'SPECIFIC_DATE' && answers.desiredDate) {
    const date = new Intl.DateTimeFormat('nl-NL', { dateStyle: 'long', timeZone: 'UTC' })
      .format(new Date(`${answers.desiredDate}T00:00:00Z`))
    return `Werk terug vanaf ${date} en reserveer tijd voor inventarisatie, beoordeling en maatregelen.`
  }
  return 'Gebruik de oriëntatiefase om bestaande documenten, werkplekken en betrokken medewerkers in kaart te brengen.'
}

const recommendationRules: readonly RecommendationRule[] = [
  {
    id: 'create-rie',
    matches: (answers) => answers.RIE_STATUS === 'NONE',
    build: (answers) => ({
      id: 'create-rie',
      title: 'Begin met een passende RI&E en plan van aanpak',
      summary: 'Omdat uw organisatie personeel heeft en nog geen RI&E heeft, is het verstandig eerst de arbeidsrisico’s systematisch vast te leggen en maatregelen te prioriteren.',
      reasons: [
        'Werkgevers moeten arbeidsrisico’s in beginsel schriftelijk inventariseren en evalueren.',
        contextReason(answers),
      ],
      nextActions: [
        'Breng werkzaamheden, werkplekken, groepen medewerkers en bestaande maatregelen bijeen.',
        'Leg risico’s vast en vertaal deze naar concrete maatregelen in een plan van aanpak.',
        timingAction(answers),
      ],
      knowledgeLinks: sharedKnowledgeLinks,
      serviceLinks: [{ label: 'Bekijk ondersteuning bij een RI&E', href: publicRoutes.rieService }],
    }),
  },
  {
    id: 'verify-rie-status',
    matches: (answers) => answers.RIE_STATUS === 'UNKNOWN',
    build: (answers) => ({
      id: 'verify-rie-status',
      title: 'Controleer eerst of een actuele RI&E beschikbaar is',
      summary: 'De eerste stap is vaststellen welke RI&E en welk plan van aanpak binnen uw organisatie bestaan, wie deze beheert en wanneer deze voor het laatst zijn bijgewerkt.',
      reasons: [
        'Zonder bekende uitgangssituatie kan niet verantwoord worden bepaald wat ontbreekt.',
        contextReason(answers),
      ],
      nextActions: [
        'Vraag intern naar de RI&E, het plan van aanpak en de laatste actualisatiedatum.',
        'Vergelijk de documenten met de huidige werkzaamheden en locaties.',
        timingAction(answers),
      ],
      knowledgeLinks: sharedKnowledgeLinks,
      serviceLinks: [{ label: 'Bekijk ondersteuning bij een RI&E', href: publicRoutes.rieService }],
    }),
  },
  {
    id: 'update-rie',
    matches: (answers) => answers.RIE_STATUS === 'OUTDATED' || answers.DECISION_GOAL === 'IMPROVE_RIE',
    build: (answers) => ({
      id: 'update-rie',
      title: 'Toets uw RI&E aan de huidige werksituatie',
      summary: 'Gebruik de bestaande RI&E als vertrekpunt en controleer systematisch of werkzaamheden, locaties, risico’s en maatregelen nog volledig en actueel zijn.',
      reasons: [
        'Een RI&E moet aansluiten op de feitelijke werkzaamheden en worden aangepast wanneer omstandigheden veranderen.',
        contextReason(answers),
      ],
      nextActions: [
        'Noteer veranderingen sinds de laatste RI&E en betrek medewerkers bij ontbrekende risico’s.',
        'Werk het plan van aanpak, verantwoordelijken en termijnen bij.',
        timingAction(answers),
      ],
      knowledgeLinks: sharedKnowledgeLinks,
      serviceLinks: [{ label: 'Bekijk ondersteuning bij actualisatie', href: publicRoutes.rieService }],
    }),
  },
  {
    id: 'use-current-rie',
    matches: () => true,
    build: (answers) => ({
      id: 'use-current-rie',
      title: 'Gebruik uw actuele RI&E als basis voor de volgende stap',
      summary: 'Uw RI&E geeft richting aan de arbeidsrisico’s en maatregelen die nu prioriteit verdienen. Begin bij uw gekozen beslisdoel en controleer of het plan van aanpak daarbij aansluit.',
      reasons: [
        'Een actuele RI&E en het bijbehorende plan van aanpak vormen samen de inhoudelijke basis.',
        contextReason(answers),
      ],
      nextActions: [
        answers.DECISION_GOAL === 'RISKS'
          ? 'Bespreek de belangrijkste risico’s en ontbrekende beheersmaatregelen met de betrokken medewerkers.'
          : 'Koppel uw belangrijkste vraag aan de relevante risico’s en maatregelen in het plan van aanpak.',
        'Leg vast wie de eerstvolgende actie uitvoert en wanneer deze wordt gecontroleerd.',
        timingAction(answers),
      ],
      knowledgeLinks: sharedKnowledgeLinks,
      serviceLinks: [{ label: 'Bekijk mogelijke RI&E-ondersteuning', href: publicRoutes.rieService }],
    }),
  },
]

export function selectGuidedRecommendation(answers: GuidedAnswers) {
  return recommendationRules.find((rule) => rule.matches(answers))!.build(answers)
}
