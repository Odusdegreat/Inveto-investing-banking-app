import { currencyLocale, currencySymbol, DEFAULT_CURRENCY } from "@/src/lib/currency";
import type { CurrencyCode, TransactionCategory, TransactionStatus } from "@/src/types";

export { currencySymbol };

export function formatMoney(
  amount: number,
  code: CurrencyCode = DEFAULT_CURRENCY,
  options: { sign?: boolean; compact?: boolean } = {},
) {
  const { sign = false, compact = false } = options;
  const abs = Math.abs(amount);

  let body: string;
  if (compact && abs >= 1000) {
    body = `${(abs / 1000).toFixed(abs >= 100_000 ? 0 : 1)}k`;
  } else {
    body = abs.toLocaleString(currencyLocale(code), {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  const prefix = sign ? (amount < 0 ? "−" : "+") : amount < 0 ? "−" : "";
  return `${prefix}${currencySymbol(code)}${body}`;
}

export function formatPercent(value: number, digits = 2) {
  const prefix = value < 0 ? "−" : "+";
  return `${prefix}${Math.abs(value).toFixed(digits)}%`;
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelative(iso: string) {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const minutes = Math.round(diff / 60_000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;

  return formatDate(iso);
}

export function dayLabel(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86_400_000);
  const same = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (same(date, today)) return "Today";
  if (same(date, yesterday)) return "Yesterday";
  return formatDate(iso);
}

export function maskAccountNumber(value: string) {
  if (value.length <= 4) return value;
  return `•••• ${value.slice(-4)}`;
}

export const CATEGORY_LABEL: Record<TransactionCategory, string> = {
  food: "Food & Drink",
  shopping: "Shopping",
  transport: "Transport",
  utilities: "Utilities",
  entertainment: "Entertainment",
  health: "Health",
  salary: "Income",
  transfer: "Transfers",
  investment: "Investing",
  other: "Other",
};

export const STATUS_LABEL: Record<TransactionStatus, string> = {
  completed: "Completed",
  pending: "Pending",
  failed: "Failed",
  reversed: "Reversed",
};

export function monthLabel(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString("en-GB", {
    month: "long",
    year: sameYear ? undefined : "numeric",
  });
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
