import { getWorkOrder, getWorkOrders } from "../../utils/api";
import { getErrorMessage } from "../../utils/error";
import { getSession } from "../../utils/storage";
import type { Session, WorkOrder } from "../../utils/types";

interface ReportCard extends WorkOrder {
  displayDate: string;
}

Page({
  data: {
    user: {} as Partial<Session>,
    reports: [] as ReportCard[],
    loading: false,
    error: "",
  },
  onShow() {
    const session = getSession();
    if (!session) {
      wx.reLaunch({ url: "/pages/login/login" });
      return;
    }
    this.setData({ user: session });
    void this.loadReports();
  },
  async onPullDownRefresh() {
    await this.loadReports();
    wx.stopPullDownRefresh();
  },
  async loadReports() {
    if (this.data.loading) return;
    this.setData({ loading: true, error: "" });
    try {
      const result = await getWorkOrders("approved", 1, 50);
      this.setData({
        reports: result.items.map((item) => ({
          ...item,
          displayDate: item.completed_at || item.service_date || item.report_date,
        })),
      });
    } catch (error) {
      this.setData({ error: getErrorMessage(error, "报告加载失败，请稍后重试"), reports: [] });
    } finally {
      this.setData({ loading: false });
    }
  },
  async openReport(event: any) {
    const id = Number(event.currentTarget.dataset.id);
    if (!id) return;

    wx.showLoading({ title: "加载中", mask: true });
    try {
      const report = await getWorkOrder(id);
      wx.hideLoading();
      wx.showModal({
        title: report.report_no,
        content: [
          report.customer_name,
          report.service_address,
          `完成时间：${report.completed_at || report.service_date || report.report_date}`,
        ]
          .filter(Boolean)
          .join("\n"),
        showCancel: false,
        confirmText: "关闭",
      });
    } catch (error) {
      wx.hideLoading();
      wx.showToast({ title: getErrorMessage(error, "报告加载失败"), icon: "none" });
    }
  },
  refresh() {
    void this.loadReports();
  },
});
