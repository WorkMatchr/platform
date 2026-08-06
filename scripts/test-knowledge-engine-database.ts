import 'dotenv/config'
import { randomUUID } from 'node:crypto'
import { Pool, type PoolClient } from 'pg'

const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error('DATABASE_URL is niet geconfigureerd.')
const url = new URL(connectionString)
if (!['localhost', '127.0.0.1', '::1'].includes(url.hostname)) throw new Error('De Knowledge Engine-test mag uitsluitend lokaal draaien.')

const pool = new Pool({ connectionString })
function assert(value: unknown, message: string): asserts value { if (!value) throw new Error(message) }

async function fails(client: PoolClient, statement: string, values: unknown[]) {
  await client.query('SAVEPOINT knowledge_expected_failure')
  try {
    await client.query(statement, values)
    return false
  } catch {
    return true
  } finally {
    await client.query('ROLLBACK TO SAVEPOINT knowledge_expected_failure')
  }
}

async function main() {
  const client = await pool.connect()
  await client.query('BEGIN')
  try {
    const sourceId = randomUUID()
    const versionId = randomUUID()
    const fragmentId = randomUUID()
    const topicId = randomUUID()
    const claimId = randomUUID()
    await client.query(`INSERT INTO "KnowledgeSource" ("id","sourceType","sourceFormat","code","title","copyrightClassification","authorityLevel","temporalStatus","sourceFamily","independenceGroup","isPrimarySource","createdAt","updatedAt") VALUES ($1,'AI_SHEET','PDF',$2,'Testbron','RESTRICTED_REFERENCE_ONLY','PROFESSIONAL_GUIDANCE','HISTORICAL','test','test',false,now(),now())`, [sourceId, `TEST-KNOWLEDGE-${sourceId}`])
    await client.query(`INSERT INTO "KnowledgeSourceVersion" ("id","sourceId","versionLabel","extractionStatus","reviewStatus","createdAt","updatedAt") VALUES ($1,$2,'v1','EXTRACTED','REVIEW_REQUIRED',now(),now())`, [versionId, sourceId])
    await client.query(`INSERT INTO "KnowledgeFragment" ("id","externalKey","sourceVersionId","pageFrom","fragmentType","extractionMethod","requiresReview","createdAt") VALUES ($1,$2,$3,1,'SECTION_REFERENCE','TEST',true,now())`, [fragmentId, `test:f:${fragmentId}`, versionId])
    await client.query(`INSERT INTO "KnowledgeTopic" ("id","slug","title","description","domain","status","createdAt","updatedAt") VALUES ($1,$2,'Test','Test','OTHER','DRAFT',now(),now())`, [topicId, `test-${topicId}`])
    await client.query(`INSERT INTO "KnowledgeClaim" ("id","externalKey","topicId","claimType","statement","applicability","temporalStatus","validationStatus","publicationStatus","confidenceLevel","accessTier","copyrightCheckPassed","createdByActor","createdAt","updatedAt") VALUES ($1,$2,$3,'OTHER','Korte testclaim.','Alleen integratietest.','HISTORICAL','UNVALIDATED','DRAFT','LOW','INTERNAL_REVIEWER',false,'DATABASE_TEST',now(),now())`, [claimId, `test:c:${claimId}`, topicId])

    assert(await fails(client, `UPDATE "KnowledgeFragment" SET "sectionPath"='gewijzigd' WHERE "id"=$1`, [fragmentId]), 'Fragmenthistorie moet append-only zijn.')
    assert(await fails(client, `INSERT INTO "KnowledgeRelation" ("id","externalKey","relationType","createdAt") VALUES ($1,$2,'RELEVANT_TO',now())`, [randomUUID(), `test:r:${randomUUID()}`]), 'Relaties zonder eindpunten moeten worden geweigerd.')
    assert(await fails(client, `UPDATE "KnowledgeClaim" SET "publicationStatus"='PUBLISHED' WHERE "id"=$1`, [claimId]), 'Direct publiceren van een ongevalideerde claim moet worden geweigerd.')

    await client.query(`INSERT INTO "KnowledgeAuditEvent" ("id","eventType","entityType","entityId","actorType","result","createdAt") VALUES ($1,'CLAIM_CREATED','KnowledgeClaim',$2,'DATABASE_TEST','SUCCESS',now())`, [randomUUID(), claimId])
    assert(await fails(client, `DELETE FROM "KnowledgeAuditEvent" WHERE "entityId"=$1`, [claimId]), 'Auditevents moeten append-only zijn.')
    console.info('Knowledge Engine-databaseconstraints en append-only historie: geslaagd.')
  } finally {
    await client.query('ROLLBACK')
    client.release()
    await pool.end()
  }
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1 })
