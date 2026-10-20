import { clearSession, loadSession } from "./auth";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://sunrgw.cn";

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

export interface PersonnelRecord {
  id: number;
  username: string;
  name: string;
  phone: string;
  role: string;
  active: boolean;
  created_at: string;
}

export interface PersonnelInput {
  username: string;
  password: string;
  name: string;
  phone: string;
  role: string;
  active: boolean;
}

export interface BackendDashboardSummary {
  cards: {
    month_orders: number;
    total_holes: number;
    risk_surveys: number;
    service_reports?: number;
    due_inspections: number;
    active_customers?: number;
    sites?: number;
  };
}

export interface BackendWorkOrderSite {
  id: number;
  name: string;
  hole_type?: string;
  before_photo_count?: number;
  after_photo_count?: number;
  remark?: string;
}

export interface BackendWorkOrderMaterial {
  id: number;
  material_name: string;
  spec?: string;
  qty?: number;
  unit?: string;
}

export interface BackendWorkOrder {
  id: number;
  report_no: string;
  report_date?: string;
  customer_id?: number;
  customer_name?: string;
  service_address?: string;
  contact?: string;
  contact_phone?: string;
  service_type?: string;
  service_date?: string;
  weather?: string;
  density?: string;
  engineer_id?: number;
  engineer_name?: string;
  supervisor_id?: number;
  supervisor_name?: string;
  status: string;
  rejection_reason?: string;
  created_at?: string;
  submitted_at?: string;
  completed_at?: string;
  sites?: BackendWorkOrderSite[];
  materials?: BackendWorkOrderMaterial[];
  checkins?: BackendWorkOrderCheckin[];
}

export interface BackendWorkOrderCheckin {
  id: number;
  role: "surveyor" | "sealing";
  checkin_time: string;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  address: string;
  photo_url: string;
}

export interface WorkOrderInput {
  report_date?: string;
  customer_id?: number;
  customer_code?: string;
  customer_name: string;
  service_address?: string;
  contact?: string;
  contact_phone?: string;
  service_type?: string;
  service_company?: string;
  service_date?: string;
  weather?: string;
  engineer_id?: number | null;
  supervisor_id?: number | null;
  rat_species?: string[];
  density?: string;
  activity_areas?: string[];
  purpose_options?: string[];
  purpose_custom?: string;
  hole_types?: string[];
  acceptance_items?: string[];
  hygiene_items?: string[];
  acceptance_result?: string;
  service_frequency?: string;
  service_suggestion?: string;
  materials?: Array<Record<string, unknown>>;
  sites?: Array<Record<string, unknown>>;
  signatures?: Array<Record<string, unknown>>;
}

export interface BackendPhoto {
  url: string;
  caption?: string;
  sort_order?: number;
}

export interface BackendSignature {
  role: string;
  name: string;
  image_url: string;
  signed_at?: string;
}

export interface BackendRiskSurveyItem {
  id?: number;
  location: string;
  description?: string;
  suggestion?: string;
  sort_order?: number;
}

export interface BackendRiskSurvey {
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
  items?: BackendRiskSurveyItem[];
  photos?: BackendPhoto[];
  signatures?: BackendSignature[];
  pdf_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface BackendServiceReportMaterial {
  name: string;
  qty?: number;
  unit?: string;
  usage_method?: string;
  target?: string;
  area_size?: string;
  region?: string;
  sort_order?: number;
}

export interface BackendServiceReport {
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
  materials?: BackendServiceReportMaterial[];
  photos?: BackendPhoto[];
  risk_photos?: BackendPhoto[];
  signatures?: BackendSignature[];
  checkin?: {
    checkin_time: string;
    checkin_location: string;
    checkin_photo: string;
    checkin_latitude?: number | null;
    checkin_longitude?: number | null;
    checkin_accuracy?: number | null;
    checkout_time: string;
    checkout_location: string;
    checkout_photo: string;
  };
  pdf_url?: string;
  created_at?: string;
}

export interface BackendCustomer {
  id: number;
  code?: string;
  name: string;
  address?: string;
  contact?: string;
  phone?: string;
  status?: string;
  risk?: string;
  remark?: string;
  owner_user_ids?: number[];
  created_at?: string;
}

export interface BackendSite {
  id: number;
  customer_id: number;
  name: string;
  address?: string;
  area?: number;
  note?: string;
}

export interface CustomerInput {
  code?: string;
  name: string;
  address?: string;
  contact?: string;
  phone?: string;
  status?: string;
  remark?: string;
  owner_user_ids?: number[];
}

export interface SiteInput {
  customer_id: number;
  name: string;
  address?: string;
  area?: number;
  note?: string;
}

export interface BackendTemplates {
  logo_url?: string;
  company_name?: string;
  service_company?: string;
  [key: string]: unknown;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  auth?: boolean;
}

function errorMessage(payload: unknown, status: number) {
  if (payload && typeof payload === "object") {
    const body = payload as Record<string, unknown>;
    if (typeof body.detail === "string") return body.detail;
    if (Array.isArray(body.detail)) {
      return body.detail
        .map((item) =>
          item && typeof item === "object" && "msg" in item
            ? String((item as { msg: unknown }).msg)
            : "",
        )
        .filter(Boolean)
        .join("；");
    }
    if (typeof body.message === "string") return body.message;
  }
  return `请求失败（${status || "网络异常"}）`;
}

function queryString(values: Record<string, string | number | undefined>) {
  const entries = Object.entries(values).filter(
    ([, value]) => value !== undefined && value !== "",
  );
  return entries.length
    ? `?${entries
        .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
        .join("&")}`
    : "";
}

export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const session = loadSession();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (options.auth !== false && session?.token) {
    headers.Authorization = `Bearer ${session.token}`;
  }
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const payload = await response.json().catch(() => null);
  if (response.status === 401) clearSession();
  if (!response.ok) throw new Error(errorMessage(payload, response.status));
  return payload as T;
}

export function itemsOf<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object") {
    const body = payload as Record<string, unknown>;
    if (Array.isArray(body.items)) return body.items as T[];
    if (Array.isArray(body.data)) return body.data as T[];
    if (Array.isArray(body.list)) return body.list as T[];
    if (body.data && typeof body.data === "object") {
      const nested = body.data as Record<string, unknown>;
      if (Array.isArray(nested.items)) return nested.items as T[];
    }
  }
  return [];
}

export function loginWithPassword(username: string, password: string) {
  return request<AuthPayload>("/api/auth/login", {
    method: "POST",
    auth: false,
    body: { username, password },
  });
}

export function getDashboardSummary() {
  return request<BackendDashboardSummary>("/api/dashboard/summary");
}

export function listWorkOrders(
  filters: {
    status?: string;
    customer_id?: number;
    engineer_id?: number;
    keyword?: string;
    page?: number;
    page_size?: number;
  } = {},
) {
  return request<unknown>(`/api/workorders${queryString(filters)}`);
}

export function createWorkOrder(body: WorkOrderInput) {
  return request<BackendWorkOrder>("/api/workorders", {
    method: "POST",
    body,
  });
}

export function listRiskSurveys(
  filters: {
    keyword?: string;
    status?: string;
    customer_id?: number;
    risk_level?: string;
  } = {},
) {
  return request<unknown>(`/api/risk-surveys${queryString(filters)}`);
}

export function getRiskSurvey(id: number) {
  return request<BackendRiskSurvey>(`/api/risk-surveys/${id}`);
}

export function listServiceReports(
  filters: { keyword?: string; status?: string; customer_id?: number } = {},
) {
  return request<unknown>(`/api/service-reports${queryString(filters)}`);
}

export function getServiceReport(id: number) {
  return request<BackendServiceReport>(`/api/service-reports/${id}`);
}

export function listCustomers(
  filters: {
    keyword?: string;
    status?: string;
    page?: number;
    page_size?: number;
  } = {},
) {
  return request<unknown>(`/api/customers${queryString(filters)}`);
}

export function listSites(filters: { customer_id?: number } = {}) {
  return request<unknown>(`/api/sites${queryString(filters)}`);
}

export function createCustomer(body: CustomerInput) {
  return request<BackendCustomer>("/api/customers", {
    method: "POST",
    body,
  });
}

export function updateCustomer(id: number, body: CustomerInput) {
  return request<BackendCustomer>(`/api/customers/${id}`, {
    method: "PUT",
    body,
  });
}

export function deleteCustomer(id: number) {
  return request<{ ok: boolean }>(`/api/customers/${id}`, {
    method: "DELETE",
  });
}

export function createSite(body: SiteInput) {
  return request<BackendSite>("/api/sites", {
    method: "POST",
    body,
  });
}

export function updateSite(id: number, body: SiteInput) {
  return request<BackendSite>(`/api/sites/${id}`, {
    method: "PUT",
    body,
  });
}

export function deleteSite(id: number) {
  return request<{ ok: boolean }>(`/api/sites/${id}`, {
    method: "DELETE",
  });
}

export function getTemplates() {
  return request<BackendTemplates>("/api/templates");
}

export function updateRiskSurvey(id: number, body: Record<string, unknown>) {
  return request<BackendRiskSurvey>(`/api/risk-surveys/${id}`, {
    method: "PUT",
    body,
  });
}

export function submitRiskSurvey(id: number) {
  return request<BackendRiskSurvey>(`/api/risk-surveys/${id}/submit`, {
    method: "POST",
  });
}

export function updateServiceReport(id: number, body: Record<string, unknown>) {
  return request<BackendServiceReport>(`/api/service-reports/${id}`, {
    method: "PUT",
    body,
  });
}

export function submitServiceReport(id: number) {
  return request<BackendServiceReport>(`/api/service-reports/${id}/submit`, {
    method: "POST",
  });
}

export function reviewWorkOrder(
  id: number,
  action: "approve" | "reject",
  comment = "",
) {
  return request<BackendWorkOrder>(`/api/workorders/${id}/review`, {
    method: "POST",
    body: { action, comment },
  });
}

export function listPersonnel() {
  return request<{ items: PersonnelRecord[] }>("/api/personnel");
}

export function createPersonnel(input: PersonnelInput) {
  return request<PersonnelRecord>("/api/personnel", {
    method: "POST",
    body: input,
  });
}

export function updatePersonnel(id: number, input: PersonnelInput) {
  return request<PersonnelRecord>(`/api/personnel/${id}`, {
    method: "PUT",
    body: input,
  });
}

export function changeOwnPassword(oldPassword: string, newPassword: string) {
  return request<{ ok: boolean }>("/api/auth/change-password", {
    method: "POST",
    body: { old_password: oldPassword, new_password: newPassword },
  });
}

export async function openBackendPdf(path: string) {
  const session = loadSession();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: session?.token
      ? { Authorization: `Bearer ${session.token}` }
      : undefined,
  });
  if (!response.ok) {
    throw new Error(errorMessage(await response.json().catch(() => null), response.status));
  }
  const url = URL.createObjectURL(await response.blob());
  window.open(url, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
