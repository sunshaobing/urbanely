<script setup lang="ts">
import { ref } from "vue";
import { onPullDownRefresh, onShow } from "@dcloudio/uni-app";
import UniIcons from "@dcloudio/uni-ui/lib/uni-icons/uni-icons.vue";
import AppTabBar from "../../components/AppTabBar.vue";
import { getDashboardSummary } from "../../utils/api";
import { clearSession, getSession } from "../../utils/auth";
import { roleLabel } from "../../utils/present";
import type { Session } from "../../utils/types";

const session = ref<Session | null>(null);
const metrics = ref([
  { label: "本月任务", value: 0 },
  { label: "风险勘测", value: 0 },
  { label: "封堵记录", value: 0 },
  { label: "到期复检", value: 0 },
]);
const loading = ref(false);
const error = ref("");
const updatedAt = ref("");

function errorText(value: unknown) {
  return value instanceof Error ? value.message : "账号数据加载失败";
}

async function load() {
  const current = getSession();
  if (!current) {
    uni.reLaunch({ url: "/pages/login/index" });
    return;
  }
  if (loading.value) return;
  session.value = current;
  loading.value = true;
  error.value = "";
  try {
    const summary = await getDashboardSummary();
    metrics.value = [
      { label: "本月任务", value: summary.cards.month_orders },
      { label: "风险勘测", value: summary.cards.risk_surveys },
      { label: "封堵记录", value: summary.cards.service_reports ?? 0 },
      { label: "到期复检", value: summary.cards.due_inspections },
    ];
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

function openPassword() {
  uni.navigateTo({ url: "/pages/password/index" });
}

function about() {
  uni.showModal({
    title: "申汰封堵勘测",
    content: "uni-app 现场作业端\n数据服务由腾讯云提供",
    showCancel: false,
  });
}

function logout() {
  uni.showModal({
    title: "退出登录",
    content: "确认退出当前账号？",
    confirmColor: "#a8443c",
    success: (result) => {
      if (!result.confirm) return;
      clearSession();
      uni.reLaunch({ url: "/pages/login/index" });
    },
  });
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
  <view class="page profile-page">
    <view class="profile-hero">
      <view class="profile-topline">
        <view>
          <text class="profile-kicker">MY ACCOUNT</text>
          <text class="profile-title">我的</text>
        </view>
        <view class="profile-refresh" @tap="load">
          <UniIcons type="refreshempty" size="18" color="#a5d0be" />
        </view>
      </view>

      <view class="identity-card">
        <image class="profile-avatar" src="/static/tech-avatar.png" mode="aspectFill" />
        <view class="identity-copy">
          <text class="profile-name">{{ session?.name || session?.username || "现场人员" }}</text>
          <text class="profile-role">{{ roleLabel(session?.role || "") }}</text>
          <text class="profile-phone">{{ session?.username }} · {{ session?.phoneMasked }}</text>
        </view>
        <view class="online-badge">
          <view class="online-dot" />
          <text>在线</text>
        </view>
      </view>
    </view>

    <view class="page-content profile-content">
      <view v-if="error" class="error-banner">
        <UniIcons type="info-filled" size="18" color="#a8443c" />
        <view class="error-copy-wrap">
          <text class="error-title">数据未加载</text>
          <text class="error-copy">{{ error }}</text>
        </view>
        <view class="error-retry" @tap="load">重试</view>
      </view>

      <view class="metric-grid">
        <view v-for="item in metrics" :key="item.label" class="metric-card card">
          <text class="metric-value">{{ loading ? "--" : item.value }}</text>
          <text class="metric-label">{{ item.label }}</text>
        </view>
      </view>

      <view class="sync-card card">
        <view class="sync-icon">
          <UniIcons type="cloud-upload" size="21" color="#1d7659" />
        </view>
        <view class="sync-copy">
          <text class="sync-title">生产数据服务</text>
          <text class="sync-sub">
            {{ updatedAt ? `最近同步 ${updatedAt}` : "正在连接腾讯云" }}
          </text>
        </view>
        <view class="sync-status">
          <view class="sync-pulse" />
          <text>正常</text>
        </view>
      </view>

      <view class="menu-section">
        <text class="menu-section-title">账号与系统</text>
        <view class="menu-card card">
          <view class="menu-row pressable" @tap="openPassword">
            <view class="menu-icon">
              <UniIcons type="locked" size="19" color="#1d7659" />
            </view>
            <view class="menu-copy">
              <text class="menu-title">修改密码</text>
              <text class="menu-sub">更新当前账号的登录密码</text>
            </view>
            <UniIcons type="right" size="16" color="#8a968f" />
          </view>
          <view class="menu-row pressable" @tap="about">
            <view class="menu-icon">
              <UniIcons type="info" size="19" color="#1d7659" />
            </view>
            <view class="menu-copy">
              <text class="menu-title">关于系统</text>
              <text class="menu-sub">uni-app 现场作业端 · v1.0</text>
            </view>
            <UniIcons type="right" size="16" color="#8a968f" />
          </view>
          <view class="menu-row danger pressable" @tap="logout">
            <view class="menu-icon danger-icon">
              <UniIcons type="undo" size="19" color="#a8443c" />
            </view>
            <view class="menu-copy">
              <text class="menu-title">退出登录</text>
              <text class="menu-sub">清除当前设备上的账号会话</text>
            </view>
            <UniIcons type="right" size="16" color="#8a968f" />
          </view>
        </view>
      </view>

      <text class="profile-footnote">
        上海申汰实业有限公司 · 内部现场服务系统
      </text>
    </view>

    <AppTabBar current="profile" />
  </view>
</template>

<style scoped>
.profile-page {
  background: #eef4ef;
}

.profile-hero {
  padding: calc(32rpx + env(safe-area-inset-top)) 32rpx 104rpx;
  background: #10352a;
  color: #ffffff;
}

.profile-topline,
.identity-card,
.sync-card,
.sync-status,
.menu-row {
  display: flex;
  align-items: center;
}

.profile-topline {
  justify-content: space-between;
  gap: 24rpx;
}

.profile-kicker {
  display: block;
  color: #82bda7;
  font-size: 22rpx;
  font-weight: 700;
  letter-spacing: 1rpx;
}

.profile-title {
  display: block;
  margin-top: 8rpx;
  font-size: 46rpx;
  font-weight: 700;
}

.profile-refresh {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1rpx solid rgba(255, 255, 255, 0.16);
  border-radius: 16rpx;
  background: rgba(255, 255, 255, 0.06);
}

.identity-card {
  gap: 18rpx;
  margin-top: 30rpx;
}

.profile-avatar {
  width: 108rpx;
  height: 108rpx;
  flex: none;
  border: 2rpx solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  background: #e4f1e9;
}

.identity-copy {
  flex: 1;
  min-width: 0;
}

.profile-name,
.profile-role,
.profile-phone {
  display: block;
}

.profile-name {
  font-size: 36rpx;
  font-weight: 700;
}

.profile-role {
  margin-top: 4rpx;
  color: #a5d0be;
  font-size: 24rpx;
}

.profile-phone {
  margin-top: 6rpx;
  color: #8fb6a6;
  font-size: 21rpx;
}

.online-badge {
  display: flex;
  flex: none;
  align-items: center;
  gap: 6rpx;
  padding: 8rpx 12rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.15);
  border-radius: 10rpx;
  color: #c4ded2;
  font-size: 20rpx;
}

.online-dot {
  width: 10rpx;
  height: 10rpx;
  border-radius: 50%;
  background: #75c49d;
}

.profile-content {
  margin-top: -66rpx;
}

.metric-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.metric-card {
  width: calc(50% - 6rpx);
  padding: 20rpx;
}

.metric-value,
.metric-label {
  display: block;
}

.metric-value {
  font-size: 38rpx;
  font-weight: 700;
}

.metric-label {
  margin-top: 4rpx;
  color: #65726c;
  font-size: 21rpx;
}

.sync-card {
  gap: 14rpx;
  margin-top: 18rpx;
  padding: 18rpx 20rpx;
}

.sync-icon {
  width: 58rpx;
  height: 58rpx;
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  border-radius: 14rpx;
  background: #e4f1e9;
}

.sync-copy {
  flex: 1;
  min-width: 0;
}

.sync-title,
.sync-sub {
  display: block;
}

.sync-title {
  font-size: 24rpx;
  font-weight: 700;
}

.sync-sub {
  margin-top: 3rpx;
  color: #65726c;
  font-size: 20rpx;
}

.sync-status {
  flex: none;
  gap: 5rpx;
  color: #3f7452;
  font-size: 20rpx;
}

.sync-pulse {
  width: 10rpx;
  height: 10rpx;
  border-radius: 50%;
  background: #4c9a72;
}

.menu-section {
  margin-top: 30rpx;
}

.menu-section-title {
  display: block;
  margin-bottom: 12rpx;
  color: #65726c;
  font-size: 22rpx;
  font-weight: 600;
}

.menu-card {
  padding: 0 20rpx;
}

.menu-row {
  gap: 14rpx;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #eaf0ec;
}

.menu-row:last-child {
  border-bottom: 0;
}

.menu-icon {
  width: 54rpx;
  height: 54rpx;
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  border-radius: 14rpx;
  background: #e4f1e9;
}

.danger-icon {
  background: #fae9e6;
}

.menu-copy {
  flex: 1;
  min-width: 0;
}

.menu-title,
.menu-sub {
  display: block;
}

.menu-title {
  font-size: 26rpx;
  font-weight: 600;
}

.menu-sub {
  margin-top: 3rpx;
  color: #65726c;
  font-size: 20rpx;
}

.menu-row.danger .menu-title {
  color: #a8443c;
}

.error-banner {
  display: flex;
  align-items: flex-start;
  gap: 10rpx;
  margin-bottom: 16rpx;
  padding: 18rpx 20rpx;
  border: 1rpx solid #eccfca;
  border-radius: 16rpx;
  background: #fae9e6;
}

.error-copy-wrap {
  flex: 1;
  min-width: 0;
}

.error-title {
  display: block;
  color: #8e3a33;
  font-size: 24rpx;
  font-weight: 700;
}

.error-retry {
  flex: none;
  color: #8e3a33;
  font-size: 22rpx;
}

.profile-footnote {
  display: block;
  margin-top: 28rpx;
  color: #8a968f;
  font-size: 20rpx;
  text-align: center;
}
</style>
