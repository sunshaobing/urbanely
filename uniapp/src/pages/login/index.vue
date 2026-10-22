<script setup lang="ts">
import { onLoad } from "@dcloudio/uni-app";
import { computed, ref } from "vue";
import UniIcons from "@dcloudio/uni-ui/lib/uni-icons/uni-icons.vue";
import BrandLogo from "../../components/BrandLogo.vue";
import { login } from "../../utils/api";
import { getSession, saveAuth } from "../../utils/auth";
import { ensureBrand } from "../../utils/brand";
import { ensurePrivacyAuthorized } from "../../utils/privacy";

const identifier = ref("");
const password = ref("");
const showPassword = ref(false);
const loading = ref(false);
const error = ref("");
const agreed = ref(false);
const canSubmit = computed(
  () =>
    identifier.value.trim().length > 0 &&
    password.value.length >= 6 &&
    agreed.value &&
    !loading.value,
);

onLoad(() => {
  if (getSession()?.token) {
    uni.reLaunch({ url: "/pages/workbench/index" });
    return;
  }
  void ensureBrand();
});

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
  if (!agreed.value) {
    error.value = "请先阅读并同意《用户服务协议》和《隐私政策》";
    return;
  }
  loading.value = true;
  error.value = "";
  try {
    await ensurePrivacyAuthorized();
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

function openAgreement(type: "service" | "privacy") {
  uni.navigateTo({ url: `/pages/agreement/index?type=${type}` });
}

function showResetHelp() {
  uni.showModal({
    title: "忘记密码",
    content: "请联系项目主管或系统管理员重置密码。",
    showCancel: false,
    confirmText: "我知道了",
  });
}
</script>

<template>
  <view class="login-page">
    <view class="login-main">
      <view class="login-brand-row">
        <BrandLogo :size="40" show-name :name-size="14" />
        <text class="system-label">内部系统</text>
      </view>

      <view class="login-content">
        <view class="login-copy">
          <text class="login-title">现场服务工作台</text>
          <text class="login-subtitle">使用系统分配的账号登录</text>
        </view>

        <view class="login-form card">
          <view class="form-field">
            <text class="field-label">账号或手机号</text>
            <view class="login-input">
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
                  color="#66736d"
                />
              </view>
            </view>
          </view>

          <text v-if="error" class="form-error">{{ error }}</text>

          <view class="agreement-row">
            <view
              class="agreement-check"
              :class="{ checked: agreed }"
              @tap="agreed = !agreed; error = ''"
            >
              <UniIcons
                v-if="agreed"
                type="checkmarkempty"
                size="14"
                color="#ffffff"
              />
            </view>
            <view class="agreement-copy">
              <text class="agreement-text" @tap="agreed = !agreed; error = ''">
                我已阅读并同意
              </text>
              <text class="agreement-link" @tap.stop="openAgreement('service')">
                《用户服务协议》
              </text>
              <text class="agreement-text">和</text>
              <text class="agreement-link" @tap.stop="openAgreement('privacy')">
                《隐私政策》
              </text>
            </view>
          </view>
          <text class="agreement-helper">
            未同意前不会提交账号密码，也不会获取位置、相机或照片信息
          </text>

          <button class="login-submit" :disabled="!canSubmit" @tap="submit">
            {{ loading ? "正在登录" : "登录" }}
          </button>

          <view class="login-help" @tap="showResetHelp">
            <text>忘记密码？</text>
            <text class="help-link">联系管理员</text>
          </view>
        </view>
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
  padding: calc(36rpx + env(safe-area-inset-top)) 40rpx
    calc(30rpx + env(safe-area-inset-bottom));
  background: #f4f6f3;
  color: #17211d;
}

.login-main {
  width: 100%;
  max-width: 680rpx;
  flex: 1;
  margin: 0 auto;
}

.login-brand-row {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
}

.system-label {
  position: absolute;
  right: 0;
  color: #79867f;
  font-size: 22rpx;
}

.login-content {
  padding-top: 132rpx;
}

.login-copy {
  margin-bottom: 56rpx;
}

.login-title,
.login-subtitle {
  display: block;
}

.login-title {
  font-size: 48rpx;
  font-weight: 700;
  line-height: 1.3;
}

.login-subtitle {
  margin-top: 14rpx;
  color: #65736c;
  font-size: 26rpx;
  line-height: 1.55;
}

.form-field + .form-field {
  margin-top: 28rpx;
}

.field-label {
  display: block;
  margin-bottom: 12rpx;
  color: #4f5c56;
  font-size: 24rpx;
  font-weight: 600;
}

.login-input {
  height: 96rpx;
  display: flex;
  align-items: center;
  padding: 0 24rpx;
  border: 1rpx solid #d5ddd7;
  border-radius: 16rpx;
  background: #ffffff;
}

.input {
  flex: 1;
  min-width: 0;
  height: 88rpx;
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
  margin-top: 18rpx;
  color: #a8443c;
  font-size: 24rpx;
  line-height: 1.5;
}

.login-submit {
  width: 100%;
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 40rpx;
  border-radius: 16rpx;
  background: #103b2d;
  color: #ffffff;
  font-size: 28rpx;
  font-weight: 700;
}

.agreement-row {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  margin-top: 26rpx;
}

.agreement-check {
  width: 34rpx;
  height: 34rpx;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 2rpx;
  border: 2rpx solid #b9c6be;
  border-radius: 8rpx;
  background: #ffffff;
}

.agreement-check.checked {
  border-color: #176b52;
  background: #176b52;
}

.agreement-copy {
  flex: 1;
  color: #79867f;
  font-size: 22rpx;
  line-height: 1.6;
}

.agreement-text {
  color: #79867f;
}

.agreement-link {
  color: #176b52;
  font-weight: 600;
}

.agreement-helper {
  display: block;
  margin-top: 8rpx;
  color: #8a968f;
  font-size: 19rpx;
  line-height: 1.5;
}

.login-submit[disabled] {
  opacity: 0.52;
}

.login-help {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8rpx;
  margin-top: 24rpx;
  color: #79867f;
  font-size: 24rpx;
  line-height: 1.5;
}

.help-link {
  color: #176b52;
  font-weight: 600;
}

.login-foot {
  display: block;
  padding-top: 40rpx;
  color: #8a968f;
  font-size: 22rpx;
  text-align: center;
}

/* Unified field-console visual system */
.login-page {
  padding: calc(30rpx + env(safe-area-inset-top)) 36rpx
    calc(28rpx + env(safe-area-inset-bottom));
  background: #f4f7f5;
}

.system-label {
  padding: 7rpx 12rpx;
  border: 1rpx solid #dbe4dd;
  border-radius: 8rpx;
  background: #ffffff;
  color: #6b7770;
  font-size: 19rpx;
}

.login-content {
  padding-top: 88rpx;
}

.login-copy {
  margin-bottom: 36rpx;
  text-align: center;
}

.login-title {
  color: #17211d;
  font-size: 44rpx;
  line-height: 1.24;
}

.login-subtitle {
  margin-top: 12rpx;
  color: #65736c;
  font-size: 24rpx;
}

.login-form {
  padding: 30rpx;
}

.form-field + .form-field {
  margin-top: 24rpx;
}

.field-label {
  margin-bottom: 9rpx;
  color: #4f5f72;
  font-size: 22rpx;
}

.login-input {
  height: 96rpx;
  padding: 0 20rpx;
  border-color: #d7e2da;
  border-radius: 12rpx;
}

.input {
  height: 88rpx;
  font-size: 28rpx;
}

.login-submit {
  height: 96rpx;
  margin-top: 34rpx;
  border-radius: 12rpx;
  background: #103b2d;
  font-size: 28rpx;
}

.login-help {
  margin-top: 22rpx;
  padding-top: 18rpx;
  border-top: 1rpx solid #e5ece7;
  color: #79867f;
  font-size: 21rpx;
}

.help-link {
  color: #176b52;
}

.login-foot {
  padding-top: 32rpx;
  color: #8a968f;
  font-size: 20rpx;
}

/* #ifdef APP-PLUS */
.login-page {
  padding-top: calc(58rpx + env(safe-area-inset-top));
}
/* #endif */
</style>
