export function LastReviewed({ date }: { date: string }) {
  const label = new Intl.DateTimeFormat('nl-NL', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`))
  return <p className="text-body-sm text-text-secondary">Laatst inhoudelijk gecontroleerd: <time dateTime={date}>{label}</time></p>
}
