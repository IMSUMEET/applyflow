// Simplify-style collapsible sidebar injected into every page.
// Fixed to the right edge; auto-expands on detected job application pages.
// All styles are inline — no Tailwind, no external CSS.

import type { AutofillResult } from "@/features/autofill/detection/detectedField";
import type { DetectedJobInfo } from "@/messaging/messages";

interface CaptureTask {
  question: string;
  answer: string;
  onApprove: () => void;
  onDismiss: () => void;
}

interface SidebarOptions {
  onAutofillClick: () => void;
}

let sidebarEl: HTMLElement | null = null;
let tabEl: HTMLElement | null = null;
let resultsSection: HTMLElement | null = null;
let learningSection: HTMLElement | null = null;
let learningItemsContainer: HTMLElement | null = null;
let learningCountEl: HTMLElement | null = null;
let fillingBtn: HTMLButtonElement | null = null;
let avatarEl: HTMLElement | null = null;
let nameEl: HTMLElement | null = null;
let emailEl: HTMLElement | null = null;
let isExpanded = false;
const captureItems: Array<CaptureTask & { id: string }> = [];
let captureCount = 0;
let _onAutofillClick: (() => void) | null = null;

export const AppSidebar = {
  mount(jobInfo: DetectedJobInfo, opts: SidebarOptions): void {
    if (document.getElementById("applyflow-sidebar")) return;
    _onAutofillClick = opts.onAutofillClick;
    injectStyles();
    createTab();
    createSidebar(jobInfo);
  },

  loadProfile(name: string, email: string): void {
    if (nameEl) nameEl.textContent = name || "Your Profile";
    if (emailEl) emailEl.textContent = email || "";
    if (avatarEl) avatarEl.textContent = name ? name[0]!.toUpperCase() : "?";
  },

  setFilling(loading: boolean): void {
    if (!fillingBtn) return;
    fillingBtn.disabled = loading;
    fillingBtn.textContent = loading ? "Filling…" : "⚡  Autofill This Page";
    fillingBtn.style.opacity = loading ? "0.7" : "1";
    fillingBtn.style.cursor = loading ? "not-allowed" : "pointer";
  },

  showResult(result: AutofillResult): void {
    if (!resultsSection) return;
    resultsSection.innerHTML = "";
    resultsSection.style.display = "block";

    const addRow = (icon: string, text: string, color: string) => {
      const d = document.createElement("div");
      Object.assign(d.style, {
        display: "flex",
        alignItems: "center",
        gap: "7px",
        padding: "3px 0",
      });
      const iconSpan = document.createElement("span");
      iconSpan.textContent = icon;
      iconSpan.style.fontSize = "14px";
      const textSpan = document.createElement("span");
      textSpan.textContent = text;
      Object.assign(textSpan.style, { color, fontSize: "12px", fontWeight: "500" });
      d.appendChild(iconSpan);
      d.appendChild(textSpan);
      resultsSection!.appendChild(d);
    };

    if (result.fieldsFilled > 0) {
      addRow("✅", `${result.fieldsFilled} field${result.fieldsFilled === 1 ? "" : "s"} filled`, "#276749");
    }
    if (result.learnedFieldsApplied > 0) {
      addRow("🧠", `${result.learnedFieldsApplied} from memory`, "#2b6cb0");
    }
    if (result.unrecognized.length > 0) {
      addRow("❓", `${result.unrecognized.length} unrecognized — fill manually`, "#c05621");
    }
    if (result.failed.length > 0) {
      addRow("❌", `${result.failed.length} failed`, "#c53030");
    }
    const anyAction =
      result.fieldsFilled > 0 ||
      result.learnedFieldsApplied > 0 ||
      result.unrecognized.length > 0 ||
      result.failed.length > 0;
    if (!anyAction) {
      addRow("ℹ️", "No fillable fields found on this page", "#718096");
    }
  },

  addCapture(task: CaptureTask): void {
    const item: CaptureTask & { id: string } = {
      id: `af-cap-${captureCount++}`,
      ...task,
    };
    captureItems.push(item);
    if (learningSection) learningSection.style.display = "block";
    renderCaptureItem(item);
    updateCaptureCount();
    if (!isExpanded) expand();
  },
};

function injectStyles(): void {
  if (document.getElementById("applyflow-sidebar-styles")) return;
  const style = document.createElement("style");
  style.id = "applyflow-sidebar-styles";
  style.textContent = `
    @keyframes af-tab-pulse {
      0%, 100% { box-shadow: -2px 0 12px rgba(76,110,245,0.3); }
      50%       { box-shadow: -2px 0 20px rgba(76,110,245,0.6); }
    }
    @keyframes af-item-in {
      from { opacity: 0; transform: translateY(4px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    #applyflow-sidebar-scroll::-webkit-scrollbar { width: 4px; }
    #applyflow-sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
    #applyflow-sidebar-scroll::-webkit-scrollbar-thumb { background: #cbd5e0; border-radius: 4px; }
    #applyflow-filling-btn:hover:not(:disabled) { background: #3b5bdb !important; }
  `;
  document.head.appendChild(style);
}

function createTab(): void {
  tabEl = document.createElement("div");
  tabEl.id = "applyflow-tab";
  Object.assign(tabEl.style, {
    position: "fixed",
    right: "0",
    top: "50%",
    transform: "translateY(-50%)",
    zIndex: "2147483646",
    background: "#4c6ef5",
    color: "#fff",
    borderRadius: "10px 0 0 10px",
    padding: "14px 8px",
    cursor: "pointer",
    writingMode: "vertical-rl",
    fontFamily: "system-ui, -apple-system, sans-serif",
    fontSize: "12px",
    fontWeight: "700",
    letterSpacing: "0.8px",
    userSelect: "none",
    animation: "af-tab-pulse 2.5s ease-in-out infinite",
    display: "flex",
    alignItems: "center",
    gap: "5px",
  });
  tabEl.textContent = "⚡ ApplyFlow";
  tabEl.addEventListener("click", expand);
  document.body.appendChild(tabEl);
}

function createSidebar(jobInfo: DetectedJobInfo): void {
  sidebarEl = document.createElement("div");
  sidebarEl.id = "applyflow-sidebar";
  Object.assign(sidebarEl.style, {
    position: "fixed",
    top: "0",
    right: "0",
    bottom: "0",
    zIndex: "2147483647",
    background: "#ffffff",
    borderLeft: "1px solid #dde3f0",
    width: "300px",
    boxShadow: "-4px 0 32px rgba(0,0,0,0.14)",
    fontFamily: "system-ui, -apple-system, sans-serif",
    fontSize: "13px",
    color: "#1a202c",
    lineHeight: "1.5",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    transform: "translateX(100%)",
    transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
  });

  // ── Header ──────────────────────────────────────────────────────────────────
  const header = document.createElement("div");
  Object.assign(header.style, {
    padding: "13px 14px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "linear-gradient(135deg, #4c6ef5 0%, #3b5bdb 100%)",
    flexShrink: "0",
  });

  const logoSpan = document.createElement("span");
  logoSpan.textContent = "⚡";
  logoSpan.style.fontSize = "18px";

  const headerTitle = document.createElement("div");
  headerTitle.textContent = "ApplyFlow";
  Object.assign(headerTitle.style, {
    fontWeight: "800",
    fontSize: "15px",
    color: "#ffffff",
    flex: "1",
    letterSpacing: "0.3px",
  });

  const collapseBtn = document.createElement("button");
  collapseBtn.textContent = "→";
  collapseBtn.title = "Collapse";
  Object.assign(collapseBtn.style, {
    background: "rgba(255,255,255,0.18)",
    border: "none",
    cursor: "pointer",
    color: "#ffffff",
    fontSize: "16px",
    padding: "3px 8px",
    lineHeight: "1",
    borderRadius: "6px",
    fontWeight: "700",
  });
  collapseBtn.addEventListener("click", collapse);

  header.appendChild(logoSpan);
  header.appendChild(headerTitle);
  header.appendChild(collapseBtn);

  // ── Job pill (if detected) ───────────────────────────────────────────────────
  let jobPill: HTMLElement | null = null;
  if (jobInfo.title || jobInfo.company) {
    jobPill = document.createElement("div");
    Object.assign(jobPill.style, {
      padding: "9px 14px",
      background: "#eef2ff",
      borderBottom: "1px solid #dde6ff",
      flexShrink: "0",
    });
    if (jobInfo.title) {
      const t = document.createElement("div");
      t.textContent = jobInfo.title;
      Object.assign(t.style, { fontWeight: "600", fontSize: "12px", color: "#1e3a8a" });
      jobPill.appendChild(t);
    }
    if (jobInfo.company) {
      const c = document.createElement("div");
      c.textContent = jobInfo.company;
      Object.assign(c.style, { fontSize: "11px", color: "#6b7280" });
      jobPill.appendChild(c);
    }
  }

  // ── Scrollable body ──────────────────────────────────────────────────────────
  const scroll = document.createElement("div");
  scroll.id = "applyflow-sidebar-scroll";
  Object.assign(scroll.style, {
    flex: "1",
    overflowY: "auto",
    padding: "14px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  });

  // Profile mini-card
  const profileCard = document.createElement("div");
  Object.assign(profileCard.style, {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    padding: "10px 12px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  });

  avatarEl = document.createElement("div");
  avatarEl.textContent = "?";
  Object.assign(avatarEl.style, {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #4c6ef5 0%, #3b5bdb 100%)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "800",
    fontSize: "15px",
    flexShrink: "0",
  });

  const profileText = document.createElement("div");
  profileText.style.minWidth = "0";

  nameEl = document.createElement("div");
  nameEl.textContent = "Loading…";
  Object.assign(nameEl.style, {
    fontWeight: "600",
    fontSize: "13px",
    color: "#2d3748",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  });

  emailEl = document.createElement("div");
  emailEl.textContent = "";
  Object.assign(emailEl.style, {
    fontSize: "11px",
    color: "#718096",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  });

  profileText.appendChild(nameEl);
  profileText.appendChild(emailEl);
  profileCard.appendChild(avatarEl);
  profileCard.appendChild(profileText);

  // Autofill button
  fillingBtn = document.createElement("button");
  fillingBtn.id = "applyflow-filling-btn";
  fillingBtn.textContent = "⚡  Autofill This Page";
  Object.assign(fillingBtn.style, {
    width: "100%",
    background: "#4c6ef5",
    color: "#ffffff",
    border: "none",
    borderRadius: "10px",
    padding: "12px 16px",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
    letterSpacing: "0.2px",
    boxShadow: "0 2px 10px rgba(76,110,245,0.4)",
    transition: "background 0.15s",
  });
  fillingBtn.addEventListener("click", () => {
    if (_onAutofillClick) _onAutofillClick();
  });

  // Results section (hidden until autofill runs)
  resultsSection = document.createElement("div");
  Object.assign(resultsSection.style, {
    display: "none",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    padding: "10px 12px",
  });

  const resultsTitle = document.createElement("div");
  resultsTitle.textContent = "Last run";
  Object.assign(resultsTitle.style, {
    fontSize: "10px",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.8px",
    color: "#a0aec0",
    marginBottom: "6px",
  });
  resultsSection.appendChild(resultsTitle);

  // Learning section (hidden until captures exist)
  learningSection = document.createElement("div");
  learningSection.style.display = "none";

  const lHeaderRow = document.createElement("div");
  Object.assign(lHeaderRow.style, {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    marginBottom: "8px",
  });

  const lIcon = document.createElement("span");
  lIcon.textContent = "🧠";
  lIcon.style.fontSize = "14px";

  const lTitle = document.createElement("span");
  lTitle.textContent = "Remember Answers";
  Object.assign(lTitle.style, { fontWeight: "600", fontSize: "12px", color: "#2d3748", flex: "1" });

  learningCountEl = document.createElement("span");
  Object.assign(learningCountEl.style, {
    background: "#4c6ef5",
    color: "#fff",
    borderRadius: "10px",
    padding: "1px 7px",
    fontSize: "11px",
    fontWeight: "700",
  });
  learningCountEl.textContent = "0";

  lHeaderRow.appendChild(lIcon);
  lHeaderRow.appendChild(lTitle);
  lHeaderRow.appendChild(learningCountEl);

  const bulkRow = document.createElement("div");
  Object.assign(bulkRow.style, { display: "flex", gap: "6px", marginBottom: "10px" });

  const remAllBtn = makeBulkBtn("Remember All", true);
  remAllBtn.addEventListener("click", () => {
    const toApprove = [...captureItems];
    captureItems.length = 0;
    toApprove.forEach((it) => {
      it.onApprove();
      document.getElementById(it.id)?.remove();
    });
    if (learningSection) learningSection.style.display = "none";
    updateCaptureCount();
  });

  const skipAllBtn = makeBulkBtn("Skip All", false);
  skipAllBtn.addEventListener("click", () => {
    const toDismiss = [...captureItems];
    captureItems.length = 0;
    toDismiss.forEach((it) => {
      it.onDismiss();
      document.getElementById(it.id)?.remove();
    });
    if (learningSection) learningSection.style.display = "none";
    updateCaptureCount();
  });

  bulkRow.appendChild(remAllBtn);
  bulkRow.appendChild(skipAllBtn);

  learningItemsContainer = document.createElement("div");
  Object.assign(learningItemsContainer.style, {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  });

  learningSection.appendChild(lHeaderRow);
  learningSection.appendChild(bulkRow);
  learningSection.appendChild(learningItemsContainer);

  scroll.appendChild(profileCard);
  scroll.appendChild(fillingBtn);
  scroll.appendChild(resultsSection);
  scroll.appendChild(learningSection);

  sidebarEl.appendChild(header);
  if (jobPill) sidebarEl.appendChild(jobPill);
  sidebarEl.appendChild(scroll);

  document.body.appendChild(sidebarEl);

  // Auto-expand on application pages
  if (jobInfo.title || jobInfo.company) {
    setTimeout(expand, 600);
  }
}

function expand(): void {
  isExpanded = true;
  if (sidebarEl) sidebarEl.style.transform = "translateX(0)";
  if (tabEl) tabEl.style.display = "none";
}

function collapse(): void {
  isExpanded = false;
  if (sidebarEl) sidebarEl.style.transform = "translateX(100%)";
  if (tabEl) tabEl.style.display = "flex";
}

function renderCaptureItem(item: CaptureTask & { id: string }): void {
  if (!learningItemsContainer) return;

  const card = document.createElement("div");
  card.id = item.id;
  Object.assign(card.style, {
    background: "#f8fafc",
    border: "1px solid #e8eeff",
    borderRadius: "8px",
    padding: "10px",
    animation: "af-item-in 0.2s ease-out",
  });

  const qEl = document.createElement("div");
  qEl.textContent =
    item.question.length > 85 ? item.question.slice(0, 82) + "…" : item.question;
  Object.assign(qEl.style, {
    color: "#4a5568",
    fontSize: "11px",
    marginBottom: "4px",
    fontWeight: "500",
  });

  const aEl = document.createElement("div");
  aEl.textContent =
    item.answer.length > 95 ? item.answer.slice(0, 92) + "…" : item.answer;
  Object.assign(aEl.style, {
    background: "#ebf4ff",
    color: "#2b6cb0",
    borderRadius: "5px",
    padding: "4px 8px",
    fontSize: "12px",
    fontWeight: "500",
    marginBottom: "8px",
    wordBreak: "break-word",
  });

  const btnRow = document.createElement("div");
  Object.assign(btnRow.style, { display: "flex", gap: "5px", justifyContent: "flex-end" });

  const remBtn = makeItemBtn("Remember", true);
  const skipBtn = makeItemBtn("Skip", false);

  function handleCapture(approved: boolean) {
    card.style.transition = "opacity 0.15s";
    card.style.opacity = "0";
    setTimeout(() => {
      card.remove();
      const idx = captureItems.findIndex((x) => x.id === item.id);
      if (idx !== -1) captureItems.splice(idx, 1);
      if (approved) item.onApprove();
      else item.onDismiss();
      updateCaptureCount();
      if (captureItems.length === 0 && learningSection) {
        learningSection.style.display = "none";
      }
    }, 150);
  }

  remBtn.addEventListener("click", () => handleCapture(true));
  skipBtn.addEventListener("click", () => handleCapture(false));

  btnRow.appendChild(skipBtn);
  btnRow.appendChild(remBtn);
  card.appendChild(qEl);
  card.appendChild(aEl);
  card.appendChild(btnRow);
  learningItemsContainer.appendChild(card);
}

function updateCaptureCount(): void {
  if (learningCountEl) learningCountEl.textContent = String(captureItems.length);
}

function makeBulkBtn(label: string, primary: boolean): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.textContent = label;
  Object.assign(btn.style, {
    flex: "1",
    border: "none",
    borderRadius: "7px",
    padding: "6px 10px",
    fontSize: "11px",
    fontWeight: "600",
    cursor: "pointer",
    background: primary ? "#4c6ef5" : "#edf2f7",
    color: primary ? "#ffffff" : "#4a5568",
  });
  return btn;
}

function makeItemBtn(label: string, primary: boolean): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.textContent = label;
  Object.assign(btn.style, {
    border: "none",
    borderRadius: "5px",
    padding: "4px 10px",
    fontSize: "11px",
    fontWeight: "600",
    cursor: "pointer",
    background: primary ? "#4c6ef5" : "#edf2f7",
    color: primary ? "#ffffff" : "#4a5568",
  });
  return btn;
}
