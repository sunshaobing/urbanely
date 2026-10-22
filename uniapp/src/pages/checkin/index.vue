<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import UniIcons from "@dcloudio/uni-ui/lib/uni-icons/uni-icons.vue";
import PageHeader from "../../components/PageHeader.vue";
import {
  checkinServiceReport,
  checkinWorkOrder,
  getServiceReport,
  getWorkOrder,
} from "../../utils/api";
import { getSession } from "../../utils/auth";
import { formatAccuracy, getPreciseLocation } from "../../utils/location";
import { ownTasks, roleMode } from "../../utils/roles";
import type { ServiceReport, WorkOrder } from "../../utils/types";

type CheckinKind = "survey" | "sealing";

const task = ref<WorkOrder | null>(null);
const report = ref<ServiceReport | null>(null);
const taskId = ref(0);
const reportId = ref(0);
const kind = ref<CheckinKind>("survey");
const loading = ref(true);
const submitting = ref(false);
const error = ref("");
const done = ref(false);
const result = ref<{
  time: string;
  accuracy: string;
  location: string;
} | null>(null);

const isSealing = computed(() => kind.value === "sealing");
const title = computed(() => (isSealing.value ? "封堵现场签到" : "勘测现场签到"));

function formatTime(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function load() {
  const session = getSession();
  if (!session) {
    uni.reLaunch({ url: "/pages/login/index" });
    return;
  }
  if (!taskId.value) {
    error.value = "缺少任务编号";
    loading.value = false;
    return;
  }
  try {
    const order = await getWorkOrder(taskId.value);
    const relatedReport =
      isSealing.value && reportId.value
        ? await getServiceReport(reportId.value)
        : null;
    const mode = roleMode(session.role);
    if (
      mode === "none" ||
      ownTasks(
        [order],
        session,
        mode,
        relatedReport ? [relatedReport] : [],
      ).length === 0
    ) {
      uni.reLaunch({ url: "/pages/workbench/index" });
      return;
    }
    task.value = order;
    report.value = relatedReport;
  } catch (loadError) {
    error.value =
      loadError instanceof Error ? loadError.message : "签到信息加载失败";
  } finally {
    loading.value = false;
  }
}

async function submitCheckin() {
  if (!task.value || submitting.value) return;
  submitting.value = true;
  error.value = "";
  try {
    const location = await getPreciseLocation();
    const role = isSealing.value ? "sealing" : "surveyor";
    await checkinWorkOrder(task.value.id, {
      role,
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      address: task.value.service_address || "",
    });
    if (isSealing.value && report.value) {
      await checkinServiceReport(
        report.value.id,
        location.label,
        "",
        {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
        },
      );
    }
    result.value = {
      time: formatTime(new Date().toISOString()),
      accuracy: formatAccuracy(location.accuracy),
      location: task.value.service_address || location.label,
    };
    done.value = true;
    uni.showToast({ title: "签到成功", icon: "success" });
  } catch (actionError) {
    error.value =
      actionError instanceof Error ? actionError.message : "签到失败，请重试";
    uni.showToast({ title: error.value, icon: "none", duration: 3000 });
  } finally {
    submitting.value = false;
  }
}

function returnToTask() {
  uni.navigateBack({
    delta: 1,
    fail: () => {
      if (task.value) {
        uni.redirectTo({ url: `/pages/task-detail/index?id=${task.value.id}` });
      }
    },
  });
}

onLoad((query) => {
  taskId.value = Number(query?.taskId || query?.id || 0);
  reportId.value = Number(query?.reportId || 0);
  kind.value = query?.kind === "sealing" ? "sealing" : "survey";
  void load();
});
</script>

<template>
  <view class="checkin-page">
    <PageHeader
      :title="title"
      subtitle="到达客户门店后完成"
      kicker="现场签到"
      back
    />

    <view v-if="loading" class="page-content">
      <view class="empty-state">
        <text class="empty-title">正在读取现场信息</text>
        <text class="empty-copy">请稍候，正在获取任务地址。</text>
      </view>
    </view>

    <view v-else-if="error && !task" class="page-content">
      <view class="empty-state">
        <text class="empty-title">无法加载签到信息</text>
        <text class="empty-copy">{{ error }}</text>
        <button class="btn-secondary retry-button" @tap="load">重新加载</button>
      </view>
    </view>

    <template v-else-if="task">
      <view class="page-content checkin-content">
        <view v-if="!done" class="checkin-panel card">
          <view class="location-mark">
            <UniIcons type="location-filled" size="34" color="#176b52" />
          </view>
          <text class="checkin-heading">确认已到达门店</text>
          <text class="store-name">{{ task.customer_name }}</text>
          <text class="store-address">
            {{ task.service_address || "服务地址待补充" }}
          </text>
          <view class="location-note">
            <text class="location-note-title">签到将记录现场位置</text>
            <text class="location-note-copy">
              仅在点击下方按钮后获取定位，用于确认本次服务到达现场。
            </text>
          </view>
          <text v-if="error" class="error-copy">{{ error }}</text>
        </view>

        <view v-else class="checkin-panel card">
          <view class="success-mark">
            <UniIcons type="checkmarkempty" size="34" color="#ffffff" />
          </view>
          <text class="checkin-heading">签到成功</text>
          <text class="success-copy">现场位置和签到时间已保存</text>
          <view class="result-list">
            <view class="result-row">
              <text>签到时间</text>
              <text>{{ result?.time }}</text>
            </view>
            <view class="result-row">
              <text>定位精度</text>
              <text>{{ result?.accuracy }}</text>
            </view>
            <view class="result-row address-row">
              <text>现场地址</text>
              <text>{{ result?.location }}</text>
            </view>
          </view>
        </view>
      </view>

      <view class="checkin-actions safe-bottom">
        <button
          v-if="!done"
          class="btn-primary checkin-button"
          :disabled="submitting"
          @tap="submitCheckin"
        >
          {{ submitting ? "正在获取定位" : "确认签到" }}
        </button>
        <button v-else class="btn-primary checkin-button" @tap="returnToTask">
          返回任务详情
        </button>
      </view>
    </template>
  </view>
</template>

<style scoped>
.checkin-page {
  min-height: 100vh;
  padding-bottom: calc(138rpx + env(safe-area-inset-bottom));
  background: #f4f7f5;
}

.checkin-content {
  padding-top: 32rpx;
}

.checkin-panel {
  padding: 38rpx 30rpx;
  text-align: center;
}

.location-mark,
.success-mark {
  width: 112rpx;
  height: 112rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  border-radius: 50%;
}

.location-mark {
  border: 1rpx solid #b8d4c5;
  background: #e8f2ed;
}

.success-mark {
  background: #176b52;
}

.checkin-heading {
  display: block;
  margin-top: 24rpx;
  color: #17211d;
  font-size: max(19px, 32rpx);
  font-weight: 700;
}

.store-name {
  display: block;
  margin-top: 22rpx;
  color: #17211d;
  font-size: max(16px, 27rpx);
  font-weight: 700;
}

.store-address,
.success-copy {
  display: block;
  margin-top: 8rpx;
  color: #65736c;
  font-size: max(13px, 23rpx);
  line-height: 1.6;
}

.location-note {
  margin-top: 30rpx;
  padding: 22rpx;
  border: 1rpx solid #dce5df;
  border-radius: 12rpx;
  background: #f7faf8;
  text-align: left;
}

.location-note-title,
.location-note-copy {
  display: block;
}

.location-note-title {
  color: #24352e;
  font-size: max(14px, 24rpx);
  font-weight: 700;
}

.location-note-copy {
  margin-top: 7rpx;
  color: #65736c;
  font-size: max(12px, 21rpx);
  line-height: 1.6;
}

.result-list {
  margin-top: 28rpx;
  border-top: 1rpx solid #e5ece7;
}

.result-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24rpx;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #e5ece7;
  font-size: max(13px, 22rpx);
  text-align: left;
}

.result-row text:first-child {
  flex: none;
  color: #79867f;
}

.result-row text:last-child {
  color: #24352e;
  font-weight: 600;
  text-align: right;
}

.result-row.address-row text:last-child {
  line-height: 1.5;
}

.error-copy {
  display: block;
  margin-top: 18rpx;
  color: #a33e37;
  font-size: 24rpx;
  line-height: 1.55;
}

.checkin-actions {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  padding: 16rpx 32rpx calc(16rpx + env(safe-area-inset-bottom));
  border-top: 1rpx solid #dce5df;
  background: #ffffff;
  box-shadow: 0 -10rpx 32rpx rgba(18, 34, 27, 0.07);
}

.checkin-button {
  width: 100%;
  min-height: 52px;
}

.retry-button {
  margin-top: 22rpx;
}
</style>
