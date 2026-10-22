<script setup lang="ts">
import { computed, ref } from "vue";
import UniIcons from "@dcloudio/uni-ui/lib/uni-icons/uni-icons.vue";
import PageHeader from "../../components/PageHeader.vue";
import { changePassword } from "../../utils/api";
import { clearSession } from "../../utils/auth";

const oldPassword = ref("");
const newPassword = ref("");
const confirmPassword = ref("");
const loading = ref(false);
const error = ref("");

const canSubmit = computed(
  () =>
    oldPassword.value.length >= 6 &&
    newPassword.value.length >= 6 &&
    confirmPassword.value === newPassword.value &&
    !loading.value,
);

async function submit() {
  error.value = "";
  if (oldPassword.value.length < 6) {
    error.value = "请输入当前密码";
    return;
  }
  if (newPassword.value.length < 6) {
    error.value = "新密码至少需要 6 位";
    return;
  }
  if (newPassword.value !== confirmPassword.value) {
    error.value = "两次输入的新密码不一致";
    return;
  }
  loading.value = true;
  try {
    await changePassword(oldPassword.value, newPassword.value);
    clearSession();
    uni.showToast({ title: "密码已更新", icon: "success" });
    setTimeout(() => {
      uni.reLaunch({ url: "/pages/login/index" });
    }, 600);
  } catch (submitError) {
    error.value =
      submitError instanceof Error ? submitError.message : "密码修改失败";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <view class="password-page">
    <PageHeader
      title="修改密码"
      subtitle="修改后需要重新登录"
      kicker="账号安全"
      back
    />

    <view class="page-content">
      <view class="security-card card">
        <view class="security-head">
          <view class="security-icon">
            <UniIcons type="locked" size="19" color="#176b52" />
          </view>
          <view>
            <text class="security-title">账号安全</text>
            <text class="security-sub">密码不会保存在设备中</text>
          </view>
        </view>

        <view class="field">
          <text class="field-label">当前密码</text>
          <input
            v-model="oldPassword"
            class="field-input"
            :password="true"
            placeholder="请输入当前登录密码"
            placeholder-class="field-placeholder"
            @input="error = ''"
          />
        </view>

        <view class="field">
          <text class="field-label">新密码</text>
          <input
            v-model="newPassword"
            class="field-input"
            :password="true"
            placeholder="至少 6 位"
            placeholder-class="field-placeholder"
            @input="error = ''"
          />
        </view>

        <view class="field">
          <text class="field-label">确认新密码</text>
          <input
            v-model="confirmPassword"
            class="field-input"
            :password="true"
            placeholder="再次输入新密码"
            placeholder-class="field-placeholder"
            @input="error = ''"
            @confirm="submit"
          />
        </view>

        <text v-if="error" class="error-copy">{{ error }}</text>

        <button class="btn-primary submit-button" :disabled="!canSubmit" @tap="submit">
          {{ loading ? "正在更新" : "确认修改" }}
        </button>
      </view>

      <view class="security-note">
        <text class="note-title">建议</text>
        <text class="note-copy">使用字母、数字和符号组合，不要与其他系统共用同一密码。</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.password-page {
  min-height: 100vh;
  background: #f2f6f3;
}

.security-card {
  padding: 26rpx;
}

.security-head {
  display: flex;
  align-items: center;
  gap: 14rpx;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #e5ece7;
}

.security-icon {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14rpx;
  background: #e6f2ec;
  color: #176b52;
  font-family: "SFMono-Regular", "Cascadia Code", monospace;
  font-size: 20rpx;
  font-weight: 700;
}

.security-title,
.security-sub {
  display: block;
}

.security-title {
  font-size: 28rpx;
  font-weight: 700;
}

.security-sub {
  margin-top: 3rpx;
  color: #65736c;
  font-size: 21rpx;
}

.submit-button {
  margin-top: 30rpx;
}

.security-note {
  margin-top: 24rpx;
  padding: 20rpx 22rpx;
  border-radius: 16rpx;
  background: #e6f2ec;
}

.note-title,
.note-copy {
  display: block;
}

.note-title {
  color: #115640;
  font-size: 23rpx;
  font-weight: 700;
}

.note-copy {
  margin-top: 5rpx;
  color: #50635a;
  font-size: 21rpx;
  line-height: 1.55;
}

/* Unified field-console visual system */
.password-page {
  background: #f2f6f3;
}

.security-card {
  padding: 26rpx;
}

.security-head {
  padding-bottom: 20rpx;
  border-bottom-color: #e5ece7;
}

.security-icon {
  width: 56rpx;
  height: 56rpx;
  background: #e6f2ec;
}

.security-icon + view .security-title {
  color: #17211d;
  font-size: 26rpx;
}

.security-sub {
  color: #79867f;
  font-size: 20rpx;
}

.submit-button {
  min-height: 90rpx;
  margin-top: 28rpx;
  border-radius: 12rpx;
}

.security-note {
  border: 1rpx solid #dbe6df;
  border-radius: 12rpx;
  background: #f7faf8;
}

.note-title {
  color: #24352e;
  font-size: 22rpx;
}

.note-copy {
  color: #65736c;
  font-size: 20rpx;
}

.password-page {
  background: #f3f6f4;
}

.security-icon {
  border-radius: 999px;
}

.security-note {
  border-radius: 18rpx;
}

.submit-button {
  border-radius: 999px;
}
</style>
