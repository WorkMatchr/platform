'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { fieldClassName } from '@/components/auth/auth-shell'
import { saveCourse, copyCourse } from '@/app/platformbeheer/academy/cursussen/actions'
import { emptyManagement, type AuthoringCourse } from '@/lib/learning/academy-authoring-contract'
import { AcademyMediaUpload } from './academy-media-upload'
import { LessonContent } from './lesson-player'
const question = () => ({
  text: '',
  explanation: '',
  multiple: false,
  options: [
    { text: '', correct: true },
    { text: '', correct: false },
  ],
})
const lesson = () => ({ title: '', type: 'TEXT' as const, body: '', media: '', alt: '', captions: '' })
const empty: AuthoringCourse = {
  management: emptyManagement,
  code: '',
  slug: '',
  title: '',
  description: '',
  image: '',
  category: '',
  level: '',
  version: '1.0',
  chapters: [{ title: '', minutes: 30, lessons: [lesson()], check: question() }],
  questions: [question()],
  passingScore: 1,
  attemptLimit: null,
  certificate: true,
}
type Q = AuthoringCourse['questions'][number]
function QuestionEditor({ value, onChange, label }: { value: Q; onChange: (q: Q) => void; label: string }) {
  return (
    <fieldset className="space-y-2 rounded-control border border-border p-4">
      <legend className="font-semibold">{label}</legend>
      <label className="block">
        Vraag
        <textarea
          className={fieldClassName}
          value={value.text}
          onChange={(e) => onChange({ ...value, text: e.target.value })}
        />
      </label>
      <label className="block">
        Toelichting
        <textarea
          className={fieldClassName}
          value={value.explanation}
          onChange={(e) => onChange({ ...value, explanation: e.target.value })}
        />
      </label>
      <label className="block">
        Getoetst leerdoel
        <input
          className={fieldClassName}
          value={value.objective ?? ''}
          onChange={(e) => onChange({ ...value, objective: e.target.value })}
        />
      </label>
      <Button
        type="button"
        variant="outline"
        onClick={() =>
          onChange({
            ...value,
            multiple: false,
            options: [
              { text: 'Waar', correct: true },
              { text: 'Onwaar', correct: false },
            ],
          })
        }
      >
        Waar/onwaar instellen
      </Button>
      <label className="flex gap-2">
        <input
          type="checkbox"
          checked={value.multiple}
          onChange={(e) =>
            onChange({
              ...value,
              multiple: e.target.checked,
              options: value.options.map((o, i) => ({
                ...o,
                correct: e.target.checked ? o.correct : i === 0,
              })),
            })
          }
        />
        Meerdere juiste antwoorden
      </label>
      {value.options.map((o, i) => (
        <div key={i} className="flex flex-wrap items-center gap-3">
          <label className="grow">
            Antwoord {i + 1}
            <input
              className={fieldClassName}
              value={o.text}
              onChange={(e) =>
                onChange({
                  ...value,
                  options: value.options.map((a, n) => (n === i ? { ...a, text: e.target.value } : a)),
                })
              }
            />
          </label>
          <label className="flex gap-2">
            <input
              type="checkbox"
              checked={o.correct}
              onChange={(e) =>
                onChange({
                  ...value,
                  options: value.options.map((a, n) => ({
                    ...a,
                    correct: n === i ? e.target.checked : value.multiple ? a.correct : false,
                  })),
                })
              }
            />
            Juist
          </label>
          <Button
            type="button"
            variant="outline"
            disabled={value.options.length <= 2}
            onClick={() => onChange({ ...value, options: value.options.filter((_, n) => n !== i) })}
          >
            Antwoord verwijderen
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        disabled={value.options.length >= 8}
        onClick={() => onChange({ ...value, options: [...value.options, { text: '', correct: false }] })}
      >
        Antwoord toevoegen
      </Button>
    </fieldset>
  )
}
export function AcademyCourseEditor({
  initial = empty,
  id,
  revision = 0,
  readOnly = false,
}: {
  initial?: AuthoringCourse
  id?: string
  revision?: number
  readOnly?: boolean
}) {
  const [value, setValue] = useState(initial),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false),
    [preview, setPreview] = useState(false)
  const router = useRouter()
  const management = value.management
  const changeManagement = (patch: Partial<typeof emptyManagement>) =>
    setValue({ ...value, management: { ...emptyManagement, ...management, ...patch } })
  const [newVersion, setNewVersion] = useState('')
  const field = (
    key: 'code' | 'slug' | 'title' | 'description' | 'image' | 'category' | 'level' | 'version',
    label: string,
  ) => (
    <label className="block" key={key}>
      {label}
      <input
        className={fieldClassName}
        value={value[key]}
        onChange={(e) => setValue({ ...value, [key]: e.target.value })}
      />
    </label>
  )
  const chapter = (i: number, patch: Partial<AuthoringCourse['chapters'][number]>) =>
    setValue({ ...value, chapters: value.chapters.map((c, n) => (n === i ? { ...c, ...patch } : c)) })
  const move = <T,>(items: T[], i: number, d: number) => {
    const next = [...items]
    ;[next[i], next[i + d]] = [next[i + d], next[i]]
    return next
  }
  return (
    <div className="space-y-4">
      {id && (
        <section className="space-y-2">
          <label className="block">
            Nieuwe conceptversie
            <input
              className={fieldClassName}
              value={newVersion}
              maxLength={30}
              onChange={(e) => setNewVersion(e.target.value)}
            />
          </label>
          <Button
            variant="outline"
            disabled={busy || !newVersion || newVersion === value.version}
            onClick={async () => {
              setBusy(true)
              try {
                const result = await copyCourse(id, revision, newVersion)
                if (result.ok) router.push('/platformbeheer/academy/cursussen/' + result.id)
                else setMessage(result.message)
              } finally {
                setBusy(false)
              }
            }}
          >
            Versie kopiëren
          </Button>
        </section>
      )}
      <Button variant="outline" onClick={() => setPreview(!preview)}>
        {preview ? 'Bewerken' : 'Preview bekijken'}
      </Button>
      {preview ? (
        <div className="space-y-8">
          {value.chapters.map((c, i) => (
            <section key={i}>
              <h2 className="text-2xl font-bold">{c.title}</h2>
              {c.lessons.map((l, n) => (
                <LessonContent
                  key={n}
                  index={n}
                  block={{
                    id: String(n),
                    position: n + 1,
                    type: l.type,
                    data: {
                      title: l.title,
                      paragraphs: l.body.split('\n'),
                      src: l.media,
                      alt: l.alt,
                      captions: l.captions,
                      transcript: l.body,
                      format: l.format,
                      objective: l.objective,
                    },
                    question: null,
                  }}
                  onAnswered={() => {}}
                  readOnly
                />
              ))}
            </section>
          ))}
        </div>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            setBusy(true)
            try {
              const result = await saveCourse(value, id, revision)
              setMessage(result.ok ? 'Cursusconcept opgeslagen.' : result.message)
              if (result.ok) {
                router.push(`/platformbeheer/academy/cursussen/${result.id}`)
                router.refresh()
              }
            } finally {
              setBusy(false)
            }
          }}
        >
          <fieldset disabled={readOnly || busy} className="space-y-6">
            <legend className="sr-only">Cursusinhoud</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              {field('code', 'Cursuscode (WL-nummer)')}
              {field('slug', 'Adresnaam')}
              {field('title', 'Titel')}
              {field('description', 'Omschrijving')}
              {field('category', 'Categorie')}
              {field('level', 'Niveau')}
              {field('version', 'Versie')}
              {field('image', 'Afbeelding (goedgekeurd mediapad)')}
              <AcademyMediaUpload onUploaded={(image) => setValue({ ...value, image })} />
            </div>
            {management && (
              <section className="grid gap-4 sm:grid-cols-2">
                <h2 className="text-xl font-semibold sm:col-span-2">Cursusgegevens en prijs</h2>
                {(
                  [
                    ['description', 'Uitgebreide omschrijving'],
                    ['audience', 'Doelgroep'],
                    ['prerequisites', 'Voorkennis'],
                    ['objectives', 'Leerdoelen'],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key}>
                    {label}
                    <textarea
                      className={fieldClassName}
                      value={management[key]}
                      onChange={(e) => changeManagement({ [key]: e.target.value })}
                    />
                  </label>
                ))}
                {(
                  [
                    ['regularGrossCents', 'Reguliere consumentenprijs'],
                    ['promotionalGrossCents', 'Actieprijs (optioneel)'],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key}>
                    {label} in euro
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="999999.99"
                      className={fieldClassName}
                      defaultValue={management[key] === null ? '' : management[key] / 100}
                      onChange={(e) =>
                        changeManagement({
                          [key]: e.target.value === '' ? null : Math.round(Number(e.target.value) * 100),
                        })
                      }
                    />
                  </label>
                ))}
                <label>
                  Certificaatsjabloon
                  <select
                    className={fieldClassName}
                    value={management.certificate ?? ''}
                    onChange={(e) =>
                      changeManagement({
                        certificate: (e.target.value as typeof management.certificate) || null,
                      })
                    }
                  >
                    <option value="">Kies een sjabloon</option>
                    <option value="STANDARD">Standaard met verificatiecode</option>
                    <option value="COURSE_DESIGN">Actief ontwerp gekoppeld aan deze cursus</option>
                  </select>
                </label>
                <label>
                  E-mailadres inhoudelijke beoordelaar
                  <input
                    type="email"
                    className={fieldClassName}
                    value={management.reviewer}
                    onChange={(e) => changeManagement({ reviewer: e.target.value.trim() })}
                  />
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={management.legalReviewRequired}
                    onChange={(e) => changeManagement({ legalReviewRequired: e.target.checked })}
                  />{' '}
                  Juridische goedkeuring vereist
                </label>
                <label>
                  Geschatte toetsduur in minuten
                  <input
                    type="number"
                    min="0"
                    max="600"
                    className={fieldClassName}
                    value={management.examMinutes ?? 0}
                    onChange={(e) => changeManagement({ examMinutes: Number(e.target.value) })}
                  />
                </label>
                <p>
                  Geschatte totale studieduur inclusief eindtoets:{' '}
                  {value.chapters.reduce((total, ch) => total + ch.minutes, management.examMinutes ?? 0)}{' '}
                  minuten.
                </p>
              </section>
            )}
            {value.chapters.map((c, i) => (
              <section key={i} className="space-y-4 rounded-card border border-border p-5">
                <h2 className="text-xl font-bold">Hoofdstuk {i + 1}</h2>
                <label className="block">
                  Hoofdstuktitel
                  <input
                    className={fieldClassName}
                    value={c.title}
                    onChange={(e) => chapter(i, { title: e.target.value })}
                  />
                </label>
                <label className="block">
                  Studieduur in minuten
                  <input
                    className={fieldClassName}
                    type="number"
                    min={1}
                    value={c.minutes}
                    onChange={(e) => chapter(i, { minutes: Number(e.target.value) })}
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={i === 0}
                    onClick={() => setValue({ ...value, chapters: move(value.chapters, i, -1) })}
                  >
                    Hoofdstuk omhoog
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={i === value.chapters.length - 1}
                    onClick={() => setValue({ ...value, chapters: move(value.chapters, i, 1) })}
                  >
                    Hoofdstuk omlaag
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={value.chapters.length === 1}
                    onClick={() => setValue({ ...value, chapters: value.chapters.filter((_, n) => n !== i) })}
                  >
                    Hoofdstuk verwijderen
                  </Button>
                </div>
                {c.lessons.map((l, n) => {
                  const update = (patch: Partial<typeof l>) =>
                    chapter(i, { lessons: c.lessons.map((a, k) => (k === n ? { ...a, ...patch } : a)) })
                  return (
                    <fieldset key={n} className="space-y-3 border border-border p-4">
                      <legend>Les {n + 1}</legend>
                      <label className="block">
                        Lestitel
                        <input
                          className={fieldClassName}
                          value={l.title}
                          onChange={(e) => update({ title: e.target.value })}
                        />
                      </label>
                      <label className="block">
                        Inhoudstype
                        <select
                          className={fieldClassName}
                          value={l.type}
                          onChange={(e) => update({ type: e.target.value as typeof l.type })}
                        >
                          <option value="TEXT">Tekst</option>
                          <option value="IMAGE">Afbeelding</option>
                        </select>
                      </label>
                      <label className="block">
                        Leerdoel van de les
                        <input
                          className={fieldClassName}
                          value={l.objective ?? ''}
                          onChange={(e) => update({ objective: e.target.value })}
                        />
                      </label>
                      {l.type === 'TEXT' && (
                        <label className="block">
                          Lesvorm
                          <select
                            className={fieldClassName}
                            value={l.format ?? 'PARAGRAPHS'}
                            onChange={(e) => update({ format: e.target.value as typeof l.format })}
                          >
                            <option value="PARAGRAPHS">Tekst</option>
                            <option value="TABLE">
                              Tabel (kolommen scheiden met |, eerste rij bevat koppen)
                            </option>
                            <option value="EXAMPLE">Praktijkvoorbeeld</option>
                            <option value="ASSIGNMENT">Praktijkopdracht</option>
                            <option value="SUMMARY">Samenvatting</option>
                          </select>
                        </label>
                      )}
                      <label className="block">
                        Lesinhoud
                        <textarea
                          className={fieldClassName}
                          rows={5}
                          value={l.body}
                          onChange={(e) => update({ body: e.target.value })}
                        />
                      </label>
                      {l.type !== 'TEXT' && (
                        <>
                          <AcademyMediaUpload onUploaded={(media) => update({ media })} />
                          <label className="block">
                            Goedgekeurd mediapad
                            <input
                              className={fieldClassName}
                              value={l.media}
                              onChange={(e) => update({ media: e.target.value })}
                            />
                          </label>
                          <label className="block">
                            Tekstalternatief
                            <input
                              className={fieldClassName}
                              value={l.alt}
                              onChange={(e) => update({ alt: e.target.value })}
                            />
                          </label>
                        </>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={n === 0}
                          onClick={() => chapter(i, { lessons: move(c.lessons, n, -1) })}
                        >
                          Les omhoog
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={n === c.lessons.length - 1}
                          onClick={() => chapter(i, { lessons: move(c.lessons, n, 1) })}
                        >
                          Les omlaag
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={c.lessons.length === 1}
                          onClick={() => chapter(i, { lessons: c.lessons.filter((_, k) => k !== n) })}
                        >
                          Les verwijderen
                        </Button>
                      </div>
                    </fieldset>
                  )
                })}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => chapter(i, { lessons: [...c.lessons, lesson()] })}
                >
                  Les toevoegen
                </Button>
                <QuestionEditor
                  value={c.check}
                  label="Hoofdstukcheck"
                  onChange={(q) => chapter(i, { check: q })}
                />
              </section>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setValue({
                  ...value,
                  chapters: [
                    ...value.chapters,
                    { title: '', minutes: 30, lessons: [lesson()], check: question() },
                  ],
                })
              }
            >
              Hoofdstuk toevoegen
            </Button>
            <h2 className="text-2xl font-bold">Eindtoets</h2>
            {value.questions.map((q, i) => (
              <div key={i}>
                <QuestionEditor
                  value={q}
                  label={`Examenvraag ${i + 1}`}
                  onChange={(v) =>
                    setValue({ ...value, questions: value.questions.map((a, n) => (n === i ? v : a)) })
                  }
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={i === 0}
                  onClick={() => setValue({ ...value, questions: move(value.questions, i, -1) })}
                >
                  Vraag omhoog
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={i === value.questions.length - 1}
                  onClick={() => setValue({ ...value, questions: move(value.questions, i, 1) })}
                >
                  Vraag omlaag
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={value.questions.length === 1}
                  onClick={() => setValue({ ...value, questions: value.questions.filter((_, n) => n !== i) })}
                >
                  Vraag verwijderen
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() => setValue({ ...value, questions: [...value.questions, question()] })}
            >
              Examenvraag toevoegen
            </Button>
            <label className="block">
              Benodigde goede antwoorden
              <input
                className={fieldClassName}
                type="number"
                min={1}
                max={value.questions.length}
                value={value.passingScore}
                onChange={(e) => setValue({ ...value, passingScore: Number(e.target.value) })}
              />
            </label>
            <label className="block">
              Maximum aantal pogingen (leeg: onbeperkt)
              <input
                className={fieldClassName}
                type="number"
                min={1}
                max={100}
                value={value.attemptLimit ?? ''}
                onChange={(e) =>
                  setValue({ ...value, attemptLimit: e.target.value ? Number(e.target.value) : null })
                }
              />
            </label>
            <p>
              Certificaat na slagen en afronden van alle hoofdstukken. Het certificaat bevestigt
              cursusafronding en verleent geen wettelijke beroepsbevoegdheid.
            </p>
            <Button type="submit" loading={busy}>
              Concept opslaan
            </Button>
          </fieldset>
        </form>
      )}
      <p role="status">{message}</p>
    </div>
  )
}
