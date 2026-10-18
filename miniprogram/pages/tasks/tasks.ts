import { getDashboardSummary, getWorkOrder, getWorkOrders } from "../../utils/api";
import { getErrorMessage } from "../../utils/error";
import { getSession } from "../../utils/storage";
import type { Session, WorkOrder } from "../../utils/types";

type StatusTone = "pending" | "active" | "done";

interface TaskFilter {
  label: string;
  status: string;
  tone: StatusTone;
}

interface TaskCard extends WorkOrder {
  statusLabel: string;
  statusClass: string;
  siteCount: number;
  displayDate: string;
}

const filters: TaskFilter[] = [
  { label: "待处理", status: "draft", tone: "pending" },
  { label: "进行中", status: "pending", tone: "active" },
  { label: "已完成", status: "approved", tone: "done" },
];

// Status transitions and filtering stay on the server; this map only localizes API states.
const statusPresentation: Record<string, { label: string; className: string }> = {
  draft: { label: "待处理", className: "status-pending" },
  rejected: { label: "待处理", className: "status-pending" },
  pending: { label: "进行中", className: "status-active" },
  approved: { label: "已完成", className: "status-done" },
  completed: { label: "已完成", className: "status-done" },
};

function formatDateText(date = new Date()) {
  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
  return `${date.getMonth() + 1}月${date.getDate()}日 星期${weekdays[date.getDay()]}`;
}

function formatTime(date = new Date()) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function presentTask(order: WorkOrder): TaskCard {
  const presentation = statusPresentation[order.status] || {
    label: order.status,
    className: "status-pending",
  };
  return {
    ...order,
    statusLabel: presentation.label,
    statusClass: presentation.className,
    siteCount: Array.isArray(order.sites) ? order.sites.length : 0,
    displayDate: order.service_date || order.report_date || order.created_at,
  };
}

Page({
  data: {
    user: {} as Partial<Session>,
    dateText: formatDateText(),
    filters,
    activeStatus: "draft",
    activeFilterLabel: "待处理",
    summaryCards: [] as Array<{ label: string; value: number }>,
    tasks: [] as TaskCard[],
    loading: false,
    loadingTasks: false,
    error: "",
    updatedAt: "",
  },
  onShow() {
    if (!getSession()) {
      wx.reLaunch({ url: "/pages/login/login" });
      return;
    }
    void this.loadWorkbench();
  },
  async onPullDownRefresh() {
    await this.loadWorkbench();
    wx.stopPullDownRefresh();
  },
  async loadWorkbench() {
    const session = getSession();
    if (!session || this.data.loading) return;

    this.setData({
      loading: true,
      error: "",
      user: session,
      dateText: formatDateText(),
    });

    try {
      const [summary, pending, orders] = await Promise.all([
        getDashboardSummary(),
        getWorkOrders("pending", 1, 1),
        getWorkOrders(this.data.activeStatus, 1, 20),
      ]);

      this.setData({
        summaryCards: [
          { label: "本月作业单", value: summary.cards.month_orders },
          { label: "待审核任务", value: pending.total },
          { label: "封堵部位", value: summary.cards.total_holes },
          { label: "风险勘测", value: summary.cards.risk_surveys },
        ],
        tasks: orders.items.map(presentTask),
        activeFilterLabel:
          filters.find((item) => item.status === this.data.activeStatus)?.label || "待处理",
        updatedAt: formatTime(),
      });
    } catch (error) {
      this.setData({ error: getErrorMessage(error, "数据加载失败，请稍后重试"), tasks: [] });
    } finally {
      this.setData({ loading: false });
    }
  },
  async selectFilter(event: any) {
    const status = String(event.currentTarget.dataset.status || "");
    const label = String(event.currentTarget.dataset.label || "");
    if (!status || status === this.data.activeStatus || this.data.loadingTasks) return;

    this.setData({
      activeStatus: status,
      activeFilterLabel: label,
      loadingTasks: true,
      error: "",
    });

    try {
      const result = await getWorkOrders(status, 1, 20);
      this.setData({ tasks: result.items.map(presentTask) });
    } catch (error) {
      this.setData({ error: getErrorMessage(error, "数据加载失败，请稍后重试"), tasks: [] });
    } finally {
      this.setData({ loadingTasks: false });
    }
  },
  async openTask(event: any) {
    const id = Number(event.currentTarget.dataset.id);
    if (!id) return;

    wx.showLoading({ title: "加载中", mask: true });
    try {
      const order = await getWorkOrder(id);
      wx.hideLoading();
      wx.showModal({
        title: order.report_no,
        content: [
          order.customer_name,
          order.service_type || "结构漏洞封堵",
          order.service_address,
          order.service_date || order.report_date,
        ]
          .filter(Boolean)
          .join("\n"),
        showCancel: false,
        confirmText: "关闭",
      });
    } catch (error) {
      wx.hideLoading();
      wx.showToast({ title: getErrorMessage(error, "任务详情加载失败"), icon: "none" });
    }
  },
  refresh() {
    void this.loadWorkbench();
  },
});
