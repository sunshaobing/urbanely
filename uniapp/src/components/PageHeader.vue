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
  border-bottom: 1rpx solid #dce5df;
  border-radius: 0 0 24rpx 24rpx;
  background: #ffffff;
}

.page-header-top {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 52px;
}

.header-back {
  position: absolute;
  top: 50%;
  left: 0;
  width: 48px;
  height: 48px;
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  transform: translateY(-50%);
  border: 1rpx solid #d8e4dc;
  border-radius: 999px;
  background: #ffffff;
}

.header-copy {
  width: 100%;
  min-width: 0;
  padding: 0 150rpx;
  text-align: center;
}

.header-kicker {
  display: block;
  color: #65736c;
  font-size: 20rpx;
  font-weight: 600;
}

.header-title {
  display: block;
  margin-top: 3rpx;
  color: #17211d;
  font-size: max(19px, 32rpx);
  font-weight: 700;
  line-height: 1.3;
}

.header-subtitle {
  display: block;
  margin-top: 6rpx;
  color: #65736c;
  font-size: max(12px, 22rpx);
  line-height: 1.5;
}

.header-action {
  position: absolute;
  top: 50%;
  right: 0;
  max-width: 190rpx;
  transform: translateY(-50%);
}

/* #ifdef APP-PLUS */
.page-header {
  padding-top: calc(52rpx + env(safe-area-inset-top));
}
/* #endif */
</style>
