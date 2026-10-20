<script setup lang="ts">
import { onLoad } from "@dcloudio/uni-app";
import { computed, ref } from "vue";
import UniIcons from "@dcloudio/uni-ui/lib/uni-icons/uni-icons.vue";
import BrandLogo from "../../components/BrandLogo.vue";
import { login } from "../../utils/api";
import { saveAuth } from "../../utils/auth";
import { ensureBrand } from "../../utils/brand";

const identifier = ref("");
const password = ref("");
const showPassword = ref(false);
const loading = ref(false);
const error = ref("");
const canSubmit = computed(
  () => identifier.value.trim().length > 0 && password.value.length >= 6 && !loading.value,
);

onLoad(() => {
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
  color: #182331;
}

.login-main {
  width: 100%;
  max-width: 680rpx;
  flex: 1;
  margin: 0 auto;
}

.login-brand-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24rpx;
}

.system-label {
  flex: none;
  color: #7c8897;
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
  color: #667383;
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
  background: #173550;
  color: #ffffff;
  font-size: 28rpx;
  font-weight: 700;
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
  color: #7c8897;
  font-size: 24rpx;
  line-height: 1.5;
}

.help-link {
  color: #1f6fb2;
  font-weight: 600;
}

.login-foot {
  display: block;
  padding-top: 40rpx;
  color: #8a96a4;
  font-size: 22rpx;
  text-align: center;
}

/* Unified field-console visual system */
.login-page {
  padding: calc(30rpx + env(safe-area-inset-top)) 36rpx
    calc(28rpx + env(safe-area-inset-bottom));
  background: #f3f6fa;
}

.system-label {
  padding: 7rpx 12rpx;
  border: 1rpx solid #dbe3eb;
  border-radius: 8rpx;
  background: #ffffff;
  color: #6b7770;
  font-size: 19rpx;
}

.login-content {
  padding-top: 118rpx;
}

.login-copy {
  margin-bottom: 34rpx;
}

.login-title {
  color: #182331;
  font-size: 46rpx;
  line-height: 1.24;
}

.login-subtitle {
  margin-top: 12rpx;
  color: #667383;
  font-size: 24rpx;
}

.login-form {
  padding: 28rpx;
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
  height: 94rpx;
  padding: 0 20rpx;
  border-color: #d7e0e9;
  border-radius: 12rpx;
}

.input {
  height: 86rpx;
  font-size: 26rpx;
}

.login-submit {
  height: 92rpx;
  margin-top: 34rpx;
  border-radius: 12rpx;
  background: #173550;
  font-size: 26rpx;
}

.login-help {
  margin-top: 22rpx;
  padding-top: 18rpx;
  border-top: 1rpx solid #e6ebf1;
  color: #7c8897;
  font-size: 21rpx;
}

.help-link {
  color: #1f6fb2;
}

.login-foot {
  padding-top: 32rpx;
  color: #8a96a4;
  font-size: 20rpx;
}
</style>
