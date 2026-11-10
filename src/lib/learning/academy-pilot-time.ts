export const maxObservationGapMs = 60_000

// Only two observations in the same visible study context bound an interval.
export function measuredInterval(previous: Date | null, now: Date, sameClock: boolean, sameContext: boolean) {
  const elapsed = previous ? now.getTime() - previous.getTime() : 0
  return {
    activeMs: sameClock && sameContext && elapsed > 0 && elapsed <= maxObservationGapMs ? elapsed : 0,
    incomplete: Boolean(previous) && (!sameClock || elapsed > maxObservationGapMs),
  }
}

export function pilotDistribution(values: number[]) {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return {
    min: sorted[0],
    max: sorted.at(-1)!,
    mean: sorted.reduce((a, b) => a + b, 0) / sorted.length,
    median: (sorted[middle] + sorted[Math.floor((sorted.length - 1) / 2)]) / 2,
  }
}
