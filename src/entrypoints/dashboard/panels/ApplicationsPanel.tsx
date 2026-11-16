import { useEffect, useState } from "react";
import { ExternalLink, Trash2, Briefcase } from "lucide-react";
import { sendMessage } from "@/messaging/sender";
import type { Job, JobStatus } from "@/models/job";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { formatRelative } from "@/utils/format";

const statusColors: Record<JobStatus, "blue" | "green" | "yellow" | "red" | "gray" | "purple"> = {
  saved: "gray",
  "needs-referral": "purple",
  "ready-to-apply": "blue",
  applied: "blue",
  interview: "green",
  rejected: "red",
  offer: "green",
  withdrawn: "gray",
};

const statusLabels: Record<JobStatus, string> = {
  saved: "Saved",
  "needs-referral": "Needs Referral",
  "ready-to-apply": "Ready",
  applied: "Applied",
  interview: "Interview",
  rejected: "Rejected",
  offer: "Offer",
  withdrawn: "Withdrawn",
};

export function ApplicationsPanel() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<JobStatus | "all">("all");

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    try {
      const data = await sendMessage({ type: "GET_JOBS" });
      setJobs(data);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(job: Job, status: JobStatus) {
    await sendMessage({ type: "UPDATE_JOB", job: { ...job, status } });
    setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, status } : j)));
  }

  async function deleteJob(id: string) {
    await sendMessage({ type: "DELETE_JOB", jobId: id });
    setJobs((prev) => prev.filter((j) => j.id !== id));
  }

  const filtered = filter === "all" ? jobs : jobs.filter((j) => j.status === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
          <p className="text-gray-500 text-sm mt-1">{jobs.length} total jobs tracked.</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {(["all", "applied", "interview", "offer", "needs-referral", "saved"] as const).map(
          (s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                filter === s
                  ? "bg-brand-600 text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {s === "all" ? "All" : statusLabels[s]}
            </button>
          )
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
          <Briefcase className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <h3 className="text-gray-500 font-medium">No applications here</h3>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((job) => (
            <div
              key={job.id}
              className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-semibold text-gray-900 text-sm truncate">
                    {job.company}
                  </span>
                  <Badge color={statusColors[job.status]}>{statusLabels[job.status]}</Badge>
                </div>
                <p className="text-gray-600 text-sm truncate">{job.title}</p>
                <p className="text-gray-400 text-xs mt-0.5">{formatRelative(job.createdAt)}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={job.status}
                  onChange={(e) => void updateStatus(job, e.target.value as JobStatus)}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-600 bg-white"
                >
                  {(
                    [
                      "saved",
                      "needs-referral",
                      "ready-to-apply",
                      "applied",
                      "interview",
                      "rejected",
                      "offer",
                      "withdrawn",
                    ] as JobStatus[]
                  ).map((s) => (
                    <option key={s} value={s}>
                      {statusLabels[s]}
                    </option>
                  ))}
                </select>

                <a
                  href={job.jobUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-gray-400 hover:text-brand-600 transition-colors"
                  aria-label="Open job"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>

                <button
                  onClick={() => void deleteJob(job.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
