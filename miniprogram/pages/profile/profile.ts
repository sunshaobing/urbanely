import { technician } from "../../data/mock";
import { clearDraftsAndQueue, clearQueue, clearSession, getQueue, getSession } from "../../utils/storage";

Page({
  data: {
    user: technician,
    queueCount: 0,
    syncing: false,
  },
  onShow() {
    const session = getSession();
    if (!session) {
      wx.reLaunch({ url: "/pages/login/login" });
      return;
    }
    this.setData({
      user: { ...technician, ...session },
      queueCount: getQueue().length,
    });
  },
  syncNow() {
    if (this.data.queueCount === 0) {
      wx.showToast({ title: "本机队列为空", icon: "none" });
      return;
    }
    this.setData({ syncing: true });
    setTimeout(() => {
      clearQueue();
      this.setData({ syncing: false, queueCount: 0 });
      wx.showToast({ title: "本机队列已同步", icon: "success" });
    }, 600);
  },
  clearCache() {
    wx.showModal({
      title: "清理本机缓存",
      content: "将删除未提交草稿和同步队列，不会退出登录。",
      success: (res: any) => {
        if (!res.confirm) return;
        clearDraftsAndQueue();
        this.setData({ queueCount: 0 });
        wx.showToast({ title: "缓存已清理", icon: "success" });
      },
    });
  },
  about() {
    wx.showModal({
      title: "申汰 PCO 现场端",
      content: "版本 0.1 · 现场勘测、结构封堵、手写签字和离线队列原型。",
      showCancel: false,
    });
  },
  logout() {
    wx.showModal({
      title: "退出登录",
      content: "退出后需要重新输入手机号和密码。",
      success: (res: any) => {
        if (!res.confirm) return;
        clearSession();
        wx.reLaunch({ url: "/pages/login/login" });
      },
    });
  },
});
