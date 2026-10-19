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
const pageKicker = computed(() =>
  effectiveKind.value === "risk"
    ? "SURVEY FIELD"
    : effectiveKind.value === "sealing"
      ? "SEALING FIELD"
      : "FIELD WORKBENCH",
);
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
const visibleTasks = computed(() =>
  allTasks.value.filter((task) =>
    activeGroup.value === "done" ? isCompletedTask(task) : !isCompletedTask(task),
  ),
);
const openCount = computed(
  () => allTasks.value.filter((task) => !isCompletedTask(task)).length,
);
const doneCount = computed(
  () => allTasks.value.filter((task) => isCompletedTask(task)).length,
);
const totalHoles = computed(() =>
  allTasks.value.reduce((sum, task) => sum + (task.sites?.length || 0), 0),
);
const taskMetricLabel = computed(() =>
  roleView.value === "both" ? "任务总数" : "我的任务",
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
    if (roleView.value === "sealing") {
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
    <view class="workbench-hero">
      <view class="hero-topline">
        <view class="brand-inline">
          <BrandLogo :size="30" show-name :name-size="13" light />
          <view>
            <text class="brand-sub">封堵勘测系统</text>
          </view>
        </view>
        <view class="profile-shortcut" @tap="openProfile">
          <CartoonAvatar :name="session?.name || '现场人员'" :size="32" />
          <view class="profile-online" />
        </view>
      </view>

      <view class="hero-title-row">
        <view>
          <text class="hero-greeting">{{ pageTitle }}</text>
          <text class="hero-date">{{ todayLabel() }} · {{ session?.name || "现场人员" }}</text>
        </view>
        <view class="hero-role">
          <UniIcons type="person-filled" size="14" color="#a5d0be" />
          <text>{{ roleLabel(session?.role || "") }}</text>
        </view>
      </view>

      <view class="hero-metrics">
        <view class="hero-metric">
          <text class="metric-value">{{ loading ? "--" : allTasks.length }}</text>
          <text class="metric-label">{{ taskMetricLabel }}</text>
        </view>
        <view class="metric-divider" />
        <view class="hero-metric">
          <text class="metric-value">{{ loading ? "--" : openCount }}</text>
          <text class="metric-label">未完成</text>
        </view>
        <view class="metric-divider" />
        <view class="hero-metric">
          <text class="metric-value">{{ loading ? "--" : doneCount }}</text>
          <text class="metric-label">已完成</text>
        </view>
      </view>
    </view>

    <view class="page-content workbench-content">
      <view class="ops-card card">
        <view class="ops-copy">
          <view class="ops-icon">
            <UniIcons type="calendar" size="20" color="#1d7659" />
          </view>
          <view>
            <text class="ops-title">今日现场</text>
            <text class="ops-sub">
              {{ totalHoles }} 个封堵部位 · 数据实时同步
            </text>
          </view>
        </view>
        <view class="ops-actions">
          <view class="sync-state">
            <view class="sync-dot" />
            <text>{{ updatedAt ? `已更新 ${updatedAt}` : "同步中" }}</text>
          </view>
          <view class="refresh-button" @tap="load">
            <UniIcons type="refreshempty" size="17" color="#1d7659" />
          </view>
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
          <text class="section-title">{{ pageKicker }}</text>
          <text class="section-copy">按服务状态查看今天要处理的工作</text>
        </view>
        <view v-if="roleView === 'both'" class="reports-link" @tap="openReports">
          <text>报告归档</text>
          <UniIcons type="right" size="14" color="#1d7659" />
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
          <view class="task-accent" />
          <view class="task-card-body">
            <view class="task-topline">
              <text class="task-no mono">{{ task.report_no }}</text>
              <StatusPill :status="task.status" />
            </view>
            <text class="task-customer">{{ task.customer_name }}</text>
            <view class="task-meta">
              <view class="task-meta-item">
                <UniIcons type="calendar" size="14" color="#728079" />
                <text>{{ displayDay(task.service_date || task.report_date) }}</text>
              </view>
              <view class="task-meta-item">
                <UniIcons type="staff" size="14" color="#728079" />
                <text>{{ task.service_type || "结构漏洞封堵" }}</text>
              </view>
            </view>
            <text class="task-address">{{ task.service_address || "服务地址待补充" }}</text>
            <view class="task-footer">
              <text>{{ task.sites.length }} 个封堵部位</text>
              <view class="task-open" @tap.stop="openTask(task)">
                <text>{{ actionText }}</text>
                <UniIcons type="right" size="14" color="#1d7659" />
              </view>
            </view>
          </view>
        </view>
      </view>

      <view v-else class="empty-state">
        <view class="empty-icon">
          <UniIcons type="checkbox" size="22" color="#1d7659" />
        </view>
        <text class="empty-title">暂无{{ activeLabel }}任务</text>
        <text class="empty-copy">下拉刷新，或切换其他状态查看现场作业。</text>
      </view>

      <text class="list-footnote">
        当前列表由服务端任务状态筛选，前端不合并不同业务状态。
      </text>
    </view>

    <AppTabBar :current="tabCurrent" />
  </view>
</template>

<style scoped>
.workbench-page {
  background: #eef4ef;
}

.workbench-hero {
  padding: calc(32rpx + env(safe-area-inset-top)) 32rpx 94rpx;
  background: #10352a;
  color: #ffffff;
}

.hero-topline,
.hero-title-row,
.hero-metrics,
.ops-card,
.ops-copy,
.ops-actions,
.sync-state,
.task-topline,
.task-meta,
.task-meta-item,
.task-footer,
.task-open,
.reports-link {
  display: flex;
  align-items: center;
}

.hero-topline {
  justify-content: space-between;
  gap: 24rpx;
}

.brand-inline {
  display: flex;
  align-items: center;
  gap: 14rpx;
}

.brand-sub {
  display: block;
}

.brand-sub {
  margin-top: 2rpx;
  color: #9ec5b5;
  font-size: 19rpx;
}

.profile-shortcut {
  position: relative;
  width: 66rpx;
  height: 66rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1rpx solid rgba(255, 255, 255, 0.18);
  border-radius: 50%;
  background: #285845;
}

.profile-online {
  position: absolute;
  right: 2rpx;
  bottom: 2rpx;
  width: 14rpx;
  height: 14rpx;
  border: 3rpx solid #10352a;
  border-radius: 50%;
  background: #75c49d;
}

.hero-title-row {
  justify-content: space-between;
  gap: 24rpx;
  margin-top: 48rpx;
}

.hero-greeting,
.hero-date {
  display: block;
}

.hero-greeting {
  font-size: 46rpx;
  font-weight: 700;
  line-height: 1.25;
}

.hero-date {
  margin-top: 10rpx;
  color: #a9c8bb;
  font-size: 24rpx;
}

.hero-role {
  display: flex;
  align-items: center;
  gap: 6rpx;
  max-width: 200rpx;
  padding: 8rpx 12rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.16);
  border-radius: 12rpx;
  color: #c6dfd4;
  font-size: 20rpx;
  white-space: nowrap;
}

.hero-metrics {
  margin-top: 36rpx;
  padding: 22rpx 0 0;
  border-top: 1rpx solid rgba(255, 255, 255, 0.12);
}

.hero-metric {
  flex: 1;
  min-width: 0;
}

.metric-value,
.metric-label {
  display: block;
  text-align: center;
}

.metric-value {
  font-size: 38rpx;
  font-weight: 700;
}

.metric-label {
  margin-top: 4rpx;
  color: #a9c8bb;
  font-size: 21rpx;
}

.metric-divider {
  width: 1rpx;
  height: 48rpx;
  background: rgba(255, 255, 255, 0.14);
}

.workbench-content {
  margin-top: -60rpx;
}

.ops-card {
  justify-content: space-between;
  gap: 20rpx;
  padding: 20rpx 22rpx;
}

.ops-copy {
  gap: 14rpx;
  min-width: 0;
}

.ops-icon {
  width: 58rpx;
  height: 58rpx;
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  border-radius: 14rpx;
  background: #e4f1e9;
}

.ops-title,
.ops-sub {
  display: block;
}

.ops-title {
  font-size: 25rpx;
  font-weight: 700;
}

.ops-sub {
  margin-top: 3rpx;
  color: #65726c;
  font-size: 20rpx;
}

.ops-actions {
  flex: none;
  gap: 10rpx;
}

.sync-state {
  gap: 6rpx;
  color: #65726c;
  font-size: 19rpx;
}

.sync-dot {
  width: 10rpx;
  height: 10rpx;
  border-radius: 50%;
  background: #4c9a72;
}

.refresh-button {
  width: 54rpx;
  height: 54rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14rpx;
  background: #f0f6f2;
}

.error-banner {
  display: flex;
  align-items: flex-start;
  gap: 10rpx;
  margin-top: 24rpx;
  padding: 18rpx 20rpx;
  border: 1rpx solid #eccfca;
  border-radius: 16rpx;
  background: #fae9e6;
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
  margin-top: 34rpx;
}

.reports-link {
  gap: 4rpx;
  color: #1d7659;
  font-size: 22rpx;
}

.status-tabs {
  display: flex;
  gap: 8rpx;
  margin-top: 20rpx;
  padding: 8rpx;
  border: 1rpx solid #dce6df;
  border-radius: 16rpx;
  background: #e8f0ea;
}

.status-tab {
  flex: 1;
  min-height: 58rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  border-radius: 12rpx;
  color: #65726c;
  font-size: 23rpx;
}

.tab-count {
  min-width: 30rpx;
  height: 30rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8rpx;
  background: #dbe9e1;
  color: #1d7659;
  font-family: "SFMono-Regular", "Cascadia Code", monospace;
  font-size: 18rpx;
}

.status-tab.active {
  background: #ffffff;
  color: #10352a;
  font-weight: 700;
  box-shadow: 0 4rpx 12rpx rgba(16, 53, 42, 0.08);
}

.task-list,
.task-skeleton {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-top: 18rpx;
}

.task-card {
  position: relative;
  display: flex;
  overflow: hidden;
}

.task-accent {
  width: 6rpx;
  flex: none;
  background: #1d7659;
}

.task-card-body {
  flex: 1;
  min-width: 0;
  padding: 22rpx 22rpx 20rpx;
}

.task-topline {
  justify-content: space-between;
  gap: 16rpx;
}

.task-no {
  color: #65726c;
  font-size: 21rpx;
}

.task-customer {
  display: block;
  margin-top: 10rpx;
  font-size: 34rpx;
  font-weight: 700;
  line-height: 1.35;
}

.task-meta {
  flex-wrap: wrap;
  gap: 8rpx 18rpx;
  margin-top: 12rpx;
}

.task-meta-item {
  gap: 5rpx;
  color: #65726c;
  font-size: 21rpx;
}

.task-address {
  display: block;
  margin-top: 10rpx;
  color: #65726c;
  font-size: 23rpx;
  line-height: 1.45;
}

.task-footer {
  justify-content: space-between;
  gap: 16rpx;
  margin-top: 18rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #eaf0ec;
  color: #728079;
  font-size: 21rpx;
}

.task-open {
  gap: 2rpx;
  color: #1d7659;
  font-weight: 600;
}

.skeleton-card {
  padding: 24rpx;
}

.skeleton-line {
  width: 100%;
  height: 18rpx;
  margin-top: 16rpx;
  border-radius: 8rpx;
  background: #e6eee8;
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
  background: #e4f1e9;
}

.list-footnote {
  display: block;
  margin-top: 28rpx;
  color: #8a968f;
  font-size: 20rpx;
  line-height: 1.5;
  text-align: center;
}
</style>
