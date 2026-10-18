<script setup lang="ts">
import { ref, watch } from "vue";
import UniIcons from "@dcloudio/uni-ui/lib/uni-icons/uni-icons.vue";

interface CanvasLike {
  beginPath: () => void;
  moveTo: (x: number, y: number) => void;
  lineTo: (x: number, y: number) => void;
  stroke: () => void;
  clearRect: (x: number, y: number, width: number, height: number) => void;
  setLineWidth?: (width: number) => void;
  setLineCap?: (cap: string) => void;
  setLineJoin?: (join: string) => void;
  setStrokeStyle?: (color: string) => void;
  draw?: (reserve?: boolean, callback?: () => void) => void;
  lineWidth?: number;
  lineCap?: string;
  lineJoin?: string;
  strokeStyle?: string;
}

const props = withDefaults(
  defineProps<{
    title: string;
    signer: string;
    hint?: string;
    value?: string;
    disabled?: boolean;
  }>(),
  {
    hint: "",
    value: "",
    disabled: false,
  },
);

const emit = defineEmits<{
  (event: "update:value", value: string): void;
}>();

const canvasId = `signature-${Math.random().toString(36).slice(2, 10)}`;
const canvasRef = ref<HTMLCanvasElement | null>(null);
const drawing = ref(false);
const hasInk = ref(false);
const saving = ref(false);
let context: CanvasLike | null = null;
let lastX = 0;
let lastY = 0;

function canvasContext() {
  if (context) return context;
  const dom = canvasRef.value;
  if (dom && typeof dom.getContext === "function") {
    context = dom.getContext("2d") as unknown as CanvasLike;
    if (context) {
      context.lineWidth = 5;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.strokeStyle = "#17201d";
    }
    return context;
  }
  context = uni.createCanvasContext(canvasId) as unknown as CanvasLike;
  return context;
}

function styleStroke(ctx: CanvasLike) {
  if (ctx.setLineWidth) ctx.setLineWidth(5);
  else ctx.lineWidth = 5;
  if (ctx.setLineCap) ctx.setLineCap("round");
  else ctx.lineCap = "round";
  if (ctx.setLineJoin) ctx.setLineJoin("round");
  else ctx.lineJoin = "round";
  if (ctx.setStrokeStyle) ctx.setStrokeStyle("#17201d");
  else ctx.strokeStyle = "#17201d";
}

function flush(ctx: CanvasLike) {
  if (ctx.draw) ctx.draw();
}

function pointFromEvent(event: TouchEvent) {
  const touch = event.touches?.[0] || event.changedTouches?.[0];
  const dom = canvasRef.value;
  if (dom && touch) {
    const rect = dom.getBoundingClientRect();
    return {
      x: ((touch.clientX - rect.left) / rect.width) * (dom.width || 640),
      y: ((touch.clientY - rect.top) / rect.height) * (dom.height || 240),
    };
  }
  const nativeTouch = touch as (Touch & { x?: number; y?: number }) | undefined;
  return {
    x: Number(nativeTouch?.x ?? 0),
    y: Number(nativeTouch?.y ?? 0),
  };
}

function begin(event: TouchEvent) {
  if (props.disabled || props.value) return;
  const ctx = canvasContext();
  if (!ctx) return;
  const point = pointFromEvent(event);
  lastX = point.x;
  lastY = point.y;
  drawing.value = true;
  hasInk.value = true;
  styleStroke(ctx);
  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
}

function move(event: TouchEvent) {
  if (!drawing.value || props.disabled || props.value) return;
  const ctx = canvasContext();
  if (!ctx) return;
  const point = pointFromEvent(event);
  styleStroke(ctx);
  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  ctx.lineTo(point.x, point.y);
  ctx.stroke();
  lastX = point.x;
  lastY = point.y;
  flush(ctx);
}

function end() {
  drawing.value = false;
}

function clear() {
  const ctx = canvasContext();
  if (!ctx) return;
  ctx.clearRect(0, 0, 640, 240);
  flush(ctx);
  hasInk.value = false;
  emit("update:value", "");
}

function saveCanvas() {
  return new Promise<string>((resolve, reject) => {
    const dom = canvasRef.value;
    if (dom && typeof dom.toDataURL === "function") {
      resolve(dom.toDataURL("image/png"));
      return;
    }
    uni.canvasToTempFilePath({
      canvasId,
      fileType: "png",
      success: (result) => resolve(result.tempFilePath),
      fail: reject,
    });
  });
}

async function confirm() {
  if (props.disabled || saving.value) return;
  if (!hasInk.value) {
    uni.showToast({ title: "请先手写签名", icon: "none" });
    return;
  }
  saving.value = true;
  try {
    const path = await saveCanvas();
    emit("update:value", path);
  } catch {
    uni.showToast({ title: "签名保存失败，请重试", icon: "none" });
  } finally {
    saving.value = false;
  }
}

watch(
  () => props.value,
  (value) => {
    if (!value) {
      hasInk.value = false;
    }
  },
);
</script>

<template>
  <view class="signature-card">
    <view class="signature-head">
      <view class="signature-copy">
        <text class="signature-title">{{ title }}</text>
        <text class="signature-signer">{{ signer }}</text>
      </view>
      <text class="signature-state" :class="{ signed: value }">
        {{ value ? "已签字" : "待签字" }}
      </text>
    </view>
    <text v-if="hint" class="signature-hint">{{ hint }}</text>

    <view v-if="value" class="signature-preview">
      <image class="signature-image" :src="value" mode="aspectFit" />
      <button v-if="!disabled" class="signature-reset" @tap="clear">
        重新签名
      </button>
    </view>

    <view v-else class="signature-pad">
      <canvas
        :id="canvasId"
        :canvas-id="canvasId"
        ref="canvasRef"
        class="signature-canvas"
        width="640"
        height="240"
        :disable-scroll="true"
        @touchstart.stop.prevent="begin"
        @touchmove.stop.prevent="move"
        @touchend.stop.prevent="end"
        @touchcancel.stop.prevent="end"
      />
      <view class="signature-line" />
      <text class="signature-placeholder">请在此处手写签名</text>
      <view class="signature-actions">
        <button class="signature-clear" @tap="clear">
          <UniIcons type="trash" size="16" color="#6f7974" />
          <text>清除</text>
        </button>
        <button class="signature-confirm" :disabled="saving" @tap="confirm">
          {{ saving ? "保存中" : "确认签名" }}
        </button>
      </view>
    </view>
  </view>
</template>

<style scoped>
.signature-card {
  padding: 28rpx;
  border: 1rpx solid #dfe5e1;
  border-radius: 16rpx;
  background: #ffffff;
}

.signature-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20rpx;
}

.signature-title,
.signature-signer {
  display: block;
}

.signature-title {
  font-size: 28rpx;
  font-weight: 700;
}

.signature-signer {
  margin-top: 6rpx;
  color: #6f7974;
  font-size: 22rpx;
}

.signature-state {
  flex: none;
  padding: 6rpx 12rpx;
  border-radius: 10rpx;
  background: #fbf0de;
  color: #a36a24;
  font-size: 20rpx;
}

.signature-state.signed {
  background: #eaf3ec;
  color: #3f7452;
}

.signature-hint {
  display: block;
  margin-top: 10rpx;
  color: #6f7974;
  font-size: 22rpx;
  line-height: 1.45;
}

.signature-pad {
  position: relative;
  margin-top: 20rpx;
}

.signature-canvas {
  width: 100%;
  height: 240rpx;
  border: 1rpx dashed #cfd8d2;
  border-radius: 12rpx;
  background: #fbfcfa;
}

.signature-line {
  position: absolute;
  right: 24rpx;
  bottom: 90rpx;
  left: 24rpx;
  height: 1rpx;
  background: #e1e5e1;
}

.signature-placeholder {
  position: absolute;
  right: 24rpx;
  bottom: 48rpx;
  left: 24rpx;
  color: #a0a8a3;
  font-size: 22rpx;
  text-align: center;
}

.signature-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
  margin-top: 16rpx;
}

.signature-clear,
.signature-confirm {
  min-height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  padding: 0 20rpx;
  border-radius: 12rpx;
  font-size: 24rpx;
}

.signature-clear {
  color: #6f7974;
}

.signature-confirm {
  background: #14201c;
  color: #ffffff;
  font-weight: 600;
}

.signature-confirm[disabled] {
  opacity: 0.5;
}

.signature-preview {
  margin-top: 18rpx;
}

.signature-image {
  width: 100%;
  height: 240rpx;
  display: block;
  border: 1rpx solid #dfe5e1;
  border-radius: 12rpx;
  background: #fbfcfa;
}

.signature-reset {
  margin-top: 12rpx;
  color: #1d7659;
  font-size: 24rpx;
  text-align: right;
}
</style>
