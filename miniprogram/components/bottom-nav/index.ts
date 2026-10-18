Component({
  properties: {
    current: {
      type: String,
      value: "tasks",
    },
  },
  data: {
    items: [
      { key: "tasks", label: "工作台", icon: "/assets/icons/home.png", activeIcon: "/assets/icons/home-active.png", url: "/pages/tasks/tasks" },
      { key: "reports", label: "报告", icon: "/assets/icons/tasks.png", activeIcon: "/assets/icons/tasks-active.png", url: "/pages/reports/reports" },
      { key: "profile", label: "我的", icon: "/assets/icons/user.png", activeIcon: "/assets/icons/user-active.png", url: "/pages/profile/profile" },
    ],
  },
  methods: {
    onTap(event: any) {
      const key = event.currentTarget.dataset.key;
      const item = this.data.items.find((entry: any) => entry.key === key);
      if (!item || key === this.data.current) return;
      wx.reLaunch({ url: item.url });
    },
  },
});
