<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
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
    upload?: (path: string) => Promise<string>;
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
const uploading = ref(false);
const uploadError = ref("");
const uploaded = ref(false);
const displayValue = ref(props.value);
const uploadState = computed(() => {
  if (uploading.value) return "正在上传到后端";
  if (uploadError.value) return "上传失败，提交时重试";
  if (uploaded.value) return "已上传到后端";
  return props.value ? "点击重新签字" : "点击横屏签字";
});

function onSignature(payload: SignaturePayload) {
  if (payload.token !== token) return;
  displayValue.value = payload.path;
  emit("update:value", payload.path);
  if (props.role === "customer") {
    emit("update:department", payload.department);
  }
  void uploadSignature(payload.path);
}

async function uploadSignature(path: string) {
  if (!props.upload) {
    uploaded.value = path.startsWith("http");
    return;
  }
  uploading.value = true;
  uploadError.value = "";
  try {
    const url = await props.upload(path);
    emit("update:value", url);
    uploaded.value = true;
  } catch (error) {
    uploaded.value = false;
    uploadError.value =
      error instanceof Error ? error.message : "签字图片上传失败";
  } finally {
    uploading.value = false;
  }
}

function retryUpload() {
  const path = displayValue.value || props.value;
  if (!path || path.startsWith("http") || uploading.value) return;
  void uploadSignature(path);
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

watch(
  () => props.value,
  (value) => {
    if (value.startsWith("http")) {
      uploaded.value = true;
      uploadError.value = "";
      if (!displayValue.value || displayValue.value.startsWith("http")) {
        displayValue.value = value;
      }
    } else if (!value) {
      displayValue.value = "";
      uploaded.value = false;
      uploadError.value = "";
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  uni.$off(SIGNATURE_COMPLETE_EVENT, onSignature);
});
</script>

<template>
    <view
      class="signature-entry"
      :data-signature-state="
        uploading
          ? 'uploading'
          : uploadError
            ? 'failed'
            : uploaded
              ? 'uploaded'
              : displayValue
                ? 'local'
                : 'empty'
      "
      :data-signature-src="
        !value ? 'empty' : value.startsWith('http') ? 'remote' : 'local'
      "
    >
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
          {{ roleTitle }}{{ displayValue ? "已签" : "" }}
        </text>
        <text class="signature-trigger-state">
          {{ uploadState }}
        </text>
      </view>
      <UniIcons type="right" size="15" :color="theme.ink" />
    </button>

    <view v-if="displayValue" class="signature-result">
      <image class="signature-result-image" :src="displayValue" mode="aspectFit" />
    </view>

    <view v-if="uploadError" class="signature-upload-status">
      <text class="signature-upload-error">{{ uploadError }}</text>
      <button class="signature-retry" @tap="retryUpload">重试上传</button>
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

.signature-upload-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
  margin-top: 8rpx;
  padding: 10rpx 12rpx;
  border-radius: 8rpx;
  background: #fff4f2;
}

.signature-upload-error {
  flex: 1;
  min-width: 0;
  color: #9b3d35;
  font-size: 18rpx;
  line-height: 1.35;
}

.signature-retry {
  flex: none;
  min-height: 48rpx;
  margin: 0;
  padding: 0 16rpx;
  border: 1rpx solid #c85b50;
  border-radius: 24rpx;
  background: #ffffff;
  color: #9b3d35;
  font-size: 18rpx;
  line-height: 46rpx;
}
</style>
