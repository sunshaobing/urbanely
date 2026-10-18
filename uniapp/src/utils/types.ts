export interface Session {
  id: number;
  username: string;
  name: string;
  role: string;
  phoneMasked: string;
  token: string;
  loginAt: string;
}

export interface AuthPayload {
  access_token: string;
  token_type: string;
  user: {
    id: number;
    username: string;
    name: string;
    phone: string;
    role: string;
  };
}

export interface DashboardCards {
  month_orders: number;
  total_holes: number;
  material_usage?: number;
  active_customers?: number;
  sites?: number;
  contracts?: number;
  employees?: number;
  risk_surveys: number;
  service_reports?: number;
  materials?: number;
  contract_expiring?: number;
  due_inspections: number;
}

export interface DashboardSummary {
  cards: DashboardCards;
  todos?: Array<{
    id: number;
    report_no: string;
    customer_name: string;
    created_at: string;
  }>;
}

export type WorkOrderStatus =
  | "draft"
  | "pending"
  | "rejected"
  | "approved"
  | "completed";

export interface WorkOrderSite {
  id: number;
  name: string;
  hole_type: string;
  before_photo_count: number;
  after_photo_count: number;
  remark?: string;
}

export interface WorkOrderMaterial {
  id: number;
  material_name: string;
  spec: string;
  qty: number;
  unit: string;
}

export interface WorkOrder {
  id: number;
  report_no: string;
  report_date: string;
  customer_id?: number;
  customer_name: string;
  service_address: string;
  contact: string;
  contact_phone: string;
  service_type: string;
  service_date: string;
  weather: string;
  density: string;
  engineer_id?: number;
  engineer_name?: string;
  supervisor_name?: string;
  status: WorkOrderStatus;
  rejection_reason: string;
  created_at: string;
  submitted_at: string;
  completed_at: string;
  materials: WorkOrderMaterial[];
  sites: WorkOrderSite[];
}

export interface WorkOrderList {
  total: number;
  items: WorkOrder[];
  page: number;
  page_size: number;
}

export interface PhotoRecord {
  url: string;
  caption?: string;
  sort_order?: number;
}

export interface SignatureRecord {
  role: string;
  name: string;
  image_url: string;
}

export interface RiskSurveyItem {
  id?: number;
  location: string;
  description: string;
  suggestion: string;
  sort_order?: number;
}

export interface RiskSurvey {
  id: number;
  code?: string;
  customer_id?: number;
  customer_name?: string;
  site_id?: number;
  employee_id?: number;
  survey_date?: string;
  survey_time?: string;
  contact_person?: string;
  survey_range?: string[];
  structure_conditions?: string[];
  pest_evidence?: string[];
  comprehensive_plan?: string;
  disinfection_plan?: string;
  environment_suggestions?: string;
  prevention_measures?: string;
  review_date?: string;
  pest_type?: string;
  risk_level?: string;
  conclusion?: string;
  status: string;
  items?: RiskSurveyItem[];
  photos?: PhotoRecord[];
  signatures?: SignatureRecord[];
  created_at?: string;
  updated_at?: string;
  pdf_url?: string;
}

export interface ServiceReportMaterial {
  name: string;
  qty: number;
  unit: string;
  usage_method?: string;
  target?: string;
  area_size?: string;
  region?: string;
  sort_order?: number;
}

export interface ServiceReport {
  id: number;
  code?: string;
  report_no?: string;
  customer_id?: number;
  customer_name?: string;
  address?: string;
  contact?: string;
  contact_phone?: string;
  service_project?: string;
  task_tag?: string;
  service_date?: string;
  start_time?: string;
  end_time?: string;
  service_person?: string;
  content?: string;
  follow_up?: string;
  risk_follow?: string;
  customer_comment?: string;
  status: string;
  materials?: ServiceReportMaterial[];
  photos?: PhotoRecord[];
  risk_photos?: PhotoRecord[];
  signatures?: SignatureRecord[];
  created_at?: string;
  updated_at?: string;
  pdf_url?: string;
}

export interface QuickPhrase {
  id: number;
  category: string;
  content: string;
  sort_order?: number;
}

export interface ListResponse<T> {
  total?: number;
  items: T[];
  page?: number;
  page_size?: number;
}

export interface PhotoDraft {
  path: string;
  caption?: string;
}

export interface SignatureDraft {
  role: string;
  name: string;
  path: string;
}
