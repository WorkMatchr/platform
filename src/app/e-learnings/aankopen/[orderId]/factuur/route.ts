import { assertAcademyCommerceSandbox } from '@/lib/learning/academy-commerce-environment'
import { requireLearningUser } from '@/lib/learning/learning-authorization'
import { ownedAcademyOrder } from '@/lib/learning/academy-commerce-access'
import { getPrisma } from '@/lib/prisma'
import { buildFinancialInvoicePdf } from '@/lib/finance/financial-invoice-pdf'
export const runtime='nodejs'
export async function GET(_:Request,{params}:{params:Promise<{orderId:string}>}){const actor=await requireLearningUser('/e-learnings/aankopen');const {orderId}=await params;if(!/^[0-9a-f-]{36}$/i.test(orderId))return new Response('Niet gevonden',{status:404});try{assertAcademyCommerceSandbox();const db=getPrisma();const order=await ownedAcademyOrder(db,actor.id,orderId);const invoice=await db.financialInvoice.findUnique({where:{purchaseId:order.purchaseId},include:{lines:true,vatSummaries:true}});if(!invoice)return new Response('Niet gevonden',{status:404});const bytes=await buildFinancialInvoicePdf(invoice);const filename=`Academy-testfactuur-${invoice.invoiceNumber.replace(/[^A-Za-z0-9-]/g,'')}.pdf`;return new Response(new Uint8Array(bytes),{headers:{'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="${filename}"`,'Cache-Control':'private, no-store'}})}catch{return new Response('Niet gevonden',{status:404})}}
