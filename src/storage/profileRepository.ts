import type { UserProfile } from "@/models/profile";
import { UserProfileSchema, emptyProfile } from "@/models/profile";
import { storageGet, storageSet } from "./chromeStorage";

const KEY = "userProfile";

export const profileRepository = {
  async get(): Promise<UserProfile> {
    const raw = await storageGet<unknown>(KEY);
    if (!raw) return emptyProfile();
    const result = UserProfileSchema.safeParse(raw);
    return result.success ? result.data : emptyProfile();
  },

  async save(profile: UserProfile): Promise<void> {
    const validated = UserProfileSchema.parse(profile);
    await storageSet(KEY, validated);
  },
};
