# Android 发布与安装

## 1. 应用标识

- 应用名称：申汰封堵勘测
- Android 包名：`cn.sunrgw.pco`
- DCloud AppID：`__UNI__D1F98CA`
- 当前版本：`3.1.1` / versionCode `311`
- 最低适用系统：Android 8.0
- 分发方式：企业内部直接下载安装，不上架应用商店

## 2. 签名证书

发布包使用公司自建 Android 签名证书：

- KeyStore：`C:\Users\Mocreaker\.shentai-android\shentai-release.jks`
- Alias：`shentai`
- 证书 SHA-256：
  `6F:83:93:87:E1:4F:66:3A:88:B8:8B:6D:52:F0:98:6F:90:5C:65:DC:A8:CE:0E:B7:54:44:96:69:D4:AD:F3:48`
- 密码文件：同目录 `credentials.json`，仅保存在本机，不进入 Git。

必须将 KeyStore 和密码文件做离线备份。后续版本必须继续使用同一证书签名，否则 Android 不允许覆盖安装。

### 当前构建

- 构建日期：2026-10-21
- APK 大小：15,246,920 字节（约 14.5 MB）
- SHA-256：`E1485595C5530968A85D401C5A211E9FDA600FEDA4F077659BBB4425C292B9CC`
- APK 签名：v1 + v2 校验通过，签名证书 SHA-256 与本节一致
- Android minSdk：21；targetSdk：28；compileSdk：36
- 本版修复：登录状态跨启动保持；现场照片选择后立即持久化并上传，避免临时文件过期导致 422；存草稿按钮文字居中；小程序声明 `requiredPrivateInfos/getLocation` 与位置权限说明，签到定位支持高精度超时后普通定位和 WGS84 回退；工作台三项统计改为等宽三等分，统一间距，并收紧任务筛选和任务卡片的视觉节奏。

## 3. 构建

先在 `uniapp/src/manifest.json` 同步更新 `versionName` 和 `versionCode`，然后使用 HBuilderX CLI：

```powershell
$dir = Join-Path $HOME '.shentai-android'
$c = Get-Content (Join-Path $dir 'credentials.json') -Raw | ConvertFrom-Json
& 'C:\HBuilderX\HBuilderX\cli.exe' pack `
  --project 'E:\shentai-1088\uniapp' `
  --platform android `
  --android.packagename cn.sunrgw.pco `
  --android.androidpacktype 0 `
  --android.certalias $c.alias `
  --android.certfile $c.keystore `
  --android.certpassword $c.keypass `
  --android.storepassword $c.storepass `
  --safemode false `
  --ignoreWarnings true
```

云打包排队时间通常为 20-60 分钟。打包完成后下载 APK，执行签名和清单校验后再上传。

## 4. 校验

```powershell
java -jar C:\HBuilderX\HBuilderX\plugins\app-safe-pack\apksigner.jar verify `
  --verbose --print-certs .\shentai-pco-3.0.7.apk

Get-FileHash .\shentai-pco-3.0.7.apk -Algorithm SHA256
```

签名证书 SHA-256 必须与第 2 节一致；包名必须是 `cn.sunrgw.pco`，版本必须是 `3.0.7 / 307`。

## 5. 下载与安装

APK、安装说明页和 SHA-256 校验文件统一放在服务器：

```text
https://sunrgw.cn/download/
https://sunrgw.cn/download/shentai-pco-3.1.1.apk
https://sunrgw.cn/download/shentai-pco-latest.apk
```

安装步骤：

1. 手机浏览器打开下载页。
2. 允许浏览器安装未知来源应用。
3. 下载并覆盖安装。
4. 首次使用定位、相机或照片时允许对应权限。

微信内置浏览器可能拦截 APK 下载，应选择“在浏览器打开”。覆盖升级时不要先卸载应用，否则会清除本机登录状态。

## 6. 已知边界

- 当前为 DCloud 云打包的企业内部测试包，未配置国内应用商店上架所需的隐私合规弹窗、软著和应用备案信息。
- 未集成自动更新；后续版本通过下载页覆盖安装。
- DCloud 包名 `cn.sunrgw.pco` 首次打包时自动登记为 Android 测试包名，正式上架前需在 DCloud 开发者中心补全应用资料。
