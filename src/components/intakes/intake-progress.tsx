import type { IntakeProgress as IntakeProgressValue } from '@/lib/intakes/intake-types'

export function IntakeProgress({ progress, compact = false }: { progress: IntakeProgressValue; compact?: boolean }) {
  const percentage = progress.totalQuestionCount
    ? Math.round((progress.answeredQuestionCount / progress.totalQuestionCount) * 100)
    : 0

  return (
    <div>
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="font-semibold text-brand-dark">Voortgang</span>
        <span className="text-text-secondary">
          {progress.answeredQuestionCount} van {progress.totalQuestionCount} vragen ingevuld
        </span>
      </div>
      <progress
        className={`mt-2 w-full overflow-hidden rounded-full accent-brand-primary ${compact ? 'h-2' : 'h-3'}`}
        max={progress.totalQuestionCount || 1}
        value={progress.answeredQuestionCount}
        aria-label={`${percentage}% van de intake ingevuld`}
      />
    </div>
  )
}
