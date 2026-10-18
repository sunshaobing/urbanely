import type { AuthPayload, InspectionDraft, QueueItem, SealingDraft, Session } from "./types";
import { getAttachmentPaths, removeManagedFiles } from "./files";

const SESSION_KEY = "session";
const TOKEN_KEY = "pco_access_token";
const DRAFT_PREFIX = "draft:";
const QUEUE_KEY = "syncQueue";

export function getSession(): Session | null {
  return wx.getStorageSync(SESSION_KEY) || null;
}

export function getAccessToken(): string {
  return wx.getStorageSync(TOKEN_KEY) || "";
}

export function saveAuth(payload: AuthPayload) {
  const phone = payload.user.phone || payload.user.username;
  const session: Session = {
    id: payload.user.id,
    username: payload.user.username,
    name: payload.user.name || payload.user.username,
    role: payload.user.role,
    phoneMasked: maskPhone(phone),
    loginAt: new Date().toISOString(),
  };

  wx.setStorageSync(TOKEN_KEY, payload.access_token);
  wx.setStorageSync(SESSION_KEY, session);
  const app = getApp();
  if (app?.globalData) app.globalData.session = session;
}

export function clearSession() {
  wx.removeStorageSync(TOKEN_KEY);
  wx.removeStorageSync(SESSION_KEY);
  const app = getApp();
  if (app?.globalData) app.globalData.session = null;
}

export function saveDraft(key: string, draft: InspectionDraft | SealingDraft) {
  wx.setStorageSync(`${DRAFT_PREFIX}${key}`, draft);
}

export function getDraft<T>(key: string): T | null {
  return wx.getStorageSync(`${DRAFT_PREFIX}${key}`) || null;
}

export function clearDraft(key: string) {
  wx.removeStorageSync(`${DRAFT_PREFIX}${key}`);
}

export function getQueue(): QueueItem[] {
  return wx.getStorageSync(QUEUE_KEY) || [];
}

export function enqueue(item: QueueItem) {
  const queue = getQueue();
  queue.unshift(item);
  wx.setStorageSync(QUEUE_KEY, queue);
}

export function clearQueue() {
  const attachments = getQueue().flatMap((item) => getAttachmentPaths(item.payload));
  removeManagedFiles(attachments);
  wx.setStorageSync(QUEUE_KEY, []);
}

export function clearDraftsAndQueue() {
  const queue = getQueue();
  const info = wx.getStorageInfoSync();
  const draftKeys: string[] = (info.keys || []).filter((key: string) => key.startsWith(DRAFT_PREFIX));
  const drafts = draftKeys.map((key: string) => wx.getStorageSync(key)).filter(Boolean);
  const attachments = [
    ...queue.flatMap((item) => getAttachmentPaths(item.payload)),
    ...drafts.flatMap((draft: InspectionDraft | SealingDraft) => getAttachmentPaths(draft)),
  ];

  removeManagedFiles(attachments);
  draftKeys.forEach((key: string) => wx.removeStorageSync(key));
  wx.setStorageSync(QUEUE_KEY, []);
}

export function maskPhone(phone: string) {
  if (!phone || phone.length < 7) return phone || "";
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}
