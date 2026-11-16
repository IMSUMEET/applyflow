// Messages sent TO content scripts via chrome.tabs.sendMessage.
// These are separate from AppMessage (which goes to the background).
// Content scripts respond synchronously or via sendResponse(true).

import type { UserProfile } from "@/models/profile";
import type { UserSettings } from "@/models/settings";
import type { LearnedAnswer } from "@/models/learning";
import type { AutofillResult } from "@/features/autofill/detection/detectedField";
import type { DetectedJobInfo } from "./messages";

export type ContentScriptCommand =
  | { type: "GET_JOB_INFO" }
  | {
      type: "RUN_AUTOFILL";
      profile: UserProfile;
      settings: UserSettings;
      learnedAnswers: LearnedAnswer[];
    };

export type ContentScriptResponseMap = {
  GET_JOB_INFO: DetectedJobInfo;
  RUN_AUTOFILL: AutofillResult;
};
