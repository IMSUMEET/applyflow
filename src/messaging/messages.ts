// Typed discriminated union of every message in the extension.
// Content scripts and UI send these; the background worker handles them.
// IMPORTANT: messages must be serializable (no functions, no class instances).

import type { UserProfile } from "@/models/profile";
import type { UserSettings } from "@/models/settings";
import type { Job } from "@/models/job";
import type { ReferralContact, ReferralAssignment } from "@/models/referral";
import type { LearnedAnswer } from "@/models/learning";
import type { AutofillResult } from "@/features/autofill/detection/detectedField";

// ─── Outgoing messages (content → background, popup → background) ─────────────

export type AppMessage =
  // Profile
  | { type: "GET_PROFILE" }
  | { type: "SAVE_PROFILE"; profile: UserProfile }
  // Settings
  | { type: "GET_SETTINGS" }
  | { type: "SAVE_SETTINGS"; settings: UserSettings }
  // Jobs
  | { type: "GET_JOBS" }
  | { type: "SAVE_JOB"; job: Omit<Job, "id" | "createdAt" | "updatedAt"> }
  | { type: "UPDATE_JOB"; job: Job }
  | { type: "DELETE_JOB"; jobId: string }
  // Referrals
  | { type: "GET_REFERRAL_CONTACTS" }
  | { type: "SAVE_REFERRAL_CONTACT"; contact: Omit<ReferralContact, "id" | "createdAt" | "updatedAt"> }
  | { type: "UPDATE_REFERRAL_CONTACT"; contact: ReferralContact }
  | { type: "DELETE_REFERRAL_CONTACT"; contactId: string }
  | { type: "GET_REFERRAL_ASSIGNMENTS" }
  | {
      type: "SAVE_REFERRAL_ASSIGNMENT";
      assignment: Omit<ReferralAssignment, "id" | "createdAt" | "updatedAt">;
    }
  | { type: "UPDATE_REFERRAL_ASSIGNMENT"; assignment: ReferralAssignment }
  // Learning
  | { type: "GET_LEARNED_ANSWERS" }
  | {
      type: "SAVE_LEARNED_ANSWER";
      answer: Omit<LearnedAnswer, "id" | "createdAt" | "updatedAt" | "lastConfirmedAt" | "usageCount">;
    }
  | { type: "UPDATE_LEARNED_ANSWER"; answer: LearnedAnswer }
  | { type: "DELETE_LEARNED_ANSWER"; answerId: string }
  // Autofill — popup triggers this; background loads profile and relays to content script
  | { type: "EXECUTE_AUTOFILL" }
  // Fetch profile+settings+learnedAnswers for use inside the content script sidebar
  | { type: "FETCH_AUTOFILL_DATA" }
  // Digest
  | { type: "GENERATE_DIGEST" }
  // Ping (for testing connectivity)
  | { type: "PING" };

// ─── Response type map ────────────────────────────────────────────────────────

export type AppMessageResponseMap = {
  GET_PROFILE: UserProfile;
  SAVE_PROFILE: { success: true };
  GET_SETTINGS: UserSettings;
  SAVE_SETTINGS: { success: true };
  GET_JOBS: Job[];
  SAVE_JOB: Job;
  UPDATE_JOB: { success: true };
  DELETE_JOB: { success: true };
  GET_REFERRAL_CONTACTS: ReferralContact[];
  SAVE_REFERRAL_CONTACT: ReferralContact;
  UPDATE_REFERRAL_CONTACT: { success: true };
  DELETE_REFERRAL_CONTACT: { success: true };
  GET_REFERRAL_ASSIGNMENTS: ReferralAssignment[];
  SAVE_REFERRAL_ASSIGNMENT: ReferralAssignment;
  UPDATE_REFERRAL_ASSIGNMENT: { success: true };
  GET_LEARNED_ANSWERS: LearnedAnswer[];
  SAVE_LEARNED_ANSWER: LearnedAnswer;
  UPDATE_LEARNED_ANSWER: { success: true };
  DELETE_LEARNED_ANSWER: { success: true };
  EXECUTE_AUTOFILL: AutofillResult;
  FETCH_AUTOFILL_DATA: { profile: UserProfile; settings: UserSettings; learnedAnswers: LearnedAnswer[] };
  GENERATE_DIGEST: DigestData;
  PING: { alive: true };
};

export interface DetectedJobInfo {
  company: string;
  title: string;
  location: string;
  url: string;
}

export interface DigestData {
  groups: DigestGroup[];
  totalJobs: number;
  generatedAt: string;
}

export interface DigestGroup {
  contactId: string | null;
  contactName: string;
  company: string;
  jobs: Array<{ title: string; url: string; jobId: string }>;
}
