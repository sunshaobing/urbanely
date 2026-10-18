<script setup lang="ts">
import UniIcons from "@dcloudio/uni-ui/lib/uni-icons/uni-icons.vue";

withDefaults(
  defineProps<{
    title: string;
    subtitle?: string;
    kicker?: string;
    back?: boolean;
    dark?: boolean;
  }>(),
  {
    subtitle: "",
    kicker: "",
    back: false,
    dark: false,
  },
);

function goBack() {
  uni.navigateBack({
    delta: 1,
    fail: () => uni.reLaunch({ url: "/pages/workbench/index" }),
  });
}
</script>

<template>
  <view class="page-header" :class="{ dark }">
    <view class="page-header-top">
      <view v-if="back" class="header-back" @tap="goBack">
        <UniIcons
          type="left"
          size="20"
          :color="dark ? '#ffffff' : '#17201d'"
        />
      </view>
      <view class="header-copy">
        <text v-if="kicker" class="header-kicker">{{ kicker }}</text>
        <text class="header-title">{{ title }}</text>
        <text v-if="subtitle" class="header-subtitle">{{ subtitle }}</text>
      </view>
      <view class="header-action">
        <slot name="action" />
      </view>
    </view>
    <slot />
  </view>
</template>

<style scoped>
.page-header {
  padding: calc(32rpx + env(safe-area-inset-top)) 32rpx 32rpx;
  border-bottom: 1rpx solid #e1e5e1;
  background: #ffffff;
}

.page-header.dark {
  border-bottom: 0;
  background: #10352a;
  color: #ffffff;
}

.page-header-top {
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
}

.header-back {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  margin-top: 4rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.16);
  border-radius: 16rpx;
  background: rgba(255, 255, 255, 0.06);
}

.page-header:not(.dark) .header-back {
  border-color: #dfe5e1;
  background: #f5f6f2;
}

.header-copy {
  flex: 1;
  min-width: 0;
}

.header-kicker {
  display: block;
  color: #77b9a3;
  font-size: 22rpx;
  font-weight: 700;
  letter-spacing: 1rpx;
  text-transform: uppercase;
}

.page-header:not(.dark) .header-kicker {
  color: #1d7659;
}

.header-title {
  display: block;
  margin-top: 8rpx;
  font-size: 40rpx;
  font-weight: 700;
  line-height: 1.3;
}

.header-subtitle {
  display: block;
  margin-top: 10rpx;
  color: #8f9a95;
  font-size: 24rpx;
  line-height: 1.45;
}

.page-header:not(.dark) .header-subtitle {
  color: #6f7974;
}

.header-action {
  flex: none;
}
</style>
