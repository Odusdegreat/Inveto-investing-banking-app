import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export class ApiError extends Error {
  constructor(public code: string, message: string, public status = 0, public requestId?: string) {
    super(message);
    this.name = "ApiError";
  }
}

type Tokens = { accessToken: string; refreshToken: string };
const KEY = "inveto.session.v2";
let tokens: Tokens | null = null;
let loaded = false;
let hydration: Promise<void> | null = null;
let refresh: Promise<void> | null = null;
let generation = 0;
let sessionEpoch = 0;
const expired = new Set<() => void>();
export function onSessionExpired(listener: () => void) {
  expired.add(listener);
  return () => { expired.delete(listener); };
}
export async function hydrate() {
  if (!loaded) {
    if (!hydration) {
      const version = generation;
      hydration = (async () => {
        const raw = Platform.OS === "web" ? globalThis.sessionStorage?.getItem(KEY) : await SecureStore.getItemAsync(KEY);
        if (generation !== version) return;
        try {
          const value = raw ? JSON.parse(raw) : null;
          tokens = value?.accessToken && value?.refreshToken ? value : null;
        } catch { tokens = null; }
        loaded = true;
      })().finally(() => { hydration = null; });
    }
    await hydration;
  }
  return tokens;
}
export async function saveTokens(value: Tokens | null, refreshing = false) {
  tokens = value;
  loaded = true;
  generation += 1;
  if (!refreshing) sessionEpoch += 1;
  if (Platform.OS === "web") {
    if (value) globalThis.sessionStorage?.setItem(KEY, JSON.stringify(value));
    else globalThis.sessionStorage?.removeItem(KEY);
  } else if (value) await SecureStore.setItemAsync(KEY, JSON.stringify(value));
  else await SecureStore.deleteItemAsync(KEY);
}
export async function acceptSession(value: { accessToken?: string; token?: string; refreshToken: string }, refreshing = false) {
  const accessToken = value.accessToken ?? value.token;
  if (!accessToken || !value.refreshToken) throw new ApiError("invalid_response", "The server did not return session tokens.");
  await saveTokens({ accessToken, refreshToken: value.refreshToken }, refreshing);
}

type Options = { method?: string; body?: unknown; public?: boolean; idempotencyKey?: string };
export async function request<T>(path: string, options: Options = {}, retry = true): Promise<T> {
  const base = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, "");
  if (!base) throw new ApiError("configuration", "Set EXPO_PUBLIC_API_URL and restart the app.");
  await hydrate();
  const accessToken = tokens?.accessToken;
  const sessionGeneration = generation;
  const epoch = sessionEpoch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  let response: Response;
  let body: any;
  try {
    response = await fetch(`${base}${path}`, {
      method: options.method ?? "GET",
      headers: {
        Accept: "application/json",
        ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(!options.public && accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(options.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });
    const text = await response.text();
    try { body = text ? JSON.parse(text) : undefined; }
    catch { throw new ApiError("invalid_response", "The server returned an unreadable response.", response.status); }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError("network_error", "Cannot reach the server. Check your connection and try again.");
  } finally { clearTimeout(timer); }
  if (!options.public && epoch !== sessionEpoch) throw new ApiError("session_changed", "Your session changed. Try again.", 401);
  if (response.status === 401 && !options.public && retry && tokens?.refreshToken) {
    // A concurrent request may already have refreshed this access token.
    if (tokens.accessToken === accessToken) {
      if (!refresh) {
        const version = generation;
        refresh = request<Tokens>("/auth/refresh", { method: "POST", body: { refreshToken: tokens.refreshToken }, public: true }, false)
          .then(async (value) => { if (generation === version) await acceptSession(value, true); })
          .catch(async (error) => {
            if (generation === version && error instanceof ApiError && [400, 401, 403].includes(error.status)) {
              await saveTokens(null);
              expired.forEach((listener) => listener());
            }
            throw error;
          }).finally(() => { refresh = null; });
      }
      await refresh;
    }
    if (!tokens || epoch !== sessionEpoch) throw new ApiError("session_expired", "Sign in to continue.", 401);
    return request<T>(path, options, false);
  }
  if (!response.ok) {
    if (response.status === 401 && !options.public && sessionGeneration === generation) {
      await saveTokens(null);
      expired.forEach((listener) => listener());
    }
    throw new ApiError(body?.code ?? "request_failed", body?.message ?? `Request failed (${response.status})`, response.status, body?.requestId ?? response.headers.get("X-Request-Id") ?? undefined);
  }
  return body as T;
}

export async function pages<T>(path: string): Promise<T[]> {
  // Cursor IDs are documented as the last item on each full page.
  const all: T[] = [];
  let before: string | undefined;
  const seen = new Set<string>();
  for (;;) {
    const page = await request<(T & { id: string })[]>(`${path}${path.includes("?") ? "&" : "?"}limit=100${before ? `&before=${encodeURIComponent(before)}` : ""}`);
    all.push(...page);
    if (page.length < 100) return all;
    before = page[page.length - 1].id;
    if (seen.has(before)) throw new ApiError("invalid_pagination", "The server returned a repeated page.");
    seen.add(before);
  }
}
