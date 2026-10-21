declare const wx:
  | {
      requirePrivacyAuthorize?: (options: {
        success: () => void;
        fail: () => void;
      }) => void;
      getPrivacySetting?: (options: {
        success: (result: { needAuthorization: boolean }) => void;
        fail: () => void;
      }) => void;
    }
  | undefined;

/**
 * Ask for the official WeChat privacy authorization before collecting account,
 * location, camera or photo information. Older base libraries without this API
 * fall back to the explicit consent checkbox in the login page.
 */
export async function ensurePrivacyAuthorized(): Promise<void> {
  // #ifdef MP-WEIXIN
  if (!wx?.requirePrivacyAuthorize) {
    return;
  }
  if (wx.getPrivacySetting) {
    const setting = await new Promise<{ needAuthorization: boolean }>(
      (resolve) => {
        wx!.getPrivacySetting!({
          success: resolve,
          fail: () => resolve({ needAuthorization: true }),
        });
      },
    );
    if (!setting.needAuthorization) return;
  }
  return new Promise<void>((resolve, reject) => {
    wx!.requirePrivacyAuthorize!({
      success: resolve,
      fail: () =>
        reject(new Error("请先同意微信隐私保护指引后再继续使用")),
    });
  });
  // #endif
  // #ifndef MP-WEIXIN
  return;
  // #endif
}
