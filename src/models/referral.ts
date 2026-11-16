import { z } from "zod";

export const ReferralStatusValues = [
  "pending",
  "ready",
  "requested",
  "referred",
  "declined",
  "no-response",
  "closed",
] as const;

export type ReferralStatus = (typeof ReferralStatusValues)[number];

export const ReferralContactSchema = z.object({
  id: z.string(),
  name: z.string(),
  company: z.string(),
  linkedinUrl: z.string().optional(),
  email: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ReferralAssignmentSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  contactId: z.string().optional(),
  status: z.enum(ReferralStatusValues).default("pending"),
  requestedAt: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ReferralContact = z.infer<typeof ReferralContactSchema>;
export type ReferralAssignment = z.infer<typeof ReferralAssignmentSchema>;
