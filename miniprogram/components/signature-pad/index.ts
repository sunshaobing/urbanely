import { persistTempFile, removeManagedFile } from "../../utils/files";

Component({
  properties: {
    title: { type: String, value: "签字确认" },
    signer: { type: String, value: "" },
    hint: { type: String, value: "" },
    value: { type: String, value: "" },
  },
  data: {
    signed: false,
    hasInk: false,
    signaturePath: "",
  },
  lifetimes: {
    ready() {
      const existingSignature = String(this.properties.value || "");
      if (existingSignature) {
        this.setData({ signed: true, signaturePath: existingSignature });
        return;
      }
      this.initCanvas();
    },
  },
  observers: {
    value(value: string) {
      const signaturePath = String(value || "");
      if (this.data.signaturePath === signaturePath) return;
      this.setData({ signed: Boolean(signaturePath), signaturePath });
    },
  },
  methods: {
    initCanvas() {
      const query = wx.createSelectorQuery().in(this);
      query.select("#signature-canvas").fields({ node: true, size: true }).exec((res: any) => {
        const item = res && res[0];
        if (!item || !item.node) return;
        const canvas = item.node;
        const dpr = wx.getWindowInfo?.().pixelRatio || wx.getSystemInfoSync().pixelRatio || 1;
        canvas.width = item.width * dpr;
        canvas.height = item.height * dpr;
        const ctx = canvas.getContext("2d");
        ctx.scale(dpr, dpr);
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = "#17201d";
        this.canvas = canvas;
        this.ctx = ctx;
        this.dpr = dpr;
        this.canvasWidth = item.width;
        this.canvasHeight = item.height;
      });
    },
    touchStart(event: any) {
      if (this.data.signed || !this.ctx) return;
      const touch = event.touches[0];
      this.drawing = true;
      this.ctx.beginPath();
      this.ctx.moveTo(touch.x, touch.y);
      this.ctx.lineTo(touch.x + 0.1, touch.y);
      this.ctx.stroke();
      this.setData({ hasInk: true });
    },
    touchMove(event: any) {
      if (!this.drawing || !this.ctx) return;
      const touch = event.touches[0];
      this.ctx.lineTo(touch.x, touch.y);
      this.ctx.stroke();
    },
    touchEnd() {
      this.drawing = false;
    },
    clearCanvas() {
      if (!this.ctx) return;
      this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
      this.setData({ hasInk: false });
    },
    confirm() {
      if (!this.data.hasInk) {
        wx.showToast({ title: "请先手写签名", icon: "none" });
        return;
      }
      wx.canvasToTempFilePath({
        canvas: this.canvas,
        success: async (res: any) => {
          const signaturePath = await persistTempFile(res.tempFilePath, "signature");
          this.setData({ signed: true, signaturePath, hasInk: false });
          this.triggerEvent("signed", { path: signaturePath });
        },
        fail: () => {
          wx.showToast({ title: "签名导出失败，请重试", icon: "none" });
        },
      }, this);
    },
    reset() {
      const previousPath = this.data.signaturePath;
      this.clearCanvas();
      this.setData({ signed: false, signaturePath: "" });
      removeManagedFile(previousPath);
      this.triggerEvent("signed", { path: "" });
      wx.nextTick(() => this.initCanvas());
    },
  },
});
