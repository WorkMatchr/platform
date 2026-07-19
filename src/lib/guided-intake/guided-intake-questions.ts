import type { GuidedQuestion } from './guided-intake-types'

export const MAX_DECISION_MOMENTS = 5

export const guidedIntakeQuestions = [
  {
    id: 'START_SITUATION',
    title: 'Welke situatie wilt u verhelderen?',
    helpText: 'De eerste volledig beschikbare route is bedoeld voor organisaties met personeel.',
    decisionPurpose: 'Vaststellen dat de werkgeversroute inhoudelijk van toepassing is.',
    factKey: 'HAS_EMPLOYEES',
    options: [
      {
        value: 'HAS_EMPLOYEES',
        label: 'Ik heb personeel in dienst',
        description: 'Krijg richting bij RI&E, arbeidsrisico’s en een passende vervolgstap.',
      },
    ],
  },
  {
    id: 'EMPLOYEE_COUNT',
    title: 'Hoeveel mensen werken er gewoonlijk voor uw organisatie?',
    helpText: 'Een globale categorie is voldoende. Dit helpt om uitzonderingen en aandachtspunten zorgvuldig te formuleren.',
    decisionPurpose: 'Vaststellen welke algemene RI&E- en toetsingscontext relevant kan zijn.',
    factKey: 'EMPLOYEE_COUNT',
    options: [
      { value: 'ONE', label: '1 persoon' },
      { value: 'TWO_TO_TWENTY_FIVE', label: '2 tot en met 25 personen' },
      { value: 'MORE_THAN_TWENTY_FIVE', label: 'Meer dan 25 personen' },
    ],
  },
  {
    id: 'RIE_STATUS',
    title: 'Wat is de huidige status van uw RI&E?',
    helpText: 'Kies wat het beste past. U hoeft nog geen documenten te uploaden.',
    decisionPurpose: 'Vaststellen of de eerste vervolgstap opstellen, actualiseren of controleren is.',
    factKey: 'RIE_STATUS',
    options: [
      { value: 'CURRENT', label: 'Wij hebben een actuele RI&E' },
      { value: 'OUTDATED', label: 'Wij hebben een RI&E, maar deze is mogelijk verouderd' },
      { value: 'NONE', label: 'Wij hebben nog geen RI&E' },
      { value: 'UNKNOWN', label: 'Ik weet het niet' },
    ],
  },
  {
    id: 'DECISION_GOAL',
    title: 'Waar wilt u nu vooral duidelijkheid over?',
    helpText: 'Kies het belangrijkste doel. Het advies blijft gericht op die eerste behoefte.',
    decisionPurpose: 'Bepalen welk adviesdoel voorrang krijgt.',
    factKey: 'DECISION_GOAL',
    options: [
      { value: 'LEGAL_CLARITY', label: 'Welke verplichtingen voor ons gelden' },
      { value: 'RISKS', label: 'Welke arbeidsrisico’s aandacht nodig hebben' },
      { value: 'IMPROVE_RIE', label: 'Of onze RI&E nog passend en actueel is' },
      { value: 'PRACTICAL_SUPPORT', label: 'Hoe wij dit praktisch kunnen aanpakken' },
    ],
  },
  {
    id: 'DESIRED_TIMING',
    title: 'Wanneer wilt u dit geregeld hebben?',
    helpText: 'De termijn helpt om de voorgestelde eerste actie praktisch te maken.',
    decisionPurpose: 'Vaststellen hoeveel tijd beschikbaar is voor de eerste vervolgstap.',
    factKey: 'DESIRED_TIMING',
    options: [
      { value: 'ORIENTING', label: 'Ik oriënteer mij eerst' },
      { value: 'SOON', label: 'Zo snel mogelijk' },
      { value: 'SPECIFIC_DATE', label: 'Voor een specifieke datum' },
    ],
    dateRefinement: {
      when: 'SPECIFIC_DATE',
      label: 'Gewenste datum',
      helpText: 'Deze datum preciseert uw antwoord en is geen extra beslismoment.',
    },
  },
] as const satisfies readonly GuidedQuestion[]

export const unavailableStartingSituations = [
  'Ik twijfel of ik een RI&E nodig heb',
  'Ik wil voldoen aan mijn arboverplichtingen',
  'Er is een incident of bijna-ongeval gebeurd',
  'Ik heb te maken met verzuim of gezondheidsklachten',
  'Ik zoek direct een deskundige',
] as const
