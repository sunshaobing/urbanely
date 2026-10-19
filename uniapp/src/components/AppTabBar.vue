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
            :color="current === item.key ? '#ffffff' : '#8f9a95'"
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
  background: #10352a;
  box-shadow: 0 -8rpx 28rpx rgba(16, 53, 42, 0.18);
}

.app-tabbar-inner {
  height: 132rpx;
  display: flex;
  align-items: stretch;
  justify-content: space-around;
  padding: 8rpx 20rpx;
}

.app-tab {
  position: relative;
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  color: #8f9a95;
}

.app-tab::before {
  position: absolute;
  top: -8rpx;
  width: 44rpx;
  height: 4rpx;
  border-radius: 0 0 4rpx 4rpx;
  background: transparent;
  content: "";
}

.app-tab.active::before {
  background: #ffffff;
}

.app-tab-icon {
  width: 52rpx;
  height: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.app-tab-label {
  font-size: 22rpx;
  line-height: 1.2;
}

.app-tab.active {
  color: #ffffff;
}

.app-tab.active .app-tab-label {
  font-weight: 700;
}
</style>
