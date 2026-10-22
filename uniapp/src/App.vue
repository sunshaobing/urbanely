<script lang="ts">
export default {};
</script>

<style>
:root {
  --field-canvas: #f3f6f4;
  --field-surface: #ffffff;
  --field-surface-muted: #f7faf8;
  --field-ink: #15221c;
  --field-ink-soft: #34483f;
  --field-muted: #607067;
  --field-faint: #8c9892;
  --field-line: #d9e4dd;
  --field-line-strong: #c9d8ce;
  --field-accent: #17654b;
  --field-accent-strong: #10553e;
  --field-accent-soft: #e7f1eb;
  --field-dark: #113b2d;
  --field-danger: #a33e37;
  --field-danger-soft: #f8ebe9;
  --field-warning: #9a641f;
  --field-warning-soft: #fbf1df;
  --field-success: #2f7656;
  --field-success-soft: #eaf3ec;
  --field-shadow: 0 12rpx 32rpx rgba(18, 34, 27, 0.055);
}

page {
  min-height: 100%;
  background: #f3f6f4;
  color: #15221c;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei",
    sans-serif;
  font-size: max(13.5px, 28rpx);
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
  border-radius: 999px !important;
}

button::after {
  border: 0;
}

.page {
  min-height: 100vh;
  padding-bottom: calc(164rpx + env(safe-area-inset-bottom));
  background: #f3f6f4;
}

.detail-page {
  min-height: 100vh;
  padding-bottom: calc(152rpx + env(safe-area-inset-bottom));
  background: #f3f6f4;
}

.page-content {
  width: 100%;
  max-width: 820rpx;
  margin: 0 auto;
  padding: 32rpx;
}

.card {
  border: 1rpx solid #e1e9e4;
  border-radius: 24rpx !important;
  background: #ffffff;
  box-shadow: 0 4rpx 14rpx rgba(18, 34, 27, 0.025);
}

.card-muted {
  border: 1rpx solid #e1e9e4;
  border-radius: 20rpx !important;
  background: #f7faf8;
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
  color: #15221c;
  font-size: max(15px, 30rpx);
  font-weight: 600;
  line-height: 1.3;
}

.section-copy {
  display: block;
  margin-top: 6rpx;
  color: #607067;
  font-size: max(12px, 22rpx);
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
  min-height: 46rpx;
  padding: 0 15rpx;
  border-radius: 999px;
  border: 1rpx solid transparent;
  font-size: max(12px, 21rpx);
  font-weight: 600;
  white-space: nowrap;
}

.status-pending {
  border-color: #edd8d5;
  background: #f8ebe9;
  color: #a33e37;
}

.status-active {
  border-color: #eadfc9;
  background: #fbf1df;
  color: #9a641f;
}

.status-done {
  border-color: #d5e6db;
  background: #eaf3ec;
  color: #2f7656;
}

.status-danger {
  border-color: #edd8d5;
  background: #f8ebe9;
  color: #a33e37;
}

.status-neutral {
  border-color: #dfe5e0;
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
  min-height: 48px;
  padding: 0 26rpx;
  border-radius: 999px;
  font-size: max(14px, 26rpx);
  font-weight: 600;
}

.btn-primary {
  background: #11583f;
  color: #ffffff;
  box-shadow: 0 8rpx 20rpx rgba(16, 72, 52, 0.14);
}

.btn-primary[disabled] {
  opacity: 0.48;
}

.btn-secondary {
  border: 1rpx solid #cddcd2;
  background: #f9fbfa;
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
  border-radius: 999px;
  background: #ffffff;
}

.field {
  margin-top: 24rpx;
}

.field-label {
  display: block;
  margin-bottom: 9rpx;
  color: #4f5f72;
  font-size: max(12px, 21rpx);
  font-weight: 600;
}

.field-input,
.field-textarea,
.field-select {
  width: 100%;
  border: 1rpx solid #d6e1da;
  border-radius: 16rpx !important;
  background: #fbfcfb;
  color: #17211d;
  font-size: 26rpx;
}

.field-input,
.field-select {
  height: 48px;
  padding: 0 18rpx;
  font-size: max(13px, 26rpx);
}

.field-textarea {
  min-height: 168rpx;
  padding: 16rpx 18rpx;
  font-size: max(13px, 26rpx);
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
  min-height: 64rpx;
  padding: 0 20rpx;
  border: 1rpx solid #d7e0da;
  border-radius: 999px;
  background: #ffffff;
  color: #50635a;
  font-size: max(12px, 22rpx);
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
  border-radius: 20rpx !important;
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
