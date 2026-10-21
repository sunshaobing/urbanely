# API Contract

## 1. 约定

- Base path: `/api/v1`
- Auth: `Authorization: Bearer <token>`
- Idempotency: `Idempotency-Key` on all POST/PATCH actions
- Pagination: `?cursor=...&limit=50`
- Date format: ISO 8601 with timezone
- Error shape:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "recheck_date must be after survey_date",
  "details": { "field": "recheck_date" },
  "request_id": "req_01J..."
}
```

现有生产小程序后端使用 `https://sunrgw.cn/api`，已接入的兼容端点如下：

- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/dashboard/summary`
- `GET /api/workorders`
- `GET /api/workorders/{order_id}`
- `GET|POST /api/risk-surveys`
- `PUT /api/risk-surveys/{survey_id}`
- `POST /api/risk-surveys/upload`
- `POST /api/risk-surveys/{survey_id}/submit`
- `GET|POST /api/service-reports`
- `PUT /api/service-reports/{report_id}`
- `POST /api/service-reports/upload`
- `POST /api/service-reports/{report_id}/sign`
- `POST /api/service-reports/{report_id}/submit`
- `GET|POST /api/drafts`
- `GET /api/quick-phrases`
- `GET /api/templates`
- `POST /api/workorders/{order_id}/review`
- `GET /api/workorders/{order_id}/checkins`
- `POST /api/workorders/{order_id}/checkin`
- `GET|POST /api/service-reports/{report_id}/checkin`
- `POST /api/service-reports/{report_id}/checkout`
- `POST /api/auth/change-password`

`/api/v1` 保留为后续正式 API 版本的约定；迁移时应通过统一 API 客户端切换，不在页面内散落地址。

当前生产登录接口同时接受用户名或手机号作为 `username`，以兼容微信小程序的手机号登录入口。

## 2. Auth

### POST `/auth/login`

```json
{
  "phone": "138****0000",
  "password": "••••••••",
  "remember": true,
  "device_id": "dev_..."
}
```

Response:

```json
{
  "session": { "user_id": "usr_...", "name": "Eric", "role": "admin" },
  "expires_at": "2026-10-25T10:00:00+08:00"
}
```

Server must hash and verify the password, apply rate limiting, and never return or log the password.

### POST `/auth/wechat/login`

The Mini Program sends the short-lived code from `wx.login`; the server exchanges it with WeChat and resolves the internal employee identity.

```json
{
  "code": "wx-login-code",
  "device_id": "dev_..."
}
```

Response:

```json
{
  "access_token": "…",
  "refresh_token": "…",
  "user": { "id": "usr_...", "name": "王工", "roles": ["technician"] },
  "binding_required": false
}
```

If the WeChat identity is not yet bound, `binding_required` is `true` and a separate verified phone/OTP step must bind it to an active employee. Passwords must never be embedded in the Mini Program.

### POST `/auth/otp/request`

```json
{ "phone": "138****0000", "purpose": "field_login" }
```

### POST `/auth/otp/verify`

```json
{ "phone": "138****0000", "code": "123456", "device_id": "dev_..." }
```

Response:

```json
{
  "access_token": "…",
  "refresh_token": "…",
  "user": { "id": "usr_...", "name": "王工", "roles": ["technician"] }
}
```

## 3. Customers And Sites

### GET `/customers`

Query: `q`, `status`, `type`, `cursor`, `limit`.

### POST `/customers`

```json
{
  "code": "31047",
  "name": "趣坊",
  "type": "supermarket",
  "region": "深圳市福田区",
  "contact_name": "苏经理",
  "contact_phone": "138****0000"
}
```

### GET `/sites/{site_id}`

Returns site profile, risk level, next service, open findings count.

### POST `/sites`

```json
{
  "customer_id": "cus_...",
  "code": "103",
  "name": "趣坊·水围店",
  "address": "深圳市福田区水围村银庄大厦1F",
  "contact_name": "苏经理",
  "contact_phone": "138****0000"
}
```

## 4. Inspections

### POST `/inspections`

```json
{
  "site_id": "site_...",
  "survey_date": "2026-10-11",
  "time_range": "22:20-23:00",
  "surveyor_id": "usr_...",
  "contact_name": "苏经理",
  "scope": ["checkout", "storage", "sales_area", "shelf_top", "shelf_bottom", "corridor"],
  "structure_conditions": ["no_ceiling", "exposed_beam", "wall_opening", "pipe_penetration", "wall_crack", "door_gap"],
  "pest_species": ["mouse"],
  "evidence_types": ["rodent_trace"],
  "risk_level": "high",
  "recheck_date": "2026-10-15"
}
```

### POST `/inspections/{id}/findings`

```json
{
  "area": "storage",
  "location": "仓储区水电管道穿墙孔",
  "hazard_type": "pipe_gap",
  "severity": "high",
  "evidence_types": ["rodent_droppings", "rubbing_marks"],
  "recommendation": "采用防火泥、密封胶和防鼠网封堵",
  "photo_ids": ["att_..."],
  "client_id": "finding-01"
}
```

### POST `/inspections/{id}/submit`

```json
{ "comment": "现场勘测完成" }
```

### POST `/inspections/{id}/generate-sealing-task`

```json
{
  "finding_ids": ["finding-01", "finding-02"],
  "assignee_id": "usr_...",
  "scheduled_at": "2026-10-14T09:00:00+08:00"
}
```

## 5. Sealing Orders

### POST `/sealing-orders`

```json
{
  "inspection_id": "insp_...",
  "site_id": "site_...",
  "service_type": "first",
  "service_date": "2026-09-06",
  "weather": "晴",
  "leader_id": "usr_...",
  "supervisor_id": "usr_...",
  "rodent_species": "house_mouse",
  "density": "medium",
  "activity_areas": ["storage", "ceiling"],
  "purpose": "阻断鼠类入侵通道",
  "hole_types": ["wall_hole", "pipe_gap", "structural_crack"]
}
```

### POST `/sealing-orders/{id}/items`

```json
{
  "finding_id": "finding-01",
  "area": "storage",
  "location": "水电管道穿墙孔",
  "hole_type": "pipe_gap",
  "before_photo_id": "att_...",
  "after_photo_id": "att_...",
  "result": "sealed",
  "materials": [
    { "material_id": "mat_fire_clay", "quantity": 2.5, "unit": "kg" },
    { "material_id": "mat_mesh", "quantity": 1, "unit": "piece" }
  ]
}
```

### POST `/sealing-orders/{id}/submit-for-acceptance`

```json
{ "comment": "施工完成，申请客户验收" }
```

### POST `/sealing-orders/{id}/accept`

```json
{
  "result": "accepted",
  "signer_name": "姚经理",
  "signature_attachment_id": "att_...",
  "comment": "现场验收通过"
}
```

### 5.1 现场签到与签字持久化

勘测与封堵人员到达现场后都必须签到。定位失败时不得用服务地址代替真实定位。

#### POST `/workorders/{order_id}/checkin`

```json
{
  "role": "surveyor",
  "latitude": 31.230416,
  "longitude": 121.473701,
  "accuracy": 12.5,
  "address": "上海市示例路 8 号",
  "photo_url": ""
}
```

- `role`：`surveyor`（勘测）或 `sealing`（封堵）。
- `latitude` / `longitude`：GCJ-02 坐标，服务端校验范围并拒绝 `0,0`。
- `accuracy`：定位精度，单位米；客户端要求不超过 80 米才允许提交。
- `checkin_time` 由服务端生成，客户端不得自行指定。
- 同一作业单的同一角色重复签到会覆盖该角色最近一次签到记录。
- `GET /workorders/{order_id}` 返回 `checkins` 数组，包含角色、时间、坐标、精度和地址。

封堵签到仍同时写入 `service-reports/{report_id}/checkin`，以兼容现有签到统计；该接口新增可选的 `latitude`、`longitude`、`accuracy` 字段。

#### 签字角色与更新语义

- 勘测签字角色固定为 `engineer` 和 `customer`。
- 封堵人员签字统一写为 `service`（兼容入参 `responsible`，服务端归一为 `service`），客户签字为 `customer`。
- `PUT /risk-surveys/{id}` 和 `PUT /service-reports/{id}` 省略 `signatures` 时保留现有签字；只有显式传入数组时才替换。由此，派单、接单、审批或其它局部更新不会清空手写签字。

### 5.2 勘测报告数据完整性

- `RiskSurvey.employee_id` 指向员工档案表，不是登录用户 ID。移动端不传该字段；服务端会拒绝写入不存在的员工 ID 并将其置空。
- 报告中的“勘测人员”优先取员工档案姓名；没有员工档案时回退到 `engineer` 角色的手写签字姓名。
- `POST /risk-surveys/{id}/submit` 返回完整记录（包含 `items`、`photos`、`signatures`），便于客户端立即生成报告。
- `GET /risk-surveys/{id}`、`GET /risk-surveys/{id}/pdf`、作业单详情和封堵报告详情/PDF 都执行客户归属校验；封堵工程师可通过 `service_person` 访问自己的服务单。

### 5.3 封堵派单与服务单

- Web 管理员从 `status=approved` 的勘测记录派单。存在由勘测审批生成的待派单报告时，使用 `PUT /service-reports/{id}` 写入 `service_person` 并将状态改为 `assigned`；不存在时使用 `POST /service-reports` 创建。
- `service_person` 保存封堵师傅姓名；封堵工程师的 `GET /workorders` 范围包含其已分配服务单对应的客户，确保手机端能收到派单。
- 封堵师傅的签到、接单、双签、提交和 PDF 下载均通过 `service_person` 校验；服务单列表按 `service_person`/客户归属过滤。
- 封堵服务单的 `risk_photos` 表示封堵前照片，`photos` 表示封堵后照片；Web 预览和 PDF 都使用实际图片 URL。

### 5.4 PDF 报告表头

- 现场勘测 PDF 的表头固定为 `现场勘测报告`，标题在页面水平居中，报告编号保持在右上区域。
- 封堵完成 PDF 的表头固定为 `结构漏洞(鼠洞)封堵报告`，标题在页面水平居中，报告编号保持在右上区域；不再使用 `现场服务报告` 或 `现场服务管理报告`。
- `GET /service-reports/{id}/pdf` 每次请求都按当前模板重新生成 PDF，并返回 `Cache-Control: no-store`，防止历史文件或浏览器缓存继续显示旧标题。
- 表头调整只影响 PDF 模板和响应缓存策略，不改变报告数据、签字、照片、下载地址或其它前后端交互。

### 5.5 PDF 照片版式

- 每行固定 5 张照片，使用 175mm 内容宽度和 35mm 固定列宽；超过 5 张自动进入下一行。
- 最后一行按实际照片数量生成，只靠左排列，不使用空白单元格补满或拉伸。
- 图片统一放入 33mm × 20mm 的固定框，保持原始横竖比例并在框内居中；行间距固定为 1.5mm。
- 每张图片下方居中显示连续的 `现场照片1`、`现场照片2` 等题注，题注编号在分页后继续递增。
- 当前页空间不足时只将下一行移到新页；续页顶部显示原照片区块标题并带 `（续）` 标识。
- 照片区块按实际内容高度参与 PDF 分页，结束后直接衔接后续客户点评和签字区域，不额外占位。
- 此版式仅作用于 PDF 照片网格；页眉页脚、致谢、客户点评、签字、导出接口和业务数据逻辑保持不变。

## 6. Rechecks

### POST `/rechecks`

```json
{
  "inspection_id": "insp_...",
  "sealing_order_id": "seal_...",
  "scheduled_at": "2026-10-15T10:00:00+08:00",
  "inspector_id": "usr_..."
}
```

### POST `/rechecks/{id}/items`

```json
{
  "finding_id": "finding-01",
  "result": "passed",
  "photo_id": "att_...",
  "notes": "封堵完整，无松动"
}
```

### POST `/rechecks/{id}/complete`

```json
{ "result": "failed", "comment": "两处封堵被咬开，需返工" }
```

## 7. Reports

### POST `/reports`

```json
{
  "template_code": "SURVEY_REPORT",
  "business_type": "inspection",
  "business_id": "insp_..."
}
```

Response:

```json
{
  "job_id": "job_...",
  "status": "queued"
}
```

### GET `/reports/{snapshot_id}`

```json
{
  "id": "rpt_...",
  "report_no": "KC-2026-BG-128",
  "version": 1,
  "pdf_url": "https://.../signed",
  "pdf_sha256": "…",
  "qr_url": "https://.../verify/reports/...",
  "generated_at": "2026-10-18T17:40:00+08:00"
}
```

### GET `/verify/reports/{token}`

Public, read-only verification. Returns report number, customer display name, date, signature status, and hash. No internal notes or phone numbers.

## 8. Files

### POST `/attachments/presign`

```json
{
  "filename": "before-01.jpg",
  "mime_type": "image/jpeg",
  "size": 1834200,
  "purpose": "finding_before_photo"
}
```

### POST `/attachments/{id}/complete`

```json
{ "sha256": "…" }
```

Server validates size, MIME, image dimensions, and hash before marking the attachment usable.

## 9. Offline Sync

### POST `/sync/batch`

```json
{
  "device_id": "dev_...",
  "operations": [
    {
      "op_id": "local-8f7c...",
      "entity": "finding",
      "action": "create",
      "client_id": "finding-01",
      "payload": { "area": "storage", "location": "…" },
      "client_updated_at": "2026-10-18T18:02:00+08:00"
    }
  ]
}
```

Response:

```json
{
  "results": [
    { "op_id": "local-8f7c...", "status": "applied", "server_id": "finding_..." }
  ]
}
```

Idempotency is enforced by `op_id` and `client_id`.

Mini Program clients upload persisted photo and signature files through the attachment flow first, then submit business operations with attachment IDs. A batch is acknowledged only after every referenced attachment ID is committed.

## 10. Dashboard

### GET `/dashboard/summary`

```json
{
  "pending_rectification": 8,
  "today_tasks": 12,
  "overdue_rechecks": 3,
  "sealing_closure_rate": 0.924,
  "high_risk_open": 6
}
```

### GET `/dashboard/risk-queue`

Returns sites sorted by:

1. critical risk
2. overdue recheck
3. high risk open findings
4. missing evidence

## 11. Error Codes

| Code | HTTP | Meaning |
| --- | --- | --- |
| `VALIDATION_ERROR` | 422 | Field-level validation failed |
| `UNAUTHORIZED` | 401 | Missing/invalid token |
| `FORBIDDEN` | 403 | Role/scope denied |
| `NOT_FOUND` | 404 | Entity not found in scope |
| `CONFLICT` | 409 | Version conflict or duplicate |
| `IDEMPOTENT_REPLAY` | 200 | Same idempotency key already applied |
| `FILE_REJECTED` | 422 | Upload failed validation |
| `REPORT_NOT_READY` | 409 | Business data incomplete |

