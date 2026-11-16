// ─── Core domain models for ApplyFlow ────────────────────────────────────────

export type {
  UserProfile,
  EducationEntry,
  EmploymentEntry,
} from "./profile";

export type {
  Job,
  JobStatus,
  Application,
  ApplicationStatus,
} from "./job";

export type {
  ReferralContact,
  ReferralAssignment,
  ReferralStatus,
} from "./referral";

export type {
  LearnedFieldMapping,
  LearnedAnswer,
  AnswerScope,
} from "./learning";

export type { UserSettings } from "./settings";
