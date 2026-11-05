export const landingPaths = [
  '/', '/voor-opdrachtgevers', '/voor-professionals', '/diensten', '/diensten/rie',
  '/diensten/hogere-veiligheidskundige', '/diensten/middelbare-veiligheidskundige',
  '/diensten/preventiemedewerker', '/diensten/incidentonderzoek', '/opdracht-starten',
  '/wijzers/compliance', '/wijzers/compliance/scan', '/contact',
] as const
export const conversionNames = [
  'advice_start', 'advice_complete', 'assignment_start', 'assignment_published',
  'client_registration_request_accepted', 'professional_registration_request_accepted',
  'contact_request_accepted', 'compliance_intake_start', 'free_intake_complete',
] as const
export type ConversionName = typeof conversionNames[number]
export type Measurement = { version: 1; name: ConversionName } | { version: 1; name: 'landing_view'; path: typeof landingPaths[number] }

/** An approved future adapter must also disable automatic URL/referrer/form collection.
 * No provider, persistent queue, identifiers, cookies or network transport is installed here.
 */
export function createMeasurement({ enabled, consent, receive }: {
  enabled: boolean; consent: () => boolean; receive: (event: Measurement) => void
}) {
  return (name: string, path?: string): boolean => {
    try {
      if (!enabled || !consent()) return false
      if (name === 'landing_view') {
        if (!landingPaths.some(allowed => allowed === path)) return false
        receive({ version: 1, name, path: path as typeof landingPaths[number] })
      } else {
        if (!conversionNames.some(allowed => allowed === name) || path !== undefined) return false
        receive({ version: 1, name: name as ConversionName })
      }
      return true
    } catch { return false } // Measurement must never interrupt the business action.
  }
}

// Release is deliberately CLOSED. Activation requires a reviewed consent/provider change.
// An environment variable alone cannot enable external collection.
export const measure = createMeasurement({ enabled: false, consent: () => false, receive: () => {} })
