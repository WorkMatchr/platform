'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { completeLearningChapterAction, finishLearningBlockAction, submitLearningAnswerAction } from '@/app/e-learnings/actions'

type QuestionOption = { value: string; text: string }
type LessonBlock = {
  id: string
  position: number
  type: string
  data: unknown
  question: { id: string; type: string; options: QuestionOption[] } | null
}

function objectData(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function text(data: Record<string, unknown>, key: string) {
  return typeof data[key] === 'string' ? data[key] as string : ''
}

function strings(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function QuestionInteraction({ block, onAnswered, readOnly }: { block: LessonBlock; onAnswered: (result: { correct: boolean; feedback: string }) => void; readOnly: boolean }) {
  const [answer, setAnswer] = useState<string | string[] | Record<string, string>>('')
  const [message, setMessage] = useState('')
  const [answeredCorrectly, setAnsweredCorrectly] = useState(false)
  const submitting = useRef(false)
  const [busy, startTransition] = useTransition()
  const data = objectData(block.data)
  const question = block.question
  if (!question) return <p role="alert">Deze oefenvraag is niet beschikbaar.</p>

  const options = question.options
  const submit = (submittedAnswer: string | string[] | Record<string, string>) => {
    if (readOnly || answeredCorrectly || submitting.current) return
    submitting.current = true
    setMessage('')
    startTransition(async () => {
      try {
        const result = await submitLearningAnswerAction(block.id, submittedAnswer)
        if (!result.ok) {
          setMessage(result.message)
          return
        }
        const feedback = result.correct ? result.feedback.replace(/^Nog niet[.!]?\s*/i, '') : result.feedback
        setMessage(`${result.correct ? 'Goed gezien.' : 'Nog niet helemaal.'} ${feedback}`)
        if (result.correct) setAnsweredCorrectly(true)
        onAnswered({ correct: result.correct, feedback: result.feedback })
      } catch {
        setMessage('Uw antwoord kon tijdelijk niet worden opgeslagen. Probeer het opnieuw.')
      } finally {
        submitting.current = false
      }
    })
  }

  const disabled = readOnly || busy || answeredCorrectly
  const matchingIncomplete = question.type === 'SORTING' && Array.isArray(data.items) && Array.isArray(data.categories)
    && data.items.some((item) => !objectData(answer)[text(objectData(item), 'value')])

  const renderOptions = () => {
    if (question.type === 'MULTI_CHOICE') {
      const selected = Array.isArray(answer) ? answer : []
      return (
        <fieldset className="space-y-3">
          <legend className="mb-3 font-semibold">Kies alle passende antwoorden</legend>
          {options.map((option) => (
            <label key={option.value} className="flex min-h-12 cursor-pointer items-start gap-3 rounded-control border border-border bg-surface p-3">
              <input
                type="checkbox"
                value={option.value}
                checked={selected.includes(option.value)}
                disabled={disabled}
                onChange={(event) => setAnswer(event.target.checked ? [...selected, option.value] : selected.filter((value) => value !== option.value))}
                className="mt-1 size-5 shrink-0 accent-brand-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              />
              <span>{option.text}</span>
            </label>
          ))}
        </fieldset>
      )
    }

    if (question.type === 'SORTING' && Array.isArray(data.items) && Array.isArray(data.categories)) {
      const categories = strings(data.categories)
      const items = data.items.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
      const selected = objectData(answer) as Record<string, string>
      return (
        <fieldset className="space-y-4">
          <legend className="mb-3 font-semibold">Kies per voorbeeld de juiste categorie</legend>
          {items.map((item) => {
            const value = text(item, 'value')
            return (
              <div key={value} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_12rem] sm:items-center">
                <label htmlFor={`${block.id}-${value}`} className="font-medium">{text(item, 'text')}</label>
                <select id={`${block.id}-${value}`} disabled={disabled} value={typeof selected[value] === 'string' ? selected[value] as string : ''}
                  onChange={(event) => setAnswer({ ...selected, [value]: event.target.value })}
                  className="min-h-11 rounded-control border border-border bg-surface px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
                  <option value="">Kies een categorie</option>
                  {categories.map((category) => <option value={category.toLowerCase()} key={category}>{category}</option>)}
                </select>
              </div>
            )
          })}
        </fieldset>
      )
    }

    if (question.type === 'SORTING') {
      // Ordering seeds use canonical option order. Reverse presentation consistently
      // across hydration/reloads without exposing correctness to the client.
      const presented = [...options].reverse()
      const selected = Array.isArray(answer) ? answer : presented.map((option) => option.value)
      return (
        <fieldset className="space-y-3">
          <legend className="mb-3 font-semibold">Kies per onderdeel de plek in de volgorde</legend>
          {presented.map((option) => (
            <div key={option.value} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_9rem] sm:items-center">
              <label htmlFor={`${block.id}-${option.value}`} className="font-medium">{option.text}</label>
              <select id={`${block.id}-${option.value}`} disabled={disabled} value={String(selected.indexOf(option.value) + 1)}
                onChange={(event) => {
                  const order = [...selected]
                  const oldPosition = order.indexOf(option.value)
                  const newPosition = Number(event.target.value) - 1
                  order.splice(oldPosition, 1)
                  order.splice(newPosition, 0, option.value)
                  setAnswer(order)
                }}
                className="min-h-11 rounded-control border border-border bg-surface px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
                {options.map((_, index) => <option key={index} value={index + 1}>Stap {index + 1}</option>)}
              </select>
            </div>
          ))}
        </fieldset>
      )
    }

    return (
      <fieldset className="space-y-3">
        <legend className="mb-3 font-semibold">Kies één antwoord</legend>
        {options.map((option) => (
          <label key={option.value} className="flex min-h-12 cursor-pointer items-start gap-3 rounded-control border border-border bg-surface p-3">
            <input type="radio" name={`answer-${block.id}`} value={option.value} disabled={disabled} checked={answer === option.value}
              onChange={() => {
                setAnswer(option.value)
                if (['SINGLE_CHOICE', 'TRUE_FALSE', 'CASE_STUDY'].includes(question.type)) submit(option.value)
              }}
              className="mt-1 size-5 shrink-0 accent-brand-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus" />
            <span>{option.text}</span>
          </label>
        ))}
      </fieldset>
    )
  }

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-brand-dark">{text(data, 'title') || 'Oefenvraag'}</h2>
      {text(data, 'body') && <p className="leading-7">{text(data, 'body')}</p>}
      <p className="text-lg font-semibold leading-8">{text(data, 'prompt') || 'Beantwoord de vraag.'}</p>
      {renderOptions()}
      {['MULTI_CHOICE', 'SORTING'].includes(question.type) && <Button onClick={() => submit(answer)} disabled={disabled || matchingIncomplete || (Array.isArray(answer) ? answer.length === 0 : typeof answer === 'string' ? answer.length === 0 : Object.keys(answer).length === 0)}>
        {busy ? 'Antwoord opslaan…' : readOnly ? 'Alleen bekijken' : 'Antwoord controleren'}
      </Button>}
      {readOnly && <p className="text-sm text-text-secondary">U bekijkt dit hoofdstuk opnieuw. Antwoorden worden niet opgeslagen.</p>}
      {message && <p aria-live="polite" role={message.startsWith('Kies') || message.startsWith('Uw antwoord kon') ? 'alert' : 'status'} className="min-w-0 whitespace-normal break-words [overflow-wrap:anywhere] rounded-control border border-border bg-brand-primary-subtle p-4 leading-7">{message}</p>}
    </div>
  )
}

export function LessonContent({ block, index, onAnswered, readOnly = false }: { block: LessonBlock; index: number; onAnswered: (result: { correct: boolean; feedback: string }) => void; readOnly?: boolean }) {
  const data = objectData(block.data)
  if (['SINGLE_CHOICE', 'MULTI_CHOICE', 'TRUE_FALSE', 'SORTING', 'CASE_STUDY'].includes(block.type) || (block.type === 'PROCESS' && block.question?.type === 'SORTING')) {
    return <QuestionInteraction block={block} onAnswered={onAnswered} readOnly={readOnly} />
  }
  if (block.type === 'HEADING') return <div className="space-y-4">{text(data, 'eyebrow') && <p className="text-sm font-semibold uppercase tracking-wide text-brand-primary">{text(data, 'eyebrow')}</p>}{index === 0 ? <h1 className="text-3xl font-bold leading-tight text-brand-dark sm:text-4xl">{text(data, 'title')}</h1> : <h2 className="text-2xl font-bold leading-tight text-brand-dark">{text(data, 'title')}</h2>}{text(data, 'subtitle') && <p className="text-lg leading-8 text-text-secondary">{text(data, 'subtitle')}</p>}{text(data, 'body') && <p className="leading-7">{text(data, 'body')}</p>}</div>
  if (block.type === 'TEXT') return <section className="space-y-4">{text(data, 'title') && <h2 className="text-2xl font-bold text-brand-dark">{text(data, 'title')}</h2>}{strings(data.paragraphs).map((paragraph) => <p className="text-base leading-8" key={paragraph}>{paragraph}</p>)}</section>
  if (block.type === 'CALLOUT') return <aside className="rounded-card border border-brand-primary/25 bg-brand-primary-subtle p-5 sm:p-7" aria-label={text(data, 'label') || 'Toelichting'}><p className="mb-2 text-xs font-bold tracking-wider text-brand-primary">{text(data, 'label')}</p>{text(data, 'title') && <h2 className="mb-2 text-xl font-bold text-brand-dark">{text(data, 'title')}</h2>}{text(data, 'body') && <p className="leading-7">{text(data, 'body')}</p>}{strings(data.items).length > 0 && <ul className="mt-3 list-disc space-y-2 pl-5">{strings(data.items).map((item) => <li key={item}>{item}</li>)}</ul>}</aside>
  if (block.type === 'PROCESS') return <div className="space-y-7"><section className="space-y-4"><h2 className="text-2xl font-bold text-brand-dark">{text(data, 'title') || 'De stappen'}</h2><ol className="space-y-3">{strings(data.steps).map((step, position) => <li key={`${position}-${step}`} className="flex items-start gap-3 rounded-control border border-border bg-surface-subtle p-3"><span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-dark font-bold text-text-on-dark">{position + 1}</span><span className="pt-1 leading-6">{step}</span></li>)}</ol>{text(data, 'footer') && <p className="leading-7 text-text-secondary">{text(data, 'footer')}</p>}</section>{block.question && <QuestionInteraction block={block} onAnswered={onAnswered} readOnly={readOnly} />}</div>
  if (block.type === 'SUMMARY') return <section className="space-y-4"><h2 className="text-2xl font-bold text-brand-dark">{text(data, 'title') || 'Samenvatting'}</h2><ul className="space-y-3">{strings(data.items).map((item) => <li key={item} className="flex items-start gap-3"><span aria-hidden="true" className="mt-2 size-2 shrink-0 rounded-full bg-brand-primary" /><span className="leading-7">{item}</span></li>)}</ul></section>
  if (block.type === 'IMAGE') return <figure className="rounded-card border border-border bg-surface-subtle p-6"><p className="text-sm text-text-secondary">{text(data, 'alt') || 'Illustratie volgt na contentreview.'}</p></figure>
  return <p role="status" className="rounded-control border border-border bg-surface-subtle p-4">Dit contentonderdeel kan niet worden weergegeven.</p>
}

export function LessonPlayer({
  courseTitle,
  chapterId,
  chapterTitle,
  chapterPosition,
  courseSlug,
  courseVersion,
  chapterNavigation,
  estimatedDurationLabel,
  learningObjectives,
  blocks,
  completed,
  lastCompletedBlockId,
  progressPercentage,
  questionStats,
  readOnly = false,
}: {
  courseTitle: string
  chapterId: string
  chapterTitle: string
  chapterPosition: number
  courseSlug: string
  courseVersion: string
  chapterNavigation: Array<{ id: string; slug: string; title: string; position: number; progressStatus: string | null }>
  estimatedDurationLabel: string
  learningObjectives: string[]
  blocks: LessonBlock[]
  completed: boolean
  lastCompletedBlockId: string | null
  progressPercentage: number
  questionStats: { correctQuestionIds: string[]; total: number }
  readOnly?: boolean
}) {
  const savedIndex = lastCompletedBlockId ? blocks.findIndex((block) => block.id === lastCompletedBlockId) : -1
  const [index, setIndex] = useState(readOnly ? 0 : completed ? blocks.length : Math.max(0, savedIndex + 1))
  const [progress, setProgress] = useState(progressPercentage)
  const [correctQuestionIds, setCorrectQuestionIds] = useState(() => new Set(questionStats.correctQuestionIds))
  const [chapterCompleted, setChapterCompleted] = useState(completed && !readOnly)
  const [notice, setNotice] = useState('')
  const [busy, startTransition] = useTransition()
  const current = index < blocks.length ? blocks[index] : undefined
  const lessonRef = useRef<HTMLElement>(null)
  const completionHeadingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    const heading = completionHeadingRef.current ?? lessonRef.current?.querySelector<HTMLElement>('h1, h2') ?? lessonRef.current?.querySelector<HTMLElement>('article')
    if (heading) {
      heading.tabIndex = -1
      heading.focus()
    }
  }, [index, chapterCompleted])
  const chaptersByPosition = new Map(chapterNavigation.map((chapter) => [chapter.position, chapter]))
  const navigationItems = Array.from({ length: 10 }, (_, index) => {
    const position = index + 1
    const chapter = chaptersByPosition.get(position)
    return chapter
        ? <li key={chapter.id} aria-current={chapter.position === chapterPosition ? 'step' : undefined} className={chapter.position === chapterPosition ? 'font-semibold text-brand-dark' : 'text-brand-primary'}>
          <Link href={`/e-learnings/${courseSlug}/leren/${chapter.slug}?version=${encodeURIComponent(courseVersion)}${chapter.progressStatus === 'COMPLETED' ? '&opnieuw=1' : ''}`} className="hover:underline">{chapter.position}. {chapter.title}</Link>
        </li>
      : <li key={position} className="text-text-secondary">{position}. Nog niet beschikbaar</li>
  })

  const goNext = () => {
    if (!current) return
    startTransition(async () => {
      if (!readOnly && !current.question) {
        const result = await finishLearningBlockAction(current.id)
        if (!result.ok) {
          setNotice(result.message)
          return
        }
        const nextProgress = Math.min(100, Math.floor(((index + 1) / blocks.length) * 100))
        setProgress(nextProgress)
      }
      setNotice('')
      setIndex((value) => Math.min(value + 1, blocks.length))
    })
  }

  const finishChapter = () => {
    startTransition(async () => {
      const result = await completeLearningChapterAction(chapterId)
      if (!result.ok) {
        setNotice(result.message)
        return
      }
      setProgress(100)
      setChapterCompleted(true)
      setNotice('')
    })
  }

  if (chapterCompleted) {
    return (
      <Card className="mx-auto max-w-3xl space-y-6">
        <p className="text-sm font-bold uppercase tracking-wide text-success">Hoofdstuk voltooid</p>
        <h1 ref={completionHeadingRef} tabIndex={-1} className="text-3xl font-bold text-brand-dark">Hoofdstuk {chapterPosition} afgerond — {chapterTitle}</h1>
        <p className="text-lg leading-8">U hebt de inhoud doorlopen. De oefenvragen zijn bedoeld om te leren en bepalen niet of u het hoofdstuk mag afronden.</p>
        {learningObjectives.length > 0 && <section aria-labelledby="completion-objectives"><h2 id="completion-objectives" className="font-semibold text-brand-dark">U kunt nu</h2><ul className="mt-2 list-disc space-y-2 pl-5 leading-7">{learningObjectives.map((objective) => <li key={objective}>{objective}</li>)}</ul></section>}
        <div className="rounded-control border border-border bg-surface-subtle p-4">
          <p className="font-semibold text-brand-dark">Resultaat oefenvragen</p>
          <p className="mt-1">{correctQuestionIds.size} van {questionStats.total} onderwerpen laatst correct beantwoord</p>
        </div>
        <div className="flex flex-wrap gap-3"><Link href={`/e-learnings/${courseSlug}`} className="inline-flex min-h-11 items-center rounded-control bg-brand-primary px-5 font-semibold text-text-on-dark">Terug naar de cursus</Link><Link href="/e-learnings/mijn" className="inline-flex min-h-11 items-center rounded-control border border-border px-5 font-semibold text-brand-dark">Mijn e-learnings</Link></div>
        <p className="rounded-control border border-border bg-surface-subtle p-4 text-sm text-text-secondary">Andere hoofdstukken zijn nog in ontwikkeling. Deze prototypecursus is geen certificering of bewijs van een professionele kwalificatie.</p>
      </Card>
    )
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-5 py-6 sm:px-8 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10 lg:py-10">
      <aside className="space-y-4">
        <Link href={`/e-learnings/${courseSlug}`} className="text-sm font-semibold text-brand-primary hover:underline">← {courseTitle}</Link>
        <div className="lg:hidden"><details className="rounded-card border border-border bg-surface p-4"><summary className="min-h-8 cursor-pointer font-semibold text-brand-dark">Hoofdstuknavigatie</summary><ol className="mt-3 space-y-2 text-sm">{navigationItems}</ol></details></div>
        <nav aria-label="Hoofdstuknavigatie" className="hidden rounded-card border border-border bg-surface p-4 lg:block"><p className="mb-3 text-xs font-bold uppercase tracking-wide text-text-secondary">Deze cursus</p><ol className="space-y-3 text-sm">{navigationItems}</ol></nav>
      </aside>
      <main ref={lessonRef} className="min-w-0">
        <div className="mb-6 space-y-2"><div className="flex items-center justify-between gap-3 text-sm"><span>Hoofdstuk {chapterPosition} van 10</span><span>{estimatedDurationLabel}</span></div><div className="h-2 overflow-hidden rounded-full bg-brand-primary-subtle" role="progressbar" aria-label="Hoofdstukvoortgang" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><div className="h-full bg-brand-primary transition-[width]" style={{ width: `${progress}%` }} /></div><p className="text-sm text-text-secondary">{progress}% van dit hoofdstuk doorlopen</p></div>
        {current ? <Card className="mx-auto max-w-3xl space-y-7" key={current.id}><LessonContent block={current} index={index} readOnly={readOnly} onAnswered={({ correct }) => {
          setCorrectQuestionIds((previous) => {
            const updated = new Set(previous)
            if (current.question) {
              if (correct) updated.add(current.question.id)
              else updated.delete(current.question.id)
            }
            return updated
          })
          setProgress(Math.min(100, Math.floor(((index + 1) / blocks.length) * 100)))
        }} />{notice && <p role="alert" className="text-sm text-error">{notice}</p>}<div className="flex items-center justify-between border-t border-border pt-5"><Button variant="outline" onClick={() => setIndex((value) => Math.max(0, value - 1))} disabled={index === 0 || busy}>Vorige</Button><Button onClick={goNext} disabled={busy || (!readOnly && Boolean(current.question) && progress < Math.floor(((index + 1) / blocks.length) * 100))}>{index === blocks.length - 1 ? 'Naar afronding' : 'Volgende'}</Button></div></Card> : <Card className="mx-auto max-w-3xl space-y-5"><h1 className="text-2xl font-bold text-brand-dark">U bent aan het einde van hoofdstuk {chapterPosition}</h1><p className="leading-7">{readOnly ? 'U hebt dit hoofdstuk al afgerond. Uw voortgang is behouden.' : 'Rond dit hoofdstuk af wanneer u klaar bent.'}</p>{notice && <p role="alert">{notice}</p>}{readOnly ? <Link href="/e-learnings/mijn" className="inline-flex min-h-11 items-center font-semibold text-brand-primary">Mijn e-learnings</Link> : <Button onClick={finishChapter} disabled={busy}>{busy ? 'Afronden…' : 'Hoofdstuk afronden'}</Button>}</Card>}
      </main>
    </div>
  )
}
