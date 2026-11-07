import 'server-only'
import { createHash } from 'node:crypto'
import { getPrisma } from '@/lib/prisma'
import { requireMarketplacePlatformAdmin } from '@/lib/marketplace/marketplace-authorization'
import { reviewFinancialChain, validateFinancialReviewCoverage, type FinancialChainEvidence } from './financial-chain-review'

export interface FinancialReviewReader {
  /** Adapter must paginate provider GETs, verify tenant/customer ownership and report coverage honestly. */
  read(scope: { tenantKey: string; through: Date }): Promise<{ complete: boolean; expectedPaid: number; payments: FinancialChainEvidence[] }>
}
/** Closed operator entry point; provider reads are explicitly supplied by the caller. */
export async function runDailyFinancialChainReview(actorUserId: string, tenantKey: string, reader: FinancialReviewReader, at = new Date()) {
  if (process.env.FINANCIAL_CHAIN_REVIEW_ENABLED !== 'true') throw new Error('FINANCIAL_CHAIN_REVIEW_DISABLED')
  if (!Number.isFinite(at.getTime()) || !/^(organization|customer):[a-zA-Z0-9-]{1,80}$/.test(tenantKey)) throw new Error('FINANCIAL_REVIEW_SCOPE_INVALID')
  const prisma = getPrisma()
  await requireMarketplacePlatformAdmin(prisma, actorUserId)
  const snapshot = await reader.read({ tenantKey, through: at })
  validateFinancialReviewCoverage(snapshot, tenantKey)
  const scopeHash = createHash('sha256').update(tenantKey).digest('hex')
  return prisma.$transaction(async tx => {
    await requireMarketplacePlatformAdmin(tx, actorUserId)
    const results = []
    for (const evidence of snapshot.payments) {
      const initial = reviewFinancialChain(evidence, tenantKey)
      const previous = await tx.financialEvent.findFirst({ where: { eventType: 'FINANCIAL_CHAIN_REVIEW', result: 'DEVIATION', metadata: { path: ['key'], equals: initial.key } }, select: { id: true } })
      const result = reviewFinancialChain(evidence, tenantKey, !!previous)
      await tx.financialEvent.createMany({ data: { actorUserId, eventType: 'FINANCIAL_CHAIN_REVIEW', result: result.status,
        idempotencyKey: `chain:${at.toISOString().slice(0,10)}:${result.key}:${result.evidenceHash.slice(0,24)}:${result.status}`,
        metadata: { key: result.key, scopeHash, product: evidence.product, paymentReference: evidence.paymentId, invoiceReferences: evidence.invoices.map(i => i.id), codes: result.codes, evidenceHash: result.evidenceHash, observedAt: at.toISOString() } }, skipDuplicates: true })
      results.push(result)
    }
    const fingerprint = createHash('sha256').update(JSON.stringify(results)).digest('hex')
    await tx.financialEvent.createMany({ data: { actorUserId, eventType: 'FINANCIAL_CHAIN_REVIEW_RUN', result: results.some(r => !['OK','RECOVERED'].includes(r.status)) ? 'REVIEW_REQUIRED' : 'SUCCEEDED',
      idempotencyKey: `chain-run:${at.toISOString().slice(0,10)}:${scopeHash.slice(0,32)}:${fingerprint}`,
      metadata: { scopeHash, observedAt: at.toISOString(), count: results.length, coverageComplete: true } }, skipDuplicates: true })
    return results
  })
}

export async function getFinancialChainReviewOverview(actorUserId: string, at = new Date()) {
  const prisma = getPrisma()
  await requireMarketplacePlatformAdmin(prisma, actorUserId)
  const [lastRun, observations] = await Promise.all([
    prisma.financialEvent.findFirst({ where: { eventType: 'FINANCIAL_CHAIN_REVIEW_CYCLE', result: { in: ['SUCCEEDED','REVIEW_REQUIRED'] } }, orderBy: { createdAt: 'desc' }, select: { createdAt: true, result: true } }),
    prisma.financialEvent.findMany({ where: { OR: [{ eventType: { in: ['FINANCIAL_CHAIN_REVIEW', 'FINANCIAL_WEBHOOK_FAILURE'] } }, { eventType:'FINANCIAL_CHAIN_REVIEW_CYCLE', result:'FAILED' }] }, orderBy: { createdAt: 'desc' }, take: 50, select: { id: true, createdAt: true, result: true, metadata: true } }),
  ])
  return { enabled: process.env.FINANCIAL_CHAIN_REVIEW_ENABLED === 'true', lastRun, observations,
    overdue: !lastRun || at.getTime() - lastRun.createdAt.getTime() > 26 * 60 * 60 * 1000 }
}

/** Safe failure evidence; neither raw webhook payload nor provider response is retained. */
export async function recordFinancialWebhookFailure(paymentId: string, at = new Date()) {
  if (process.env.FINANCIAL_CHAIN_REVIEW_ENABLED !== 'true') return
  const paymentHash = createHash('sha256').update(paymentId).digest('hex')
  try {
    await getPrisma().financialEvent.createMany({ data: { eventType: 'FINANCIAL_WEBHOOK_FAILURE', result: 'INVESTIGATING',
      idempotencyKey: `webhook-failure:${at.toISOString().slice(0,13)}:${paymentHash}`,
      metadata: { paymentHash, observedAt: at.toISOString(), verifiedProviderPayment: false } }, skipDuplicates: true })
  } catch {
    // Database failure requires infrastructure log monitoring; never claim persisted evidence.
    console.error('FINANCIAL_WEBHOOK_FAILURE_OBSERVABILITY_UNAVAILABLE')
  }
}

/** Uses the existing scheduled-maintenance invocation; requires a designated active operator. */
export async function runScheduledFinancialChainReview(gateway: import('./mollie-gateway').MollieGateway, at = new Date()) {
  if (process.env.FINANCIAL_CHAIN_REVIEW_ENABLED !== 'true') return { processed:0,succeeded:0,failed:0,skipped:true }
  const actor = process.env.FINANCIAL_REVIEW_OPERATOR_ID
  if (!actor || !/^[0-9a-f-]{36}$/i.test(actor)) throw new Error('FINANCIAL_REVIEW_OPERATOR_REQUIRED')
  const prisma=getPrisma()
  await requireMarketplacePlatformAdmin(prisma,actor)
  try {
    const {createFinancialChainReader}=await import('./financial-chain-reader')
    const {JorttApiGateway}=await import('./jortt-api-gateway')
    const batch=await createFinancialChainReader(gateway,new JorttApiGateway())
    const results=[]
    for(const scope of batch.scopes) results.push(...await runDailyFinancialChainReview(actor,scope,batch.reader,at))
    const failed=results.filter(r=>!['OK','RECOVERED'].includes(r.status)).length
    const hash=createHash('sha256').update(JSON.stringify(results)).digest('hex')
    await prisma.$transaction(async tx => {
      await requireMarketplacePlatformAdmin(tx,actor)
      await tx.financialEvent.createMany({data:{actorUserId:actor,eventType:'FINANCIAL_CHAIN_REVIEW_CYCLE',result:failed?'REVIEW_REQUIRED':'SUCCEEDED',
      idempotencyKey:`chain-cycle:${at.toISOString().slice(0,10)}:${hash}`,metadata:{paymentCount:batch.paymentCount,scopeCount:batch.scopes.length,observedAt:at.toISOString(),failed}},skipDuplicates:true})
    })
    return {processed:results.length,succeeded:results.length-failed,failed}
  } catch {
    await prisma.financialEvent.createMany({data:{actorUserId:actor,eventType:'FINANCIAL_CHAIN_REVIEW_CYCLE',result:'FAILED',
      idempotencyKey:`chain-cycle-failed:${at.toISOString().slice(0,13)}`,metadata:{observedAt:at.toISOString(),code:'FINANCIAL_REVIEW_INCOMPLETE'}},skipDuplicates:true}).catch(()=>undefined)
    throw new Error('FINANCIAL_REVIEW_INCOMPLETE')
  }
}
