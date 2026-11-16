import { z } from "zod";

export const EducationEntrySchema = z.object({
  id: z.string(),
  institution: z.string(),
  degree: z.string(),
  fieldOfStudy: z.string(),
  startDate: z.string(),
  endDate: z.string().optional(),
  gpa: z.string().optional(),
  current: z.boolean().default(false),
});

export const EmploymentEntrySchema = z.object({
  id: z.string(),
  company: z.string(),
  title: z.string(),
  employmentType: z
    .enum(["full-time", "part-time", "contract", "internship", "freelance"])
    .default("full-time"),
  location: z.string().optional(),
  remote: z.boolean().default(false),
  startDate: z.string(),
  endDate: z.string().optional(),
  current: z.boolean().default(false),
  description: z.string().optional(),
});

export const UserProfileSchema = z.object({
  // Personal
  firstName: z.string().default(""),
  middleName: z.string().optional(),
  lastName: z.string().default(""),
  preferredName: z.string().optional(),
  email: z.string().email().or(z.literal("")).default(""),
  phone: z.string().default(""),
  // Location
  city: z.string().default(""),
  state: z.string().default(""),
  country: z.string().default(""),
  postalCode: z.string().default(""),
  // Professional
  linkedinUrl: z.string().url().or(z.literal("")).default(""),
  githubUrl: z.string().url().or(z.literal("")).default(""),
  portfolioUrl: z.string().url().or(z.literal("")).default(""),
  websiteUrl: z.string().url().or(z.literal("")).default(""),
  summary: z.string().default(""),
  skills: z.array(z.string()).default([]),
  yearsOfExperience: z.number().nonnegative().optional(),
  // Education + Employment
  education: z.array(EducationEntrySchema).default([]),
  employment: z.array(EmploymentEntrySchema).default([]),
  // Application answers (static, non-sensitive)
  workAuthorization: z.string().default(""),
  requiresSponsorship: z.boolean().optional(),
  willingToRelocate: z.boolean().optional(),
  remotePreference: z.enum(["remote", "hybrid", "onsite", "flexible"]).optional(),
  salaryExpectation: z.string().optional(),
  noticePeriod: z.string().optional(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;
export type EducationEntry = z.infer<typeof EducationEntrySchema>;
export type EmploymentEntry = z.infer<typeof EmploymentEntrySchema>;

export function emptyProfile(): UserProfile {
  return UserProfileSchema.parse({});
}
