import type { LearnedAnswer, LearnedFieldMapping } from "@/models/learning";
import { LearnedAnswerSchema, LearnedFieldMappingSchema } from "@/models/learning";
import { storageGet, storageSet } from "./chromeStorage";
import { generateId } from "@/utils/id";

const ANSWERS_KEY = "learnedAnswers";
const MAPPINGS_KEY = "learnedFieldMappings";

async function loadAnswers(): Promise<LearnedAnswer[]> {
  const raw = await storageGet<unknown[]>(ANSWERS_KEY);
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    const r = LearnedAnswerSchema.safeParse(item);
    return r.success ? [r.data] : [];
  });
}

async function loadMappings(): Promise<LearnedFieldMapping[]> {
  const raw = await storageGet<unknown[]>(MAPPINGS_KEY);
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    const r = LearnedFieldMappingSchema.safeParse(item);
    return r.success ? [r.data] : [];
  });
}

export const learningRepository = {
  answers: {
    async findAll(): Promise<LearnedAnswer[]> {
      return loadAnswers();
    },

    async getById(id: string): Promise<LearnedAnswer | null> {
      const answers = await loadAnswers();
      return answers.find((a) => a.id === id) ?? null;
    },

    async create(
      data: Omit<LearnedAnswer, "id" | "createdAt" | "updatedAt" | "lastConfirmedAt" | "usageCount">
    ): Promise<LearnedAnswer> {
      const answers = await loadAnswers();
      const now = new Date().toISOString();
      const answer: LearnedAnswer = {
        ...data,
        id: generateId(),
        createdAt: now,
        updatedAt: now,
        lastConfirmedAt: now,
        usageCount: 0,
      };
      await storageSet(ANSWERS_KEY, [...answers, answer]);
      return answer;
    },

    async update(answer: LearnedAnswer): Promise<void> {
      const answers = await loadAnswers();
      const updated = answers.map((a) =>
        a.id === answer.id ? { ...answer, updatedAt: new Date().toISOString() } : a
      );
      await storageSet(ANSWERS_KEY, updated);
    },

    async delete(id: string): Promise<void> {
      const answers = await loadAnswers();
      await storageSet(ANSWERS_KEY, answers.filter((a) => a.id !== id));
    },

    async incrementUsage(id: string): Promise<void> {
      const answers = await loadAnswers();
      const updated = answers.map((a) =>
        a.id === id
          ? { ...a, usageCount: a.usageCount + 1, lastConfirmedAt: new Date().toISOString() }
          : a
      );
      await storageSet(ANSWERS_KEY, updated);
    },
  },

  mappings: {
    async findAll(): Promise<LearnedFieldMapping[]> {
      return loadMappings();
    },

    async findByIdentifier(rawIdentifier: string): Promise<LearnedFieldMapping | null> {
      const mappings = await loadMappings();
      return mappings.find((m) => m.rawIdentifier === rawIdentifier) ?? null;
    },

    async upsert(
      data: Omit<LearnedFieldMapping, "id" | "createdAt" | "usageCount">
    ): Promise<LearnedFieldMapping> {
      const mappings = await loadMappings();
      const existing = mappings.find((m) => m.rawIdentifier === data.rawIdentifier);
      if (existing) {
        const updated = { ...existing, ...data, usageCount: existing.usageCount + 1 };
        await storageSet(MAPPINGS_KEY, mappings.map((m) => (m.id === existing.id ? updated : m)));
        return updated;
      }
      const now = new Date().toISOString();
      const mapping: LearnedFieldMapping = { ...data, id: generateId(), createdAt: now, usageCount: 0 };
      await storageSet(MAPPINGS_KEY, [...mappings, mapping]);
      return mapping;
    },

    async delete(id: string): Promise<void> {
      const mappings = await loadMappings();
      await storageSet(MAPPINGS_KEY, mappings.filter((m) => m.id !== id));
    },
  },
};
