import { z } from "zod";

export const AnswerScopeValues = ["global", "company", "domain"] as const;
export type AnswerScope = (typeof AnswerScopeValues)[number];

export const LearnedFieldMappingSchema = z.object({
  id: z.string(),
  // The raw attribute seen on the page (name/id/label text)
  rawIdentifier: z.string(),
  // The canonical profile field this maps to
  canonicalField: z.string(),
  // Domain or ATS where this mapping was observed
  sourceDomain: z.string().optional(),
  confidence: z.number().min(0).max(1).default(1),
  approvedByUser: z.boolean().default(true),
  createdAt: z.string(),
  usageCount: z.number().default(0),
});

export const LearnedAnswerSchema = z.object({
  id: z.string(),
  // A stable key derived from canonical meaning (may be undefined for one-offs)
  canonicalKey: z.string().optional(),
  originalQuestion: z.string(),
  normalizedQuestion: z.string(),
  answer: z.string(),
  fieldType: z.enum(["text", "textarea", "select", "radio", "checkbox"]).default("text"),
  sourceDomain: z.string().optional(),
  scope: z.enum(AnswerScopeValues).default("global"),
  approvedByUser: z.boolean().default(true),
  autoFillEnabled: z.boolean().default(true),
  createdAt: z.string(),
  lastConfirmedAt: z.string(),
  updatedAt: z.string(),
  usageCount: z.number().default(0),
});

export type LearnedFieldMapping = z.infer<typeof LearnedFieldMappingSchema>;
export type LearnedAnswer = z.infer<typeof LearnedAnswerSchema>;
