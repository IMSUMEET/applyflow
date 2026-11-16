import { describe, it, expect } from "vitest";
import { resolveFieldValue } from "@/features/autofill/filling/profileResolver";
import { emptyProfile } from "@/models/profile";
import type { UserProfile } from "@/models/profile";

const baseProfile: UserProfile = {
  ...emptyProfile(),
  firstName: "Jane",
  lastName: "Doe",
  email: "jane@example.com",
  phone: "+1-555-0100",
  city: "San Francisco",
  state: "CA",
  country: "US",
  postalCode: "94102",
  linkedinUrl: "https://linkedin.com/in/janedoe",
  githubUrl: "https://github.com/janedoe",
  portfolioUrl: "https://janedoe.dev",
  summary: "Staff engineer with 8 years experience.",
  workAuthorization: "US Citizen",
  requiresSponsorship: false,
  willingToRelocate: true,
  education: [
    {
      id: "edu-1",
      institution: "MIT",
      degree: "BS",
      fieldOfStudy: "Computer Science",
      startDate: "2012",
      endDate: "2016",
      gpa: "3.9",
      current: false,
    },
  ],
  employment: [
    {
      id: "emp-1",
      company: "Google",
      title: "Staff Engineer",
      employmentType: "full-time",
      startDate: "2020-01",
      current: true,
      remote: false,
    },
  ],
};

describe("profileResolver", () => {
  it("resolves firstName", () => {
    expect(resolveFieldValue("firstName", baseProfile)).toBe("Jane");
  });

  it("resolves lastName", () => {
    expect(resolveFieldValue("lastName", baseProfile)).toBe("Doe");
  });

  it("builds fullName from first + last", () => {
    expect(resolveFieldValue("fullName", baseProfile)).toBe("Jane Doe");
  });

  it("resolves email", () => {
    expect(resolveFieldValue("email", baseProfile)).toBe("jane@example.com");
  });

  it("resolves phone", () => {
    expect(resolveFieldValue("phone", baseProfile)).toBe("+1-555-0100");
  });

  it("resolves city", () => {
    expect(resolveFieldValue("city", baseProfile)).toBe("San Francisco");
  });

  it("resolves linkedinUrl", () => {
    expect(resolveFieldValue("linkedinUrl", baseProfile)).toBe(
      "https://linkedin.com/in/janedoe"
    );
  });

  it("resolves githubUrl", () => {
    expect(resolveFieldValue("githubUrl", baseProfile)).toBe("https://github.com/janedoe");
  });

  it("falls back to portfolioUrl for websiteUrl when websiteUrl is empty", () => {
    expect(resolveFieldValue("websiteUrl", baseProfile)).toBe("https://janedoe.dev");
  });

  it("resolves education school", () => {
    expect(resolveFieldValue("school", baseProfile)).toBe("MIT");
  });

  it("resolves education degree", () => {
    expect(resolveFieldValue("degree", baseProfile)).toBe("BS");
  });

  it("resolves major", () => {
    expect(resolveFieldValue("major", baseProfile)).toBe("Computer Science");
  });

  it("extracts graduation year from date string", () => {
    expect(resolveFieldValue("graduationYear", baseProfile)).toBe("2016");
  });

  it("resolves GPA", () => {
    expect(resolveFieldValue("gpa", baseProfile)).toBe("3.9");
  });

  it("resolves current company", () => {
    expect(resolveFieldValue("currentCompany", baseProfile)).toBe("Google");
  });

  it("resolves current title", () => {
    expect(resolveFieldValue("currentTitle", baseProfile)).toBe("Staff Engineer");
  });

  it("resolves workAuthorization", () => {
    expect(resolveFieldValue("workAuthorization", baseProfile)).toBe("US Citizen");
  });

  it("resolves requiresSponsorship as boolean", () => {
    expect(resolveFieldValue("requiresSponsorship", baseProfile)).toBe(false);
  });

  it("resolves willingToRelocate as boolean", () => {
    expect(resolveFieldValue("willingToRelocate", baseProfile)).toBe(true);
  });

  it("returns undefined for firstName when profile is empty", () => {
    expect(resolveFieldValue("firstName", emptyProfile())).toBeUndefined();
  });

  it("returns undefined for school when no education entries", () => {
    expect(resolveFieldValue("school", emptyProfile())).toBeUndefined();
  });

  it("returns undefined for currentCompany when no employment entries", () => {
    expect(resolveFieldValue("currentCompany", emptyProfile())).toBeUndefined();
  });
});
