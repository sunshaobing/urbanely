export interface AuthSession {
  name: string;
  role: string;
  phoneMasked: string;
  loginAt: string;
}

export const SESSION_KEY = "shentai.auth.session.v1";

function safeParse(value: string | null): AuthSession | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<AuthSession>;
    if (!parsed.name || !parsed.role || !parsed.phoneMasked || !parsed.loginAt) {
      return null;
    }
    return {
      name: parsed.name,
      role: parsed.role,
      phoneMasked: parsed.phoneMasked,
      loginAt: parsed.loginAt,
    };
  } catch {
    return null;
  }
}

export function loadSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  return (
    safeParse(window.sessionStorage.getItem(SESSION_KEY)) ??
    safeParse(window.localStorage.getItem(SESSION_KEY))
  );
}

export function saveSession(session: AuthSession, remember: boolean) {
  if (typeof window === "undefined") return;
  clearSession();
  const storage = remember ? window.localStorage : window.sessionStorage;
  storage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(SESSION_KEY);
  window.localStorage.removeItem(SESSION_KEY);
}

