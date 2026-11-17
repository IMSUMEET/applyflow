// Content Script — runs in the context of job application pages.
//
// Security boundary: has DOM access but NOT chrome.storage.
// All profile data arrives via message from the background service worker.

import { detectJobInfo } from "@/features/autofill/detection/jobDetector";
import { runAutofillFull, normalizeQuestion } from "@/features/autofill/autofillEngine";
import { startFieldObserver } from "@/features/learning/fieldObserver";
import { LearningOverlay } from "./learningOverlay";
import { AppSidebar } from "./ui";
import type { ContentScriptCommand } from "@/messaging/contentScriptMessages";

export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_idle",

  main() {
    const jobInfo = detectJobInfo(document, location.href);

    // Mount the sidebar — collapses to a tab; auto-expands on job pages.
    AppSidebar.mount(jobInfo, {
      onAutofillClick: () => void runAutofillFromSidebar(),
    });

    // Load profile name/email into sidebar's mini-card
    void chrome.runtime.sendMessage({ type: "FETCH_AUTOFILL_DATA" })
      .then((data: { profile?: { firstName?: string; lastName?: string; email?: string } }) => {
        if (data?.profile) {
          const { firstName = "", lastName = "", email = "" } = data.profile;
          const name = [firstName, lastName].filter(Boolean).join(" ");
          AppSidebar.loadProfile(name, email);
        }
      })
      .catch(() => {});

    // Listen for messages from the popup (which also has an autofill button)
    chrome.runtime.onMessage.addListener(
      (message: ContentScriptCommand, _sender, sendResponse) => {
        switch (message.type) {
          case "GET_JOB_INFO":
            sendResponse(detectJobInfo(document, location.href));
            return false;

          case "RUN_AUTOFILL": {
            const { profile, settings, learnedAnswers } = message;
            AppSidebar.setFilling(true);

            runAutofillFull(profile, settings, learnedAnswers)
              .then(({ result, unrecognizedFields }) => {
                AppSidebar.setFilling(false);
                AppSidebar.showResult(result);

                if (settings.learningEnabled && unrecognizedFields.length > 0) {
                  startFieldObserver(unrecognizedFields, (capture) => {
                    enqueueLearning(capture);
                  });
                }

                sendResponse(result);
              })
              .catch((err) => {
                console.error("[ApplyFlow] Autofill error:", err);
                AppSidebar.setFilling(false);
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

async function runAutofillFromSidebar(): Promise<void> {
  AppSidebar.setFilling(true);
  try {
    const data = await chrome.runtime.sendMessage({ type: "FETCH_AUTOFILL_DATA" }) as {
      profile: Parameters<typeof runAutofillFull>[0];
      settings: Parameters<typeof runAutofillFull>[1];
      learnedAnswers: Parameters<typeof runAutofillFull>[2];
    };
    const { result, unrecognizedFields } = await runAutofillFull(
      data.profile,
      data.settings,
      data.learnedAnswers
    );
    AppSidebar.showResult(result);

    if (data.settings.learningEnabled && unrecognizedFields.length > 0) {
      startFieldObserver(unrecognizedFields, (capture) => {
        enqueueLearning(capture);
      });
    }
  } catch (err) {
    const msg = String(err);
    console.error("[ApplyFlow] Sidebar autofill error:", err);
    const reason = msg.includes("context invalidated") || msg.includes("Extension context")
      ? "Extension was reloaded — please reload this page (Cmd+R)"
      : msg;
    AppSidebar.showResult({
      fieldsDetected: 0,
      fieldsFilled: 0,
      learnedFieldsApplied: 0,
      skipped: [],
      failed: [{ label: "error", reason }],
      unrecognized: [],
    });
  } finally {
    AppSidebar.setFilling(false);
  }
}

function enqueueLearning(capture: { question: string; answer: string; fieldType: string }): void {
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
}

function mapFieldType(
  elementType: string
): "text" | "textarea" | "select" | "radio" | "checkbox" {
  switch (elementType) {
    case "textarea":
      return "textarea";
    case "select":
      return "select";
    case "radio-group":
    case "radio":
      return "radio";
    case "input-checkbox":
      return "checkbox";
    default:
      return "text";
  }
}
