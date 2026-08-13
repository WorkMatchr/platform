import { describe, expect, it } from 'vitest'
import { buildAdviceDossierContextAnswerSnapshot } from './advice-dossier-intake-handoff-service'

describe('Adviesdossier naar opdrachtintake', () => {
  it('bewaart alleen beantwoorde contextvragen als leesbare snapshot', () => {
    expect(
      buildAdviceDossierContextAnswerSnapshot({
        contextQuestions: [
          {
            questionKey: 'work_activity',
            textSnapshot: 'Om wat voor werkzaamheden gaat het vooral?',
            sequence: 2,
          },
          {
            questionKey: 'affected_people',
            textSnapshot: 'Speelt dit bij een of meerdere medewerkers?',
            sequence: 1,
          },
        ],
        answers: [
          {
            questionKey: 'work_activity',
            disposition: 'ANSWERED',
            textValue: 'Tillend werk in het magazijn',
            optionValue: null,
            numberValue: null,
            booleanValue: null,
            dateValue: null,
            periodValue: null,
          },
          {
            questionKey: 'affected_people',
            disposition: 'SKIPPED',
            textValue: null,
            optionValue: null,
            numberValue: null,
            booleanValue: null,
            dateValue: null,
            periodValue: null,
          },
        ],
      }),
    ).toEqual([
      {
        questionKey: 'work_activity',
        question: 'Om wat voor werkzaamheden gaat het vooral?',
        answer: 'Tillend werk in het magazijn',
      },
    ])
  })

  it('neemt geen AI-debuggegevens, prompts of modelresponsen op', () => {
    const snapshot = JSON.stringify(
      buildAdviceDossierContextAnswerSnapshot({
        contextQuestions: [
          {
            questionKey: 'work_activity',
            textSnapshot: 'Om wat voor werkzaamheden gaat het vooral?',
            sequence: 1,
          },
        ],
        answers: [
          {
            questionKey: 'work_activity',
            disposition: 'ANSWERED',
            textValue: 'Repeterend werk',
            optionValue: null,
            numberValue: null,
            booleanValue: null,
            dateValue: null,
            periodValue: null,
          },
        ],
      }),
    )

    expect(snapshot).not.toContain('prompt')
    expect(snapshot).not.toContain('model')
    expect(snapshot).not.toContain('confidence')
  })
})
