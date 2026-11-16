import { useEffect, useState } from "react";
import { Brain, Trash2, ToggleLeft, ToggleRight, Pencil, Check, X } from "lucide-react";
import { sendMessage } from "@/messaging/sender";
import type { LearnedAnswer } from "@/models/learning";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { formatRelative } from "@/utils/format";

export function LearnedAnswersPanel() {
  const [answers, setAnswers] = useState<LearnedAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    try {
      const data = await sendMessage({ type: "GET_LEARNED_ANSWERS" });
      // Sort by most recently confirmed/created
      const sorted = [...data].sort(
        (a, b) =>
          new Date(b.lastConfirmedAt).getTime() - new Date(a.lastConfirmedAt).getTime()
      );
      setAnswers(sorted);
    } finally {
      setLoading(false);
    }
  }

  async function toggleAutoFill(answer: LearnedAnswer) {
    const updated = { ...answer, autoFillEnabled: !answer.autoFillEnabled };
    await sendMessage({ type: "UPDATE_LEARNED_ANSWER", answer: updated });
    setAnswers((prev) => prev.map((a) => (a.id === answer.id ? updated : a)));
  }

  async function deleteAnswer(id: string) {
    await sendMessage({ type: "DELETE_LEARNED_ANSWER", answerId: id });
    setAnswers((prev) => prev.filter((a) => a.id !== id));
  }

  function startEdit(answer: LearnedAnswer) {
    setEditingId(answer.id);
    setEditValue(answer.answer);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValue("");
  }

  async function saveEdit(answer: LearnedAnswer) {
    if (!editValue.trim() || editValue.trim() === answer.answer) {
      cancelEdit();
      return;
    }
    const updated = { ...answer, answer: editValue.trim() };
    await sendMessage({ type: "UPDATE_LEARNED_ANSWER", answer: updated });
    setAnswers((prev) => prev.map((a) => (a.id === answer.id ? updated : a)));
    cancelEdit();
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
        <h1 className="text-2xl font-bold text-gray-900">Learned Answers</h1>
        <p className="text-gray-500 text-sm mt-1">
          {answers.length === 0
            ? "Answers you approve will appear here and be used in future autofills."
            : `${answers.length} answer${answers.length === 1 ? "" : "s"} saved — used automatically on future applications.`}
        </p>
      </div>

      {answers.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
          <Brain className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <h3 className="text-gray-500 font-medium">No learned answers yet</h3>
          <p className="text-gray-400 text-sm mt-1 max-w-xs mx-auto">
            Fill out an application, and when you answer a question ApplyFlow doesn't
            recognize, it will offer to remember it for next time.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {answers.map((answer) => (
            <div
              key={answer.id}
              className={`bg-white rounded-xl border px-5 py-4 ${
                answer.autoFillEnabled ? "border-gray-200" : "border-gray-100 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 mb-2">
                    {answer.originalQuestion}
                  </p>

                  {/* Answer — inline edit or display */}
                  {editingId === answer.id ? (
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void saveEdit(answer);
                          if (e.key === "Escape") cancelEdit();
                        }}
                        autoFocus
                        className="flex-1 text-sm border border-brand-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-400"
                      />
                      <button
                        onClick={() => void saveEdit(answer)}
                        className="text-green-500 hover:text-green-700 transition-colors"
                        aria-label="Save"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label="Cancel"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-sm text-brand-700 bg-brand-50 rounded-md px-2 py-1 flex-1 min-w-0 truncate">
                        {answer.answer}
                      </p>
                      <button
                        onClick={() => startEdit(answer)}
                        className="text-gray-300 hover:text-brand-500 transition-colors shrink-0"
                        aria-label="Edit answer"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Badge color="gray">{answer.scope}</Badge>
                    {answer.sourceDomain && (
                      <Badge color="blue">{answer.sourceDomain}</Badge>
                    )}
                    <span className="text-xs text-gray-400">
                      Used {answer.usageCount}× · {formatRelative(answer.updatedAt)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => void toggleAutoFill(answer)}
                    className={`transition-colors ${
                      answer.autoFillEnabled ? "text-brand-600" : "text-gray-300"
                    }`}
                    aria-label={answer.autoFillEnabled ? "Disable autofill" : "Enable autofill"}
                    title={answer.autoFillEnabled ? "Autofill enabled" : "Autofill disabled"}
                  >
                    {answer.autoFillEnabled ? (
                      <ToggleRight className="h-5 w-5" />
                    ) : (
                      <ToggleLeft className="h-5 w-5" />
                    )}
                  </button>
                  <button
                    onClick={() => void deleteAnswer(answer.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                    aria-label="Delete answer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
