import { clearSession, loadSession } from "./auth";

const API_BASE_URL = "https://sunrgw.cn";

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
  }
  return `请求失败（${status || "网络异常"}）`;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
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
  if (response.status === 401) {
    clearSession();
  }
  if (!response.ok) {
    throw new Error(errorMessage(payload, response.status));
  }
  return payload as T;
}

export function loginWithPassword(username: string, password: string) {
  return request<AuthPayload>("/api/auth/login", {
    method: "POST",
    auth: false,
    body: { username, password },
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
