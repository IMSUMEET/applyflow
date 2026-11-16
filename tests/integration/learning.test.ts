// Integration tests for the Self-Learning Engine.
// Tests the full flow: learned answer matching → auto-fill in runAutofillFull,
// similarity matching edge cases, and field observer event capture.

import { describe, it, expect, beforeEach, vi } from "vitest";
import { JSDOM } from "jsdom";
import { runAutofillFull, normalizeQuestion } from "@/features/autofill/autofillEngine";
import { jaccardSimilarity, findSimilarAnswer, APPLY_THRESHOLD } from "@/features/learning/similarityMatcher";
import { startFieldObserver } from "@/features/learning/fieldObserver";
import { emptyProfile } from "@/models/profile";
import { defaultSettings } from "@/models/settings";
import type { UserProfile } from "@/models/profile";
import type { UserSettings } from "@/models/settings";
import type { LearnedAnswer } from "@/models/learning";
import type { DetectedField, FieldSignals } from "@/features/autofill/detection/detectedField";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeLearnedAnswer(
  question: string,
  answer: string,
  overrides: Partial<LearnedAnswer> = {}
): LearnedAnswer {
  const now = new Date().toISOString();
  return {
    id: `la-${Math.random()}`,
    originalQuestion: question,
    normalizedQuestion: normalizeQuestion(question),
    answer,
    fieldType: "text",
    scope: "global",
    approvedByUser: true,
    autoFillEnabled: true,
    createdAt: now,
    updatedAt: now,
    lastConfirmedAt: now,
    usageCount: 0,
    ...overrides,
  };
}

function makeHtml(fields: Array<{ label: string; name: string; type?: string }>): string {
  const inputs = fields
    .map(
      ({ label, name, type = "text" }) =>
        `<div><label for="${name}">${label}</label><input id="${name}" name="${name}" type="${type}" /></div>`
    )
    .join("\n");
  return `<!DOCTYPE html><html><body><form>${inputs}</form></body></html>`;
}

const minimalProfile: UserProfile = {
  ...emptyProfile(),
  firstName: "Alex",
  email: "alex@example.com",
};

const learningSettings: UserSettings = {
  ...defaultSettings(),
  learningEnabled: true,
  autofillEnabled: true,
};

const learningDisabledSettings: UserSettings = {
  ...defaultSettings(),
  learningEnabled: false,
  autofillEnabled: true,
};

// ── runAutofillFull — learned answer auto-fill ────────────────────────────────

describe("runAutofillFull — learned answer integration", () => {
  beforeEach(() => {
    // jsdom sets window.location.href used by runAutofillFull
    Object.defineProperty(window, "location", {
      value: { href: "https://jobs.example.com/apply" },
      writable: true,
    });
  });

  it("auto-fills an unrecognized field when a matching learned answer exists", async () => {
    const html = makeHtml([
      { label: "First Name", name: "firstName" },
      { label: "What is your cloud infrastructure experience?", name: "cloudExp" },
    ]);
    const dom = new JSDOM(html, { url: "https://jobs.example.com/apply" });
    const doc = dom.window.document;

    // Replace global document for the engine (content script context)
    Object.defineProperty(global, "document", { value: doc, writable: true, configurable: true });

    const learned = makeLearnedAnswer(
      "What is your experience with cloud infrastructure?",
      "5 years building AWS systems"
    );

    const { result } = await runAutofillFull(minimalProfile, learningSettings, [learned]);

    expect(result.learnedFieldsApplied).toBeGreaterThanOrEqual(1);
  });

  it("puts unrecognized fields with no learned match into unrecognizedFields[]", async () => {
    const html = makeHtml([
      { label: "Describe your leadership philosophy", name: "leadershipQ" },
    ]);
    const dom = new JSDOM(html, { url: "https://jobs.example.com/apply" });
    Object.defineProperty(global, "document", { value: dom.window.document, writable: true, configurable: true });

    const { result, unrecognizedFields } = await runAutofillFull(
      minimalProfile,
      learningSettings,
      [] // no learned answers
    );

    expect(unrecognizedFields.length).toBeGreaterThanOrEqual(1);
    expect(result.unrecognized.length).toBeGreaterThanOrEqual(1);
  });

  it("does not apply learned answers when learningEnabled is false", async () => {
    const html = makeHtml([
      { label: "What is your cloud infrastructure experience?", name: "cloudExp" },
    ]);
    const dom = new JSDOM(html, { url: "https://jobs.example.com/apply" });
    Object.defineProperty(global, "document", { value: dom.window.document, writable: true, configurable: true });

    const learned = makeLearnedAnswer(
      "What is your experience with cloud infrastructure?",
      "5 years building AWS systems"
    );

    const { result } = await runAutofillFull(minimalProfile, learningDisabledSettings, [learned]);

    expect(result.learnedFieldsApplied).toBe(0);
  });

  it("does not apply answers with autoFillEnabled=false", async () => {
    const html = makeHtml([
      { label: "What is your cloud infrastructure experience?", name: "cloudExp" },
    ]);
    const dom = new JSDOM(html, { url: "https://jobs.example.com/apply" });
    Object.defineProperty(global, "document", { value: dom.window.document, writable: true, configurable: true });

    const learned = makeLearnedAnswer(
      "What is your experience with cloud infrastructure?",
      "5 years",
      { autoFillEnabled: false }
    );

    const { result } = await runAutofillFull(minimalProfile, learningSettings, [learned]);
    expect(result.learnedFieldsApplied).toBe(0);
  });

  it("learnedFieldsApplied is 0 when no learned answers are provided", async () => {
    const html = makeHtml([{ label: "First Name", name: "firstName" }]);
    const dom = new JSDOM(html, { url: "https://jobs.example.com/apply" });
    Object.defineProperty(global, "document", { value: dom.window.document, writable: true, configurable: true });

    const { result } = await runAutofillFull(minimalProfile, learningSettings, []);
    expect(result.learnedFieldsApplied).toBe(0);
  });
});

// ── Similarity matching edge cases ────────────────────────────────────────────

describe("similarity matching — edge cases", () => {
  it("matches same question with different word order moderately", () => {
    const sim = jaccardSimilarity(
      "cloud infrastructure experience",
      "experience with cloud infrastructure"
    );
    expect(sim).toBeGreaterThan(APPLY_THRESHOLD);
  });

  it("does not match questions from completely different domains", () => {
    const sim = jaccardSimilarity(
      "do you require visa sponsorship",
      "describe your cloud infrastructure experience"
    );
    expect(sim).toBeLessThan(0.2);
  });

  it("handles single-word questions gracefully", () => {
    const sim = jaccardSimilarity("salary", "expected salary");
    expect(sim).toBeGreaterThan(0);
    expect(sim).toBeLessThanOrEqual(1);
  });

  it("findSimilarAnswer returns null when no answer exceeds threshold", () => {
    const answers = [
      makeLearnedAnswer("do you require visa sponsorship", "No"),
      makeLearnedAnswer("what is your salary expectation", "$150,000"),
    ];
    const result = findSimilarAnswer("describe your cloud experience", answers);
    expect(result).toBeNull();
  });

  it("findSimilarAnswer picks higher similarity when multiple qualify", () => {
    const cloud1 = makeLearnedAnswer("cloud experience", "5 years");
    const cloud2 = makeLearnedAnswer(
      "what is your experience with cloud infrastructure",
      "5 years AWS"
    );
    const result = findSimilarAnswer(
      "what is your cloud infrastructure experience",
      [cloud1, cloud2]
    );
    expect(result!.answer.originalQuestion).toBe(
      "what is your experience with cloud infrastructure"
    );
  });
});

// ── normalizeQuestion ─────────────────────────────────────────────────────────

describe("normalizeQuestion", () => {
  it("lowercases and strips punctuation", () => {
    expect(normalizeQuestion("What is your cloud experience?")).toBe(
      "what is your cloud experience"
    );
  });

  it("collapses whitespace", () => {
    expect(normalizeQuestion("  years  of   experience  ")).toBe(
      "years of experience"
    );
  });
});

// ── fieldObserver + learning overlay integration ──────────────────────────────

describe("fieldObserver — capture and callback flow", () => {
  it("fires callback when user types and blurs an unrecognized field", () => {
    const dom = new JSDOM("<!DOCTYPE html><body></body></html>");
    const input = dom.window.document.createElement("input");
    input.type = "text";
    dom.window.document.body.appendChild(input);

    const fakeField: DetectedField = {
      uid: "test-uid",
      element: input as unknown as HTMLElement,
      elementType: "input-text",
      signals: {
        label: "What motivates you to work here?",
        name: "",
        fieldId: "",
        placeholder: "",
        ariaLabel: "",
        nearbyText: "",
        inputType: "text",
      },
      canonicalField: null,
      confidence: 0,
      matchReasons: [],
      currentValue: "",
      isEmpty: true,
    };

    const cb = vi.fn();
    startFieldObserver([fakeField], cb);

    input.value = "I love the mission";
    input.dispatchEvent(new dom.window.Event("blur"));

    expect(cb).toHaveBeenCalledWith({
      question: "What motivates you to work here?",
      answer: "I love the mission",
      fieldType: "input-text",
    });
  });

  it("does not fire callback if field is left empty", () => {
    const dom = new JSDOM("<!DOCTYPE html><body></body></html>");
    const input = dom.window.document.createElement("input");
    dom.window.document.body.appendChild(input);

    const fakeField: DetectedField = {
      uid: "uid2",
      element: input as unknown as HTMLElement,
      elementType: "input-text",
      signals: {
        label: "Some question",
        name: "",
        fieldId: "",
        placeholder: "",
        ariaLabel: "",
        nearbyText: "",
        inputType: "text",
      },
      canonicalField: null,
      confidence: 0,
      matchReasons: [],
      currentValue: "",
      isEmpty: true,
    };

    const cb = vi.fn();
    startFieldObserver([fakeField], cb);
    input.dispatchEvent(new dom.window.Event("blur"));

    expect(cb).not.toHaveBeenCalled();
  });
});
