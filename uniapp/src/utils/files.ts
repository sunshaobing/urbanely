declare const wx: {
  env: { USER_DATA_PATH: string };
  getFileSystemManager: () => {
    copyFileSync: (srcPath: string, destPath: string) => void;
  };
};

export function isPersistedFile(path: string) {
  return (
    path.startsWith("_doc/") ||
    path.includes("/_doc/") ||
    path.startsWith("wxfile://usr") ||
    path.startsWith("http://usr")
  );
}

/**
 * Copy picker/canvas temp files into app-private storage before they are
 * cleaned up by the operating system. Uploads can then retry safely later.
 */
export function persistLocalFile(path: string): Promise<string> {
  if (!path || path.startsWith("http") || path.startsWith("data:")) {
    return Promise.resolve(path);
  }

  // #ifdef MP-WEIXIN
  try {
    const extension = path.match(/\.(png|jpe?g|webp)$/i)?.[1] || "jpg";
    const target = `${wx.env.USER_DATA_PATH}/pco_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}.${extension}`;
    wx.getFileSystemManager().copyFileSync(path, target);
    return Promise.resolve(target);
  } catch {
    // Fall back to uni.saveFile below.
  }
  // #endif

  return new Promise<string>((resolve) => {
    let settled = false;
    const finish = (value: string) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    const timer = setTimeout(() => finish(path), 1500);

    // #ifdef APP-PLUS || MP-WEIXIN
    uni.saveFile({
      tempFilePath: path,
      success: (result) => {
        clearTimeout(timer);
        finish(result.savedFilePath || path);
      },
      fail: () => {
        clearTimeout(timer);
        finish(path);
      },
    });
    // #endif

    // #ifdef H5
    clearTimeout(timer);
    finish(path);
    // #endif
  });
}
