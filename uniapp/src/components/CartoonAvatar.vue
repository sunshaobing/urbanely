<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    name: string;
    size?: number;
  }>(),
  {
    size: 44,
  },
);

const skins = ["#f2c9a5", "#e6b089", "#c78b62", "#9a6648", "#f6d7bc"];
const hairs = ["#2b211c", "#4a2f24", "#6b432b", "#1f2b33", "#8a5a37"];
const shirts = ["#1f6fb2", "#2563eb", "#b45309", "#475569", "#b42318", "#6d5bd0"];
const backgrounds = ["#e6f4f0", "#eaf0ff", "#fdf1df", "#fdeceb", "#eef2ef", "#f2edff"];

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

const seed = computed(() => hashString(props.name || "现场人员"));
const skin = computed(() => skins[seed.value % skins.length]);
const hair = computed(() => hairs[(seed.value >>> 3) % hairs.length]);
const shirt = computed(() => shirts[(seed.value >>> 6) % shirts.length]);
const background = computed(
  () => backgrounds[(seed.value >>> 9) % backgrounds.length],
);
const hairStyle = computed(() => `hair-${(seed.value >>> 12) % 3}`);
const hasGlasses = computed(() => (seed.value >>> 15) % 4 === 0);
const isSmiling = computed(() => (seed.value >>> 19) % 2 === 0);
const rootStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
  background: background.value,
}));
</script>

<template>
  <view class="cartoon-avatar" :style="rootStyle">
    <view class="avatar-shirt" :style="{ background: shirt }" />
    <view class="avatar-neck" :style="{ background: skin }" />
    <view class="avatar-ear left" :style="{ background: skin }" />
    <view class="avatar-ear right" :style="{ background: skin }" />
    <view class="avatar-head" :style="{ background: skin }">
      <view class="avatar-hair" :class="hairStyle" :style="{ background: hair }" />
      <view class="avatar-brow left" :style="{ background: hair }" />
      <view class="avatar-brow right" :style="{ background: hair }" />
      <view class="avatar-eye left" />
      <view class="avatar-eye right" />
      <view v-if="hasGlasses" class="avatar-glasses">
        <view class="glasses-lens" />
        <view class="glasses-bridge" />
        <view class="glasses-lens" />
      </view>
      <view class="avatar-nose" />
      <view class="avatar-mouth" :class="{ smile: isSmiling }" />
      <view class="avatar-blush left" />
      <view class="avatar-blush right" />
    </view>
  </view>
</template>

<style scoped>
.cartoon-avatar {
  position: relative;
  flex: none;
  overflow: hidden;
  border: 1rpx solid rgba(16, 53, 42, 0.12);
  border-radius: 50%;
}

.avatar-shirt {
  position: absolute;
  right: 14%;
  bottom: -10%;
  left: 14%;
  height: 40%;
  border-radius: 50% 50% 0 0;
}

.avatar-neck {
  position: absolute;
  top: 67%;
  left: 44%;
  width: 12%;
  height: 14%;
  border-radius: 0 0 6rpx 6rpx;
}

.avatar-head {
  position: absolute;
  top: 20%;
  left: 21%;
  width: 58%;
  height: 60%;
  border-radius: 46% 46% 48% 48%;
}

.avatar-ear {
  position: absolute;
  top: 42%;
  z-index: 2;
  width: 12%;
  height: 14%;
  border-radius: 50%;
}

.avatar-ear.left {
  left: 17%;
}

.avatar-ear.right {
  right: 17%;
}

.avatar-hair {
  position: absolute;
  top: -7%;
  right: 3%;
  left: 3%;
  height: 38%;
  border-radius: 48% 48% 30% 30%;
}

.avatar-hair.hair-1 {
  right: 13%;
  height: 40%;
  border-radius: 50% 65% 36% 30%;
  transform: rotate(-8deg);
}

.avatar-hair.hair-2 {
  top: -15%;
  right: 15%;
  left: 15%;
  height: 48%;
  border-radius: 44% 44% 50% 50%;
}

.avatar-brow {
  position: absolute;
  top: 39%;
  width: 15%;
  height: 3rpx;
  border-radius: 4rpx;
}

.avatar-brow.left {
  left: 24%;
}

.avatar-brow.right {
  right: 24%;
}

.avatar-eye {
  position: absolute;
  top: 48%;
  width: 5%;
  height: 8%;
  border-radius: 50%;
  background: #29231f;
}

.avatar-eye.left {
  left: 33%;
}

.avatar-eye.right {
  right: 33%;
}

.avatar-nose {
  position: absolute;
  top: 54%;
  left: 48%;
  width: 4%;
  height: 7%;
  border-right: 2rpx solid #b77a64;
  border-bottom: 2rpx solid #b77a64;
  border-radius: 0 0 50% 0;
}

.avatar-mouth {
  position: absolute;
  top: 69%;
  left: 40%;
  width: 20%;
  height: 2rpx;
  border-radius: 4rpx;
  background: #7d3f3a;
}

.avatar-mouth.smile {
  top: 67%;
  height: 10%;
  border-right: 3rpx solid #7d3f3a;
  border-bottom: 3rpx solid #7d3f3a;
  border-left: 3rpx solid #7d3f3a;
  border-radius: 0 0 50% 50%;
  background: transparent;
}

.avatar-blush {
  position: absolute;
  top: 62%;
  width: 12%;
  height: 4%;
  border-radius: 50%;
  background: rgba(232, 139, 125, 0.3);
}

.avatar-blush.left {
  left: 19%;
}

.avatar-blush.right {
  right: 19%;
}

.avatar-glasses {
  position: absolute;
  top: 41%;
  right: 19%;
  left: 19%;
  display: flex;
  align-items: center;
}

.glasses-lens {
  width: 32%;
  height: 14rpx;
  border: 2rpx solid #3f4a45;
  border-radius: 8rpx;
}

.glasses-bridge {
  width: 18%;
  height: 2rpx;
  background: #3f4a45;
}
</style>
