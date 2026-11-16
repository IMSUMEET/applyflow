// Type-safe message sender for use in content scripts and UI.
// Returns the response typed to the specific message type.

import type { AppMessage, AppMessageResponseMap } from "./messages";

export async function sendMessage<T extends AppMessage>(
  message: T
): Promise<AppMessageResponseMap[T["type"] & keyof AppMessageResponseMap]> {
  return chrome.runtime.sendMessage(message) as Promise<
    AppMessageResponseMap[T["type"] & keyof AppMessageResponseMap]
  >;
}
