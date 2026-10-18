import { technician, tasks as mockTasks, sites } from "../../data/mock";
import { getSession } from "../../utils/storage";

const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

function formatTodayLabel(date = new Date()) {
  return `${date.getMonth() + 1} 月 ${date.getDate()} 日 · ${weekdays[date.getDay()]}`;
}

Page({
  data: {
    user: technician,
    tasks: [] as any[],
    filteredTasks: [] as any[],
    filter: "今日",
    filters: ["今日", "待办", "已完成"],
    stats: { today: 0, pending: 0, risk: 0 },
    todayLabel: formatTodayLabel(),
  },
  onShow() {
    const session = getSession();
    if (!session) {
      wx.reLaunch({ url: "/pages/login/login" });
      return;
    }
    const tasks = mockTasks.map((task) => {
      const site = sites.find((item) => item.id === task.siteId) || sites[0];
      return { ...task, site };
    });
    this.setData({
      user: { ...technician, ...session },
      tasks,
      stats: {
        today: tasks.filter((task) => task.time !== "昨天" && task.status !== "已完成").length,
        pending: tasks.filter((task) => task.status === "待提交").length,
        risk: tasks.filter((task) => task.risk === "high" || task.risk === "critical").length,
      },
    });
    this.applyFilter(this.data.filter);
  },
  applyFilter(filter: string) {
    const tasks = this.data.tasks;
    const filteredTasks =
      filter === "已完成"
        ? tasks.filter((task: any) => task.status === "已完成")
        : filter === "待办"
          ? tasks.filter((task: any) => task.status !== "已完成")
          : tasks.filter((task: any) => task.time !== "昨天");
    this.setData({ filter, filteredTasks });
  },
  onFilter(event: any) {
    this.applyFilter(event.currentTarget.dataset.filter);
  },
  openTask(event: any) {
    const { id, type } = event.currentTarget.dataset;
    if (type === "survey") {
      wx.navigateTo({ url: `/pages/inspection/inspection?taskId=${id}` });
      return;
    }
    if (type === "sealing") {
      wx.navigateTo({ url: `/pages/sealing/sealing?taskId=${id}` });
      return;
    }
    wx.showToast({ title: "该任务类型即将开放", icon: "none" });
  },
});
