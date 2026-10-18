import { getDashboardSummary } from "../../utils/api";
import { getErrorMessage } from "../../utils/error";
import { clearSession, getSession } from "../../utils/storage";
import type { Session } from "../../utils/types";

Page({
  data: {
    user: {} as Partial<Session>,
    metrics: [] as Array<{ label: string; value: number }>,
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
    void this.loadSummary();
  },
  async onPullDownRefresh() {
    await this.loadSummary();
    wx.stopPullDownRefresh();
  },
  async loadSummary() {
    if (this.data.loading) return;
    this.setData({ loading: true, error: "" });
    try {
      const summary = await getDashboardSummary();
      this.setData({
        metrics: [
          { label: "本月作业单", value: summary.cards.month_orders },
          { label: "封堵部位", value: summary.cards.total_holes },
          { label: "风险勘测", value: summary.cards.risk_surveys },
          { label: "到期复检", value: summary.cards.due_inspections },
        ],
      });
    } catch (error) {
      this.setData({ error: getErrorMessage(error, "账号数据加载失败"), metrics: [] });
    } finally {
      this.setData({ loading: false });
    }
  },
  refresh() {
    void this.loadSummary();
  },
  about() {
    wx.showModal({
      title: "申汰封堵勘测系统",
      content: "现场作业小程序 · 数据服务由腾讯云提供",
      showCancel: false,
      confirmText: "关闭",
    });
  },
  logout() {
    wx.showModal({
      title: "退出登录",
      content: "确认退出当前账号？",
      success: (result: any) => {
        if (!result.confirm) return;
        clearSession();
        wx.reLaunch({ url: "/pages/login/login" });
      },
    });
  },
});
