import type { AuthPayload, Session } from "./types";

const SESSION_KEY = "shentai.uniapp.session.v1";

export function getSession(): Session | null {
  return uni.getStorageSync(SESSION_KEY) || null;
}

export function saveAuth(payload: AuthPayload) {
  const phone = payload.user.phone || payload.user.username;
  const session: Session = {
    id: payload.user.id,
    username: payload.user.username,
    name: payload.user.name || payload.user.username,
    role: payload.user.role,
    phoneMasked:
      phone.length >= 7 ? `${phone.slice(0, 3)}****${phone.slice(-4)}` : phone,
    token: payload.access_token,
    loginAt: new Date().toISOString(),
  };
  uni.setStorageSync(SESSION_KEY, session);
  return session;
}

export function clearSession() {
  uni.removeStorageSync(SESSION_KEY);
}
