export interface Session {
  name: string;
  role: string;
  phoneMasked: string;
  loginAt: string;
}

export interface Site {
  id: string;
  name: string;
  customer: string;
  code: string;
  address: string;
  contact: string;
  phoneMasked: string;
  risk: "critical" | "high" | "medium" | "low";
}

export interface Task {
  id: string;
  documentNo: string;
  type: "survey" | "sealing" | "recheck" | "service";
  title: string;
  siteId: string;
  time: string;
  status: "待出发" | "进行中" | "待提交" | "已完成";
  risk: "critical" | "high" | "medium" | "low";
  assignee: string;
}

export interface InspectionDraft {
  taskId: string;
  site: Site;
  date: string;
  time: string;
  scope: string[];
  structure: string[];
  riskPhotos: string[];
  treatmentPlan: string;
  surveyorSignature: string;
  customerSignature: string;
  updatedAt: string;
}

export interface SealingItem {
  id: string;
  location: string;
  holeType: string;
  result: "已封堵" | "待封堵";
}

export interface SealingDraft {
  taskId: string;
  site: Site;
  date: string;
  leader: string;
  supervisor: string;
  rodent: string;
  density: string;
  items: SealingItem[];
  materials: Array<{ id: string; name: string; spec: string; unit: string; quantity: number }>;
  beforePhotos: string[];
  afterPhotos: string[];
  responsibleSignature: string;
  customerSignature: string;
  updatedAt: string;
}

export interface QueueItem {
  id: string;
  type: "inspection" | "sealing";
  label: string;
  payload: InspectionDraft | SealingDraft;
  createdAt: string;
}
