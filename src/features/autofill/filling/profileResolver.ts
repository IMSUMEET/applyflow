// Maps a canonical field name to the actual value from the user's profile.
// Returns undefined if the profile has no value for that field.

import type { CanonicalField } from "../canonicalFields";
import type { UserProfile } from "@/models/profile";

export function resolveFieldValue(
  field: CanonicalField,
  profile: UserProfile
): string | boolean | undefined {
  switch (field) {
    // ── Personal ────────────────────────────────────────────────────────────
    case "firstName":
      return nonEmpty(profile.firstName);
    case "lastName":
      return nonEmpty(profile.lastName);
    case "middleName":
      return nonEmpty(profile.middleName);
    case "preferredName":
      return nonEmpty(profile.preferredName);
    case "fullName": {
      const parts = [profile.firstName, profile.lastName].filter(Boolean);
      return parts.length ? parts.join(" ") : undefined;
    }
    case "email":
      return nonEmpty(profile.email);
    case "phone":
      return nonEmpty(profile.phone);

    // ── Location ─────────────────────────────────────────────────────────────
    case "city":
      return nonEmpty(profile.city);
    case "state":
      return nonEmpty(profile.state);
    case "country":
      return nonEmpty(profile.country);
    case "postalCode":
      return nonEmpty(profile.postalCode);
    case "fullAddress":
    case "streetAddress": {
      // Compose address from parts if available
      const parts = [profile.city, profile.state, profile.country].filter(Boolean);
      return parts.length ? parts.join(", ") : undefined;
    }

    // ── Professional links ────────────────────────────────────────────────────
    case "linkedinUrl":
      return nonEmpty(profile.linkedinUrl);
    case "githubUrl":
      return nonEmpty(profile.githubUrl);
    case "portfolioUrl":
      return nonEmpty(profile.portfolioUrl);
    case "websiteUrl":
      return nonEmpty(profile.websiteUrl) ?? nonEmpty(profile.portfolioUrl);

    // ── Professional ──────────────────────────────────────────────────────────
    case "summary":
      return nonEmpty(profile.summary);
    case "yearsOfExperience":
      return profile.yearsOfExperience !== undefined
        ? String(profile.yearsOfExperience)
        : undefined;

    // ── Education (most recent entry) ─────────────────────────────────────────
    case "school": {
      const edu = profile.education[0];
      return edu ? nonEmpty(edu.institution) : undefined;
    }
    case "degree": {
      const edu = profile.education[0];
      return edu ? nonEmpty(edu.degree) : undefined;
    }
    case "major": {
      const edu = profile.education[0];
      return edu ? nonEmpty(edu.fieldOfStudy) : undefined;
    }
    case "graduationYear": {
      const edu = profile.education[0];
      if (!edu?.endDate) return undefined;
      return extractYear(edu.endDate);
    }
    case "startYear": {
      const edu = profile.education[0];
      if (!edu?.startDate) return undefined;
      return extractYear(edu.startDate);
    }
    case "gpa": {
      const edu = profile.education[0];
      return edu ? nonEmpty(edu.gpa) : undefined;
    }

    // ── Employment (most recent entry) ────────────────────────────────────────
    case "currentCompany": {
      const emp = profile.employment[0];
      return emp ? nonEmpty(emp.company) : undefined;
    }
    case "currentTitle": {
      const emp = profile.employment[0];
      return emp ? nonEmpty(emp.title) : undefined;
    }
    case "currentStartDate": {
      const emp = profile.employment[0];
      return emp ? nonEmpty(emp.startDate) : undefined;
    }
    case "currentEndDate": {
      const emp = profile.employment[0];
      return emp?.current ? "Present" : (emp ? nonEmpty(emp.endDate) : undefined);
    }
    case "currentLocation": {
      const emp = profile.employment[0];
      return emp ? nonEmpty(emp.location) : undefined;
    }
    case "currentDescription": {
      const emp = profile.employment[0];
      if (!emp?.description) return undefined;
      // Return the first bullet if multi-line; otherwise the full text
      const firstLine = emp.description.split("\n").find((l) => l.trim());
      return firstLine ? nonEmpty(firstLine) : nonEmpty(emp.description);
    }
    case "skills":
      return profile.skills.length > 0 ? profile.skills.join(", ") : undefined;

    // ── Application answers ───────────────────────────────────────────────────
    case "workAuthorization":
      return nonEmpty(profile.workAuthorization);
    case "requiresSponsorship":
      return profile.requiresSponsorship;
    case "willingToRelocate":
      return profile.willingToRelocate;
    case "remotePreference":
      return nonEmpty(profile.remotePreference);
    case "salaryExpectation":
      return nonEmpty(profile.salaryExpectation);
    case "noticePeriod":
      return nonEmpty(profile.noticePeriod);

    default:
      return undefined;
  }
}

function nonEmpty(value: string | null | undefined): string | undefined {
  return value && value.trim() !== "" ? value.trim() : undefined;
}

function extractYear(dateStr: string): string {
  // Handle "2024", "2024-05", "2024-05-15", "May 2024"
  const yearMatch = dateStr.match(/\b(19|20)\d{2}\b/);
  return yearMatch?.[0] ?? dateStr;
}
