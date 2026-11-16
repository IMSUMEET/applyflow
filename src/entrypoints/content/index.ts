// Content Script — runs in the context of job application pages.
//
// Security boundary: has DOM access but NOT chrome.storage.
// All profile data arrives via message from the background service worker.

import { detectJobInfo } from "@/features/autofill/detection/jobDetector";
import { runAutofillFull, normalizeQuestion } from "@/features/autofill/autofillEngine";
import { startFieldObserver } from "@/features/learning/fieldObserver";
import { LearningOverlay } from "./learningOverlay";
import type { ContentScriptCommand } from "@/messaging/contentScriptMessages";
import { ContentScriptUI } from "./ui";

export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_idle",

  main() {
    const jobInfo = detectJobInfo(document, location.href);

    if (jobInfo.company || jobInfo.title) {
      ContentScriptUI.mount(jobInfo);
    }

    chrome.runtime.onMessage.addListener(
      (message: ContentScriptCommand, _sender, sendResponse) => {
        switch (message.type) {
          case "GET_JOB_INFO":
            sendResponse(detectJobInfo(document, location.href));
            return false;

          case "RUN_AUTOFILL": {
            const { profile, settings, learnedAnswers } = message;

            runAutofillFull(profile, settings, learnedAnswers)
              .then(({ result, unrecognizedFields }) => {
                // Start observer only when learning is enabled and there are unknowns
                if (settings.learningEnabled && unrecognizedFields.length > 0) {
                  startFieldObserver(unrecognizedFields, (capture) => {
                    LearningOverlay.enqueue({
                      question: capture.question,
                      answer: capture.answer,
                      onApprove: () => {
                        void chrome.runtime.sendMessage({
                          type: "SAVE_LEARNED_ANSWER",
                          answer: {
                            originalQuestion: capture.question,
                            normalizedQuestion: normalizeQuestion(capture.question),
                            answer: capture.answer,
                            fieldType: mapFieldType(capture.fieldType),
                            sourceDomain: location.hostname,
                            scope: "global" as const,
                            approvedByUser: true,
                            autoFillEnabled: true,
                          },
                        });
                      },
                      onDismiss: () => {},
                    });
                  });
                }

                sendResponse(result);
              })
              .catch((err) => {
                console.error("[ApplyFlow] Autofill error:", err);
                sendResponse({
                  fieldsDetected: 0,
                  fieldsFilled: 0,
                  learnedFieldsApplied: 0,
                  skipped: [],
                  failed: [{ label: "page", reason: String(err) }],
                  unrecognized: [],
                });
              });
            return true;
          }

          default:
            return false;
        }
      }
    );

    console.log("[ApplyFlow] Content script ready", { url: location.href });
  },
});

function mapFieldType(
  elementType: string
): "text" | "textarea" | "select" | "radio" | "checkbox" {
  switch (elementType) {
    case "textarea": return "textarea";
    case "select": return "select";
    case "radio-group":
    case "radio": return "radio";
    case "input-checkbox": return "checkbox";
    default: return "text";
  }
}
