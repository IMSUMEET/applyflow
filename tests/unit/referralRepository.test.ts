import { describe, it, expect } from "vitest";
import { referralRepository } from "@/storage/referralRepository";

const baseContact = { name: "Alice", company: "Acme" };
const baseAssignment = { jobId: "job-1", status: "pending" as const };

describe("referralRepository.contacts", () => {
  it("returns empty array initially", async () => {
    expect(await referralRepository.contacts.findAll()).toEqual([]);
  });

  it("creates a contact with id and timestamps", async () => {
    const c = await referralRepository.contacts.create(baseContact);
    expect(c.id).toBeTruthy();
    expect(c.name).toBe("Alice");
  });

  it("finds contacts by company", async () => {
    await referralRepository.contacts.create({ name: "Bob", company: "Google" });
    await referralRepository.contacts.create({ name: "Carol", company: "Microsoft" });
    const results = await referralRepository.contacts.findByCompany("google");
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Bob");
  });

  it("deletes a contact", async () => {
    const c = await referralRepository.contacts.create(baseContact);
    await referralRepository.contacts.delete(c.id);
    expect(await referralRepository.contacts.getById(c.id)).toBeNull();
  });
});

describe("referralRepository.assignments", () => {
  it("creates and retrieves an assignment", async () => {
    const a = await referralRepository.assignments.create(baseAssignment);
    expect(a.id).toBeTruthy();
    expect(a.jobId).toBe("job-1");
  });

  it("finds assignments by job", async () => {
    await referralRepository.assignments.create({ jobId: "job-1", status: "pending" });
    await referralRepository.assignments.create({ jobId: "job-2", status: "pending" });
    const results = await referralRepository.assignments.findByJob("job-1");
    expect(results).toHaveLength(1);
  });

  it("finds assignments by contact", async () => {
    await referralRepository.assignments.create({ jobId: "job-1", contactId: "c-1", status: "pending" });
    await referralRepository.assignments.create({ jobId: "job-2", contactId: "c-2", status: "pending" });
    const results = await referralRepository.assignments.findByContact("c-1");
    expect(results).toHaveLength(1);
    expect(results[0].jobId).toBe("job-1");
  });

  it("updates an assignment status", async () => {
    const a = await referralRepository.assignments.create(baseAssignment);
    await referralRepository.assignments.update({ ...a, status: "requested" });
    const all = await referralRepository.assignments.findAll();
    const updated = all.find((x) => x.id === a.id);
    expect(updated?.status).toBe("requested");
  });
});
