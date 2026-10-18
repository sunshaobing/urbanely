# 申汰 PCO 微信小程序现场端

这是原生微信小程序 + TypeScript 实现的现场采集端。桌面 Web 负责运营管理，正式 PDF 报告由服务端生成。

## 页面

| 页面 | 作用 |
| --- | --- |
| `pages/login` | 手机号 + 密码界面、格式校验、本机会话 |
| `pages/tasks` | 今日任务、风险提示、待办筛选 |
| `pages/inspection` | 勘测信息、结构风险图片、治理方案、双方签字 |
| `pages/sealing` | 封堵部位、材料、前后照片、双方签字 |
| `pages/reports` | 报告状态列表 |
| `pages/profile` | 本机队列、缓存清理、退出登录 |

## 本地调试

1. 用微信开发者工具导入当前目录。
2. 项目已配置 AppID `wx0baa4706e41f89c1`；开发者工具需登录拥有该小程序开发权限的微信账号。
3. 在 iOS 和 Android 真机上分别验证：
   - 相册多选、连续上传到 100 张。
   - Canvas 2D 手写、清除、重新签名和导出。
   - 草稿关闭页面后恢复。
   - 断网保存、恢复网络后队列行为。

`project.private.config.json` 是开发者工具的本机配置，不提交到 Git。

## 当前边界

- 登录是界面原型，只校验手机号和密码格式，不保存密码。
- 登录页不会因为本地残留旧会话自动跳转，只有主动提交登录后才进入工作台。
- 任务和报告使用脱敏样例数据。
- 图片与签名会转存到微信用户数据目录；提交后进入本机队列。
- “同步队列”目前是本地模拟，不会上传到服务端。
- 正式接入需要：`wx.login` 身份绑定、服务端权限校验、COS 预签名上传、幂等同步、失败重试和报告快照。

## 验证

从仓库根目录运行：

```bash
cd app
pnpm exec tsc --noEmit -p ../miniprogram/tsconfig.json
cd ..
node --test tests/miniprogram-contract.test.mjs
```

安装微信开发者工具后，可用其自带的 `wcc.exe` 和 `wcsc.exe` 编译全部 WXML/WXSS。
