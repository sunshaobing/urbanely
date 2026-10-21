# iOS 发布与真机安装

## 1. 当前状态

iOS 版基于现有 uni-app 现场服务客户端，不另建一套原生 SwiftUI 代码。已完成：

- Bundle ID：`cn.sunrgw.pco`
- 应用名称：申汰封堵勘测
- 版本：`3.1.4` / versionCode `314`
- App Store 1024×1024 图标
- 定位、相机、相册隐私用途说明
- 关闭 IDFA
- iOS 横竖屏适配，签名页仍使用横屏
- App 资源本地编译通过
- 公网隐私政策：https://sunrgw.cn/privacy/
- 公网支持页：https://sunrgw.cn/support/

公网页面源代码位于 `docs/public/privacy/index.html` 和 `docs/public/support/index.html`，部署时分别复制到服务器的 `static_web/privacy/index.html` 和 `static_web/support/index.html`。后续替换 Web 根目录时必须保留这两个路径。

当前机器没有找到 Apple `.p12` 证书和 `.mobileprovision` 描述文件，因此还不能生成可安装的签名 IPA。

## 2. iOS 权限文案

- `NSLocationWhenInUseUsageDescription`
  `用于现场服务人员到达客户门店后完成签到并记录到场位置。`
- `NSCameraUsageDescription`
  `用于拍摄现场服务照片和手写签字确认。`
- `NSPhotoLibraryUsageDescription`
  `用于选择现场服务照片并上传至服务报告。`

本 App 不申请通讯录、麦克风、蓝牙、后台持续定位或广告跟踪权限。

## 3. Apple 签名材料

需要提供以下任一方案：

### 方案 A：TestFlight / App Store

- Apple Developer Program 账号
- App Store 发布证书 `.p12` 及证书密码
- App Store Distribution Provisioning Profile `.mobileprovision`
- Bundle ID `cn.sunrgw.pco`（需在 Apple Developer 后台注册）
- App Store Connect 应用记录（用于 TestFlight 或正式上架）

### 方案 B：只安装到指定 iPhone / iPad

- Apple Developer 账号
- Ad Hoc 或 Development 证书 `.p12` 及密码
- 包含目标设备 UDID 的 Ad Hoc/Development Provisioning Profile
- 目标 iPhone/iPad 的 UDID

## 4. HBuilderX 云打包

获取证书和描述文件后，将路径替换为实际文件路径：

```powershell
& 'C:\HBuilderX\HBuilderX\cli.exe' pack `
  --project 'E:\shentai-1088\uniapp' `
  --platform ios `
  --ios.bundle cn.sunrgw.pco `
  --ios.supporteddevice iPhone,iPad `
  --ios.certfile 'C:\path\distribution.p12' `
  --ios.certpassword '<certificate-password>' `
  --ios.profile 'C:\path\distribution.mobileprovision'
```

打包完成后：

- TestFlight/App Store：将 IPA 上传 App Store Connect，先通过 TestFlight 安装验证，再提交 App Review。
- Ad Hoc：通过 Apple Configurator、Apple Devices 或已注册的签名安装工具安装到指定设备。

不要把证书、密码或 provisioning profile 提交到 Git。

## 5. App Store Connect 资料

- 隐私政策 URL：https://sunrgw.cn/privacy/
- 支持 URL：https://sunrgw.cn/support/
- App 名称：申汰封堵勘测
- Bundle ID：`cn.sunrgw.pco`
- 分类建议：商务 / 效率
- 审核账号：`wxreview`
- 审核密码：见 `C:\Users\Mocreaker\.shentai-review\wechat-review-account.txt`
- 演示工单：`STFD-2026-010`

审核备注：

```text
本 App 面向上海申汰实业有限公司授权的现场服务人员及经客户授权的门店代表。未登录用户可以查看登录页、用户服务协议和隐私政策，业务功能仅向授权账号开放。

审核账号：wxreview
审核密码：请从审核账号安全文件复制
演示工单：STFD-2026-010

体验路径：登录页阅读并勾选协议 → 登录 → 工作台 → 任务详情 → 现场勘测/签到。
```

## 6. 真机验收

- 登录、退出、重启后保持登录
- 任务、勘测、封堵、报告列表
- 定位签到系统权限提示
- 相机/相册权限提示
- 前后照片上传
- 横屏手写签字、双方签字
- 报告预览和 PDF 打开
- iPhone 刘海/灵动岛安全区
- iPad 横屏和竖屏布局
