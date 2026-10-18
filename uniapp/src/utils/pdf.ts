import { API_BASE_URL } from "./api";
import { getSession } from "./auth";

export function reportPdfPath(kind: "risk" | "service", id: number) {
  return kind === "risk"
    ? `${API_BASE_URL}/api/risk-surveys/${id}/pdf`
    : `${API_BASE_URL}/api/service-reports/${id}/pdf`;
}

export function openReportPdf(url: string) {
  const session = getSession();
  if (!session?.token) {
    uni.showToast({ title: "登录已失效", icon: "none" });
    return;
  }
  uni.showLoading({ title: "正在打开报告" });
  uni.downloadFile({
    url,
    header: { Authorization: `Bearer ${session.token}` },
    success: (result) => {
      if (result.statusCode !== 200) {
        uni.showToast({ title: "报告暂不可用", icon: "none" });
        return;
      }
      uni.openDocument({
        filePath: result.tempFilePath,
        fileType: "pdf",
        showMenu: true,
        fail: () => {
          uni.showToast({ title: "当前环境无法打开 PDF", icon: "none" });
        },
      });
    },
    fail: () => {
      uni.showToast({ title: "报告下载失败", icon: "none" });
    },
    complete: () => {
      uni.hideLoading();
    },
  });
}
