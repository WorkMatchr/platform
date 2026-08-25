'use client'

import { LogoutButton } from '@/components/auth/logout-button'
import {
  AccordionNavigation,
  type AccordionNavigationGroup,
} from '@/components/layout/accordion-navigation'

export function AccountNavigationMenu({ groups }: { groups: readonly AccordionNavigationGroup[] }) {
  return (
    <AccordionNavigation
      ariaLabel="Accountnavigatie"
      groups={groups}
      renderGroupAction={(group) => group.key === 'personal' ? (
        <li>
          <LogoutButton className="w-full justify-start border-l-4 border-transparent px-3" variant="ghost" />
        </li>
      ) : null}
    />
  )
}
