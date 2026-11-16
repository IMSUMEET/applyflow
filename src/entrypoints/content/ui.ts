// Minimal content-script UI helper.
// Injects a small floating badge on job pages so users know ApplyFlow is active.
// The full autofill UI lives in the popup.

import type { DetectedJobInfo as JobInfo } from "@/messaging/messages";

export const ContentScriptUI = {
  mount(jobInfo: JobInfo | null): void {
    if (document.getElementById("applyflow-badge")) return;

    const badge = document.createElement("div");
    badge.id = "applyflow-badge";
    badge.setAttribute("aria-label", "ApplyFlow active");

    // Styles are injected inline to avoid CSP issues with external stylesheets
    Object.assign(badge.style, {
      position: "fixed",
      bottom: "20px",
      right: "20px",
      zIndex: "2147483647",
      background: "#4c6ef5",
      color: "#fff",
      borderRadius: "8px",
      padding: "6px 12px",
      fontSize: "12px",
      fontFamily: "system-ui, sans-serif",
      fontWeight: "600",
      boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
      cursor: "default",
      userSelect: "none",
      display: "flex",
      alignItems: "center",
      gap: "6px",
      opacity: "0.95",
    });

    badge.textContent = jobInfo ? `ApplyFlow — ${jobInfo.company || "Job detected"}` : "ApplyFlow";

    // Auto-hide after 4 seconds to avoid cluttering the page
    document.body.appendChild(badge);
    setTimeout(() => {
      badge.style.transition = "opacity 0.5s";
      badge.style.opacity = "0";
      setTimeout(() => badge.remove(), 600);
    }, 4000);
  },
};
