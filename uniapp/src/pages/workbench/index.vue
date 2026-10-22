<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad, onPullDownRefresh, onShow } from "@dcloudio/uni-app";
import UniIcons from "@dcloudio/uni-ui/lib/uni-icons/uni-icons.vue";
import AppTabBar from "../../components/AppTabBar.vue";
import BrandLogo from "../../components/BrandLogo.vue";
import CartoonAvatar from "../../components/CartoonAvatar.vue";
import StatusPill from "../../components/StatusPill.vue";
import {
  getServiceReports,
  getWorkOrders,
  normalizeServiceReports,
} from "../../utils/api";
import { getSession } from "../../utils/auth";
import { ensureBrand } from "../../utils/brand";
import { displayDay, roleLabel, todayLabel } from "../../utils/present";
import {
  isCompletedTask,
  ownTasks,
  reportMatchesTask,
  roleMode,
  type FieldMode,
} from "../../utils/roles";
import type { ServiceReport, Session, WorkOrder } from "../../utils/types";

const session = ref<Session | null>(null);
const fieldKind = ref<"" | "risk" | "sealing">("");
const roleView = ref<FieldMode>("both");
const activeGroup = ref<"open" | "done">("open");
const allTasks = ref<WorkOrder[]>([]);
const serviceReports = ref<ServiceReport[]>([]);
const loading = ref(false);
const error = ref("");
const updatedAt = ref("");

const effectiveKind = computed<"" | "risk" | "sealing">(() => {
  if (roleView.value === "survey") return "risk";
  if (roleView.value === "sealing") return "sealing";
  return fieldKind.value;
});
const pageTitle = computed(() => {
  if (roleView.value === "survey") return "勘测工作台";
  if (roleView.value === "sealing") return "封堵工作台";
  return effectiveKind.value === "risk"
    ? "勘测任务"
    : effectiveKind.value === "sealing"
      ? "封堵任务"
      : "现场任务";
});
const actionText = computed(() =>
  effectiveKind.value === "risk"
    ? "处理勘测"
    : effectiveKind.value === "sealing"
      ? "处理封堵"
      : "查看任务",
);
const tabCurrent = computed<"workbench" | "risk" | "sealing">(() =>
  effectiveKind.value === "risk"
    ? "risk"
    : effectiveKind.value === "sealing"
      ? "sealing"
      : "workbench",
);
const activeLabel = computed(() =>
  activeGroup.value === "open" ? "未完成" : "已完成",
);
const scopedTasks = computed(() =>
  roleView.value === "both" && effectiveKind.value === "sealing"
    ? allTasks.value.filter((task) =>
        serviceReports.value.some((report) =>
          reportMatchesTask(report, task),
        ),
      )
    : allTasks.value,
);
const visibleTasks = computed(() =>
  scopedTasks.value.filter((task) =>
    activeGroup.value === "done" ? isCompletedTask(task) : !isCompletedTask(task),
  ),
);
const openCount = computed(
  () => scopedTasks.value.filter((task) => !isCompletedTask(task)).length,
);
const doneCount = computed(
  () => scopedTasks.value.filter((task) => isCompletedTask(task)).length,
);
const totalHoles = computed(() =>
  scopedTasks.value.reduce((sum, task) => sum + (task.sites?.length || 0), 0),
);
const taskMetricLabel = computed(() =>
  roleView.value === "both" && effectiveKind.value === "sealing"
    ? "封堵任务"
    : roleView.value === "both"
      ? "任务总数"
      : "我的任务",
);
const workbenchLead = computed(() =>
  activeGroup.value === "open"
    ? `今天还有 ${openCount.value} 个任务`
    : `已完成 ${doneCount.value} 个任务`,
);
const workbenchSub = computed(
  () =>
    `${todayLabel()} · ${session.value?.name || "现场人员"} · ${roleLabel(
      session.value?.role || "",
    )}`,
);
const groupOptions = computed(() => [
  { value: "open" as const, label: "未完成", count: openCount.value },
  { value: "done" as const, label: "已完成", count: doneCount.value },
]);

function errorText(value: unknown) {
  return value instanceof Error ? value.message : "现场数据加载失败";
}

async function load() {
  const current = getSession();
  if (!current) {
    uni.reLaunch({ url: "/pages/login/index" });
    return;
  }
  if (loading.value) return;
  session.value = current;
  roleView.value = roleMode(current.role);
  if (roleView.value === "none") {
    uni.reLaunch({ url: "/pages/profile/index" });
    return;
  }
  void ensureBrand();
  loading.value = true;
  error.value = "";
  try {
    const orders = await getWorkOrders(
      "",
      1,
      200,
      roleView.value === "survey" ? current.id : 0,
    );
    let reports: ServiceReport[] = [];
    if (roleView.value === "sealing" || roleView.value === "both") {
      try {
        reports = normalizeServiceReports(await getServiceReports());
      } catch {
        reports = [];
      }
    }
    serviceReports.value = reports;
    allTasks.value = ownTasks(orders.items, current, roleView.value, reports);
    const now = new Date();
    updatedAt.value = `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes(),
    ).padStart(2, "0")}`;
  } catch (loadError) {
    error.value = errorText(loadError);
    allTasks.value = [];
  } finally {
    loading.value = false;
  }
}

function selectGroup(group: "open" | "done") {
  activeGroup.value = group;
}

function taskServiceReport(task: WorkOrder) {
  return serviceReports.value.find((report) =>
    reportMatchesTask(report, task),
  );
}

function taskDisplayStatus(task: WorkOrder) {
  if (effectiveKind.value !== "sealing") return task.status;
  const report = taskServiceReport(task);
  if (!report) return task.status;
  if (report.status === "pending" && !report.service_person) return "unassigned";
  return report.status;
}

function openTask(task: WorkOrder) {
  uni.navigateTo({ url: `/pages/task-detail/index?id=${task.id}` });
}

function openReports() {
  uni.reLaunch({ url: "/pages/reports/index" });
}

function openProfile() {
  uni.reLaunch({ url: "/pages/profile/index" });
}

onLoad((query) => {
  const kind = query?.kind;
  const current = getSession();
  const mode = roleMode(current?.role || "");
  fieldKind.value =
    mode === "survey"
      ? "risk"
      : mode === "sealing"
        ? "sealing"
        : kind === "risk" || kind === "sealing"
          ? kind
          : "";
});

onShow(() => {
  void load();
});

onPullDownRefresh(async () => {
  await load();
  uni.stopPullDownRefresh();
});
</script>

<template>
  <view class="page workbench-page">
    <view class="workbench-header">
      <view class="brand-row">
        <view class="brand-spacer" />
        <BrandLogo :size="36" show-name :name-size="16" />
        <view class="profile-shortcut" @tap="openProfile">
          <CartoonAvatar :name="session?.name || '现场人员'" :size="30" />
          <view class="profile-online" />
        </view>
      </view>

      <view class="page-heading">
        <view class="heading-copy">
          <text class="page-title">{{ workbenchLead }}</text>
          <text class="page-subtitle">{{ workbenchSub }}</text>
        </view>
      </view>
    </view>

    <view class="page-content workbench-content">
      <view class="sync-row">
        <view class="sync-copy">
          <view class="sync-line">
            <view class="sync-dot" />
            <text>现场数据已同步</text>
          </view>
          <text class="sync-meta">
            {{ totalHoles }} 个封堵部位 · {{ updatedAt ? `更新于 ${updatedAt}` : "正在同步" }}
          </text>
        </view>
        <view class="refresh-button" @tap="load">
          <UniIcons type="refreshempty" size="17" color="#176b52" />
        </view>
      </view>

      <view v-if="error" class="error-banner">
        <UniIcons type="info-filled" size="18" color="#a8443c" />
        <view class="error-banner-copy">
          <text class="error-banner-title">数据未加载</text>
          <text class="error-copy">{{ error }}</text>
        </view>
        <view class="error-retry" @tap="load">重试</view>
      </view>

      <view class="task-section-head">
        <view>
          <text class="section-title">我的任务</text>
          <text class="section-copy">{{ taskMetricLabel }} · {{ activeLabel }}</text>
        </view>
        <view v-if="roleView === 'both'" class="reports-link" @tap="openReports">
          <text>全部报告</text>
          <UniIcons type="right" size="13" color="#176b52" />
        </view>
      </view>

      <view class="status-tabs">
        <view
          v-for="item in groupOptions"
          :key="item.value"
          class="status-tab"
          :class="{ active: activeGroup === item.value }"
          @tap="selectGroup(item.value)"
        >
          <text>{{ item.label }}</text>
          <text class="tab-count">{{ item.count }}</text>
        </view>
      </view>

      <view v-if="loading && !visibleTasks.length" class="task-skeleton">
        <view v-for="item in 3" :key="item" class="skeleton-card card">
          <view class="skeleton-line short" />
          <view class="skeleton-line" />
          <view class="skeleton-line medium" />
        </view>
      </view>

      <view v-else-if="visibleTasks.length" class="task-list">
        <view
          v-for="task in visibleTasks"
          :key="task.id"
          class="task-card card pressable"
          @tap="openTask(task)"
        >
          <view class="task-card-body">
            <view class="task-topline">
              <StatusPill :status="taskDisplayStatus(task)" />
              <text class="task-no mono">{{ task.report_no }}</text>
            </view>
            <text class="task-customer">{{ task.customer_name }}</text>
            <view class="task-meta">
              <view class="task-meta-item">
                <UniIcons type="calendar" size="14" color="#65736c" />
                <text>{{ displayDay(task.service_date || task.report_date) }}</text>
              </view>
              <view class="task-meta-item">
                <UniIcons type="staff" size="14" color="#65736c" />
                <text>{{ task.service_type || "结构漏洞封堵" }}</text>
              </view>
            </view>
            <text class="task-address">{{ task.service_address || "服务地址待补充" }}</text>
            <view class="task-action" @tap.stop="openTask(task)">
              <text>{{ actionText }}</text>
              <UniIcons type="right" size="16" color="#ffffff" />
            </view>
            <view class="task-footer">{{ task.sites.length }} 个封堵部位</view>
          </view>
        </view>
      </view>

      <view v-else class="empty-state">
        <view class="empty-icon">
          <UniIcons type="checkbox" size="22" color="#176b52" />
        </view>
        <text class="empty-title">暂无{{ activeLabel }}任务</text>
        <text class="empty-copy">下拉刷新，或切换其他状态查看现场作业。</text>
      </view>
    </view>

    <AppTabBar :current="tabCurrent" />
  </view>
</template>

<style scoped>
.workbench-page {
  background: #f4f7f5;
}

.workbench-header {
  padding: calc(26rpx + env(safe-area-inset-top)) 32rpx 28rpx;
  border-bottom: 1rpx solid #dce5df;
  background: #ffffff;
}

.brand-row,
.page-heading,
.metric-strip,
.sync-row,
.sync-copy,
.sync-line,
.task-topline,
.task-meta,
.task-meta-item,
.task-footer,
.task-open,
.reports-link {
  display: flex;
  align-items: center;
}

.brand-row {
  justify-content: center;
  gap: 24rpx;
}

.brand-spacer {
  width: 62rpx;
  height: 1rpx;
}

.profile-shortcut {
  position: relative;
  width: 62rpx;
  height: 62rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1rpx solid #d8e4dc;
  border-radius: 12rpx;
  background: #ffffff;
}

.profile-online {
  position: absolute;
  right: 2rpx;
  bottom: 2rpx;
  width: 13rpx;
  height: 13rpx;
  border: 3rpx solid #ffffff;
  border-radius: 50%;
  background: #43a778;
}

.page-heading {
  justify-content: center;
  margin-top: 30rpx;
  text-align: center;
}

.page-title,
.page-subtitle {
  display: block;
}

.page-title {
  color: #17211d;
  font-size: max(26px, 44rpx);
  font-weight: 700;
  line-height: 1.2;
}

.page-subtitle {
  margin-top: 8rpx;
  color: #65736c;
  font-size: max(13px, 24rpx);
  line-height: 1.5;
}

.role-chip {
  display: flex;
  align-items: center;
  gap: 6rpx;
  max-width: 200rpx;
  padding: 8rpx 12rpx;
  border: 1rpx solid #d4e4da;
  border-radius: 10rpx;
  background: #ffffff;
  color: #115640;
  font-size: 20rpx;
  white-space: nowrap;
}

.metric-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: stretch;
  gap: 8rpx;
  margin-top: 24rpx;
  padding: 10rpx;
  border: 1rpx solid #dde7e0;
  border-radius: 14rpx;
  background: #ffffff;
  box-shadow: 0 6rpx 18rpx rgba(18, 34, 27, 0.04);
}

.metric-primary,
.metric-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  min-width: 0;
  min-height: 72rpx;
  padding: 0 8rpx;
  border-radius: 10rpx;
  background: #f6f9f7;
  text-align: center;
}

.metric-item {
  border-left: 0;
}

.metric-value,
.metric-label {
  display: block;
}

.metric-value {
  color: #103b2d;
  font-family: "SFMono-Regular", "Cascadia Code", monospace;
  font-size: 30rpx;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
}

.metric-value.small {
  color: #17211d;
  font-size: 30rpx;
}

.metric-label {
  color: #65736c;
  font-size: 20rpx;
  line-height: 1.3;
  white-space: nowrap;
}

.workbench-content {
  padding-top: 24rpx;
}

.sync-row {
  margin-top: 4rpx;
  padding: 16rpx 18rpx;
  border: 1rpx solid #e1e9e4;
  border-radius: 12rpx;
  background: rgba(255, 255, 255, 0.82);
  justify-content: space-between;
  gap: 18rpx;
}

.sync-copy {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-width: 0;
}

.sync-line {
  gap: 8rpx;
  color: #34483f;
  font-size: 22rpx;
  font-weight: 600;
}

.sync-dot {
  width: 9rpx;
  height: 9rpx;
  border-radius: 50%;
  background: #43a778;
}

.sync-meta {
  margin-top: 3rpx;
  color: #79867f;
  font-size: 20rpx;
}

.refresh-button {
  width: 58rpx;
  height: 58rpx;
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  border: 1rpx solid #d8e4dc;
  border-radius: 12rpx;
  background: #ffffff;
}

.error-banner {
  display: flex;
  align-items: flex-start;
  gap: 10rpx;
  margin-top: 24rpx;
  padding: 18rpx 20rpx;
  border: 1rpx solid #ebd0cd;
  border-radius: 16rpx;
  background: #f8ebe9;
}

.error-banner-copy {
  flex: 1;
  min-width: 0;
}

.error-banner-title {
  display: block;
  color: #8e3a33;
  font-size: 24rpx;
  font-weight: 700;
}

.error-copy {
  margin-top: 4rpx;
}

.error-retry {
  flex: none;
  color: #8e3a33;
  font-size: 22rpx;
  font-weight: 600;
}

.task-section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20rpx;
  margin-top: 6rpx;
}

.reports-link {
  gap: 4rpx;
  color: #176b52;
  font-size: 21rpx;
  font-weight: 600;
}

.status-tabs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8rpx;
  margin-top: 18rpx;
  padding: 8rpx;
  border: 1rpx solid #dce5df;
  border-radius: 12rpx;
  background: #eaf0ec;
}

.status-tab {
  flex: 1;
  min-height: 74rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  border-radius: 9rpx;
  color: #65736c;
  font-size: max(15px, 26rpx);
}

.tab-count {
  min-width: 32rpx;
  height: 32rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8rpx;
  background: #e6f2ec;
  color: #115640;
  font-family: "SFMono-Regular", "Cascadia Code", monospace;
  font-size: 18rpx;
}

.status-tab.active {
  background: #ffffff;
  color: #17211d;
  font-weight: 700;
  box-shadow: 0 2rpx 8rpx rgba(18, 34, 27, 0.06);
}

.task-list,
.task-skeleton {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
  margin-top: 20rpx;
}

.task-card {
  position: relative;
  display: block;
  overflow: hidden;
  border-color: #e0e9e3;
  background: #ffffff;
  box-shadow: none;
}

.task-accent {
  display: none;
}

.task-card-body {
  width: 100%;
  padding: 24rpx;
}

.task-topline {
  justify-content: space-between;
  gap: 16rpx;
}

.task-no {
  color: #79867f;
  font-size: max(12px, 22rpx);
}

.task-customer {
  display: block;
  margin-top: 16rpx;
  color: #17211d;
  font-size: max(21px, 36rpx);
  font-weight: 700;
  line-height: 1.35;
}

.task-meta {
  flex-wrap: wrap;
  gap: 10rpx 20rpx;
  margin-top: 14rpx;
}

.task-meta-item {
  gap: 7rpx;
  color: #65736c;
  font-size: max(13px, 24rpx);
}

.task-address {
  display: block;
  margin-top: 12rpx;
  color: #5d6e65;
  font-size: max(14px, 26rpx);
  line-height: 1.5;
}

.task-action {
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  margin-top: 22rpx;
  border-radius: 12rpx;
  background: #145a3a;
  color: #ffffff;
  font-size: max(15px, 28rpx);
  font-weight: 700;
}

.task-footer {
  display: block;
  margin-top: 14rpx;
  padding-top: 12rpx;
  border-top: 1rpx solid #e5ece7;
  color: #79867f;
  font-size: max(13px, 22rpx);
  text-align: center;
}

.task-open {
  gap: 2rpx;
  color: #176b52;
  font-weight: 700;
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

.empty-icon {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 14rpx;
  border-radius: 16rpx;
  background: #e6f2ec;
}

/* #ifdef APP-PLUS */
.workbench-header {
  padding-top: calc(52rpx + env(safe-area-inset-top));
}
/* #endif */
</style>
