import { deliverContactEmails } from '@/lib/contact/contact-email-worker'
import { deliverAssignmentEmails } from '@/lib/marketplace/assignment-email-worker'

export async function dispatchBatch() {
  const [assignment, contact] = await Promise.allSettled([
    deliverAssignmentEmails({ limit: 10 }), deliverContactEmails({ limit: 5 }),
  ])
  if (assignment.status === 'rejected' || contact.status === 'rejected') throw Error('NOTIFICATION_DISPATCH_INCOMPLETE')
  return { ...assignment.value, contact: contact.value }
}
