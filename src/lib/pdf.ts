import { PrintOptions } from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { Alert, Platform } from "react-native";
import { formatDate, formatMoney, formatTime, CATEGORY_LABEL, STATUS_LABEL } from "./format";
import type { Transaction, CurrencyCode, TransactionCategory, TransactionStatus } from "@/src/types";

export type ReceiptTheme = {
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  border: string;
  accent: string;
  accentPressed: string;
  danger: string;
  dangerSoft: string;
  success: string;
  warning: string;
  warningText: string;
  warningSoft: string;
};

export async function generateTransactionReceipt(html: string): Promise<string | null> {
  const printOptions: PrintOptions = {
    html,
    width: 595.28,
    height: 841.89,
    base64: true,
  };

  try {
    const { printToFileAsync } = await import("expo-print");
    const { base64 } = await printToFileAsync(printOptions);

    const filename = `receipt-${Date.now()}.pdf`;
    const destinationUri = `${FileSystem.cacheDirectory}${filename}`;
    await FileSystem.writeAsStringAsync(destinationUri, base64 || "", {
      encoding: FileSystem.EncodingType.Base64,
    });

    return destinationUri;
  } catch (error) {
    console.error("PDF generation failed:", error);
    Alert.alert("Error", "Failed to generate receipt PDF");
    return null;
  }
}

export function generateReceiptHTML(
  transaction: Transaction,
  userName?: string,
  isDemo = true,
  theme?: ReceiptTheme
): string {
  const incoming = transaction.amount > 0;
  const amountColor = incoming ? "#10B981" : "#EF4444";
  const statusColor = getStatusColor(transaction.status);
  const formattedDate = formatDate(transaction.createdAt);
  const formattedTime = formatTime(transaction.createdAt);
  const categoryLabel = CATEGORY_LABEL[transaction.category as TransactionCategory] || transaction.category;
  const statusLabel = STATUS_LABEL[transaction.status as TransactionStatus] || transaction.status;

  const t = theme ?? {
    background: "#F8FAFC",
    surface: "#FFFFFF",
    text: "#0F172A",
    textMuted: "#64748B",
    textSubtle: "#94A3B8",
    border: "#E2E8F0",
    accent: "#22C55E",
    accentPressed: "#15803D",
    danger: "#EF4444",
    dangerSoft: "rgba(239,68,68,0.12)",
    success: "#22C55E",
    warning: "#F59E0B",
    warningText: "#78350F",
    warningSoft: "rgba(245,158,11,0.12)",
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          background: ${t.background};
          color: ${t.text};
          line-height: 1.5;
        }
        .container {
          max-width: 595.28px;
          margin: 0 auto;
          background: ${t.surface};
          min-height: 841.89px;
        }
        .header {
          background: linear-gradient(135deg, ${t.text} 0%, ${t.textMuted} 100%);
          padding: 40px 32px;
          color: white;
        }
        .logo {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
        }
        .logo-icon {
          width: 48px;
          height: 48px;
          background: white;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .logo-icon svg {
          width: 28px;
          height: 28px;
        }
        .logo-text {
          font-size: 24px;
          font-weight: 800;
          letter-spacing: -0.5px;
        }
        .receipt-title {
          font-size: 18px;
          font-weight: 600;
          opacity: 0.9;
          margin-bottom: 8px;
        }
        .receipt-reference {
          font-size: 14px;
          opacity: 0.7;
          font-family: monospace;
        }
        .amount-section {
          padding: 32px;
          text-align: center;
          border-bottom: 1px solid ${t.border};
        }
        .amount-label {
          font-size: 14px;
          color: ${t.textMuted};
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }
        .amount-value {
          font-size: 48px;
          font-weight: 800;
          color: ${amountColor};
          letter-spacing: -1px;
        }
        .status-badge {
          display: inline-block;
          padding: 8px 16px;
          border-radius: 9999px;
          font-size: 13px;
          font-weight: 600;
          margin-top: 16px;
          background: ${statusColor.bg};
          color: ${statusColor.text};
        }
        .details-section {
          padding: 32px;
        }
        .section-title {
          font-size: 13px;
          font-weight: 700;
          color: ${t.textMuted};
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 20px;
          padding-bottom: 8px;
          border-bottom: 1px solid ${t.border};
        }
        .detail-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .detail-item {
          padding: 16px;
          background: ${t.background};
          border-radius: 12px;
        }
        .detail-label {
          font-size: 12px;
          color: ${t.textMuted};
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }
        .detail-value {
          font-size: 15px;
          font-weight: 600;
          color: ${t.text};
          word-break: break-word;
        }
        .detail-value.mono {
          font-family: monospace;
          font-size: 13px;
        }
        .note-section {
          margin-top: 24px;
          padding: 16px;
          background: ${t.warningSoft};
          border-radius: 12px;
          border-left: 4px solid ${t.warning};
        }
        .note-label {
          font-size: 12px;
          color: ${t.warningText};
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }
        .note-value {
          font-size: 14px;
          color: ${t.warningText};
        }
        .footer {
          padding: 32px;
          text-align: center;
          background: ${t.background};
          border-top: 1px solid ${t.border};
        }
        .footer-text {
          font-size: 13px;
          color: ${t.textMuted};
          margin-bottom: 8px;
        }
        .footer-brand {
          font-size: 16px;
          font-weight: 700;
          color: ${t.text};
        }
        @media print {
          body { background: ${t.surface}; }
          .container { min-height: auto; }
        }
        .demo-watermark {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
          font-size: 120px;
          font-weight: 900;
          color: rgba(0, 0, 0, 0.05);
          pointer-events: none;
          z-index: 9999;
          white-space: nowrap;
          user-select: none;
        }
        .demo-banner {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: ${t.warningSoft};
          border-top: 2px solid ${t.warning};
          padding: 12px;
          text-align: center;
          font-size: 12px;
          font-weight: 700;
          color: ${t.warningText};
          z-index: 9998;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">
            <div class="logo-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="${t.text}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <span class="logo-text">INVETO</span>
          </div>
          <div class="receipt-title">Transaction Receipt</div>
          <div class="receipt-reference">Reference: ${transaction.reference}</div>
        </div>

        <div class="amount-section">
          <div class="amount-label">${incoming ? "Received" : "Sent"}</div>
          <div class="amount-value">${formatMoney(transaction.amount, transaction.currency as CurrencyCode, { sign: true })}</div>
          <span class="status-badge">${statusLabel}</span>
        </div>

        <div class="details-section">
          <div class="section-title">Transaction Details</div>
          <div class="detail-grid">
            <div class="detail-item">
              <div class="detail-label">Category</div>
              <div class="detail-value">${categoryLabel}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Type</div>
              <div class="detail-value">${capitalise(transaction.kind)}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Date</div>
              <div class="detail-value">${formattedDate}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Time</div>
              <div class="detail-value">${formattedTime}</div>
            </div>
            ${transaction.cardLast4 ? `
            <div class="detail-item">
              <div class="detail-label">Paid With</div>
              <div class="detail-value mono">•••• ${transaction.cardLast4}</div>
            </div>
            ` : ""}
            ${transaction.counterparty ? `
            <div class="detail-item">
              <div class="detail-label">Counterparty</div>
              <div class="detail-value">${transaction.counterparty}</div>
            </div>
            ` : ""}
            <div class="detail-item" style="grid-column: span 2;">
              <div class="detail-label">Reference</div>
              <div class="detail-value mono">${transaction.reference}</div>
            </div>
          </div>

          ${transaction.description ? `
          <div class="note-section">
            <div class="note-label">Note</div>
            <div class="note-value">${transaction.description}</div>
          </div>
          ` : ""}
        </div>

        <div class="footer">
          <div class="footer-text">Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</div>
          ${userName ? `<div class="footer-text">Account: ${userName}</div>` : ""}
          <div class="footer-brand">INVETO</div>
          <div class="footer-text" style="margin-top: 16px; font-size: 11px;">This is a digital receipt. No signature required.</div>
        </div>
        ${isDemo ? `
        <div class="demo-watermark">DEMO</div>
        <div class="demo-banner">Simulated payments. No real money is moved.</div>
        ` : ""}
      </div>
    </body>
    </html>
  `;
}

function getStatusColor(status: string): { bg: string; text: string } {
  switch (status) {
    case "completed":
      return { bg: "#D1FAE5", text: "#065F46" };
    case "pending":
      return { bg: "#FEF3C7", text: "#92400E" };
    case "failed":
      return { bg: "#FEE2E2", text: "#991B1B" };
    case "reversed":
      return { bg: "#E0E7FF", text: "#3730A3" };
    default:
      return { bg: "#F1F5F9", text: "#475569" };
  }
}

function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export async function downloadAndShareReceipt(html: string): Promise<void> {
  const pdfUri = await generateTransactionReceipt(html);

  if (!pdfUri) return;

  if (Platform.OS === "web") {
    window.open(pdfUri, "_blank");
    return;
  }

  const isAvailable = await Sharing.isAvailableAsync();

  if (isAvailable) {
    await Sharing.shareAsync(pdfUri, {
      mimeType: "application/pdf",
      dialogTitle: "Save or Share Receipt",
      UTI: ".pdf",
    });
  } else {
    Alert.alert(
      "Receipt Saved",
      `Receipt saved to ${pdfUri}`,
      [{ text: "OK" }]
    );
  }
}