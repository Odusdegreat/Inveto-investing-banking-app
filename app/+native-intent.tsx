export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    const url = new URL(path, "https://inveto.invalid");
    const route = url.protocol === "inveto:" ? `/${url.hostname}${url.pathname}` : url.pathname;
    const aliases: Record<string, string> = {
      "/auth/password/reset/confirm": "/reset-password",
      "/auth/password-reset/confirm": "/reset-password",
      "/auth/email-verification/confirm": "/verify-email",
      "/cards/link/confirm": "/card-link",
      "/cards/link/callback": "/card-link",
    };
    return `${aliases[route] ?? route}${url.search}`;
  } catch { return "/"; }
}
