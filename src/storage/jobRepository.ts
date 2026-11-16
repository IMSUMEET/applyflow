import type { Job } from "@/models/job";
import { JobSchema } from "@/models/job";
import { storageGet, storageSet } from "./chromeStorage";
import { generateId } from "@/utils/id";

const KEY = "jobs";

async function loadAll(): Promise<Job[]> {
  const raw = await storageGet<unknown[]>(KEY);
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    const r = JobSchema.safeParse(item);
    return r.success ? [r.data] : [];
  });
}

async function saveAll(jobs: Job[]): Promise<void> {
  await storageSet(KEY, jobs);
}

export const jobRepository = {
  async findAll(): Promise<Job[]> {
    return loadAll();
  },

  async getById(id: string): Promise<Job | null> {
    const jobs = await loadAll();
    return jobs.find((j) => j.id === id) ?? null;
  },

  async create(data: Omit<Job, "id" | "createdAt" | "updatedAt">): Promise<Job> {
    const jobs = await loadAll();
    const now = new Date().toISOString();
    const job: Job = { ...data, id: generateId(), createdAt: now, updatedAt: now };
    await saveAll([...jobs, job]);
    return job;
  },

  async update(job: Job): Promise<void> {
    const jobs = await loadAll();
    const updated = jobs.map((j) =>
      j.id === job.id ? { ...job, updatedAt: new Date().toISOString() } : j
    );
    await saveAll(updated);
  },

  async delete(id: string): Promise<void> {
    const jobs = await loadAll();
    await saveAll(jobs.filter((j) => j.id !== id));
  },

  async findByUrl(jobUrl: string): Promise<Job | null> {
    const jobs = await loadAll();
    return jobs.find((j) => j.jobUrl === jobUrl) ?? null;
  },
};
