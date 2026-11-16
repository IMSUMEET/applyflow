import type { DigestData, DigestGroup } from "@/messaging/messages";
import { jobRepository } from "@/storage/jobRepository";
import { referralRepository } from "@/storage/referralRepository";

export async function buildDigest(): Promise<DigestData> {
  const [jobs, assignments, contacts] = await Promise.all([
    jobRepository.findAll(),
    referralRepository.assignments.findAll(),
    referralRepository.contacts.findAll(),
  ]);

  const contactMap = new Map(contacts.map((c) => [c.id, c]));

  // Only include jobs with pending referral assignments
  const pendingAssignments = assignments.filter(
    (a) => a.status === "pending" || a.status === "ready"
  );

  // Group: contactId (or null) → { contact info, jobs[] }
  const grouped = new Map<string | null, DigestGroup>();

  for (const assignment of pendingAssignments) {
    const job = jobs.find((j) => j.id === assignment.jobId);
    if (!job) continue;

    const key = assignment.contactId ?? null;
    const contact = key ? contactMap.get(key) : undefined;

    if (!grouped.has(key)) {
      grouped.set(key, {
        contactId: key,
        contactName: contact?.name ?? "Unassigned",
        company: contact?.company ?? job.company,
        jobs: [],
      });
    }

    grouped.get(key)!.jobs.push({
      title: job.title,
      url: job.jobUrl,
      jobId: job.id,
    });
  }

  const groups = Array.from(grouped.values());

  return {
    groups,
    totalJobs: groups.reduce((sum, g) => sum + g.jobs.length, 0),
    generatedAt: new Date().toISOString(),
  };
}
