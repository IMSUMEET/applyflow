// Core matching engine: takes raw field signals and returns the best
// canonical field guess along with a confidence score and reasoning.
//
// Confidence model:
//   typeHint match              +0.35  (input type="email" → email)
//   exact pattern on label      +0.45
//   exact pattern on name/id    +0.40
//   exact pattern on placeholder+0.30
//   "contains" on label         +0.20
//   "contains" on name/id       +0.18
//   negative pattern match      -0.30
// Score is clamped to [0, 1]. A field must score ≥ 0.4 to be reported.

import type { CanonicalField, MatchResult } from "../canonicalFields";
import type { FieldSignals } from "../detection/detectedField";
import { FIELD_MAPPINGS } from "./knownMappings";
import { normalizeText, normalizeAttributeName, containsToken } from "./normalizer";

const HIGH_CONFIDENCE = 0.70;
// 0.33 lets type="email" alone (0.35) qualify while still filtering out noise
const MEDIUM_CONFIDENCE = 0.33;

export function matchField(signals: FieldSignals): MatchResult {
  const candidates: Array<{ field: CanonicalField; score: number; reasons: string[] }> = [];

  const normLabel = normalizeText(signals.label);
  const normName = normalizeAttributeName(signals.name);
  const normId = normalizeAttributeName(signals.fieldId);
  const normPlaceholder = normalizeText(signals.placeholder);
  const normAriaLabel = normalizeText(signals.ariaLabel);

  for (const mapping of FIELD_MAPPINGS) {
    let score = 0;
    const reasons: string[] = [];

    // ── Type hint (highest initial signal) ────────────────────────────────────
    if (mapping.typeHint && signals.inputType === mapping.typeHint) {
      score += 0.35;
      reasons.push(`type="${mapping.typeHint}"`);
    }

    // ── Exact pattern matching ─────────────────────────────────────────────────
    for (const pattern of mapping.exactPatterns) {
      if (normLabel && normLabel === pattern) {
        score += 0.45;
        reasons.push(`label="${pattern}"`);
        break;
      }
    }
    for (const pattern of mapping.exactPatterns) {
      if ((normName && normName === pattern) || (normId && normId === pattern)) {
        score += 0.40;
        reasons.push(`name/id="${pattern}"`);
        break;
      }
    }
    for (const pattern of mapping.exactPatterns) {
      if (normPlaceholder && normPlaceholder === pattern) {
        score += 0.30;
        reasons.push(`placeholder="${pattern}"`);
        break;
      }
      if (normAriaLabel && normAriaLabel === pattern) {
        score += 0.30;
        reasons.push(`aria-label="${pattern}"`);
        break;
      }
    }

    // ── Substring matching ─────────────────────────────────────────────────────
    for (const pattern of mapping.containsPatterns) {
      let hit = false;
      if (normLabel && containsToken(normLabel, pattern)) {
        score += 0.20;
        reasons.push(`label contains "${pattern}"`);
        hit = true;
      }
      if (!hit && (normName && containsToken(normName, pattern))) {
        score += 0.18;
        reasons.push(`name contains "${pattern}"`);
        hit = true;
      }
      if (!hit && normId && containsToken(normId, pattern)) {
        score += 0.15;
        reasons.push(`id contains "${pattern}"`);
      }
      if (hit) break; // one contains match per field is enough to avoid stacking
    }

    // ── Negative patterns (reduce false positives) ─────────────────────────────
    if (mapping.negativePatterns) {
      for (const neg of mapping.negativePatterns) {
        const negNorm = normalizeText(neg);
        if (
          (normLabel && containsToken(normLabel, negNorm)) ||
          (normName && containsToken(normName, negNorm)) ||
          (normId && containsToken(normId, negNorm))
        ) {
          score -= 0.30;
          reasons.push(`negative: "${neg}"`);
          break;
        }
      }
    }

    score = Math.max(0, Math.min(1, score));

    if (score >= MEDIUM_CONFIDENCE) {
      candidates.push({ field: mapping.field, score, reasons });
    }
  }

  // Pick the highest-scoring candidate
  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];

  if (!best) {
    return { field: null, confidence: 0, reasons: [] };
  }

  return {
    field: best.field,
    confidence: best.score,
    reasons: best.reasons,
  };
}

export function isHighConfidence(confidence: number): boolean {
  return confidence >= HIGH_CONFIDENCE;
}

export function isMediumConfidence(confidence: number): boolean {
  return confidence >= MEDIUM_CONFIDENCE && confidence < HIGH_CONFIDENCE;
}
