const PREFIX = "shentai.uniapp.draft.";

export function readLocalDraft<T>(key: string): T | null {
  const value = uni.getStorageSync(`${PREFIX}${key}`);
  return value && typeof value === "object" ? (value as T) : null;
}

export function writeLocalDraft(key: string, value: unknown) {
  uni.setStorageSync(`${PREFIX}${key}`, value);
}

export function removeLocalDraft(key: string) {
  uni.removeStorageSync(`${PREFIX}${key}`);
}
