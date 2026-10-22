import { API_BASE_URL } from "./api";
import { getSession } from "./auth";

export function reportPdfPath(kind: "risk" | "service", id: number) {
  return kind === "risk"
    ? `${API_BASE_URL}/api/risk-surveys/${id}/pdf`
    : `${API_BASE_URL}/api/service-reports/${id}/pdf`;
}

export function absoluteReportUrl(url: string) {
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

function downloadPdf(url: string) {
  const session = getSession();
  if (!session?.token) {
    return Promise.reject(new Error("登录已失效"));
  }
  return new Promise<string>((resolve, reject) => {
    uni.downloadFile({
      url: absoluteReportUrl(url),
      header: { Authorization: `Bearer ${session.token}` },
      success: (result) => {
        if (result.statusCode === 200) {
          resolve(result.tempFilePath);
          return;
        }
        reject(new Error("报告暂不可用"));
      },
      fail: () => reject(new Error("报告下载失败")),
    });
  });
}

export function prepareReportPdf(kind: "risk" | "service", id: number) {
  return downloadPdf(reportPdfPath(kind, id));
}

export function openReportPath(filePath: string) {
  uni.openDocument({
    filePath,
    fileType: "pdf",
    showMenu: true,
    fail: () => {
      uni.showToast({ title: "当前环境无法打开 PDF", icon: "none" });
    },
  });
}

export async function openReportPdf(url: string) {
  uni.showLoading({ title: "正在打开报告" });
  try {
    openReportPath(await downloadPdf(url));
  } catch (error) {
    uni.showToast({
      title: error instanceof Error ? error.message : "报告下载失败",
      icon: "none",
    });
  } finally {
    uni.hideLoading();
  }
}
