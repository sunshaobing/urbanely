export const roleLabels: Record<string, string> = {
  super_admin: "超级管理员",
  admin: "管理员",
  supervisor: "质量监理",
  sealing_engineer: "封堵工程师",
  service_engineer: "勘测工程师",
  survey_engineer: "勘测工程师",
  engineer: "工程师",
  finance: "财务",
};

export const statusPresentation: Record<
  string,
  { label: string; tone: "pending" | "active" | "done" | "danger" | "neutral" }
> = {
  draft: { label: "待处理", tone: "pending" },
  rejected: { label: "已退回", tone: "danger" },
  pending: { label: "进行中", tone: "active" },
  unassigned: { label: "待派单", tone: "active" },
  assigned: { label: "待接单", tone: "active" },
  accepted: { label: "已接单", tone: "active" },
  checked_in: { label: "已签到", tone: "active" },
  in_progress: { label: "施工中", tone: "active" },
  submitted: { label: "待审核", tone: "active" },
  reviewed: { label: "已复核", tone: "done" },
  approved: { label: "已完成", tone: "done" },
  completed: { label: "已完成", tone: "done" },
  signed: { label: "已签字", tone: "done" },
  archived: { label: "已归档", tone: "neutral" },
};

export const riskLabels: Record<string, string> = {
  critical: "极高风险",
  high: "高风险",
  medium: "中风险",
  low: "低风险",
  极高: "极高风险",
  高: "高风险",
  中: "中风险",
  低: "低风险",
};

export const statusOptions = [
  { label: "待处理", value: "draft" },
  { label: "进行中", value: "pending" },
  { label: "已完成", value: "approved" },
] as const;

export const surveyScopeOptions = [
  "收银区",
  "营业区",
  "仓储区",
  "后场通道",
  "货架顶部",
  "货架底部",
  "天花板",
  "设备间",
] as const;

export const structureOptions = [
  "无吊顶",
  "管线穿墙",
  "墙体裂缝",
  "门底缝隙",
  "地漏未封",
  "排风口",
  "孔洞未封",
  "其他",
] as const;

export const pestEvidenceOptions = [
  "鼠粪",
  "咬痕",
  "鼠道",
  "油迹",
  "活鼠",
  "巢材",
  "足迹",
  "其他",
] as const;

export function roleLabel(role: string) {
  return roleLabels[role] ?? role;
}

export function statusLabel(status: string) {
  return statusPresentation[status]?.label ?? status;
}

export function statusTone(status: string) {
  return statusPresentation[status]?.tone ?? "pending";
}

export function riskLabel(risk?: string) {
  if (!risk) return "风险待评估";
  return riskLabels[risk] ?? risk;
}

export function displayDate(value?: string) {
  if (!value) return "—";
  return value.length > 10 ? value.slice(0, 16) : value;
}

export function displayDay(value?: string) {
  if (!value) return "—";
  return value.slice(0, 10);
}

export function today() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

export function nowTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

export function todayLabel() {
  const now = new Date();
  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
  return `${now.getMonth() + 1}月${now.getDate()}日 · 周${weekdays[now.getDay()]}`;
}

export function firstName(name?: string) {
  if (!name) return "现场";
  return name.length > 6 ? name.slice(0, 6) : name;
}
