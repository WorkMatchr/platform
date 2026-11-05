import fs from 'node:fs'
import { createHash } from 'node:crypto'
const check = process.argv.includes('--check')
function writeOutput(path, content) {
 if (check) {
  if (!fs.existsSync(path) || fs.readFileSync(path,'utf8').replaceAll('\r\n','\n') !== content.replaceAll('\r\n','\n')) throw Error('GENERATED_CONTENT_STALE: '+path)
 } else fs.writeFileSync(path,content)
}
const basePath = 'content/academy/WL-001_COURSE_1.1_DRAFT.json'
const baseline = JSON.parse(fs.readFileSync(basePath, 'utf8'))
const bundle = structuredClone(baseline)
const review = JSON.parse(fs.readFileSync('content/academy/WL-001_EXAM_1.2_REVIEW.json', 'utf8'))
if (review.humanApproval !== 'OPEN' || review.version !== '1.2') throw Error('DRAFT_REVIEW_REQUIRED')
bundle.courseVersion = '1.2'
bundle.examVersion = 'WL-001-EXAM-1.2'
bundle.definition.retention.bankVersion = 'WL-001-RETENTION-1.2'
bundle.definition.retention.programVersion = 'WL-001-RETENTION-1.2'
// Existing question rows are immutable; every new bundle has explicit versions.
for (const q of [...bundle.chapters.flatMap(c => c.questions), ...bundle.examQuestions, ...bundle.retentionQuestions]) q.version++
bundle.sources.push(
 {id:'nla-core-20261105',title:'Nederlandse Arbeidsinspectie — Arbokerndeskundigen',url:'https://www.nlarbeidsinspectie.nl/onderwerpen/arbeidsomstandighedenwet/arbokerndeskundigen',status:'MANUAL_REVIEW_REQUIRED',scope:'Geraadpleegd 2026-11-05: vier kerndeskundigheden, registratie en certificering. Menselijke beoordeling van de vraagformulering vereist.'},
 {id:'arbo-volunteers-20261105',title:'Arboportaal — Vrijwilliger',url:'https://www.arboportaal.nl/onderwerpen/rechten-plichten-werkenden/vrijwilliger',status:'MANUAL_REVIEW_REQUIRED',scope:'Geraadpleegd 2026-11-05: vrijwilligers kennen risicospecifieke verplichtingen. Geen generieke vrijstelling van alle arboregels.'},
 {id:'nla-testing-20251218',title:'Nederlandse Arbeidsinspectie — Toetsen van de RI&E',url:'https://www.nlarbeidsinspectie.nl/site/binaries/site-content/collections/documents/2025/12/18/toetsen-van-de-ri-en-e/toetsen-van-de-ri-en-e-20251218.pdf',status:'MANUAL_REVIEW_REQUIRED',scope:'Officiële toelichting van 18 december 2025 op systeem/scopetoets en registratie. Juridische actualiteit en reikwijdte door reviewer bevestigen.'}
)
if (new Set(review.changes.map(c=>c[0])).size !== review.changes.length) throw Error('DUPLICATE_QUESTION_PATCH')
for (const [number,stem,options,correct,explanation,,legal] of review.changes) {
 const q = bundle.examQuestions[number-1]
 if (q.code !== 'WL001-EX-E'+String(number).padStart(2,'0')) throw Error('QUESTION_IDENTITY_MISMATCH')
 q.questionText=stem; q.explanation=explanation; q.type=correct.length>1?'MULTI_CHOICE':'SINGLE_CHOICE'
 q.options=options.map((text,i)=>({value:String.fromCharCode(65+i),text,isCorrect:correct.includes(i)}))
 q.correctAnswer=correct.map(i=>String.fromCharCode(65+i))
 q.legalReviewRequired ||= Boolean(legal)
 q.sourceIds=[...new Set([...q.sourceIds,...([4,33].includes(number)?['nla-core-20261105']:[]),...(number===31?['nla-rie','arbo-volunteers-20261105']:[]),...(number===33?['nla-testing-20251218']:[]),...([25,30,32,35].includes(number)?['arbowet','arbo-opbouw']:[])])]
}
const matrix=JSON.parse(fs.readFileSync('docs/academy-content/WL-001-integration-coverage.json','utf8'))
const objectiveCodes=new Set(matrix.objectives.map(row=>row.objectiveCode.replace('WL001-','')))
for(const change of review.changes) for(const code of change[5]) if(!objectiveCodes.has(code)) throw Error('UNKNOWN_OBJECTIVE: '+code)
matrix.sourceVersion='1.1'; matrix.candidateVersion='1.2'
matrix.previousAssessmentCounts=matrix.assessmentCounts
matrix.assessmentCounts={}
matrix.selection.policy='All 50 version-bound questions in stable order; no random selection. Mapping is a content review proposal, not proof of practical competence.'
const canonical=value=>Array.isArray(value)?'['+value.map(canonical).join(',')+']':value&&typeof value==='object'?'{'+Object.keys(value).sort((a,b)=>a.localeCompare(b,'en')).map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}':JSON.stringify(value)
matrix.sourceChecksum=createHash('sha256').update(canonical(baseline)).digest('hex')
matrix.candidateChecksum=createHash('sha256').update(canonical(bundle)).digest('hex')
for(const row of matrix.objectives){
 row.previousCoverage=row.assessment
 const mapped=review.changes.filter(c=>c[5].includes(row.objectiveCode.replace('WL001-',''))).map(c=>'WL001-EX-E'+String(c[0]).padStart(2,'0'))
 if(mapped.length){row.questionCodes=mapped;row.assessment='DIRECT_PROPOSED'}
 row.humanApproval='OPEN';row.reviewer=null;row.reviewedAt=null
 row.questionEvidence=row.questionCodes.map(code=>{const q=bundle.examQuestions.find(q=>q.code===code);if(!q)throw Error('MISSING_QUESTION');return {code,version:q.version,stem:q.questionText,correctAnswers:q.correctAnswer,correctOptions:q.options.filter(o=>o.isCorrect).map(o=>o.text),sourceIds:q.sourceIds}})
 row.evidence=mapped.length?'De gekoppelde scenario- of antwoordtekst behandelt de kern van dit leerdoel expliciet. De onderstaande juiste opties zijn het reviewbewijs; keuzeherkenning bewijst geen zelfstandige praktische uitvoering.':row.evidence
 row.action='Menselijke reviewer beoordeelt doelbinding, vraag, distractoren, toepasselijkheid en niveau. De technische koppeling is geen inhoudelijke goedkeuring.'
 matrix.assessmentCounts[row.assessment]=(matrix.assessmentCounts[row.assessment]??0)+1
}
matrix.limitations=['Alle 104 leerdoelen blijven menselijke review vereisen.','Meerkeuzevragen toetsen herkenning/toepassing in een scenario, niet zelfstandig organiseren of uitvoeren op de werkplek.','De geconsolideerde Arbowet was op 2026-11-05 niet toegankelijk (HTTP 429); wettelijke uitzonderingen blijven geblokkeerd voor publicatie.','Bronlessen en bestaande versies blijven ongewijzigd; een juridische onjuistheid in een bronles moet in een nieuwe versie worden hersteld vóór inhoudelijke vrijgave.']
writeOutput('content/academy/WL-001_COURSE_1.2_DRAFT.json',JSON.stringify(bundle,null,2)+'\n')
writeOutput('docs/academy-content/WL-001-complete-coverage.json',JSON.stringify(matrix,null,2)+'\n')
let md='# WL-001 1.2 — toetsbindingen ter menselijke review\n\nConcept; geen inhoudelijke goedkeuring. Alle 50 vragen worden afgenomen. Historische 1.0/1.1 blijven ongewijzigd.\n\n'+matrix.limitations.map(x=>'- '+x).join('\n')+'\n\n| Leerdoel | Doel | Eerder | Voorstel | Vraag |\n|---|---|---|---|---|\n'
for(const r of matrix.objectives)md+='| '+[r.objectiveCode,r.objective,r.previousCoverage,r.assessment,r.questionCodes.join(', ')].map(x=>x.replaceAll('|','/')).join(' | ')+' |\n'
md+='\n## Reviewbewijs per leerdoel\n'
for(const r of matrix.objectives){md+='\n### '+r.objectiveCode+'\n\n'+r.objective+'\n\n';for(const e of r.questionEvidence)md+='- '+e.code+' v'+e.version+': '+e.stem+'\n  - Juiste opties: '+e.correctOptions.join(' / ')+'\n';md+='\nReviewer: OPEN; datum: OPEN; besluit: OPEN; onderbouwing: OPEN.\n'}
writeOutput('docs/academy-content/WL-001-complete-coverage.md',md)
console.log(JSON.stringify({course:bundle.courseVersion,questions:bundle.examQuestions.length,coverage:matrix.assessmentCounts,hash:matrix.candidateChecksum}))
