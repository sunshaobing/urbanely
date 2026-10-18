export interface Session {
  id: number;
  username: string;
  name: string;
  role: string;
  phoneMasked: string;
  loginAt: string;
}

export interface AuthUser {
  id: number;
  username: string;
  name: string;
  phone: string;
  role: string;
}

export interface AuthPayload {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

export interface DashboardSummary {
  cards: {
    month_orders: number;
    total_holes: number;
    material_usage: number;
    active_customers: number;
    sites: number;
    contracts: number;
    employees: number;
    risk_surveys: number;
    service_reports: number;
    materials: number;
    contract_expiring: number;
    due_inspections: number;
  };
  todos: Array<{
    id: number;
    report_no: string;
    customer_name: string;
    created_at: string;
  }>;
}

export type WorkOrderStatus = "draft" | "pending" | "rejected" | "approved" | "completed";

export interface WorkOrder {
  id: number;
  report_no: string;
  report_date: string;
  customer_name: string;
  service_address: string;
  contact: string;
  contact_phone: string;
  service_type: string;
  service_date: string;
  status: WorkOrderStatus;
  created_at: string;
  submitted_at: string;
  completed_at: string;
  rejection_reason: string;
  sites: Array<{
    id: number;
    name: string;
    hole_type: string;
    before_photo_count: number;
    after_photo_count: number;
  }>;
}

export interface WorkOrderList {
  total: number;
  items: WorkOrder[];
  page: number;
  page_size: number;
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
