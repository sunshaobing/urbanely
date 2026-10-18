<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import UniIcons from "@dcloudio/uni-ui/lib/uni-icons/uni-icons.vue";
import PageHeader from "../../components/PageHeader.vue";
import StatusPill from "../../components/StatusPill.vue";
import { getWorkOrder } from "../../utils/api";
import { displayDate, displayDay } from "../../utils/present";
import type { WorkOrder } from "../../utils/types";

const task = ref<WorkOrder | null>(null);
const taskId = ref(0);
const loading = ref(true);
const error = ref("");

const workflow = ["待处理", "现场勘测", "结构封堵", "完成归档"];

const workflowIndex = computed(() => {
  if (!task.value) return 0;
  if (task.value.status === "completed" || task.value.status === "approved") return 3;
  if (task.value.status === "pending") return 2;
  if (task.value.status === "rejected") return 1;
  return 0;
});

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
  } catch (loadError) {
    error.value = errorText(loadError);
  } finally {
    loading.value = false;
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
  uni.navigateTo({
    url: `/pages/risk-survey/index?taskId=${task.value.id}`,
  });
}

function openServiceReport() {
  if (!task.value) return;
  uni.navigateTo({
    url: `/pages/service-report/index?taskId=${task.value.id}`,
  });
}

onLoad((query) => {
  taskId.value = Number(query?.id || 0);
  void load();
});
</script>

<template>
  <view class="detail-page">
    <PageHeader
      title="任务详情"
      :subtitle="task ? `${task.report_no} · ${task.customer_name}` : '现场作业单'"
      kicker="FIELD ORDER"
      dark
      back
    >
      <template #action>
        <StatusPill v-if="task" :status="task.status" />
      </template>

      <view v-if="task" class="order-hero">
        <text class="order-service">{{ task.service_type || "结构漏洞封堵" }}</text>
        <text class="order-customer">{{ task.customer_name }}</text>
        <view class="order-address-row">
          <text class="order-address">{{ task.service_address || "服务地址待补充" }}</text>
          <view class="copy-address" @tap="copyAddress">
            <UniIcons type="map-pin" size="16" color="#a5d0be" />
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
            <UniIcons type="phone-filled" size="18" color="#10352a" />
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
          <view
            v-for="(step, index) in workflow"
            :key="step"
            class="workflow-step"
            :class="{ done: index < workflowIndex, active: index === workflowIndex }"
          >
            <view class="workflow-node">
              <UniIcons
                v-if="index < workflowIndex"
                type="checkmarkempty"
                size="14"
                color="#ffffff"
              />
              <text v-else>{{ index + 1 }}</text>
            </view>
            <text class="workflow-label">{{ step }}</text>
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
                  color="#1d7659"
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
        <button class="btn-secondary bottom-button" @tap="openRiskSurvey">
          <UniIcons type="search" size="18" color="#1d7659" />
          <text>开始勘测</text>
        </button>
        <button class="btn-primary bottom-button" @tap="openServiceReport">
          <UniIcons type="compose" size="18" color="#ffffff" />
          <text>封堵记录</text>
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
  color: #a5d0be;
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
  color: #a5d0be;
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
  background: #e4f1e9;
  color: #10352a;
  font-size: 22rpx;
  font-weight: 700;
}

.detail-content {
  padding-top: 28rpx;
}

.workflow-card {
  display: flex;
  justify-content: space-between;
  gap: 4rpx;
  padding: 24rpx 18rpx;
}

.workflow-step {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
  color: #8a968f;
}

.workflow-node {
  width: 42rpx;
  height: 42rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1rpx solid #d6e1da;
  border-radius: 50%;
  background: #f6f9f6;
  font-size: 20rpx;
}

.workflow-label {
  font-size: 20rpx;
  white-space: nowrap;
}

.workflow-step.done .workflow-node {
  border-color: #1d7659;
  background: #1d7659;
}

.workflow-step.done {
  color: #1d7659;
}

.workflow-step.active .workflow-node {
  border-color: #1d7659;
  background: #e4f1e9;
  color: #145c46;
  font-weight: 700;
}

.workflow-step.active {
  color: #10352a;
  font-weight: 700;
}

.section-block {
  margin-top: 32rpx;
}

.section-count {
  color: #65726c;
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
  border-bottom: 1rpx solid #eaf0ec;
}

.info-row:last-child,
.material-row:last-child {
  border-bottom: 0;
}

.info-label {
  flex: none;
  color: #65726c;
  font-size: 24rpx;
}

.info-value {
  color: #14231d;
  font-size: 25rpx;
  text-align: right;
  word-break: break-all;
}

.phone-value {
  display: flex;
  align-items: center;
  gap: 6rpx;
  color: #1d7659;
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
  background: #e4f1e9;
  color: #1d7659;
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
  color: #65726c;
  font-size: 22rpx;
}

.site-remark {
  margin-top: 6rpx;
  color: #7b8881;
  font-size: 21rpx;
}

.site-photo-stats {
  flex: none;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  color: #1d7659;
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
  color: #65726c;
  font-size: 21rpx;
}

.material-qty {
  flex: none;
  color: #1d7659;
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
  background: #fae9e6;
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
  border-top: 1rpx solid #dce6df;
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

.retry-button {
  margin-top: 22rpx;
}
</style>
