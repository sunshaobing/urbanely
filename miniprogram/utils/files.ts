import type { InspectionDraft, SealingDraft } from "./types";

const MANAGED_PREFIX = "pco-";

function extensionFor(path: string, fallback: string) {
  const match = String(path || "").match(/\.([a-z0-9]+)(?:\?|$)/i);
  return match ? match[1].toLowerCase() : fallback;
}

function isManagedFile(path: string) {
  return Boolean(path && wx.env.USER_DATA_PATH && path.startsWith(`${wx.env.USER_DATA_PATH}/${MANAGED_PREFIX}`));
}

export function persistTempFile(tempPath: string, kind: "photo" | "signature") {
  return new Promise<string>((resolve) => {
    if (!tempPath || isManagedFile(tempPath)) {
      resolve(tempPath);
      return;
    }

    const suffix = Math.random().toString(36).slice(2, 10);
    const extension = kind === "signature" ? "png" : extensionFor(tempPath, "jpg");
    const targetPath = `${wx.env.USER_DATA_PATH}/${MANAGED_PREFIX}${kind}-${Date.now()}-${suffix}.${extension}`;

    wx.getFileSystemManager().saveFile({
      tempFilePath: tempPath,
      filePath: targetPath,
      success: (result: { savedFilePath?: string }) => resolve(result.savedFilePath || targetPath),
      fail: () => resolve(tempPath),
    });
  });
}

export async function persistTempFiles(paths: string[]) {
  return Promise.all(paths.map((path) => persistTempFile(path, "photo")));
}

export function removeManagedFile(path: string) {
  if (!isManagedFile(path)) return;
  wx.getFileSystemManager().unlink({
    filePath: path,
    fail: () => undefined,
  });
}

export function removeManagedFiles(paths: string[]) {
  paths.filter(Boolean).forEach(removeManagedFile);
}

export function getAttachmentPaths(payload: InspectionDraft | SealingDraft) {
  if ("riskPhotos" in payload) {
    return [
      ...payload.riskPhotos,
      payload.surveyorSignature,
      payload.customerSignature,
    ].filter(Boolean);
  }

  return [
    ...payload.beforePhotos,
    ...payload.afterPhotos,
    payload.responsibleSignature,
    payload.customerSignature,
  ].filter(Boolean);
}
