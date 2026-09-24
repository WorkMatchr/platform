import type { ExpertiseId } from '@/lib/requests/simple-advice-contract'
import { expertiseSpecialismSlugs } from '@/lib/requests/expertise-specialism-reference'
import { publicRoutes } from './public-routes'

export const canonicalExpertiseServices = [
  { id: 'HVK', label: 'Hogere veiligheidskundige (HVK)', slug: expertiseSpecialismSlugs.HVK, href: publicRoutes.safetyExpertService, mapping: 'direct' },
  { id: 'MVK', label: 'Middelbare veiligheidskundige (MVK)', slug: expertiseSpecialismSlugs.MVK, href: publicRoutes.mediumSafetyExpertService, mapping: 'direct' },
  { id: 'ARBEIDSHYGIENIST', label: 'Arbeidshygiënist', slug: expertiseSpecialismSlugs.ARBEIDSHYGIENIST, href: publicRoutes.occupationalHygienistService, mapping: 'direct' },
  { id: 'A_EN_O_DESKUNDIGE', label: 'Arbeids- en organisatiedeskundige', slug: expertiseSpecialismSlugs.A_EN_O_DESKUNDIGE, href: publicRoutes.aoExpertService, mapping: 'direct' },
  { id: 'BEDRIJFSARTS', label: 'Bedrijfsarts', slug: expertiseSpecialismSlugs.BEDRIJFSARTS, href: publicRoutes.occupationalPhysicianService, mapping: 'direct' },
  { id: 'ERGONOMIE_FYSIEKE_BELASTING', label: 'Ergonoom', slug: expertiseSpecialismSlugs.ERGONOMIE_FYSIEKE_BELASTING, href: publicRoutes.ergonomistService, mapping: 'direct' },
  { id: 'MACHINEVEILIGHEID', label: 'Machineveiligheidsdeskundige', slug: expertiseSpecialismSlugs.MACHINEVEILIGHEID, href: publicRoutes.machineSafetyService, mapping: 'direct' },
  { id: 'GEVAARLIJKE_STOFFEN', label: 'Specialist gevaarlijke stoffen', slug: expertiseSpecialismSlugs.GEVAARLIJKE_STOFFEN, href: publicRoutes.hazardousSubstancesService, mapping: 'direct' },
  { id: 'EXPLOSIEVEILIGHEID', label: 'ATEX- en explosieveiligheidsdeskundige', slug: expertiseSpecialismSlugs.EXPLOSIEVEILIGHEID, href: publicRoutes.explosionSafetyService, mapping: 'direct' },
  { id: 'INCIDENTONDERZOEK', label: 'Incidentonderzoeker', slug: expertiseSpecialismSlugs.INCIDENTONDERZOEK, href: publicRoutes.incidentInvestigationService, mapping: 'functional' },
  { id: 'BRANDVEILIGHEID', label: 'Brandveiligheidsadviseur', slug: expertiseSpecialismSlugs.BRANDVEILIGHEID, href: publicRoutes.fireSafetyService, mapping: 'direct' },
  { id: 'GELUIDSDESKUNDIGE', label: 'Geluidsdeskundige', slug: expertiseSpecialismSlugs.GELUIDSDESKUNDIGE, href: publicRoutes.noiseExpertService, mapping: 'direct' },
  { id: 'STRALINGSDESKUNDIGE', label: 'Stralingsdeskundige', slug: expertiseSpecialismSlugs.STRALINGSDESKUNDIGE, href: publicRoutes.radiationExpertService, mapping: 'direct' },
  { id: 'ARBEIDSPSYCHOLOOG', label: 'Arbeidspsycholoog', slug: expertiseSpecialismSlugs.ARBEIDSPSYCHOLOOG, href: publicRoutes.occupationalPsychologistService, mapping: 'direct' },
  { id: 'VERTROUWENSPERSOON', label: 'Vertrouwenspersoon', slug: expertiseSpecialismSlugs.VERTROUWENSPERSOON, href: publicRoutes.confidentialAdvisorService, mapping: 'direct' },
  { id: 'CASEMANAGER_VERZUIM', label: 'Casemanager verzuim', slug: expertiseSpecialismSlugs.CASEMANAGER_VERZUIM, href: publicRoutes.absenceCaseManagerService, mapping: 'direct' },
  { id: 'PREVENTIEMEDEWERKER', label: 'Preventiemedewerker', slug: expertiseSpecialismSlugs.PREVENTIEMEDEWERKER, href: publicRoutes.preventionOfficerService, mapping: 'functional' },
  { id: 'BHV_DESKUNDIGE', label: 'BHV-deskundige', slug: expertiseSpecialismSlugs.BHV_DESKUNDIGE, href: publicRoutes.bhvService, mapping: 'functional' },
  { id: 'ARBODIENST', label: 'Arbodienst', slug: expertiseSpecialismSlugs.ARBODIENST, href: publicRoutes.occupationalHealthService, mapping: 'direct' },
  { id: 'KEURINGSINSTANTIE', label: 'Keuringsinstantie', slug: expertiseSpecialismSlugs.KEURINGSINSTANTIE, href: publicRoutes.inspectionBodyService, mapping: 'direct' },
] as const satisfies readonly { id: ExpertiseId; label: string; slug: string; href: (typeof publicRoutes)[keyof typeof publicRoutes]; mapping: 'direct' | 'functional' }[]

export const existingCanonicalServiceSlugs = new Set(['hogere-veiligheidskundige', 'arbeidshygienist', 'bedrijfsarts', 'incidentonderzoek', 'preventiemedewerker', 'bhv'])
