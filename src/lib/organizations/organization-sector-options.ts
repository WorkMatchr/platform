import { getPrisma } from '@/lib/prisma'

export type OrganizationSectorOption = {
  id: string
  name: string
}

export async function getOrganizationSectorOptions(): Promise<OrganizationSectorOption[]> {
  const mappings = await getPrisma().providerSectorTaxonomyMap.findMany({
    where: {
      sector: { isActive: true },
      term: {
        isActive: true,
        version: {
          status: 'PUBLISHED',
          taxonomy: { kind: 'SECTOR' },
        },
      },
    },
    select: {
      sector: { select: { id: true } },
      term: { select: { label: true, sortOrder: true } },
    },
    orderBy: { term: { sortOrder: 'asc' } },
  })

  return mappings.map(({ sector, term }) => ({ id: sector.id, name: term.label }))
}
