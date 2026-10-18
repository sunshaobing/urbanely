<script lang="ts">
export default {};
</script>

<style>
:root {
  --field-canvas: #eef4ef;
  --field-surface: #ffffff;
  --field-ink: #17201d;
  --field-muted: #65726c;
  --field-line: #dce6df;
  --field-accent: #1d7659;
  --field-accent-soft: #e4f1e9;
  --field-dark: #10352a;
  --field-danger: #a8443c;
  --field-danger-soft: #f9eae8;
  --field-warning: #a36a24;
  --field-warning-soft: #fbf0de;
  --field-success: #3f7452;
  --field-success-soft: #eaf3ec;
}

page {
  min-height: 100%;
  background: #eef4ef;
  color: #14231d;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei",
    sans-serif;
  font-size: 28rpx;
  line-height: 1.5;
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
  padding-bottom: calc(172rpx + env(safe-area-inset-bottom));
  background: #eef4ef;
}

.detail-page {
  min-height: 100vh;
  padding-bottom: calc(152rpx + env(safe-area-inset-bottom));
  background: #eef4ef;
}

.page-content {
  padding: 32rpx;
}

.card {
  border: 1rpx solid #dce6df;
  border-radius: 16rpx;
  background: #ffffff;
  box-shadow: 0 8rpx 24rpx rgba(16, 53, 42, 0.06);
}

.dark-band {
  background: #10352a;
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
  font-size: 36rpx;
  font-weight: 700;
  line-height: 1.3;
}

.section-copy {
  display: block;
  margin-top: 8rpx;
  color: #6f7974;
  font-size: 24rpx;
  line-height: 1.5;
}

.section-kicker {
  display: block;
  color: #1d7659;
  font-size: 22rpx;
  font-weight: 700;
  letter-spacing: 1rpx;
  text-transform: uppercase;
}

.title-lg {
  font-size: 36rpx;
  font-weight: 700;
  line-height: 1.35;
}

.title-md {
  font-size: 32rpx;
  font-weight: 700;
  line-height: 1.4;
}

.body {
  font-size: 28rpx;
  line-height: 1.55;
}

.caption {
  color: #65726c;
  font-size: 24rpx;
  line-height: 1.5;
}

.mono {
  font-family: "SFMono-Regular", "Cascadia Code", "Roboto Mono", monospace;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44rpx;
  padding: 0 14rpx;
  border-radius: 12rpx;
  font-size: 22rpx;
  font-weight: 600;
  white-space: nowrap;
}

.status-pending {
  background: #f9eae8;
  color: #a8443c;
}

.status-active {
  background: #fbf0de;
  color: #a36a24;
}

.status-done {
  background: #eaf3ec;
  color: #3f7452;
}

.status-danger {
  background: #fae9e6;
  color: #a8443c;
}

.status-neutral {
  background: #eef0ed;
  color: #59635e;
}

.btn-primary,
.btn-secondary,
.btn-ghost {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  min-height: 84rpx;
  padding: 0 28rpx;
  border-radius: 16rpx;
  font-size: 28rpx;
  font-weight: 600;
}

.btn-primary {
  background: #10352a;
  color: #ffffff;
}

.btn-primary[disabled] {
  opacity: 0.48;
}

.btn-secondary {
  border: 1rpx solid #d3dfd7;
  background: #ffffff;
  color: #26322d;
}

.btn-ghost {
  color: #1d7659;
}

.icon-button {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1rpx solid #d9e3dc;
  border-radius: 16rpx;
  background: #ffffff;
}

.field {
  margin-top: 24rpx;
}

.field-label {
  display: block;
  margin-bottom: 10rpx;
  color: #55645d;
  font-size: 24rpx;
  font-weight: 600;
}

.field-input,
.field-textarea,
.field-select {
  width: 100%;
  border: 1rpx solid #d4dfd7;
  border-radius: 16rpx;
  background: #ffffff;
  color: #14231d;
  font-size: 28rpx;
}

.field-input,
.field-select {
  height: 84rpx;
  padding: 0 20rpx;
}

.field-textarea {
  min-height: 180rpx;
  padding: 18rpx 20rpx;
  line-height: 1.55;
}

.field-placeholder {
  color: #9ba49f;
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
  min-height: 60rpx;
  padding: 0 20rpx;
  border: 1rpx solid #d6e1da;
  border-radius: 16rpx;
  background: #ffffff;
  color: #55645d;
  font-size: 24rpx;
}

.chip.active {
  border-color: #1d7659;
  background: #e4f1e9;
  color: #145c46;
  font-weight: 600;
}

.divider {
  height: 1rpx;
  background: #eaf0ec;
}

.empty-state {
  padding: 56rpx 32rpx;
  border: 1rpx dashed #cfdcd3;
  border-radius: 16rpx;
  background: rgba(255, 255, 255, 0.68);
  text-align: center;
}

.empty-title {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
}

.empty-copy {
  display: block;
  margin-top: 10rpx;
  color: #65726c;
  font-size: 24rpx;
  line-height: 1.55;
}

.error-copy {
  display: block;
  margin-top: 12rpx;
  color: #a8443c;
  font-size: 24rpx;
  line-height: 1.55;
}

.step-track {
  width: 100%;
  height: 8rpx;
  overflow: hidden;
  border-radius: 8rpx;
  background: rgba(255, 255, 255, 0.18);
}

.step-fill {
  height: 100%;
  border-radius: 8rpx;
  background: #75c49d;
  transition: width 180ms ease;
}

.safe-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}

.pressable {
  transition: opacity 120ms ease;
}

.pressable:active {
  opacity: 0.72;
}
</style>
