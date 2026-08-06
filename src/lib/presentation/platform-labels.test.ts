import { describe, expect, it } from 'vitest'
import {
  membershipStatusLabels,
  notificationOutboxStatusLabels,
  organizationRoleLabels,
  organizationStatusLabels,
  platformRoleLabels,
  providerTaxonomyVersionStatusLabels,
  questionnaireVersionStatusLabels,
  userStatusLabels,
} from './platform-labels'

describe('platformbrede presentatielabels', () => {
  it('presenteert MEMBER consequent als Medewerker', () => {
    expect(organizationRoleLabels.MEMBER).toBe('Medewerker')
  })

  it('heeft voor iedere ondersteunde platformstatus een Nederlands label', () => {
    for (const labels of [
      membershipStatusLabels,
      notificationOutboxStatusLabels,
      organizationStatusLabels,
      platformRoleLabels,
      providerTaxonomyVersionStatusLabels,
      questionnaireVersionStatusLabels,
      userStatusLabels,
    ]) {
      expect(Object.values(labels).every((label) => label.length > 0 && !label.includes('_'))).toBe(true)
    }
  })
})
