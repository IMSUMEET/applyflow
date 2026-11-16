// Text normalization utilities for field matching.
// All matching happens on normalized strings to reduce brittleness.

export function normalizeText(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[_\-./\\]/g, " ") // treat separators as spaces
    .replace(/[^a-z0-9\s]/g, "") // strip remaining punctuation
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeAttributeName(raw: string): string {
  // camelCase → space-separated ("firstName" → "first name")
  const spaced = raw.replace(/([a-z])([A-Z])/g, "$1 $2");
  return normalizeText(spaced);
}

// Returns true if needle is an exact token within haystack
// e.g. contains("first name required", "first name") → true
// e.g. contains("confirm email", "email") → true
export function containsToken(haystack: string, needle: string): boolean {
  if (!haystack || !needle) return false;
  return haystack === needle || haystack.includes(needle);
}

// Exact equality after normalization
export function exactMatch(a: string, b: string): boolean {
  return normalizeText(a) === normalizeText(b);
}
