import { persistTempFiles, removeManagedFile } from "../../utils/files";

Component({
  properties: {
    title: { type: String, value: "照片" },
    hint: { type: String, value: "" },
    max: { type: Number, value: 100 },
    photos: { type: Array, value: [] },
  },
  methods: {
    choose() {
      const remaining = this.data.max - this.data.photos.length;
      if (remaining <= 0) {
        wx.showToast({ title: `最多 ${this.data.max} 张`, icon: "none" });
        return;
      }
      wx.chooseMedia({
        count: Math.min(9, remaining),
        mediaType: ["image"],
        sourceType: ["camera", "album"],
        sizeType: ["compressed"],
        success: async (res: any) => {
          const selected = (res.tempFiles || []).map((file: any) => file.tempFilePath);
          const accepted = selected.slice(0, remaining);
          const persistentPaths = await persistTempFiles(accepted);
          const next = this.data.photos.concat(persistentPaths);
          if (selected.length + this.data.photos.length > this.data.max) {
            wx.showToast({ title: `最多 ${this.data.max} 张`, icon: "none" });
          }
          this.triggerEvent("change", { photos: next });
        },
      });
    },
    preview(event: any) {
      const index = Number(event.currentTarget.dataset.index);
      wx.previewImage({
        current: this.data.photos[index],
        urls: this.data.photos,
      });
    },
    remove(event: any) {
      const index = Number(event.currentTarget.dataset.index);
      const removedPath = this.data.photos[index];
      const next = this.data.photos.filter((_: string, current: number) => current !== index);
      removeManagedFile(removedPath);
      this.triggerEvent("change", { photos: next });
    },
  },
});
