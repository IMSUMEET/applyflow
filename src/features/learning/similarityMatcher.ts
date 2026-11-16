import type { LearnedAnswer } from "@/models/learning";
import { normalizeText } from "@/features/autofill/matching/normalizer";

// Minimum Jaccard similarity to suggest saving an observed answer
export const SUGGEST_THRESHOLD = 0.35;
// Minimum Jaccard similarity to automatically apply a learned answer
export const APPLY_THRESHOLD = 0.60;

// Split normalized text into a deduplicated token set.
// Tokens shorter than 2 chars are ignored to avoid "i", "a", "or" noise.
export function tokenize(text: string): Set<string> {
  return new Set(
    normalizeText(text)
      .split(" ")
      .filter((t) => t.length >= 2)
  );
}

export function jaccardSimilarity(a: string, b: string): number {
  const setA = tokenize(a);
  const setB = tokenize(b);
  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return intersection / union;
}

export interface SimilarityMatch {
  answer: LearnedAnswer;
  similarity: number;
}

// Find the best matching learned answer for a question string.
// Only considers answers with autoFillEnabled=true and approvedByUser=true.
// Returns null if no match exceeds SUGGEST_THRESHOLD.
export function findSimilarAnswer(
  question: string,
  answers: LearnedAnswer[]
): SimilarityMatch | null {
  if (!question.trim() || answers.length === 0) return null;

  let best: SimilarityMatch | null = null;

  for (const answer of answers) {
    if (!answer.autoFillEnabled || !answer.approvedByUser) continue;

    const sim = jaccardSimilarity(question, answer.normalizedQuestion);
    if (sim >= SUGGEST_THRESHOLD && (!best || sim > best.similarity)) {
      best = { answer, similarity: sim };
    }
  }

  return best;
}

// Returns true if the match is strong enough to auto-apply without user confirmation.
export function isAutoApplyMatch(match: SimilarityMatch): boolean {
  return match.similarity >= APPLY_THRESHOLD;
}
