App({
  globalData: {
    session: null,
  },
  onLaunch() {
    const session = wx.getStorageSync("session");
    if (session) {
      this.globalData.session = session;
    }
  },
});
