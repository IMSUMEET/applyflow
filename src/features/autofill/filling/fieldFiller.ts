// Fills a single DetectedField with the given value.
// Returns a FillResult indicating success, skip, or failure.

import type { DetectedField } from "../detection/detectedField";
import {
  setInputValue,
  setSelectValue,
  setCheckboxValue,
  clickRadio,
} from "./eventDispatcher";

export interface FillResult {
  uid: string;
  canonicalField: string | null;
  label: string;
  status: "filled" | "skipped" | "failed" | "no-value";
  reason?: string;
}

export async function fillField(
  field: DetectedField,
  value: string | boolean | undefined,
  skipNonEmpty: boolean
): Promise<FillResult> {
  const label = field.signals.label || field.signals.name || field.canonicalField || "unknown";

  if (value === undefined || value === "") {
    return { uid: field.uid, canonicalField: field.canonicalField, label, status: "no-value" };
  }

  // Don't overwrite if the field already has a value and the user opted to skip
  if (skipNonEmpty && !field.isEmpty) {
    return {
      uid: field.uid,
      canonicalField: field.canonicalField,
      label,
      status: "skipped",
      reason: "field already has a value",
    };
  }

  try {
    switch (field.elementType) {
      case "input-text":
      case "input-email":
      case "input-tel":
      case "input-url":
      case "input-number":
      case "input-date":
      case "textarea": {
        const el = field.element as HTMLInputElement | HTMLTextAreaElement;
        setInputValue(el, String(value));
        return { uid: field.uid, canonicalField: field.canonicalField, label, status: "filled" };
      }

      case "select": {
        const el = field.element as HTMLSelectElement;
        const success = setSelectValue(el, String(value));
        if (!success) {
          return {
            uid: field.uid,
            canonicalField: field.canonicalField,
            label,
            status: "failed",
            reason: `No option matched "${value}"`,
          };
        }
        return { uid: field.uid, canonicalField: field.canonicalField, label, status: "filled" };
      }

      case "radio-group": {
        if (!field.elements || field.elements.length === 0) {
          return {
            uid: field.uid,
            canonicalField: field.canonicalField,
            label,
            status: "failed",
            reason: "no radio elements found",
          };
        }
        const targetValue = boolToYesNo(value);
        const matched = findMatchingRadio(field.elements, targetValue);
        if (!matched) {
          return {
            uid: field.uid,
            canonicalField: field.canonicalField,
            label,
            status: "failed",
            reason: `No radio matched "${targetValue}"`,
          };
        }
        clickRadio(matched);
        return { uid: field.uid, canonicalField: field.canonicalField, label, status: "filled" };
      }

      case "input-checkbox": {
        const el = field.element as HTMLInputElement;
        const checked = typeof value === "boolean" ? value : value === "true" || value === "yes";
        setCheckboxValue(el, checked);
        return { uid: field.uid, canonicalField: field.canonicalField, label, status: "filled" };
      }

      default:
        return {
          uid: field.uid,
          canonicalField: field.canonicalField,
          label,
          status: "failed",
          reason: `unsupported element type: ${field.elementType}`,
        };
    }
  } catch (err) {
    return {
      uid: field.uid,
      canonicalField: field.canonicalField,
      label,
      status: "failed",
      reason: String(err),
    };
  }
}

function boolToYesNo(value: string | boolean): string {
  if (typeof value === "boolean") return value ? "yes" : "no";
  const lower = value.toLowerCase();
  if (lower === "true") return "yes";
  if (lower === "false") return "no";
  return value;
}

function findMatchingRadio(
  radios: HTMLInputElement[],
  desired: string
): HTMLInputElement | null {
  const desiredLower = desired.toLowerCase().trim();

  // Phase 1: exact value match
  for (const radio of radios) {
    if (radio.value.toLowerCase() === desiredLower) return radio;
  }

  // Phase 2: label text match
  for (const radio of radios) {
    const labelEl = radio.closest("label") ??
      (radio.id
        ? radio.ownerDocument.querySelector<HTMLLabelElement>(`label[for="${CSS.escape(radio.id)}"]`)
        : null);
    const labelText = labelEl?.textContent?.toLowerCase().trim() ?? "";
    if (labelText === desiredLower || labelText.includes(desiredLower) || desiredLower.includes(labelText)) {
      return radio;
    }
  }

  // Phase 3: "yes/no" normalization
  if (desiredLower === "yes") {
    return radios.find((r) => r.value.toLowerCase() === "true" || r.value === "1") ?? null;
  }
  if (desiredLower === "no") {
    return radios.find((r) => r.value.toLowerCase() === "false" || r.value === "0") ?? null;
  }

  return null;
}
