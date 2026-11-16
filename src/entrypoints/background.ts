// Background Service Worker — ApplyFlow's orchestration layer.
//
// MV3 service workers are event-driven and terminate when idle (~30s of inactivity).
// NEVER store business state in module-level variables — use chrome.storage instead.
// This file registers listeners; the actual logic lives in feature modules.

import type { AppMessage } from "@/messaging/messages";
import { profileRepository } from "@/storage/profileRepository";
import { settingsRepository } from "@/storage/settingsRepository";
import { jobRepository } from "@/storage/jobRepository";
import { referralRepository } from "@/storage/referralRepository";
import { learningRepository } from "@/storage/learningRepository";
import { buildDigest } from "@/features/digest/digestBuilder";

export default defineBackground(() => {
  // ── Installation handler ───────────────────────────────────────────────────
  chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") {
      console.log("[ApplyFlow] Extension installed — initializing defaults.");
    }
  });

  // ── Message router ─────────────────────────────────────────────────────────
  // sendResponse must be called synchronously OR we return true to indicate
  // async response. We always return true here and use the async pattern.
  chrome.runtime.onMessage.addListener(
    (message: AppMessage, _sender, sendResponse) => {
      handleMessage(message)
        .then(sendResponse)
        .catch((err) => {
          console.error("[ApplyFlow] Message handler error:", err);
          sendResponse({ error: String(err) });
        });
      return true; // keep the message channel open for async response
    }
  );
});

async function handleMessage(message: AppMessage): Promise<unknown> {
  switch (message.type) {
    // ── Profile ──────────────────────────────────────────────────────────────
    case "GET_PROFILE":
      return profileRepository.get();

    case "SAVE_PROFILE":
      await profileRepository.save(message.profile);
      return { success: true };

    // ── Settings ─────────────────────────────────────────────────────────────
    case "GET_SETTINGS":
      return settingsRepository.get();

    case "SAVE_SETTINGS":
      await settingsRepository.save(message.settings);
      return { success: true };

    // ── Jobs ─────────────────────────────────────────────────────────────────
    case "GET_JOBS":
      return jobRepository.findAll();

    case "SAVE_JOB":
      return jobRepository.create(message.job);

    case "UPDATE_JOB":
      await jobRepository.update(message.job);
      return { success: true };

    case "DELETE_JOB":
      await jobRepository.delete(message.jobId);
      return { success: true };

    // ── Referral contacts ─────────────────────────────────────────────────────
    case "GET_REFERRAL_CONTACTS":
      return referralRepository.contacts.findAll();

    case "SAVE_REFERRAL_CONTACT":
      return referralRepository.contacts.create(message.contact);

    case "UPDATE_REFERRAL_CONTACT":
      await referralRepository.contacts.update(message.contact);
      return { success: true };

    case "DELETE_REFERRAL_CONTACT":
      await referralRepository.contacts.delete(message.contactId);
      return { success: true };

    // ── Referral assignments ──────────────────────────────────────────────────
    case "GET_REFERRAL_ASSIGNMENTS":
      return referralRepository.assignments.findAll();

    case "SAVE_REFERRAL_ASSIGNMENT":
      return referralRepository.assignments.create(message.assignment);

    case "UPDATE_REFERRAL_ASSIGNMENT":
      await referralRepository.assignments.update(message.assignment);
      return { success: true };

    // ── Learning ──────────────────────────────────────────────────────────────
    case "GET_LEARNED_ANSWERS":
      return learningRepository.answers.findAll();

    case "SAVE_LEARNED_ANSWER":
      return learningRepository.answers.create(message.answer);

    case "UPDATE_LEARNED_ANSWER":
      await learningRepository.answers.update(message.answer);
      return { success: true };

    case "DELETE_LEARNED_ANSWER":
      await learningRepository.answers.delete(message.answerId);
      return { success: true };

    // ── Autofill ──────────────────────────────────────────────────────────────
    // Background loads profile+settings then relays to the active tab's content script.
    // The content script does the actual DOM work and returns results.
    case "EXECUTE_AUTOFILL": {
      const [profile, settings, learnedAnswers] = await Promise.all([
        profileRepository.get(),
        settingsRepository.get(),
        learningRepository.answers.findAll(),
      ]);
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tab = tabs[0];
      if (!tab?.id) return { fieldsDetected: 0, fieldsFilled: 0, learnedFieldsApplied: 0, skipped: [], failed: [], unrecognized: [] };
      try {
        return await chrome.tabs.sendMessage(tab.id, {
          type: "RUN_AUTOFILL",
          profile,
          settings,
          learnedAnswers,
        });
      } catch {
        return { fieldsDetected: 0, fieldsFilled: 0, learnedFieldsApplied: 0, skipped: [], failed: [{ label: "page", reason: "Content script not available on this page" }], unrecognized: [] };
      }
    }

    // ── Digest ────────────────────────────────────────────────────────────────
    case "GENERATE_DIGEST":
      return buildDigest();

    // ── Ping ──────────────────────────────────────────────────────────────────
    case "PING":
      return { alive: true };

    default:
      console.warn("[ApplyFlow] Unknown message type:", (message as { type: string }).type);
      return { error: "Unknown message type" };
  }
}
