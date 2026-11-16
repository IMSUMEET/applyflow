// The complete set of field identities ApplyFlow understands.
// Adapters and the matcher both speak this vocabulary.

export type CanonicalField =
  // Personal
  | "firstName"
  | "middleName"
  | "lastName"
  | "preferredName"
  | "fullName"
  | "email"
  | "phone"
  // Location
  | "city"
  | "state"
  | "country"
  | "postalCode"
  | "fullAddress"
  | "streetAddress"
  // Professional links
  | "linkedinUrl"
  | "githubUrl"
  | "portfolioUrl"
  | "websiteUrl"
  // Professional
  | "summary"
  | "yearsOfExperience"
  // Education (most recent)
  | "school"
  | "degree"
  | "major"
  | "graduationYear"
  | "startYear"
  | "gpa"
  // Employment (most recent)
  | "currentCompany"
  | "currentTitle"
  | "currentStartDate"
  | "currentEndDate"
  // Application answers
  | "workAuthorization"
  | "requiresSponsorship"
  | "willingToRelocate"
  | "remotePreference"
  | "salaryExpectation"
  | "noticePeriod";

export interface MatchResult {
  field: CanonicalField | null;
  confidence: number; // 0–1
  reasons: string[];
}
