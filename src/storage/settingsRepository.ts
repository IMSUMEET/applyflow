import type { UserSettings } from "@/models/settings";
import { UserSettingsSchema, defaultSettings } from "@/models/settings";
import { storageGet, storageSet } from "./chromeStorage";

const KEY = "userSettings";

export const settingsRepository = {
  async get(): Promise<UserSettings> {
    const raw = await storageGet<unknown>(KEY);
    if (!raw) return defaultSettings();
    const result = UserSettingsSchema.safeParse(raw);
    return result.success ? result.data : defaultSettings();
  },

  async save(settings: UserSettings): Promise<void> {
    const validated = UserSettingsSchema.parse(settings);
    await storageSet(KEY, validated);
  },

  async patch(partial: Partial<UserSettings>): Promise<UserSettings> {
    const current = await this.get();
    const merged = { ...current, ...partial };
    await this.save(merged);
    return merged;
  },
};
