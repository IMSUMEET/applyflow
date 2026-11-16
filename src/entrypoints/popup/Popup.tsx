import { useEffect, useState } from "react";
import {
  Zap,
  Bookmark,
  BarChart2,
  LayoutDashboard,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  SkipForward,
  Brain,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { sendMessage } from "@/messaging/sender";
import type { DetectedJobInfo } from "@/messaging/messages";
import type { AutofillResult } from "@/features/autofill/detection/detectedField";
import type { Job } from "@/models/job";

interface PopupStats {
  totalApplications: number;
  referralJobs: number;
  contacts: number;
}

type View = "main" | "autofill-result";

export function Popup() {
  const [currentTab, setCurrentTab] = useState<chrome.tabs.Tab | null>(null);
  const [currentJob, setCurrentJob] = useState<DetectedJobInfo | null>(null);
  const [stats, setStats] = useState<PopupStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [view, setView] = useState<View>("main");
  const [autofillResult, setAutofillResult] = useState<AutofillResult | null>(null);

  useEffect(() => {
    void init();
  }, []);

  async function init() {
    setLoading(true);
    try {
      await sendMessage({ type: "PING" });

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      setCurrentTab(tab ?? null);

      // Ask content script for job info directly
      if (tab?.id) {
        try {
          const jobInfo = await chrome.tabs.sendMessage(tab.id, { type: "GET_JOB_INFO" });
          if (jobInfo?.company || jobInfo?.title) setCurrentJob(jobInfo as DetectedJobInfo);
        } catch {
          // Content script not injected yet (e.g. chrome:// pages) — that's fine
        }
      }

      const [jobs, assignments, contacts] = await Promise.all([
        sendMessage({ type: "GET_JOBS" }),
        sendMessage({ type: "GET_REFERRAL_ASSIGNMENTS" }),
        sendMessage({ type: "GET_REFERRAL_CONTACTS" }),
      ]);

      const referralJobs = new Set(assignments.map((a) => a.jobId)).size;
      setStats({
        totalApplications: (jobs as Job[]).length,
        referralJobs,
        contacts: contacts.length,
      });
    } catch (err) {
      console.error("[ApplyFlow Popup] Init error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAutofill() {
    setActionLoading("autofill");
    try {
      const result = await sendMessage({ type: "EXECUTE_AUTOFILL" });
      setAutofillResult(result);
      setView("autofill-result");
    } catch {
      setStatusMsg({ type: "error", text: "Autofill failed. Check that you're on a job application page." });
      setTimeout(() => setStatusMsg(null), 3500);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSaveForReferral() {
    if (!currentTab?.url) return;
    setActionLoading("referral");
    try {
      await sendMessage({
        type: "SAVE_JOB",
        job: {
          company: currentJob?.company || "Unknown",
          title: currentJob?.title || "Unknown Position",
          location: currentJob?.location,
          jobUrl: currentTab.url,
          status: "needs-referral",
        },
      });
      setStatusMsg({ type: "success", text: "Saved to referral queue!" });
      await init();
    } catch {
      setStatusMsg({ type: "error", text: "Failed to save job." });
    } finally {
      setActionLoading(null);
      setTimeout(() => setStatusMsg(null), 3000);
    }
  }

  async function handleTrackApplication() {
    if (!currentTab?.url) return;
    setActionLoading("track");
    try {
      await sendMessage({
        type: "SAVE_JOB",
        job: {
          company: currentJob?.company || "Unknown",
          title: currentJob?.title || "Unknown Position",
          location: currentJob?.location,
          jobUrl: currentTab.url,
          status: "saved",
        },
      });
      setStatusMsg({ type: "success", text: "Application tracked!" });
      await init();
    } catch {
      setStatusMsg({ type: "error", text: "Failed to track application." });
    } finally {
      setActionLoading(null);
      setTimeout(() => setStatusMsg(null), 3000);
    }
  }

  function openDashboard() {
    void chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
  }

  if (loading) {
    return (
      <div className="w-72 h-48 flex items-center justify-center">
        <Spinner size="md" />
      </div>
    );
  }

  if (view === "autofill-result" && autofillResult) {
    return <AutofillResultView result={autofillResult} onClose={() => setView("main")} />;
  }

  return (
    <div className="w-72 bg-white flex flex-col">
      {/* Header */}
      <div className="bg-brand-600 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-white" fill="white" />
          <span className="text-white font-bold text-base tracking-tight">ApplyFlow</span>
        </div>
        <button
          onClick={() => void init()}
          className="text-brand-200 hover:text-white transition-colors"
          aria-label="Refresh"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Current Job */}
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">
          Current Page
        </p>
        {currentJob?.company || currentJob?.title ? (
          <div>
            <p className="font-semibold text-gray-900 text-sm truncate">
              {currentJob.company || "Unknown Company"}
            </p>
            <p className="text-gray-500 text-xs truncate">
              {currentJob.title || "Unknown Position"}
            </p>
            {currentJob.location && (
              <p className="text-gray-400 text-xs truncate">{currentJob.location}</p>
            )}
          </div>
        ) : (
          <p className="text-gray-400 text-sm italic">No job detected on this page</p>
        )}
      </div>

      {/* Status message */}
      {statusMsg && (
        <div
          className={`mx-4 mt-3 rounded-lg px-3 py-2 text-xs font-medium ${
            statusMsg.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : statusMsg.type === "info"
              ? "bg-blue-50 text-blue-700 border border-blue-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {statusMsg.text}
        </div>
      )}

      {/* Actions */}
      <div className="px-4 py-3 flex flex-col gap-2">
        <Button
          variant="primary"
          size="sm"
          className="w-full justify-start gap-2"
          loading={actionLoading === "autofill"}
          onClick={() => void handleAutofill()}
        >
          <Zap className="h-3.5 w-3.5" />
          Autofill Application
        </Button>

        <Button
          variant="secondary"
          size="sm"
          className="w-full justify-start gap-2"
          disabled={!currentTab?.url}
          loading={actionLoading === "referral"}
          onClick={() => void handleSaveForReferral()}
        >
          <Bookmark className="h-3.5 w-3.5" />
          Save for Referral
        </Button>

        <Button
          variant="secondary"
          size="sm"
          className="w-full justify-start gap-2"
          disabled={!currentTab?.url}
          loading={actionLoading === "track"}
          onClick={() => void handleTrackApplication()}
        >
          <BarChart2 className="h-3.5 w-3.5" />
          Track Application
        </Button>
      </div>

      <div className="mx-4 border-t border-gray-100" />

      {/* Stats */}
      <div className="px-4 py-3 grid grid-cols-3 gap-2 text-center">
        <StatCell label="Applied" value={stats?.totalApplications ?? 0} color="blue" />
        <StatCell label="Referrals" value={stats?.referralJobs ?? 0} color="purple" />
        <StatCell label="Contacts" value={stats?.contacts ?? 0} color="green" />
      </div>

      {/* Footer */}
      <div className="px-4 pb-3">
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-brand-600 hover:bg-brand-50"
          onClick={openDashboard}
        >
          <LayoutDashboard className="h-3.5 w-3.5" />
          Open Dashboard
        </Button>
      </div>
    </div>
  );
}

function AutofillResultView({
  result,
  onClose,
}: {
  result: AutofillResult;
  onClose: () => void;
}) {
  return (
    <div className="w-72 bg-white flex flex-col">
      {/* Header */}
      <div className="bg-brand-600 px-4 py-3">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-white" fill="white" />
          <span className="text-white font-bold text-base">Autofill Complete</span>
        </div>
      </div>

      <div className="px-4 py-3 space-y-3">
        {/* Summary rows */}
        <SummaryRow
          icon={<CheckCircle2 className="h-4 w-4 text-green-500" />}
          label="Fields filled"
          value={result.fieldsFilled}
          color="text-green-700"
        />
        {result.learnedFieldsApplied > 0 && (
          <SummaryRow
            icon={<Brain className="h-4 w-4 text-brand-500" />}
            label="From memory"
            value={result.learnedFieldsApplied}
            color="text-brand-700"
          />
        )}
        <SummaryRow
          icon={<SkipForward className="h-4 w-4 text-gray-400" />}
          label="Skipped (non-empty)"
          value={result.skipped.length}
          color="text-gray-500"
        />
        <SummaryRow
          icon={<AlertCircle className="h-4 w-4 text-red-400" />}
          label="Failed"
          value={result.failed.length}
          color="text-red-600"
        />
        <SummaryRow
          icon={<HelpCircle className="h-4 w-4 text-amber-400" />}
          label="Unrecognized"
          value={result.unrecognized.length}
          color="text-amber-600"
        />
      </div>

      {/* Detail lists */}
      {result.failed.length > 0 && (
        <div className="px-4 pb-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Failed
          </p>
          {result.failed.slice(0, 3).map((f, i) => (
            <p key={i} className="text-xs text-red-600 truncate">
              {f.label}: {f.reason}
            </p>
          ))}
        </div>
      )}

      {result.unrecognized.length > 0 && (
        <div className="px-4 pb-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Unrecognized ({result.unrecognized.length})
          </p>
          {result.unrecognized.slice(0, 4).map((f, i) => (
            <p key={i} className="text-xs text-amber-600 truncate">
              {f.label}
            </p>
          ))}
          {result.unrecognized.length > 4 && (
            <p className="text-xs text-gray-400">
              +{result.unrecognized.length - 4} more
            </p>
          )}
        </div>
      )}

      <div className="px-4 pb-4">
        <Button variant="secondary" size="sm" className="w-full" onClick={onClose}>
          Done
        </Button>
      </div>
    </div>
  );
}

function SummaryRow({
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
    <div className="flex items-center gap-2">
      {icon}
      <span className="flex-1 text-sm text-gray-700">{label}</span>
      <span className={`text-sm font-semibold ${color}`}>{value}</span>
    </div>
  );
}

function StatCell({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-lg font-bold text-gray-900">{value}</span>
      <Badge color={color as "blue" | "green" | "purple"} className="text-xs">
        {label}
      </Badge>
    </div>
  );
}
