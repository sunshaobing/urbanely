<script setup lang="ts">
import { computed, ref } from "vue";
import UniIcons from "@dcloudio/uni-ui/lib/uni-icons/uni-icons.vue";
import type { PhotoDraft } from "../utils/types";
import { persistLocalFile } from "../utils/files";

const props = withDefaults(
  defineProps<{
    photos: PhotoDraft[];
    title: string;
    hint?: string;
    max?: number;
    upload?: (path: string, caption: string) => Promise<string>;
  }>(),
  {
    hint: "",
    max: 100,
  },
);

const emit = defineEmits<{
  (event: "update:photos", value: PhotoDraft[]): void;
}>();

const remaining = computed(() => Math.max(0, props.max - props.photos.length));
const uploading = ref(false);

async function choosePhotos() {
  if (remaining.value <= 0 || uploading.value) {
    uni.showToast({ title: `最多上传 ${props.max} 张`, icon: "none" });
    return;
  }
  uni.chooseImage({
    count: Math.min(9, remaining.value),
    sizeType: ["compressed"],
    sourceType: ["camera", "album"],
    success: async (result) => {
      const selected = Array.isArray(result.tempFilePaths)
        ? result.tempFilePaths
        : [result.tempFilePaths];
      const paths = selected.filter(Boolean).slice(0, remaining.value);
      if (!paths.length) return;
      uploading.value = true;
      const next: PhotoDraft[] = [...props.photos];
      const startIndex = props.photos.length;
      let failed = 0;
      try {
        for (let index = 0; index < paths.length; index += 1) {
          const caption = `现场照片 ${startIndex + index + 1}`;
          const savedPath = await persistLocalFile(String(paths[index]));
          let uploadPath = savedPath;
          if (props.upload) {
            try {
              uploadPath = await props.upload(savedPath, caption);
            } catch {
              failed += 1;
            }
          }
          next.push({ path: uploadPath, caption });
          emit("update:photos", [...next]);
        }
        if (failed) {
          uni.showToast({
            title: `${failed} 张图片暂未上传，提交时会重试`,
            icon: "none",
          });
        }
      } finally {
        uploading.value = false;
      }
    },
  });
}

function removePhoto(index: number) {
  const next = props.photos.filter((_, current) => current !== index);
  emit("update:photos", next);
}

function preview(index: number) {
  uni.previewImage({
    current: props.photos[index]?.path,
    urls: props.photos.map((photo) => photo.path),
  });
}
</script>

<template>
  <view class="photo-section">
    <view class="photo-head">
      <view>
        <text class="photo-title">{{ title }}</text>
        <text v-if="hint" class="photo-hint">{{ hint }}</text>
      </view>
      <text class="photo-count">{{ photos.length }} / {{ max }}</text>
    </view>

    <view class="photo-grid">
      <view
        v-for="(photo, index) in photos"
        :key="photo.path"
        class="photo-item"
        @tap="preview(index)"
      >
        <image class="photo-image" :src="photo.path" mode="aspectFill" />
        <view class="photo-remove" @tap.stop="removePhoto(index)">
          <UniIcons type="closeempty" size="14" color="#ffffff" />
        </view>
      </view>
      <view
        v-if="remaining > 0"
        class="photo-item photo-add"
        :class="{ uploading }"
        @tap="choosePhotos"
      >
        <UniIcons v-if="!uploading" type="plus" size="22" color="#176b52" />
        <text class="photo-add-text">{{ uploading ? "上传中" : "添加" }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.photo-section {
  margin-top: 24rpx;
}

.photo-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20rpx;
}

.photo-title {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
}

.photo-hint {
  display: block;
  margin-top: 6rpx;
  color: #65736c;
  font-size: 22rpx;
  line-height: 1.45;
}

.photo-count {
  flex: none;
  color: #65736c;
  font-size: 22rpx;
}

.photo-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 16rpx;
}

.photo-item {
  position: relative;
  width: calc(20% - 9.6rpx);
  height: 118rpx;
  overflow: hidden;
  border: 1rpx solid #dde3df;
  border-radius: 12rpx;
  background: #f5f6f2;
}

.photo-image {
  width: 100%;
  height: 100%;
  display: block;
}

.photo-remove {
  position: absolute;
  top: 4rpx;
  right: 4rpx;
  width: 34rpx;
  height: 34rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(20, 32, 28, 0.76);
}

.photo-add {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  border-style: dashed;
  border-color: #a8c4b8;
  background: #f1f7f3;
}

.photo-add.uploading {
  opacity: 0.72;
  pointer-events: none;
}

.photo-add-text {
  color: #176b52;
  font-size: 20rpx;
}

/* Unified field-console visual system */
.photo-section {
  margin-top: 20rpx;
}

.photo-title {
  color: #24352e;
  font-size: 24rpx;
}

.photo-hint {
  margin-top: 5rpx;
  color: #79867f;
  font-size: 20rpx;
}

.photo-count {
  color: #79867f;
  font-size: 19rpx;
}

.photo-grid {
  gap: 10rpx;
  margin-top: 14rpx;
}

.photo-item {
  width: calc(20% - 8rpx);
  height: 116rpx;
  border-color: #dce3de;
  border-radius: 9rpx;
  background: #f5f9f6;
}

.photo-remove {
  top: 3rpx;
  right: 3rpx;
  width: 32rpx;
  height: 32rpx;
}

.photo-add {
  border-color: #b9d1c4;
  background: #f2f8f4;
}

.photo-add-text {
  color: #176b52;
  font-size: 19rpx;
}
</style>
