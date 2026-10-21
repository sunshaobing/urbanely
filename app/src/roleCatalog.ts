export interface WebRoleDefinition {
  value: string;
  label: string;
  description: string;
  scope: string;
  permissions: string[];
  tone: "green" | "blue" | "amber" | "red" | "teal";
}

export const roleCatalog: WebRoleDefinition[] = [
  {
    value: "super_admin",
    label: "超级管理员",
    description: "系统 owner，负责全局配置、安全与数据治理",
    scope: "全部组织与系统配置",
    permissions: ["账号权限", "系统设置", "报告模板", "系统字典", "全部业务数据"],
    tone: "red",
  },
  {
    value: "admin",
    label: "运营管理员",
    description: "负责客户、派单、现场交付、报告审批与归档",
    scope: "全部客户与作业",
    permissions: ["客户门店", "勘测与封堵派单", "报告审批", "系统设置", "系统字典"],
    tone: "green",
  },
  {
    value: "supervisor",
    label: "现场监理",
    description: "负责现场质量审核、封堵验收和证据抽查",
    scope: "被授权客户与门店",
    permissions: ["查看现场记录", "审核勘测", "验收封堵", "查看报告"],
    tone: "teal",
  },
  {
    value: "service_engineer",
    label: "勘测工程师",
    description: "执行现场勘测、签到、拍照、双签并提交报告",
    scope: "仅本人被派发任务",
    permissions: ["勘测任务", "现场签到", "风险照片", "双方签字", "提交勘测报告"],
    tone: "blue",
  },
  {
    value: "sealing_engineer",
    label: "封堵工程师",
    description: "执行封堵施工、前后照片、双签和服务单提交",
    scope: "仅本人被派发任务",
    permissions: ["封堵任务", "现场签到", "封堵前后照片", "双方签字", "提交服务单"],
    tone: "amber",
  },
];

export const roleLabels = Object.fromEntries(
  roleCatalog.map((role) => [role.value, role.label]),
);

export function roleDefinition(value: string) {
  return roleCatalog.find((role) => role.value === value);
}
