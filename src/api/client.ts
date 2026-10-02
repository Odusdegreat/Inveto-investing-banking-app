import type { Account, AppNotification, Beneficiary, CardBrand, CurrencyCode, Device, ExternalBank, ExternalTransfer, ExternalTransferCancelInput, ExternalTransferCancelResponse, ExternalTransferCreateInput, ExternalTransferListParams, ExternalTransferQuote, Holding, Id, InvestmentOrder, InvestmentProduct, PaymentCard, Preferences, ReceivingDetails, Recipient, SandboxTopUp, SandboxTransfer, SecurityState, Transaction, TransferQuote, TransferReceipt, User, WatchlistItem } from "@/src/types";
import { request, pages, ApiError } from "./http";
import { seedProducts, seedUser, seedAccounts, seedCards, seedTransactions, seedHoldings, seedOrders, seedBeneficiaries, seedNotifications, seedDevices, seedSecurity, seedPreferences } from "./seed";
export { ApiError, hydrate } from "./http";
export type StepUpAction = "transfer" | "investment_order" | "beneficiary_add" | "pin_change" | "password_change" | "security_downgrade" | "biometric_enroll" | "two_factor_setup";
export type BiometricCredential = { id: string; name?: string; deviceType?: string; createdAt?: string; lastUsedAt?: string; backedUp?: boolean };
export type PushRegistration = { id: string; deliveryEnabled: boolean };
export type CardLinkSession = { reference: string; authorizationUrl?: string; authorization_url?: string };
export type BiometricOptions<T> = { challengeToken: string; options: T };
export type SessionResponse = { accessToken?: string; token?: string; refreshToken: string; user?: User };
export type LoginResponse = SessionResponse | { requiresTwoFactor: true; challengeToken: string; expiresIn: number };
const listeners = new Set<() => void>();
export function subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
async function write<T>(path: string, body?: unknown, method = "POST", idempotencyKey?: string): Promise<T> {
  const result = await request<T>(path, { method, body, idempotencyKey });
  listeners.forEach((listener) => listener());
  return result;
}
const id = encodeURIComponent;
type AccountResponse = Omit<Account, "number" | "balance" | "interestRate"> & {
  number?: string | null;
  accountNumber?: string | null;
  balance: number | string;
  interestRate?: number | string | null;
};
function account(value: AccountResponse): Account {
  const balance = typeof value.balance === "string" && value.balance.trim() ? Number(value.balance) : value.balance;
  if (typeof balance !== "number" || !Number.isFinite(balance)) {
    throw new ApiError("invalid_response", "The server returned an invalid account balance.");
  }
  const rate = value.interestRate == null ? null : Number(value.interestRate);
  return { ...value, number: value.number ?? value.accountNumber ?? null, balance, interestRate: rate !== null && Number.isFinite(rate) ? rate : null };
}
type SecurityResponse = Omit<SecurityState, "autoLockSeconds"> & { autoLock?: number; autoLockSeconds?: number };
const securityState = (value: SecurityResponse): SecurityState => ({ ...value, autoLockSeconds: value.autoLock ?? value.autoLockSeconds ?? 60 });
type Notice = Omit<AppNotification, "href"> & { targetType?: string; targetId?: string };
function notification(value: Notice): AppNotification {
  const routes: Record<string, string> = { account: "/accounts", security: "/securitysettings", device: "/securitysettings", card: "/paymentmethods", transfer: "/transactions", investment_order: "/investment-orders" };
  const href = value.targetType === "transaction" && value.targetId ? `/transaction/${id(value.targetId)}` : value.targetType === "investment_product" && value.targetId ? `/invest/${id(value.targetId)}` : routes[value.targetType ?? ""] ?? null;
  return { ...value, href };
}
export const api = {
  auth: {
    signIn: (email: string, password: string) => request<LoginResponse>("/auth/login", { method: "POST", body: { email: email.trim(), password }, public: true }),
    register: (body: { email: string; password: string; fullName: string; phone: string }) => request<SessionResponse>("/auth/register", { method: "POST", body, public: true }),
    verifyTwoFactor: (challengeToken: string, code: string) => request<SessionResponse>("/auth/2fa/login/verify", { method: "POST", body: { challengeToken, code }, public: true }),
    enrollTwoFactor: (password: string, stepUpToken?: string) => request<{ secret?: string; otpauthUrl?: string; uri?: string }>("/auth/2fa/enroll", { method: "POST", body: { password, stepUpToken } }),
    confirmTwoFactor: (code: string) => write("/auth/2fa/confirm", { code }),
    disableTwoFactor: (password: string, code: string, stepUpToken: string) => write("/auth/2fa/disable", { password, code, stepUpToken }),
    logout: () => request<void>("/auth/logout", { method: "POST" }),
    requestPasswordReset: (email: string) => request<void>("/auth/password/reset/request", { method: "POST", body: { email }, public: true }),
    confirmPasswordReset: (token: string, newPassword: string) => request<void>("/auth/password/reset/confirm", { method: "POST", body: { token, newPassword }, public: true }),
    requestEmailVerification: (email: string) => request<void>("/auth/email-verification/request", { method: "POST", body: { email }, public: true }),
    confirmEmailVerification: (token: string) => request<void>("/auth/email-verification/confirm", { method: "POST", body: { token }, public: true }),
    biometricRegistrationOptions: <T,>(stepUpToken?: string) => request<BiometricOptions<T>>("/auth/biometric/registration/options", { method: "POST", body: { stepUpToken } }),
    registerBiometric: (challengeToken: string, response: object) => write("/auth/biometric/registration/verify", { challengeToken, response }),
    biometricChallenge: <T,>(action: StepUpAction) => request<BiometricOptions<T>>("/auth/step-up/biometric/challenge", { method: "POST", body: { action } }),
    verifyBiometric: (challengeToken: string, response: object) => request<{ stepUpToken: string; expiresIn: number }>("/auth/step-up/biometric", { method: "POST", body: { challengeToken, response } }),
    changePassword: (current: string, next: string, stepUpToken?: string) => write("/auth/password/change", { current, next, stepUpToken }),
    verifyPin: (pin: string, action: StepUpAction) => request<{ stepUpToken: string; expiresIn: number }>("/auth/pin/verify", { method: "POST", body: { pin, action } }),
    setupPin: (password: string) => request<{ setupToken: string }>("/auth/pin/setup/verify", { method: "POST", body: { password } }),
    setPin: (pin: string, stepUpToken?: string, setupToken?: string) => write("/auth/pin/set", { pin, confirmPin: pin, stepUpToken, setupToken }),
  },
  user: {
    get: async () => {
      try { return await request<User>("/users/me"); } catch { return seedUser; }
    },
    update: ({ fullName, email, phone }: Partial<User>) => write<User>("/users/me", { fullName, email, phone }, "PATCH"),
  },
  accounts: {
    list: async () => {
      try { return (await request<AccountResponse[]>("/accounts")).map(account); } catch { return seedAccounts; }
    },
    get: async (value: Id) => {
      try { return account(await request<AccountResponse>(`/accounts/${id(value)}`)); } catch { return seedAccounts.find((a) => a.id === value) ?? seedAccounts[0]; }
    },
    setFrozen: async (value: Id, frozen: boolean) => { await write(`/accounts/${id(value)}`, { frozen }, "PATCH"); return api.accounts.get(value); },
    totalBalance: async () => {
      try { return await request<number>("/accounts/total-balance"); } catch { return seedAccounts.reduce((sum, a) => sum + a.balance, 0); }
    },
  },
  transactions: {
    list: async (accountId?: Id) => {
      try { return await pages<Transaction>(`/transactions${accountId ? `?accountId=${id(accountId)}` : ""}`); } catch { return seedTransactions; }
    },
    get: async (value: Id) => {
      try { return await request<Transaction>(`/transactions/${id(value)}`); } catch { return seedTransactions.find((t) => t.id === value) ?? seedTransactions[0]; }
    },
    report: (value: Id, reason: string) => write(`/transactions/${id(value)}/dispute`, { reason }),
  },
cards: {
    initializeLink: (defaultOutcome?: "success" | "failed" | "pending") => request<CardLinkSession>("/demo/card-link/initialize", { method: "POST", body: { defaultOutcome } }),
    confirmLink: (reference: string, simulate?: "success" | "failed" | "pending") => write<PaymentCard>("/demo/card-link/confirm", { reference, simulate }),
    list: async () => {
      try { return await request<PaymentCard[]>("/cards"); } catch { return seedCards; }
    },
    add: (input: { brand: CardBrand; label: string; last4: string; expiry: string; holder: string }) => write<PaymentCard>("/cards", input),
    setDefault: (value: Id) => write(`/cards/${id(value)}/default`, undefined, "PATCH"),
    setFrozen: (value: Id, frozen: boolean) => write(`/cards/${id(value)}`, { frozen }, "PATCH"),
    freezeAll: (frozen: boolean) => write("/cards", { frozen }, "PATCH"),
    remove: (value: Id) => write(`/cards/${id(value)}`, undefined, "DELETE"),
  },
transfers: {
    quote: (fromAccountId: Id, amount: number) => request<{ fee: number }>("/transfers/quote", { method: "POST", body: { fromAccountId, amount } }),
    send: (input: { beneficiaryId: Id; fromAccountId: Id; amount: number; fee?: number; note: string; stepUpToken?: string }, key: string) => write<TransferReceipt>("/transfers", input, "POST", key),
    quoteSandbox: (fromAccountId: Id, amount: number, currency: CurrencyCode) => request<TransferQuote>("/transfers/quote", { method: "POST", body: { fromAccountId, amount, currency } }),
    sendSandbox: (input: { fromAccountId: Id; recipientAccountId: Id; amount: number; currency: CurrencyCode; note: string; stepUpToken?: string }, key: string) => write<SandboxTransfer>("/transfers", input, "POST", key),
    get: (value: Id) => request<SandboxTransfer>(`/transfers/${id(value)}`),
    receipt: (value: Id) => request<TransferReceipt>(`/transfers/${id(value)}/receipt`),
  },
  beneficiaries: {
    list: async () => {
      try { return await request<Beneficiary[]>("/beneficiaries"); } catch { return seedBeneficiaries; }
    },
    add: (input: { name: string; bank: string; accountNumber: string; stepUpToken?: string }) => write<Beneficiary>("/beneficiaries", input),
    remove: (value: Id) => write(`/beneficiaries/${id(value)}`, undefined, "DELETE"),
  },
  investing: {
    products: async () => {
      try {
        return await request<InvestmentProduct[]>("/investments/products");
      } catch {
        return seedProducts;
      }
    },
    product: async (value: Id) => {
      try {
        return await request<InvestmentProduct>(`/investments/products/${id(value)}`);
      } catch {
        return seedProducts.find((p) => p.id === value) ?? seedProducts[0];
      }
    },
    holdings: async () => {
      try { return await request<Holding[]>("/investments/holdings"); } catch { return seedHoldings; }
    },
    order: async (value: Id) => {
      try { return await request<InvestmentOrder>(`/investments/orders/${id(value)}`); } catch { return seedOrders.find((o) => o.id === value) ?? seedOrders[0]; }
    },
    orders: async () => {
      try { return await request<InvestmentOrder[]>("/investments/orders"); } catch { return seedOrders; }
    },
    watchlist: async (): Promise<WatchlistItem[]> => {
      try { return (await request<string[]>("/investments/watchlist")).map((productId) => ({ productId, addedAt: "" })); } catch { return []; }
    },
    toggleWatchlist: async (productId: Id) => {
      const current = await request<string[]>("/investments/watchlist");
      const watching = !current.includes(productId);
      await write(`/investments/watchlist/${id(productId)}`, undefined, watching ? "PUT" : "DELETE");
      return { watching };
    },
    quote: (productId: Id, side: "buy" | "sell", units: number) => request<{ price: number; fee: number; total: number }>("/investments/orders/quote", { method: "POST", body: { productId, side, units } }),
    placeOrder: (input: { productId: Id; side: "buy" | "sell"; units: number; price?: number; fee?: number; stepUpToken?: string }, key: string) => write<InvestmentOrder>("/investments/orders", input, "POST", key),
  },
  notifications: {
    list: async () => {
      try { return (await pages<Notice>("/notifications")).map(notification); } catch { return seedNotifications; }
    },
    markRead: (value: Id) => write(`/notifications/${id(value)}/read`, undefined, "PATCH"),
    markAllRead: () => write("/notifications/read-all", undefined, "PATCH"),
    unreadCount: async () => {
      try { return await request<number>("/notifications/unread-count"); } catch { return seedNotifications.filter((n) => !n.read).length; }
    },
  },
security: {
    biometricCredentials: async () => {
      try { return await request<BiometricCredential[]>("/security/biometric-credentials"); } catch { return []; }
    },
    revokeBiometric: (value: Id, stepUpToken: string) => write(`/security/biometric-credentials/${id(value)}`, { stepUpToken }, "DELETE"),
    registerPush: (provider: "expo" | "fcm" | "apns", token: string) => write<PushRegistration>("/security/push-tokens", { provider, token }),
    removePush: (value: Id) => write(`/security/push-tokens/${id(value)}`, undefined, "DELETE"),
    get: async () => {
      try { return securityState(await request<SecurityResponse>("/security")); } catch { return seedSecurity; }
    },
    update: async (patch: Partial<SecurityState>, stepUpToken?: string) => {
      const { twoFactorEnabled, biometricsEnabled, autoLockSeconds, transactionAlerts, loginAlerts, emailTransactionAlerts, emailLoginAlerts, emailSecurityAlerts, emailMarketing } = patch;
      return securityState(await write<SecurityResponse>("/security", { twoFactorEnabled, biometricsEnabled, autoLock: autoLockSeconds, transactionAlerts, loginAlerts, emailTransactionAlerts, emailLoginAlerts, emailSecurityAlerts, emailMarketing, stepUpToken }, "PATCH"));
    },
    devices: async () => {
      try { return await request<Device[]>("/security/devices"); } catch { return seedDevices; }
    },
    revokeDevice: (value: Id) => write(`/security/devices/${id(value)}`, undefined, "DELETE"),
  },
preferences: {
    get: async () => {
      try { return await request<Preferences>("/preferences"); } catch { return seedPreferences; }
    },
    updateCurrency: (currency: CurrencyCode) => write<Preferences>("/preferences", { currency }, "PATCH"),
  },
  sandbox: {
    topUp: (input: { accountId: Id; amount: number; currency: CurrencyCode }, key: string) => write<SandboxTopUp>("/sandbox/top-ups", input, "POST", key),
    receivingDetails: async (value: Id) => {
      try { return await request<ReceivingDetails>(`/accounts/${id(value)}/receiving-details`); } catch { 
        const acc = seedAccounts.find((a) => a.id === value) ?? seedAccounts[0];
        return { 
          accountId: value, 
          accountName: acc.name, 
          bankName: "INVETO Bank", 
          accountNumber: acc.number ?? "12345678", 
          accountType: acc.kind, 
          routingNumber: "60-00-01", 
          swiftCode: "COBADEFFXXX", 
          iban: "DE89370400440532013000" 
        }; 
      }
    },
    lookupRecipient: async (identifier: string) => {
      try { return await request<Recipient>(`/transfers/recipients/${id(identifier)}`); } catch { return { name: "Demo User", bank: "Demo Bank", accountNumber: "•••• 1234" }; }
    },
  },
  externalTransfers: {
    quote: (input: { fromAccountId: Id; externalBankId: Id; accountNumber: string; amount: number }) => request<ExternalTransferQuote>("/external-transfers/quote", { method: "POST", body: input }),
    create: (input: ExternalTransferCreateInput, idempotencyKey: string) => write<ExternalTransfer>("/external-transfers", input, "POST", idempotencyKey),
    list: (params?: ExternalTransferListParams) => {
      const query = new URLSearchParams();
      if (params?.search) query.set("search", params.search);
      if (params?.limit) query.set("limit", String(params.limit));
      if (params?.before) query.set("before", params.before);
      return pages<ExternalTransfer>(`/external-transfers?${query.toString()}`);
    },
    get: (value: Id) => request<ExternalTransfer>(`/external-transfers/${id(value)}`),
    cancel: (value: Id, input: ExternalTransferCancelInput, idempotencyKey: string) => write<ExternalTransferCancelResponse>(`/external-transfers/${id(value)}/cancel`, input, "POST", idempotencyKey),
    banks: (params?: { search?: string; limit?: number; before?: string }) => {
      const query = new URLSearchParams();
      if (params?.search) query.set("search", params.search);
      if (params?.limit) query.set("limit", String(params.limit));
      if (params?.before) query.set("before", params.before);
      return request<ExternalBank[]>(`/external-banks?${query.toString()}`);
    },
  },
};
