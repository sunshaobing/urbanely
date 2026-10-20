<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import UniIcons from "@dcloudio/uni-ui/lib/uni-icons/uni-icons.vue";
import PageHeader from "../../components/PageHeader.vue";
import PhotoGrid from "../../components/PhotoGrid.vue";
import SignaturePad from "../../components/SignaturePad.vue";
import {
  getQuickPhrases,
  getRiskSurvey,
  getWorkOrder,
  listQuickPhrases,
  saveDraft,
  saveRiskSurvey,
  submitRiskSurvey,
  toId,
  uploadMedia,
  uploadedUrl,
} from "../../utils/api";
import { getSession } from "../../utils/auth";
import { readLocalDraft, removeLocalDraft, writeLocalDraft } from "../../utils/localDraft";
import { openReportPath, prepareReportPdf } from "../../utils/pdf";
import { canUseSurvey, fieldHome } from "../../utils/roles";
import {
  nowTime,
  pestEvidenceOptions,
  structureOptions,
  surveyScopeOptions,
  today,
} from "../../utils/present";
import type {
  PhotoDraft,
  QuickPhrase,
  RiskSurvey,
  RiskSurveyItem,
  SignatureRecord,
  WorkOrder,
} from "../../utils/types";

interface RiskDraft {
  date: string;
  time: string;
  contact: string;
  scope: string[];
  structure: string[];
  evidence: string[];
  riskLevel: string;
  reviewDate: string;
  conclusion: string;
  items: RiskSurveyItem[];
  comprehensivePlan: string;
  disinfectionPlan: string;
  environmentSuggestions: string;
  preventionMeasures: string;
  photos: PhotoDraft[];
  surveyorSignature: string;
  customerSignature: string;
}

const steps = ["现场信息", "风险点", "影像证据", "治理方案", "签字提交"];
const step = ref(0);
const taskId = ref(0);
const surveyId = ref(0);
const surveyStatus = ref("draft");
const task = ref<WorkOrder | null>(null);
const loading = ref(true);
const error = ref("");
const saving = ref(false);
const submitting = ref(false);
const quickPhrases = ref<QuickPhrase[]>([]);

const form = reactive<RiskDraft>({
  date: today(),
  time: nowTime(),
  contact: "",
  scope: [],
  structure: [],
  evidence: [],
  riskLevel: "中",
  reviewDate: "",
  conclusion: "",
  items: [{ location: "", description: "", suggestion: "" }],
  comprehensivePlan: "",
  disinfectionPlan: "",
  environmentSuggestions: "",
  preventionMeasures: "",
  photos: [],
  surveyorSignature: "",
  customerSignature: "",
});

const progress = computed(() => Math.round(((step.value + 1) / steps.length) * 100));
const surveyorName = computed(
  () => getSession()?.name || task.value?.engineer_name || "勘测人员",
);

function draftKey() {
  return `risk-${taskId.value}`;
}

function hydrate(saved: RiskDraft) {
  form.date = saved.date || form.date;
  form.time = saved.time || form.time;
  form.contact = saved.contact || form.contact;
  form.scope = saved.scope || [];
  form.structure = saved.structure || [];
  form.evidence = saved.evidence || [];
  form.riskLevel = saved.riskLevel || "中";
  form.reviewDate = saved.reviewDate || "";
  form.conclusion = saved.conclusion || "";
  form.items = saved.items?.length
    ? saved.items
    : [{ location: "", description: "", suggestion: "" }];
  form.comprehensivePlan = saved.comprehensivePlan || "";
  form.disinfectionPlan = saved.disinfectionPlan || "";
  form.environmentSuggestions = saved.environmentSuggestions || "";
  form.preventionMeasures = saved.preventionMeasures || "";
  form.photos = saved.photos || [];
  form.surveyorSignature = saved.surveyorSignature || "";
  form.customerSignature = saved.customerSignature || "";
}

function hydrateSurvey(survey: RiskSurvey) {
  form.date = survey.survey_date || form.date;
  form.time = survey.survey_time || form.time;
  form.contact = survey.contact_person || form.contact;
  form.scope = survey.survey_range || [];
  form.structure = survey.structure_conditions || [];
  form.evidence = survey.pest_evidence || [];
  form.riskLevel = survey.risk_level || "中";
  form.reviewDate = survey.review_date || "";
  form.conclusion = survey.conclusion || "";
  form.items = survey.items?.length
    ? survey.items
    : [{ location: "", description: "", suggestion: "" }];
  form.comprehensivePlan = survey.comprehensive_plan || "";
  form.disinfectionPlan = survey.disinfection_plan || "";
  form.environmentSuggestions = survey.environment_suggestions || "";
  form.preventionMeasures = survey.prevention_measures || "";
  form.photos = (survey.photos || []).map((photo, index) => ({
    path: photo.url,
    caption: photo.caption || `现场照片 ${index + 1}`,
  }));
  form.surveyorSignature =
    survey.signatures?.find((signature) => signature.role === "engineer")
      ?.image_url || "";
  form.customerSignature =
    survey.signatures?.find((signature) => signature.role === "customer")
      ?.image_url || "";
  surveyStatus.value = survey.status || "draft";
}

function toggleValue(
  field: "scope" | "structure" | "evidence",
  value: string,
) {
  const list = form[field];
  form[field] = list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

function addItem() {
  form.items.push({ location: "", description: "", suggestion: "" });
}

function removeItem(index: number) {
  if (form.items.length === 1) {
    form.items[0] = { location: "", description: "", suggestion: "" };
    return;
  }
  form.items.splice(index, 1);
}

function insertPhrase(content: string) {
  form.comprehensivePlan = form.comprehensivePlan
    ? `${form.comprehensivePlan}\n${content}`
    : content;
}

function onDateChange(event: { detail: { value: string } }) {
  form.date = event.detail.value;
}

function onReviewDateChange(event: { detail: { value: string } }) {
  form.reviewDate = event.detail.value;
}

function validateStep() {
  if (step.value === 0 && !form.scope.length) {
    uni.showToast({ title: "请选择至少一个勘测范围", icon: "none" });
    return false;
  }
  if (
    step.value === 1 &&
    !form.items.some((item) => item.location.trim() || item.description.trim())
  ) {
    uni.showToast({ title: "请至少填写一个风险点", icon: "none" });
    return false;
  }
  if (step.value === 2 && !form.photos.length) {
    uni.showToast({ title: "请至少添加一张结构风险图片", icon: "none" });
    return false;
  }
  return true;
}

function nextStep() {
  if (!validateStep()) return;
  if (step.value < steps.length - 1) {
    step.value += 1;
  }
}

function previousStep() {
  if (step.value > 0) step.value -= 1;
}

function draftData() {
  return {
    task_id: taskId.value,
    report_no: task.value?.report_no || "",
    ...form,
    photos: form.photos.map((photo) => ({
      path: photo.path,
      caption: photo.caption || "",
    })),
  };
}

async function persistDraft() {
  if (saving.value) return;
  saving.value = true;
  writeLocalDraft(draftKey(), draftData());
  try {
    await saveDraft("risk_survey", draftKey(), draftData());
    uni.showToast({ title: "草稿已保存", icon: "success" });
  } catch {
    uni.showToast({ title: "已保存到本机", icon: "none" });
  } finally {
    saving.value = false;
  }
}

async function uploadPhoto(path: string, caption: string) {
  if (path.startsWith("data:") || path.startsWith("http")) return path;
  const payload = await uploadMedia("/api/risk-surveys/upload", path, {
    taken_at: new Date().toISOString(),
    location: task.value?.service_address || "",
  });
  const url = uploadedUrl(payload);
  if (!url) throw new Error(`图片上传失败：${caption || "未命名图片"}`);
  return url;
}

async function uploadSignature(path: string) {
  if (path.startsWith("data:") || path.startsWith("http")) return path;
  const payload = await uploadMedia("/api/risk-surveys/upload", path, {
    taken_at: new Date().toISOString(),
    location: task.value?.service_address || "",
  });
  const url = uploadedUrl(payload);
  if (!url) throw new Error("签字图片上传失败");
  return url;
}

function surveyPayload(
  photos: Array<{ url: string; caption: string; sort_order: number }>,
  signatures: SignatureRecord[],
) {
  return {
    code: task.value?.report_no || "",
    customer_id: task.value?.customer_id || 0,
    site_id: null,
    employee_id: task.value?.engineer_id || null,
    survey_date: form.date,
    survey_time: form.time,
    contact_person: form.contact,
    survey_range: form.scope,
    structure_conditions: form.structure,
    pest_evidence: form.evidence,
    comprehensive_plan: form.comprehensivePlan,
    disinfection_plan: form.disinfectionPlan,
    environment_suggestions: form.environmentSuggestions,
    prevention_measures: form.preventionMeasures,
    review_date: form.reviewDate,
    pest_type: "鼠",
    risk_level: form.riskLevel,
    conclusion: form.conclusion,
    status: surveyStatus.value,
    items: form.items.map((item, index) => ({
      location: item.location,
      description: item.description,
      suggestion: item.suggestion,
      sort_order: index,
    })),
    photos,
    signatures,
  };
}

async function submit() {
  if (submitting.value) return;
  if (!task.value?.customer_id) {
    uni.showToast({ title: "作业单缺少客户ID，请先同步主数据", icon: "none" });
    return;
  }
  if (!form.photos.length) {
    uni.showToast({ title: "请先上传结构风险图片", icon: "none" });
    return;
  }
  if (!form.surveyorSignature || !form.customerSignature) {
    uni.showToast({ title: "请完成双方手写签字", icon: "none" });
    return;
  }
  submitting.value = true;
  uni.showLoading({ title: "正在提交勘测", mask: true });
  try {
    const photos = [];
    for (let index = 0; index < form.photos.length; index += 1) {
      const photo = form.photos[index];
      photos.push({
        url: await uploadPhoto(photo.path, photo.caption || ""),
        caption: photo.caption || "",
        sort_order: index,
      });
    }
    const signatures: SignatureRecord[] = [
      {
        role: "engineer",
        name: surveyorName.value,
        image_url: await uploadSignature(form.surveyorSignature),
      },
      {
        role: "customer",
        name: form.contact || task.value.contact || "客户代表",
        image_url: await uploadSignature(form.customerSignature),
      },
    ];
    const payload = surveyPayload(photos, signatures);
    const saved = await saveRiskSurvey(surveyId.value, payload);
    const activeSurveyId = surveyId.value || toId(saved);
    if (!activeSurveyId) {
      throw new Error("服务端未返回勘测记录编号");
    }
    await submitRiskSurvey(activeSurveyId);
    removeLocalDraft(draftKey());
    uni.showLoading({ title: "正在生成报告", mask: true });
    const reportPath = await prepareReportPdf("risk", activeSurveyId).catch(
      () => "",
    );
    uni.hideLoading();
    uni.showModal({
      title: reportPath ? "勘测报告已生成" : "勘测记录已提交",
      content: reportPath
        ? "双方签字已完成，完整勘测报告已生成。审批通过后将进入封堵清单。"
        : "记录、照片和双方签字已保存。报告生成暂未完成，请稍后在任务详情中重新打开。",
      showCancel: Boolean(reportPath),
      confirmText: reportPath ? "查看报告" : "返回任务",
      cancelText: "返回任务",
      success: (result) => {
        if (result.confirm && reportPath) {
          openReportPath(reportPath);
          return;
        }
        uni.reLaunch({ url: "/pages/workbench/index" });
      },
    });
  } catch (submitError) {
    uni.hideLoading();
    error.value =
      submitError instanceof Error ? submitError.message : "勘测提交失败";
    uni.showToast({ title: error.value, icon: "none", duration: 3000 });
  } finally {
    submitting.value = false;
  }
}

onLoad(async (query) => {
  const current = getSession();
  if (!current) {
    uni.reLaunch({ url: "/pages/login/index" });
    return;
  }
  if (!canUseSurvey(current.role)) {
    uni.reLaunch({ url: fieldHome(current.role) });
    return;
  }
  taskId.value = Number(query?.taskId || 0);
  surveyId.value = Number(query?.surveyId || 0);
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
    if (surveyId.value) {
      hydrateSurvey(await getRiskSurvey(surveyId.value));
    } else {
      const saved = readLocalDraft<RiskDraft>(draftKey());
      if (saved) hydrate(saved);
    }
    try {
      quickPhrases.value = listQuickPhrases(
        await getQuickPhrases("risk_plan"),
      ).slice(0, 6);
    } catch {
      quickPhrases.value = [];
    }
  } catch (loadError) {
    error.value =
      loadError instanceof Error ? loadError.message : "任务加载失败";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <view class="survey-page">
    <PageHeader
      title="现场勘测"
      :subtitle="task ? `${task.report_no} · ${task.customer_name}` : '结构风险勘测'"
      kicker="现场采集"
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
      </view>
    </PageHeader>

    <view v-if="loading" class="page-content">
      <view class="empty-state">
        <text class="empty-title">正在加载任务</text>
        <text class="empty-copy">请稍候，正在读取作业单和客户信息。</text>
      </view>
    </view>

    <view v-else-if="error && !task" class="page-content">
      <view class="empty-state">
        <text class="empty-title">无法开始勘测</text>
        <text class="empty-copy">{{ error }}</text>
      </view>
    </view>

    <template v-else-if="task">
      <view class="page-content survey-content">
        <view v-if="step === 0" class="step-panel">
          <view class="site-card card">
            <view class="site-topline">
              <text class="site-kicker">现场与联系人</text>
              <text class="site-code mono">{{ task.report_no }}</text>
            </view>
            <text class="site-name">{{ task.customer_name }}</text>
            <text class="site-address">{{ task.service_address || "地址待补充" }}</text>
            <view class="site-contact">
              <view>
                <text class="contact-label">门店对接人</text>
                <text class="contact-value">{{ task.contact || "—" }}</text>
              </view>
              <view>
                <text class="contact-label">联系电话</text>
                <text class="contact-value">{{ task.contact_phone || "—" }}</text>
              </view>
            </view>
          </view>

          <view class="form-card card">
            <view class="form-grid">
              <view class="field compact-field">
                <text class="field-label">勘测日期</text>
                <picker mode="date" :value="form.date" @change="onDateChange">
                  <view class="picker-value">
                    <text>{{ form.date }}</text>
                    <UniIcons type="calendar" size="16" color="#65736c" />
                  </view>
                </picker>
              </view>
              <view class="field compact-field">
                <text class="field-label">勘测时间</text>
                <input
                  v-model="form.time"
                  class="field-input"
                  placeholder="如 22:20-23:00"
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
              <text class="field-label">复检日期</text>
              <picker mode="date" :value="form.reviewDate" @change="onReviewDateChange">
                <view class="picker-value">
                  <text>{{ form.reviewDate || "请选择复检日期" }}</text>
                  <UniIcons type="calendar" size="16" color="#65736c" />
                </view>
              </picker>
            </view>
          </view>

          <view class="choice-section">
            <view class="section-head">
              <view>
                <text class="section-title">勘测范围</text>
                <text class="section-copy">选择本次实际检查的区域</text>
              </view>
              <text class="choice-count">{{ form.scope.length }} 项</text>
            </view>
            <view class="chip-row">
              <view
                v-for="item in surveyScopeOptions"
                :key="item"
                class="chip"
                :class="{ active: form.scope.includes(item) }"
                @tap="toggleValue('scope', item)"
              >
                {{ item }}
              </view>
            </view>
          </view>

          <view class="choice-section">
            <view class="section-head">
              <view>
                <text class="section-title">结构情况</text>
                <text class="section-copy">记录可能形成鼠类通道的结构问题</text>
              </view>
              <text class="choice-count">{{ form.structure.length }} 项</text>
            </view>
            <view class="chip-row">
              <view
                v-for="item in structureOptions"
                :key="item"
                class="chip"
                :class="{ active: form.structure.includes(item) }"
                @tap="toggleValue('structure', item)"
              >
                {{ item }}
              </view>
            </view>
          </view>

          <view class="choice-section">
            <view class="section-head">
              <view>
                <text class="section-title">鼠害证据</text>
                <text class="section-copy">按现场实际痕迹选择</text>
              </view>
              <text class="choice-count">{{ form.evidence.length }} 项</text>
            </view>
            <view class="chip-row">
              <view
                v-for="item in pestEvidenceOptions"
                :key="item"
                class="chip"
                :class="{ active: form.evidence.includes(item) }"
                @tap="toggleValue('evidence', item)"
              >
                {{ item }}
              </view>
            </view>
          </view>

          <view class="form-card card">
            <text class="field-label">风险等级</text>
            <view class="segmented risk-segmented">
              <view
                v-for="item in ['低', '中', '高', '极高']"
                :key="item"
                class="segment"
                :class="{ active: form.riskLevel === item }"
                @tap="form.riskLevel = item"
              >
                {{ item }}
              </view>
            </view>
          </view>
        </view>

        <view v-else-if="step === 1" class="step-panel">
          <view class="section-head">
            <view>
              <text class="section-title">结构风险点</text>
              <text class="section-copy">逐项记录位置、问题和建议处理方式</text>
            </view>
            <button class="add-item" @tap="addItem">
              <UniIcons type="plus" size="16" color="#176b52" />
              <text>添加</text>
            </button>
          </view>

          <view class="risk-item-list">
            <view
              v-for="(item, index) in form.items"
              :key="index"
              class="risk-item card"
            >
              <view class="risk-item-head">
                <view class="risk-index">{{ String(index + 1).padStart(2, "0") }}</view>
                <text class="risk-item-title">风险点 {{ index + 1 }}</text>
                <view class="remove-item" @tap="removeItem(index)">
                  <UniIcons type="trash" size="16" color="#a8443c" />
                </view>
              </view>
              <input
                v-model="item.location"
                class="field-input item-field"
                placeholder="位置，例如仓储区水电管道穿墙孔"
                placeholder-class="field-placeholder"
              />
              <textarea
                v-model="item.description"
                class="field-textarea item-field"
                placeholder="现场问题描述"
                placeholder-class="field-placeholder"
              />
              <textarea
                v-model="item.suggestion"
                class="field-textarea item-field"
                placeholder="建议处理方式"
                placeholder-class="field-placeholder"
              />
            </view>
          </view>
        </view>

        <view v-else-if="step === 2" class="step-panel">
          <view class="section-head">
            <view>
              <text class="section-title">结构风险图片</text>
              <text class="section-copy">结构漏洞、虫害痕迹和隐患点位实拍</text>
            </view>
            <text class="choice-count">{{ form.photos.length }} / 100</text>
          </view>
          <view class="photo-card card">
            <PhotoGrid
              v-model:photos="form.photos"
              title="现场照片"
              hint="支持拍照和相册批量选择，累计最多 100 张"
              :max="100"
            />
          </view>
          <view class="hint-card">
            <text class="hint-title">拍摄建议</text>
            <text class="hint-copy">
              每处隐患至少保留一张全景照片；图片按 5 列排列，数量增加时自动换行。
            </text>
          </view>
        </view>

        <view v-else-if="step === 3" class="step-panel">
          <view class="section-head">
            <view>
              <text class="section-title">治理方案</text>
              <text class="section-copy">补充综合防治、消毒、环境和长期预防建议</text>
            </view>
          </view>

          <view v-if="quickPhrases.length" class="quick-phrases">
            <text class="quick-label">常用表述</text>
            <view class="chip-row">
              <view
                v-for="phrase in quickPhrases"
                :key="phrase.id"
                class="chip"
                @tap="insertPhrase(phrase.content)"
              >
                {{ phrase.content.slice(0, 18) }}
              </view>
            </view>
          </view>

          <view class="plan-card card">
            <view class="field">
              <text class="field-label">综合防治方案</text>
              <textarea
                v-model="form.comprehensivePlan"
                class="field-textarea"
                placeholder="填写现场治理的总体方案"
                placeholder-class="field-placeholder"
              />
            </view>
            <view class="field">
              <text class="field-label">消毒方案</text>
              <textarea
                v-model="form.disinfectionPlan"
                class="field-textarea short-textarea"
                placeholder="填写消毒和清洁处理建议"
                placeholder-class="field-placeholder"
              />
            </view>
            <view class="field">
              <text class="field-label">环境建议</text>
              <textarea
                v-model="form.environmentSuggestions"
                class="field-textarea short-textarea"
                placeholder="填写环境改善建议"
                placeholder-class="field-placeholder"
              />
            </view>
            <view class="field">
              <text class="field-label">长期预防措施</text>
              <textarea
                v-model="form.preventionMeasures"
                class="field-textarea short-textarea"
                placeholder="填写长期预防和复检要求"
                placeholder-class="field-placeholder"
              />
            </view>
            <view class="field">
              <text class="field-label">勘测结论</text>
              <textarea
                v-model="form.conclusion"
                class="field-textarea short-textarea"
                placeholder="填写本次勘测结论"
                placeholder-class="field-placeholder"
              />
            </view>
          </view>
        </view>

        <view v-else class="step-panel">
          <view class="submit-summary card">
            <text class="summary-title">提交前确认</text>
            <view class="summary-grid">
              <view class="summary-item">
                <text class="summary-label">勘测范围</text>
                <text class="summary-value">{{ form.scope.length }} 项</text>
              </view>
              <view class="summary-item">
                <text class="summary-label">风险点</text>
                <text class="summary-value">{{ form.items.length }} 项</text>
              </view>
              <view class="summary-item">
                <text class="summary-label">风险图片</text>
                <text class="summary-value">{{ form.photos.length }} 张</text>
              </view>
              <view class="summary-item">
                <text class="summary-label">风险等级</text>
                <text class="summary-value">{{ form.riskLevel }}</text>
              </view>
            </view>
          </view>

          <view class="signature-note">
            <text class="signature-note-title">双方在同一台手机上签字</text>
            <text class="signature-note-copy">
              勘测人员先签，再把手机交给客户代表签第二笔；两笔签名完成后才能提交。
            </text>
          </view>

          <SignaturePad
            v-model:value="form.surveyorSignature"
            title="勘测人员签字确认"
            :signer="`${surveyorName} · 勘测人员`"
            hint="由勘测人员在本机手写签名"
          />
          <view class="signature-gap" />
          <SignaturePad
            v-model:value="form.customerSignature"
            title="客户代表签字"
            :signer="`${form.contact || task.contact || '客户代表'} · 客户代表`"
            hint="由客户代表在同一台手机上签名"
          />
        </view>
      </view>

      <view class="bottom-actions safe-bottom">
        <button
          class="btn-secondary action-button"
          :disabled="step === 0"
          @tap="previousStep"
        >
          上一步
        </button>
        <button class="draft-button" :disabled="saving" @tap="persistDraft">
          {{ saving ? "保存中" : "存草稿" }}
        </button>
        <button
          v-if="step < steps.length - 1"
          class="btn-primary action-button"
          @tap="nextStep"
        >
          下一步
        </button>
        <button
          v-else
          class="btn-primary action-button"
          :disabled="submitting"
          @tap="submit"
        >
          {{ submitting ? "提交中" : "提交勘测" }}
        </button>
      </view>
    </template>
  </view>
</template>

<style scoped>
.survey-page {
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

.survey-content {
  padding-top: 24rpx;
}

.step-panel {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.site-card,
.form-card,
.plan-card,
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

.choice-section {
  padding: 4rpx 2rpx;
}

.choice-count {
  color: #176b52;
  font-size: 22rpx;
  font-weight: 600;
}

.segmented {
  display: flex;
  gap: 6rpx;
  padding: 6rpx;
  border-radius: 14rpx;
  background: #eff4f0;
}

.risk-segmented {
  margin-top: 10rpx;
}

.segment {
  flex: 1;
  min-height: 58rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10rpx;
  color: #65736c;
  font-size: 23rpx;
}

.segment.active {
  background: #ffffff;
  color: #103b2d;
  font-weight: 700;
  box-shadow: 0 4rpx 12rpx rgba(16, 53, 42, 0.08);
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

.risk-item-list {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.risk-item {
  padding: 20rpx;
}

.risk-item-head {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.risk-index {
  width: 40rpx;
  height: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10rpx;
  background: #e6f2ec;
  color: #176b52;
  font-family: "SFMono-Regular", "Cascadia Code", monospace;
  font-size: 18rpx;
  font-weight: 700;
}

.risk-item-title {
  flex: 1;
  font-size: 25rpx;
  font-weight: 700;
}

.remove-item {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.item-field {
  margin-top: 12rpx;
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

.quick-phrases {
  padding: 18rpx 20rpx;
  border-radius: 16rpx;
  background: #e6f2ec;
}

.quick-label {
  display: block;
  margin-bottom: 10rpx;
  color: #115640;
  font-size: 22rpx;
  font-weight: 700;
}

.short-textarea {
  min-height: 130rpx;
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
.survey-page {
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

.survey-content {
  padding-top: 20rpx;
}

.step-panel {
  gap: 16rpx;
}

.site-card,
.form-card,
.plan-card,
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

.choice-section {
  padding: 2rpx;
}

.choice-count {
  color: #176b52;
  font-size: 20rpx;
}

.segmented {
  gap: 4rpx;
  padding: 5rpx;
  border-radius: 10rpx;
  background: #eff4f0;
}

.segment {
  min-height: 56rpx;
  border-radius: 8rpx;
  color: #65736c;
  font-size: 21rpx;
}

.segment.active {
  color: #17211d;
  box-shadow: 0 2rpx 8rpx rgba(18, 34, 27, 0.06);
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

.risk-item-list {
  gap: 12rpx;
}

.risk-item {
  padding: 22rpx;
}

.risk-index {
  background: #e6f2ec;
  color: #176b52;
}

.risk-item-title {
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

.quick-phrases {
  background: #f0f7f3;
}

.quick-label {
  color: #115640;
  font-size: 21rpx;
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
  gap: 8rpx;
  padding: 14rpx 24rpx;
  border-top-color: #dde7e0;
  background: #ffffff;
  box-shadow: 0 -10rpx 32rpx rgba(18, 34, 27, 0.07);
}

.action-button {
  min-height: 84rpx;
}

.draft-button {
  min-width: 108rpx;
  min-height: 84rpx;
  padding: 0 14rpx;
  border-color: #d5e0d7;
  border-radius: 12rpx;
  color: #176b52;
  font-size: 21rpx;
}
</style>
