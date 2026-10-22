# HarmonyOS 企业内部应用 / 内测分发

## 1. 发布目标

- 应用名称：申汰封堵勘测系统
- 应用形态：HarmonyOS NEXT 原生企业应用
- Bundle Name：`cn.sunrgw.pco`
- 当前版本：`3.1.4 / 314`
- 分发方式：AppGallery Connect 企业内部测试或企业应用分发
- 不发布 Android APK 到 HarmonyOS NEXT

## 2. 当前项目状态

已完成：

- uni-app Vue3 项目已包含 `@dcloudio/uni-app-harmony`。
- `manifest.json` 已增加 `app-harmony` 配置和 Bundle Name。
- `harmony-configs` 已声明手机/平板、网络、精确/模糊定位、相机和网络状态权限。
- 定位权限仅在进入页面后的主动签到操作中使用，不申请后台定位。
- 已准备中文、英文权限用途文案。
- 已添加环境检查脚本 `scripts/check-harmony-env.ps1`。
- 已从 DCloud 官方 `uni-api` 仓库提交 `d98313b`（`HBuilderX 5.32 / 2026-10-13` 对应版本）补入 `uni-location` 和 `uni-location-system` 源码及上游许可证。
- 已在 `harmony-configs/libs` 固化编译后的 `uni_modules__uni_location_system.har`，解决 HBuilderX 本地打包缺少定位 HAR 的问题。
- 已使用 DevEco Studio 5.1.0.849 或更高版本构建；本机实际版本为 `26.0.0.851`，并已使用 AGC 发布证书、发布 Profile 完成签名 `.app` 构建。

仍需在具备华为企业账号的电脑上完成：

- 连接 HarmonyOS NEXT 真机完成功能测试。
- 上传签名 `.app` 到 AppGallery Connect 内部测试版本。
- 添加内部测试人员并提交邀请测试。

## 3. AGC 创建应用信息

```text
应用名称：申汰封堵勘测系统
应用包名：cn.sunrgw.pco
应用平台：HarmonyOS
应用分类：商务 / 企业办公
发布方式：企业内部测试或企业应用
默认语言：简体中文
应用简介：面向授权 PCO 现场服务人员的勘测、封堵、签到、双签和报告归档工具。
```

企业资料需要使用上海申汰实业有限公司真实营业执照、企业联系人和运营者信息。证书、私钥、Profile 和密码只能保存在本机安全目录，不得提交到 Git。

## 4. 权限与隐私说明

- 网络：登录、任务、报告和图片上传。
- 精确/模糊位置：仅用户主动点击现场签到时，用于核验是否到达任务指定客户门店并生成考勤签到记录。
- 相机：拍摄封堵前后照片、结构风险和手写签字。
- 相册：使用系统图片选择器，不读取整个图库。
- 不申请后台定位、通讯录、麦克风、蓝牙、剪贴板读取或广告跟踪权限。

## 5. 真机验收项

1. 冷启动保持登录状态。
2. 登录页协议勾选、隐私说明和账号登录。
3. 工作台任务列表和角色隔离。
4. 现场签到定位；拒绝定位时给出明确提示。
5. 相机拍照和相册选择。
6. 横屏手写签字页；员工/客户主题正确。
7. 签字 PNG 上传并写回表单。
8. 勘测报告、封堵报告 PDF 打开和下载。
9. 返回后恢复竖屏与系统栏。
10. 无崩溃、白屏、权限循环、字体截断或横向溢出。

## 6. 华为后台操作

1. 登录 [AppGallery Connect](https://developer.huawei.com/consumer/cn/service/josp/agc/index.html)。
2. 完成企业开发者认证。
3. 创建 HarmonyOS 应用，填写 `cn.sunrgw.pco`。
4. 在“证书、APP ID 和 Profile”中申请企业内测证书与 Profile。
5. 将签名三件套放到本机安全目录，并在 `harmony-configs/build-profile.json5` 中配置发布签名。
6. 执行 `pnpm check:harmony` 和 `pnpm pack:harmony`；签名产物位于 `dist/build/app-harmony/build/outputs/release/app-harmony-release-signed.app`。
7. 使用 `hap-sign-tool verify-app` 校验签名，并上传 `.app` 到 AGC 内部测试版本。
8. 添加企业测试人员华为账号，设置测试有效期和下载范围。
9. 提交内部测试分发，不进入公开应用市场审核。

## 7. 测试账号

内部测试可使用现有虚构审核账号：

```text
账号：wxreview
密码：从本机 C:\Users\Mocreaker\.shentai-review\wechat-review-account.txt 读取
演示工单：STFD-2026-010
角色：勘测工程师
```

密码不得写入 Git、截图、日志或发布说明。

## 8. 打包前检查

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\check-harmony-env.ps1
node --test tests/harmony-contract.test.mjs
pnpm type-check
```

DevEco Studio 安装后，在 HBuilderX 中设置其安装路径，再配置签名并执行本地打包。

签名密码会由 Hvigor 加密，并在私钥目录下生成 `material`。`harmony-configs/build-profile.json5`、`config/`、`.p12`、`.cer`、`.p7b` 和 `material` 均已排除在 Git 之外。
