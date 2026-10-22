<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import UniIcons from "@dcloudio/uni-ui/lib/uni-icons/uni-icons.vue";
import PageHeader from "../../components/PageHeader.vue";
import PhotoGrid from "../../components/PhotoGrid.vue";
import SignaturePad from "../../components/SignaturePad.vue";
import {
  checkoutServiceReport,
  getServiceReport,
  getWorkOrder,
  saveDraft,
  saveServiceReport,
  signServiceReport,
  submitServiceReport,
  toId,
  uploadMedia,
  uploadedUrl,
} from "../../utils/api";
import { getSession } from "../../utils/auth";
import { persistLocalFile } from "../../utils/files";
import { readLocalDraft, removeLocalDraft, writeLocalDraft } from "../../utils/localDraft";
import { getPreciseLocation } from "../../utils/location";
import { nowTime, today } from "../../utils/present";
import { ensurePrivacyAuthorized } from "../../utils/privacy";
import { canUseSealing, fieldHome } from "../../utils/roles";
import type {
  PhotoDraft,
  ServiceReport,
  ServiceReportMaterial,
  SignatureRecord,
  WorkOrder,
} from "../../utils/types";

interface ServiceDraft {
  date: string;
  startTime: string;
  endTime: string;
  contact: string;
  servicePerson: string;
  serviceProject: string;
  taskTag: string;
  content: string;
  followUp: string;
  riskFollow: string;
  customerComment: string;
  materials: ServiceReportMaterial[];
  beforePhotos: PhotoDraft[];
  afterPhotos: PhotoDraft[];
  responsibleSignature: string;
  customerSignature: string;
  customerSignatureDepartment: string;
  checkoutPhoto: string;
}

const steps = [
  "服务信息",
  "材料与部位",
  "封堵前照片",
  "封堵后照片",
  "服务记录",
  "双方签字",
  "签出确认",
];
const step = ref(0);
const taskId = ref(0);
const reportId = ref(0);
const task = ref<WorkOrder | null>(null);
const loading = ref(true);
const error = ref("");
const saving = ref(false);
const submitting = ref(false);
const checkoutUploading = ref(false);
const checkoutUploadError = ref("");
const autoSaveState = ref<"local" | "pending" | "saving" | "saved">("local");
const autoSaveText = ref("已保存到本机");
const originalSignatures = ref<Record<string, string>>({});
let autoSaveReady = false;
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
let saveQueued = false;

const form = reactive<ServiceDraft>({
  date: today(),
  startTime: nowTime(),
  endTime: "",
  contact: "",
  servicePerson: "",
  serviceProject: "结构漏洞封堵",
  taskTag: "结构封堵",
  content: "",
  followUp: "",
  riskFollow: "",
  customerComment: "",
  materials: [],
  beforePhotos: [],
  afterPhotos: [],
  responsibleSignature: "",
  customerSignature: "",
  customerSignatureDepartment: "",
  checkoutPhoto: "",
});

const progress = computed(() => Math.round(((step.value + 1) / steps.length) * 100));
const servicePersonName = computed(
  () => getSession()?.name || task.value?.engineer_name || "封堵责任人",
);

function draftKey() {
  return `service-${taskId.value}`;
}

function hydrate(saved: ServiceDraft) {
  form.date = saved.date || form.date;
  form.startTime = saved.startTime || form.startTime;
  form.endTime = saved.endTime || "";
  form.contact = saved.contact || form.contact;
  form.servicePerson = saved.servicePerson || form.servicePerson;
  form.serviceProject = saved.serviceProject || form.serviceProject;
  form.taskTag = saved.taskTag || form.taskTag;
  form.content = saved.content || "";
  form.followUp = saved.followUp || "";
  form.riskFollow = saved.riskFollow || "";
  form.customerComment = saved.customerComment || "";
  form.materials = saved.materials?.length ? saved.materials : form.materials;
  form.beforePhotos = saved.beforePhotos || [];
  form.afterPhotos = saved.afterPhotos || [];
  form.responsibleSignature = saved.responsibleSignature || "";
  form.customerSignature = saved.customerSignature || "";
  form.customerSignatureDepartment =
    saved.customerSignatureDepartment || "";
  form.checkoutPhoto = saved.checkoutPhoto || "";
}

function hydrateReport(report: ServiceReport) {
  form.date = report.service_date || form.date;
  form.startTime = report.start_time || form.startTime;
  form.endTime = report.end_time || "";
  form.contact = report.contact || form.contact;
  form.servicePerson = report.service_person || form.servicePerson;
  form.serviceProject = report.service_project || form.serviceProject;
  form.taskTag = report.task_tag || form.taskTag;
  form.content = report.content || "";
  form.followUp = report.follow_up || "";
  form.riskFollow = report.risk_follow || "";
  form.customerComment = report.customer_comment || "";
  form.materials = (report.materials || []).map((item, index) => ({
    ...item,
    sort_order: item.sort_order ?? index,
  }));
  form.beforePhotos = (report.risk_photos || []).map((photo, index) => ({
    path: photo.url,
    caption: photo.caption || `封堵前 ${index + 1}`,
  }));
  form.afterPhotos = (report.photos || []).map((photo, index) => ({
    path: photo.url,
    caption: photo.caption || `封堵后 ${index + 1}`,
  }));
  const signatures: Record<string, string> = {};
  for (const signature of report.signatures || []) {
    signatures[signature.role] = signature.image_url;
  }
  originalSignatures.value = signatures;
  form.responsibleSignature = signatures.responsible || signatures.service || "";
  form.customerSignature = signatures.customer || "";
  form.customerSignatureDepartment = "";
  form.checkoutPhoto =
    report.checkin?.checkout_photo ||
    report.checkout_photo ||
    "";
}

function addMaterial() {
  form.materials.push({
    name: "",
    qty: 1,
    unit: "kg",
    usage_method: "",
    target: "",
    region: "",
    sort_order: form.materials.length,
  });
}

function removeMaterial(index: number) {
  form.materials.splice(index, 1);
}

function onDateChange(event: { detail: { value: string } }) {
  form.date = event.detail.value;
}

function validateStep() {
  if (step.value === 0 && (!form.date || !form.servicePerson.trim())) {
    uni.showToast({ title: "请填写服务日期和现场人员", icon: "none" });
    return false;
  }
  if (
    step.value === 1 &&
    !form.materials.some((item) => item.name.trim() && Number(item.qty) > 0)
  ) {
    uni.showToast({ title: "请至少登记一项材料", icon: "none" });
    return false;
  }
  if (step.value === 2 && !form.beforePhotos.length) {
    uni.showToast({ title: "请至少拍摄一张封堵前照片", icon: "none" });
    return false;
  }
  if (step.value === 3 && !form.afterPhotos.length) {
    uni.showToast({ title: "请至少拍摄一张封堵后照片", icon: "none" });
    return false;
  }
  if (step.value === 6 && !form.checkoutPhoto) {
    uni.showToast({ title: "请拍摄签出确认照片", icon: "none" });
    return false;
  }
  return true;
}

async function nextStep() {
  if (!validateStep()) return;
  await persistDraft("auto");
  if (step.value < steps.length - 1) step.value += 1;
}

async function previousStep() {
  if (step.value <= 0) return;
  await persistDraft("auto");
  step.value -= 1;
}

function draftData() {
  return {
    task_id: taskId.value,
    report_no: task.value?.report_no || "",
    ...form,
    beforePhotos: form.beforePhotos.map((photo) => ({
      path: photo.path,
      caption: photo.caption || "",
    })),
    afterPhotos: form.afterPhotos.map((photo) => ({
      path: photo.path,
      caption: photo.caption || "",
    })),
  };
}

function currentTimeLabel() {
  const date = new Date();
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`;
}

function clearAutoSaveTimer() {
  if (!autoSaveTimer) return;
  clearTimeout(autoSaveTimer);
  autoSaveTimer = null;
}

async function persistDraft(mode: "manual" | "auto" = "manual") {
  if (saving.value) {
    saveQueued = true;
    return;
  }
  clearAutoSaveTimer();
  saving.value = true;
  writeLocalDraft(draftKey(), draftData());
  autoSaveState.value = "saving";
  autoSaveText.value = "正在保存";
  try {
    await saveDraft("service_report", draftKey(), draftData());
    autoSaveState.value = "saved";
    autoSaveText.value = `已保存 ${currentTimeLabel()}`;
    if (mode === "manual") {
      uni.showToast({ title: "保存成功", icon: "success" });
    }
  } catch {
    autoSaveState.value = "local";
    autoSaveText.value = "已保存到本机，请联网后重试同步";
    if (mode === "manual") {
      uni.showToast({ title: "已保存到本机", icon: "none" });
    }
  } finally {
    saving.value = false;
    if (saveQueued) {
      saveQueued = false;
      void persistDraft("auto");
    }
  }
}

function scheduleAutoSave() {
  if (!autoSaveReady || loading.value || submitting.value) return;
  writeLocalDraft(draftKey(), draftData());
  autoSaveState.value = "pending";
  autoSaveText.value = "等待自动保存";
  clearAutoSaveTimer();
  autoSaveTimer = setTimeout(() => {
    autoSaveTimer = null;
    void persistDraft("auto");
  }, 800);
}

watch(form, scheduleAutoSave, { deep: true, flush: "sync" });

async function uploadPhoto(path: string, caption: string) {
  if (path.startsWith("data:") || path.startsWith("http")) return path;
  const payload = await uploadMedia("/api/service-reports/upload", path, {
    taken_at: new Date().toISOString(),
    location: task.value?.service_address || "",
  });
  const url = uploadedUrl(payload);
  if (!url) throw new Error(`图片上传失败：${caption || "未命名图片"}`);
  return url;
}

async function uploadSignature(path: string) {
  if (path.startsWith("http")) return path;
  const payload = await uploadMedia("/api/service-reports/upload", path, {
    taken_at: new Date().toISOString(),
    location: task.value?.service_address || "",
  });
  const url = uploadedUrl(payload);
  if (!url) throw new Error("签字图片上传失败");
  return url;
}

async function chooseCheckoutPhoto() {
  if (checkoutUploading.value) return;
  try {
    await ensurePrivacyAuthorized();
  } catch (privacyError) {
    uni.showToast({
      title:
        privacyError instanceof Error
          ? privacyError.message
          : "请先同意隐私保护指引后再拍照",
      icon: "none",
    });
    return;
  }
  uni.chooseImage({
    count: 1,
    sizeType: ["compressed"],
    sourceType: ["camera"],
    success: async (result) => {
      const selected = Array.isArray(result.tempFilePaths)
        ? result.tempFilePaths[0]
        : result.tempFilePaths;
      if (!selected) return;
      checkoutUploading.value = true;
      checkoutUploadError.value = "";
      try {
        const savedPath = await persistLocalFile(String(selected));
        try {
          form.checkoutPhoto = await uploadPhoto(
            savedPath,
            "签出确认照片",
          );
        } catch (uploadError) {
          form.checkoutPhoto = savedPath;
          checkoutUploadError.value =
            uploadError instanceof Error
              ? uploadError.message
              : "签出照片暂未上传，提交时会重试";
        }
      } finally {
        checkoutUploading.value = false;
      }
    },
  });
}

function removeCheckoutPhoto() {
  if (checkoutUploading.value) return;
  form.checkoutPhoto = "";
  checkoutUploadError.value = "";
}

async function uploadPhotoGroup(photos: PhotoDraft[], prefix: string) {
  const uploaded = [];
  for (let index = 0; index < photos.length; index += 1) {
    const photo = photos[index];
    uploaded.push({
      url: await uploadPhoto(photo.path, photo.caption || `${prefix} ${index + 1}`),
      caption: photo.caption || `${prefix} ${index + 1}`,
      sort_order: index,
    });
  }
  return uploaded;
}

function reportPayload(
  photos: Array<{ url: string; caption: string; sort_order: number }>,
  riskPhotos: Array<{ url: string; caption: string; sort_order: number }>,
) {
  return {
    customer_id: task.value?.customer_id || 0,
    customer_name: task.value?.customer_name || "",
    address: task.value?.service_address || "",
    contact: form.contact,
    contact_phone: task.value?.contact_phone || "",
    service_project: form.serviceProject,
    task_tag: form.taskTag,
    service_date: form.date,
    start_time: form.startTime,
    end_time: form.endTime,
    service_person: form.servicePerson,
    content: form.content,
    follow_up: form.followUp,
    risk_follow: form.riskFollow,
    customer_comment: form.customerComment,
    status: "draft",
    materials: form.materials.map((item, index) => ({
      name: item.name,
      qty: Number(item.qty) || 0,
      unit: item.unit,
      usage_method: item.usage_method || "",
      target: item.target || "",
      area_size: item.area_size || "",
      region: item.region || "",
      sort_order: index,
    })),
    photos,
    risk_photos: riskPhotos,
  };
}

async function submit() {
  if (submitting.value) return;
  if (!task.value?.customer_id) {
    uni.showToast({ title: "作业单缺少客户ID，请先同步主数据", icon: "none" });
    return;
  }
  if (!form.beforePhotos.length || !form.afterPhotos.length) {
    uni.showToast({ title: "请补齐封堵前后照片", icon: "none" });
    return;
  }
  if (!form.responsibleSignature || !form.customerSignature) {
    uni.showToast({
      title: "请完成双方手写签字",
      icon: "none",
    });
    return;
  }
  if (!form.checkoutPhoto) {
    uni.showToast({ title: "请拍摄签出确认照片", icon: "none" });
    return;
  }
  submitting.value = true;
  clearAutoSaveTimer();
  uni.showLoading({ title: "正在提交记录", mask: true });
  try {
    const riskPhotos = await uploadPhotoGroup(form.beforePhotos, "封堵前");
    const photos = await uploadPhotoGroup(form.afterPhotos, "封堵后");
    const signatures: SignatureRecord[] = [
      {
        role: "service",
        name: servicePersonName.value,
        image_url: await uploadSignature(form.responsibleSignature),
      },
      {
        role: "customer",
        name: form.contact || task.value.contact || "客户代表",
        image_url: await uploadSignature(form.customerSignature),
      },
    ];
    const payload = reportPayload(photos, riskPhotos);
    const saved = await saveServiceReport(reportId.value, payload);
    const activeReportId = reportId.value || toId(saved);
    if (!activeReportId) {
      throw new Error("服务端未返回封堵记录编号");
    }
    for (const signature of signatures) {
      if (originalSignatures.value[signature.role] === signature.image_url) {
        continue;
      }
      await signServiceReport(activeReportId, {
        role: signature.role,
        name: signature.name,
        image_url: signature.image_url,
      });
    }
    const checkoutPhotoUrl = await uploadPhoto(
      form.checkoutPhoto,
      "签出确认照片",
    );
    const checkoutLocation = await getPreciseLocation();
    await checkoutServiceReport(
      activeReportId,
      checkoutLocation.label,
      checkoutPhotoUrl,
    );
    await submitServiceReport(activeReportId);
    removeLocalDraft(draftKey());
    uni.hideLoading();
    uni.showModal({
      title: "封堵提交成功",
      content: "封堵前后照片、签出照片、材料、定位和双方签字已保存。",
      showCancel: false,
      success: () => {
        uni.reLaunch({ url: "/pages/workbench/index" });
      },
    });
  } catch (submitError) {
    uni.hideLoading();
    const message =
      submitError instanceof Error ? submitError.message : "封堵记录提交失败";
    uni.showToast({ title: message, icon: "none", duration: 3000 });
  } finally {
    submitting.value = false;
  }
}

onBeforeUnmount(() => {
  clearAutoSaveTimer();
  if (autoSaveReady && !submitting.value) {
    writeLocalDraft(draftKey(), draftData());
  }
});

onLoad(async (query) => {
  const current = getSession();
  if (!current) {
    uni.reLaunch({ url: "/pages/login/index" });
    return;
  }
  if (!canUseSealing(current.role)) {
    uni.reLaunch({ url: fieldHome(current.role) });
    return;
  }
  taskId.value = Number(query?.taskId || 0);
  reportId.value = Number(query?.reportId || 0);
  step.value = Math.min(
    steps.length - 1,
    Math.max(0, Number(query?.step || 0)),
  );
  if (!taskId.value) {
    error.value = "缺少任务编号";
    loading.value = false;
    return;
  }
  try {
    task.value = await getWorkOrder(taskId.value);
    form.contact = task.value.contact || "";
    form.servicePerson = getSession()?.name || "封堵责任人";
    form.materials = task.value.materials.map((material, index) => ({
      name: material.material_name,
      qty: material.qty || 1,
      unit: material.unit || "个",
      usage_method: "",
      target: "鼠洞封堵",
      region: "",
      sort_order: index,
    }));
    if (!form.materials.length) addMaterial();
    if (reportId.value) {
      hydrateReport(await getServiceReport(reportId.value));
      if (!form.materials.length) addMaterial();
    } else {
      const saved = readLocalDraft<ServiceDraft>(draftKey());
      if (saved) hydrate(saved);
    }
  } catch (loadError) {
    error.value =
      loadError instanceof Error ? loadError.message : "任务加载失败";
  } finally {
    loading.value = false;
    autoSaveReady = true;
  }
});
</script>

<template>
  <view class="service-page">
    <PageHeader
      title="封堵记录"
      :subtitle="task ? `${task.report_no} · ${task.customer_name}` : '结构封堵服务单'"
      kicker="施工记录"
      back
    >
      <view class="step-summary">
        <view class="step-meta">
          <text>第 {{ step + 1 }} 步 / 共 {{ steps.length }} 步</text>
          <text>{{ steps[step] }}</text>
        </view>
        <view class="step-track">
          <view class="step-fill" :style="{ width: `${progress}%` }" />
        </view>
        <view class="auto-save-row" :class="`state-${autoSaveState}`">
          <view class="auto-save-dot" />
          <text>{{ autoSaveText }}</text>
        </view>
      </view>
    </PageHeader>

    <view v-if="loading" class="page-content">
      <view class="empty-state">
        <text class="empty-title">正在加载任务</text>
        <text class="empty-copy">请稍候，正在读取封堵作业单。</text>
      </view>
    </view>

    <view v-else-if="error && !task" class="page-content">
      <view class="empty-state">
        <text class="empty-title">无法开始记录</text>
        <text class="empty-copy">{{ error }}</text>
      </view>
    </view>

    <template v-else-if="task">
      <view class="page-content service-content">
        <view v-if="step === 0" class="step-panel">
          <view class="site-card card">
            <view class="site-topline">
              <text class="site-kicker">服务现场</text>
              <text class="site-code mono">{{ task.report_no }}</text>
            </view>
            <text class="site-name">{{ task.customer_name }}</text>
            <text class="site-address">{{ task.service_address || "地址待补充" }}</text>
            <view class="site-contact">
              <view>
                <text class="contact-label">客户对接人</text>
                <text class="contact-value">{{ task.contact || "—" }}</text>
              </view>
              <view>
                <text class="contact-label">联系电话</text>
                <text class="contact-value">{{ task.contact_phone || "—" }}</text>
              </view>
            </view>
          </view>

          <view class="form-card card">
            <view class="field">
              <text class="field-label">服务日期</text>
              <picker mode="date" :value="form.date" @change="onDateChange">
                <view class="picker-value">
                  <text>{{ form.date }}</text>
                  <UniIcons type="calendar" size="16" color="#65736c" />
                </view>
              </picker>
            </view>
            <view class="form-grid">
              <view class="field compact-field">
                <text class="field-label">开始时间</text>
                <input
                  v-model="form.startTime"
                  class="field-input"
                  placeholder="09:00"
                  placeholder-class="field-placeholder"
                />
              </view>
              <view class="field compact-field">
                <text class="field-label">结束时间</text>
                <input
                  v-model="form.endTime"
                  class="field-input"
                  placeholder="11:30"
                  placeholder-class="field-placeholder"
                />
              </view>
            </view>
            <view class="field">
              <text class="field-label">现场联系人</text>
              <input
                v-model="form.contact"
                class="field-input"
                placeholder="客户现场对接人"
                placeholder-class="field-placeholder"
              />
            </view>
            <view class="field">
              <text class="field-label">服务人员</text>
              <input
                v-model="form.servicePerson"
                class="field-input"
                placeholder="封堵责任人"
                placeholder-class="field-placeholder"
              />
            </view>
            <view class="form-grid">
              <view class="field compact-field">
                <text class="field-label">服务项目</text>
                <input
                  v-model="form.serviceProject"
                  class="field-input"
                  placeholder="结构漏洞封堵"
                  placeholder-class="field-placeholder"
                />
              </view>
              <view class="field compact-field">
                <text class="field-label">任务标签</text>
                <input
                  v-model="form.taskTag"
                  class="field-input"
                  placeholder="结构封堵"
                  placeholder-class="field-placeholder"
                />
              </view>
            </view>
          </view>
        </view>

        <view v-else-if="step === 1" class="step-panel">
          <view class="section-head">
            <view>
              <text class="section-title">封堵部位</text>
              <text class="section-copy">来自作业单的现场点位</text>
            </view>
            <text class="choice-count">{{ task.sites.length }} 个</text>
          </view>
          <view v-if="task.sites.length" class="site-list">
            <view v-for="(site, index) in task.sites" :key="site.id" class="seal-site card">
              <view class="seal-index">{{ String(index + 1).padStart(2, "0") }}</view>
              <view class="seal-copy">
                <text class="seal-name">{{ site.name }}</text>
                <text class="seal-type">{{ site.hole_type || "结构孔洞" }}</text>
              </view>
              <text class="seal-state">已登记</text>
            </view>
          </view>
          <view v-else class="empty-state compact-empty">
            <text class="empty-title">作业单暂无封堵部位</text>
            <text class="empty-copy">请先在管理端补充点位信息。</text>
          </view>

          <view class="section-head material-head">
            <view>
              <text class="section-title">材料明细</text>
              <text class="section-copy">登记本次施工使用的材料与用量</text>
            </view>
            <button class="add-item" @tap="addMaterial">
              <UniIcons type="plus" size="16" color="#176b52" />
              <text>添加</text>
            </button>
          </view>

          <view class="material-list">
            <view
              v-for="(material, index) in form.materials"
              :key="index"
              class="material-item card"
            >
              <view class="material-head">
                <text class="material-title">材料 {{ index + 1 }}</text>
                <view class="remove-item" @tap="removeMaterial(index)">
                  <UniIcons type="trash" size="16" color="#a8443c" />
                </view>
              </view>
              <input
                v-model="material.name"
                class="field-input item-field"
                placeholder="材料名称"
                placeholder-class="field-placeholder"
              />
              <view class="material-qty-row">
                <input
                  v-model.number="material.qty"
                  class="field-input qty-input"
                  type="digit"
                  placeholder="用量"
                  placeholder-class="field-placeholder"
                />
                <input
                  v-model="material.unit"
                  class="field-input unit-input"
                  placeholder="单位"
                  placeholder-class="field-placeholder"
                />
              </view>
              <input
                v-model="material.usage_method"
                class="field-input item-field"
                placeholder="使用方式，例如填充缝隙"
                placeholder-class="field-placeholder"
              />
              <input
                v-model="material.target"
                class="field-input item-field"
                placeholder="使用部位，例如仓储区穿墙孔"
                placeholder-class="field-placeholder"
              />
              <input
                v-model="material.area_size"
                class="field-input item-field"
                placeholder="施工面积，例如 0.3 平方米"
                placeholder-class="field-placeholder"
              />
              <input
                v-model="material.region"
                class="field-input item-field"
                placeholder="使用区域"
                placeholder-class="field-placeholder"
              />
            </view>
          </view>
        </view>

        <view v-else-if="step === 2" class="step-panel">
          <view class="section-head">
            <view>
              <text class="section-title">封堵前照片</text>
              <text class="section-copy">拍摄孔洞、鼠道和周边环境，完成后再进入下一页面</text>
            </view>
          </view>
          <view class="photo-card card">
            <PhotoGrid
              v-model:photos="form.beforePhotos"
              title="封堵前图片"
              hint="每个封堵部位至少保留一张全景照片"
              :max="100"
              :upload="uploadPhoto"
            />
          </view>
        </view>

        <view v-else-if="step === 3" class="step-panel">
          <view class="section-head">
            <view>
              <text class="section-title">封堵后照片</text>
              <text class="section-copy">请在同一位置拍摄，清楚记录封堵边缘和完成状态</text>
            </view>
          </view>
          <view class="photo-card card">
            <PhotoGrid
              v-model:photos="form.afterPhotos"
              title="封堵后图片"
              hint="完成后检查照片是否清晰、完整"
              :max="100"
              :upload="uploadPhoto"
            />
          </view>
          <view class="hint-card">
            <text class="hint-title">影像要求</text>
            <text class="hint-copy">
              封堵前后照片仅用于封堵服务单，勘测单只保留结构风险图片。
            </text>
          </view>
        </view>

        <view v-else-if="step === 4" class="step-panel">
          <view class="section-head">
            <view>
              <text class="section-title">服务记录</text>
              <text class="section-copy">补充施工内容、后续建议和客户意见</text>
            </view>
          </view>
          <view class="form-card card">
            <view class="field">
              <text class="field-label">服务内容</text>
              <textarea
                v-model="form.content"
                class="field-textarea"
                placeholder="填写本次封堵施工内容"
                placeholder-class="field-placeholder"
              />
            </view>
            <view class="field">
              <text class="field-label">后续跟进</text>
              <textarea
                v-model="form.followUp"
                class="field-textarea short-textarea"
                placeholder="填写复检安排或后续服务建议"
                placeholder-class="field-placeholder"
              />
            </view>
            <view class="field">
              <text class="field-label">风险跟进</text>
              <textarea
                v-model="form.riskFollow"
                class="field-textarea short-textarea"
                placeholder="填写仍需关注的风险"
                placeholder-class="field-placeholder"
              />
            </view>
            <view class="field">
              <text class="field-label">客户意见</text>
              <textarea
                v-model="form.customerComment"
                class="field-textarea short-textarea"
                placeholder="填写客户现场意见"
                placeholder-class="field-placeholder"
              />
            </view>
          </view>
        </view>

        <view v-else-if="step === 5" class="step-panel">
          <view class="submit-summary card">
            <text class="summary-title">提交前确认</text>
            <view class="summary-grid">
              <view class="summary-item">
                <text class="summary-label">封堵部位</text>
                <text class="summary-value">{{ task.sites.length }} 个</text>
              </view>
              <view class="summary-item">
                <text class="summary-label">材料</text>
                <text class="summary-value">{{ form.materials.length }} 项</text>
              </view>
              <view class="summary-item">
                <text class="summary-label">封堵前</text>
                <text class="summary-value">{{ form.beforePhotos.length }} 张</text>
              </view>
              <view class="summary-item">
                <text class="summary-label">封堵后</text>
                <text class="summary-value">{{ form.afterPhotos.length }} 张</text>
              </view>
            </view>
          </view>

          <view class="signature-note">
            <text class="signature-note-title">双方分别进入全屏签字页</text>
            <text class="signature-note-copy">
              进入后直接手写，完成时生成带姓名、时间和客户部门的报告签字图。
            </text>
          </view>

          <SignaturePad
            v-model:value="form.responsibleSignature"
            :upload="uploadSignature"
            title="封堵责任人签字"
            role="employee"
            :signer="`${servicePersonName} · 封堵责任人`"
            hint="进入独立横屏签字页，可直接手写"
          />
          <view class="signature-gap" />
          <SignaturePad
            v-model:value="form.customerSignature"
            v-model:department="form.customerSignatureDepartment"
            :upload="uploadSignature"
            title="客户代表签字"
            role="customer"
            :signer="`${form.contact || task.contact || '客户代表'} · 客户代表`"
            hint="客户签字需补充签字部门，结果自动进入报告"
          />
        </view>

        <view v-else class="step-panel">
          <view class="section-head">
            <view>
              <text class="section-title">签出拍照确认</text>
              <text class="section-copy">离开门店前拍摄现场照片，并重新确认当前位置</text>
            </view>
          </view>
          <view class="report-completeness card">
            <text class="report-completeness-title">提交后生成完整封堵报告</text>
            <text class="report-completeness-copy">
              包含服务信息、封堵部位、材料与用量、封堵前照片、封堵后照片、服务记录、客户意见、双方签字、到场签到、签出时间和签出照片。
            </text>
          </view>
          <view class="checkout-card card">
            <view class="checkout-copy">
              <view class="checkout-icon">
                <UniIcons type="camera-filled" size="24" color="#176b52" />
              </view>
              <view>
                <text class="checkout-title">
                  {{ form.checkoutPhoto ? "签出照片已准备" : "请拍摄签出照片" }}
                </text>
                <text class="checkout-hint">
                  照片用于确认施工人员已完成现场作业并离开门店。
                </text>
              </view>
            </view>

            <view v-if="form.checkoutPhoto" class="checkout-preview">
              <image
                class="checkout-image"
                :src="form.checkoutPhoto"
                mode="aspectFill"
              />
              <view class="checkout-preview-actions">
                <button
                  class="checkout-secondary"
                  :disabled="checkoutUploading"
                  @tap="chooseCheckoutPhoto"
                >
                  重新拍照
                </button>
                <button
                  class="checkout-remove"
                  :disabled="checkoutUploading"
                  @tap="removeCheckoutPhoto"
                >
                  删除
                </button>
              </view>
            </view>

            <button
              v-else
              class="checkout-camera"
              :disabled="checkoutUploading"
              @tap="chooseCheckoutPhoto"
            >
              <UniIcons type="camera-filled" size="22" color="#ffffff" />
              <text>{{ checkoutUploading ? "正在上传" : "打开相机拍照" }}</text>
            </button>

            <text v-if="checkoutUploadError" class="error-copy">
              {{ checkoutUploadError }}
            </text>
          </view>

          <view class="checkout-location card">
            <UniIcons type="location-filled" size="20" color="#176b52" />
            <view>
              <text class="checkout-location-title">提交时获取签出定位</text>
              <text class="checkout-location-copy">
                签出时间和定位将写入封堵服务单，无法获取定位时不会提交。
              </text>
            </view>
          </view>
        </view>
      </view>

      <view class="bottom-actions safe-bottom">
        <view class="bottom-secondary-stack">
          <button
            class="bottom-secondary"
            :disabled="step === 0"
            @tap="previousStep"
          >
            上一步
          </button>
          <button class="bottom-secondary" :disabled="saving" @tap="persistDraft">
            {{ saving ? "保存中" : "保存草稿" }}
          </button>
        </view>
        <button
          v-if="step < steps.length - 1"
          class="btn-primary bottom-primary"
          @tap="nextStep"
        >
          下一步
        </button>
        <button
          v-else
          class="btn-primary bottom-primary"
          :disabled="submitting"
          @tap="submit"
        >
          {{ submitting ? "提交中" : "提交记录" }}
        </button>
      </view>
    </template>
  </view>
</template>

<style scoped>
.service-page {
  min-height: 100vh;
  padding-bottom: calc(138rpx + env(safe-area-inset-bottom));
  background: #f2f6f3;
}

.step-summary {
  margin-top: 24rpx;
}

.step-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
  margin-bottom: 10rpx;
  color: #b8d8c8;
  font-size: 21rpx;
}

.service-content {
  padding-top: 24rpx;
}

.step-panel {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.site-card,
.form-card,
.photo-card,
.submit-summary {
  padding: 22rpx;
}

.site-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.site-kicker {
  color: #176b52;
  font-size: 20rpx;
  font-weight: 700;
  letter-spacing: 1rpx;
}

.site-code {
  color: #65736c;
  font-size: 20rpx;
}

.site-name {
  display: block;
  margin-top: 12rpx;
  font-size: 34rpx;
  font-weight: 700;
}

.site-address {
  display: block;
  margin-top: 8rpx;
  color: #65736c;
  font-size: 23rpx;
  line-height: 1.5;
}

.site-contact {
  display: flex;
  gap: 48rpx;
  margin-top: 18rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #e5ece7;
}

.contact-label,
.contact-value {
  display: block;
}

.contact-label {
  color: #79867f;
  font-size: 20rpx;
}

.contact-value {
  margin-top: 3rpx;
  font-size: 24rpx;
  font-weight: 600;
}

.form-grid {
  display: flex;
  gap: 16rpx;
}

.compact-field {
  flex: 1;
  min-width: 0;
}

.picker-value {
  height: 84rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8rpx;
  padding: 0 18rpx;
  border: 1rpx solid #d7e2da;
  border-radius: 16rpx;
  background: #ffffff;
  color: #17211d;
  font-size: 25rpx;
}

.choice-count {
  color: #176b52;
  font-size: 22rpx;
  font-weight: 600;
}

.site-list,
.material-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.seal-site {
  display: flex;
  align-items: center;
  gap: 14rpx;
  padding: 18rpx;
}

.seal-index {
  width: 44rpx;
  height: 44rpx;
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  border-radius: 10rpx;
  background: #e6f2ec;
  color: #176b52;
  font-family: "SFMono-Regular", "Cascadia Code", monospace;
  font-size: 18rpx;
  font-weight: 700;
}

.seal-copy {
  flex: 1;
  min-width: 0;
}

.seal-name,
.seal-type {
  display: block;
}

.seal-name {
  font-size: 26rpx;
  font-weight: 600;
}

.seal-type {
  margin-top: 3rpx;
  color: #65736c;
  font-size: 21rpx;
}

.seal-state {
  flex: none;
  color: #3f7452;
  font-size: 21rpx;
}

.compact-empty {
  padding: 32rpx 20rpx;
}

.material-head {
  margin-top: 6rpx;
}

.add-item {
  min-height: 58rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  padding: 0 16rpx;
  border: 1rpx solid #cbdace;
  border-radius: 12rpx;
  background: #f0f7f3;
  color: #176b52;
  font-size: 22rpx;
  font-weight: 600;
}

.material-item {
  padding: 20rpx;
}

.material-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.material-title {
  font-size: 25rpx;
  font-weight: 700;
}

.remove-item {
  width: 44rpx;
  height: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.item-field {
  margin-top: 12rpx;
}

.material-qty-row {
  display: flex;
  gap: 12rpx;
  margin-top: 12rpx;
}

.qty-input {
  flex: 1;
}

.unit-input {
  width: 160rpx;
}

.short-textarea {
  min-height: 130rpx;
}

.hint-card {
  padding: 18rpx 20rpx;
  border: 1rpx solid #d8e9df;
  border-radius: 16rpx;
  background: #e8f3ec;
}

.hint-title,
.hint-copy {
  display: block;
}

.hint-title {
  color: #115640;
  font-size: 23rpx;
  font-weight: 700;
}

.hint-copy {
  margin-top: 5rpx;
  color: #50635a;
  font-size: 21rpx;
  line-height: 1.55;
}

.summary-title {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
}

.summary-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 16rpx;
}

.summary-item {
  width: calc(50% - 6rpx);
  padding: 14rpx 16rpx;
  border-radius: 12rpx;
  background: #f5f9f6;
}

.summary-label,
.summary-value {
  display: block;
}

.summary-label {
  color: #65736c;
  font-size: 20rpx;
}

.summary-value {
  margin-top: 3rpx;
  font-size: 25rpx;
  font-weight: 700;
}

.signature-note {
  padding: 18rpx 20rpx;
  border-radius: 16rpx;
  background: #fbf0de;
}

.signature-note-title,
.signature-note-copy {
  display: block;
}

.signature-note-title {
  color: #8a5c20;
  font-size: 23rpx;
  font-weight: 700;
}

.signature-note-copy {
  margin-top: 5rpx;
  color: #8a5c20;
  font-size: 21rpx;
  line-height: 1.55;
}

.signature-gap {
  height: 2rpx;
}

.bottom-actions {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 30;
  display: flex;
  gap: 10rpx;
  padding: 16rpx 24rpx;
  border-top: 1rpx solid #dde7e0;
  background: rgba(245, 248, 244, 0.98);
}

.action-button {
  flex: 1;
  min-height: 78rpx;
}

.draft-button {
  min-width: 118rpx;
  min-height: 78rpx;
  padding: 0 16rpx;
  border: 1rpx solid #cbdace;
  border-radius: 16rpx;
  background: #ffffff;
  color: #176b52;
  font-size: 23rpx;
  font-weight: 600;
}

/* Unified field-console visual system */
.service-page {
  padding-bottom: calc(148rpx + env(safe-area-inset-bottom));
  background: #f2f6f3;
}

.step-summary {
  margin-top: 20rpx;
}

.step-meta {
  margin-bottom: 9rpx;
  color: #65736c;
  font-size: 19rpx;
}

.step-meta text:last-child {
  color: #176b52;
  font-weight: 700;
}

.service-content {
  padding-top: 20rpx;
}

.step-panel {
  gap: 16rpx;
}

.site-card,
.form-card,
.photo-card,
.submit-summary {
  padding: 24rpx;
}

.site-kicker {
  color: #176b52;
  font-size: 19rpx;
  letter-spacing: 0;
}

.site-code {
  color: #79867f;
  font-size: 19rpx;
}

.site-name {
  margin-top: 10rpx;
  color: #17211d;
  font-size: 30rpx;
}

.site-address {
  margin-top: 6rpx;
  color: #65736c;
  font-size: 22rpx;
}

.site-contact {
  margin-top: 16rpx;
  padding-top: 14rpx;
  border-top-color: #e5ece7;
}

.contact-label {
  color: #79867f;
  font-size: 19rpx;
}

.contact-value {
  color: #24352e;
  font-size: 22rpx;
}

.form-grid {
  gap: 12rpx;
}

.picker-value {
  height: 88rpx;
  padding: 0 18rpx;
  border-color: #d7e2da;
  border-radius: 12rpx;
  color: #24352e;
  font-size: 23rpx;
}

.choice-count {
  color: #176b52;
  font-size: 20rpx;
}

.site-list,
.material-list {
  gap: 10rpx;
}

.seal-site {
  padding: 18rpx 20rpx;
}

.seal-index {
  background: #e6f2ec;
  color: #176b52;
}

.seal-name {
  color: #24352e;
  font-size: 24rpx;
}

.seal-type {
  color: #79867f;
  font-size: 20rpx;
}

.seal-state {
  color: #2f7656;
  font-size: 19rpx;
}

.add-item {
  min-height: 56rpx;
  padding: 0 14rpx;
  border-color: #cbdace;
  border-radius: 9rpx;
  background: #f0f7f3;
  color: #176b52;
  font-size: 20rpx;
}

.material-item {
  padding: 22rpx;
}

.material-title {
  color: #24352e;
  font-size: 24rpx;
}

.hint-card {
  border-color: #d8e9df;
  background: #f0f7f3;
}

.hint-title {
  color: #115640;
  font-size: 22rpx;
}

.hint-copy {
  color: #50635a;
  font-size: 20rpx;
}

.summary-title {
  color: #17211d;
  font-size: 26rpx;
}

.summary-item {
  background: #f7f9f6;
}

.summary-label {
  color: #79867f;
  font-size: 19rpx;
}

.summary-value {
  color: #24352e;
  font-size: 24rpx;
}

.signature-note {
  border: 1rpx solid #eddfc6;
  background: #fbf6eb;
}

.signature-note-title,
.signature-note-copy {
  color: #805827;
}

.bottom-actions {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.7fr);
  gap: 12rpx;
  padding: 14rpx 28rpx calc(14rpx + env(safe-area-inset-bottom));
  border-top-color: #dce5df;
  background: #ffffff;
  box-shadow: 0 -10rpx 32rpx rgba(18, 34, 27, 0.07);
}

.bottom-secondary-stack {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.bottom-secondary {
  width: 100%;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1rpx solid #d5e0d7;
  border-radius: 9rpx;
  background: #ffffff;
  color: #176b52;
  font-size: max(12px, 20rpx);
  font-weight: 600;
  line-height: 1;
}

.bottom-secondary[disabled] {
  color: #a8b2ac;
  opacity: 0.7;
}

.bottom-primary {
  width: 100%;
  min-height: 96px;
  font-size: max(14px, 26rpx);
}

.service-page {
  padding-bottom: calc(170rpx + env(safe-area-inset-bottom));
  background: #f3f6f4;
}

.service-content {
  padding: 24rpx 32rpx;
}

.step-panel {
  gap: 24rpx;
}

.step-summary {
  margin-top: 22rpx;
}

.step-meta {
  color: #65736c;
  font-size: 23rpx;
}

.step-meta text:last-child {
  color: #176b52;
  font-size: 25rpx;
}

.site-card,
.form-card,
.photo-card,
.submit-summary {
  padding: 28rpx;
}

.section-head {
  margin-bottom: 0;
}

.photo-card + .hint-card {
  margin-top: 0;
}

.signature-note {
  padding: 22rpx 24rpx;
  border-color: #eadcc4;
  border-radius: 12rpx;
}

.step-meta {
  font-size: max(12px, 20rpx);
}

.site-name {
  font-size: max(16px, 27rpx);
}

.site-address,
.contact-value,
.hint-copy,
.signature-note-copy {
  font-size: max(13px, 21rpx);
}

.contact-label,
.choice-count,
.signature-note-title {
  font-size: max(12px, 18rpx);
}

.checkout-card {
  padding: 26rpx;
}

.report-completeness {
  padding: 22rpx 24rpx;
  border-color: #d5e5db;
  background: #f5faf7;
}

.report-completeness-title,
.report-completeness-copy {
  display: block;
}

.report-completeness-title {
  color: #176b52;
  font-size: max(14px, 24rpx);
  font-weight: 700;
}

.report-completeness-copy {
  margin-top: 6rpx;
  color: #53635a;
  font-size: max(12px, 20rpx);
  line-height: 1.6;
}

.checkout-copy {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
}

.checkout-icon {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  border-radius: 12rpx;
  background: #e8f2ed;
}

.checkout-title,
.checkout-hint {
  display: block;
}

.checkout-title {
  color: #24352e;
  font-size: max(15px, 28rpx);
  font-weight: 700;
}

.checkout-hint {
  margin-top: 6rpx;
  color: #65736c;
  font-size: max(12px, 20rpx);
  line-height: 1.55;
}

.checkout-camera {
  width: 100%;
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  margin-top: 24rpx;
  border-radius: 9rpx;
  background: #145a3a;
  color: #ffffff;
  font-size: max(14px, 26rpx);
  font-weight: 700;
}

.checkout-camera[disabled] {
  opacity: 0.55;
}

.checkout-preview {
  margin-top: 22rpx;
}

.checkout-image {
  width: 100%;
  height: 280rpx;
  display: block;
  border-radius: 10rpx;
  background: #eef3ef;
}

.checkout-preview-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12rpx;
  margin-top: 12rpx;
}

.checkout-secondary,
.checkout-remove {
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1rpx solid #d5e0d7;
  border-radius: 9rpx;
  background: #ffffff;
  color: #176b52;
  font-size: max(13px, 22rpx);
  font-weight: 600;
}

.checkout-remove {
  border-color: #ead2ce;
  color: #a33e37;
}

.checkout-location {
  display: flex;
  align-items: flex-start;
  gap: 14rpx;
  padding: 20rpx 22rpx;
}

.checkout-location-title,
.checkout-location-copy {
  display: block;
}

.checkout-location-title {
  color: #24352e;
  font-size: max(14px, 24rpx);
  font-weight: 700;
}

.checkout-location-copy {
  margin-top: 5rpx;
  color: #65736c;
  font-size: max(12px, 20rpx);
  line-height: 1.55;
}

.picker-value,
.seal-index,
.checkout-icon {
  border-radius: 999px;
}

.hint-card,
.signature-note,
.report-completeness,
.checkout-image {
  border-radius: 18rpx;
}

.summary-item {
  border-radius: 16rpx;
}

.auto-save-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7rpx;
  margin-top: 10rpx;
  color: #607067;
  font-size: max(11px, 18rpx);
}

.auto-save-dot {
  width: 8rpx;
  height: 8rpx;
  border-radius: 50%;
  background: #8fa198;
}

.auto-save-row.state-saving .auto-save-dot,
.auto-save-row.state-pending .auto-save-dot {
  background: #b78432;
}

.auto-save-row.state-saved .auto-save-dot {
  background: #2f7656;
}
</style>
