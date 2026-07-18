import type { ProviderDossierSection, ProviderDossierSubmissionStatus } from '@/generated/prisma/client'
import type { ProviderCompletenessAssessment } from './provider-dossier-completeness'

export type ProviderDossierOpenAction = {
  code: string
  priority: number
  section: ProviderDossierSection
  title: string
  description: string
  routeHint: string
  pageTitle: string
  groupLabel: string
  groupHref: string
  blocking: boolean
}

type ActionDetails = Omit<ProviderDossierOpenAction, 'code' | 'priority' | 'section' | 'blocking'>

const details: Record<ProviderDossierSection, ActionDetails> = {
  ORGANIZATION: {
    title: 'Vul de bedrijfsgegevens aan',
    description: 'Controleer de juridische en algemene organisatiegegevens.',
    routeHint: '/aanbiedersdossier/bedrijfsgegevens',
    pageTitle: 'Bedrijfsgegevens',
    groupLabel: 'Bedrijfsgegevens',
    groupHref: '/aanbiedersdossier/bedrijfsgegevens',
  },
  CAPABILITIES: {
    title: 'Voeg een dienst toe',
    description: 'Leg minimaal één passende dienst of specialisme vast.',
    routeHint: '/aanbiedersdossier/diensten',
    pageTitle: 'Diensten en specialismen',
    groupLabel: 'Diensten en ervaring',
    groupHref: '/aanbiedersdossier/diensten-en-ervaring',
  },
  SECTOR_EXPERIENCE: {
    title: 'Vul sectorervaring in',
    description: 'Leg vast in welke sectoren de organisatie ervaring heeft.',
    routeHint: '/aanbiedersdossier/sectorervaring',
    pageTitle: 'Sectorervaring',
    groupLabel: 'Diensten en ervaring',
    groupHref: '/aanbiedersdossier/diensten-en-ervaring',
  },
  WORK_AREA: {
    title: 'Vul het werkgebied in',
    description: 'Kies provincies, landelijk of inzet op afstand.',
    routeHint: '/aanbiedersdossier/werkgebied',
    pageTitle: 'Werkgebied',
    groupLabel: 'Werkgebied',
    groupHref: '/aanbiedersdossier/werkgebied',
  },
  CAPACITY: {
    title: 'Capaciteitsgegevens zijn niet meer nodig',
    description: 'Historische capaciteitsgegevens blijven alleen voor bestaande dossierhistorie bewaard.',
    routeHint: '/aanbiedersdossier/werkgebied',
    pageTitle: 'Werkgebied',
    groupLabel: 'Werkgebied',
    groupHref: '/aanbiedersdossier/werkgebied',
  },
  PROFESSIONALS: {
    title: 'Voeg een professional toe',
    description: 'Leg minimaal één actieve professional en functionele rol vast.',
    routeHint: '/aanbiedersdossier/professionals',
    pageTitle: 'Professionals',
    groupLabel: 'Professionals en kwalificaties',
    groupHref: '/aanbiedersdossier/professionals',
  },
  QUALIFICATIONS: {
    title: 'Voeg een kwalificatie toe',
    description: 'Leg een relevante organisatie- of beroepskwalificatie vast.',
    routeHint: '/aanbiedersdossier/professionals',
    pageTitle: 'Professionals',
    groupLabel: 'Professionals en kwalificaties',
    groupHref: '/aanbiedersdossier/professionals',
  },
  INSURANCE: {
    title: 'Werk de verzekering bij',
    description: 'Voeg geldige verzekeringsgegevens toe.',
    routeHint: '/aanbiedersdossier/verzekeringen',
    pageTitle: 'Verzekeringen',
    groupLabel: 'Verzekeringen en bewijsstukken',
    groupHref: '/aanbiedersdossier/verzekeringen',
  },
  EVIDENCE: {
    title: 'Maak bewijs beschikbaar',
    description: 'Het vereiste bewijs is nog niet veilig beschikbaar.',
    routeHint: '/aanbiedersdossier/bewijsstukken',
    pageTitle: 'Bewijsstukken',
    groupLabel: 'Verzekeringen en bewijsstukken',
    groupHref: '/aanbiedersdossier/verzekeringen',
  },
  DECLARATIONS: {
    title: 'Accepteer de vereiste verklaring',
    description: 'Een actuele verplichte verklaring vraagt nog om akkoord.',
    routeHint: '/aanbiedersdossier/verklaringen',
    pageTitle: 'Verklaringen',
    groupLabel: 'Verklaringen en indienen',
    groupHref: '/aanbiedersdossier/verklaringen',
  },
}

const controlDetails = {
  routeHint: '/aanbiedersdossier/controleren',
  pageTitle: 'Dossier controleren',
  groupLabel: 'Verklaringen en indienen',
  groupHref: '/aanbiedersdossier/verklaringen',
} as const

export function buildProviderDossierOpenActions(
  completeness: ProviderCompletenessAssessment,
  submissionStatus: ProviderDossierSubmissionStatus | null,
  findingSections: ProviderDossierSection[] = [],
): ProviderDossierOpenAction[] {
  if (submissionStatus === 'SUBMITTED' || submissionStatus === 'UNDER_REVIEW') {
    return [
      {
        code: 'AWAIT_REVIEW',
        priority: 100,
        section: 'ORGANIZATION',
        title: 'Wacht op de beoordeling',
        description: 'Het ingediende dossier is tijdens de beoordeling alleen-lezen.',
        ...controlDetails,
        blocking: false,
      },
    ]
  }

  const actions = completeness.reasons.filter((reason) => reason.section !== 'CAPACITY').map((reason, index) => ({
    code: reason.code,
    priority: 300 - index,
    section: reason.section,
    ...details[reason.section],
    blocking: true,
  }))

  if (submissionStatus === 'ADDITIONAL_INFORMATION_REQUIRED') {
    for (const section of [...new Set(findingSections)].filter((item) => item !== 'CAPACITY')) {
      actions.unshift({
        code: `RESOLVE_${section}`,
        priority: 500,
        section,
        title: 'Los het herstelpunt op',
        description: 'De beoordelaar vraagt aanvullende informatie voor dit onderdeel.',
        routeHint: details[section].routeHint,
        pageTitle: details[section].pageTitle,
        groupLabel: details[section].groupLabel,
        groupHref: details[section].groupHref,
        blocking: true,
      })
    }
    if (completeness.isSubmittable) {
      actions.push({
        code: 'RESUBMIT_DOSSIER',
        priority: 200,
        section: 'ORGANIZATION',
        title: 'Dien het dossier opnieuw in',
        description: 'Alle verplichte onderdelen zijn opnieuw gereed voor beoordeling.',
        ...controlDetails,
        blocking: false,
      })
    }
  } else if (completeness.isSubmittable) {
    actions.push({
      code: 'SUBMIT_DOSSIER',
      priority: 200,
      section: 'ORGANIZATION',
      title: 'Controleer en dien het dossier in',
      description: 'Alle verplichte onderdelen zijn ingevuld.',
      ...controlDetails,
      blocking: false,
    })
  }

  return actions.sort((left, right) => right.priority - left.priority)
}
