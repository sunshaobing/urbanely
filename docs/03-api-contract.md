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

## 2. Auth

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

