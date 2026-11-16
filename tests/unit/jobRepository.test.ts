import { describe, it, expect } from "vitest";
import { jobRepository } from "@/storage/jobRepository";

const baseJob = {
  company: "Acme Corp",
  title: "Software Engineer",
  jobUrl: "https://example.com/jobs/123",
  status: "saved" as const,
};

describe("jobRepository", () => {
  it("returns empty array when no jobs stored", async () => {
    expect(await jobRepository.findAll()).toEqual([]);
  });

  it("creates a job with generated id and timestamps", async () => {
    const job = await jobRepository.create(baseJob);
    expect(job.id).toBeTruthy();
    expect(job.createdAt).toBeTruthy();
    expect(job.company).toBe("Acme Corp");
  });

  it("retrieves a job by id", async () => {
    const created = await jobRepository.create(baseJob);
    const found = await jobRepository.getById(created.id);
    expect(found?.id).toBe(created.id);
  });

  it("returns null for unknown id", async () => {
    expect(await jobRepository.getById("does-not-exist")).toBeNull();
  });

  it("updates a job", async () => {
    const job = await jobRepository.create(baseJob);
    await jobRepository.update({ ...job, status: "applied" });
    const updated = await jobRepository.getById(job.id);
    expect(updated?.status).toBe("applied");
  });

  it("deletes a job", async () => {
    const job = await jobRepository.create(baseJob);
    await jobRepository.delete(job.id);
    expect(await jobRepository.getById(job.id)).toBeNull();
  });

  it("finds a job by URL", async () => {
    await jobRepository.create(baseJob);
    const found = await jobRepository.findByUrl("https://example.com/jobs/123");
    expect(found?.company).toBe("Acme Corp");
  });

  it("returns null for unmatched URL", async () => {
    expect(await jobRepository.findByUrl("https://other.com")).toBeNull();
  });

  it("stores multiple jobs independently", async () => {
    await jobRepository.create({ ...baseJob, company: "Alpha" });
    await jobRepository.create({ ...baseJob, company: "Beta" });
    const all = await jobRepository.findAll();
    expect(all).toHaveLength(2);
    expect(all.map((j) => j.company)).toContain("Alpha");
    expect(all.map((j) => j.company)).toContain("Beta");
  });
});
