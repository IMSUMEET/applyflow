import { useEffect, useState } from "react";
import { Users, Copy, CheckCheck } from "lucide-react";
import { sendMessage } from "@/messaging/sender";
import type { Job } from "@/models/job";
import type { ReferralContact, ReferralAssignment } from "@/models/referral";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";

interface ReferralGroup {
  contact: ReferralContact | null;
  company: string;
  jobs: Array<{ job: Job; assignment: ReferralAssignment }>;
}

export function ReferralsPanel() {
  const [groups, setGroups] = useState<ReferralGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    try {
      const [jobs, assignments, contacts] = await Promise.all([
        sendMessage({ type: "GET_JOBS" }),
        sendMessage({ type: "GET_REFERRAL_ASSIGNMENTS" }),
        sendMessage({ type: "GET_REFERRAL_CONTACTS" }),
      ]);

      const contactMap = new Map(contacts.map((c) => [c.id, c]));
      const jobMap = new Map(jobs.map((j) => [j.id, j]));

      const pending = assignments.filter((a) => a.status === "pending" || a.status === "ready");

      const grouped = new Map<string, ReferralGroup>();
      for (const assignment of pending) {
        const job = jobMap.get(assignment.jobId);
        if (!job) continue;
        const key = assignment.contactId ?? "__unassigned__";
        if (!grouped.has(key)) {
          const contact = assignment.contactId
            ? (contactMap.get(assignment.contactId) ?? null)
            : null;
          grouped.set(key, {
            contact,
            company: contact?.company ?? job.company,
            jobs: [],
          });
        }
        grouped.get(key)!.jobs.push({ job, assignment });
      }

      setGroups(Array.from(grouped.values()));
    } finally {
      setLoading(false);
    }
  }

  function generateMessage(group: ReferralGroup): string {
    const name = group.contact?.name ?? "there";
    const company = group.company;
    const jobList = group.jobs
      .map((g, i) => `${i + 1}. ${g.job.title} — ${g.job.jobUrl}`)
      .join("\n");

    return `Hi ${name},\n\nI came across a few engineering openings at ${company} that align with my background.\n\nWould you be comfortable referring me to the following positions?\n\n${jobList}\n\nI've attached my resume for reference.\n\nThank you for considering it!`;
  }

  async function copyMessage(group: ReferralGroup, key: string) {
    await navigator.clipboard.writeText(generateMessage(group));
    setCopiedId(key);
    setTimeout(() => setCopiedId(null), 2000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Referral Queue</h1>
        <p className="text-gray-500 text-sm mt-1">
          {groups.reduce((s, g) => s + g.jobs.length, 0)} pending referral opportunities.
        </p>
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
          <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <h3 className="text-gray-500 font-medium">No referrals pending</h3>
          <p className="text-gray-400 text-sm mt-1">
            Use "Save for Referral" in the popup to add jobs here.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((group, idx) => {
            const key = group.contact?.id ?? `unassigned-${idx}`;
            return (
              <div key={key} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Group header */}
                <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-gray-900 text-sm">
                      {group.contact?.name ?? "Unassigned"}
                    </span>
                    <span className="text-gray-400 text-sm mx-2">·</span>
                    <span className="text-gray-600 text-sm">{group.company}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge color="purple">{group.jobs.length} jobs</Badge>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => void copyMessage(group, key)}
                    >
                      {copiedId === key ? (
                        <CheckCheck className="h-3.5 w-3.5 text-green-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      {copiedId === key ? "Copied!" : "Copy Message"}
                    </Button>
                  </div>
                </div>

                {/* Job list */}
                <ul className="divide-y divide-gray-50">
                  {group.jobs.map(({ job }) => (
                    <li key={job.id} className="px-5 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{job.title}</p>
                        {job.location && (
                          <p className="text-xs text-gray-400">{job.location}</p>
                        )}
                      </div>
                      <a
                        href={job.jobUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-brand-600 hover:underline"
                      >
                        View →
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
