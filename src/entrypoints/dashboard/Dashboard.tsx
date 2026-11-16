import { useState } from "react";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  UserCheck,
  BookOpen,
  Brain,
  Settings,
  Zap,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { OverviewPanel } from "./panels/OverviewPanel";
import { ApplicationsPanel } from "./panels/ApplicationsPanel";
import { ReferralsPanel } from "./panels/ReferralsPanel";
import { ContactsPanel } from "./panels/ContactsPanel";
import { ProfilePanel } from "./panels/ProfilePanel";
import { LearnedAnswersPanel } from "./panels/LearnedAnswersPanel";
import { SettingsPanel } from "./panels/SettingsPanel";

type PanelId =
  | "overview"
  | "applications"
  | "referrals"
  | "contacts"
  | "profile"
  | "learned"
  | "settings";

const navItems: { id: PanelId; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "Overview", icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: "applications", label: "Applications", icon: <Briefcase className="h-4 w-4" /> },
  { id: "referrals", label: "Referrals", icon: <Users className="h-4 w-4" /> },
  { id: "contacts", label: "Contacts", icon: <UserCheck className="h-4 w-4" /> },
  { id: "profile", label: "My Profile", icon: <BookOpen className="h-4 w-4" /> },
  { id: "learned", label: "Learned Answers", icon: <Brain className="h-4 w-4" /> },
  { id: "settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
];

export function Dashboard() {
  const [activePanel, setActivePanel] = useState<PanelId>("overview");

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col shrink-0">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-brand-600 p-1.5">
              <Zap className="h-4 w-4 text-white" fill="white" />
            </div>
            <span className="font-bold text-gray-900 text-base">ApplyFlow</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActivePanel(item.id)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left",
                activePanel === item.id
                  ? "bg-brand-50 text-brand-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
          ApplyFlow v0.1.0
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-6">
        {activePanel === "overview" && <OverviewPanel />}
        {activePanel === "applications" && <ApplicationsPanel />}
        {activePanel === "referrals" && <ReferralsPanel />}
        {activePanel === "contacts" && <ContactsPanel />}
        {activePanel === "profile" && <ProfilePanel />}
        {activePanel === "learned" && <LearnedAnswersPanel />}
        {activePanel === "settings" && <SettingsPanel />}
      </main>
    </div>
  );
}
