import { addNotification } from "./notifications";

export type VerificationStatus = "none" | "pending" | "approved" | "rejected";

export interface AqariUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  role?: "user" | "admin";
  blocked?: boolean;
  verified?: boolean;
  verificationStatus?: VerificationStatus;
  verificationNote?: string;
  verificationDoc?: string;
  verificationIdDoc?: string;
  verificationLicenseDoc?: string;
  verificationDate?: string;
}

type StoredUser = AqariUser & { password: string };

const USERS_KEY = "aqari_users";
const SESSION_KEY = "aqari_session";
const AUTH_EVENT = "aqari_auth_change";

const ADMIN_USER: StoredUser = {
  id: "admin-001",
  name: "مدير النظام",
  email: "admin@aqari.ps",
  phone: "0599000000",
  createdAt: "2026-01-01T00:00:00Z",
  role: "admin",
  verified: true,
  verificationStatus: "approved",
  password: "Admin@1234",
};

function isBrowser() {
  return typeof window !== "undefined";
}

function getUsers(): StoredUser[] {
  if (!isBrowser()) return [];
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveUsers(users: StoredUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function notify() {
  if (isBrowser()) window.dispatchEvent(new CustomEvent(AUTH_EVENT));
}

/** Keep the active session in sync when an admin mutates the logged-in user. */
function syncSession(updated: StoredUser) {
  const current = getCurrentUser();
  if (current && current.id === updated.id) {
    const { password: _pw, ...u } = updated;
    localStorage.setItem(SESSION_KEY, JSON.stringify(u));
  }
}

export function initAdmin() {
  if (!isBrowser()) return;
  const users = getUsers();
  if (!users.find((u) => u.id === ADMIN_USER.id)) {
    users.unshift(ADMIN_USER);
    saveUsers(users);
  }
}

export function register(
  name: string,
  email: string,
  password: string,
  phone: string,
): { user: AqariUser } | { error: string } {
  if (!name.trim() || name.trim().length < 2) return { error: "الاسم يجب أن يكون حرفين على الأقل" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "البريد الإلكتروني غير صحيح" };
  if (password.length < 6) return { error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" };
  if (!/^05\d{8}$/.test(phone.replace(/\s/g, ""))) return { error: "رقم الجوال يجب أن يبدأ بـ 05 ويتكون من 10 أرقام" };

  const users = getUsers();
  if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return { error: "هذا البريد الإلكتروني مسجل مسبقاً" };
  }

  const user: AqariUser = {
    id: Math.random().toString(36).slice(2) + Date.now().toString(36),
    name: name.trim(),
    email: email.toLowerCase(),
    phone: phone.replace(/\s/g, ""),
    createdAt: new Date().toISOString(),
    role: "user",
    blocked: false,
    verified: false,
    verificationStatus: "none",
  };
  users.push({ ...user, password });
  saveUsers(users);
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  notify();
  return { user };
}

export function login(
  email: string,
  password: string,
): { user: AqariUser } | { error: string } {
  const users = getUsers();
  const found = users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password,
  );
  if (!found) return { error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" };
  if (found.blocked) return { error: "تم حظر هذا الحساب. تواصل مع إدارة عقاري." };
  const { password: _pw, ...user } = found;
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  notify();
  return { user };
}

export function logout() {
  if (!isBrowser()) return;
  localStorage.removeItem(SESSION_KEY);
  notify();
}

export function getCurrentUser(): AqariUser | null {
  if (!isBrowser()) return null;
  try {
    const s = localStorage.getItem(SESSION_KEY);
    return s ? (JSON.parse(s) as AqariUser) : null;
  } catch {
    return null;
  }
}

export function getAllUsers(): AqariUser[] {
  return getUsers().map(({ password: _pw, ...u }) => u);
}

export function getUserById(id: string): AqariUser | null {
  const u = getUsers().find((x) => x.id === id);
  if (!u) return null;
  const { password: _pw, ...rest } = u;
  return rest;
}

export function deleteUser(id: string) {
  if (!isBrowser()) return;
  const users = getUsers().filter((u) => u.id !== id);
  saveUsers(users);
  notify();
}

function patchUser(id: string, patch: Partial<StoredUser>) {
  if (!isBrowser()) return;
  const users = getUsers();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return;
  users[idx] = { ...users[idx], ...patch };
  saveUsers(users);
  syncSession(users[idx]);
  notify();
}

export function blockUser(id: string) {
  patchUser(id, { blocked: true });
}

export function unblockUser(id: string) {
  patchUser(id, { blocked: false });
}

/** Manually grant or revoke the verified badge. */
export function setUserVerified(id: string, verified: boolean) {
  patchUser(id, {
    verified,
    verificationStatus: verified ? "approved" : "none",
    verificationDate: verified ? new Date().toISOString() : undefined,
  });
}

/** User submits a request to get their account verified. */
export function requestVerification(
  id: string,
  note: string,
  docs?: { idDoc?: string; licenseDoc?: string },
) {
  patchUser(id, {
    verificationStatus: "pending",
    verificationNote: note,
    verificationIdDoc: docs?.idDoc,
    verificationLicenseDoc: docs?.licenseDoc,
    verificationDate: new Date().toISOString(),
  });
}

/** Admin approves or rejects a pending verification request. */
export function reviewVerification(id: string, approve: boolean) {
  patchUser(id, {
    verified: approve,
    verificationStatus: approve ? "approved" : "rejected",
    verificationDate: new Date().toISOString(),
  });
  addNotification({
    userId: id,
    type: approve ? "verification_approved" : "verification_rejected",
    title: approve ? "تم توثيق حسابك ✓" : "لم تتم الموافقة على التوثيق",
    body: approve
      ? "تظهر الآن شارة التوثيق على إعلاناتك وملفك الشخصي."
      : "يمكنك إرسال طلب توثيق جديد بمعلومات أوضح من صفحة حسابك.",
    link: { to: "/account" },
  });
}

/** Users with a pending verification request. */
export function getVerificationRequests(): AqariUser[] {
  return getAllUsers().filter((u) => u.verificationStatus === "pending");
}

export { AUTH_EVENT };
