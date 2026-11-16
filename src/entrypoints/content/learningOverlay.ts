// Thin adapter — delegates all learning captures to the main AppSidebar.
// Keeps the same public interface so content/index.ts doesn't need to change.

import { AppSidebar } from "./ui";

interface SuggestionTask {
  question: string;
  answer: string;
  onApprove: () => void;
  onDismiss: () => void;
}

export const LearningOverlay = {
  enqueue(task: SuggestionTask): void {
    AppSidebar.addCapture(task);
  },
};
