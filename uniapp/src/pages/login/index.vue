<script setup lang="ts">
import { computed, ref } from "vue";
import UniIcons from "@dcloudio/uni-ui/lib/uni-icons/uni-icons.vue";
import { login } from "../../utils/api";
import { saveAuth } from "../../utils/auth";

const identifier = ref("");
const password = ref("");
const showPassword = ref(false);
const loading = ref(false);
const error = ref("");
const canSubmit = computed(
  () => identifier.value.trim().length > 0 && password.value.length >= 6 && !loading.value,
);

function errorText(value: unknown) {
  return value instanceof Error ? value.message : "登录失败，请稍后重试";
}

async function submit() {
  if (!identifier.value.trim()) {
    error.value = "请输入手机号或管理员账号";
    return;
  }
  if (password.value.length < 6) {
    error.value = "密码至少需要 6 位";
    return;
  }
  loading.value = true;
  error.value = "";
  try {
    const payload = await login(identifier.value.trim(), password.value);
    saveAuth(payload);
    uni.reLaunch({
      url: "/pages/workbench/index",
      fail: () => {
        error.value = "登录成功，但页面跳转失败，请重新打开小程序";
      },
    });
  } catch (loginError) {
    error.value = errorText(loginError);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <view class="login-page">
    <view class="login-hero">
      <view class="hero-top">
        <view class="brand-lockup">
          <view class="brand-mark">ST</view>
          <view>
            <text class="brand-name">申汰封堵勘测</text>
            <text class="brand-en">FIELD OPERATIONS</text>
          </view>
        </view>
        <view class="hero-status">
          <view class="status-dot" />
          <text>现场协同</text>
        </view>
      </view>

      <view class="hero-copy">
        <text class="hero-kicker">PCO FIELD SYSTEM</text>
        <text class="hero-title">把每一次现场记录，变成可追溯的服务证据。</text>
        <view class="hero-points">
          <view class="hero-point">
            <text class="point-number">01</text>
            <text>任务与风险统一查看</text>
          </view>
          <view class="hero-point">
            <text class="point-number">02</text>
            <text>照片、签字现场留存</text>
          </view>
          <view class="hero-point">
            <text class="point-number">03</text>
            <text>报告自动归档</text>
          </view>
        </view>
      </view>
    </view>

    <view class="login-sheet">
      <view class="sheet-handle" />
      <view class="form-head">
        <view>
          <text class="form-title">账号登录</text>
          <text class="form-sub">使用系统分配的手机号或管理员账号</text>
        </view>
        <view class="secure-mark">
          <UniIcons type="locked-filled" size="19" color="#1d7659" />
        </view>
      </view>

      <view class="form-field">
        <text class="field-label">账号或手机号</text>
        <view class="login-input">
          <UniIcons type="person" size="18" color="#728079" />
          <input
            v-model="identifier"
            class="input"
            placeholder="请输入手机号或管理员账号"
            placeholder-class="field-placeholder"
            confirm-type="next"
            @input="error = ''"
          />
        </view>
      </view>

      <view class="form-field">
        <text class="field-label">密码</text>
        <view class="login-input">
          <UniIcons type="locked" size="18" color="#728079" />
          <input
            v-model="password"
            class="input"
            :password="!showPassword"
            placeholder="请输入登录密码"
            placeholder-class="field-placeholder"
            confirm-type="done"
            @input="error = ''"
            @confirm="submit"
          />
          <view class="password-toggle" @tap="showPassword = !showPassword">
            <UniIcons
              :type="showPassword ? 'eye-filled' : 'eye'"
              size="18"
              color="#55645d"
            />
          </view>
        </view>
      </view>

      <text v-if="error" class="form-error">{{ error }}</text>

      <button class="login-submit" :disabled="!canSubmit" @tap="submit">
        <text>{{ loading ? "正在验证" : "进入工作台" }}</text>
        <UniIcons
          v-if="!loading"
          type="right"
          size="18"
          color="#ffffff"
        />
      </button>

      <view class="login-note">
        <UniIcons type="info" size="14" color="#7b8881" />
        <text>账号由系统管理员维护，登录不会保存密码。</text>
      </view>
    </view>

    <text class="login-foot">上海申汰实业有限公司</text>
  </view>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #10352a;
}

.login-hero {
  padding: calc(42rpx + env(safe-area-inset-top)) 40rpx 74rpx;
  color: #ffffff;
}

.hero-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24rpx;
}

.brand-lockup {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.brand-mark {
  width: 76rpx;
  height: 76rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1rpx solid rgba(255, 255, 255, 0.24);
  border-radius: 16rpx;
  background: #e4f1e9;
  color: #10352a;
  font-size: 26rpx;
  font-weight: 800;
}

.brand-name,
.brand-en {
  display: block;
}

.brand-name {
  font-size: 28rpx;
  font-weight: 700;
}

.brand-en {
  margin-top: 4rpx;
  color: #9ec5b5;
  font-size: 18rpx;
  letter-spacing: 1rpx;
}

.hero-status {
  display: flex;
  align-items: center;
  gap: 8rpx;
  color: #b9d5c9;
  font-size: 20rpx;
}

.status-dot {
  width: 10rpx;
  height: 10rpx;
  border-radius: 50%;
  background: #75c49d;
  box-shadow: 0 0 0 6rpx rgba(117, 196, 157, 0.13);
}

.hero-copy {
  margin-top: 74rpx;
}

.hero-kicker {
  display: block;
  color: #82bda7;
  font-size: 22rpx;
  font-weight: 700;
  letter-spacing: 2rpx;
}

.hero-title {
  display: block;
  max-width: 630rpx;
  margin-top: 18rpx;
  font-size: 52rpx;
  font-weight: 700;
  line-height: 1.34;
}

.hero-points {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
  margin-top: 42rpx;
}

.hero-point {
  display: flex;
  align-items: center;
  gap: 16rpx;
  color: #dcebe4;
  font-size: 24rpx;
}

.point-number {
  color: #75c49d;
  font-family: "SFMono-Regular", "Cascadia Code", monospace;
  font-size: 20rpx;
}

.login-sheet {
  flex: 1;
  padding: 26rpx 40rpx calc(36rpx + env(safe-area-inset-bottom));
  border-radius: 32rpx 32rpx 0 0;
  background: #f5f8f4;
}

.sheet-handle {
  width: 64rpx;
  height: 6rpx;
  margin: 0 auto 30rpx;
  border-radius: 6rpx;
  background: #cfdcd3;
}

.form-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24rpx;
}

.form-title,
.form-sub {
  display: block;
}

.form-title {
  font-size: 40rpx;
  font-weight: 700;
}

.form-sub {
  margin-top: 8rpx;
  color: #65726c;
  font-size: 24rpx;
}

.secure-mark {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16rpx;
  background: #e4f1e9;
}

.form-field {
  margin-top: 26rpx;
}

.field-label {
  display: block;
  margin-bottom: 10rpx;
  color: #55645d;
  font-size: 24rpx;
  font-weight: 600;
}

.login-input {
  height: 92rpx;
  display: flex;
  align-items: center;
  gap: 14rpx;
  padding: 0 22rpx;
  border: 1rpx solid #d4dfd7;
  border-radius: 16rpx;
  background: #ffffff;
}

.input {
  flex: 1;
  min-width: 0;
  height: 84rpx;
  font-size: 28rpx;
}

.password-toggle {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.form-error {
  display: block;
  margin-top: 14rpx;
  color: #a8443c;
  font-size: 24rpx;
  line-height: 1.5;
}

.login-submit {
  height: 92rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  margin-top: 30rpx;
  border-radius: 16rpx;
  background: #1d7659;
  color: #ffffff;
  font-size: 28rpx;
  font-weight: 700;
}

.login-submit[disabled] {
  opacity: 0.52;
}

.login-note {
  display: flex;
  align-items: flex-start;
  gap: 8rpx;
  margin-top: 22rpx;
  color: #7b8881;
  font-size: 22rpx;
  line-height: 1.5;
}

.login-foot {
  display: block;
  padding: 26rpx 0 34rpx;
  background: #f5f8f4;
  color: #8b9790;
  font-size: 22rpx;
  text-align: center;
}
</style>
