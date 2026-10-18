import { API_BASE_URL, API_TIMEOUT } from "../config/env";
import { clearSession, getAccessToken } from "./storage";
import type { AuthPayload, DashboardSummary, WorkOrder, WorkOrderList } from "./types";

type RequestMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestOptions {
  method?: RequestMethod;
  data?: unknown;
  header?: Record<string, string>;
  skipAuthRedirect?: boolean;
}

function errorMessage(statusCode: number, payload: unknown) {
  if (payload && typeof payload === "object") {
    const body = payload as Record<string, unknown>;
    if (typeof body.detail === "string") return body.detail;
    if (Array.isArray(body.detail)) {
      const details = body.detail
        .map((item) => {
          if (item && typeof item === "object" && "msg" in item) {
            return String((item as { msg: unknown }).msg);
          }
          return "";
        })
        .filter(Boolean);
      if (details.length > 0) return details.join("；");
    }
    if (typeof body.message === "string") return body.message;
  }

  return `请求失败（${statusCode || "网络异常"}）`;
}

function handleUnauthorized() {
  clearSession();
  const pages = getCurrentPages();
  const current = pages[pages.length - 1];
  if (current?.route !== "pages/login/login") {
    wx.reLaunch({ url: "/pages/login/login" });
  }
}

export function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = getAccessToken();
  const header: Record<string, string> = {
    "Content-Type": "application/json",
    ...options.header,
  };
  if (token) header.Authorization = `Bearer ${token}`;

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`,
      method: options.method || "GET",
      data: options.data,
      header,
      timeout: API_TIMEOUT,
      success: (response: any) => {
        if (response.statusCode === 401) {
          if (options.skipAuthRedirect) {
            reject(new Error(errorMessage(response.statusCode, response.data)));
          } else {
            handleUnauthorized();
            reject(new Error("登录已过期，请重新登录"));
          }
          return;
        }
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(response.data as T);
          return;
        }
        reject(new Error(errorMessage(response.statusCode, response.data)));
      },
      fail: (error: any) => {
        reject(new Error(error.errMsg || "网络连接失败"));
      },
    });
  });
}

export function loginWithPassword(username: string, password: string) {
  return request<AuthPayload>("/api/auth/login", {
    method: "POST",
    data: { username, password },
    skipAuthRedirect: true,
  });
}

export function getDashboardSummary() {
  return request<DashboardSummary>("/api/dashboard/summary");
}

export function getWorkOrders(status: string, page = 1, pageSize = 20) {
  const query = [
    `status=${encodeURIComponent(status)}`,
    `page=${page}`,
    `page_size=${pageSize}`,
  ].join("&");
  return request<WorkOrderList>(`/api/workorders?${query}`);
}

export function getWorkOrder(id: number) {
  return request<WorkOrder>(`/api/workorders/${id}`);
}

export { API_BASE_URL };
