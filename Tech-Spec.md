# 申汰 PCO 现场服务系统 Tech Spec

## 1. 架构结论

采用**模块化单体 + 响应式 Web + uni-app 微信小程序现场端 + 异步任务**，不做微服务。

理由：

- 当前业务规模约 200 家门店、200 张服务单/年量级，单体足够。
- 现场离线、报告生成、文件处理需要可靠的后台任务，但不需要独立服务集群。
- 一名独立开发者维护，部署和排障成本必须低。
- 领域边界清晰后，未来可以按模块拆出，不需要一开始就拆。

```mermaid
flowchart TB
  A[Desktop 运营台] --> B[Next.js / React Web]
  C[WeChat Mini Program] --> B
  B --> D[Application API]
  D --> E[PostgreSQL]
  D --> F[S3-compatible Object Storage]
  D --> G[Job Queue]
  G --> H[PDF Renderer]
  G --> I[Image Processor]
  G --> J[Notification Worker]
  E --> K[Audit / Outbox]
```

## 2. 技术栈

| 层 | 选型 | 说明 |
| --- | --- | --- |
| Web | Next.js + React + TypeScript | 运营台、报告中心、客户门户共用 |
| Field | uni-app + Vue 3 + TypeScript | 跨端页面代码，编译微信小程序；拍照、草稿、签字和任务同步 |
| API | Next.js Route Handlers 或 NestJS | 领域服务保持模块化 |
| DB | PostgreSQL 16+ | 关系、约束、JSONB、全文检索 |
| ORM | Prisma | 类型安全、迁移可审查 |
| Files | S3 兼容对象存储 | 照片、合同、PDF、签名 |
| Jobs | PostgreSQL 队列（如 pg-boss） | 少一个 Redis 依赖 |
| PDF | Playwright/Chromium + HTML/CSS A4 | 与前端预览共用模板 |
| Image | sharp | 缩略图、EXIF 清理、尺寸校验 |
| Auth | 手机号 OTP + 管理端密码/SSO | 现场人员优先手机号 |
| Observability | OpenTelemetry + 结构化日志 | 任务、同步、报告失败可追踪 |
| Deploy | Docker + 托管 PostgreSQL + 对象存储 | 阿里云/腾讯云均可 |

Web 原型使用 Vite + React，生产实现迁移到 Next.js 不影响领域模型和页面结构。现场端使用 uni-app，把页面和交互统一在 Vue 3 代码中；微信平台能力通过条件编译或 uni API 封装。

## 3. 模块边界

| 模块 | 职责 | 不负责 |
| --- | --- | --- |
| Identity | 用户、角色、权限、会话 | 客户联系人 |
| Customer | 客户、门店、联系人、合同 | 服务执行 |
| Planning | 服务计划、任务、排期、派工 | 现场表单 |
| Inspection | 勘测单、隐患点、证据、结论 | 封堵施工 |
| Sealing | 封堵单、部位、材料、验收 | 常规服务单 |
| Service | PCO 常规服务单 | 合同收款 |
| Recheck | 复检、返工、闭环 | 报告排版 |
| Reporting | 模板、快照、PDF、二维码 | 业务状态变更 |
| Files | 上传、签名、缩略图、签名证据 | 业务权限判断 |
| Finance | 合同金额、收入、外包成本、对账 | 总账 |
| Audit | 审计日志、导出记录 | 业务数据本身 |

## 4. 领域模型

详见 [docs/02-data-model.md](docs/02-data-model.md)。

核心关系：

```mermaid
erDiagram
  CUSTOMER ||--o{ SITE : has
  SITE ||--o{ INSPECTION : inspected
  INSPECTION ||--o{ FINDING : contains
  FINDING ||--o{ ATTACHMENT : evidence
  INSPECTION ||--o{ SEALING_ORDER : triggers
  SEALING_ORDER ||--o{ SEALING_ITEM : contains
  FINDING ||--o| SEALING_ITEM : resolved_by
  SEALING_ITEM ||--o{ MATERIAL_USAGE : uses
  SEALING_ORDER ||--o{ RECHECK : followed_by
  SITE ||--o{ SERVICE_ORDER : serviced
  INSPECTION ||--o{ REPORT_SNAPSHOT : rendered
  SEALING_ORDER ||--o{ REPORT_SNAPSHOT : rendered
```

### 4.1 关键约束

- `finding.site_id` 必须与 `inspection.site_id` 一致。
- `sealing_item.finding_id` 必须属于同一门店。
- `report_snapshot` 生成后不可更新，只能新建版本。
- `signature` 必须绑定 `report_snapshot_id` 或业务单据 ID，并记录签名人、时间、设备、IP、文件哈希。
- 附件必须绑定业务实体和附件类型，不允许游离文件。
- 所有业务表带 `organization_id`，为未来多组织隔离预留。

### 4.2 状态机

```mermaid
stateDiagram-v2
  [*] --> draft
  draft --> submitted
  submitted --> pending_rectification
  pending_rectification --> rectification_in_progress
  rectification_in_progress --> pending_recheck
  pending_recheck --> closed
  pending_recheck --> rework
  rework --> pending_recheck
  submitted --> rejected
  rejected --> draft
  draft --> void
  pending_rectification --> void
```

封堵单：

```mermaid
stateDiagram-v2
  [*] --> draft
  draft --> scheduled
  scheduled --> in_progress
  in_progress --> pending_acceptance
  pending_acceptance --> accepted
  pending_acceptance --> rework
  rework --> pending_acceptance
  accepted --> closed
  draft --> void
```

## 5. API 设计

详见 [docs/03-api-contract.md](docs/03-api-contract.md)。

约定：

- REST + JSON，路径以 `/api/v1` 开头。
- 所有写操作支持 `Idempotency-Key`。
- 分页使用 `cursor`，列表筛选使用显式 query 参数。
- 错误统一返回 `code`、`message`、`details`、`request_id`。
- 附件使用预签名上传，业务接口只接收 `attachment_id`。
- 报告生成是异步任务，返回 `job_id`，前端轮询或订阅。

## 6. 离线与同步

### 6.1 现场端

- 现场端主入口是 `uniapp/`，使用 uni-app + Vue 3 + TypeScript，一套页面代码编译微信小程序和 H5 验证版本。`miniprogram/` 只保留为旧原生实现参考。
- 页面结构为：登录、工作台、任务详情、现场勘测、封堵记录、报告归档、个人中心、修改密码。
- 企业 LOGO 从 `GET /api/templates` 读取 `logo_url` 和组织名称；接口不可用时回退到与后端站点一致的安全盾牌标识。人员头像不在前端存放独立照片，而是按姓名稳定生成与生产 Web 端相同规则的卡通头像。
- 工作台、任务、汇总、报告归档全部读取腾讯云生产 API；页面只负责状态展示和交互，不在前端重算业务指标或合并不同状态的数据集。
- 现场勘测使用 `/api/risk-surveys`、`/api/risk-surveys/upload`、`/api/risk-surveys/{id}/submit`；结构风险图片支持拍照和相册批量选择，累计最多 100 张，使用 5 列自动换行网格。
- 封堵记录使用 `/api/service-reports`、`/api/service-reports/upload`、`/api/service-reports/{id}/sign`、`/api/service-reports/{id}/submit`；封堵前后照片只出现在封堵记录中。
- 勘测人员与客户代表在同一台手机依次手写签字；封堵责任人与客户代表同理。两笔签名都完成后才允许提交。
- 手写签名使用 `canvas` + touch events。H5 验证环境输出 Data URL，微信小程序使用 `uni.canvasToTempFilePath` 输出临时文件，再上传到对应的业务上传接口。
- 草稿同时写入本机缓存和 `/api/drafts`。本机缓存保证弱网下不丢表单，服务端草稿用于后续跨设备恢复；已提交状态仍以服务端为唯一事实来源。
- 当前生产后端使用业务上传接口返回图片 URL；正式对象存储和附件 ID 方案仍作为后续演进方向，不在客户端散落两套上传逻辑。
- 网络恢复后按“业务单据 → 照片 → 签字 → 提交”顺序同步。上传失败的图片或签名必须保留在本机，不能把未上传路径写入已提交记录。
- 主流程固定为 11 个节点：勘测 → 勘测报告双签 → 勘测审批 → 派单给封堵 → 封堵接单 → 现场签到 → 施工前影像 → 施工后影像 → 封堵报告双签 → 封堵审批 → 生成报告。
- 勘测审批通过后将 `risk-surveys` 状态置为 `approved`，再创建状态为 `assigned` 的封堵 `service-reports`。封堵接单使用 `accepted`，现场签到调用 `/api/service-reports/{id}/checkin`，最终审批调用 `/api/workorders/{id}/review`，报告通过 PDF 接口生成。
- 任务详情只根据服务端关联的勘测单和封堵单状态计算当前节点；每一步操作完成后重新拉取服务端记录，不以本地乐观状态代替审批结果。

### 6.2 同步规则

- 服务端是已提交状态的唯一事实来源。
- 未提交草稿允许覆盖，但记录 `client_updated_at`。
- 已提交单据只允许通过明确的状态动作修改，不允许直接 PATCH 全量覆盖。
- 同步失败按指数退避重试，超过阈值进入“待人工处理”。

## 7. 报告生成

1. 业务单据进入可报告状态。
2. 服务端组装 `ReportSnapshot`：模板版本、字段快照、照片清单、签名清单。
3. 渲染 HTML/CSS A4 模板。
4. 使用 Playwright 生成 PDF。
5. 计算 PDF SHA-256，上传对象存储。
6. 生成二维码，指向 `/verify/reports/{token}`。
7. 写入 `report_snapshot` 与审计日志。

报告模板与预览使用同一套 HTML/CSS，避免“预览对了、PDF 不对”。

### 7.1 手写签字

- 勘测单：勘测人员在手机上手写确认，然后把同一台手机交给客户代表签第二笔。
- 封堵单：封堵责任人在手机上手写确认，然后把同一台手机交给客户代表签第二笔。
- Web 使用 canvas + pointer events；小程序使用 Canvas 2D + touch events，保存 PNG、签字时间、签字人和设备信息。
- 两个签字都完成后才允许锁定报告；签字图片进入报告快照，并计算文件哈希。

### 7.2 报告编号

- 勘测：`KC-{YYYY}-BG-{seq}`。
- 封堵：`STFD-{YYYY}-{seq}`。
- PCO 服务：`STFW-{YYYY}-{seq}`。

序号按组织+年度+类型生成，数据库唯一约束兜底。

## 8. 权限

| 角色 | 客户 | 勘测 | 封堵 | 服务单 | 报告 | 财务 |
| --- | --- | --- | --- | --- | --- | --- |
| 管理员 | 全部 | 全部 | 全部 | 全部 | 全部 | 全部 |
| 运营负责人 | 全部 | 全部 | 全部 | 全部 | 全部 | 只读 |
| 项目主管 | 负责客户 | 负责门店 | 负责门店 | 负责门店 | 生成/查看 | 无 |
| 工程师 | 只读负责门店 | 自己任务 | 自己任务 | 自己任务 | 查看自己 | 无 |
| 质量监理 | 负责门店 | 审核 | 验收 | 抽查 | 审核/导出 | 无 |
| 财务 | 合同金额 | 只读 | 只读 | 只读 | 只读 | 全部 |
| 客户只读 | 自己门店 | 已发布 | 已发布 | 已发布 | 只读 | 无 |

权限在服务端校验，前端隐藏按钮只作为体验优化。

### 8.1 登录与会话

- 管理端使用手机号 + 密码登录；密码只保存 Argon2id/bcrypt 哈希，不保存明文。
- 生产环境增加登录限流、失败次数锁定、可选 TOTP，并记录登录审计。
- 小程序使用 `wx.login` 换取 code，由服务端绑定微信 openid 与内部员工身份；手机号可作为辅助校验，不能把密码写进小程序包。
- 客户只读访问使用短时效签名链接。
- 会话使用 HttpOnly、Secure、SameSite Cookie；设置空闲超时和主动退出。
- 原型登录只用于界面验证，不能作为生产认证实现。

## 9. 安全

- 所有上传校验 MIME、扩展名、尺寸和文件头；拒绝可执行文件。
- 图片处理时移除 EXIF 中的定位等非必要信息。
- 附件通过短时效签名 URL 访问，不暴露对象存储路径。
- 手机号、合同、签名属于敏感数据，列表默认脱敏。
- 审计日志不可由业务用户修改。
- 报告验证页只展示必要字段，不展示完整客户联系方式和内部备注。
- 备份加密，定期恢复演练。
- 满足最小收集、明确用途、保留期限和删除流程。

## 10. 部署

### 10.1 初期

- 测试期可用腾讯云轻量应用服务器承载 1 个 Web/API 进程，先在低并发下验证登录、上传和同步。
- 报告、图片处理在轻量服务器上必须限并发和超时；处理任务变重后再拆出 Worker 容器。
- 数据库优先使用托管 PostgreSQL；测试期若临时同机部署，必须限制连接数并做每日备份。
- 文件使用腾讯云 COS，不在应用服务器保存长期附件。
- 反向代理 + TLS；小程序请求域名必须完成 HTTPS 配置和微信后台白名单。

### 10.2 备份

- PostgreSQL 每日全量 + WAL 归档。
- 对象存储版本化。
- 报告快照和签名文件单独保留。
- 每季度做一次恢复演练。

## 11. 测试

- 单元测试：状态机、编号生成、权限、报告快照。
- 集成测试：勘测→封堵→验收→复检主链路。
- 合同测试：API 响应结构与前端类型。
- E2E：Playwright 覆盖桌面和手机主流程。
- 小程序：TypeScript 严格检查、WXML/WXSS 编译、页面/组件结构契约、真机拍照与 Canvas 签字回归。
- 视觉检查：A4 报告、移动端表单、文本溢出、签字区域。
- 离线测试：断网、重复提交、照片重传、版本冲突。
- 安全测试：越权访问、签名 URL 过期、上传恶意文件。

## 12. 迁移

1. 从飞书导出四张主表 CSV/Excel：客户、服务单、工程师、方案库。
2. 以客户编号/服务单编号建立外部 ID 映射。
3. 清洗多选长文本：拆为模板、标签、自由文本。
4. 先迁移客户和门店，再迁移服务单，最后迁移封堵报告。
5. 对缺失合同、缺失签字、缺失照片生成“数据待补”任务。
6. 迁移后做抽样核对：字段数、记录数、金额合计、报告抽样。

迁移脚本必须可重复执行，使用外部 ID 幂等 upsert。

## 13. 分期

| 阶段 | 交付 |
| --- | --- |
| Phase 1 | 主数据、勘测、封堵、复检、报告、工作台、微信小程序现场端 |
| Phase 2 | 方案库、物料库存、财务对账、客户健康度 |
| Phase 3 | 客户门户、扫码验真、多组织、智能辅助 |

