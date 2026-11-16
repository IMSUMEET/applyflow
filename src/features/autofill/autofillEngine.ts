// Autofill engine — runs in the content script.
// Coordinates adapter selection, field detection, value resolution, and filling.
//
// All profile data is passed in as a parameter; the engine has no storage access.

import type { UserProfile } from "@/models/profile";
import type { UserSettings } from "@/models/settings";
import type { LearnedAnswer } from "@/models/learning";
import type { AutofillResult, DetectedField } from "./detection/detectedField";
import { selectAdapter } from "./adapters/adapterRegistry";
import { resolveFieldValue } from "./filling/profileResolver";
import { fillField } from "./filling/fieldFiller";
import { isHighConfidence, isMediumConfidence } from "./matching/fieldMatcher";
import { findSimilarAnswer, isAutoApplyMatch } from "@/features/learning/similarityMatcher";
import { normalizeText } from "./matching/normalizer";

// Extended result that includes DOM references — only use within the content script.
// Do NOT serialize this across the message boundary.
export interface FullAutofillResult {
  result: AutofillResult;
  // Fields the engine could not handle — passed to the field observer so it can
  // watch for user input and offer to remember the answer.
  unrecognizedFields: DetectedField[];
}

export async function runAutofillFull(
  profile: UserProfile,
  settings: UserSettings,
  learnedAnswers: LearnedAnswer[] = []
): Promise<FullAutofillResult> {
  const result: AutofillResult = {
    fieldsDetected: 0,
    fieldsFilled: 0,
    learnedFieldsApplied: 0,
    skipped: [],
    failed: [],
    unrecognized: [],
  };

  const unrecognizedFields: DetectedField[] = [];

  if (!settings.autofillEnabled) {
    return { result, unrecognizedFields };
  }

  const url = new URL(window.location.href);
  const adapter = selectAdapter(url, document);

  // Adapters with dynamic forms (e.g. Workday) expand sections and fill entries
  // before the standard scan runs.
  if (adapter.prepare) {
    const { filledCount } = await adapter.prepare(document, profile);
    result.fieldsFilled += filledCount;
    result.fieldsDetected += filledCount;
  }

  const fields = adapter.detectFields(document);
  result.fieldsDetected += fields.length;

  for (const field of fields) {
    const label =
      field.signals.label ||
      field.signals.name ||
      field.signals.placeholder ||
      field.canonicalField ||
      "unknown field";

    const hasCanonicalMatch =
      field.canonicalField &&
      (isHighConfidence(field.confidence) || isMediumConfidence(field.confidence));

    if (!hasCanonicalMatch) {
      // Before giving up, check if a learned answer covers this question
      if (settings.learningEnabled && learnedAnswers.length > 0) {
        const match = findSimilarAnswer(label, learnedAnswers);
        if (match && isAutoApplyMatch(match)) {
          const fillResult = await fillField(field, match.answer.answer, settings.skipNonEmptyFields);
          if (fillResult.status === "filled") {
            result.fieldsFilled++;
            result.learnedFieldsApplied++;
            continue;
          }
        }
      }

      result.unrecognized.push({ label });
      unrecognizedFields.push(field);
      continue;
    }

    const value = resolveFieldValue(field.canonicalField!, profile);

    if (value === undefined) {
      // We recognised the field but have no profile data for it — skip quietly.
      result.skipped.push({ label, reason: "no profile value" });
      continue;
    }

    const fillResult = await adapter.fillField(field, value, settings.skipNonEmptyFields);

    switch (fillResult.status) {
      case "filled":
        result.fieldsFilled++;
        break;
      case "skipped":
        result.skipped.push({ label, reason: fillResult.reason ?? "skipped" });
        break;
      case "failed":
        result.failed.push({ label, reason: fillResult.reason ?? "unknown error" });
        break;
      case "no-value":
        break;
    }
  }

  return { result, unrecognizedFields };
}

// Convenience wrapper for callers that only need the serializable summary.
export async function runAutofill(
  profile: UserProfile,
  settings: UserSettings,
  learnedAnswers: LearnedAnswer[] = []
): Promise<AutofillResult> {
  return (await runAutofillFull(profile, settings, learnedAnswers)).result;
}

// Build the display label for a field — reused by fieldObserver.
export function getFieldLabel(field: DetectedField): string {
  return (
    field.signals.label ||
    field.signals.ariaLabel ||
    field.signals.name ||
    field.signals.placeholder ||
    field.canonicalField ||
    "unknown field"
  );
}

// Produce the normalizedQuestion string the same way the engine does,
// so it matches what gets stored in LearnedAnswer.normalizedQuestion.
export function normalizeQuestion(raw: string): string {
  return normalizeText(raw);
}
