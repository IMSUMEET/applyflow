import { describe, it, expect } from "vitest";
import { profileRepository } from "@/storage/profileRepository";
import { emptyProfile } from "@/models/profile";

describe("profileRepository", () => {
  it("returns an empty profile when nothing is stored", async () => {
    const profile = await profileRepository.get();
    expect(profile.firstName).toBe("");
    expect(profile.email).toBe("");
  });

  it("saves and retrieves a profile", async () => {
    const toSave = {
      ...emptyProfile(),
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
    };
    await profileRepository.save(toSave);
    const loaded = await profileRepository.get();
    expect(loaded.firstName).toBe("Jane");
    expect(loaded.lastName).toBe("Doe");
    expect(loaded.email).toBe("jane@example.com");
  });

  it("overwrites existing profile on save", async () => {
    await profileRepository.save({ ...emptyProfile(), firstName: "Old" });
    await profileRepository.save({ ...emptyProfile(), firstName: "New" });
    const loaded = await profileRepository.get();
    expect(loaded.firstName).toBe("New");
  });

  it("returns default profile when stored data is malformed", async () => {
    await chrome.storage.local.set({ userProfile: "not-an-object" });
    const profile = await profileRepository.get();
    expect(profile.firstName).toBe("");
  });
});
