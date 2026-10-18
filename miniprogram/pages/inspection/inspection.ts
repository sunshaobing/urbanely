import { scopeOptions, sites, structureOptions, tasks, technician, treatmentTemplates } from "../../data/mock";
import { clearDraft, enqueue, getDraft, getSession, saveDraft } from "../../utils/storage";
import type { InspectionDraft, Site } from "../../utils/types";

const steps = ["现场信息", "结构检查", "结构风险图片", "治理建议", "双方签字", "提交"];

function createInspectionDraft(taskId: string, site: Site): InspectionDraft {
  return {
    taskId,
    site,
    date: "2026-10-11",
    time: "22:20-23:00",
    scope: ["仓储区", "营业区域"],
    structure: ["全员无吊顶", "管线穿墙缝隙"],
    riskPhotos: [],
    treatmentPlan: "",
    surveyorSignature: "",
    customerSignature: "",
    updatedAt: "",
  };
}

Page({
  data: {
    steps,
    step: 0,
    progress: 17,
    taskId: "task-1",
    taskNo: tasks[0].documentNo,
    surveyorName: technician.name,
    draft: createInspectionDraft("task-1", sites[0]),
    scopeItems: [] as Array<{ label: string; active: boolean }>,
    structureItems: [] as Array<{ label: string; active: boolean }>,
    templates: treatmentTemplates,
  },
  onLoad(options: any) {
    const taskId = options.taskId || "task-1";
    const session = getSession();
    if (!session) {
      wx.reLaunch({ url: "/pages/login/login" });
      return;
    }
    const task = tasks.find((item) => item.id === taskId) || tasks[0];
    const site = sites.find((item) => item.id === task.siteId) || sites[0];
    const saved = getDraft<InspectionDraft>(`inspection:${taskId}`);
    const draft = saved || createInspectionDraft(taskId, site);
    this.setData({
      taskId,
      taskNo: task.documentNo,
      surveyorName: session?.name || technician.name,
      draft,
      scopeItems: scopeOptions.map((label) => ({ label, active: draft.scope.includes(label) })),
      structureItems: structureOptions.map((label) => ({ label, active: draft.structure.includes(label) })),
    });
  },
  updateProgress(step: number) {
    this.setData({ step, progress: Math.round(((step + 1) / steps.length) * 100) });
  },
  toggleScope(event: any) {
    const label = event.currentTarget.dataset.value;
    const scope = this.data.draft.scope.includes(label)
      ? this.data.draft.scope.filter((item: string) => item !== label)
      : [...this.data.draft.scope, label];
    this.setData({
      "draft.scope": scope,
      scopeItems: this.data.scopeItems.map((item: any) => ({ ...item, active: scope.includes(item.label) })),
    });
  },
  toggleStructure(event: any) {
    const label = event.currentTarget.dataset.value;
    const structure = this.data.draft.structure.includes(label)
      ? this.data.draft.structure.filter((item: string) => item !== label)
      : [...this.data.draft.structure, label];
    this.setData({
      "draft.structure": structure,
      structureItems: this.data.structureItems.map((item: any) => ({ ...item, active: structure.includes(item.label) })),
    });
  },
  onPhotosChange(event: any) {
    this.setData({ "draft.riskPhotos": event.detail.photos });
  },
  onDateChange(event: any) {
    this.setData({ "draft.date": event.detail.value });
  },
  onTimeInput(event: any) {
    this.setData({ "draft.time": event.detail.value });
  },
  onPlanInput(event: any) {
    this.setData({ "draft.treatmentPlan": event.detail.value });
  },
  insertTemplate(event: any) {
    const template = event.currentTarget.dataset.value;
    const current = this.data.draft.treatmentPlan;
    this.setData({ "draft.treatmentPlan": `${current}${current ? "\n" : ""}${template}：按现场标准执行。` });
  },
  onSurveyorSigned(event: any) {
    this.setData({ "draft.surveyorSignature": event.detail.path });
  },
  onCustomerSigned(event: any) {
    this.setData({ "draft.customerSignature": event.detail.path });
  },
  prev() {
    if (this.data.step > 0) this.updateProgress(this.data.step - 1);
  },
  next() {
    const { step, draft } = this.data;
    if (step === 0 && draft.scope.length === 0) {
      wx.showToast({ title: "请选择至少一个勘测范围", icon: "none" });
      return;
    }
    if (step === 2 && draft.riskPhotos.length === 0) {
      wx.showToast({ title: "请至少上传一张结构风险图片", icon: "none" });
      return;
    }
    if (step === 4 && (!draft.surveyorSignature || !draft.customerSignature)) {
      wx.showToast({ title: "请完成双方手写签字", icon: "none" });
      return;
    }
    if (step < steps.length - 1) this.updateProgress(step + 1);
  },
  persistDraft() {
    saveDraft(`inspection:${this.data.taskId}`, {
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
    if (draft.riskPhotos.length === 0 || !draft.surveyorSignature || !draft.customerSignature) {
      wx.showToast({ title: "照片或签字尚未完成", icon: "none" });
      return;
    }
    this.persistDraft();
    enqueue({
      id: `inspection-${taskId}-${Date.now()}`,
      type: "inspection",
      label: `${draft.site.name} 现场勘测`,
      payload: { ...draft, updatedAt: new Date().toISOString() },
      createdAt: new Date().toISOString(),
    });
    clearDraft(`inspection:${taskId}`);
    wx.showToast({ title: "已保存到本机，联网后同步", icon: "success", duration: 1800 });
    setTimeout(() => wx.reLaunch({ url: "/pages/tasks/tasks" }), 900);
  },
  goBack() {
    wx.navigateBack({
      delta: 1,
      fail: () => wx.reLaunch({ url: "/pages/tasks/tasks" }),
    });
  },
  voiceNote() {
    wx.showToast({ title: "语音补充功能即将开放", icon: "none" });
  },
});
