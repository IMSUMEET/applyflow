import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock chrome extension APIs for unit tests
const chromeStorage: Record<string, unknown> = {};

global.chrome = {
  storage: {
    local: {
      get: vi.fn(async (keys: string | string[] | null) => {
        if (typeof keys === "string") return { [keys]: chromeStorage[keys] };
        if (Array.isArray(keys)) {
          return Object.fromEntries(keys.map((k) => [k, chromeStorage[k]]));
        }
        return { ...chromeStorage };
      }),
      set: vi.fn(async (items: Record<string, unknown>) => {
        Object.assign(chromeStorage, items);
      }),
      remove: vi.fn(async (keys: string | string[]) => {
        const arr = typeof keys === "string" ? [keys] : keys;
        for (const k of arr) delete chromeStorage[k];
      }),
      clear: vi.fn(async () => {
        for (const k of Object.keys(chromeStorage)) delete chromeStorage[k];
      }),
    },
  },
  runtime: {
    sendMessage: vi.fn(),
    onMessage: { addListener: vi.fn() },
    onInstalled: { addListener: vi.fn() },
    getURL: vi.fn((path: string) => `chrome-extension://test/${path}`),
  },
  tabs: {
    query: vi.fn(async () => []),
    create: vi.fn(),
  },
  alarms: {
    create: vi.fn(),
    onAlarm: { addListener: vi.fn() },
  },
  notifications: {
    create: vi.fn(),
  },
} as unknown as typeof chrome;

// Clear storage between tests
beforeEach(() => {
  for (const k of Object.keys(chromeStorage)) delete chromeStorage[k];
  vi.clearAllMocks();

  // Re-wire storage mock to current state
  (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockImplementation(
    async (keys: string | string[] | null) => {
      if (typeof keys === "string") return { [keys]: chromeStorage[keys] };
      if (Array.isArray(keys)) {
        return Object.fromEntries(keys.map((k) => [k, chromeStorage[k]]));
      }
      return { ...chromeStorage };
    }
  );

  (chrome.storage.local.set as ReturnType<typeof vi.fn>).mockImplementation(
    async (items: Record<string, unknown>) => {
      Object.assign(chromeStorage, items);
    }
  );

  (chrome.storage.local.remove as ReturnType<typeof vi.fn>).mockImplementation(
    async (keys: string | string[]) => {
      const arr = typeof keys === "string" ? [keys] : keys;
      for (const k of arr) delete chromeStorage[k];
    }
  );
});
