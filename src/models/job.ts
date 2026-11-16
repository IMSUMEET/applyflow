import { z } from "zod";

export const JobStatusValues = [
  "saved",
  "needs-referral",
  "ready-to-apply",
  "applied",
  "interview",
  "rejected",
  "offer",
  "withdrawn",
] as const;

export const ApplicationStatusValues = JobStatusValues;

export type JobStatus = (typeof JobStatusValues)[number];
export type ApplicationStatus = JobStatus;

export const JobSchema = z.object({
  id: z.string(),
  company: z.string(),
  title: z.string(),
  location: z.string().optional(),
  jobUrl: z.string(),
  sourceUrl: z.string().optional(),
  externalJobId: z.string().optional(),
  status: z.enum(JobStatusValues).default("saved"),
  createdAt: z.string(),
  updatedAt: z.string(),
  appliedAt: z.string().optional(),
  notes: z.string().optional(),
});

export const ApplicationSchema = JobSchema;

export type Job = z.infer<typeof JobSchema>;
export type Application = z.infer<typeof ApplicationSchema>;
