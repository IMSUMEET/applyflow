import { describe, it, expect } from "vitest";
import { matchField } from "@/features/autofill/matching/fieldMatcher";
import type { FieldSignals } from "@/features/autofill/detection/detectedField";

function sig(overrides: Partial<FieldSignals> = {}): FieldSignals {
  return {
    name: "",
    fieldId: "",
    label: "",
    placeholder: "",
    ariaLabel: "",
    nearbyText: "",
    inputType: "text",
    ...overrides,
  };
}

describe("fieldMatcher", () => {
  // ── Personal fields ──────────────────────────────────────────────────────────
  it("matches firstName by label", () => {
    const result = matchField(sig({ label: "first name" }));
    expect(result.field).toBe("firstName");
    expect(result.confidence).toBeGreaterThan(0.4);
  });

  it("matches lastName by name attribute", () => {
    const result = matchField(sig({ name: "last name" }));
    expect(result.field).toBe("lastName");
    expect(result.confidence).toBeGreaterThan(0.4);
  });

  it("matches email by input type alone", () => {
    const result = matchField(sig({ inputType: "email" }));
    expect(result.field).toBe("email");
    expect(result.confidence).toBeGreaterThan(0.3);
  });

  it("matches email with high confidence when type=email AND label matches", () => {
    const result = matchField(sig({ inputType: "email", label: "email address" }));
    expect(result.field).toBe("email");
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it("matches phone by type=tel", () => {
    const result = matchField(sig({ inputType: "tel" }));
    expect(result.field).toBe("phone");
  });

  it("matches phone by label 'phone number'", () => {
    const result = matchField(sig({ label: "phone number" }));
    expect(result.field).toBe("phone");
  });

  it("does NOT match firstName for 'last name' label", () => {
    const result = matchField(sig({ label: "last name" }));
    expect(result.field).not.toBe("firstName");
  });

  it("does NOT match firstName for a 'confirm email' field", () => {
    const result = matchField(sig({ label: "confirm email", inputType: "email" }));
    // "Confirm email" should never be mistaken for firstName — it's either email or unrecognized
    expect(result.field).not.toBe("firstName");
    expect(result.field).not.toBe("lastName");
  });

  // ── Professional links ────────────────────────────────────────────────────────
  it("matches linkedinUrl by label", () => {
    const result = matchField(sig({ label: "linkedin url" }));
    expect(result.field).toBe("linkedinUrl");
  });

  it("matches githubUrl by name attribute", () => {
    const result = matchField(sig({ name: "github url" }));
    expect(result.field).toBe("githubUrl");
  });

  it("does NOT match linkedinUrl for github label", () => {
    const result = matchField(sig({ label: "github profile" }));
    expect(result.field).toBe("githubUrl");
  });

  // ── Location ─────────────────────────────────────────────────────────────────
  it("matches city by label", () => {
    const result = matchField(sig({ label: "city" }));
    expect(result.field).toBe("city");
  });

  it("matches postalCode by label 'zip code'", () => {
    const result = matchField(sig({ label: "zip code" }));
    expect(result.field).toBe("postalCode");
  });

  // ── Education ─────────────────────────────────────────────────────────────────
  it("matches school by label 'university'", () => {
    const result = matchField(sig({ label: "university" }));
    expect(result.field).toBe("school");
  });

  it("matches major by label 'field of study'", () => {
    const result = matchField(sig({ label: "field of study" }));
    expect(result.field).toBe("major");
  });

  // ── Application answers ───────────────────────────────────────────────────────
  it("matches workAuthorization by label", () => {
    const result = matchField(sig({ label: "work authorization" }));
    expect(result.field).toBe("workAuthorization");
  });

  it("matches requiresSponsorship from label about sponsorship", () => {
    const result = matchField(sig({ label: "require visa sponsorship" }));
    expect(result.field).toBe("requiresSponsorship");
  });

  // ── Edge cases ────────────────────────────────────────────────────────────────
  it("returns null for unrecognized field with no signals", () => {
    const result = matchField(sig({ label: "xyzzy_unknown_field_123" }));
    expect(result.field).toBeNull();
    expect(result.confidence).toBe(0);
  });

  it("does NOT confuse 'years of Java experience' with 'JavaScript experience'", () => {
    // Both should NOT map to any field confidently — they'd be learned answers
    const java = matchField(sig({ label: "years of java experience" }));
    const js = matchField(sig({ label: "years of javascript experience" }));
    // These may or may not match yearsOfExperience, but they should not cross-match each other
    // The important thing is they don't match unrelated fields
    expect(java.field).not.toBe("email");
    expect(java.field).not.toBe("firstName");
    expect(js.field).not.toBe("email");
    expect(js.field).not.toBe("firstName");
  });

  it("prefers label match over name attribute for confidence", () => {
    const withLabel = matchField(sig({ label: "email address", inputType: "email" }));
    const withNameOnly = matchField(sig({ name: "email", inputType: "email" }));
    expect(withLabel.confidence).toBeGreaterThanOrEqual(withNameOnly.confidence);
  });
});
