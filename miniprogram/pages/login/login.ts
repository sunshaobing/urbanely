import { technician } from "../../data/mock";
import { maskPhone, saveSession } from "../../utils/storage";

Page({
  data: {
    phone: "",
    password: "",
    showPassword: false,
    loading: false,
    error: "",
  },
  onPhoneInput(event: any) {
    this.setData({
      phone: String(event.detail.value || "").replace(/\D/g, "").slice(0, 11),
      error: "",
    });
  },
  onPasswordInput(event: any) {
    this.setData({ password: event.detail.value, error: "" });
  },
  togglePassword() {
    this.setData({ showPassword: !this.data.showPassword });
  },
  login() {
    const { phone, password } = this.data;
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      this.setData({ error: "请输入有效的 11 位手机号码" });
      return;
    }
    if (password.length < 6) {
      this.setData({ error: "密码至少需要 6 位" });
      return;
    }
    this.setData({ loading: true, error: "" });
    setTimeout(() => {
      try {
        saveSession({
          name: technician.name,
          role: technician.role,
          phoneMasked: maskPhone(phone),
          loginAt: new Date().toISOString(),
        });
        this.setData({ loading: false });
        wx.reLaunch({
          url: "/pages/tasks/tasks",
          fail: () => this.setData({ error: "登录成功，但页面跳转失败，请重试" }),
        });
      } catch {
        this.setData({ loading: false, error: "登录失败，请稍后重试" });
      }
    }, 450);
  },
  forgotPassword() {
    wx.showModal({
      title: "重置密码",
      content: "请联系项目主管或系统管理员重置密码。",
      showCancel: false,
    });
  },
});
