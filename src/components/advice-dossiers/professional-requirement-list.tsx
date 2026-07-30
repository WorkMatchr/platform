type PresentedRequirement = Readonly<{
  label: string
  priority?: 'PRIMARY' | 'ADDITIONAL' | 'POSSIBLE'
  reason: string
  expertise: readonly string[]
}>

const priorityLabels = Object.freeze({
  PRIMARY: 'Primair',
  ADDITIONAL: 'Aanvullend',
  POSSIBLE: 'Mogelijk',
} as const)

export function ProfessionalRequirementList({
  primary,
  additional,
  possible,
}: {
  primary: PresentedRequirement | null
  additional: readonly PresentedRequirement[]
  possible: readonly PresentedRequirement[]
}) {
  const requirements = [
    ...(primary ? [{ ...primary, priority: 'PRIMARY' as const }] : []),
    ...additional.map((requirement) => ({
      ...requirement,
      priority: 'ADDITIONAL' as const,
    })),
    ...possible.map((requirement) => ({
      ...requirement,
      priority: 'POSSIBLE' as const,
    })),
  ]

  if (requirements.length === 0) {
    return (
      <p className="mt-2 text-text-secondary">
        Op basis van de beschikbare informatie is nog geen specifieke
        deskundigheid aan te bevelen.
      </p>
    )
  }

  return (
    <ul className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2">
      {requirements.map((requirement) => (
        <li
          key={`${requirement.priority}:${requirement.label}:${requirement.reason}`}
          className="min-w-0 rounded-control border border-border bg-surface-subtle p-4"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-primary">
            {priorityLabels[requirement.priority]}
          </p>
          <p className="mt-1 break-words font-semibold text-brand-dark">
            {requirement.label}
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            {requirement.reason}
          </p>
          {requirement.expertise.length > 0 && (
            <p className="mt-2 break-words text-sm text-brand-dark">
              <span className="font-semibold">Relevante expertise:</span>{' '}
              {requirement.expertise.join(', ')}
            </p>
          )}
        </li>
      ))}
    </ul>
  )
}
