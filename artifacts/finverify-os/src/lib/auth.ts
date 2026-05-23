export type UserRole = "founder" | "admin" | "ca";

export interface AuthUser {
  id?: number;
  email: string;
  name: string;
  role: UserRole;
  company: string;
  companyId?: number | null;
}

const AUTH_KEY = "finverify_auth";

export function getUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function login(user: AuthUser): void {
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
}

export function logout(): void {
  localStorage.removeItem(AUTH_KEY);
}

export function isLoggedIn(): boolean {
  return getUser() !== null;
}

let fetchInstalled = false;

export function installAuthenticatedFetch(): void {
  if (fetchInstalled) return;
  fetchInstalled = true;
  const nativeFetch = window.fetch.bind(window);

  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const isApiRequest = url.includes("/api/") || url.startsWith("/api");
    if (!isApiRequest) return nativeFetch(input, init);

    const user = getUser();
    if (!user?.id || !user.companyId) return nativeFetch(input, init);

    const headers = new Headers(init?.headers);
    headers.set("x-finverify-user-id", String(user.id));
    headers.set("x-finverify-company-id", String(user.companyId));
    return nativeFetch(input, { ...init, headers });
  };
}
