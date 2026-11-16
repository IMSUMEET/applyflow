// Scans a document for all visible, fillable form fields.
// Returns a list of DetectedField with canonical field matches applied.
//
// Handles: inputs, textareas, selects, radio groups.
// Skips: hidden fields, disabled fields, file inputs, submit/reset buttons.

import type { DetectedField, FieldElementType, FieldSignals } from "./detectedField";
import { matchField } from "../matching/fieldMatcher";
import { normalizeText, normalizeAttributeName } from "../matching/normalizer";
import { generateId } from "@/utils/id";

type FormElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

const SKIP_INPUT_TYPES = new Set([
  "hidden",
  "submit",
  "reset",
  "button",
  "image",
  "file",
  "password",
  "search", // not relevant to autofill
]);

export function scanFields(doc: Document): DetectedField[] {
  const fields: DetectedField[] = [];
  const processedRadioGroups = new Set<string>();

  const allElements = doc.querySelectorAll<FormElement>(
    'input:not([type="hidden"]):not([type="file"]):not([type="submit"]):not([type="reset"]):not([type="button"]):not([type="password"]), textarea, select'
  );

  for (const element of allElements) {
    if (!isVisible(element)) continue;
    if (element.disabled) continue;

    // nodeName comparisons instead of instanceof — work correctly across JSDOM realms
    if (element.nodeName === "INPUT" && (element as HTMLInputElement).type === "radio") {
      const groupName = element.getAttribute("name") ?? "";
      if (!groupName || processedRadioGroups.has(groupName)) continue;
      processedRadioGroups.add(groupName);

      const radios = Array.from(
        doc.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${CSS.escape(groupName)}"]`)
      );
      const field = buildRadioGroupField(radios, doc);
      if (field) fields.push(field);
      continue;
    }

    if (
      element.nodeName === "INPUT" &&
      SKIP_INPUT_TYPES.has((element as HTMLInputElement).type)
    ) {
      continue;
    }

    const field = buildField(element, doc);
    if (field) fields.push(field);
  }

  return fields;
}

function buildField(element: FormElement, doc: Document): DetectedField | null {
  const signals = extractSignals(element, doc);
  const match = matchField(signals);

  const elementType = getElementType(element);
  const currentValue = getCurrentValue(element);

  return {
    uid: generateId(),
    element,
    elementType,
    signals,
    canonicalField: match.field,
    confidence: match.confidence,
    matchReasons: match.reasons,
    currentValue,
    isEmpty: currentValue.trim() === "",
  };
}

function buildRadioGroupField(
  radios: HTMLInputElement[],
  doc: Document
): DetectedField | null {
  if (radios.length === 0) return null;

  const first = radios[0];
  if (!first) return null;

  // Use the fieldset legend or the shared name as the label signal
  const fieldset = first.closest("fieldset");
  const legendText = fieldset?.querySelector("legend")?.textContent?.trim() ?? "";
  const sharedLabel = legendText || first.name;

  const signals: FieldSignals = {
    name: normalizeAttributeName(first.name),
    fieldId: normalizeAttributeName(first.id),
    label: normalizeText(sharedLabel || getLabelFor(first, doc)),
    placeholder: "",
    ariaLabel: normalizeText(first.getAttribute("aria-label") ?? ""),
    nearbyText: normalizeText(getNearbyText(first)),
    inputType: "radio",
  };

  const match = matchField(signals);
  const checkedRadio = radios.find((r) => r.checked);

  return {
    uid: generateId(),
    element: fieldset ?? (first.parentElement as HTMLElement) ?? first,
    elements: radios,
    elementType: "radio-group",
    signals,
    canonicalField: match.field,
    confidence: match.confidence,
    matchReasons: match.reasons,
    currentValue: checkedRadio?.value ?? "",
    isEmpty: !checkedRadio,
  };
}

function extractSignals(element: FormElement, doc: Document): FieldSignals {
  const rawName = element.getAttribute("name") ?? "";
  const rawId = element.id;
  const rawPlaceholder =
    element.nodeName === "INPUT" || element.nodeName === "TEXTAREA"
      ? (element as HTMLInputElement).placeholder ?? ""
      : "";
  const rawAriaLabel = element.getAttribute("aria-label") ?? "";
  const inputType =
    element.nodeName === "INPUT"
      ? (element as HTMLInputElement).type.toLowerCase()
      : element.tagName.toLowerCase();

  return {
    name: normalizeAttributeName(rawName),
    fieldId: normalizeAttributeName(rawId),
    label: normalizeText(getLabelFor(element, doc)),
    placeholder: normalizeText(rawPlaceholder),
    ariaLabel: normalizeText(rawAriaLabel),
    nearbyText: normalizeText(getNearbyText(element)),
    inputType,
  };
}

function getLabelFor(element: FormElement, doc: Document): string {
  let raw = "";

  // 1. Explicit <label for="id">
  if (element.id) {
    const label = doc.querySelector<HTMLLabelElement>(`label[for="${CSS.escape(element.id)}"]`);
    if (label?.textContent) raw = label.textContent.trim();
  }

  // 2. Wrapping <label>
  if (!raw) {
    const parentLabel = element.closest("label");
    if (parentLabel?.textContent) raw = parentLabel.textContent.trim();
  }

  // 3. aria-labelledby
  if (!raw) {
    const labelledBy = element.getAttribute("aria-labelledby");
    if (labelledBy) {
      // Multiple ids are space-separated
      const text = labelledBy.split(" ")
        .map((id) => doc.getElementById(id)?.textContent?.trim() ?? "")
        .filter(Boolean)
        .join(" ");
      if (text) raw = text;
    }
  }

  // 4. Previous sibling text node or element
  if (!raw) raw = getPreviousTextSibling(element);

  // 5. Parent element's text that isn't from the input itself
  if (!raw) raw = getParentDescriptionText(element);

  return cleanLabelText(raw);
}

// Strip asterisks, "required" / "optional" markers, and trailing noise that
// break exact-pattern matching (e.g. "Job Title *" → "Job Title").
function cleanLabelText(text: string): string {
  return text
    .replace(/\s*\*+\s*/g, " ")       // asterisks used as required markers
    .replace(/\(optional\)\s*/gi, "")
    .replace(/\(required\)\s*/gi, "")
    .replace(/optional\s*$/gi, "")
    .replace(/required\s*$/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function getPreviousTextSibling(element: Element): string {
  let sibling = element.previousSibling;
  while (sibling) {
    if (sibling.nodeType === 3 /* TEXT_NODE */) {
      const text = sibling.textContent?.trim();
      if (text) return text;
    }
    if (sibling.nodeType === 1 /* ELEMENT_NODE */ && "tagName" in sibling) {
      const el = sibling as Element;
      const text = el.textContent?.trim();
      // Don't grab text from another input/select/textarea
      if (text && !["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(el.tagName)) {
        return text;
      }
    }
    sibling = sibling.previousSibling;
  }
  return "";
}

function getParentDescriptionText(element: Element): string {
  const parent = element.parentElement;
  if (!parent) return "";
  const clone = parent.cloneNode(true) as Element;
  // Remove all form elements from clone
  for (const el of clone.querySelectorAll("input, select, textarea, button")) {
    el.remove();
  }
  return clone.textContent?.trim().slice(0, 100) ?? "";
}

function getNearbyText(element: Element): string {
  const parent = element.parentElement?.parentElement;
  if (!parent) return "";
  const clone = parent.cloneNode(true) as Element;
  for (const el of clone.querySelectorAll("input, select, textarea, button")) {
    el.remove();
  }
  return clone.textContent?.trim().slice(0, 200) ?? "";
}

function getElementType(element: FormElement): FieldElementType {
  switch (element.nodeName) {
    case "TEXTAREA": return "textarea";
    case "SELECT": return "select";
    case "INPUT": {
      switch ((element as HTMLInputElement).type) {
        case "email": return "input-email";
        case "tel": return "input-tel";
        case "number": return "input-number";
        case "url": return "input-url";
        case "date": return "input-date";
        case "checkbox": return "input-checkbox";
        default: return "input-text";
      }
    }
    default: return "unknown";
  }
}

function getCurrentValue(element: FormElement): string {
  if (element.nodeName === "INPUT" && (element as HTMLInputElement).type === "checkbox") {
    return (element as HTMLInputElement).checked ? element.value || "true" : "";
  }
  return element.value ?? "";
}

function isVisible(element: Element): boolean {
  // Use the element's own window to avoid cross-realm failures in test environments
  const view = element.ownerDocument?.defaultView;
  if (!view) return true;

  try {
    const style = view.getComputedStyle(element as HTMLElement);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
      return false;
    }

    let el: Element | null = element;
    while (el && el !== element.ownerDocument.body) {
      if (view.getComputedStyle(el as HTMLElement).display === "none") return false;
      el = el.parentElement;
    }
  } catch {
    // getComputedStyle can throw in some sandboxed contexts; assume visible
    return true;
  }

  return true;
}
