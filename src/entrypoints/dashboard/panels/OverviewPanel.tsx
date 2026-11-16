import { useEffect, useState } from "react";
import { Briefcase, Users, UserCheck, Brain, TrendingUp } from "lucide-react";
import { sendMessage } from "@/messaging/sender";
import { Spinner } from "@/components/ui/Spinner";

interface Stats {
  totalJobs: number;
  applied: number;
  referralPending: number;
  contacts: number;
  learnedAnswers: number;
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
      <div className={`rounded-lg p-2.5 ${color}`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
}

export function OverviewPanel() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    try {
      const [jobs, assignments, contacts, answers] = await Promise.all([
        sendMessage({ type: "GET_JOBS" }),
        sendMessage({ type: "GET_REFERRAL_ASSIGNMENTS" }),
        sendMessage({ type: "GET_REFERRAL_CONTACTS" }),
        sendMessage({ type: "GET_LEARNED_ANSWERS" }),
      ]);

      setStats({
        totalJobs: jobs.length,
        applied: jobs.filter((j) => j.status === "applied").length,
        referralPending: assignments.filter(
          (a) => a.status === "pending" || a.status === "ready"
        ).length,
        contacts: contacts.length,
        learnedAnswers: answers.length,
      });
    } finally {
      setLoading(false);
    }
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
        <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
        <p className="text-gray-500 text-sm mt-1">Your job search at a glance.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard
          icon={<Briefcase className="h-5 w-5 text-blue-600" />}
          label="Total Jobs"
          value={stats?.totalJobs ?? 0}
          color="bg-blue-50"
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5 text-green-600" />}
          label="Applied"
          value={stats?.applied ?? 0}
          color="bg-green-50"
        />
        <StatCard
          icon={<Users className="h-5 w-5 text-purple-600" />}
          label="Referrals Pending"
          value={stats?.referralPending ?? 0}
          color="bg-purple-50"
        />
        <StatCard
          icon={<UserCheck className="h-5 w-5 text-orange-600" />}
          label="Contacts"
          value={stats?.contacts ?? 0}
          color="bg-orange-50"
        />
        <StatCard
          icon={<Brain className="h-5 w-5 text-pink-600" />}
          label="Learned Answers"
          value={stats?.learnedAnswers ?? 0}
          color="bg-pink-50"
        />
      </div>

      {stats?.totalJobs === 0 && (
        <div className="mt-10 text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
          <Briefcase className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <h3 className="text-gray-500 font-medium">No jobs tracked yet</h3>
          <p className="text-gray-400 text-sm mt-1">
            Visit a job posting and use the ApplyFlow popup to save it.
          </p>
        </div>
      )}
    </div>
  );
}
