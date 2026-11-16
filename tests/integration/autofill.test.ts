// Integration tests for the autofill pipeline.
// Loads HTML fixtures with JSDOM and runs the full detection → matching → filling path.

import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { JSDOM } from "jsdom";
import { scanFields } from "@/features/autofill/detection/fieldScanner";
import { matchField } from "@/features/autofill/matching/fieldMatcher";
import { resolveFieldValue } from "@/features/autofill/filling/profileResolver";
import { fillField } from "@/features/autofill/filling/fieldFiller";
import { emptyProfile } from "@/models/profile";
import type { UserProfile } from "@/models/profile";

const fixtureDir = resolve(import.meta.dirname ?? __dirname, "../fixtures");

function loadFixture(name: string): Document {
  const html = readFileSync(resolve(fixtureDir, name), "utf-8");
  const dom = new JSDOM(html, { url: "https://example.com" });
  return dom.window.document;
}

const testProfile: UserProfile = {
  ...emptyProfile(),
  firstName: "Alex",
  lastName: "Smith",
  email: "alex@example.com",
  phone: "+14155550199",
  city: "New York",
  state: "NY",
  country: "US",
  postalCode: "10001",
  linkedinUrl: "https://linkedin.com/in/alexsmith",
  githubUrl: "https://github.com/alexsmith",
  portfolioUrl: "https://alexsmith.io",
  summary: "10 years of software engineering experience.",
  workAuthorization: "US Citizen",
  requiresSponsorship: false,
  willingToRelocate: true,
  education: [{
    id: "e1",
    institution: "Stanford",
    degree: "BS",
    fieldOfStudy: "Computer Science",
    startDate: "2010",
    endDate: "2014",
    current: false,
  }],
  employment: [{
    id: "j1",
    company: "Stripe",
    title: "Senior Engineer",
    employmentType: "full-time",
    startDate: "2019-01",
    current: true,
    remote: false,
  }],
};

// ── Generic form fixture ──────────────────────────────────────────────────────

describe("Generic form autofill", () => {
  let doc: Document;

  beforeEach(() => {
    doc = loadFixture("genericForm.html");
  });

  it("detects multiple form fields", () => {
    const fields = scanFields(doc);
    expect(fields.length).toBeGreaterThan(4);
  });

  it("matches firstName field", () => {
    const fields = scanFields(doc);
    const firstNameField = fields.find((f) => f.canonicalField === "firstName");
    expect(firstNameField).toBeTruthy();
    expect(firstNameField!.confidence).toBeGreaterThan(0.4);
  });

  it("matches email field", () => {
    const fields = scanFields(doc);
    const emailField = fields.find((f) => f.canonicalField === "email");
    expect(emailField).toBeTruthy();
  });

  it("matches phone field", () => {
    const fields = scanFields(doc);
    const phoneField = fields.find((f) => f.canonicalField === "phone");
    expect(phoneField).toBeTruthy();
  });

  it("matches linkedinUrl field", () => {
    const fields = scanFields(doc);
    const linkedinField = fields.find((f) => f.canonicalField === "linkedinUrl");
    expect(linkedinField).toBeTruthy();
  });

  it("fills firstName correctly", async () => {
    const fields = scanFields(doc);
    const firstNameField = fields.find((f) => f.canonicalField === "firstName");
    expect(firstNameField).toBeTruthy();

    const value = resolveFieldValue("firstName", testProfile);
    const result = await fillField(firstNameField!, value, false);
    expect(result.status).toBe("filled");
    expect((firstNameField!.element as HTMLInputElement).value).toBe("Alex");
  });

  it("fills email correctly", async () => {
    const fields = scanFields(doc);
    const emailField = fields.find((f) => f.canonicalField === "email");
    expect(emailField).toBeTruthy();

    const value = resolveFieldValue("email", testProfile);
    const result = await fillField(emailField!, value, false);
    expect(result.status).toBe("filled");
    expect((emailField!.element as HTMLInputElement).value).toBe("alex@example.com");
  });

  it("fills summary textarea correctly", async () => {
    const fields = scanFields(doc);
    const summaryField = fields.find((f) => f.canonicalField === "summary");
    expect(summaryField).toBeTruthy();

    const value = resolveFieldValue("summary", testProfile);
    const result = await fillField(summaryField!, value, false);
    expect(result.status).toBe("filled");
    expect((summaryField!.element as HTMLTextAreaElement).value).toBe(testProfile.summary);
  });

  it("fills select field for work authorization", async () => {
    const fields = scanFields(doc);
    const authField = fields.find((f) => f.canonicalField === "workAuthorization");
    expect(authField).toBeTruthy();
    expect(authField!.elementType).toBe("select");

    const value = resolveFieldValue("workAuthorization", testProfile);
    const result = await fillField(authField!, value, false);
    expect(result.status).toBe("filled");
  });

  it("detects radio group for sponsorship", () => {
    const fields = scanFields(doc);
    const sponsorField = fields.find((f) => f.canonicalField === "requiresSponsorship");
    expect(sponsorField).toBeTruthy();
    expect(sponsorField!.elementType).toBe("radio-group");
  });
});

// ── Greenhouse-like fixture ───────────────────────────────────────────────────

describe("Greenhouse-like form autofill", () => {
  let doc: Document;

  beforeEach(() => {
    doc = loadFixture("greenhouse-like.html");
  });

  it("detects and matches first_name field", () => {
    const fields = scanFields(doc);
    const f = fields.find((x) => x.canonicalField === "firstName");
    expect(f).toBeTruthy();
    expect(f!.confidence).toBeGreaterThan(0.4);
  });

  it("detects LinkedIn question field", () => {
    const fields = scanFields(doc);
    const f = fields.find((x) => x.canonicalField === "linkedinUrl");
    expect(f).toBeTruthy();
  });

  it("fills first name", async () => {
    const fields = scanFields(doc);
    const f = fields.find((x) => x.canonicalField === "firstName")!;
    await fillField(f, "Alex", false);
    expect((f.element as HTMLInputElement).value).toBe("Alex");
  });
});

// ── Lever-like fixture ────────────────────────────────────────────────────────

describe("Lever-like form autofill", () => {
  let doc: Document;

  beforeEach(() => {
    doc = loadFixture("lever-like.html");
  });

  it("detects full name field as fullName", () => {
    const fields = scanFields(doc);
    const f = fields.find((x) => x.canonicalField === "fullName");
    expect(f).toBeTruthy();
  });

  it("detects LinkedIn field", () => {
    const fields = scanFields(doc);
    const f = fields.find((x) => x.canonicalField === "linkedinUrl");
    expect(f).toBeTruthy();
  });

  it("fills fullName field with 'Alex Smith'", async () => {
    const fields = scanFields(doc);
    const f = fields.find((x) => x.canonicalField === "fullName")!;
    const value = resolveFieldValue("fullName", testProfile);
    await fillField(f, value, false);
    expect((f.element as HTMLInputElement).value).toBe("Alex Smith");
  });

  it("fills email field", async () => {
    const fields = scanFields(doc);
    const f = fields.find((x) => x.canonicalField === "email")!;
    await fillField(f, testProfile.email, false);
    expect((f.element as HTMLInputElement).value).toBe("alex@example.com");
  });
});
