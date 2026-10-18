# 申汰 PCO 微信小程序现场端

这是原生微信小程序 + TypeScript 实现的现场采集端。桌面 Web 负责运营管理，正式 PDF 报告由服务端生成。

## 页面

| 页面 | 作用 |
| --- | --- |
| `pages/login` | 手机号 + 密码登录生产 API |
| `pages/tasks` | 服务端汇总、状态筛选与任务详情 |
| `pages/inspection` | 勘测信息、结构风险图片、治理方案、双方签字 |
| `pages/sealing` | 封堵部位、材料、前后照片、双方签字 |
| `pages/reports` | 已完成作业归档 |
| `pages/profile` | 真实账号、服务端汇总和退出登录 |

## 本地调试

1. 用微信开发者工具导入当前目录。
2. 项目已配置 AppID `wx0baa4706e41f89c1`；开发者工具需登录拥有该小程序开发权限的微信账号。
3. 在 iOS 和 Android 真机上分别验证：
   - 相册多选、连续上传到 100 张。
   - Canvas 2D 手写、清除、重新签名和导出。
   - 草稿关闭页面后恢复。
   - 断网保存、恢复网络后队列行为。

`project.private.config.json` 是开发者工具的本机配置，不提交到 Git。

## 生产 API

- Base URL：`https://sunrgw.cn`
- 登录：`POST /api/auth/login`
- 工作台汇总：`GET /api/dashboard/summary`
- 作业单列表：`GET /api/workorders`
- 作业单详情：`GET /api/workorders/{id}`

小程序请求域名必须在微信公众平台配置为合法 request 域名。开发者工具的域名校验关闭仅用于本地调试。

## 当前边界

- 登录已接入生产 API，不保存密码；访问令牌保存在微信本机。
- 登录页不会因为本地残留旧会话自动跳转，只有主动提交登录后才进入工作台。
- 工作台、报告和我的只渲染生产 API 返回的数据。
- 勘测与封堵采集页仍是本地草稿原型，尚未接入生产表单接口与 COS。
- 正式完成现场采集还需要：服务端权限校验、COS 预签名上传、幂等同步和报告快照。

## 验证

从仓库根目录运行：

```bash
cd app
pnpm exec tsc --noEmit -p ../miniprogram/tsconfig.json
cd ..
node --test tests/miniprogram-contract.test.mjs
```

安装微信开发者工具后，可用其自带的 `wcc.exe` 和 `wcsc.exe` 编译全部 WXML/WXSS。
