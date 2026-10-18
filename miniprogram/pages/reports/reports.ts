import { getSession } from "../../utils/storage";

Page({
  data: {
    user: null as any,
    reports: [
      {
        id: "rpt-1",
        reportNo: "KC-2026-BG-128",
        site: "趣坊·深圳水围店",
        title: "现场勘测报告",
        status: "待客户签字",
        date: "2026-10-18",
        size: "2.5 MB",
      },
      {
        id: "rpt-2",
        reportNo: "STFD-2026-116",
        site: "宝山正大乐城",
        title: "结构(鼠患)封堵服务单",
        status: "双方已签",
        date: "2026-10-18",
        size: "5.3 MB",
      },
      {
        id: "rpt-3",
        reportNo: "STFW-2026-168",
        site: "趣坊·深圳水围店",
        title: "PCO 服务单",
        status: "待复核",
        date: "2026-10-17",
        size: "3.1 MB",
      },
    ],
  },
  onShow() {
    const session = getSession();
    if (!session) {
      wx.reLaunch({ url: "/pages/login/login" });
      return;
    }
    this.setData({ user: session });
  },
  openReport(event: any) {
    const reportNo = event.currentTarget.dataset.report;
    wx.showModal({
      title: "报告预览",
      content: `${reportNo} 由服务端生成并签名归档。小程序端接入后端后可查看 PDF 和扫码验真页。`,
      confirmText: "知道了",
      showCancel: false,
    });
  },
});
