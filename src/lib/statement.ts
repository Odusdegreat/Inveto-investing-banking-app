import type { FilePrintOptions } from "expo-print";

import { CATEGORY_LABEL, formatDate, formatMoney, formatTime } from "@/src/lib/format";
import type { CurrencyCode, Transaction } from "@/src/types";

/**
 * Renders and shares account statements. Follows the same print-then-share shape
 * as `pdf.ts`, but builds a paginated statement rather than a single receipt.
 */

export type StatementMeta = {
  accountName: string;
  from: string;
  to: string;
  openingBalance: number;
  closingBalance: number;
  currency: CurrencyCode;
  accountNumber?: string | null;
};

export function statementHTML(transactions: Transaction[], meta: StatementMeta): string {
  const rows = transactions
    .map(
      (item) => `
        <tr>
          <td>${formatDate(item.createdAt)}<br /><span class="muted">${formatTime(item.createdAt)}</span></td>
          <td>${escapeHtml(item.description || item.title)}<br /><span class="muted">${escapeHtml(item.reference)}</span></td>
          <td>${CATEGORY_LABEL[item.category] ?? item.category}</td>
          <td class="num">${item.amount > 0 ? "+" : ""}${formatMoney(item.amount, item.currency)}</td>
          <td class="num">${formatMoney(runningBalance(transactions, item.id), item.currency)}</td>
        </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0F172A; font-size: 11px; }
    header { display: flex; justify-content: space-between; align-items: flex-end; padding: 24px 0 16px; border-bottom: 2px solid #0F172A; }
    .brand { font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }
    .muted { color: #64748B; font-size: 9px; }
    h1 { font-size: 15px; font-weight: 700; margin-top: 4px; }
    .summary { display: flex; gap: 24px; padding: 16px 0; border-bottom: 1px solid #E2E8F0; }
    .summary div { flex: 1; }
    .summary .label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748B; }
    .summary .value { font-size: 14px; font-weight: 700; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    thead th { text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748B; border-bottom: 1px solid #0F172A; padding: 6px 4px; }
    tbody td { padding: 7px 4px; border-bottom: 1px solid #F1F5F9; vertical-align: top; }
    .num { text-align: right; white-space: nowrap; }
    footer { margin-top: 20px; padding-top: 12px; border-top: 1px solid #E2E8F0; font-size: 9px; color: #64748B; line-height: 1.5; }
  </style>
</head>
<body>
  <header>
    <div>
      <div class="brand">INVETO</div>
      <div class="muted">${escapeHtml(meta.accountName)}</div>
    </div>
    <div style="text-align: right">
      <h1>Account statement</h1>
      <div class="muted">${formatDate(meta.from)} to ${formatDate(meta.to)}</div>
    </div>
  </header>

  <div class="summary">
    <div><div class="label">Opening balance</div><div class="value">${formatMoney(meta.openingBalance, meta.currency)}</div></div>
    <div><div class="label">Closing balance</div><div class="value">${formatMoney(meta.closingBalance, meta.currency)}</div></div>
    <div><div class="label">Transactions</div><div class="value">${transactions.length}</div></div>
    ${meta.accountNumber ? `<div><div class="label">Account</div><div class="value">•••• ${escapeHtml(meta.accountNumber.slice(-4))}</div></div>` : ""}
  </div>

  <table>
    <thead>
      <tr><th>Date</th><th>Description</th><th>Category</th><th class="num">Amount</th><th class="num">Balance</th></tr>
    </thead>
    <tbody>${rows || `<tr><td colspan="5" style="padding: 20px 0; text-align: center" class="muted">No transactions in this period</td></tr>`}</tbody>
  </table>

  <footer>
    Generated on ${formatDate(new Date().toISOString())} at ${formatTime(new Date().toISOString())}.<br />
    INVETO is a regulated deposit-taking institution. Deposits are protected up to the statutory limit.
  </footer>
</body>
</html>`;
}

/** Statement rows are listed newest first in the app, so match that order. */
function runningBalance(transactions: Transaction[], id: string) {
  const index = transactions.findIndex((item) => item.id === id);
  const before = transactions.slice(index + 1).reduce((sum, item) => sum + item.amount, 0);
  return before;
}

export function statementCSV(transactions: Transaction[], meta: StatementMeta): string {
  const header = "date,time,description,reference,category,amount,currency,status";
  const lines = transactions.map((item) =>
    [
      item.createdAt,
      formatTime(item.createdAt),
      csvCell(item.description || item.title),
      csvCell(item.reference),
      CATEGORY_LABEL[item.category] ?? item.category,
      item.amount.toFixed(2),
      item.currency,
      item.status,
    ].join(","),
  );
  return [header, ...lines].join("\n");
}

export function statementOFX(meta: StatementMeta): string {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return [
    "OFXHEADER:100",
    "DATA:OFXSGML",
    "VERSION:102",
    "SECURITY:NONE",
    "ENCODING:USASCII",
    "CHARSET:1252",
    "COMPRESSION:NONE",
    "OLDFILEUID:NONE",
    "NEWFILEUID:NONE",
    "",
    "<OFX>",
    "<SIGNONMSGSRSV1><SONRS><STATUS><CODE>0</CODE><SEVERITY>INFO</SEVERITY></STATUS>",
    `<DTSERVER>${stamp}</DTSERVER><LANGUAGE>ENG</LANGUAGE></SONRS></SIGNONMSGSRSV1>`,
    `<BANKMSGSRSV1><STMTTRNRS><TRNUID>1</TRNUID><STATUS><CODE>0</CODE><SEVERITY>INFO</SEVERITY></STATUS>`,
    `<STMTRS><CURDEF>${meta.currency}</CURDEF><BANKACCTFROM><BANKID>155000000</BANKID><ACCTID>${meta.accountNumber ?? "UNKNOWN"}</ACCTID><ACCTTYPE>CHECKING</ACCTTYPE></BANKACCTFROM>`,
    `<BANKTRANLIST><DTSTART>${meta.from.slice(0, 10).replace(/-/g, "")}</DTSTART><DTEND>${meta.to.slice(0, 10).replace(/-/g, "")}</DTEND></BANKTRANLIST>`,
    `<LEDGERBAL><BALAMT>${meta.closingBalance.toFixed(2)}</BALAMT><DTASOF>${stamp}</DTASOF></LEDGERBAL>`,
    "</STMTRS></STMTTRNRS></BANKMSGSRSV1>",
    "</OFX>",
  ].join("\n");
}

function csvCell(value: string) {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type StatementFormat = "pdf" | "csv" | "ofx";

/** Builds the file, then hands it to the OS share sheet. */
export async function exportStatement(
  format: StatementFormat,
  transactions: Transaction[],
  meta: StatementMeta,
): Promise<void> {
  const { Platform, Alert, Share } = await import("react-native");
  const slug = meta.accountName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const base = `inveto-${slug}-${meta.to.slice(0, 10)}`;

  if (format === "pdf") {
    const { printToFileAsync } = await import("expo-print");
    const options: FilePrintOptions = {
      html: statementHTML(transactions, meta),
      width: 595.28,
      height: 841.89,
    };
    const { uri } = await printToFileAsync(options);
    const { shareFile } = await import("./share");
    await shareFile(uri, "application/pdf", `Share ${base}.pdf`);
    return;
  }

  const body = format === "csv" ? statementCSV(transactions, meta) : statementOFX(meta);
  const mime = format === "csv" ? "text/csv" : "application/x-ofx";

  if (Platform.OS === "web") {
    await Share.share({ message: body, title: base });
    return;
  }

  const FileSystem = await import("expo-file-system/legacy");
  const uri = `${FileSystem.cacheDirectory}${base}.${format}`;
  await FileSystem.writeAsStringAsync(uri, body, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const available = await (await import("expo-sharing")).isAvailableAsync();
  if (available) {
    const Sharing = await import("expo-sharing");
    await Sharing.shareAsync(uri, {
      mimeType: mime,
      dialogTitle: `Share ${base}.${format}`,
      UTI: format === "csv" ? "public.comma-separated-values-text" : "public.data",
    });
  } else {
    Alert.alert("Saved", `Statement written to ${uri}`);
  }
}
