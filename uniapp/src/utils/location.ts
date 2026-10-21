export const MAX_ACCURACY_METERS = 80;

declare const wx:
  | {
      requirePrivacyAuthorize?: (options: {
        success: () => void;
        fail: () => void;
      }) => void;
    }
  | undefined;

export interface PreciseLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  label: string;
}

interface LocationAttempt {
  type: "gcj02" | "wgs84";
  highAccuracy: boolean;
}

const LOCATION_ATTEMPTS: LocationAttempt[] = [
  { type: "gcj02", highAccuracy: true },
  { type: "gcj02", highAccuracy: false },
  { type: "wgs84", highAccuracy: false },
];

function accuracyMeters(result: UniApp.GetLocationSuccess) {
  const values = [result.accuracy, result.horizontalAccuracy].filter(
    (value) => typeof value === "number" && Number.isFinite(value) && value > 0,
  );
  return values.length ? Math.min(...values) : 0;
}

function messageOf(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "errMsg" in error) {
    return String((error as { errMsg?: unknown }).errMsg || "");
  }
  return String(error || "");
}

function isPermissionDenied(message: string) {
  const text = message.toLowerCase();
  return (
    text.includes("auth") ||
    text.includes("deny") ||
    text.includes("denied") ||
    text.includes("permission") ||
    message.includes("授权")
  );
}

function isFatalLocationError(message: string) {
  const text = message.toLowerCase();
  return (
    isPermissionDenied(message) ||
    text.includes("requiredprivateinfos") ||
    text.includes("privacy") ||
    message.includes("隐私")
  );
}

function openLocationSettings() {
  // #ifdef APP-PLUS
  try {
    type AndroidIntent = { setData: (value: unknown) => void };
    const Intent = plus.android.importClass(
      "android.content.Intent",
    ) as unknown as (new (action: string) => AndroidIntent) & {
      ACTION_APPLICATION_DETAILS_SETTINGS: string;
    };
    const Settings = plus.android.importClass(
      "android.provider.Settings",
    ) as unknown as { ACTION_APPLICATION_DETAILS_SETTINGS: string };
    const Uri = plus.android.importClass("android.net.Uri") as unknown as {
      parse: (value: string) => unknown;
    };
    const activity = plus.android.runtimeMainActivity() as unknown as {
      getPackageName: () => string;
      startActivity: (intent: AndroidIntent) => void;
    };
    const intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
    intent.setData(Uri.parse(`package:${activity.getPackageName()}`));
    activity.startActivity(intent);
    return;
  } catch {
    plus.runtime.openURL("app-settings:");
    return;
  }
  // #endif
  // #ifndef APP-PLUS
  uni.openSetting({});
  // #endif
}

function offerLocationSettings(content: string) {
  uni.showModal({
    title: "需要定位权限",
    content,
    confirmText: "去设置",
    success: (result) => {
      if (result.confirm) openLocationSettings();
    },
  });
}

function requestLocation(attempt: LocationAttempt) {
  return new Promise<UniApp.GetLocationSuccess>((resolve, reject) => {
    uni.getLocation({
      type: attempt.type,
      isHighAccuracy: attempt.highAccuracy,
      highAccuracyExpireTime: attempt.highAccuracy ? 15000 : undefined,
      altitude: false,
      success: resolve,
      fail: reject,
    });
  });
}

async function ensureMiniProgramPermission() {
  // #ifdef MP-WEIXIN
  if (wx?.requirePrivacyAuthorize) {
    await new Promise<void>((resolve, reject) => {
      wx?.requirePrivacyAuthorize?.({
        success: resolve,
        fail: () =>
          reject(new Error("请先同意隐私保护指引后再进行现场签到")),
      });
    });
  }

  const setting = await new Promise<UniApp.GetSettingSuccessResult>(
    (resolve, reject) => {
      uni.getSetting({
        success: resolve,
        fail: reject,
      });
    },
  );
  if (setting.authSetting["scope.userLocation"] === false) {
    offerLocationSettings("请在设置中允许使用位置信息后再进行现场签到。");
    throw new Error("未获得定位权限，请开启后重试");
  }
  if (!setting.authSetting["scope.userLocation"]) {
    await new Promise<void>((resolve, reject) => {
      uni.authorize({
        scope: "scope.userLocation",
        success: () => resolve(),
        fail: () => {
          offerLocationSettings(
            "现场签到必须获取真实位置，请在设置中允许使用位置信息。",
          );
          reject(new Error("未获得定位权限，请开启后重试"));
        },
      });
    });
  }
  // #endif
}

function classifyLocationError(error: unknown) {
  const message = messageOf(error);
  const text = message.toLowerCase();
  if (text.includes("requiredprivateinfos")) {
    return "小程序定位接口未配置，请更新到最新版本后重试";
  }
  if (text.includes("privacy") || message.includes("隐私")) {
    return "请先同意隐私保护指引后再进行现场签到";
  }
  if (isPermissionDenied(message)) {
    offerLocationSettings(
      "现场签到必须获取真实位置，请在设置中允许使用位置信息。",
    );
    return "未获得定位权限，请开启后重试";
  }
  if (text.includes("timeout") || message.includes("超时")) {
    return "定位超时，请到开阔处或靠近门口后重试";
  }
  if (
    text.includes("gps") ||
    text.includes("location service") ||
    message.includes("定位服务") ||
    message.includes("位置服务")
  ) {
    return "请先打开手机定位服务（GPS）后重试";
  }
  return "定位失败，请确认已开启 GPS 与网络后重试";
}

export async function getPreciseLocation(): Promise<PreciseLocation> {
  uni.showLoading({ title: "正在获取定位", mask: true });
  try {
    await ensureMiniProgramPermission();
    let lastError: unknown = null;
    for (const attempt of LOCATION_ATTEMPTS) {
      try {
        const result = await requestLocation(attempt);
        const { latitude, longitude } = result;
        if (
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude) ||
          Math.abs(latitude) > 90 ||
          Math.abs(longitude) > 180
        ) {
          throw new Error("定位坐标无效，请重新定位");
        }
        const accuracy = accuracyMeters(result);
        if (accuracy > MAX_ACCURACY_METERS) {
          lastError = new Error(
            `定位精度不足（±${Math.round(accuracy)} 米），请到开阔处重试`,
          );
          continue;
        }
        return {
          latitude,
          longitude,
          accuracy,
          label: `${latitude.toFixed(6)},${longitude.toFixed(6)}`,
        };
      } catch (error) {
        lastError = error;
        if (isFatalLocationError(messageOf(error))) break;
      }
    }
    throw new Error(classifyLocationError(lastError));
  } finally {
    uni.hideLoading();
  }
}

export function formatAccuracy(accuracy?: number | null) {
  if (!accuracy || accuracy <= 0) return "精度未知";
  return `±${Math.round(accuracy)} 米`;
}
