import { z } from 'zod'

const emptyToNull = (value: unknown) => value === '' || value === undefined ? null : value

export const assignmentIdentifierSchema = z.uuid()
export const assignmentVersionSchema = z.coerce.number().int().positive()

export const assignmentEditSchema = z.object({
  assignmentId: assignmentIdentifierSchema,
  expectedAssignmentVersion: assignmentVersionSchema,
  title: z.string().trim().min(5, 'Gebruik minimaal 5 tekens.').max(120, 'Gebruik maximaal 120 tekens.'),
  description: z.string().trim().min(20, 'Gebruik minimaal 20 tekens.').max(7000, 'Gebruik maximaal 7.000 tekens.'),
  employeeCount: z.preprocess(emptyToNull, z.coerce.number().int().min(1, 'Vul minimaal 1 medewerker in.').max(1000000, 'Vul maximaal 1.000.000 medewerkers in.').nullable()),
  desiredStartDate: z.preprocess(
    emptyToNull,
    z.string()
      .date('Vul een geldige datum in.')
      .refine((value) => value >= new Date().toISOString().slice(0, 10), 'Kies vandaag of een datum in de toekomst.')
      .nullable(),
  ),
  locationType: z.enum(['REGISTERED', 'OTHER', 'MULTIPLE', 'REMOTE', 'UNKNOWN']),
  locationId: z.preprocess(emptyToNull, z.uuid('Kies een geldige locatie.').nullable()),
  locationCity: z.preprocess(emptyToNull, z.string().trim().max(120, 'Gebruik maximaal 120 tekens.').nullable()),
  locationRegion: z.preprocess(emptyToNull, z.string().trim().max(120, 'Gebruik maximaal 120 tekens.').nullable()),
  locationDescription: z.preprocess(emptyToNull, z.string().trim().max(1000, 'Gebruik maximaal 1.000 tekens.').nullable()),
  locationCount: z.preprocess(emptyToNull, z.coerce.number().int().min(1, 'Vul minimaal één locatie in.').max(10000, 'Vul maximaal 10.000 locaties in.').nullable()),
}).superRefine((value, context) => {
  if (value.locationType === 'REGISTERED' && !value.locationId) {
    context.addIssue({ code: 'custom', path: ['locationId'], message: 'Kies een bestaande organisatielocatie.' })
  }
  if (value.locationType === 'OTHER' && !value.locationCity && !value.locationRegion) {
    context.addIssue({ code: 'custom', path: ['locationCity'], message: 'Vul een plaats of regio in.' })
  }
})

export const assignmentReasonSchema = z.string()
  .trim()
  .min(10, 'Beschrijf de reden in minimaal 10 tekens.')
  .max(500, 'Gebruik maximaal 500 tekens.')

export const assignmentTransitionSchema = z.object({
  assignmentId: assignmentIdentifierSchema,
  expectedAssignmentVersion: assignmentVersionSchema,
})

export const assignmentReasonTransitionSchema = assignmentTransitionSchema.extend({
  reason: assignmentReasonSchema,
})

export type AssignmentEditInput = z.infer<typeof assignmentEditSchema>
export type AssignmentTransitionInput = z.infer<typeof assignmentTransitionSchema>
export type AssignmentReasonTransitionInput = z.infer<typeof assignmentReasonTransitionSchema>
