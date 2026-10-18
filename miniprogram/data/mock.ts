import type { Site, Task } from "../utils/types";

export const technician = {
  name: "王三毛",
  role: "工程师",
  code: "EMP-012",
  phoneMasked: "138****2618",
  avatar: "/assets/avatar-technician.png",
};

export const sites: Site[] = [
  {
    id: "site-1",
    name: "趣坊·深圳水围店",
    customer: "趣坊",
    code: "31047",
    address: "深圳市福田区水围村银庄大厦 1F 103",
    contact: "苏经理",
    phoneMasked: "138****2618",
    risk: "high",
  },
  {
    id: "site-2",
    name: "宝山正大乐城",
    customer: "宝山正大乐城",
    code: "11137",
    address: "上海市宝山区陆翔路 111 弄 1 层",
    contact: "姚经理",
    phoneMasked: "166****1527",
    risk: "medium",
  },
  {
    id: "site-3",
    name: "好特卖·龙华壹方天地",
    customer: "好特卖",
    code: "31052",
    address: "深圳市龙华区壹方天地 B 区 B1",
    contact: "陈经理",
    phoneMasked: "135****8842",
    risk: "critical",
  },
];

export const tasks: Task[] = [
  {
    id: "task-1",
    documentNo: "KC-2026-BG-128",
    type: "survey",
    title: "现场勘测",
    siteId: "site-1",
    time: "09:30",
    status: "待出发",
    risk: "high",
    assignee: "王三毛",
  },
  {
    id: "task-2",
    documentNo: "STFD-2026-116",
    type: "sealing",
    title: "结构封堵验收",
    siteId: "site-2",
    time: "11:00",
    status: "进行中",
    risk: "medium",
    assignee: "陈林",
  },
  {
    id: "task-3",
    documentNo: "FC-2026-073",
    type: "recheck",
    title: "高风险门店复检",
    siteId: "site-3",
    time: "14:00",
    status: "待出发",
    risk: "critical",
    assignee: "李海",
  },
  {
    id: "task-4",
    documentNo: "STFW-2026-168",
    type: "service",
    title: "PCO 常规服务",
    siteId: "site-1",
    time: "16:30",
    status: "待提交",
    risk: "medium",
    assignee: "王三毛",
  },
  {
    id: "task-5",
    documentNo: "KC-2026-BG-117",
    type: "survey",
    title: "首次勘测",
    siteId: "site-2",
    time: "昨天",
    status: "已完成",
    risk: "low",
    assignee: "陈林",
  },
];

export const scopeOptions = ["收银区", "仓储区", "营业区域", "货架顶部", "货架底部", "通道走廊", "后厨", "天花板"];

export const structureOptions = [
  "全员无吊顶",
  "梁柱裸露",
  "墙体结构漏洞",
  "管线穿墙缝隙",
  "墙体开裂",
  "门底缝隙过大",
  "缺少隔断",
  "通风口无防护",
];

export const treatmentTemplates = [
  "鼠类综合防治方案",
  "结构封堵整改",
  "环境清洁整治",
  "高风险门店复检",
];

export const sealingItems = [
  { id: "item-1", location: "仓储区水电管道穿墙孔", holeType: "管道穿墙缝隙", result: "已封堵" as const },
  { id: "item-2", location: "收银台后方墙体", holeType: "墙体孔洞", result: "已封堵" as const },
  { id: "item-3", location: "门头上方", holeType: "结构破损缝隙", result: "待封堵" as const },
];
