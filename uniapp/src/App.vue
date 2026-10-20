<script lang="ts">
export default {};
</script>

<style>
:root {
  --field-canvas: #f2f6f3;
  --field-surface: #ffffff;
  --field-surface-muted: #f8fbf9;
  --field-ink: #17211d;
  --field-ink-soft: #34483f;
  --field-muted: #65736c;
  --field-faint: #909a94;
  --field-line: #dde7e0;
  --field-line-strong: #c9d8ce;
  --field-accent: #176b52;
  --field-accent-strong: #115640;
  --field-accent-soft: #e6f2ec;
  --field-dark: #103b2d;
  --field-danger: #a33e37;
  --field-danger-soft: #f8ebe9;
  --field-warning: #9a641f;
  --field-warning-soft: #fbf1df;
  --field-success: #2f7656;
  --field-success-soft: #eaf3ec;
  --field-shadow: 0 12rpx 36rpx rgba(18, 34, 27, 0.06);
}

page {
  min-height: 100%;
  background: #f2f6f3;
  color: #17211d;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei",
    sans-serif;
  font-size: 28rpx;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

view,
text,
button,
input,
textarea,
image,
canvas {
  box-sizing: border-box;
}

button {
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font-size: inherit;
  line-height: inherit;
}

button::after {
  border: 0;
}

.page {
  min-height: 100vh;
  padding-bottom: calc(164rpx + env(safe-area-inset-bottom));
  background: #f2f6f3;
}

.detail-page {
  min-height: 100vh;
  padding-bottom: calc(152rpx + env(safe-area-inset-bottom));
  background: #f2f6f3;
}

.page-content {
  padding: 32rpx;
}

.card {
  border: 1rpx solid #dde7e0;
  border-radius: 16rpx;
  background: #ffffff;
}

.card-muted {
  border: 1rpx solid #dde7e0;
  border-radius: 16rpx;
  background: #f8fbf9;
}

.dark-band {
  background: #103b2d;
  color: #ffffff;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24rpx;
  margin-bottom: 20rpx;
}

.section-title {
  display: block;
  color: #17211d;
  font-size: 32rpx;
  font-weight: 700;
  line-height: 1.3;
}

.section-copy {
  display: block;
  margin-top: 6rpx;
  color: #65736c;
  font-size: 22rpx;
  line-height: 1.5;
}

.section-kicker {
  display: block;
  color: #176b52;
  font-size: 20rpx;
  font-weight: 700;
}

.title-lg {
  font-size: 40rpx;
  font-weight: 700;
  line-height: 1.3;
}

.title-md {
  font-size: 30rpx;
  font-weight: 700;
  line-height: 1.4;
}

.body {
  font-size: 26rpx;
  line-height: 1.6;
}

.caption {
  color: #65736c;
  font-size: 22rpx;
  line-height: 1.5;
}

.mono {
  font-family: "SFMono-Regular", "Cascadia Code", "Roboto Mono", monospace;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 42rpx;
  padding: 0 13rpx;
  border-radius: 10rpx;
  font-size: 20rpx;
  font-weight: 600;
  white-space: nowrap;
}

.status-pending {
  background: #f8ebe9;
  color: #a33e37;
}

.status-active {
  background: #fbf1df;
  color: #9a641f;
}

.status-done {
  background: #eaf3ec;
  color: #2f7656;
}

.status-danger {
  background: #f8ebe9;
  color: #a33e37;
}

.status-neutral {
  background: #eef1ed;
  color: #596660;
}

.btn-primary,
.btn-secondary,
.btn-ghost {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  min-height: 88rpx;
  padding: 0 26rpx;
  border-radius: 12rpx;
  font-size: 26rpx;
  font-weight: 600;
}

.btn-primary {
  background: #103b2d;
  color: #ffffff;
}

.btn-primary[disabled] {
  opacity: 0.48;
}

.btn-secondary {
  border: 1rpx solid #c9d8ce;
  background: #ffffff;
  color: #24352e;
}

.btn-ghost {
  color: #176b52;
}

.icon-button {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1rpx solid #d7e2da;
  border-radius: 12rpx;
  background: #ffffff;
}

.field {
  margin-top: 24rpx;
}

.field-label {
  display: block;
  margin-bottom: 9rpx;
  color: #4f5f72;
  font-size: 22rpx;
  font-weight: 600;
}

.field-input,
.field-textarea,
.field-select {
  width: 100%;
  border: 1rpx solid #d7e2da;
  border-radius: 12rpx;
  background: #ffffff;
  color: #17211d;
  font-size: 26rpx;
}

.field-input,
.field-select {
  height: 88rpx;
  padding: 0 18rpx;
}

.field-textarea {
  min-height: 168rpx;
  padding: 16rpx 18rpx;
  line-height: 1.6;
}

.field-placeholder {
  color: #98a49d;
}

.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 58rpx;
  padding: 0 18rpx;
  border: 1rpx solid #d7e0da;
  border-radius: 10rpx;
  background: #ffffff;
  color: #50635a;
  font-size: 22rpx;
}

.chip.active {
  border-color: #176b52;
  background: #e6f2ec;
  color: #115640;
  font-weight: 600;
}

.divider {
  height: 1rpx;
  background: #e5ece7;
}

.empty-state {
  padding: 52rpx 28rpx;
  border: 1rpx dashed #c9d8ce;
  border-radius: 16rpx;
  background: #f8fbf9;
  text-align: center;
}

.empty-title {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
}

.empty-copy {
  display: block;
  margin-top: 8rpx;
  color: #65736c;
  font-size: 22rpx;
  line-height: 1.6;
}

.error-copy {
  display: block;
  margin-top: 10rpx;
  color: #a33e37;
  font-size: 22rpx;
  line-height: 1.55;
}

.step-track {
  width: 100%;
  height: 8rpx;
  overflow: hidden;
  border-radius: 8rpx;
  background: #e0e8e2;
}

.step-fill {
  height: 100%;
  border-radius: 8rpx;
  background: #176b52;
  transition: width 180ms ease;
}

.safe-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}

.pressable {
  transition:
    opacity 120ms ease,
    transform 120ms ease;
}

.pressable:active {
  opacity: 0.76;
  transform: scale(0.992);
}
</style>
