export const permissionActions = ["查看", "新建", "编辑", "审核", "导出"] as const;
export type PermissionAction = (typeof permissionActions)[number];

export const permissionModules = [
  { key: "customers", label: "客户与门店", hint: "客户、门店、联系人、合同" },
  { key: "inspections", label: "勘测单", hint: "勘测、隐患点、结构风险图片" },
  { key: "sealing", label: "封堵单", hint: "施工、材料、验收" },
  { key: "services", label: "服务单", hint: "PCO 常规服务与证据" },
  { key: "rechecks", label: "复检与闭环", hint: "复检、返工、闭环" },
  { key: "reports", label: "报告中心", hint: "报告快照、PDF、二维码" },
  { key: "finance", label: "财务对账", hint: "合同金额、收入、外包付款" },
  { key: "permissions", label: "人员与权限", hint: "用户、角色、范围、审计" },
  { key: "audit", label: "审计日志", hint: "关键操作与导出记录" },
] as const;

export type PermissionModuleKey = (typeof permissionModules)[number]["key"];
export type PermissionMap = Record<string, Record<PermissionAction, boolean>>;

const makePermissions = (
  overrides: Partial<Record<PermissionModuleKey, PermissionAction[]>>,
  base: PermissionAction[] = ["查看"],
): PermissionMap =>
  Object.fromEntries(
    permissionModules.map((module) => {
      const actions = overrides[module.key] ?? base;
      const actionMap = Object.fromEntries(
        permissionActions.map((action) => [action, actions.includes(action)]),
      ) as Record<PermissionAction, boolean>;
      return [
        module.key,
        actionMap,
      ];
    }),
  ) as PermissionMap;

export interface RoleDefinition {
  id: string;
  name: string;
  description: string;
  scope: string;
  members: number;
  tone: "teal" | "amber" | "blue" | "red" | "neutral";
  permissions: PermissionMap;
  sensitive: Record<string, boolean>;
}

export const sensitivePermissionLabels: Record<string, { label: string; hint: string }> = {
  contact_phone: { label: "查看完整联系电话", hint: "列表默认脱敏，仅授权角色可查看" },
  contract: { label: "查看合同附件", hint: "合同、金额和付款信息" },
  signature: { label: "查看原始签名", hint: "签名图片、设备与时间证据" },
  export_report: { label: "导出正式报告", hint: "生成 PDF 并对外发送" },
  edit_permission: { label: "修改角色权限", hint: "变更权限矩阵和人员范围" },
  void_record: { label: "作废业务单据", hint: "作废后保留审计记录" },
};

const sensitive = (keys: string[]): Record<string, boolean> =>
  Object.fromEntries(Object.keys(sensitivePermissionLabels).map((key) => [key, keys.includes(key)]));

export const roles: RoleDefinition[] = [
  {
    id: "admin",
    name: "管理员",
    description: "组织级配置与全部业务数据",
    scope: "全部组织",
    members: 2,
    tone: "red",
    permissions: makePermissions({}, [...permissionActions]),
    sensitive: sensitive(Object.keys(sensitivePermissionLabels)),
  },
  {
    id: "ops",
    name: "运营负责人",
    description: "查看全局经营与交付，处理高风险和逾期",
    scope: "全部组织",
    members: 1,
    tone: "teal",
    permissions: makePermissions({
      customers: ["查看", "新建", "编辑", "导出"],
      inspections: ["查看", "新建", "编辑", "审核", "导出"],
      sealing: ["查看", "新建", "编辑", "审核", "导出"],
      services: ["查看", "新建", "编辑", "审核", "导出"],
      rechecks: ["查看", "新建", "编辑", "审核"],
      reports: ["查看", "导出"],
      finance: ["查看"],
      permissions: ["查看"],
      audit: ["查看"],
    }),
    sensitive: sensitive(["contact_phone", "contract", "signature", "export_report"]),
  },
  {
    id: "manager",
    name: "项目主管",
    description: "负责客户和门店的现场交付、排班与验收",
    scope: "负责客户",
    members: 3,
    tone: "amber",
    permissions: makePermissions({
      customers: ["查看", "编辑"],
      inspections: ["查看", "新建", "编辑", "审核"],
      sealing: ["查看", "新建", "编辑", "审核"],
      services: ["查看", "新建", "编辑"],
      rechecks: ["查看", "新建", "编辑", "审核"],
      reports: ["查看", "导出"],
    }),
    sensitive: sensitive(["contact_phone", "signature", "export_report"]),
  },
  {
    id: "engineer",
    name: "工程师",
    description: "执行勘测、服务、封堵和现场签字",
    scope: "仅本人任务",
    members: 6,
    tone: "blue",
    permissions: makePermissions({
      customers: ["查看"],
      inspections: ["查看", "新建", "编辑"],
      sealing: ["查看", "编辑"],
      services: ["查看", "新建", "编辑"],
      rechecks: ["查看"],
      reports: ["查看"],
    }),
    sensitive: sensitive(["contact_phone", "signature"]),
  },
  {
    id: "qa",
    name: "质量监理",
    description: "审核报告、验收封堵、抽查证据质量",
    scope: "负责门店",
    members: 1,
    tone: "teal",
    permissions: makePermissions({
      customers: ["查看"],
      inspections: ["查看", "审核"],
      sealing: ["查看", "审核"],
      services: ["查看"],
      rechecks: ["查看", "审核"],
      reports: ["查看", "导出"],
      audit: ["查看"],
    }),
    sensitive: sensitive(["signature", "export_report"]),
  },
  {
    id: "finance",
    name: "财务",
    description: "合同、收入、外包付款和月结对账",
    scope: "全部组织",
    members: 1,
    tone: "neutral",
    permissions: makePermissions({
      customers: ["查看"],
      inspections: ["查看"],
      sealing: ["查看"],
      services: ["查看"],
      reports: ["查看", "导出"],
      finance: ["查看", "新建", "编辑", "审核", "导出"],
      audit: ["查看", "导出"],
    }),
    sensitive: sensitive(["contract", "export_report"]),
  },
  {
    id: "customer",
    name: "客户只读",
    description: "查看已发布的报告和签字结果",
    scope: "自己门店",
    members: 0,
    tone: "neutral",
    permissions: makePermissions({
      customers: ["查看"],
      inspections: ["查看"],
      sealing: ["查看"],
      reports: ["查看"],
    }),
    sensitive: sensitive([]),
  },
];

export interface StaffMember {
  id: string;
  name: string;
  code: string;
  roleId: string;
  phoneMasked: string;
  type: "全职" | "外包";
  status: "在职" | "培训中" | "休假" | "离职";
  scope: string;
  sites: string[];
  lastActive: string;
}

export const staff: StaffMember[] = [
  {
    id: "usr-1",
    name: "孙少兵",
    code: "EMP-001",
    roleId: "ops",
    phoneMasked: "139****0901",
    type: "全职",
    status: "在职",
    scope: "全部组织",
    sites: ["全部 8 家门店"],
    lastActive: "2 分钟前",
  },
  {
    id: "usr-2",
    name: "陈林",
    code: "EMP-006",
    roleId: "manager",
    phoneMasked: "136****4412",
    type: "全职",
    status: "在职",
    scope: "负责客户",
    sites: ["宝山正大乐城", "龙岗万科广场"],
    lastActive: "18 分钟前",
  },
  {
    id: "usr-3",
    name: "王三毛",
    code: "EMP-012",
    roleId: "engineer",
    phoneMasked: "138****2618",
    type: "全职",
    status: "在职",
    scope: "仅本人任务",
    sites: ["趣坊·深圳水围店", "宝安大仟里"],
    lastActive: "35 分钟前",
  },
  {
    id: "usr-4",
    name: "李海",
    code: "EMP-018",
    roleId: "engineer",
    phoneMasked: "135****8842",
    type: "全职",
    status: "在职",
    scope: "仅本人任务",
    sites: ["龙华壹方天地", "衡山餐饮·浦东店"],
    lastActive: "1 小时前",
  },
  {
    id: "usr-5",
    name: "周敏",
    code: "EMP-021",
    roleId: "qa",
    phoneMasked: "137****9204",
    type: "全职",
    status: "在职",
    scope: "负责门店",
    sites: ["南山万象天地", "福田 COCO Park"],
    lastActive: "2 小时前",
  },
  {
    id: "usr-6",
    name: "赵磊",
    code: "EMP-025",
    roleId: "engineer",
    phoneMasked: "133****5186",
    type: "全职",
    status: "培训中",
    scope: "仅本人任务",
    sites: ["龙岗万科广场"],
    lastActive: "昨天",
  },
  {
    id: "usr-7",
    name: "何佳",
    code: "EMP-030",
    roleId: "finance",
    phoneMasked: "189****7721",
    type: "全职",
    status: "在职",
    scope: "全部组织",
    sites: ["全部 8 家门店"],
    lastActive: "今天 09:20",
  },
  {
    id: "usr-8",
    name: "张敏",
    code: "OUT-008",
    roleId: "engineer",
    phoneMasked: "136****4710",
    type: "外包",
    status: "在职",
    scope: "仅本人任务",
    sites: ["南山万象天地"],
    lastActive: "3 小时前",
  },
  {
    id: "usr-9",
    name: "郑凯",
    code: "EMP-033",
    roleId: "engineer",
    phoneMasked: "139****3368",
    type: "全职",
    status: "休假",
    scope: "仅本人任务",
    sites: ["福田 COCO Park"],
    lastActive: "3 天前",
  },
  {
    id: "usr-10",
    name: "罗晨",
    code: "EMP-037",
    roleId: "admin",
    phoneMasked: "137****6120",
    type: "全职",
    status: "在职",
    scope: "全部组织",
    sites: ["全部 8 家门店"],
    lastActive: "今天 08:40",
  },
];

export interface AuditEntry {
  id: string;
  time: string;
  actor: string;
  action: string;
  target: string;
  result: "成功" | "已阻止";
  detail: string;
}

export const auditEntries: AuditEntry[] = [
  {
    id: "audit-1",
    time: "今天 18:42",
    actor: "罗晨",
    action: "修改角色权限",
    target: "质量监理 / 报告导出",
    result: "成功",
    detail: "新增正式报告导出权限，已记录变更前后值。",
  },
  {
    id: "audit-2",
    time: "今天 17:35",
    actor: "王三毛",
    action: "导出勘测报告",
    target: "KC-2026-BG-128",
    result: "成功",
    detail: "导出带双方签字的报告快照 v2。",
  },
  {
    id: "audit-3",
    time: "今天 16:18",
    actor: "陈林",
    action: "提交封堵验收",
    target: "STFD-2026-116",
    result: "成功",
    detail: "封堵责任人与客户代表已完成手写签字。",
  },
  {
    id: "audit-4",
    time: "今天 14:52",
    actor: "张敏",
    action: "查看客户电话",
    target: "南山万象天地",
    result: "已阻止",
    detail: "当前角色没有查看完整联系电话权限。",
  },
  {
    id: "audit-5",
    time: "今天 11:06",
    actor: "孙少兵",
    action: "邀请人员",
    target: "赵磊 / 工程师",
    result: "成功",
    detail: "邀请链接已发送，范围设置为龙岗万科广场。",
  },
];

