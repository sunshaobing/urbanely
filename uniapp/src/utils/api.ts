import { clearSession, getSession } from "./auth";
import type {
  AuthPayload,
  DashboardSummary,
  QuickPhrase,
  RiskSurvey,
  ServiceReport,
  WorkOrder,
  WorkOrderList,
} from "./types";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://sunrgw.cn";

type RequestMethod = "GET" | "POST" | "PUT" | "DELETE";

interface RequestOptions {
  method?: RequestMethod;
  data?: string | Record<string, unknown> | ArrayBuffer;
  skipAuthRedirect?: boolean;
}

interface QueryValue {
  [key: string]: string | number | undefined;
}

function errorMessage(statusCode: number, payload: unknown) {
  if (payload && typeof payload === "object") {
    const body = payload as Record<string, unknown>;
    if (typeof body.detail === "string") return body.detail;
    if (Array.isArray(body.detail)) {
      const details = body.detail
        .map((item) =>
          item && typeof item === "object" && "msg" in item
            ? String((item as { msg: unknown }).msg)
            : "",
        )
        .filter(Boolean);
      if (details.length) return details.join("；");
    }
    if (typeof body.message === "string") return body.message;
  }
  return `请求失败（${statusCode || "网络异常"}）`;
}

function unauthorized() {
  clearSession();
  const pages = getCurrentPages();
  const current = pages[pages.length - 1];
  if (current?.route !== "pages/login/index") {
    uni.reLaunch({ url: "/pages/login/index" });
  }
}

function queryString(query: QueryValue = {}) {
  const entries = Object.entries(query).filter(
    ([, value]) => value !== undefined && value !== "",
  );
  if (!entries.length) return "";
  return `?${entries
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
    .join("&")}`;
}

function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const session = getSession();
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${API_BASE_URL}${path}`,
      method: options.method ?? "GET",
      data: options.data,
      timeout: 30000,
      header: {
        "Content-Type": "application/json",
        ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
      },
      success: (response) => {
        if (response.statusCode === 401) {
          if (!options.skipAuthRedirect) unauthorized();
          reject(new Error(errorMessage(response.statusCode, response.data)));
          return;
        }
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(response.data as T);
          return;
        }
        reject(new Error(errorMessage(response.statusCode, response.data)));
      },
      fail: (error) => {
        reject(new Error(error.errMsg || "网络连接失败"));
      },
    });
  });
}

function parseUploadPayload(data: string | Record<string, unknown>) {
  if (typeof data !== "string") return data;
  try {
    return JSON.parse(data) as Record<string, unknown>;
  } catch {
    return { detail: data };
  }
}

export function uploadMedia(
  path: string,
  filePath: string,
  formData: Record<string, string | number> = {},
) {
  const session = getSession();
  return new Promise<Record<string, unknown>>((resolve, reject) => {
    uni.uploadFile({
      url: `${API_BASE_URL}${path}`,
      filePath,
      name: "file",
      formData,
      timeout: 60000,
      header: session?.token
        ? { Authorization: `Bearer ${session.token}` }
        : undefined,
      success: (response) => {
        const payload = parseUploadPayload(response.data);
        if (response.statusCode === 401) {
          unauthorized();
          reject(new Error(errorMessage(response.statusCode, payload)));
          return;
        }
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(payload);
          return;
        }
        reject(new Error(errorMessage(response.statusCode, payload)));
      },
      fail: (error) => {
        reject(new Error(error.errMsg || "文件上传失败"));
      },
    });
  });
}

export function login(identifier: string, password: string) {
  return request<AuthPayload>("/api/auth/login", {
    method: "POST",
    data: { username: identifier, password },
    skipAuthRedirect: true,
  });
}

export function getDashboardSummary() {
  return request<DashboardSummary>("/api/dashboard/summary");
}

export function getWorkOrders(status: string, page = 1, pageSize = 20) {
  return request<WorkOrderList>(
    `/api/workorders${queryString({
      status,
      page,
      page_size: pageSize,
    })}`,
  );
}

export function getWorkOrder(id: number) {
  return request<WorkOrder>(`/api/workorders/${id}`);
}

export function getRiskSurveys(
  filters: { keyword?: string; status?: string; customer_id?: number } = {},
) {
  return request<unknown>(
    `/api/risk-surveys${queryString(filters)}`,
  ) as Promise<unknown>;
}

export function getServiceReports(
  filters: { keyword?: string; status?: string; customer_id?: number } = {},
) {
  return request<unknown>(
    `/api/service-reports${queryString(filters)}`,
  ) as Promise<unknown>;
}

export function saveRiskSurvey(
  surveyId: number,
  data: Record<string, unknown>,
) {
  return request<unknown>(
    surveyId > 0 ? `/api/risk-surveys/${surveyId}` : "/api/risk-surveys",
    {
      method: surveyId > 0 ? "PUT" : "POST",
      data,
    },
  );
}

export function submitRiskSurvey(surveyId: number) {
  return request<unknown>(`/api/risk-surveys/${surveyId}/submit`, {
    method: "POST",
  });
}

export function saveServiceReport(
  reportId: number,
  data: Record<string, unknown>,
) {
  return request<unknown>(
    reportId > 0 ? `/api/service-reports/${reportId}` : "/api/service-reports",
    {
      method: reportId > 0 ? "PUT" : "POST",
      data,
    },
  );
}

export function signServiceReport(
  reportId: number,
  data: Record<string, unknown>,
) {
  return request<unknown>(`/api/service-reports/${reportId}/sign`, {
    method: "POST",
    data,
  });
}

export function submitServiceReport(reportId: number) {
  return request<unknown>(`/api/service-reports/${reportId}/submit`, {
    method: "POST",
  });
}

export function saveDraft(
  kind: string,
  localId: string,
  data: Record<string, unknown>,
) {
  return request<unknown>("/api/drafts", {
    method: "POST",
    data: { kind, local_id: localId, data },
  });
}

export function getQuickPhrases(category = "") {
  return request<unknown>(
    `/api/quick-phrases${queryString({ category })}`,
  );
}

export function changePassword(oldPassword: string, newPassword: string) {
  return request<unknown>("/api/auth/change-password", {
    method: "POST",
    data: { old_password: oldPassword, new_password: newPassword },
  });
}

export function toList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object") {
    const body = payload as Record<string, unknown>;
    if (Array.isArray(body.items)) return body.items as T[];
    if (Array.isArray(body.list)) return body.list as T[];
    if (Array.isArray(body.data)) return body.data as T[];
    if (body.data && typeof body.data === "object") {
      const nested = body.data as Record<string, unknown>;
      if (Array.isArray(nested.items)) return nested.items as T[];
      if (Array.isArray(nested.list)) return nested.list as T[];
    }
  }
  return [];
}

export function toRecord(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== "object") return {};
  const body = payload as Record<string, unknown>;
  if (body.data && typeof body.data === "object" && !Array.isArray(body.data)) {
    return body.data as Record<string, unknown>;
  }
  return body;
}

export function toId(payload: unknown): number {
  const record = toRecord(payload);
  const value = record.id ?? record.survey_id ?? record.report_id;
  const id = Number(value);
  return Number.isFinite(id) && id > 0 ? id : 0;
}

export function uploadedUrl(payload: unknown): string {
  const record = toRecord(payload);
  const value =
    record.url ??
    record.photo_url ??
    record.image_url ??
    record.path ??
    (record.data && typeof record.data === "object"
      ? (record.data as Record<string, unknown>).url
      : "");
  return typeof value === "string" ? value : "";
}

export function listQuickPhrases(payload: unknown): QuickPhrase[] {
  return toList<QuickPhrase>(payload);
}

export function normalizeRiskSurveys(payload: unknown): RiskSurvey[] {
  return toList<RiskSurvey>(payload);
}

export function normalizeServiceReports(payload: unknown): ServiceReport[] {
  return toList<ServiceReport>(payload);
}
