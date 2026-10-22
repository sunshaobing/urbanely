<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import UniIcons from "@dcloudio/uni-ui/lib/uni-icons/uni-icons.vue";
import CartoonAvatar from "../../components/CartoonAvatar.vue";
import PageHeader from "../../components/PageHeader.vue";
import StatusPill from "../../components/StatusPill.vue";
import {
  getRiskSurvey,
  getRiskSurveys,
  getPersonnel,
  getServiceReport,
  getServiceReports,
  getWorkOrder,
  normalizeRiskSurveys,
  normalizeServiceReports,
  reviewWorkOrder,
  saveRiskSurvey,
  saveServiceReport,
  toId,
} from "../../utils/api";
import { formatAccuracy } from "../../utils/location";
import { getSession } from "../../utils/auth";
import { ensureBrand } from "../../utils/brand";
import { openReportPdf, reportPdfPath } from "../../utils/pdf";
import { displayDate, displayDay, roleLabel } from "../../utils/present";
import {
  fieldHome,
  ownTasks,
  roleMode,
} from "../../utils/roles";
import {
  deriveWorkflow,
  dispatchPayload,
  dispatchUpdatePayload,
  relatedRiskSurvey,
  relatedServiceReport,
  riskSurveyUpdatePayload,
  sealingListPayload,
  serviceReportUpdatePayload,
} from "../../utils/workflow";
import type {
  PersonnelUser,
  RiskSurvey,
  ServiceReport,
  Session,
  WorkOrder,
} from "../../utils/types";

const task = ref<WorkOrder | null>(null);
const survey = ref<RiskSurvey | null>(null);
const serviceReport = ref<ServiceReport | null>(null);
const session = ref<Session | null>(null);
const taskId = ref(0);
const loading = ref(true);
const relatedLoading = ref(false);
const actionLoading = ref(false);
const error = ref("");
const dispatchSheetOpen = ref(false);
const engineerLoading = ref(false);
const sealingEngineers = ref<PersonnelUser[]>([]);

const workflow = computed(() =>
  task.value
    ? deriveWorkflow(task.value, survey.value, serviceReport.value)
    : { steps: [], currentIndex: 0 },
);
const roleView = computed(() => roleMode(session.value?.role || ""));
const visibleStepKeys = computed(() => {
  if (roleView.value === "survey") {
    return ["surveyCheckin", "survey", "surveySign", "surveyApproval"];
  }
  if (roleView.value === "sealing") {
    return [
      "accept",
      "checkin",
      "beforePhotos",
      "afterPhotos",
      "sealSign",
      "checkout",
      "sealApproval",
      "generateReport",
    ];
  }
  return workflow.value.steps.map((step) => step.key);
});
const visibleSteps = computed(() =>
  workflow.value.steps.filter((step) =>
    visibleStepKeys.value.includes(step.key),
  ),
);
const visibleCurrentIndex = computed(() => {
  const index = visibleSteps.value.findIndex((step) => !step.done);
  return index === -1 ? Math.max(0, visibleSteps.value.length - 1) : index;
});
const fullCurrentStep = computed(
  () => workflow.value.steps[workflow.value.currentIndex] ?? null,
);
const currentStep = computed(() =>
  fullCurrentStep.value &&
  visibleStepKeys.value.includes(fullCurrentStep.value.key)
    ? fullCurrentStep.value
    : null,
);
const progress = computed(() =>
  visibleSteps.value.length
    ? Math.round(
        (visibleSteps.value.filter((step) => step.done).length /
          visibleSteps.value.length) *
          100,
      )
    : 0,
);
const surveyReportReady = computed(
  () =>
    Boolean(
      survey.value &&
        (survey.value.signatures?.length || 0) >= 2 &&
        (survey.value.pdf_url ||
          ["submitted", "reviewed", "approved", "completed"].includes(
            survey.value.status,
          )),
    ),
);
const canApprove = computed(() =>
  ["super_admin", "admin", "supervisor"].includes(session.value?.role || ""),
);
const checkinDisplay = computed(() => {
  const role = roleView.value === "survey" ? "surveyor" : "sealing";
  const record = task.value?.checkins?.find((item) => item.role === role);
  if (record?.checkin_time) {
    return {
      time: record.checkin_time,
      accuracy: formatAccuracy(record.accuracy),
      location: record.address || "现场定位",
      coordinates:
        record.latitude != null && record.longitude != null
          ? `${record.latitude.toFixed(6)}, ${record.longitude.toFixed(6)}`
          : "",
    };
  }
  const reportCheckin = serviceReport.value?.checkin;
  if (reportCheckin?.checkin_time) {
    return {
      time: reportCheckin.checkin_time,
      accuracy: formatAccuracy(reportCheckin.checkin_accuracy),
      location: reportCheckin.checkin_location || "现场定位",
      coordinates:
        reportCheckin.checkin_latitude != null &&
        reportCheckin.checkin_longitude != null
          ? `${reportCheckin.checkin_latitude.toFixed(6)}, ${reportCheckin.checkin_longitude.toFixed(6)}`
          : "",
    };
  }
  return null;
});
const headerStatus = computed(() => {
  if (serviceReport.value?.status === "pending" && !serviceReport.value.service_person) {
    return "unassigned";
  }
  if (serviceReport.value && serviceReport.value.status !== "draft") {
    return serviceReport.value.status;
  }
  return task.value?.status || "draft";
});
const approvalWaiting = computed(
  () =>
    !canApprove.value &&
    ["surveyApproval", "dispatch", "sealApproval"].includes(
      currentStep.value?.key || "",
    ),
);
const actionLabel = computed(() => {
  const key = currentStep.value?.key;
  if (!key) {
    if (roleView.value === "survey") return "等待后续流程";
    if (roleView.value === "sealing") return "等待派单";
    return "流程已完成";
  }
  if (key === "survey") return "开始勘测";
  if (key === "surveyCheckin") return "到达现场签到";
  if (key === "surveySign") return "完成双签并生成报告";
  if (key === "surveyApproval") return canApprove.value ? "审批勘测报告" : "等待审批";
  if (key === "sealingList") return "刷新封堵清单";
  if (key === "dispatch")
    return canApprove.value ? "选择封堵工程师" : "等待派单";
  if (key === "accept") return "封堵接单";
  if (key === "checkin") return "现场签到";
  if (key === "beforePhotos") return "补拍施工前影像";
  if (key === "afterPhotos") return "补拍施工后影像";
  if (key === "sealSign") return "完成封堵报告双签";
  if (key === "checkout") return "签出拍照确认";
  if (key === "sealApproval") return canApprove.value ? "审批封堵报告" : "提交审批";
  return "生成报告";
});
const actionDisabled = computed(
  () =>
    !currentStep.value ||
    actionLoading.value ||
    relatedLoading.value ||
    approvalWaiting.value,
);
const isCheckinStep = computed(() =>
  ["surveyCheckin", "checkin"].includes(currentStep.value?.key || ""),
);

function errorText(value: unknown) {
  return value instanceof Error ? value.message : "任务加载失败";
}

async function load() {
  if (!taskId.value) {
    loading.value = false;
    error.value = "缺少任务编号";
    return;
  }
  loading.value = true;
  error.value = "";
  try {
    task.value = await getWorkOrder(taskId.value);
    session.value = getSession();
    await loadRelated(task.value);
    const mode = roleMode(session.value?.role || "");
    if (
      !session.value ||
      mode === "none" ||
      ownTasks(
        [task.value],
        session.value,
        mode,
        serviceReport.value ? [serviceReport.value] : [],
      ).length === 0
    ) {
      uni.reLaunch({ url: fieldHome(session.value?.role || "") });
      return;
    }
  } catch (loadError) {
    error.value = errorText(loadError);
  } finally {
    loading.value = false;
  }
}

async function loadRelated(current: WorkOrder) {
  relatedLoading.value = true;
  try {
    const filters = current.customer_id
      ? { customer_id: current.customer_id }
      : {};
    const [surveyPayload, reportPayload] = await Promise.allSettled([
      getRiskSurveys(filters),
      getServiceReports(filters),
    ]);
    const surveys =
      surveyPayload.status === "fulfilled"
        ? normalizeRiskSurveys(surveyPayload.value)
        : [];
    const reports =
      reportPayload.status === "fulfilled"
        ? normalizeServiceReports(reportPayload.value)
        : [];
    survey.value = relatedRiskSurvey(current, surveys);
    serviceReport.value = relatedServiceReport(current, reports);
  } finally {
    relatedLoading.value = false;
  }
}

function callContact() {
  if (!task.value?.contact_phone) {
    uni.showToast({ title: "暂未填写联系电话", icon: "none" });
    return;
  }
  uni.makePhoneCall({ phoneNumber: task.value.contact_phone });
}

function copyAddress() {
  if (!task.value?.service_address) return;
  uni.setClipboardData({
    data: task.value.service_address,
    success: () => uni.showToast({ title: "地址已复制", icon: "none" }),
  });
}

function openRiskSurvey() {
  if (!task.value) return;
  const targetStep =
    survey.value && currentStep.value?.key === "surveySign" ? 5 : 0;
  const surveyQuery = survey.value ? `&surveyId=${survey.value.id}` : "";
  uni.navigateTo({
    url: `/pages/risk-survey/index?taskId=${task.value.id}${surveyQuery}&step=${targetStep}`,
  });
}

function openSurveyReport() {
  if (!survey.value) return;
  openReportPdf(reportPdfPath("risk", survey.value.id));
}

function openServiceReport() {
  if (!task.value) return;
  if (!serviceReport.value) {
    uni.showToast({ title: "请先完成勘测审批并派单", icon: "none" });
    return;
  }
  const key = currentStep.value?.key;
  const step =
    key === "sealSign"
      ? 5
      : key === "checkout"
        ? 6
        : key === "afterPhotos"
          ? 3
          : key === "beforePhotos"
            ? 2
            : 0;
  uni.navigateTo({
    url: `/pages/service-report/index?taskId=${task.value.id}&reportId=${serviceReport.value.id}&step=${step}`,
  });
}

function openCheckin() {
  if (!task.value || !currentStep.value) return;
  const sealing = currentStep.value.key === "checkin";
  if (sealing && !serviceReport.value) {
    uni.showToast({ title: "尚未生成封堵单", icon: "none" });
    return;
  }
  const query = [
    `taskId=${task.value.id}`,
    `kind=${sealing ? "sealing" : "survey"}`,
    sealing && serviceReport.value
      ? `reportId=${serviceReport.value.id}`
      : "",
  ]
    .filter(Boolean)
    .join("&");
  uni.navigateTo({ url: `/pages/checkin/index?${query}` });
}

async function approveSurvey() {
  if (!survey.value || !task.value) {
    uni.showToast({ title: "尚未生成勘测记录", icon: "none" });
    return;
  }
  const fullSurvey = await getRiskSurvey(survey.value.id);
  await saveRiskSurvey(
    survey.value.id,
    riskSurveyUpdatePayload(fullSurvey, { status: "approved" }),
  );
  await ensureSealingList();
  uni.showToast({
    title: "已进入封堵清单",
    icon: "success",
  });
}

async function ensureSealingList() {
  if (!task.value || serviceReport.value) return;
  const created = await saveServiceReport(0, sealingListPayload(task.value));
  if (!toId(created)) {
    throw new Error("勘测已审批，但封堵清单创建失败");
  }
}

async function openDispatchSheet() {
  if (!serviceReport.value) {
    uni.showToast({ title: "封堵任务尚未进入清单", icon: "none" });
    return;
  }
  dispatchSheetOpen.value = true;
  if (sealingEngineers.value.length || engineerLoading.value) return;
  engineerLoading.value = true;
  try {
    const payload = await getPersonnel({
      role: "sealing_engineer",
      active: "true",
    });
    sealingEngineers.value = payload.items.filter(
      (engineer) =>
        engineer.active &&
        ["sealing_engineer", "sealer", "sealing_operator"].includes(
          engineer.role,
        ),
    );
  } catch (loadError) {
    uni.showToast({
      title:
        loadError instanceof Error
          ? loadError.message
          : "封堵工程师加载失败",
      icon: "none",
    });
  } finally {
    engineerLoading.value = false;
  }
}

function closeDispatchSheet() {
  if (!actionLoading.value) dispatchSheetOpen.value = false;
}

async function dispatchSealing(engineer: PersonnelUser) {
  if (!task.value || !session.value || actionLoading.value) return;
  if (!task.value.customer_id) {
    throw new Error("作业单缺少客户ID，无法派单");
  }
  actionLoading.value = true;
  try {
    if (serviceReport.value) {
      const fullReport = await getServiceReport(serviceReport.value.id);
      await saveServiceReport(
        serviceReport.value.id,
        dispatchUpdatePayload(fullReport, engineer.name),
      );
    } else {
      const created = await saveServiceReport(
        0,
        dispatchPayload(task.value, engineer.name),
      );
      if (!toId(created)) {
        throw new Error("派单成功但服务端未返回封堵单编号");
      }
    }
    dispatchSheetOpen.value = false;
    uni.showToast({ title: "派单成功", icon: "success" });
    await load();
  } catch (dispatchError) {
    uni.showToast({
      title:
        dispatchError instanceof Error ? dispatchError.message : "派单失败",
      icon: "none",
    });
  } finally {
    actionLoading.value = false;
  }
}

async function acceptSealing() {
  if (!serviceReport.value) {
    throw new Error("尚未生成封堵单");
  }
  const fullReport = await getServiceReport(serviceReport.value.id);
  await saveServiceReport(
    serviceReport.value.id,
    serviceReportUpdatePayload(fullReport, {
      status: "accepted",
    }),
  );
  uni.showToast({ title: "已接单", icon: "success" });
}

async function approveSealing() {
  if (!serviceReport.value || !task.value) {
    throw new Error("尚未生成封堵报告");
  }
  const fullReport = await getServiceReport(serviceReport.value.id);
  await saveServiceReport(
    serviceReport.value.id,
    serviceReportUpdatePayload(fullReport, {
      status: "approved",
    }),
  );
  await reviewWorkOrder(task.value.id, "approve", "封堵报告审批通过");
  uni.showToast({ title: "封堵报告已审批", icon: "success" });
}

async function runCurrentAction() {
  const key = currentStep.value?.key;
  if (!key || actionLoading.value || approvalWaiting.value) return;
  if (key === "survey" || key === "surveySign") {
    openRiskSurvey();
    return;
  }
  if (key === "dispatch") {
    await openDispatchSheet();
    return;
  }
  if (["beforePhotos", "afterPhotos", "sealSign", "checkout"].includes(key)) {
    openServiceReport();
    return;
  }
  if (["surveyCheckin", "checkin"].includes(key)) {
    openCheckin();
    return;
  }
  actionLoading.value = true;
  try {
    if (key === "surveyApproval") await approveSurvey();
    else if (key === "sealingList") await ensureSealingList();
    else if (key === "accept") await acceptSealing();
    else if (key === "sealApproval") await approveSealing();
    else if (key === "generateReport" && serviceReport.value) {
      openReportPdf(reportPdfPath("service", serviceReport.value.id));
      const fullReport = await getServiceReport(serviceReport.value.id);
      await saveServiceReport(
        serviceReport.value.id,
        serviceReportUpdatePayload(fullReport, {
          status: "completed",
        }),
      );
    }
    await load();
  } catch (actionError) {
    uni.showToast({
      title:
        actionError instanceof Error ? actionError.message : "操作失败，请重试",
      icon: "none",
      duration: 3000,
    });
  } finally {
    actionLoading.value = false;
  }
}

onLoad((query) => {
  taskId.value = Number(query?.id || 0);
  session.value = getSession();
  void ensureBrand();
  void load();
});

onShow(() => {
  if (taskId.value && !loading.value) void load();
});
</script>

<template>
  <view class="detail-page">
    <PageHeader
      title="任务详情"
      :subtitle="task ? `${task.report_no} · ${task.customer_name}` : '现场作业单'"
      kicker="现场作业"
      back
    >
      <template #action>
        <StatusPill v-if="task" :status="headerStatus" />
      </template>

      <view v-if="task" class="order-hero card">
        <view class="order-main">
          <text class="order-service">{{ task.service_type || "结构漏洞封堵" }}</text>
          <text class="order-customer">{{ task.customer_name }}</text>
        </view>
        <view class="order-address-row">
          <text class="order-address">{{ task.service_address || "服务地址待补充" }}</text>
          <view class="copy-address" @tap="copyAddress">
            <UniIcons type="map-pin" size="14" color="#176b52" />
            <text>复制</text>
          </view>
        </view>
        <view class="order-quick">
          <view class="order-quick-item">
            <text class="quick-label">服务日期</text>
            <text class="quick-value">{{ displayDay(task.service_date || task.report_date) }}</text>
          </view>
          <view class="order-quick-item">
            <text class="quick-label">封堵部位</text>
            <text class="quick-value">{{ task.sites.length }} 个</text>
          </view>
          <view class="call-button" @tap="callContact">
            <UniIcons type="phone-filled" size="17" color="#ffffff" />
            <text>联系门店</text>
          </view>
        </view>
      </view>
    </PageHeader>

    <view v-if="loading" class="page-content">
      <view class="skeleton-card card">
        <view class="skeleton-line short" />
        <view class="skeleton-line" />
        <view class="skeleton-line medium" />
      </view>
    </view>

    <view v-else-if="error" class="page-content">
      <view class="empty-state">
        <text class="empty-title">任务未加载</text>
        <text class="empty-copy">{{ error }}</text>
        <button class="btn-secondary retry-button" @tap="load">重新加载</button>
      </view>
    </view>

    <template v-else-if="task">
      <view class="page-content detail-content">
        <view class="next-step-card card">
          <text class="next-step-kicker">
            当前步骤 · {{ visibleCurrentIndex + 1 }} / {{ visibleSteps.length }}
          </text>
          <text class="next-step-title">{{ currentStep?.label || actionLabel }}</text>
          <text class="next-step-hint">
            {{ currentStep?.hint || "当前角色无需处理后续节点" }}
          </text>
          <view class="next-step-progress">
            <view
              class="next-step-progress-fill"
              :style="{ width: `${progress}%` }"
            />
          </view>
          <view v-if="isCheckinStep" class="checkin-target">
            <view class="checkin-target-icon">
              <UniIcons type="location-filled" size="23" color="#176b52" />
            </view>
            <view class="checkin-target-copy">
              <text class="checkin-target-title">确认到达门店后签到</text>
              <text class="checkin-target-address">
                {{ task.service_address || "服务地址待补充" }}
              </text>
              <text class="checkin-target-meta">
                {{ checkinDisplay ? "已完成现场签到" : "将记录定位精度和签到时间" }}
              </text>
            </view>
          </view>
        </view>

        <view class="workflow-card card">
          <view class="workflow-head">
            <view>
              <text class="workflow-kicker">当前进度 · {{ visibleCurrentIndex + 1 }} / {{ visibleSteps.length }}</text>
              <text class="workflow-title">{{ currentStep?.label || actionLabel }}</text>
            </view>
            <text class="workflow-percent">{{ progress }}%</text>
          </view>
          <view class="workflow-progress">
            <view class="workflow-progress-fill" :style="{ width: `${progress}%` }" />
          </view>
          <scroll-view class="process-scroll" scroll-x :show-scrollbar="false">
            <view class="process-track">
              <view
                v-for="(step, index) in visibleSteps"
                :key="step.key"
                class="process-step"
                :class="{
                  done: step.done,
                  active: index === visibleCurrentIndex && !step.done,
                }"
              >
                <view class="process-node">
                  <UniIcons
                    v-if="step.done"
                    type="checkmarkempty"
                    size="12"
                    color="#ffffff"
                  />
                  <text v-else>{{ index + 1 }}</text>
                </view>
                <text class="process-label">{{ step.label }}</text>
                <text class="process-state">
                  {{ step.done ? "已完成" : index === visibleCurrentIndex ? "当前" : "待处理" }}
                </text>
              </view>
            </view>
          </scroll-view>
          <text class="workflow-hint">{{ currentStep?.hint || "当前角色无需处理后续节点" }}</text>
          <view
            v-if="surveyReportReady"
            class="workflow-report-link pressable"
            @tap="openSurveyReport"
          >
            <UniIcons type="paperplane" size="15" color="#176b52" />
            <text>查看完整勘测报告</text>
            <UniIcons type="right" size="13" color="#176b52" />
          </view>
        </view>

        <view v-if="checkinDisplay" class="checkin-card card">
          <view class="checkin-head">
            <UniIcons type="location-filled" size="18" color="#176b52" />
            <text class="checkin-title">到场签到</text>
            <text class="checkin-badge">已签到</text>
          </view>
          <view class="checkin-row">
            <text class="checkin-label">签到时间</text>
            <text class="checkin-value">{{ checkinDisplay.time }}</text>
          </view>
          <view class="checkin-row">
            <text class="checkin-label">定位精度</text>
            <text class="checkin-value">{{ checkinDisplay.accuracy }}</text>
          </view>
          <view v-if="checkinDisplay.coordinates" class="checkin-row">
            <text class="checkin-label">现场坐标</text>
            <text class="checkin-value mono">{{ checkinDisplay.coordinates }}</text>
          </view>
        </view>

        <view v-if="survey || serviceReport" class="related-card card">
          <text class="related-title">关联单据</text>
          <view v-if="survey" class="related-row">
            <view class="related-icon">
              <UniIcons type="search" size="17" color="#176b52" />
            </view>
            <view class="related-copy">
              <text class="related-name">勘测报告</text>
              <text class="related-meta">{{ survey.code || `#${survey.id}` }} · {{ survey.status }}</text>
            </view>
            <text class="related-count">{{ survey.signatures?.length || 0 }}/2 签</text>
          </view>
          <view v-if="serviceReport" class="related-row">
            <view class="related-icon">
              <UniIcons type="compose" size="17" color="#176b52" />
            </view>
            <view class="related-copy">
              <text class="related-name">封堵报告</text>
              <text class="related-meta">#{{ serviceReport.id }} · {{ serviceReport.status }}</text>
            </view>
            <text class="related-count">{{ serviceReport.signatures?.length || 0 }}/2 签</text>
          </view>
        </view>

        <view class="section-block">
          <view class="section-head">
            <view>
              <text class="section-title">服务信息</text>
              <text class="section-copy">现场联系人与作业基本信息</text>
            </view>
          </view>
          <view class="info-card card">
            <view class="info-row">
              <text class="info-label">门店对接人</text>
              <text class="info-value">{{ task.contact || "—" }}</text>
            </view>
            <view class="info-row">
              <text class="info-label">联系电话</text>
              <view class="phone-value" @tap="callContact">
                <text>{{ task.contact_phone || "—" }}</text>
                <UniIcons
                  v-if="task.contact_phone"
                  type="phone"
                  size="15"
                  color="#176b52"
                />
              </view>
            </view>
            <view class="info-row">
              <text class="info-label">服务时间</text>
              <text class="info-value">{{ displayDate(task.service_date || task.report_date) }}</text>
            </view>
            <view class="info-row">
              <text class="info-label">鼠害密度</text>
              <text class="info-value">{{ task.density || "待评估" }}</text>
            </view>
            <view class="info-row">
              <text class="info-label">天气</text>
              <text class="info-value">{{ task.weather || "—" }}</text>
            </view>
            <view v-if="task.engineer_name" class="info-row">
              <text class="info-label">现场负责人</text>
              <view class="person-value">
                <CartoonAvatar :name="task.engineer_name" :size="20" />
                <text>{{ task.engineer_name }}</text>
              </view>
            </view>
          </view>
        </view>

        <view class="section-block">
          <view class="section-head">
            <view>
              <text class="section-title">封堵部位</text>
              <text class="section-copy">现场点位与前后影像记录</text>
            </view>
            <text class="section-count">{{ task.sites.length }} 个</text>
          </view>
          <view v-if="task.sites.length" class="site-list">
            <view v-for="(site, index) in task.sites" :key="site.id" class="site-card card">
              <view class="site-index">{{ String(index + 1).padStart(2, "0") }}</view>
              <view class="site-copy">
                <text class="site-name">{{ site.name }}</text>
                <text class="site-type">{{ site.hole_type || "结构孔洞" }}</text>
                <text v-if="site.remark" class="site-remark">{{ site.remark }}</text>
              </view>
              <view class="site-photo-stats">
                <text>前 {{ site.before_photo_count }}</text>
                <text>后 {{ site.after_photo_count }}</text>
              </view>
            </view>
          </view>
          <view v-else class="empty-state compact-empty">
            <text class="empty-title">暂无封堵部位</text>
            <text class="empty-copy">可在封堵记录中补充现场点位。</text>
          </view>
        </view>

        <view class="section-block">
          <view class="section-head">
            <view>
              <text class="section-title">材料明细</text>
              <text class="section-copy">施工材料与用量</text>
            </view>
            <text class="section-count">{{ task.materials.length }} 项</text>
          </view>
          <view v-if="task.materials.length" class="material-card card">
            <view
              v-for="material in task.materials"
              :key="material.id"
              class="material-row"
            >
              <view class="material-copy">
                <text class="material-name">{{ material.material_name }}</text>
                <text class="material-spec">{{ material.spec || "规格未填写" }}</text>
              </view>
              <text class="material-qty">{{ material.qty }} {{ material.unit }}</text>
            </view>
          </view>
          <view v-else class="empty-state compact-empty">
            <text class="empty-title">暂无材料记录</text>
            <text class="empty-copy">封堵完成后可在记录页补充材料。</text>
          </view>
        </view>

        <view v-if="task.rejection_reason" class="reject-card">
          <UniIcons type="info-filled" size="18" color="#a8443c" />
          <view>
            <text class="reject-title">审核退回原因</text>
            <text class="reject-copy">{{ task.rejection_reason }}</text>
          </view>
        </view>
      </view>

      <view class="bottom-actions safe-bottom">
        <button class="btn-secondary bottom-button" @tap="load">
          <UniIcons type="refreshempty" size="18" color="#176b52" />
          <text>同步状态</text>
        </button>
        <button
          class="btn-primary bottom-button"
          :disabled="actionDisabled"
          @tap="runCurrentAction"
        >
          <UniIcons type="right" size="18" color="#ffffff" />
          <text>{{ actionLoading ? "处理中" : actionLabel }}</text>
        </button>
      </view>

      <view v-if="dispatchSheetOpen" class="sheet-mask" @tap="closeDispatchSheet">
        <view class="dispatch-sheet safe-bottom" @tap.stop>
          <view class="dispatch-sheet-head">
            <view class="dispatch-sheet-copy">
              <text class="dispatch-sheet-title">选择封堵工程师</text>
              <text class="dispatch-sheet-sub">
                {{ task.customer_name }} · {{ task.report_no }}
              </text>
            </view>
            <view class="sheet-close" @tap="closeDispatchSheet">
              <UniIcons type="closeempty" size="18" color="#65736c" />
            </view>
          </view>

          <view v-if="engineerLoading" class="engineer-loading">
            <text>正在读取封堵工程师...</text>
          </view>

          <scroll-view
            v-else-if="sealingEngineers.length"
            scroll-y
            class="engineer-list"
          >
            <view
              v-for="engineer in sealingEngineers"
              :key="engineer.id"
              class="engineer-row pressable"
              :class="{ disabled: actionLoading }"
              @tap="dispatchSealing(engineer)"
            >
              <CartoonAvatar :name="engineer.name" :size="38" />
              <view class="engineer-copy">
                <text class="engineer-name">{{ engineer.name }}</text>
                <text class="engineer-meta">
                  {{ roleLabel(engineer.role) }} · {{ engineer.username }}
                </text>
              </view>
              <UniIcons type="right" size="15" color="#8a968f" />
            </view>
          </scroll-view>

          <view v-else class="engineer-empty">
            <text class="engineer-empty-title">暂无可派单工程师</text>
            <text class="engineer-empty-copy">
              请先在人员与权限中启用封堵工程师账号。
            </text>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<style scoped>
.order-hero {
  margin-top: 28rpx;
}

.order-service {
  display: block;
  color: #b8d8c8;
  font-size: 23rpx;
  font-weight: 600;
}

.order-customer {
  display: block;
  margin-top: 10rpx;
  font-size: 44rpx;
  font-weight: 700;
  line-height: 1.3;
}

.order-address-row {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  margin-top: 12rpx;
}

.order-address {
  flex: 1;
  color: #bdd6cb;
  font-size: 24rpx;
  line-height: 1.5;
}

.copy-address {
  display: flex;
  flex: none;
  align-items: center;
  gap: 4rpx;
  color: #b8d8c8;
  font-size: 20rpx;
}

.order-quick {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin-top: 26rpx;
  padding-top: 22rpx;
  border-top: 1rpx solid rgba(255, 255, 255, 0.12);
}

.order-quick-item {
  min-width: 110rpx;
}

.quick-label,
.quick-value {
  display: block;
}

.quick-label {
  color: #93b8a8;
  font-size: 20rpx;
}

.quick-value {
  margin-top: 4rpx;
  font-size: 25rpx;
  font-weight: 600;
}

.call-button {
  height: 66rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  margin-left: auto;
  padding: 0 18rpx;
  border-radius: 14rpx;
  background: #e6f2ec;
  color: #103b2d;
  font-size: 22rpx;
  font-weight: 700;
}

.detail-content {
  padding-top: 28rpx;
}

.workflow-card {
  padding: 22rpx;
}

.workflow-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20rpx;
}

.workflow-kicker,
.workflow-title,
.workflow-hint {
  display: block;
}

.workflow-kicker {
  color: #176b52;
  font-size: 19rpx;
  font-weight: 700;
  letter-spacing: 1rpx;
}

.workflow-title {
  margin-top: 5rpx;
  font-size: 31rpx;
  font-weight: 700;
}

.workflow-hint {
  margin-top: 4rpx;
  color: #65736c;
  font-size: 21rpx;
}

.workflow-percent {
  flex: none;
  color: #176b52;
  font-family: "SFMono-Regular", "Cascadia Code", monospace;
  font-size: 28rpx;
  font-weight: 700;
}

.workflow-progress {
  height: 8rpx;
  overflow: hidden;
  margin-top: 18rpx;
  border-radius: 8rpx;
  background: #e8efea;
}

.workflow-progress-fill {
  height: 100%;
  border-radius: 8rpx;
  background: #176b52;
  transition: width 180ms ease;
}

.process-list {
  margin-top: 22rpx;
}

.process-step {
  display: flex;
  align-items: flex-start;
  gap: 14rpx;
  min-height: 66rpx;
}

.process-rail {
  position: relative;
  width: 36rpx;
  flex: none;
  display: flex;
  justify-content: center;
}

.process-node {
  position: relative;
  z-index: 2;
  width: 34rpx;
  height: 34rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1rpx solid #d6e1da;
  border-radius: 50%;
  background: #f7faf8;
  color: #8a968f;
  font-family: "SFMono-Regular", "Cascadia Code", monospace;
  font-size: 16rpx;
}

.process-line {
  position: absolute;
  top: 34rpx;
  bottom: -2rpx;
  left: 50%;
  width: 1rpx;
  background: #dde7e0;
}

.process-copy {
  flex: 1;
  min-width: 0;
  padding-top: 1rpx;
}

.process-label,
.process-hint {
  display: block;
}

.process-label {
  font-size: 24rpx;
  font-weight: 600;
}

.process-hint {
  margin-top: 2rpx;
  color: #79867f;
  font-size: 19rpx;
  line-height: 1.4;
}

.process-state {
  flex: none;
  padding-top: 3rpx;
  color: #9aa49f;
  font-size: 18rpx;
}

.process-step.done .process-node {
  border-color: #176b52;
  background: #176b52;
  color: #ffffff;
}

.process-step.done .process-line {
  background: #9ec5b5;
}

.process-step.done .process-label {
  color: #176b52;
}

.process-step.done .process-state {
  color: #3f7452;
}

.process-step.active .process-node {
  border-color: #176b52;
  background: #e6f2ec;
  color: #115640;
  font-weight: 700;
}

.process-step.active .process-label {
  color: #103b2d;
  font-weight: 700;
}

.process-step.active .process-state {
  color: #176b52;
  font-weight: 700;
}

.related-card {
  margin-top: 18rpx;
  padding: 20rpx 22rpx;
}

.checkin-card {
  margin-top: 18rpx;
  padding: 20rpx 22rpx;
  border-left: 6rpx solid #176b52;
}

.checkin-head {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.checkin-title {
  flex: 1;
  font-size: 26rpx;
  font-weight: 700;
  color: #1c2b25;
}

.checkin-badge {
  padding: 4rpx 12rpx;
  border-radius: 999rpx;
  background: #e6f2ec;
  color: #176b52;
  font-size: 20rpx;
  font-weight: 600;
}

.checkin-row {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  margin-top: 12rpx;
}

.checkin-label {
  width: 120rpx;
  flex: none;
  color: #77857e;
  font-size: 22rpx;
}

.checkin-value {
  flex: 1;
  color: #26362f;
  font-size: 23rpx;
  line-height: 1.5;
  word-break: break-all;
}

.related-title {
  display: block;
  margin-bottom: 8rpx;
  font-size: 26rpx;
  font-weight: 700;
}

.related-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 12rpx 0;
  border-top: 1rpx solid #e5ece7;
}

.related-icon {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  border-radius: 12rpx;
  background: #e6f2ec;
}

.related-copy {
  flex: 1;
  min-width: 0;
}

.related-name,
.related-meta {
  display: block;
}

.related-name {
  font-size: 23rpx;
  font-weight: 600;
}

.related-meta {
  margin-top: 2rpx;
  color: #65736c;
  font-size: 19rpx;
}

.related-count {
  flex: none;
  color: #176b52;
  font-size: 19rpx;
}

.section-block {
  margin-top: 32rpx;
}

.section-count {
  color: #65736c;
  font-size: 22rpx;
}

.info-card,
.material-card {
  padding: 0 22rpx;
}

.info-row,
.material-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 22rpx;
  padding: 18rpx 0;
  border-bottom: 1rpx solid #e5ece7;
}

.info-row:last-child,
.material-row:last-child {
  border-bottom: 0;
}

.info-label {
  flex: none;
  color: #65736c;
  font-size: 24rpx;
}

.info-value {
  color: #17211d;
  font-size: 25rpx;
  text-align: right;
  word-break: break-all;
}

.phone-value {
  display: flex;
  align-items: center;
  gap: 6rpx;
  color: #176b52;
  font-size: 25rpx;
  font-weight: 600;
}

.person-value {
  display: flex;
  align-items: center;
  gap: 8rpx;
  color: #17211d;
  font-size: 25rpx;
  font-weight: 600;
}

.site-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.site-card {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  padding: 20rpx;
}

.site-index {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  border-radius: 12rpx;
  background: #e6f2ec;
  color: #176b52;
  font-family: "SFMono-Regular", "Cascadia Code", monospace;
  font-size: 20rpx;
  font-weight: 700;
}

.site-copy {
  flex: 1;
  min-width: 0;
}

.site-name,
.site-type,
.site-remark {
  display: block;
}

.site-name {
  font-size: 27rpx;
  font-weight: 700;
}

.site-type {
  margin-top: 5rpx;
  color: #65736c;
  font-size: 22rpx;
}

.site-remark {
  margin-top: 6rpx;
  color: #79867f;
  font-size: 21rpx;
}

.site-photo-stats {
  flex: none;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  color: #176b52;
  font-size: 20rpx;
  text-align: right;
}

.material-copy {
  flex: 1;
  min-width: 0;
}

.material-name,
.material-spec {
  display: block;
}

.material-name {
  font-size: 26rpx;
  font-weight: 600;
}

.material-spec {
  margin-top: 4rpx;
  color: #65736c;
  font-size: 21rpx;
}

.material-qty {
  flex: none;
  color: #176b52;
  font-size: 25rpx;
  font-weight: 700;
}

.compact-empty {
  padding: 34rpx 20rpx;
}

.reject-card {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  margin-top: 28rpx;
  padding: 20rpx 22rpx;
  border: 1rpx solid #eccfca;
  border-radius: 16rpx;
  background: #f8ebe9;
}

.reject-title,
.reject-copy {
  display: block;
}

.reject-title {
  color: #8e3a33;
  font-size: 24rpx;
  font-weight: 700;
}

.reject-copy {
  margin-top: 5rpx;
  color: #8e3a33;
  font-size: 22rpx;
  line-height: 1.5;
}

.bottom-actions {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 30;
  display: flex;
  gap: 12rpx;
  padding: 18rpx 32rpx;
  border-top: 1rpx solid #dde7e0;
  background: rgba(245, 248, 244, 0.98);
}

.bottom-button {
  flex: 1;
  min-height: 80rpx;
}

.skeleton-card {
  padding: 24rpx;
}

.skeleton-line {
  width: 100%;
  height: 18rpx;
  margin-top: 16rpx;
  border-radius: 8rpx;
  background: #e8efea;
}

.skeleton-line:first-child {
  margin-top: 0;
}

.skeleton-line.short {
  width: 34%;
}

.skeleton-line.medium {
  width: 70%;
}

.retry-button {
  margin-top: 22rpx;
}

/* Unified field-console visual system */
.detail-page {
  background: #f4f7f5;
}

.order-hero {
  margin-top: 24rpx;
  padding: 24rpx;
  border-color: #dde7e0;
  background: #ffffff;
  color: #17211d;
}

.order-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
}

.order-service {
  color: #176b52;
  font-size: 20rpx;
  font-weight: 700;
}

.order-customer {
  margin-top: 8rpx;
  color: #17211d;
  font-size: 40rpx;
  line-height: 1.25;
}

.order-address-row {
  align-items: center;
  margin-top: 12rpx;
}

.order-address {
  color: #5d6e65;
  font-size: 22rpx;
  line-height: 1.55;
}

.copy-address {
  padding: 7rpx 10rpx;
  border-radius: 8rpx;
  background: #f0f7f3;
  color: #176b52;
  font-size: 19rpx;
  font-weight: 600;
}

.order-quick {
  margin-top: 22rpx;
  padding-top: 18rpx;
  border-top-color: #e5ece7;
}

.quick-label {
  color: #79867f;
  font-size: 19rpx;
}

.quick-value {
  margin-top: 3rpx;
  color: #24352e;
  font-size: 23rpx;
  font-weight: 700;
}

.call-button {
  height: 62rpx;
  padding: 0 18rpx;
  border-radius: 10rpx;
  background: #103b2d;
  color: #ffffff;
  font-size: 21rpx;
}

.detail-content {
  padding-top: 20rpx;
}

.next-step-card {
  padding: 28rpx;
  text-align: center;
}

.next-step-kicker {
  display: block;
  color: #176b52;
  font-size: 22rpx;
  font-weight: 700;
}

.next-step-title {
  display: block;
  margin-top: 8rpx;
  color: #17211d;
  font-size: 38rpx;
  font-weight: 700;
  line-height: 1.3;
}

.next-step-hint {
  display: block;
  margin-top: 10rpx;
  color: #65736c;
  font-size: 25rpx;
  line-height: 1.6;
}

.next-step-progress {
  height: 8rpx;
  overflow: hidden;
  margin-top: 22rpx;
  border-radius: 8rpx;
  background: #e4ebe6;
}

.next-step-progress-fill {
  height: 100%;
  border-radius: 8rpx;
  background: #176b52;
}

.checkin-target {
  display: flex;
  align-items: flex-start;
  gap: 14rpx;
  margin-top: 24rpx;
  padding: 18rpx;
  border: 1rpx solid #d9e6de;
  border-radius: 12rpx;
  background: #f5f9f6;
  text-align: left;
}

.checkin-target-icon {
  width: 52rpx;
  height: 52rpx;
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  border-radius: 10rpx;
  background: #e6f2ec;
}

.checkin-target-copy {
  flex: 1;
  min-width: 0;
}

.checkin-target-title,
.checkin-target-address,
.checkin-target-meta {
  display: block;
}

.checkin-target-title {
  color: #24352e;
  font-size: 27rpx;
  font-weight: 700;
}

.checkin-target-address {
  margin-top: 6rpx;
  color: #53635a;
  font-size: 25rpx;
  line-height: 1.55;
}

.checkin-target-meta {
  margin-top: 5rpx;
  color: #79867f;
  font-size: 22rpx;
}

.workflow-card {
  padding: 24rpx;
}

.workflow-kicker {
  color: #176b52;
  font-size: 19rpx;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
}

.workflow-title {
  margin-top: 6rpx;
  color: #17211d;
  font-size: 32rpx;
}

.workflow-percent {
  color: #176b52;
  font-size: 30rpx;
}

.workflow-progress {
  height: 7rpx;
  margin-top: 16rpx;
  background: #e5ece7;
}

.workflow-progress-fill {
  background: #176b52;
}

.process-scroll {
  width: 100%;
  margin-top: 20rpx;
  white-space: nowrap;
}

.process-track {
  display: flex;
  width: max-content;
  gap: 10rpx;
  padding-right: 12rpx;
}

.process-step {
  width: 148rpx;
  min-height: 144rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 0;
  padding: 16rpx 10rpx 14rpx;
  border: 1rpx solid #dde7e0;
  border-radius: 12rpx;
  background: #f8fbf9;
  white-space: normal;
}

.process-node {
  width: 36rpx;
  height: 36rpx;
  border-color: #d5e0d7;
  background: #ffffff;
  color: #8a958f;
  font-size: 17rpx;
}

.process-label {
  display: block;
  margin-top: 10rpx;
  color: #50635a;
  font-size: 20rpx;
  font-weight: 600;
  line-height: 1.35;
  text-align: center;
}

.process-state {
  margin-top: 5rpx;
  padding: 0;
  color: #8d9992;
  font-size: 18rpx;
  line-height: 1.3;
}

.process-step.done {
  border-color: #d8e8de;
  background: #f4f9f5;
}

.process-step.done .process-node {
  border-color: #176b52;
  background: #176b52;
}

.process-step.done .process-label,
.process-step.done .process-state {
  color: #2f7656;
}

.process-step.active {
  border-color: #176b52;
  background: #eff6f2;
}

.process-step.active .process-node {
  border-color: #176b52;
  background: #e6f2ec;
  color: #115640;
}

.process-step.active .process-label {
  color: #115640;
  font-weight: 700;
}

.process-step.active .process-state {
  color: #176b52;
  font-weight: 700;
}

.workflow-hint {
  display: block;
  margin-top: 16rpx;
  padding: 14rpx 16rpx;
  border-radius: 10rpx;
  background: #f5f9f6;
  color: #5d6e65;
  font-size: 21rpx;
  line-height: 1.55;
}

.workflow-report-link {
  display: flex;
  align-items: center;
  gap: 6rpx;
  margin-top: 12rpx;
  padding: 13rpx 16rpx;
  border: 1rpx solid #d8e8de;
  border-radius: 10rpx;
  background: #f5f9fc;
  color: #176b52;
  font-size: 21rpx;
  font-weight: 600;
}

.workflow-report-link text {
  flex: 1;
}

.related-card {
  margin-top: 16rpx;
  padding: 22rpx 24rpx;
}

.related-title {
  margin-bottom: 6rpx;
  color: #17211d;
  font-size: 24rpx;
}

.related-row {
  padding: 14rpx 0;
  border-top-color: #e5ece7;
}

.related-icon {
  background: #e6f2ec;
}

.related-name {
  color: #24352e;
}

.related-meta {
  color: #79867f;
}

.related-count {
  color: #176b52;
}

.section-block {
  margin-top: 34rpx;
}

.info-card,
.material-card {
  padding: 0 24rpx;
}

.info-row,
.material-row {
  padding: 19rpx 0;
  border-bottom-color: #e5ece7;
}

.info-label {
  color: #79867f;
  font-size: 22rpx;
}

.info-value {
  color: #24352e;
  font-size: 23rpx;
}

.phone-value,
.person-value {
  color: #176b52;
  font-size: 23rpx;
}

.site-card {
  padding: 20rpx 22rpx;
}

.site-index {
  background: #e6f2ec;
  color: #176b52;
}

.site-name {
  color: #17211d;
  font-size: 26rpx;
}

.site-type,
.site-remark {
  color: #6b7a72;
  font-size: 21rpx;
}

.site-photo-stats {
  color: #176b52;
  font-size: 19rpx;
}

.material-name {
  color: #24352e;
}

.material-qty {
  color: #176b52;
}

.reject-card {
  border-color: #ebd0cd;
  background: #f8ebe9;
}

.bottom-actions {
  padding: 16rpx 28rpx;
  border-top-color: #dde7e0;
  background: #ffffff;
  box-shadow: 0 -10rpx 32rpx rgba(18, 34, 27, 0.07);
}

.bottom-button {
  min-height: 48px;
}

.skeleton-line {
  background: #e8efea;
}

.sheet-mask {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: flex-end;
  background: rgba(15, 29, 23, 0.42);
}

.dispatch-sheet {
  width: 100%;
  max-height: 72vh;
  padding: 26rpx 28rpx calc(28rpx + env(safe-area-inset-bottom));
  border-radius: 24rpx 24rpx 0 0;
  background: #ffffff;
  box-shadow: 0 -18rpx 48rpx rgba(18, 34, 27, 0.14);
}

.dispatch-sheet-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20rpx;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #e5ece7;
}

.dispatch-sheet-copy {
  min-width: 0;
}

.dispatch-sheet-title,
.dispatch-sheet-sub {
  display: block;
}

.dispatch-sheet-title {
  color: #17211d;
  font-size: 30rpx;
  font-weight: 700;
}

.dispatch-sheet-sub {
  margin-top: 5rpx;
  color: #79867f;
  font-size: 20rpx;
}

.sheet-close {
  width: 54rpx;
  height: 54rpx;
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  border-radius: 10rpx;
  background: #f4f7fa;
}

.engineer-list {
  max-height: 54vh;
  margin-top: 8rpx;
}

.engineer-row {
  display: flex;
  align-items: center;
  gap: 14rpx;
  padding: 18rpx 4rpx;
  border-bottom: 1rpx solid #eef2f5;
}

.engineer-row:last-child {
  border-bottom: 0;
}

.engineer-row.disabled {
  opacity: 0.55;
}

.engineer-copy {
  flex: 1;
  min-width: 0;
}

.engineer-name,
.engineer-meta {
  display: block;
}

.engineer-name {
  color: #24352e;
  font-size: 26rpx;
  font-weight: 700;
}

.engineer-meta {
  margin-top: 4rpx;
  color: #79867f;
  font-size: 20rpx;
}

.engineer-loading,
.engineer-empty {
  padding: 42rpx 20rpx;
  color: #79867f;
  font-size: 22rpx;
  text-align: center;
}

.engineer-empty-title,
.engineer-empty-copy {
  display: block;
}

.engineer-empty-title {
  color: #24352e;
  font-size: 24rpx;
  font-weight: 700;
}

.engineer-empty-copy {
  margin-top: 6rpx;
  color: #79867f;
  font-size: 20rpx;
}

.next-step-kicker,
.workflow-kicker {
  font-size: max(12px, 20rpx);
}

.next-step-title {
  font-size: max(19px, 32rpx);
}

.next-step-hint,
.checkin-target-address,
.info-value,
.phone-value,
.person-value {
  font-size: max(13px, 23rpx);
}

.checkin-target-title,
.related-name,
.site-name,
.material-name {
  font-size: max(14px, 24rpx);
}

.checkin-target-meta,
.info-label,
.related-meta,
.site-type,
.site-remark,
.workflow-hint {
  font-size: max(12px, 20rpx);
}

.order-customer {
  font-size: max(20px, 32rpx);
}

.order-service,
.quick-label {
  font-size: max(12px, 20rpx);
}

.order-address,
.quick-value {
  font-size: max(13px, 22rpx);
}

.process-label {
  font-size: max(12px, 18rpx);
}

.process-state {
  font-size: max(11px, 16rpx);
}

/* Soft rounded business surfaces */
.call-button,
.workflow-report-link,
.sheet-close {
  border-radius: 999px;
}

.workflow-hint,
.checkin-target,
.related-card,
.engineer-row {
  border-radius: 18rpx;
}

.checkin-target-icon {
  border-radius: 16rpx;
}

.dispatch-sheet {
  border-radius: 32rpx 32rpx 0 0;
}
</style>
