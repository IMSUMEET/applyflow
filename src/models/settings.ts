import { z } from "zod";

export const UserSettingsSchema = z.object({
  // Autofill
  autofillEnabled: z.boolean().default(true),
  autofillConfidenceThreshold: z.number().min(0).max(1).default(0.7),
  skipNonEmptyFields: z.boolean().default(true),
  // Learning
  learningEnabled: z.boolean().default(true),
  requireApprovalBeforeAutoFill: z.boolean().default(false),
  // Digest
  digestEnabled: z.boolean().default(true),
  digestEmail: z.string().default(""),
  digestTime: z.string().default("18:00"),
  digestTimezone: z.string().default("America/New_York"),
  // Notifications
  showAutofillBadge: z.boolean().default(true),
  // Privacy
  cloudSyncEnabled: z.boolean().default(false),
});

export type UserSettings = z.infer<typeof UserSettingsSchema>;

export function defaultSettings(): UserSettings {
  return UserSettingsSchema.parse({});
}
