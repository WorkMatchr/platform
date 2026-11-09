// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { AcademyBundleEditor } from './academy-bundle-editor'
import { validateAcademyBundle } from '@/lib/learning/academy-content-standard'
const actions=vi.hoisted(()=>({save:vi.fn(),prepare:vi.fn(),push:vi.fn(),refresh:vi.fn()}))
vi.mock('next/navigation',()=>({useRouter:()=>({push:actions.push,refresh:actions.refresh})}))
vi.mock('@/app/platformbeheer/academy/cursussen/actions',()=>({saveCourse:actions.save,prepareCourseRevision:actions.prepare}))
vi.mock('./academy-media-upload',()=>({AcademyMediaUpload:()=> <span>Afbeelding uploaden</span>}))
afterEach(()=>{cleanup();vi.resetAllMocks()})
const files=['WL-001_COURSE_1.2_DRAFT.json','WL-002_COURSE_1.3_DRAFT.json','WL-003_COURSE_1.1_DRAFT.json']
describe('complete course editor roundtrips',()=>{
 for(const file of files){
  const bundle=validateAcademyBundle(JSON.parse(readFileSync(`content/academy/${file}`,'utf8')))
  it(`${bundle.definition.courseCode}: retains every unseen field while changing text, questions, exam and retention`,async()=>{
   actions.save.mockResolvedValue({ok:true,id:'new-version',revision:1})
   render(<AcademyBundleEditor initial={bundle}/>)
   fireEvent.change(screen.getByLabelText('Onderdeel',{exact:true}),{target:{value:'chapter'}})
   fireEvent.change(screen.getByLabelText('Titel',{exact:true}),{target:{value:'Gewijzigd hoofdstuk voor synthetische acceptatie'}})
   fireEvent.change(screen.getByLabelText('Onderdeel',{exact:true}),{target:{value:'questions'}})
   fireEvent.change(screen.getByLabelText('Feedback en uitleg',{exact:true}),{target:{value:'Gewijzigde uitleg die voldoende context bevat voor deze synthetische test.'}})
   fireEvent.change(screen.getByLabelText('Onderdeel',{exact:true}),{target:{value:'settings'}})
   fireEvent.change(screen.getByLabelText('Benodigde juiste antwoorden',{exact:true}),{target:{value:'41'}})
   fireEvent.change(screen.getByLabelText('Maximum pogingen',{exact:true}),{target:{value:'2'}})
   fireEvent.change(screen.getByLabelText('Onderdeel',{exact:true}),{target:{value:'retention'}})
   fireEvent.change(screen.getByLabelText('Feedback en uitleg',{exact:true}),{target:{value:'Gewijzigde kennisbehoudfeedback voor uitsluitend deze synthetische test.'}})
   fireEvent.click(screen.getByRole('button',{name:'Conceptversie opslaan'}))
   await waitFor(()=>expect(actions.save).toHaveBeenCalledOnce())
   const saved=actions.save.mock.calls[0][0]
   expect(saved.chapters[0].title).toBe('Gewijzigd hoofdstuk voor synthetische acceptatie')
   expect(saved.chapters[0].blocks).toEqual(bundle.chapters[0].blocks)
   expect(saved.chapters.slice(1)).toEqual(bundle.chapters.slice(1))
   expect(saved.examQuestions).toEqual(bundle.examQuestions)
   expect(saved.retentionQuestions.slice(1)).toEqual(bundle.retentionQuestions.slice(1))
   expect(saved.sources).toEqual(bundle.sources)
   expect(saved.examSettings.attemptLimit).toBe(2)
   expect(saved.definition.exam).toMatchObject({questionCount:50,passingScore:41,passingPercentage:82})
   expect(actions.push).toHaveBeenCalledWith('/platformbeheer/academy/cursussen/new-version')
  })
 }
 it('opens existing content read-only and requires an explicit new revision',async()=>{
  const bundle=validateAcademyBundle(JSON.parse(readFileSync(`content/academy/${files[0]}`,'utf8')))
  actions.prepare.mockResolvedValue({ok:true,bundle:{...bundle,courseVersion:'new.1'}})
  render(<AcademyBundleEditor initial={bundle} id="source" revision={3}/>)
  expect(screen.getByLabelText('Titel',{exact:true}).matches(':disabled')).toBe(true)
  expect((screen.getByRole('button',{name:'Conceptversie opslaan'}) as HTMLButtonElement).disabled).toBe(true)
  fireEvent.click(screen.getByRole('button',{name:'Nieuwe conceptversie voorbereiden'}))
  await waitFor(()=>expect((screen.getByRole('button',{name:'Conceptversie opslaan'}) as HTMLButtonElement).disabled).toBe(false))
  expect(actions.prepare).toHaveBeenCalledWith('source',bundle.courseVersion + '-edit1')
 })
 it('retains invalid input, announces validation and makes no server write',async()=>{
  const bundle=validateAcademyBundle(JSON.parse(readFileSync(`content/academy/${files[0]}`,'utf8')))
  render(<AcademyBundleEditor initial={bundle}/>)
  fireEvent.change(screen.getByLabelText('Beschrijving',{exact:true}),{target:{value:'Te kort'}})
  fireEvent.click(screen.getByRole('button',{name:'Conceptversie opslaan'}))
  await waitFor(()=>expect(screen.getByRole('status').textContent).toContain('description'))
  expect((screen.getByLabelText('Beschrijving',{exact:true}) as HTMLTextAreaElement).value).toBe('Te kort')
  expect(actions.save).not.toHaveBeenCalled()
 })
})
