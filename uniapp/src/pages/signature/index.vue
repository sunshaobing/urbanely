<script setup lang="ts">
import { computed, getCurrentInstance, nextTick, ref } from "vue";
import {
  onBackPress,
  onLoad,
  onReady,
  onResize,
  onUnload,
} from "@dcloudio/uni-app";
import {
  getSignatureTheme,
  SIGNATURE_COMPLETE_EVENT,
  SIGNATURE_EXPORT_SCALE,
} from "../../config/index.js";
import type {
  SignatureRole,
  SignatureVariant,
} from "../../config/index.js";

interface LegacyCanvasContext {
  setFillStyle: (color: string) => void;
  setStrokeStyle: (color: string) => void;
  setLineWidth: (width: number) => void;
  setLineCap: (cap: string) => void;
  setLineJoin: (join: string) => void;
  setTextAlign: (align: string) => void;
  setTextBaseline: (baseline: string) => void;
  setFontSize: (size: number) => void;
  fillRect: (x: number, y: number, width: number, height: number) => void;
  fillText: (text: string, x: number, y: number) => void;
  beginPath: () => void;
  moveTo: (x: number, y: number) => void;
  lineTo: (x: number, y: number) => void;
  stroke: () => void;
  draw: (reserve?: boolean, callback?: () => void) => void;
}

interface CanvasPainter {
  setFillStyle: (color: string) => void;
  setStrokeStyle: (color: string) => void;
  setLineWidth: (width: number) => void;
  setLineCap: (cap: string) => void;
  setLineJoin: (join: string) => void;
  setTextAlign: (align: string) => void;
  setTextBaseline: (baseline: string) => void;
  setFont: (size: number, weight?: number) => void;
  fillRect: (x: number, y: number, width: number, height: number) => void;
  fillText: (text: string, x: number, y: number) => void;
  beginPath: () => void;
  moveTo: (x: number, y: number) => void;
  lineTo: (x: number, y: number) => void;
  stroke: () => void;
  draw: () => void;
}

const ANDROID_IMMERSIVE_FLAGS =
  0x00000004 | // SYSTEM_UI_FLAG_FULLSCREEN
  0x00000002 | // SYSTEM_UI_FLAG_HIDE_NAVIGATION
  0x00001000 | // SYSTEM_UI_FLAG_IMMERSIVE_STICKY
  0x00000100 | // SYSTEM_UI_FLAG_LAYOUT_STABLE
  0x00000200 | // SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
  0x00000400; // SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN

const instance = getCurrentInstance();
const role = ref<SignatureRole>("employee");
const variant = ref<SignatureVariant>("reference");
const signer = ref("签字人");
const token = ref("");
const department = ref("");
const signedAt = ref(formatDateTime(new Date()));
const hasInk = ref(false);
const canvasReady = ref(false);
const completing = ref(false);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const theme = computed(() => getSignatureTheme(role.value, variant.value));
const sceneStyle = computed(() => ({
  background: theme.value.background,
  color: theme.value.ink,
}));
const isCustomer = computed(() => role.value === "customer");
const roleTitle = computed(() =>
  isCustomer.value ? "客户签字" : "员工签字",
);

let context: CanvasPainter | null = null;
let domCanvas: HTMLCanvasElement | null = null;
let canvasOwner: unknown = null;
let cssWidth = 0;
let cssHeight = 0;
let drawing = false;
let lastX = 0;
let lastY = 0;
let allowLeave = false;
const settleTimers: ReturnType<typeof setTimeout>[] = [];

function formatDateTime(value: Date) {
  const pad = (number: number) => String(number).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(
    value.getDate(),
  )} ${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(
    value.getSeconds(),
  )}`;
}

function setAndroidSystemBarsHidden(hidden: boolean) {
  try {
    const android = plus.android;
    const activity = android.runtimeMainActivity();
    const window = android.invoke(activity, "getWindow");
    const decorView = android.invoke(window, "getDecorView");
    android.invoke(
      decorView,
      "setSystemUiVisibility",
      hidden ? ANDROID_IMMERSIVE_FLAGS : 0,
    );
  } catch {
    // plus.navigator.setFullscreen remains the cross-platform fallback.
  }
}

function nativeCanvas() {
  const isCanvas = (value: unknown): value is HTMLCanvasElement => {
    const element = value as HTMLCanvasElement | null;
    return Boolean(
      element &&
        element.tagName === "CANVAS" &&
        typeof element.getContext === "function",
    );
  };
  if (typeof document !== "undefined") {
    const host = document.querySelector("#signature-canvas");
    const queried =
      host?.tagName === "CANVAS" ? host : host?.querySelector("canvas");
    if (isCanvas(queried)) return queried;
  }
  const element = canvasRef.value as unknown as
    | (HTMLElement & {
        querySelector?: (selector: string) => Element | null;
      })
    | null;
  if (!element) return null;
  if (isCanvas(element)) return element;
  const inner = element.querySelector?.("canvas");
  if (isCanvas(inner)) return inner;
  return null;
}

function domPainter(ctx: CanvasRenderingContext2D): CanvasPainter {
  return {
    setFillStyle: (color) => {
      ctx.fillStyle = color;
    },
    setStrokeStyle: (color) => {
      ctx.strokeStyle = color;
    },
    setLineWidth: (width) => {
      ctx.lineWidth = width;
    },
    setLineCap: (cap) => {
      ctx.lineCap = cap as CanvasLineCap;
    },
    setLineJoin: (join) => {
      ctx.lineJoin = join as CanvasLineJoin;
    },
    setTextAlign: (align) => {
      ctx.textAlign = align as CanvasTextAlign;
    },
    setTextBaseline: (baseline) => {
      ctx.textBaseline = baseline as CanvasTextBaseline;
    },
    setFont: (size, weight = 400) => {
      ctx.font = `${weight} ${size}px -apple-system, BlinkMacSystemFont, sans-serif`;
    },
    fillRect: (...args) => ctx.fillRect(...args),
    fillText: (...args) => ctx.fillText(...args),
    beginPath: () => ctx.beginPath(),
    moveTo: (x, y) => ctx.moveTo(x, y),
    lineTo: (x, y) => ctx.lineTo(x, y),
    stroke: () => ctx.stroke(),
    draw: () => {},
  };
}

function legacyPainter(ctx: LegacyCanvasContext): CanvasPainter {
  return {
    setFillStyle: (color) => ctx.setFillStyle(color),
    setStrokeStyle: (color) => ctx.setStrokeStyle(color),
    setLineWidth: (width) => ctx.setLineWidth(width),
    setLineCap: (cap) => ctx.setLineCap(cap),
    setLineJoin: (join) => ctx.setLineJoin(join),
    setTextAlign: (align) => ctx.setTextAlign(align),
    setTextBaseline: (baseline) => ctx.setTextBaseline(baseline),
    setFont: (size) => ctx.setFontSize(size),
    fillRect: (...args) => ctx.fillRect(...args),
    fillText: (...args) => ctx.fillText(...args),
    beginPath: () => ctx.beginPath(),
    moveTo: (x, y) => ctx.moveTo(x, y),
    lineTo: (x, y) => ctx.lineTo(x, y),
    stroke: () => ctx.stroke(),
    draw: () => ctx.draw(true),
  };
}

function fillFooter() {
  if (!context) return;
  const footerTop = Math.max(0, cssHeight - 82);
  context.setFillStyle(theme.value.exportBackground);
  context.fillRect(0, footerTop, cssWidth, cssHeight - footerTop);
  context.setStrokeStyle(theme.value.border);
  context.setLineWidth(1);
  context.beginPath();
  context.moveTo(24, footerTop);
  context.lineTo(cssWidth - 24, footerTop);
  context.stroke();
  context.setFillStyle(theme.value.ink);
  context.setTextBaseline("middle");
  context.setFont(16, 600);
  context.setTextAlign("left");
  context.fillText(`${roleTitle.value} · ${signer.value}`, 26, cssHeight - 53);
  context.setTextAlign("right");
  context.setFont(13);
  context.setFillStyle(theme.value.muted);
  context.fillText(`签字时间 ${signedAt.value}`, cssWidth - 26, cssHeight - 53);
  if (isCustomer.value) {
    context.setTextAlign("left");
    context.fillText(
      `签字部门：${department.value.trim() || "未填写"}`,
      26,
      cssHeight - 27,
    );
  }
}

function resetSurface() {
  if (!context) return;
  context.setFillStyle(theme.value.exportBackground);
  context.fillRect(0, 0, cssWidth, cssHeight);
  if (!hasInk.value) {
    context.setFillStyle(theme.value.muted);
    context.setTextAlign("center");
    context.setTextBaseline("middle");
    const fontSize = Math.max(24, Math.min(38, cssWidth * 0.052));
    context.setFont(fontSize, 500);
    context.fillText(roleTitle.value, cssWidth / 2, cssHeight / 2);
  }
  fillFooter();
  context.draw();
}

function initDomCanvas(dom: HTMLCanvasElement) {
  const rect = dom.getBoundingClientRect();
  cssWidth = rect.width;
  cssHeight = rect.height;
  dom.width = Math.round(cssWidth * SIGNATURE_EXPORT_SCALE);
  dom.height = Math.round(cssHeight * SIGNATURE_EXPORT_SCALE);
  domCanvas = dom;
  const ctx = dom.getContext("2d");
  ctx?.setTransform(
    SIGNATURE_EXPORT_SCALE,
    0,
    0,
    SIGNATURE_EXPORT_SCALE,
    0,
    0,
  );
  context = ctx ? domPainter(ctx) : null;
  canvasReady.value = true;
  resetSurface();
}

function setupCanvas() {
  if (canvasReady.value) return;
  if (typeof document !== "undefined") {
    const host = document.querySelector("#signature-canvas");
    const dom =
      host?.tagName === "CANVAS" ? host : host?.querySelector("canvas");
    if (dom && typeof (dom as HTMLCanvasElement).getContext === "function") {
      initDomCanvas(dom as HTMLCanvasElement);
      return;
    }
  }
  const dom = nativeCanvas();
  if (dom) {
    initDomCanvas(dom);
    return;
  }
  uni.createSelectorQuery()
    .in(instance?.proxy)
    .select("#signature-canvas")
    .boundingClientRect((rect) => {
      const field = rect as { width?: number; height?: number } | null;
      if (!field?.width || !field?.height) return;
      cssWidth = field.width;
      cssHeight = field.height;
      canvasOwner =
        (
          instance?.proxy as
            | ({ $scope?: unknown } & Record<string, unknown>)
            | null
        )?.$scope || instance?.proxy;
      context = legacyPainter(
        uni.createCanvasContext(
          "signature-canvas",
          canvasOwner,
        ) as unknown as LegacyCanvasContext,
      );
      canvasReady.value = true;
      resetSurface();
    })
    .exec();
}

function pointFromEvent(event: TouchEvent) {
  const touch = event.touches?.[0] || event.changedTouches?.[0];
  if (!touch) return { x: 0, y: 0 };
  const dom = nativeCanvas();
  if (dom) {
    const rect = dom.getBoundingClientRect();
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };
  }
  const miniTouch = touch as Touch & { x?: number; y?: number };
  return {
    x: Number(miniTouch.x ?? miniTouch.clientX ?? 0),
    y: Number(miniTouch.y ?? miniTouch.clientY ?? 0),
  };
}

function begin(event: TouchEvent) {
  if (!context || completing.value) return;
  const point = pointFromEvent(event);
  if (point.y >= cssHeight - 82) return;
  if (!hasInk.value) {
    context.setFillStyle(theme.value.exportBackground);
    context.fillRect(0, 0, cssWidth, cssHeight);
    fillFooter();
    context.draw();
  }
  drawing = true;
  hasInk.value = true;
  lastX = point.x;
  lastY = point.y;
  context.beginPath();
  context.moveTo(lastX, lastY);
}

function move(event: TouchEvent) {
  if (!drawing || !context || completing.value) return;
  const point = pointFromEvent(event);
  if (point.y >= cssHeight - 82) return;
  context.setStrokeStyle(theme.value.ink);
  context.setLineWidth(3.5);
  context.setLineCap("round");
  context.setLineJoin("round");
  context.beginPath();
  context.moveTo(lastX, lastY);
  context.lineTo(point.x, point.y);
  context.stroke();
  context.draw();
  lastX = point.x;
  lastY = point.y;
}

function end() {
  drawing = false;
}

function clearSignature() {
  hasInk.value = false;
  resetSurface();
}

function finishDepartmentInput() {
  // #ifdef APP-PLUS
  plus.key.hideSoftKeybord();
  // #endif
  // #ifndef APP-PLUS
  uni.hideKeyboard();
  // #endif
}

function cancel() {
  if (!hasInk.value) {
    allowLeave = true;
    uni.navigateBack();
    return;
  }
  uni.showModal({
    title: "退出签字",
    content: "当前签名尚未完成，确定退出？",
    confirmText: "退出",
    cancelText: "继续签字",
    success: (result) => {
      if (result.confirm) {
        allowLeave = true;
        uni.navigateBack();
      }
    },
  });
}

function exportCanvas() {
  const dom = nativeCanvas();
  const webPage =
    typeof location !== "undefined" && /^https?:/.test(location.protocol);
  if (dom && webPage) return Promise.resolve(dom.toDataURL("image/png"));
  return new Promise<string>((resolve, reject) => {
    uni.canvasToTempFilePath({
      canvasId: "signature-canvas",
      x: 0,
      y: 0,
      width: cssWidth,
      height: cssHeight,
      destWidth: Math.round(cssWidth * SIGNATURE_EXPORT_SCALE),
      destHeight: Math.round(cssHeight * SIGNATURE_EXPORT_SCALE),
      fileType: "png",
      success: (result) => resolve(result.tempFilePath),
      fail: reject,
    }, canvasOwner || instance?.proxy);
  });
}

async function complete() {
  if (!hasInk.value) {
    uni.showToast({ title: "请先手写签字", icon: "none" });
    return;
  }
  completing.value = true;
  uni.showLoading({ title: "正在生成签字", mask: true });
  try {
    signedAt.value = formatDateTime(new Date());
    fillFooter();
    context?.draw();
    await nextTick();
    const path = await exportCanvas();
    uni.$emit(SIGNATURE_COMPLETE_EVENT, {
      token: token.value,
      path,
      role: role.value,
      department: isCustomer.value ? department.value.trim() : "",
      signedAt: signedAt.value,
    });
    allowLeave = true;
    uni.navigateBack();
  } catch {
    uni.showToast({ title: "签字生成失败，请重试", icon: "none" });
  } finally {
    uni.hideLoading();
    completing.value = false;
  }
}

onLoad((query) => {
  role.value = query?.role === "customer" ? "customer" : "employee";
  variant.value = query?.variant === "brand" ? "brand" : "reference";
  signer.value = query?.signer || (isCustomer.value ? "客户代表" : "员工");
  department.value = query?.department || "";
  token.value = query?.token || "";
  // #ifdef APP-PLUS
  plus.navigator.setFullscreen(true);
  setAndroidSystemBarsHidden(true);
  plus.screen.lockOrientation("landscape-primary");
  // #endif
});

onReady(() => {
  for (const delay of [100, 350, 900]) {
    settleTimers.push(setTimeout(setupCanvas, delay));
  }
});

onResize(() => {
  if (!hasInk.value) {
    canvasReady.value = false;
    context = null;
    settleTimers.push(setTimeout(setupCanvas, 120));
  }
});

onBackPress(() => {
  if (allowLeave) return false;
  if (!hasInk.value || completing.value) return false;
  cancel();
  return true;
});

onUnload(() => {
  settleTimers.forEach((timer) => clearTimeout(timer));
  // #ifdef APP-PLUS
  plus.screen.lockOrientation("portrait-primary");
  setAndroidSystemBarsHidden(false);
  plus.navigator.setFullscreen(false);
  // #endif
});
</script>

<template>
  <view
    class="signature-scene"
    :style="sceneStyle"
  >
    <view
      class="signature-surface"
      :style="{ background: theme.surface, borderColor: theme.border }"
    >
      <canvas
        id="signature-canvas"
        type="2d"
        ref="canvasRef"
        class="signature-canvas"
        :disable-scroll="true"
        @touchstart="begin"
        @touchmove="move"
        @touchend="end"
        @touchcancel="end"
      />
    </view>

    <view class="scene-actions">
      <button
        class="scene-button cancel-button"
        @tap="cancel"
      >
        取消
      </button>

      <view v-if="isCustomer" class="department-field">
        <text class="department-label" :style="{ color: theme.ink }">
          签字部门：
        </text>
        <input
          v-model="department"
          class="department-input"
          maxlength="10"
          cursor-spacing="24"
          placeholder="最多可输入 10 个字"
          placeholder-style="color:#C5C5C5;font-size:14px"
          confirm-type="done"
          @confirm="finishDepartmentInput"
        />
      </view>

      <view class="scene-actions-right">
        <button
          class="scene-button rewrite-button"
          :class="{ disabled: !hasInk }"
          :style="{ color: theme.action }"
          :disabled="!hasInk"
          @tap="clearSignature"
        >
          重写
        </button>
        <button
          class="scene-button complete-button"
          :style="{ background: theme.action, color: theme.ink }"
          :disabled="!hasInk || completing"
          @tap="complete"
        >
          {{ completing ? "生成中" : "完成" }}
        </button>
      </view>
    </view>
  </view>
</template>

<style scoped>
.signature-scene {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding:
    max(12rpx, env(safe-area-inset-top))
    max(18rpx, env(safe-area-inset-right))
    max(12rpx, env(safe-area-inset-bottom))
    max(18rpx, env(safe-area-inset-left));
  touch-action: none;
}

.department-field {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-left: auto;
  padding: 6rpx 10rpx;
  border-radius: 8rpx;
  background: rgba(255, 255, 255, 0.62);
}

.department-label {
  flex: none;
  font-size: 19rpx;
  font-weight: 600;
}

.department-input {
  width: 230rpx;
  height: 48rpx;
  font-size: 21rpx;
}

.signature-surface {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  margin-top: 10rpx;
  border: 1rpx solid;
  border-radius: 14rpx;
  box-shadow: 0 12rpx 30rpx rgba(36, 52, 46, 0.08);
}

.signature-canvas {
  width: 100%;
  height: 100%;
  display: block;
  touch-action: none;
}

.scene-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12rpx;
  padding-top: 10rpx;
}

/* Reference signature scene: 852x393 design specification */
.signature-scene {
  position: fixed;
  inset: 0;
  width: auto;
  height: auto;
  gap: 20px;
  padding:
    max(20px, env(safe-area-inset-top))
    max(59px, env(safe-area-inset-right))
    max(20px, env(safe-area-inset-bottom))
    max(59px, env(safe-area-inset-left));
}

.signature-surface {
  margin-top: 0;
  border: 1px solid #111111;
  border-radius: 0;
  box-shadow: none;
}

.scene-actions {
  width: 100%;
  min-height: 40px;
  justify-content: flex-start;
  gap: 12px;
  padding-top: 0;
}

.scene-button {
  width: 80px;
  height: 40px;
  min-height: 40px;
  flex: none;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 20px;
  background: #ffffff;
  color: #111111;
  font-size: 15px;
  font-weight: 500;
  line-height: 40px;
}

.cancel-button {
  background: #ffffff;
  color: #111111;
}

.rewrite-button {
  background: #ffffff;
}

.rewrite-button.disabled {
  opacity: 0.32;
}

.rewrite-button[disabled] {
  opacity: 0.32;
}

.complete-button {
  min-width: 80px;
  padding: 0;
  color: #111111;
  font-size: 15px;
  font-weight: 500;
}

.complete-button[disabled] {
  opacity: 0.32;
}

.scene-actions-right {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
}

.department-field {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 140px;
  padding: 0;
  background: transparent;
}

.department-field + .scene-actions-right {
  margin-left: auto;
}

.department-label {
  flex: none;
  font-size: 14px;
  font-weight: 400;
}

.department-input {
  width: 178px;
  height: 40px;
  padding: 0 7px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 2px;
  background: #ffffff;
  color: #111111;
  font-size: 14px;
}

@media (max-width: 800px), (max-height: 380px) {
  .signature-scene {
    gap: 14px;
    padding:
      max(14px, env(safe-area-inset-top))
      max(24px, env(safe-area-inset-right))
      max(14px, env(safe-area-inset-bottom))
      max(24px, env(safe-area-inset-left));
  }

  .scene-button {
    width: 72px;
    height: 36px;
    min-height: 36px;
    border-radius: 18px;
    line-height: 36px;
  }

  .department-input {
    width: 154px;
    height: 36px;
  }

  .department-field {
    margin-left: auto;
  }

  .department-field + .scene-actions-right {
    margin-left: 0;
  }
}

@media (max-width: 500px) and (orientation: portrait) {
  .signature-scene {
    gap: 12px;
    padding:
      max(16px, env(safe-area-inset-top))
      16px
      max(16px, env(safe-area-inset-bottom));
  }

  .scene-actions {
    flex-wrap: wrap;
    min-height: 0;
  }

  .department-field {
    order: 1;
    width: 100%;
    margin-left: 0;
  }

  .department-input {
    flex: 1;
    width: auto;
    height: 38px;
    font-size: 16px;
  }

  .scene-actions-right {
    order: 2;
    width: 100%;
    margin-left: 0;
    justify-content: flex-end;
  }

  .scene-button {
    width: 96px;
    height: 40px;
    min-height: 40px;
    line-height: 40px;
  }
}
</style>
