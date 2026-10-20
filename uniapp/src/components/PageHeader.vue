<script setup lang="ts">
import UniIcons from "@dcloudio/uni-ui/lib/uni-icons/uni-icons.vue";

withDefaults(
  defineProps<{
    title: string;
    subtitle?: string;
    kicker?: string;
    back?: boolean;
  }>(),
  {
    subtitle: "",
    kicker: "",
    back: false,
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
  <view class="page-header">
    <view class="page-header-top">
      <view v-if="back" class="header-back" @tap="goBack">
        <UniIcons type="left" size="19" color="#17211d" />
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
  padding: calc(26rpx + env(safe-area-inset-top)) 32rpx 24rpx;
  border-bottom: 1rpx solid #dde7e0;
  background: #f8fbf9;
}

.page-header-top {
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
}

.header-back {
  width: 62rpx;
  height: 62rpx;
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  margin-top: 2rpx;
  border: 1rpx solid #d8e4dc;
  border-radius: 12rpx;
  background: #ffffff;
}

.header-copy {
  flex: 1;
  min-width: 0;
}

.header-kicker {
  display: block;
  color: #176b52;
  font-size: 20rpx;
  font-weight: 700;
}

.header-title {
  display: block;
  margin-top: 4rpx;
  font-size: 38rpx;
  font-weight: 700;
  line-height: 1.25;
}

.header-subtitle {
  display: block;
  margin-top: 6rpx;
  color: #65736c;
  font-size: 22rpx;
  line-height: 1.5;
}

.header-action {
  flex: none;
}
</style>
