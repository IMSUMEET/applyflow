import type { CanonicalField } from "../canonicalFields";

export type FieldElementType =
  | "input-text"
  | "input-email"
  | "input-tel"
  | "input-number"
  | "input-url"
  | "input-date"
  | "input-checkbox"
  | "textarea"
  | "select"
  | "radio-group"
  | "unknown";

// Raw signals extracted from the DOM before matching
export interface FieldSignals {
  name: string; // name attribute, normalized
  fieldId: string; // id attribute, normalized
  label: string; // associated label text, normalized
  placeholder: string; // placeholder, normalized
  ariaLabel: string; // aria-label, normalized
  nearbyText: string; // surrounding text in parent elements, normalized
  inputType: string; // raw input type attribute (text, email, tel…)
}

// A fully resolved form field ready for autofill
export interface DetectedField {
  uid: string; // unique within a scan
  element: HTMLElement; // the actual DOM element (or fieldset for radio groups)
  elements?: HTMLInputElement[]; // for radio-group: individual radio inputs
  elementType: FieldElementType;
  signals: FieldSignals;
  canonicalField: CanonicalField | null;
  confidence: number;
  matchReasons: string[];
  currentValue: string;
  isEmpty: boolean;
}

export interface AutofillResult {
  fieldsDetected: number;
  fieldsFilled: number;
  learnedFieldsApplied: number;
  skipped: Array<{ label: string; reason: string }>;
  failed: Array<{ label: string; reason: string }>;
  unrecognized: Array<{ label: string }>;
}
