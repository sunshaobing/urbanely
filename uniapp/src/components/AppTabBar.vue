<script setup lang="ts">
import UniIcons from "@dcloudio/uni-ui/lib/uni-icons/uni-icons.vue";
import { getSession } from "../utils/auth";
import { roleMode } from "../utils/roles";

type TabKey = "workbench" | "risk" | "sealing" | "reports" | "profile";

const props = defineProps<{
  current: TabKey;
}>();

type TabItem = {
  key: TabKey;
  label: string;
  icon: string;
  activeIcon: string;
  url: string;
};

const mode = roleMode(getSession()?.role || "");
const allItems: TabItem[] = [
  {
    key: "workbench",
    label: "任务",
    icon: "home",
    activeIcon: "home-filled",
    url: "/pages/workbench/index",
  },
  {
    key: "risk",
    label: "勘测",
    icon: "search",
    activeIcon: "search",
    url: "/pages/workbench/index?kind=risk",
  },
  {
    key: "sealing",
    label: "封堵",
    icon: "compose",
    activeIcon: "compose",
    url: "/pages/workbench/index?kind=sealing",
  },
  {
    key: "reports",
    label: "报告",
    icon: "list",
    activeIcon: "list",
    url: "/pages/reports/index",
  },
  {
    key: "profile",
    label: "我的",
    icon: "person",
    activeIcon: "person-filled",
    url: "/pages/profile/index",
  },
];

const items: TabItem[] =
  mode === "survey"
    ? allItems.filter((item) => ["risk", "profile"].includes(item.key))
    : mode === "sealing"
      ? allItems.filter((item) => ["sealing", "profile"].includes(item.key))
      : mode === "both"
        ? allItems
        : allItems.filter((item) => item.key === "profile");

function navigate(key: TabKey, url: string) {
  if (props.current === key) return;
  uni.reLaunch({ url });
}
</script>

<template>
  <view class="app-tabbar safe-bottom">
    <view class="app-tabbar-inner">
      <view
        v-for="item in items"
        :key="item.key"
        class="app-tab"
        :class="{ active: current === item.key }"
        @tap="navigate(item.key, item.url)"
      >
        <view class="app-tab-icon">
          <UniIcons
            :type="current === item.key ? item.activeIcon : item.icon"
            :size="21"
            :color="current === item.key ? '#1f6fb2' : '#7c8982'"
          />
        </view>
        <text class="app-tab-label">{{ item.label }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.app-tabbar {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 50;
  border-top: 1rpx solid #dfe5ec;
  background: #ffffff;
  box-shadow: 0 -10rpx 32rpx rgba(18, 34, 27, 0.07);
}

.app-tabbar-inner {
  height: 126rpx;
  display: flex;
  align-items: stretch;
  justify-content: space-around;
  padding: 10rpx 20rpx 8rpx;
}

.app-tab {
  position: relative;
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  color: #7c8982;
}

.app-tab::before {
  display: none;
}

.app-tab.active::before {
  display: none;
}

.app-tab-icon {
  width: 58rpx;
  height: 46rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12rpx;
  background: transparent;
  transition: background 120ms ease;
}

.app-tab-label {
  font-size: 20rpx;
  line-height: 1.2;
}

.app-tab.active {
  color: #1a568c;
}

.app-tab.active .app-tab-label {
  font-weight: 700;
}

.app-tab.active .app-tab-icon {
  background: #e9f2fa;
}
</style>
