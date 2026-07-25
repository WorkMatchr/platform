export function escapeCsv(value: unknown) {
  const text = String(value ?? '')
  return `"${text.replaceAll('"', '""')}"`
}

export function createPlatformReportCsv(data: {
  generatedAt: Date
  dashboard: {
    platform: Record<string, number>
    providers: Record<string, number>
    assignments: Record<string, number>
    operations: Record<string, number | null>
  }
}) {
  const rows: Array<[string, string, unknown]> = [
    ...Object.entries(data.dashboard.platform).map(([metric, value]) => ['Platform', metric, value] as [string, string, unknown]),
    ...Object.entries(data.dashboard.providers).map(([metric, value]) => ['Dienstverleners', metric, value] as [string, string, unknown]),
    ...Object.entries(data.dashboard.assignments).map(([metric, value]) => ['Opdrachten', metric, value] as [string, string, unknown]),
    ...Object.entries(data.dashboard.operations).map(([metric, value]) => ['Operatie', metric, value] as [string, string, unknown]),
  ]
  return [
    ['Gegenereerd', data.generatedAt.toISOString(), ''],
    ['Categorie', 'Metriek', 'Waarde'],
    ...rows,
  ].map((row) => row.map(escapeCsv).join(',')).join('\r\n')
}
