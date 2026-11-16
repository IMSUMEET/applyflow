// Thin type-safe wrapper over chrome.storage.local.
// All storage I/O goes through this — never call chrome.storage.local directly elsewhere.

export async function storageGet<T>(key: string): Promise<T | undefined> {
  const result = await chrome.storage.local.get(key);
  return result[key] as T | undefined;
}

export async function storageSet<T>(key: string, value: T): Promise<void> {
  await chrome.storage.local.set({ [key]: value });
}

export async function storageRemove(key: string): Promise<void> {
  await chrome.storage.local.remove(key);
}

export async function storageGetMany<T>(
  keys: string[]
): Promise<Partial<Record<string, T>>> {
  const result = await chrome.storage.local.get(keys);
  return result as Partial<Record<string, T>>;
}

export async function storageClear(): Promise<void> {
  await chrome.storage.local.clear();
}
