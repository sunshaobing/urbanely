import { sealingItems, sites, tasks } from "../../data/mock";
import { clearDraft, enqueue, getDraft, getSession, saveDraft } from "../../utils/storage";
import type { SealingDraft, Site } from "../../utils/types";

const steps = ["服务信息", "封堵记录", "双方签字", "提交"];

function createSealingDraft(taskId: string, site: Site): SealingDraft {
  return {
    taskId,
    site,
    date: "2026-10-16",
    leader: "陈林",
    supervisor: "陈林",
    rodent: "小家鼠",
    density: "中（可见痕迹）",
    items: sealingItems.map((item) => ({ ...item })),
    materials: [
      { id: "mat-1", name: "防火泥", spec: "20kg/箱", unit: "kg", quantity: 2.5 },
      { id: "mat-2", name: "密封胶", spec: "300ml/支", unit: "支", quantity: 4 },
      { id: "mat-3", name: "防鼠网", spec: "0.6cm 网眼", unit: "卷", quantity: 1 },
    ],
    beforePhotos: [],
    afterPhotos: [],
    responsibleSignature: "",
    customerSignature: "",
    updatedAt: "",
  };
}

Page({
  data: {
    steps,
    step: 0,
    progress: 25,
    taskId: "task-2",
    taskNo: tasks[1].documentNo,
    draft: createSealingDraft("task-2", sites[1]),
  },
  onLoad(options: any) {
    if (!getSession()) {
      wx.reLaunch({ url: "/pages/login/login" });
      return;
    }
    const taskId = options.taskId || "task-2";
    const task = tasks.find((item) => item.id === taskId) || tasks[1] || tasks[0];
    const site = sites.find((item) => item.id === task.siteId) || sites[0];
    const saved = getDraft<SealingDraft>(`sealing:${taskId}`);
    const draft = saved || createSealingDraft(taskId, site);
    this.setData({ taskId, taskNo: task.documentNo, draft });
  },
  updateProgress(step: number) {
    this.setData({ step, progress: Math.round(((step + 1) / steps.length) * 100) });
  },
  prev() {
    if (this.data.step > 0) this.updateProgress(this.data.step - 1);
  },
  markSealed(event: any) {
    const id = event.currentTarget.dataset.id;
    const items = this.data.draft.items.map((item: any) =>
      item.id === id ? { ...item, result: item.result === "已封堵" ? "待封堵" : "已封堵" } : item,
    );
    this.setData({ "draft.items": items });
  },
  addMaterial() {
    const materials = this.data.draft.materials.concat({
      id: `mat-${Date.now()}`,
      name: "新增材料",
      spec: "请补充规格",
      unit: "kg",
      quantity: 1,
    });
    this.setData({ "draft.materials": materials });
  },
  onMaterialQuantity(event: any) {
    const index = Number(event.currentTarget.dataset.index);
    const materials = this.data.draft.materials.map((item: any, current: number) =>
      current === index ? { ...item, quantity: Number(event.detail.value) || 0 } : item,
    );
    this.setData({ "draft.materials": materials });
  },
  onBeforePhotos(event: any) {
    this.setData({ "draft.beforePhotos": event.detail.photos });
  },
  onAfterPhotos(event: any) {
    this.setData({ "draft.afterPhotos": event.detail.photos });
  },
  onResponsibleSigned(event: any) {
    this.setData({ "draft.responsibleSignature": event.detail.path });
  },
  onCustomerSigned(event: any) {
    this.setData({ "draft.customerSignature": event.detail.path });
  },
  next() {
    const { step, draft } = this.data;
    if (step === 1 && (!draft.beforePhotos.length || !draft.afterPhotos.length)) {
      wx.showToast({ title: "请补齐封堵前后照片", icon: "none" });
      return;
    }
    if (step === 2 && (!draft.responsibleSignature || !draft.customerSignature)) {
      wx.showToast({ title: "请完成双方手写签字", icon: "none" });
      return;
    }
    if (step < steps.length - 1) this.updateProgress(step + 1);
  },
  persistDraft() {
    saveDraft(`sealing:${this.data.taskId}`, {
      ...this.data.draft,
      updatedAt: new Date().toISOString(),
    });
  },
  saveDraft() {
    this.persistDraft();
    wx.showToast({ title: "草稿已保存到本机", icon: "success" });
  },
  submit() {
    const { draft, taskId } = this.data;
    if (!draft.beforePhotos.length || !draft.afterPhotos.length || !draft.responsibleSignature || !draft.customerSignature) {
      wx.showToast({ title: "照片或签字尚未完成", icon: "none" });
      return;
    }
    this.persistDraft();
    enqueue({
      id: `sealing-${taskId}-${Date.now()}`,
      type: "sealing",
      label: `${draft.site.name} 结构封堵`,
      payload: { ...draft, updatedAt: new Date().toISOString() },
      createdAt: new Date().toISOString(),
    });
    clearDraft(`sealing:${taskId}`);
    wx.showToast({ title: "已保存到本机，联网后同步", icon: "success", duration: 1800 });
    setTimeout(() => wx.reLaunch({ url: "/pages/tasks/tasks" }), 900);
  },
  goBack() {
    wx.navigateBack({
      delta: 1,
      fail: () => wx.reLaunch({ url: "/pages/tasks/tasks" }),
    });
  },
});
