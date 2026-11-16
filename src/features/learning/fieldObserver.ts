// Watches unrecognized form fields for user input after autofill runs.
// When a user manually fills a field that ApplyFlow couldn't handle,
// this observer captures the question + answer so the learning overlay
// can offer to remember it.

import type { DetectedField } from "@/features/autofill/detection/detectedField";

export interface ObservedCapture {
  question: string;
  answer: string;
  fieldType: string;
}

type CaptureCallback = (capture: ObservedCapture) => void;

// Returns a cleanup function that removes all event listeners.
export function startFieldObserver(
  fields: DetectedField[],
  onCapture: CaptureCallback
): () => void {
  const cleanups: Array<() => void> = [];

  for (const field of fields) {
    const question =
      field.signals.label ||
      field.signals.ariaLabel ||
      field.signals.name ||
      field.signals.placeholder;

    if (!question) continue;

    if (field.elementType === "radio-group" && field.elements) {
      // For radio groups listen to `change` on each individual button
      for (const radio of field.elements) {
        const handler = () => {
          if (radio.checked && radio.value.trim()) {
            onCapture({ question, answer: radio.value.trim(), fieldType: "radio" });
          }
        };
        radio.addEventListener("change", handler);
        cleanups.push(() => radio.removeEventListener("change", handler));
      }
      continue;
    }

    const element = field.element;

    if (element.nodeName === "SELECT") {
      const select = element as HTMLSelectElement;
      const handler = () => {
        const val = select.options[select.selectedIndex]?.text ?? select.value;
        if (val.trim()) {
          onCapture({ question, answer: val.trim(), fieldType: "select" });
        }
      };
      select.addEventListener("change", handler);
      cleanups.push(() => select.removeEventListener("change", handler));
      continue;
    }

    // Text inputs and textareas — observe on blur so we capture the final value
    if (
      element.nodeName === "INPUT" ||
      element.nodeName === "TEXTAREA"
    ) {
      const input = element as HTMLInputElement | HTMLTextAreaElement;
      const handler = () => {
        if (input.value.trim()) {
          onCapture({ question, answer: input.value.trim(), fieldType: field.elementType });
        }
      };
      input.addEventListener("blur", handler);
      cleanups.push(() => input.removeEventListener("blur", handler));
    }
  }

  return () => {
    for (const cleanup of cleanups) cleanup();
  };
}
