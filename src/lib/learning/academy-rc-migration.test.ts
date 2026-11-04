import { readFileSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const original = 'prisma/migrations/20261026090000_restore_learning_exam_question_immutability/migration.sql'
const name = '20261029210000_restore_integrated_learning_question_policy'
const sql = readFileSync(`prisma/migrations/${name}/migration.sql`, 'utf8')

describe('integrated main/Academy publication helper convergence', () => {
  it('reasserts the accepted main guard without rewriting existing migrations', () => {
    const body = (value: string) => value.slice(value.indexOf('CREATE OR REPLACE FUNCTION')).replaceAll('\r\n', '\n')
    expect(body(sql)).toBe(body(readFileSync(original, 'utf8')))
    expect(sql).toContain('SECURITY INVOKER')
    expect(sql).toContain('SET search_path = pg_catalog')
  })
  it('is ordered after both the old Academy guard and current main guard', () => {
    const chain = readdirSync('prisma/migrations').sort()
    for (const old of ['20261024190000_restore_exam_question_immutability', '20261026090000_restore_learning_exam_question_immutability', '20261029100000_add_academy_pricing_promotions']) expect(chain.indexOf(name)).toBeGreaterThan(chain.indexOf(old))
  })
  it('keeps course, exam, retention, weekly and annual history protected without data DML', () => {
    for (const table of ['LearningContentBlock', 'LearningCourseVersion', 'LearningExamVersion', 'LearningRetentionQuestion', 'LearningRetentionWeeklyQuestion', 'LearningRetentionAnnualQuestion']) expect(sql).toContain(`public."${table}"`)
    expect(sql).not.toMatch(/\b(?:DROP|TRUNCATE|DELETE|INSERT|UPDATE)\b/i)
  })
})
