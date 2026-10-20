<!-- App renderjs can only call Options API methods back into the page. -->
<script lang="ts">
export default {
  methods: {
    onRenderExportBridge(payload: { id?: number; path?: string }) {
      const handler = (
        globalThis as {
          __signatureOnRenderExport?: (value: typeof payload) => void;
        }
      ).__signatureOnRenderExport;
      handler?.(payload);
    },
  },
};
</script>

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

interface CanvasPainter {
  prepare: () => void;
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

interface CanvasNode {
  width: number;
  height: number;
  getContext: (contextId: "2d") => CanvasRenderingContext2D | null;
  getBoundingClientRect?: () => DOMRect;
  toDataURL?: (type?: string) => string;
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
const exportRequest = ref<{ id: number; signedAt: string } | null>(null);
const renderEpoch = ref(0);
const clearRequest = ref(0);
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
const renderConfig = computed(() => ({
  surface: theme.value.surface,
  border: theme.value.border,
  ink: theme.value.ink,
  muted: theme.value.muted,
  roleTitle: roleTitle.value,
  signer: signer.value,
  department: department.value.trim(),
  signedAt: signedAt.value,
  isCustomer: isCustomer.value,
  epoch: renderEpoch.value,
  exportRequest: exportRequest.value,
  clearRequest: clearRequest.value,
}));

let context: CanvasPainter | null = null;
let domCanvas: CanvasNode | null = null;
let canvasNode: CanvasNode | null = null;
let pendingRenderExport: {
  id: number;
  resolve: (path: string) => void;
  reject: (error: Error) => void;
} | null = null;
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

function decodeQueryValue(value: unknown) {
  if (typeof value !== "string") return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
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

function nativeCanvas(): CanvasNode | null {
  const isCanvas = (value: unknown): value is CanvasNode => {
    const element = value as CanvasNode | null;
    return Boolean(
      element &&
        (element as unknown as HTMLElement).tagName === "CANVAS" &&
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

function canvas2dPainter(
  ctx: CanvasRenderingContext2D,
  scale: () => number,
): CanvasPainter {
  return {
    prepare: () => {
      const ratio = scale();
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    },
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
      ctx.font = `${weight} ${size}px sans-serif`;
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
}

function resetSurface() {
  if (!context) return;
  context.prepare();
  context.setFillStyle(theme.value.exportBackground);
  context.fillRect(0, 0, cssWidth, cssHeight);
  fillFooter();
  context.draw();
}

function initDomCanvas(dom: CanvasNode) {
  const rect = dom.getBoundingClientRect?.();
  if (!rect) return;
  const scaleX = dom.width / rect.width;
  const scaleY = dom.height / rect.height;
  if (
    !rect.width ||
    !rect.height ||
    scaleX < 1 ||
    scaleY < 1 ||
    Math.abs(scaleX - scaleY) > 0.1
  ) {
    return;
  }
  cssWidth = rect.width;
  cssHeight = rect.height;
  domCanvas = dom;
  canvasNode = dom;
  const ctx = dom.getContext("2d");
  if (!ctx) return;
  context = canvas2dPainter(
    ctx,
    () => dom.width / Math.max(1, cssWidth),
  );
  canvasReady.value = true;
  resetSurface();
}

function initMiniProgramCanvas() {
  uni.createSelectorQuery()
    .in(instance?.proxy)
    .select("#signature-canvas")
    .fields({ node: true, size: true }, (result) => {
      const field = result as
        | { node?: CanvasNode; width?: number; height?: number }
        | null;
      if (!field?.node || !field.width || !field.height) return;
      const canvas = field.node;
      canvas.width = Math.round(field.width * SIGNATURE_EXPORT_SCALE);
      canvas.height = Math.round(field.height * SIGNATURE_EXPORT_SCALE);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      cssWidth = field.width;
      cssHeight = field.height;
      canvasNode = canvas;
      domCanvas = null;
      context = canvas2dPainter(
        ctx,
        () => canvas.width / Math.max(1, cssWidth),
      );
      canvasReady.value = true;
      resetSurface();
    })
    .exec();
}

function setupCanvas() {
  if (canvasReady.value) {
    if (!hasInk.value) resetSurface();
    return;
  }
  // #ifdef H5
  const dom = nativeCanvas();
  if (dom) {
    initDomCanvas(dom);
    return;
  }
  // #endif
  // #ifdef MP-WEIXIN
  initMiniProgramCanvas();
  // #endif
}

function pointFromEvent(event: TouchEvent) {
  const touch = event.touches?.[0] || event.changedTouches?.[0];
  if (!touch) return { x: 0, y: 0 };
  const dom = nativeCanvas() || domCanvas;
  const rect = dom?.getBoundingClientRect?.();
  if (rect) {
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };
  }
  const miniTouch = touch as Touch & { x?: number; y?: number };
  if (typeof miniTouch.x === "number" && typeof miniTouch.y === "number") {
    return {
      x: miniTouch.x,
      y: miniTouch.y,
    };
  }
  return {
    x: Number(touch.clientX ?? 0),
    y: Number(touch.clientY ?? 0),
  };
}

function begin(event: TouchEvent) {
  if (!context || completing.value) return;
  const point = pointFromEvent(event);
  if (point.y >= cssHeight - 82) return;
  context.prepare();
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
  context.prepare();
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

function markInk() {
  hasInk.value = true;
}

function clearSignature() {
  hasInk.value = false;
  clearRequest.value += 1;
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

function onRenderExport(payload: { id?: number; path?: string }) {
  if (!payload?.path || payload.id !== pendingRenderExport?.id) return;
  const pending = pendingRenderExport;
  if (!pending) return;
  pendingRenderExport = null;
  pending.resolve(payload.path);
}

// Bridge the setup handler to the Options API method used by renderjs.
(
  globalThis as {
    __signatureOnRenderExport?: (
      payload: { id?: number; path?: string },
    ) => void;
  }
).__signatureOnRenderExport = onRenderExport;

function requestRenderExport(signedAtValue: string) {
  return new Promise<string>((resolve, reject) => {
    const id = Date.now();
    pendingRenderExport = { id, resolve, reject };
    exportRequest.value = { id, signedAt: signedAtValue };
    setTimeout(() => {
      if (pendingRenderExport?.id !== id) return;
      pendingRenderExport = null;
      reject(new Error("Signature render timeout"));
    }, 5000);
  });
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
  if (typeof document !== "undefined" && domCanvas) {
    const exportCanvasElement = document.createElement("canvas");
    exportCanvasElement.width = Math.round(
      cssWidth * SIGNATURE_EXPORT_SCALE,
    );
    exportCanvasElement.height = Math.round(
      cssHeight * SIGNATURE_EXPORT_SCALE,
    );
    const exportContext = exportCanvasElement.getContext("2d");
    if (exportContext) {
      exportContext.drawImage(
        domCanvas as unknown as CanvasImageSource,
        0,
        0,
        exportCanvasElement.width,
        exportCanvasElement.height,
      );
      return Promise.resolve(exportCanvasElement.toDataURL("image/png"));
    }
  }
  if (!canvasNode) {
    return Promise.reject(new Error("Signature canvas is not ready"));
  }
  return new Promise<string>((resolve, reject) => {
    const options = {
      canvas: canvasNode,
      x: 0,
      y: 0,
      width: cssWidth,
      height: cssHeight,
      destWidth: Math.round(cssWidth * SIGNATURE_EXPORT_SCALE),
      destHeight: Math.round(cssHeight * SIGNATURE_EXPORT_SCALE),
      fileType: "png",
      success: (result: { tempFilePath: string }) =>
        resolve(result.tempFilePath),
      fail: reject,
    } as unknown as UniApp.CanvasToTempFilePathOptions;
    uni.canvasToTempFilePath(options);
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
    let path = "";
    // #ifdef APP-PLUS
    path = await requestRenderExport(signedAt.value);
    // #endif
    // #ifndef APP-PLUS
    context?.prepare();
    fillFooter();
    context?.draw();
    await nextTick();
    path = await exportCanvas();
    // #endif
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
  signer.value =
    decodeQueryValue(query?.signer) ||
    (isCustomer.value ? "客户代表" : "员工");
  department.value = decodeQueryValue(query?.department);
  token.value = decodeQueryValue(query?.token);
  // #ifdef APP-PLUS
  plus.navigator.setFullscreen(true);
  setAndroidSystemBarsHidden(true);
  plus.screen.lockOrientation("landscape-primary");
  // #endif
});

onReady(() => {
  renderEpoch.value += 1;
  // #ifdef APP-PLUS
  settleTimers.push(
    setTimeout(() => {
      renderEpoch.value += 1;
    }, 600),
    setTimeout(() => {
      renderEpoch.value += 1;
    }, 1800),
  );
  // #endif
  // #ifndef APP-PLUS
  for (const delay of [80, 160, 320, 640, 1000, 1500, 2200, 3000]) {
    settleTimers.push(setTimeout(setupCanvas, delay));
  }
  // #endif
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
  delete (
    globalThis as {
      __signatureOnRenderExport?: (
        payload: { id?: number; path?: string },
      ) => void;
    }
  ).__signatureOnRenderExport;
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
      @touchstart="markInk"
    >
      <!-- #ifdef APP-PLUS -->
      <!-- Renderjs owns this canvas; uni-canvas replaces its inner canvas on App. -->
      <view
        id="signature-canvas-host"
        class="signature-canvas"
        :disable-scroll="true"
        :prop="renderConfig"
        :change:prop="signatureRenderer.configure"
        @touchstart="signatureRenderer.begin"
        @touchmove="signatureRenderer.move"
        @touchend="signatureRenderer.end"
        @touchcancel="signatureRenderer.end"
      />
      <!-- #endif -->
      <!-- #ifndef APP-PLUS -->
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
      <!-- #endif -->

      <view v-if="!hasInk" class="signature-placeholder">
        {{ roleTitle }}
      </view>

      <view
        class="signature-meta"
        :style="{ borderTopColor: theme.border }"
      >
        <view class="signature-meta-main">
          <text class="signature-meta-role" :style="{ color: theme.ink }">
            {{ roleTitle }} · {{ signer }}
          </text>
          <text class="signature-meta-time" :style="{ color: theme.muted }">
            签字时间 {{ signedAt }}
          </text>
        </view>
        <text
          v-if="isCustomer"
          class="signature-meta-department"
          :style="{ color: theme.muted }"
        >
          签字部门：{{ department.trim() || "未填写" }}
        </text>
      </view>
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

<!-- #ifdef APP-PLUS -->
<script module="signatureRenderer" lang="renderjs">
import { renderContext } from "../../utils/renderjs";

/**
 * @typedef {{ x: number, y: number }} SignaturePoint
 * @typedef {{ points: SignaturePoint[] }} SignatureStroke
 * @typedef {{ callMethod?: (name: string, value: unknown) => void }} RenderOwner
 */
export default {
  data() {
    const state = /** @type {any} */ ({
      canvas: /** @type {any} */ (null),
      ctx: /** @type {any} */ (null),
      config: /** @type {any} */ (null),
      strokes: /** @type {any[]} */ ([]),
      current: /** @type {any} */ (null),
      scale: 1,
      width: 0,
      height: 0,
      observer: /** @type {any} */ (null),
      ownerInstance: /** @type {any} */ (null),
      lastExportId: 0,
      lastClearRequest: 0,
    });
    return state;
  },
  methods: {
    /**
     * @param {any} config
     * @param {any} oldConfig
     * @param {RenderOwner|null} ownerInstance
     */
    // @ts-ignore
    configure(config, oldConfig, ownerInstance) {
      const self = renderContext(this);
      self.config = config;
      if (ownerInstance) self.ownerInstance = ownerInstance;
      if (
        config.exportRequest?.id &&
        config.exportRequest.id !== self.lastExportId
      ) {
        self.lastExportId = config.exportRequest.id;
        self.exportSignature(config.exportRequest, null, ownerInstance);
      }
      if (config.clearRequest !== self.lastClearRequest) {
        self.lastClearRequest = config.clearRequest;
        self.strokes = [];
        self.current = null;
        self.redraw();
      }
      for (const delay of [0, 100, 350, 900]) {
        setTimeout(() => {
          if (self.ensureCanvas() && self.config) self.redraw();
        }, delay);
      }
    },
    ensureCanvas() {
      const self = renderContext(this);
      const root = self.$el?.nodeType === 1 ? self.$el : document;
      const host =
        root instanceof HTMLElement && root.id === "signature-canvas-host"
          ? root
          : root.querySelector("#signature-canvas-host");
      if (!(host instanceof HTMLElement)) return false;
      const rect = host.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        return false;
      }
      let canvas = host.querySelector("canvas");
      if (!(canvas instanceof HTMLCanvasElement)) {
        canvas = document.createElement("canvas");
        canvas.style.cssText =
          "display:block;width:100%;height:100%;touch-action:none;";
        host.appendChild(canvas);
      }
      const targetWidth = Math.round(rect.width * 2);
      const targetHeight = Math.round(rect.height * 2);
      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) return false;
      self.canvas = canvas;
      self.ctx = ctx;
      self.scale = canvas.width / rect.width;
      self.width = rect.width;
      self.height = rect.height;
      if (!self.observer && typeof ResizeObserver !== "undefined") {
        self.observer = new ResizeObserver(() => self.redraw());
        self.observer.observe(canvas);
      }
      return Boolean(self.ctx);
    },
    redraw() {
      const self = renderContext(this);
      if (!self.ensureCanvas() || !self.ctx || !self.config) return;
      const ctx = self.ctx;
      const width = self.width;
      const height = self.height;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, self.canvas.width, self.canvas.height);
      ctx.setTransform(self.scale, 0, 0, self.scale, 0, 0);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      self.replayStrokes(ctx);
      self.drawFooter(ctx);
    },
    /** @param {CanvasRenderingContext2D} ctx */
    // @ts-ignore
    replayStrokes(ctx) {
      const self = renderContext(this);
      ctx.strokeStyle = self.config.ink;
      ctx.fillStyle = self.config.ink;
      ctx.lineWidth = 3.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (const stroke of self.strokes) {
        const points = stroke.points;
        if (points.length === 1) {
          ctx.beginPath();
          ctx.arc(points[0].x, points[0].y, 1.75, 0, Math.PI * 2);
          ctx.fill();
          continue;
        }
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let index = 1; index < points.length; index += 1) {
          ctx.lineTo(points[index].x, points[index].y);
        }
        ctx.stroke();
      }
    },
    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {string} [signedAt]
     */
    // @ts-ignore
    drawFooter(ctx, signedAt) {
      const self = renderContext(this);
      const width = self.width;
      const height = self.height;
      const footerTop = Math.max(0, height - 82);
      ctx.setTransform(self.scale, 0, 0, self.scale, 0, 0);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, footerTop, width, height - footerTop);
      ctx.strokeStyle = self.config.border;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(24, footerTop);
      ctx.lineTo(width - 24, footerTop);
      ctx.stroke();
    },
    /**
     * @param {any} event
     * @returns {SignaturePoint|null}
     */
    // @ts-ignore
    pointFromEvent(event) {
      const self = renderContext(this);
      const touch = event.touches?.[0] || event.changedTouches?.[0];
      if (!touch || !self.canvas) return null;
      const rect = self.canvas.getBoundingClientRect();
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    },
    /**
     * @param {any} event
     * @param {RenderOwner} [ownerInstance]
     */
    // @ts-ignore
    begin(event, ownerInstance) {
      const self = renderContext(this);
      if (ownerInstance) self.ownerInstance = ownerInstance;
      if (!self.ensureCanvas() || !self.ctx || !self.config) return;
      const point = self.pointFromEvent(event);
      if (!point || point.y >= self.height - 82) return;
      self.current = { points: [point] };
      self.strokes.push(self.current);
      self.redraw();
    },
    /** @param {any} event */
    // @ts-ignore
    move(event) {
      const self = renderContext(this);
      if (!self.current || !self.ctx) return;
      const point = self.pointFromEvent(event);
      if (!point || point.y >= self.height - 82) return;
      const points = self.current.points;
      const previous = points[points.length - 1];
      points.push(point);
      const ctx = self.ctx;
      ctx.setTransform(self.scale, 0, 0, self.scale, 0, 0);
      ctx.strokeStyle = self.config.ink;
      ctx.lineWidth = 3.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(previous.x, previous.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    },
    end() {
      const self = renderContext(this);
      self.current = null;
    },
    /**
     * @param {any} request
     * @param {any} oldRequest
     * @param {RenderOwner} [ownerInstance]
     */
    // @ts-ignore
    exportSignature(request, oldRequest, ownerInstance) {
      const self = renderContext(this);
      if (!request?.id || !self.ensureCanvas() || !self.ctx) return;
      if (ownerInstance) self.ownerInstance = ownerInstance;
      const signedAt = request.signedAt || self.config?.signedAt;
      self.redraw();
      self.drawFooter(self.ctx, signedAt);
      const output = document.createElement("canvas");
      output.width = Math.round(self.width * 2);
      output.height = Math.round(self.height * 2);
      const outputContext = output.getContext("2d");
      if (!outputContext) return;
      outputContext.drawImage(
        self.canvas,
        0,
        0,
        output.width,
        output.height,
      );
      const payload = {
        id: request.id,
        path: output.toDataURL("image/png"),
      };
      self.ownerInstance?.callMethod?.("onRenderExportBridge", payload);
    },
  },
};

</script>
<!-- #endif -->

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

.signature-canvas > canvas {
  width: 100%;
  height: 100%;
  display: block;
  touch-action: none;
}

.signature-placeholder {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 82px;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999999;
  font-size: 34px;
  font-weight: 500;
  pointer-events: none;
}

.signature-meta {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 82px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  padding: 10px 26px;
  border-top: 1px solid;
  background: #ffffff;
  pointer-events: none;
  z-index: 2;
}

.signature-meta-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.signature-meta-role {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.3;
}

.signature-meta-time,
.signature-meta-department {
  font-size: 13px;
  line-height: 1.3;
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
