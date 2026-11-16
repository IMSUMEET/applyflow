// In-page sidebar for reviewing captured field answers.
// Accumulates all captures in a persistent right-side panel.
// Uses inline styles only — no Tailwind, no external CSS.

interface SuggestionItem {
  id: string;
  question: string;
  answer: string;
  onApprove: () => void;
  onDismiss: () => void;
}

let sidebar: HTMLElement | null = null;
let itemsContainer: HTMLElement | null = null;
const items: SuggestionItem[] = [];
let itemCount = 0;

export const LearningOverlay = {
  enqueue(task: Omit<SuggestionItem, "id">): void {
    const item: SuggestionItem = { id: `af-item-${itemCount++}`, ...task };
    items.push(item);
    if (!sidebar) createSidebar();
    renderItem(item);
    updateSubtitle();
  },
};

function createSidebar(): void {
  if (!document.getElementById("applyflow-overlay-styles")) {
    const style = document.createElement("style");
    style.id = "applyflow-overlay-styles";
    style.textContent = `
      @keyframes applyflow-slide-in {
        from { opacity: 0; transform: translateX(20px); }
        to   { opacity: 1; transform: translateX(0); }
      }
      @keyframes applyflow-item-in {
        from { opacity: 0; transform: translateY(6px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      #applyflow-learning-sidebar ::-webkit-scrollbar {
        width: 4px;
      }
      #applyflow-learning-sidebar ::-webkit-scrollbar-track {
        background: transparent;
      }
      #applyflow-learning-sidebar ::-webkit-scrollbar-thumb {
        background: #cbd5e0;
        border-radius: 4px;
      }
    `;
    document.head.appendChild(style);
  }

  sidebar = document.createElement("div");
  sidebar.id = "applyflow-learning-sidebar";
  sidebar.setAttribute("role", "complementary");
  sidebar.setAttribute("aria-label", "ApplyFlow Learning Panel");

  Object.assign(sidebar.style, {
    position: "fixed",
    top: "16px",
    right: "16px",
    bottom: "16px",
    zIndex: "2147483647",
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    width: "340px",
    boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
    fontFamily: "system-ui, -apple-system, sans-serif",
    fontSize: "13px",
    color: "#1a202c",
    lineHeight: "1.5",
    animation: "applyflow-slide-in 0.25s ease-out",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  });

  // ── Header ──
  const header = document.createElement("div");
  Object.assign(header.style, {
    padding: "14px 16px",
    borderBottom: "1px solid #f0f4f8",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "#f8fafc",
    borderRadius: "16px 16px 0 0",
    flexShrink: "0",
  });

  const logo = document.createElement("span");
  logo.textContent = "⚡";
  logo.style.fontSize = "18px";

  const titleWrap = document.createElement("div");
  titleWrap.style.flex = "1";

  const titleEl = document.createElement("div");
  titleEl.textContent = "ApplyFlow";
  Object.assign(titleEl.style, { fontWeight: "700", fontSize: "14px", color: "#1a202c" });

  const subtitleEl = document.createElement("div");
  subtitleEl.id = "applyflow-sidebar-subtitle";
  Object.assign(subtitleEl.style, { fontSize: "11px", color: "#718096" });

  titleWrap.appendChild(titleEl);
  titleWrap.appendChild(subtitleEl);

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "✕";
  Object.assign(closeBtn.style, {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#a0aec0",
    fontSize: "16px",
    padding: "4px 6px",
    lineHeight: "1",
    borderRadius: "6px",
  });
  closeBtn.addEventListener("click", () => {
    items.forEach((item) => item.onDismiss());
    items.length = 0;
    sidebar?.remove();
    sidebar = null;
    itemsContainer = null;
  });

  header.appendChild(logo);
  header.appendChild(titleWrap);
  header.appendChild(closeBtn);

  // ── Bulk action bar ──
  const actionBar = document.createElement("div");
  Object.assign(actionBar.style, {
    padding: "10px 14px",
    borderBottom: "1px solid #f0f4f8",
    display: "flex",
    gap: "8px",
    flexShrink: "0",
  });

  const rememberAllBtn = makeBulkButton("Remember All", true);
  rememberAllBtn.id = "applyflow-remember-all";
  rememberAllBtn.addEventListener("click", () => {
    const toApprove = [...items];
    items.length = 0;
    toApprove.forEach((item) => {
      item.onApprove();
      document.getElementById(item.id)?.remove();
    });
    closeSidebar();
  });

  const skipAllBtn = makeBulkButton("Skip All", false);
  skipAllBtn.addEventListener("click", () => {
    const toDismiss = [...items];
    items.length = 0;
    toDismiss.forEach((item) => {
      item.onDismiss();
      document.getElementById(item.id)?.remove();
    });
    closeSidebar();
  });

  actionBar.appendChild(rememberAllBtn);
  actionBar.appendChild(skipAllBtn);

  // ── Scrollable items area ──
  itemsContainer = document.createElement("div");
  Object.assign(itemsContainer.style, {
    flex: "1",
    overflowY: "auto",
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  });

  sidebar.appendChild(header);
  sidebar.appendChild(actionBar);
  sidebar.appendChild(itemsContainer);
  document.body.appendChild(sidebar);
}

function renderItem(item: SuggestionItem): void {
  if (!itemsContainer) return;

  const card = document.createElement("div");
  card.id = item.id;
  Object.assign(card.style, {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    padding: "12px",
    animation: "applyflow-item-in 0.2s ease-out",
  });

  const qEl = document.createElement("div");
  qEl.textContent = item.question.length > 90 ? item.question.slice(0, 87) + "…" : item.question;
  Object.assign(qEl.style, {
    color: "#4a5568",
    fontSize: "11px",
    marginBottom: "5px",
    fontWeight: "500",
  });

  const aEl = document.createElement("div");
  aEl.textContent = item.answer.length > 100 ? item.answer.slice(0, 97) + "…" : item.answer;
  Object.assign(aEl.style, {
    background: "#ebf4ff",
    color: "#2b6cb0",
    borderRadius: "6px",
    padding: "5px 8px",
    fontSize: "12px",
    fontWeight: "500",
    marginBottom: "10px",
    wordBreak: "break-word",
  });

  const btnRow = document.createElement("div");
  Object.assign(btnRow.style, { display: "flex", gap: "6px", justifyContent: "flex-end" });

  const remBtn = makeItemButton("Remember", true);
  const skipBtn = makeItemButton("Skip", false);

  function handleItem(approved: boolean) {
    card.style.transition = "opacity 0.15s";
    card.style.opacity = "0";
    setTimeout(() => {
      card.remove();
      const idx = items.findIndex((x) => x.id === item.id);
      if (idx !== -1) items.splice(idx, 1);
      if (approved) item.onApprove();
      else item.onDismiss();
      updateSubtitle();
      if (items.length === 0) {
        setTimeout(() => closeSidebar(), 600);
      }
    }, 150);
  }

  remBtn.addEventListener("click", () => handleItem(true));
  skipBtn.addEventListener("click", () => handleItem(false));

  btnRow.appendChild(skipBtn);
  btnRow.appendChild(remBtn);
  card.appendChild(qEl);
  card.appendChild(aEl);
  card.appendChild(btnRow);
  itemsContainer.appendChild(card);
}

function updateSubtitle(): void {
  const el = document.getElementById("applyflow-sidebar-subtitle");
  if (!el) return;
  const count = items.length;
  el.textContent = count === 0
    ? "All reviewed"
    : `${count} answer${count === 1 ? "" : "s"} to review`;
}

function closeSidebar(): void {
  sidebar?.remove();
  sidebar = null;
  itemsContainer = null;
}

function makeBulkButton(label: string, primary: boolean): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.textContent = label;
  Object.assign(btn.style, {
    flex: "1",
    border: "none",
    borderRadius: "8px",
    padding: "7px 12px",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    background: primary ? "#4c6ef5" : "#edf2f7",
    color: primary ? "#ffffff" : "#4a5568",
  });
  return btn;
}

function makeItemButton(label: string, primary: boolean): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.textContent = label;
  Object.assign(btn.style, {
    border: "none",
    borderRadius: "6px",
    padding: "5px 12px",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    background: primary ? "#4c6ef5" : "#edf2f7",
    color: primary ? "#ffffff" : "#4a5568",
  });
  return btn;
}
