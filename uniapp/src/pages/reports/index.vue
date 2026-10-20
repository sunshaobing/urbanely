<script setup lang="ts">
import { computed, ref } from "vue";
import { onPullDownRefresh, onShow } from "@dcloudio/uni-app";
import UniIcons from "@dcloudio/uni-ui/lib/uni-icons/uni-icons.vue";
import AppTabBar from "../../components/AppTabBar.vue";
import PageHeader from "../../components/PageHeader.vue";
import StatusPill from "../../components/StatusPill.vue";
import {
  getRiskSurveys,
  getServiceReports,
  normalizeRiskSurveys,
  normalizeServiceReports,
} from "../../utils/api";
import { getSession } from "../../utils/auth";
import { openReportPdf, reportPdfPath } from "../../utils/pdf";
import { displayDay, riskLabel } from "../../utils/present";
import { canUseReports, fieldHome } from "../../utils/roles";
import type { RiskSurvey, ServiceReport } from "../../utils/types";

type ArchiveTab = "risk" | "service";

const tabs: Array<{ key: ArchiveTab; label: string }> = [
  { key: "risk", label: "勘测记录" },
  { key: "service", label: "封堵记录" },
];

const activeTab = ref<ArchiveTab>("risk");
const keyword = ref("");
const riskSurveys = ref<RiskSurvey[]>([]);
const serviceReports = ref<ServiceReport[]>([]);
const loading = ref(false);
const error = ref("");
const updatedAt = ref("");

const activeItems = computed(() =>
  activeTab.value === "risk" ? riskSurveys.value : serviceReports.value,
);

const totalCount = computed(
  () => riskSurveys.value.length + serviceReports.value.length,
);

function errorText(value: unknown) {
  return value instanceof Error ? value.message : "报告数据加载失败";
}

async function load() {
  const current = getSession();
  if (!current) {
    uni.reLaunch({ url: "/pages/login/index" });
    return;
  }
  if (!canUseReports(current.role)) {
    uni.reLaunch({ url: fieldHome(current.role) });
    return;
  }
  if (loading.value) return;
  loading.value = true;
  error.value = "";
  try {
    const filters = { keyword: keyword.value.trim() };
    const [risk, service] = await Promise.allSettled([
      getRiskSurveys(filters),
      getServiceReports(filters),
    ]);
    riskSurveys.value =
      risk.status === "fulfilled" ? normalizeRiskSurveys(risk.value) : [];
    serviceReports.value =
      service.status === "fulfilled" ? normalizeServiceReports(service.value) : [];
    if (risk.status === "rejected" && service.status === "rejected") {
      throw risk.reason;
    }
    const now = new Date();
    updatedAt.value = `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes(),
    ).padStart(2, "0")}`;
  } catch (loadError) {
    error.value = errorText(loadError);
  } finally {
    loading.value = false;
  }
}

function switchTab(tab: ArchiveTab) {
  activeTab.value = tab;
}

function recordCode(record: RiskSurvey | ServiceReport) {
  if (isRiskSurvey(record)) {
    return record.code || `#${record.id}`;
  }
  return record.code || record.report_no || `#${record.id}`;
}

function recordCustomer(record: RiskSurvey | ServiceReport) {
  if (isRiskSurvey(record)) {
    return record.customer_name || record.contact_person || "未命名记录";
  }
  return record.customer_name || record.contact || "未命名记录";
}

function recordDate(record: RiskSurvey | ServiceReport) {
  if (isRiskSurvey(record)) {
    return displayDay(record.survey_date || record.created_at);
  }
  return displayDay(record.service_date || record.created_at);
}

function recordMeta(record: RiskSurvey | ServiceReport) {
  if (isRiskSurvey(record)) {
    return `${record.items?.length || 0} 个风险点 · ${record.photos?.length || 0} 张图片`;
  }
  return `${record.materials?.length || 0} 项材料 · ${(record.photos?.length || 0) + (record.risk_photos?.length || 0)} 张图片`;
}

function openPdf(record: RiskSurvey | ServiceReport) {
  const kind = isRiskSurvey(record) ? "risk" : "service";
  const url = record.pdf_url || reportPdfPath(kind, record.id);
  openReportPdf(url);
}

function isRiskSurvey(record: RiskSurvey | ServiceReport): record is RiskSurvey {
  return "survey_date" in record || "risk_level" in record;
}

function runSearch() {
  void load();
}

onShow(() => {
  void load();
});

onPullDownRefresh(async () => {
  await load();
  uni.stopPullDownRefresh();
});
</script>

<template>
  <view class="page reports-page">
    <PageHeader
      title="报告归档"
      subtitle="勘测与封堵文档统一查询"
      kicker="文档中心"
    >
      <template #action>
        <view class="header-refresh" @tap="load">
          <UniIcons type="refreshempty" size="17" color="#1f6fb2" />
        </view>
      </template>

      <view class="archive-summary card">
        <view class="archive-summary-main">
          <text class="archive-total">{{ loading ? "--" : totalCount }}</text>
          <view>
            <text class="archive-label">全部记录</text>
            <text class="archive-updated">
              {{ updatedAt ? `更新于 ${updatedAt}` : "正在同步" }}
            </text>
          </view>
        </view>
        <view class="archive-breakdown">
          <view class="breakdown-item">
            <text class="breakdown-value">{{ riskSurveys.length }}</text>
            <text class="breakdown-label">勘测</text>
          </view>
          <view class="breakdown-item">
            <text class="breakdown-value">{{ serviceReports.length }}</text>
            <text class="breakdown-label">封堵</text>
          </view>
        </view>
      </view>
    </PageHeader>

    <view class="page-content reports-content">
      <view class="search-row">
        <view class="search-input">
          <UniIcons type="search" size="17" color="#667383" />
          <input
            v-model="keyword"
            class="search-field"
            placeholder="搜索门店、编号或联系人"
            placeholder-class="field-placeholder"
            confirm-type="search"
            @confirm="runSearch"
          />
        </view>
        <button class="search-button" @tap="runSearch">
          <UniIcons type="search" size="17" color="#ffffff" />
        </button>
      </view>

      <view class="archive-tabs">
        <view
          v-for="tab in tabs"
          :key="tab.key"
          class="archive-tab"
          :class="{ active: activeTab === tab.key }"
          @tap="switchTab(tab.key)"
        >
          <text>{{ tab.label }}</text>
          <text class="tab-count">
            {{ tab.key === "risk" ? riskSurveys.length : serviceReports.length }}
          </text>
        </view>
      </view>

      <view v-if="error" class="empty-state error-state">
        <text class="empty-title">报告未加载</text>
        <text class="empty-copy">{{ error }}</text>
        <button class="btn-secondary retry-button" @tap="load">重新加载</button>
      </view>

      <view v-else-if="loading && !activeItems.length" class="archive-list">
        <view v-for="item in 3" :key="item" class="archive-card card">
          <view class="skeleton-line short" />
          <view class="skeleton-line" />
          <view class="skeleton-line medium" />
        </view>
      </view>

      <view v-else-if="activeItems.length" class="archive-list">
        <view
          v-for="record in activeItems"
          :key="`${activeTab}-${record.id}`"
          class="archive-card card"
        >
          <view class="archive-card-top">
            <view class="archive-code">
              <UniIcons
                :type="activeTab === 'risk' ? 'search' : 'compose'"
                size="15"
                color="#1f6fb2"
              />
              <text class="mono">{{ recordCode(record) }}</text>
            </view>
            <StatusPill :status="record.status" />
          </view>
          <text class="archive-customer">{{ recordCustomer(record) }}</text>
          <view class="archive-meta">
            <text>{{ recordDate(record) }}</text>
            <text>{{ recordMeta(record) }}</text>
          </view>
          <view v-if="activeTab === 'risk' && isRiskSurvey(record)" class="risk-line">
            <text class="risk-label">风险等级</text>
            <text class="risk-value">{{ riskLabel(record.risk_level) }}</text>
          </view>
          <view class="archive-footer">
            <text class="archive-source">
              {{ activeTab === "risk" ? "现场勘测报告" : "结构封堵服务单" }}
            </text>
            <button class="pdf-button" @tap="openPdf(record)">
              <UniIcons type="download" size="14" color="#ffffff" />
              <text>PDF</text>
            </button>
          </view>
        </view>
      </view>

      <view v-else class="empty-state">
        <view class="empty-icon">
          <UniIcons type="paperplane" size="22" color="#1f6fb2" />
        </view>
        <text class="empty-title">
          暂无{{ activeTab === "risk" ? "勘测" : "封堵" }}记录
        </text>
        <text class="empty-copy">完成现场记录并提交后，报告会出现在这里。</text>
      </view>
    </view>

    <AppTabBar current="reports" />
  </view>
</template>

<style scoped>
.reports-page {
  background: #f3f6fa;
}

.header-refresh {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1rpx solid rgba(255, 255, 255, 0.16);
  border-radius: 16rpx;
  background: rgba(255, 255, 255, 0.06);
}

.archive-summary {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24rpx;
  margin-top: 30rpx;
}

.archive-total,
.archive-label {
  display: block;
}

.archive-total {
  font-size: 54rpx;
  font-weight: 700;
  line-height: 1;
}

.archive-label {
  margin-top: 8rpx;
  color: #b6d4eb;
  font-size: 22rpx;
}

.archive-breakdown {
  display: flex;
  gap: 24rpx;
}

.breakdown-item {
  min-width: 86rpx;
  text-align: right;
}

.breakdown-value,
.breakdown-label {
  display: block;
}

.breakdown-value {
  font-size: 26rpx;
  font-weight: 700;
}

.breakdown-label {
  margin-top: 4rpx;
  color: #9bbfb0;
  font-size: 19rpx;
}

.reports-content {
  padding-top: 24rpx;
}

.search-row {
  display: flex;
  gap: 12rpx;
}

.search-input {
  flex: 1;
  height: 78rpx;
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 0 18rpx;
  border: 1rpx solid #d7e0e9;
  border-radius: 16rpx;
  background: #ffffff;
}

.search-field {
  flex: 1;
  min-width: 0;
  height: 72rpx;
  font-size: 25rpx;
}

.search-button {
  width: 78rpx;
  height: 78rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16rpx;
  background: #1f6fb2;
}

.archive-tabs {
  display: flex;
  gap: 8rpx;
  margin-top: 18rpx;
  padding: 8rpx;
  border: 1rpx solid #dfe5ec;
  border-radius: 16rpx;
  background: #eef2f7;
}

.archive-tab {
  flex: 1;
  min-height: 62rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  border-radius: 12rpx;
  color: #667383;
  font-size: 24rpx;
}

.archive-tab.active {
  background: #ffffff;
  color: #173550;
  font-weight: 700;
  box-shadow: 0 4rpx 12rpx rgba(16, 53, 42, 0.08);
}

.tab-count {
  min-width: 32rpx;
  height: 30rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8rpx;
  background: #e9f2fa;
  color: #1f6fb2;
  font-family: "SFMono-Regular", "Cascadia Code", monospace;
  font-size: 18rpx;
}

.archive-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-top: 18rpx;
}

.archive-card {
  padding: 22rpx;
}

.archive-card-top,
.archive-code,
.archive-meta,
.risk-line,
.archive-footer {
  display: flex;
  align-items: center;
}

.archive-card-top,
.archive-footer {
  justify-content: space-between;
  gap: 16rpx;
}

.archive-code {
  gap: 6rpx;
  color: #1f6fb2;
  font-size: 21rpx;
}

.archive-customer {
  display: block;
  margin-top: 12rpx;
  font-size: 32rpx;
  font-weight: 700;
  line-height: 1.35;
}

.archive-meta {
  flex-wrap: wrap;
  gap: 8rpx 16rpx;
  margin-top: 10rpx;
  color: #667383;
  font-size: 21rpx;
}

.risk-line {
  justify-content: space-between;
  gap: 16rpx;
  margin-top: 12rpx;
  padding: 10rpx 12rpx;
  border-radius: 10rpx;
  background: #f0f6f2;
  font-size: 21rpx;
}

.risk-label {
  color: #667383;
}

.risk-value {
  color: #1f6fb2;
  font-weight: 600;
}

.archive-footer {
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #e6ebf1;
}

.archive-source {
  color: #7c8897;
  font-size: 21rpx;
}

.pdf-button {
  min-height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  padding: 0 16rpx;
  border-radius: 12rpx;
  background: #1f6fb2;
  color: #ffffff;
  font-size: 21rpx;
  font-weight: 600;
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

.empty-icon {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 14rpx;
  border-radius: 16rpx;
  background: #e9f2fa;
}

.error-state {
  margin-top: 18rpx;
}

.retry-button {
  margin-top: 22rpx;
}

/* Unified field-console visual system */
.reports-page {
  background: #f3f6fa;
}

.header-refresh {
  width: 60rpx;
  height: 60rpx;
  border: 1rpx solid #d8e1ea;
  border-radius: 12rpx;
  background: #ffffff;
}

.archive-summary {
  align-items: center;
  justify-content: space-between;
  margin-top: 24rpx;
  padding: 22rpx 24rpx;
}

.archive-summary-main {
  display: flex;
  align-items: center;
  gap: 14rpx;
}

.archive-total {
  color: #173550;
  font-family: "SFMono-Regular", "Cascadia Code", monospace;
  font-size: 46rpx;
  line-height: 1;
}

.archive-label {
  margin-top: 0;
  color: #243244;
  font-size: 22rpx;
  font-weight: 600;
}

.archive-updated {
  display: block;
  margin-top: 2rpx;
  color: #8793a1;
  font-size: 18rpx;
}

.archive-breakdown {
  gap: 22rpx;
}

.breakdown-item {
  min-width: 58rpx;
  padding-left: 18rpx;
  border-left: 1rpx solid #e6ebf1;
}

.breakdown-value {
  color: #243244;
  font-size: 24rpx;
}

.breakdown-label {
  margin-top: 2rpx;
  color: #7c8897;
  font-size: 18rpx;
}

.reports-content {
  padding-top: 20rpx;
}

.search-input {
  height: 78rpx;
  border-color: #d8e1ea;
  border-radius: 12rpx;
}

.search-field {
  font-size: 23rpx;
}

.search-button {
  width: 78rpx;
  height: 78rpx;
  border-radius: 12rpx;
  background: #173550;
}

.archive-tabs {
  gap: 4rpx;
  margin-top: 16rpx;
  padding: 5rpx;
  border-color: #dfe5ec;
  border-radius: 12rpx;
  background: #eef2f7;
}

.archive-tab {
  min-height: 58rpx;
  border-radius: 9rpx;
  color: #667383;
  font-size: 22rpx;
}

.archive-tab.active {
  color: #182331;
  box-shadow: 0 2rpx 8rpx rgba(18, 34, 27, 0.06);
}

.archive-list {
  gap: 14rpx;
  margin-top: 16rpx;
}

.archive-card {
  padding: 22rpx 24rpx;
}

.archive-code {
  color: #1f6fb2;
  font-size: 20rpx;
}

.archive-customer {
  margin-top: 10rpx;
  color: #182331;
  font-size: 30rpx;
  line-height: 1.35;
}

.archive-meta {
  color: #667383;
  font-size: 20rpx;
}

.risk-line {
  padding: 9rpx 12rpx;
  border-radius: 8rpx;
  background: #f5f8fb;
}

.risk-value {
  color: #1f6fb2;
}

.archive-footer {
  border-top-color: #e6ebf1;
}

.archive-source {
  color: #7c8897;
  font-size: 20rpx;
}

.pdf-button {
  min-height: 54rpx;
  padding: 0 16rpx;
  border-radius: 9rpx;
  background: #173550;
  font-size: 20rpx;
}

.skeleton-line {
  background: #e8edf3;
}

.empty-icon {
  background: #e9f2fa;
}
</style>
