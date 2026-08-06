const serviceLabelOverrides: Readonly<Record<string, string>> = {
  RISK_ASSESSMENT: 'RI&E',
  IMPLEMENTATION_SUPPORT: 'Ondersteuning bij implementatie',
  TRAINING: 'Opleiding en training',
}

export function presentProviderServiceTerm<T extends { code: string; label: string } | null>(term: T): T {
  if (!term) return term
  const label = serviceLabelOverrides[term.code]
  return label ? { ...term, label } : term
}
