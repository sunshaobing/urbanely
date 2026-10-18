import { API_BASE_URL } from "./config/env";

App({
  globalData: {
    session: null,
    apiBaseUrl: API_BASE_URL,
  },
  onLaunch() {
    const session = wx.getStorageSync("session");
    if (session) {
      this.globalData.session = session;
    }
  },
});
