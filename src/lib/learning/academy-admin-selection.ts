import type { Prisma } from '@/generated/prisma/client'

/** Exact provenance of the existing runtime fixtures; never infer from an email address. */
export const regularAcademyCourses = {
  NOT: {
    OR: [
      { code: 'WL-901', slug: 'academy-fixture-wl-901' },
      { code: 'WL-902', slug: 'academy-fixture-wl-902' },
    ],
    versions: { some: { academyImports: { some: { operatorReference: 'academy-domain-fixture' } } } },
  },
} satisfies Prisma.LearningCourseWhereInput

/** Discount selectors offer registered identities, not domain-only database fixtures. */
export const registeredAcademyAccounts = {
  status: 'ACTIVE', emailVerified: true, accounts: { some: {} },
} satisfies Prisma.UserWhereInput

export const registeredAcademyOrganizations = {
  status: 'ACTIVE', systemKey: null,
  memberships: { some: { status: 'ACTIVE', role: { in: ['OWNER', 'ADMIN'] }, user: registeredAcademyAccounts } },
} satisfies Prisma.OrganizationWhereInput
