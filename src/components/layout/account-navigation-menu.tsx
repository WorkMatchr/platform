'use client'

import {
  AccordionNavigation,
  type AccordionNavigationGroup,
} from '@/components/layout/accordion-navigation'

export function AccountNavigationMenu({ groups }: { groups: readonly AccordionNavigationGroup[] }) {
  return (
    <AccordionNavigation
      ariaLabel="Accountnavigatie"
      groups={groups}
    />
  )
}
