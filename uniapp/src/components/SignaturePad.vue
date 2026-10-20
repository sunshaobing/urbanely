<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from "vue";
import UniIcons from "@dcloudio/uni-ui/lib/uni-icons/uni-icons.vue";
import {
  getSignatureTheme,
  SIGNATURE_COMPLETE_EVENT,
} from "../config/index.js";
import type {
  SignatureRole,
  SignatureVariant,
} from "../config/index.js";

interface SignaturePayload {
  token: string;
  path: string;
  role: SignatureRole;
  department: string;
  signedAt: string;
}

const props = withDefaults(
  defineProps<{
    title: string;
    signer: string;
    role: SignatureRole;
    hint?: string;
    value?: string;
    department?: string;
    variant?: SignatureVariant;
    disabled?: boolean;
  }>(),
  {
    hint: "",
    value: "",
    department: "",
    variant: "reference",
    disabled: false,
  },
);

const emit = defineEmits<{
  (event: "update:value", value: string): void;
  (event: "update:department", value: string): void;
}>();

const token = `signature-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const theme = computed(() => getSignatureTheme(props.role, props.variant));
const roleTitle = computed(() =>
  props.role === "customer" ? "客户签字" : "员工签字",
);
const buttonStyle = computed(() => ({
  background: theme.value.background,
  borderColor: theme.value.ink,
  color: theme.value.ink,
}));

function onSignature(payload: SignaturePayload) {
  if (payload.token !== token) return;
  emit("update:value", payload.path);
  if (props.role === "customer") {
    emit("update:department", payload.department);
  }
}

function openSignatureScene() {
  if (props.disabled) return;
  const query = [
    `role=${props.role}`,
    `variant=${props.variant}`,
    `token=${encodeURIComponent(token)}`,
    `signer=${encodeURIComponent(props.signer)}`,
    `department=${encodeURIComponent(props.department || "")}`,
  ].join("&");
  uni.navigateTo({ url: `/pages/signature/index?${query}` });
}

onMounted(() => {
  uni.$on(SIGNATURE_COMPLETE_EVENT, onSignature);
});

onBeforeUnmount(() => {
  uni.$off(SIGNATURE_COMPLETE_EVENT, onSignature);
});
</script>

<template>
  <view class="signature-entry">
    <button
      class="signature-trigger"
      :style="buttonStyle"
      :disabled="disabled"
      :aria-label="`${title || roleTitle}${value ? '已签字，点击重新签字' : '，点击进入横屏手写签字'}`"
      @tap="openSignatureScene"
    >
      <view class="signature-trigger-icon">
        <UniIcons type="compose" size="16" :color="theme.ink" />
      </view>
      <view class="signature-trigger-copy">
        <text class="signature-trigger-title">
          {{ roleTitle }}{{ value ? "已签" : "" }}
        </text>
        <text class="signature-trigger-state">
          {{ value ? "点击重新签字" : "点击横屏签字" }}
        </text>
      </view>
      <UniIcons type="right" size="15" :color="theme.ink" />
    </button>

    <view v-if="value" class="signature-result">
      <image class="signature-result-image" :src="value" mode="aspectFit" />
    </view>
  </view>
</template>

<style scoped>
.signature-trigger {
  width: 100%;
  min-height: 80rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 0 20rpx;
  border: 1rpx solid;
  border-radius: 40rpx;
  text-align: left;
}

.signature-trigger[disabled] {
  opacity: 0.48;
}

.signature-trigger-icon {
  width: 46rpx;
  height: 46rpx;
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.62);
}

.signature-trigger-copy {
  flex: 1;
  min-width: 0;
}

.signature-trigger-title,
.signature-trigger-state {
  display: block;
}

.signature-trigger-title {
  font-size: 23rpx;
  font-weight: 700;
  line-height: 1.2;
}

.signature-trigger-state {
  margin-top: 3rpx;
  font-size: 17rpx;
  line-height: 1.2;
  opacity: 0.62;
}

.signature-entry {
  margin-top: 12rpx;
}

.signature-result {
  margin-top: 10rpx;
  overflow: hidden;
  border: 1rpx solid #d8e2da;
  border-radius: 10rpx;
  background: #ffffff;
}

.signature-result-image {
  width: 100%;
  height: 200rpx;
  display: block;
}
</style>
