import { describe, expect, it, vi } from 'vitest'
import { requirePlatformQualificationBasis } from './provider-requirements'

const at = new Date('2026-07-14T12:00:00.000Z')

function transaction(overrides: Record<string, unknown> = {}) {
  return {
    providerTermDocumentVersion: { findMany: vi.fn().mockResolvedValue([]) },
    providerTermAcceptance: { count: vi.fn().mockResolvedValue(0) },
    providerInsuranceRequirementConfig: { findFirst: vi.fn().mockResolvedValue(null) },
    providerInsurance: { findMany: vi.fn().mockResolvedValue([]) },
    ...overrides,
  } as never
}

describe('fail-closed platformkwalificatiebasis', () => {
  it('blokkeert wanneer actuele voorwaardenconfiguratie ontbreekt', async () => {
    await expect(requirePlatformQualificationBasis(transaction(), 'provider', at)).rejects.toMatchObject({ code: 'TERMS_NOT_CONFIGURED' })
  })

  it('blokkeert wanneer verzekeringsvereisten ontbreken', async () => {
    const codes = ['PLATFORM_TERMS', 'PRIVACY_NOTICE', 'PROVIDER_DATA_ACCURACY', 'ORGANIZATION_AUTHORITY', 'CONFLICTS_OF_INTEREST', 'LEGAL_COMPLIANCE']
    await expect(requirePlatformQualificationBasis(transaction({
      providerTermDocumentVersion: { findMany: vi.fn().mockResolvedValue(codes.map((code) => ({ id: code, document: { code } }))) },
      providerTermAcceptance: { count: vi.fn().mockResolvedValue(codes.length) },
    }), 'provider', at)).rejects.toMatchObject({ code: 'INSURANCE_REQUIREMENTS_NOT_CONFIGURED' })
  })
})
