export const MAX_ACCURACY_METERS = 80;

export interface PreciseLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  label: string;
}

function accuracyMeters(result: UniApp.GetLocationSuccess) {
  const values = [result.accuracy, result.horizontalAccuracy].filter(
    (value) => typeof value === "number" && Number.isFinite(value) && value > 0,
  );
  return values.length ? Math.min(...values) : 0;
}

function isPermissionDenied(message: string) {
  const text = message.toLowerCase();
  return (
    text.includes("auth") ||
    text.includes("deny") ||
    text.includes("denied") ||
    text.includes("permission")
  );
}

function offerLocationSettings() {
  uni.showModal({
    title: "需要定位权限",
    content: "现场签到必须获取真实位置，请在设置中允许使用位置信息后重试。",
    confirmText: "去设置",
    success: (result) => {
      if (result.confirm) uni.openSetting({});
    },
  });
}

export function getPreciseLocation(): Promise<PreciseLocation> {
  return new Promise((resolve, reject) => {
    uni.getLocation({
      type: "gcj02",
      isHighAccuracy: true,
      highAccuracyExpireTime: 6000,
      altitude: false,
      success: (result) => {
        const { latitude, longitude } = result;
        if (
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude) ||
          Math.abs(latitude) > 90 ||
          Math.abs(longitude) > 180
        ) {
          reject(new Error("定位坐标无效，请重新定位"));
          return;
        }
        const accuracy = accuracyMeters(result);
        if (accuracy > MAX_ACCURACY_METERS) {
          reject(
            new Error(
              `定位精度不足（±${Math.round(accuracy)} 米），请到开阔处重试`,
            ),
          );
          return;
        }
        resolve({
          latitude,
          longitude,
          accuracy,
          label: `${latitude.toFixed(6)},${longitude.toFixed(6)}`,
        });
      },
      fail: (error) => {
        const message = String(error?.errMsg || "");
        if (isPermissionDenied(message)) {
          offerLocationSettings();
          reject(new Error("未获得定位权限，请开启后重试"));
          return;
        }
        reject(new Error("定位失败，请确认已开启 GPS 与网络后重试"));
      },
    });
  });
}

export function formatAccuracy(accuracy?: number | null) {
  if (!accuracy || accuracy <= 0) return "精度未知";
  return `±${Math.round(accuracy)} 米`;
}
