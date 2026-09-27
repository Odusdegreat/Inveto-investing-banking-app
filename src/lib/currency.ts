import type { CurrencyCode } from "@/src/types";

export const CURRENCIES: Record<
  CurrencyCode,
  { symbol: string; name: string; locale: string }
> = {
  USD: { symbol: "$", name: "US Dollar", locale: "en-US" },
  EUR: { symbol: "€", name: "Euro", locale: "de-DE" },
  GBP: { symbol: "£", name: "British Pound", locale: "en-GB" },
  CAD: { symbol: "CA$", name: "Canadian Dollar", locale: "en-CA" },
  AUD: { symbol: "A$", name: "Australian Dollar", locale: "en-AU" },
  JPY: { symbol: "¥", name: "Japanese Yen", locale: "ja-JP" },
  INR: { symbol: "₹", name: "Indian Rupee", locale: "en-IN" },
  NGN: { symbol: "₦", name: "Nigerian Naira", locale: "en-NG" },
  KES: { symbol: "KSh", name: "Kenyan Shilling", locale: "en-KE" },
  ZAR: { symbol: "R", name: "South African Rand", locale: "en-ZA" },
  GHS: { symbol: "GH₵", name: "Ghanaian Cedi", locale: "en-GH" },
};

export const CURRENCY_CODES = Object.keys(CURRENCIES) as CurrencyCode[];

export const DEFAULT_CURRENCY: CurrencyCode = "USD";

export function currencySymbol(code: CurrencyCode) {
  return CURRENCIES[code]?.symbol ?? code;
}

export function currencyLocale(code: CurrencyCode) {
  return CURRENCIES[code]?.locale ?? "en-US";
}

export function currencyName(code: CurrencyCode) {
  return CURRENCIES[code]?.name ?? code;
}
