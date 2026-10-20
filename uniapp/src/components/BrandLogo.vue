<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { brandState } from "../utils/brand";

const props = withDefaults(
  defineProps<{
    size?: number;
    showName?: boolean;
    nameSize?: number;
    light?: boolean;
  }>(),
  {
    size: 56,
    showName: false,
    nameSize: 28,
    light: false,
  },
);

const failed = ref(false);
const logoStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
}));
const nameStyle = computed(() => ({
  fontSize: `${props.nameSize}px`,
}));

watch(
  () => brandState.logo_url,
  () => {
    failed.value = false;
  },
);
</script>

<template>
  <view class="brand-logo" :class="{ light }">
    <view class="brand-logo-shell" :style="logoStyle">
      <image
        v-if="brandState.logo_url && !failed"
        class="brand-logo-image"
        :src="brandState.logo_url"
        mode="aspectFit"
        @error="failed = true"
      />
      <view v-else class="brand-fallback">
        <view class="brand-shield">
          <view class="brand-check" />
        </view>
      </view>
    </view>
    <text v-if="showName" class="brand-logo-name" :style="nameStyle">
      {{ brandState.company_name }}
    </text>
  </view>
</template>

<style scoped>
.brand-logo {
  display: flex;
  align-items: center;
  gap: 14rpx;
  min-width: 0;
}

.brand-logo-shell {
  flex: none;
  overflow: hidden;
  border: 1rpx solid rgba(16, 53, 42, 0.1);
  border-radius: 12rpx;
  background: #ffffff;
}

.brand-logo-image {
  width: 100%;
  height: 100%;
  display: block;
}

.brand-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1f6fb2;
}

.brand-shield {
  width: 54%;
  height: 62%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3rpx solid #ffffff;
  border-radius: 12% 12% 42% 42%;
}

.brand-check {
  width: 42%;
  height: 24%;
  margin-top: -8%;
  border-bottom: 3rpx solid #ffffff;
  border-left: 3rpx solid #ffffff;
  transform: rotate(-45deg);
}

.brand-logo-name {
  min-width: 0;
  overflow: hidden;
  color: #173550;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.brand-logo.light .brand-logo-shell {
  border-color: rgba(255, 255, 255, 0.2);
}

.brand-logo.light .brand-logo-name {
  color: #ffffff;
}
</style>
