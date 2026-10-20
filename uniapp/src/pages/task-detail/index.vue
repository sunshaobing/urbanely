<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import UniIcons from "@dcloudio/uni-ui/lib/uni-icons/uni-icons.vue";
import CartoonAvatar from "../../components/CartoonAvatar.vue";
import PageHeader from "../../components/PageHeader.vue";
import StatusPill from "../../components/StatusPill.vue";
import {
  checkinServiceReport,
  getRiskSurvey,
  getRiskSurveys,
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
import { getSession } from "../../utils/auth";
import { ensureBrand } from "../../utils/brand";
import { openReportPdf, reportPdfPath } from "../../utils/pdf";
import { displayDate, displayDay } from "../../utils/present";
import {
  fieldHome,
  ownTasks,
  roleMode,
} from "../../utils/roles";
import {
  deriveWorkflow,
  dispatchPayload,
  relatedRiskSurvey,
  relatedServiceReport,
  riskSurveyUpdatePayload,
  serviceReportUpdatePayload,
} from "../../utils/workflow";
import type {
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

const workflow = computed(() =>
  task.value
    ? deriveWorkflow(task.value, survey.value, serviceReport.value)
    : { steps: [], currentIndex: 0 },
);
const roleView = computed(() => roleMode(session.value?.role || ""));
const visibleStepKeys = computed(() => {
  if (roleView.value === "survey") {
    return ["survey", "surveySign", "surveyApproval"];
  }
  if (roleView.value === "sealing") {
    return [
      "accept",
      "checkin",
      "beforePhotos",
      "afterPhotos",
      "sealSign",
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
const canApprove = computed(() =>
  ["super_admin", "admin", "supervisor"].includes(session.value?.role || ""),
);
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
  if (key === "surveySign") return "完成勘测双签";
  if (key === "surveyApproval") return canApprove.value ? "审批勘测报告" : "等待审批";
  if (key === "dispatch") return canApprove.value ? "派单给封堵" : "等待派单";
  if (key === "accept") return "封堵接单";
  if (key === "checkin") return "现场签到";
  if (key === "beforePhotos") return "补拍施工前影像";
  if (key === "afterPhotos") return "补拍施工后影像";
  if (key === "sealSign") return "完成封堵报告双签";
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
    survey.value && currentStep.value?.key === "surveySign" ? 4 : 0;
  const surveyQuery = survey.value ? `&surveyId=${survey.value.id}` : "";
  uni.navigateTo({
    url: `/pages/risk-survey/index?taskId=${task.value.id}${surveyQuery}&step=${targetStep}`,
  });
}

function openServiceReport() {
  if (!task.value) return;
  if (!serviceReport.value) {
    uni.showToast({ title: "请先完成勘测审批并派单", icon: "none" });
    return;
  }
  const step =
    currentStep.value?.key === "sealSign"
      ? 4
      : currentStep.value?.key === "beforePhotos" ||
          currentStep.value?.key === "afterPhotos"
        ? 2
        : 0;
  uni.navigateTo({
    url: `/pages/service-report/index?taskId=${task.value.id}&reportId=${serviceReport.value.id}&step=${step}`,
  });
}

async function approveSurvey() {
  if (!survey.value) {
    uni.showToast({ title: "尚未生成勘测记录", icon: "none" });
    return;
  }
  const fullSurvey = await getRiskSurvey(survey.value.id);
  await saveRiskSurvey(
    survey.value.id,
    riskSurveyUpdatePayload(fullSurvey, { status: "approved" }),
  );
  uni.showToast({ title: "勘测报告已审批", icon: "success" });
}

async function dispatchSealing() {
  if (!task.value || !session.value) return;
  if (!task.value.customer_id) {
    throw new Error("作业单缺少客户ID，无法派单");
  }
  const created = await saveServiceReport(
    0,
    dispatchPayload(task.value, session.value),
  );
  if (!toId(created)) {
    throw new Error("派单成功但服务端未返回封堵单编号");
  }
  uni.showToast({ title: "已派单给封堵", icon: "success" });
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

function currentLocation() {
  return new Promise<string>((resolve) => {
    uni.getLocation({
      type: "gcj02",
      success: (result) =>
        resolve(`${result.latitude.toFixed(6)},${result.longitude.toFixed(6)}`),
      fail: () => resolve(task.value?.service_address || "现场签到"),
    });
  });
}

async function checkIn() {
  if (!serviceReport.value) {
    throw new Error("尚未生成封堵单");
  }
  const location = await currentLocation();
  await checkinServiceReport(serviceReport.value.id, location);
  uni.showToast({ title: "现场签到成功", icon: "success" });
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
  if (["beforePhotos", "afterPhotos", "sealSign"].includes(key)) {
    openServiceReport();
    return;
  }
  actionLoading.value = true;
  try {
    if (key === "surveyApproval") await approveSurvey();
    else if (key === "dispatch") await dispatchSealing();
    else if (key === "accept") await acceptSealing();
    else if (key === "checkin") await checkIn();
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
        <StatusPill v-if="task" :status="task.status" />
      </template>

      <view v-if="task" class="order-hero card">
        <view class="order-main">
          <text class="order-service">{{ task.service_type || "结构漏洞封堵" }}</text>
          <text class="order-customer">{{ task.customer_name }}</text>
        </view>
        <view class="order-address-row">
          <text class="order-address">{{ task.service_address || "服务地址待补充" }}</text>
          <view class="copy-address" @tap="copyAddress">
            <UniIcons type="map-pin" size="14" color="#1f6fb2" />
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
        </view>

        <view v-if="survey || serviceReport" class="related-card card">
          <text class="related-title">关联单据</text>
          <view v-if="survey" class="related-row">
            <view class="related-icon">
              <UniIcons type="search" size="17" color="#1f6fb2" />
            </view>
            <view class="related-copy">
              <text class="related-name">勘测报告</text>
              <text class="related-meta">{{ survey.code || `#${survey.id}` }} · {{ survey.status }}</text>
            </view>
            <text class="related-count">{{ survey.signatures?.length || 0 }}/2 签</text>
          </view>
          <view v-if="serviceReport" class="related-row">
            <view class="related-icon">
              <UniIcons type="compose" size="17" color="#1f6fb2" />
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
                  color="#1f6fb2"
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
          <UniIcons type="refreshempty" size="18" color="#1f6fb2" />
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
    </template>
  </view>
</template>

<style scoped>
.order-hero {
  margin-top: 28rpx;
}

.order-service {
  display: block;
  color: #b6d4eb;
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
  color: #b6d4eb;
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
  background: #e9f2fa;
  color: #173550;
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
  color: #1f6fb2;
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
  color: #667383;
  font-size: 21rpx;
}

.workflow-percent {
  flex: none;
  color: #1f6fb2;
  font-family: "SFMono-Regular", "Cascadia Code", monospace;
  font-size: 28rpx;
  font-weight: 700;
}

.workflow-progress {
  height: 8rpx;
  overflow: hidden;
  margin-top: 18rpx;
  border-radius: 8rpx;
  background: #e8edf3;
}

.workflow-progress-fill {
  height: 100%;
  border-radius: 8rpx;
  background: #1f6fb2;
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
  background: #f7f9fc;
  color: #8a96a4;
  font-family: "SFMono-Regular", "Cascadia Code", monospace;
  font-size: 16rpx;
}

.process-line {
  position: absolute;
  top: 34rpx;
  bottom: -2rpx;
  left: 50%;
  width: 1rpx;
  background: #dfe5ec;
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
  color: #7c8897;
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
  border-color: #1f6fb2;
  background: #1f6fb2;
  color: #ffffff;
}

.process-step.done .process-line {
  background: #9ec5b5;
}

.process-step.done .process-label {
  color: #1f6fb2;
}

.process-step.done .process-state {
  color: #3f7452;
}

.process-step.active .process-node {
  border-color: #1f6fb2;
  background: #e9f2fa;
  color: #1a568c;
  font-weight: 700;
}

.process-step.active .process-label {
  color: #173550;
  font-weight: 700;
}

.process-step.active .process-state {
  color: #1f6fb2;
  font-weight: 700;
}

.related-card {
  margin-top: 18rpx;
  padding: 20rpx 22rpx;
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
  border-top: 1rpx solid #e6ebf1;
}

.related-icon {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  border-radius: 12rpx;
  background: #e9f2fa;
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
  color: #667383;
  font-size: 19rpx;
}

.related-count {
  flex: none;
  color: #1f6fb2;
  font-size: 19rpx;
}

.section-block {
  margin-top: 32rpx;
}

.section-count {
  color: #667383;
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
  border-bottom: 1rpx solid #e6ebf1;
}

.info-row:last-child,
.material-row:last-child {
  border-bottom: 0;
}

.info-label {
  flex: none;
  color: #667383;
  font-size: 24rpx;
}

.info-value {
  color: #182331;
  font-size: 25rpx;
  text-align: right;
  word-break: break-all;
}

.phone-value {
  display: flex;
  align-items: center;
  gap: 6rpx;
  color: #1f6fb2;
  font-size: 25rpx;
  font-weight: 600;
}

.person-value {
  display: flex;
  align-items: center;
  gap: 8rpx;
  color: #182331;
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
  background: #e9f2fa;
  color: #1f6fb2;
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
  color: #667383;
  font-size: 22rpx;
}

.site-remark {
  margin-top: 6rpx;
  color: #7c8897;
  font-size: 21rpx;
}

.site-photo-stats {
  flex: none;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  color: #1f6fb2;
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
  color: #667383;
  font-size: 21rpx;
}

.material-qty {
  flex: none;
  color: #1f6fb2;
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
  border-top: 1rpx solid #dfe5ec;
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
  background: #e8edf3;
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
  background: #f3f6fa;
}

.order-hero {
  margin-top: 24rpx;
  padding: 24rpx;
  border-color: #dfe5ec;
  background: #ffffff;
  color: #182331;
}

.order-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
}

.order-service {
  color: #1f6fb2;
  font-size: 20rpx;
  font-weight: 700;
}

.order-customer {
  margin-top: 8rpx;
  color: #182331;
  font-size: 40rpx;
  line-height: 1.25;
}

.order-address-row {
  align-items: center;
  margin-top: 12rpx;
}

.order-address {
  color: #5e6d7d;
  font-size: 22rpx;
  line-height: 1.55;
}

.copy-address {
  padding: 7rpx 10rpx;
  border-radius: 8rpx;
  background: #f0f6fb;
  color: #1f6fb2;
  font-size: 19rpx;
  font-weight: 600;
}

.order-quick {
  margin-top: 22rpx;
  padding-top: 18rpx;
  border-top-color: #e6ebf1;
}

.quick-label {
  color: #7c8897;
  font-size: 19rpx;
}

.quick-value {
  margin-top: 3rpx;
  color: #243244;
  font-size: 23rpx;
  font-weight: 700;
}

.call-button {
  height: 62rpx;
  padding: 0 18rpx;
  border-radius: 10rpx;
  background: #173550;
  color: #ffffff;
  font-size: 21rpx;
}

.detail-content {
  padding-top: 20rpx;
}

.workflow-card {
  padding: 24rpx;
}

.workflow-kicker {
  color: #1f6fb2;
  font-size: 19rpx;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
}

.workflow-title {
  margin-top: 6rpx;
  color: #182331;
  font-size: 32rpx;
}

.workflow-percent {
  color: #1f6fb2;
  font-size: 30rpx;
}

.workflow-progress {
  height: 7rpx;
  margin-top: 16rpx;
  background: #e6ebf1;
}

.workflow-progress-fill {
  background: #1f6fb2;
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
  border: 1rpx solid #dfe5ec;
  border-radius: 12rpx;
  background: #f8fafc;
  white-space: normal;
}

.process-node {
  width: 36rpx;
  height: 36rpx;
  border-color: #d5dee8;
  background: #ffffff;
  color: #8a958f;
  font-size: 17rpx;
}

.process-label {
  display: block;
  margin-top: 10rpx;
  color: #506173;
  font-size: 20rpx;
  font-weight: 600;
  line-height: 1.35;
  text-align: center;
}

.process-state {
  margin-top: 5rpx;
  padding: 0;
  color: #8f9ba9;
  font-size: 18rpx;
  line-height: 1.3;
}

.process-step.done {
  border-color: #d8e5f0;
  background: #f4f8fc;
}

.process-step.done .process-node {
  border-color: #1f6fb2;
  background: #1f6fb2;
}

.process-step.done .process-label,
.process-step.done .process-state {
  color: #2f7656;
}

.process-step.active {
  border-color: #1f6fb2;
  background: #eff5fb;
}

.process-step.active .process-node {
  border-color: #1f6fb2;
  background: #e9f2fa;
  color: #1a568c;
}

.process-step.active .process-label {
  color: #1a568c;
  font-weight: 700;
}

.process-step.active .process-state {
  color: #1f6fb2;
  font-weight: 700;
}

.workflow-hint {
  display: block;
  margin-top: 16rpx;
  padding: 14rpx 16rpx;
  border-radius: 10rpx;
  background: #f5f8fb;
  color: #5e6d7d;
  font-size: 21rpx;
  line-height: 1.55;
}

.related-card {
  margin-top: 16rpx;
  padding: 22rpx 24rpx;
}

.related-title {
  margin-bottom: 6rpx;
  color: #182331;
  font-size: 24rpx;
}

.related-row {
  padding: 14rpx 0;
  border-top-color: #e6ebf1;
}

.related-icon {
  background: #e9f2fa;
}

.related-name {
  color: #243244;
}

.related-meta {
  color: #7c8897;
}

.related-count {
  color: #1f6fb2;
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
  border-bottom-color: #e6ebf1;
}

.info-label {
  color: #7c8897;
  font-size: 22rpx;
}

.info-value {
  color: #243244;
  font-size: 23rpx;
}

.phone-value,
.person-value {
  color: #1f6fb2;
  font-size: 23rpx;
}

.site-card {
  padding: 20rpx 22rpx;
}

.site-index {
  background: #e9f2fa;
  color: #1f6fb2;
}

.site-name {
  color: #182331;
  font-size: 26rpx;
}

.site-type,
.site-remark {
  color: #6d7b8a;
  font-size: 21rpx;
}

.site-photo-stats {
  color: #1f6fb2;
  font-size: 19rpx;
}

.material-name {
  color: #243244;
}

.material-qty {
  color: #1f6fb2;
}

.reject-card {
  border-color: #ebd0cd;
  background: #f8ebe9;
}

.bottom-actions {
  padding: 16rpx 28rpx;
  border-top-color: #dfe5ec;
  background: #ffffff;
  box-shadow: 0 -10rpx 32rpx rgba(18, 34, 27, 0.07);
}

.bottom-button {
  min-height: 84rpx;
}

.skeleton-line {
  background: #e8edf3;
}
</style>
