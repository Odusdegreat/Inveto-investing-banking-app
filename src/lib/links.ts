export function singleParam(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

export function actionToken(value: string): string {
  const input = value.trim();
  if (!input || input.length > 8192) return "";
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(input)) {
    try { return new URL(input).searchParams.get("token")?.trim() ?? ""; }
    catch { return ""; }
  }
  return input;
}

export function paystackCheckoutUrl(value: string | undefined): string {
  if (!value) throw new Error("The server did not return a checkout link.");
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || !(url.hostname === "checkout.paystack.com" || url.hostname.endsWith(".paystack.com"))) {
    throw new Error("The server returned an unsupported checkout link.");
  }
  return url.toString();
}
