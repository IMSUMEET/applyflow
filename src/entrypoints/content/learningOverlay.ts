// In-page "Remember this answer?" suggestion overlay.
// Uses inline styles only — no Tailwind, no external CSS.
// Queue-based: at most one overlay is shown at a time.
// Auto-dismisses after AUTO_DISMISS_MS if the user doesn't interact.

const AUTO_DISMISS_MS = 8000;

interface SuggestionTask {
  question: string;
  answer: string;
  onApprove: () => void;
  onDismiss: () => void;
}

const queue: SuggestionTask[] = [];
let active = false;

export const LearningOverlay = {
  enqueue(task: SuggestionTask): void {
    queue.push(task);
    if (!active) showNext();
  },
};

function showNext(): void {
  const task = queue.shift();
  if (!task) {
    active = false;
    return;
  }
  active = true;
  show(task);
}

function show(task: SuggestionTask): void {
  const overlay = document.createElement("div");
  overlay.id = "applyflow-learning-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-label", "ApplyFlow — Remember this answer?");

  Object.assign(overlay.style, {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    zIndex: "2147483647",
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "14px 16px",
    width: "300px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
    fontFamily: "system-ui, -apple-system, sans-serif",
    fontSize: "13px",
    color: "#1a202c",
    lineHeight: "1.5",
    animation: "applyflow-slide-in 0.2s ease-out",
  });

  // Inject keyframe once
  if (!document.getElementById("applyflow-overlay-styles")) {
    const style = document.createElement("style");
    style.id = "applyflow-overlay-styles";
    style.textContent = `
      @keyframes applyflow-slide-in {
        from { opacity: 0; transform: translateY(8px); }
        to   { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }

  // Header row
  const header = document.createElement("div");
  Object.assign(header.style, {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    marginBottom: "8px",
  });

  const brain = document.createElement("span");
  brain.textContent = "🧠";
  brain.style.fontSize = "16px";

  const title = document.createElement("span");
  title.textContent = "Remember this answer?";
  title.style.fontWeight = "600";
  title.style.color = "#2d3748";

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "✕";
  Object.assign(closeBtn.style, {
    marginLeft: "auto",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#a0aec0",
    fontSize: "14px",
    padding: "0",
    lineHeight: "1",
  });

  header.appendChild(brain);
  header.appendChild(title);
  header.appendChild(closeBtn);

  // Question label
  const questionEl = document.createElement("div");
  questionEl.textContent = task.question.length > 70
    ? task.question.slice(0, 67) + "…"
    : task.question;
  Object.assign(questionEl.style, {
    color: "#718096",
    fontSize: "11px",
    marginBottom: "4px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  });

  // Answer value
  const answerEl = document.createElement("div");
  answerEl.textContent = task.answer.length > 80
    ? task.answer.slice(0, 77) + "…"
    : task.answer;
  Object.assign(answerEl.style, {
    background: "#ebf4ff",
    color: "#2b6cb0",
    borderRadius: "6px",
    padding: "5px 8px",
    fontSize: "12px",
    fontWeight: "500",
    marginBottom: "10px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  });

  // Button row
  const buttons = document.createElement("div");
  Object.assign(buttons.style, {
    display: "flex",
    gap: "8px",
    justifyContent: "flex-end",
  });

  const dismissBtn = createButton("Not now", false);
  const rememberBtn = createButton("Remember", true);

  buttons.appendChild(dismissBtn);
  buttons.appendChild(rememberBtn);

  overlay.appendChild(header);
  overlay.appendChild(questionEl);
  overlay.appendChild(answerEl);
  overlay.appendChild(buttons);

  document.body.appendChild(overlay);

  const timer = setTimeout(() => dismiss(false), AUTO_DISMISS_MS);

  function dismiss(approved: boolean) {
    clearTimeout(timer);
    overlay.style.transition = "opacity 0.2s";
    overlay.style.opacity = "0";
    setTimeout(() => {
      overlay.remove();
      if (approved) task.onApprove();
      else task.onDismiss();
      showNext();
    }, 200);
  }

  rememberBtn.addEventListener("click", () => dismiss(true));
  dismissBtn.addEventListener("click", () => dismiss(false));
  closeBtn.addEventListener("click", () => dismiss(false));
}

function createButton(label: string, primary: boolean): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.textContent = label;
  Object.assign(btn.style, {
    border: "none",
    borderRadius: "6px",
    padding: "5px 12px",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background 0.15s",
    background: primary ? "#4c6ef5" : "#edf2f7",
    color: primary ? "#ffffff" : "#4a5568",
  });
  return btn;
}
