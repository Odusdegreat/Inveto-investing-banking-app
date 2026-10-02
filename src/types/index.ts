export type Id = string;

export type User = {
  id: Id;
  fullName: string;
  email: string;
  phone: string;
  avatarUri: string | null;
  memberSince: string;
  tier: "standard" | "premium";
  kycVerified: boolean;
};

export type AccountKind = "savings" | "current" | "investment" | "wallet";

export type Account = {
  id: Id;
  name: string;
  kind: AccountKind;
  number: string | null;
  balance: number;
  currency: CurrencyCode;
  interestRate: number | null;
  openedAt: string;
  frozen: boolean;
};

export type CurrencyCode =
  | "USD"
  | "EUR"
  | "GBP"
  | "CAD"
  | "AUD"
  | "JPY"
  | "INR"
  | "NGN"
  | "KES"
  | "ZAR"
  | "GHS";

export type TransactionKind =
  | "card"
  | "transfer"
  | "deposit"
  | "withdrawal"
  | "investment"
  | "dividend"
  | "fee";

export type TransactionStatus = "completed" | "pending" | "failed" | "reversed";

export type TransactionCategory =
  | "food"
  | "shopping"
  | "transport"
  | "utilities"
  | "entertainment"
  | "health"
  | "salary"
  | "transfer"
  | "investment"
  | "other";

export type Transaction = {
  id: Id;
  accountId: Id;
  title: string;
  description: string;
  amount: number;
  currency: CurrencyCode;
  kind: TransactionKind;
  category: TransactionCategory;
  status: TransactionStatus;
  createdAt: string;
  counterparty: string | null;
  reference: string;
  cardLast4: string | null;
};

export type CardBrand = "visa" | "mastercard" | "amex" | "paystack" | "bank";

export type PaymentCard = {
  id: Id;
  brand: CardBrand;
  label: string;
  last4: string;
  expiry: string;
  holder: string;
  isDefault: boolean;
  frozen: boolean;
  addedAt: string;
};

export type NotificationKind =
  | "transaction"
  | "security"
  | "investment"
  | "system"
  | "promo";

export type AppNotification = {
  id: Id;
  kind: NotificationKind;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  href: string | null;
};

export type AssetClass =
  | "treasury"
  | "equity"
  | "etf"
  | "crypto"
  | "fixed-deposit";

export type InvestmentProduct = {
  id: Id;
  ticker: string;
  name: string;
  assetClass: AssetClass;
  currency: CurrencyCode;
  price: number;
  previousClose: number;
  yieldPercent: number;
  risk: "low" | "medium" | "high";
  provider: string;
  description: string;
};

export type Holding = {
  id: Id;
  productId: Id;
  units: number;
  averageCost: number;
  addedAt: string;
};

export type WatchlistItem = {
  productId: Id;
  addedAt: string;
};

export type InvestmentOrder = {
  id: Id;
  productId: Id;
  side: "buy" | "sell";
  units: number;
  price: number;
  total: number;
  fee: number;
  status: "filled" | "pending" | "cancelled";
  createdAt: string;
};

export type Device = {
  id: Id;
  name: string;
  platform: "ios" | "android" | "web";
  lastActiveAt: string;
  current: boolean;
  trusted: boolean;
};

export type SecurityState = {
  pinSet: boolean;
  twoFactorEnabled: boolean;
  biometricsEnabled: boolean;
  biometricsType: "face" | "fingerprint" | "iris" | "none";
  autoLockSeconds: number;
  transactionAlerts: boolean;
  loginAlerts: boolean;
  emailTransactionAlerts: boolean;
  emailLoginAlerts: boolean;
  emailSecurityAlerts: boolean;
  emailMarketing: boolean;
};

export type Preferences = {
  currency: CurrencyCode;
};

export type Beneficiary = {
  id: Id;
  name: string;
  bank: string;
  accountNumber: string;
  createdAt: string;
};

export type TransferDraft = {
  beneficiaryId: Id;
  amount: number;
  currency: CurrencyCode;
  note: string;
  fromAccountId: Id;
};

export type TransferReceipt = {
  id: Id;
  reference: string;
  amount: number;
  fee: number;
  currency: CurrencyCode;
  beneficiaryName: string;
  fromAccountId: Id;
  createdAt: string;
  status: TransactionStatus;
};

export type SandboxTopUp = {
  id: Id;
  accountId: Id;
  amount: number;
  currency: CurrencyCode;
  status: "completed" | "pending" | "failed";
  createdAt: string;
};

export type TransferQuote = {
  fee: number;
  currency: CurrencyCode;
  estimatedArrival: string;
};

export type ReceivingDetails = {
  accountId: Id;
  accountName: string;
  bankName: string;
  accountNumber: string;
  accountType: string;
  routingNumber?: string;
  swiftCode?: string;
  iban?: string;
};

export type Recipient = {
  id: Id;
  name: string;
  bank: string;
  accountNumber: string;
  accountId: Id;
};

export type SandboxTransfer = {
  id: Id;
  fromAccountId: Id;
  recipientAccountId: Id;
  amount: number;
  fee: number;
  currency: CurrencyCode;
  note: string;
  status: TransactionStatus;
  createdAt: string;
  reference: string;
};

export type ExternalBank = {
  id: Id;
  code: string;
  name: string;
  country: string;
  currency: CurrencyCode;
  minAmount: number;
  maxAmount: number;
};

export type ExternalTransferQuote = {
  fee: number;
  total: number;
  sufficientFunds: boolean;
};

export type ExternalTransferStatus = "completed" | "pending" | "failed";

export type ExternalTransfer = {
  id: Id;
  userId: Id;
  fromAccountId: Id;
  externalBankId: Id;
  accountNumber: string;
  accountName: string;
  amount: number;
  fee: number;
  total: number;
  status: ExternalTransferStatus;
  bankCode: string;
  bankName: string;
  version: number;
  createdAt: string;
  settledAt: string | null;
  cancelledAt: string | null;
  reference: string;
  debitedAmount: number;
  simulated: boolean;
};

export type ExternalTransferCreateInput = {
  fromAccountId: Id;
  externalBankId: Id;
  accountNumber: string;
  accountName: string;
  amount: number;
  stepUpToken: string;
  simulationOutcome?: "completed" | "pending" | "failure";
  note?: string;
};

export type ExternalTransferCancelInput = {
  version?: number;
};

export type ExternalTransferCancelResponse = {
  status: "cancelled";
  refundedAmount: number;
  version: number;
};

export type ExternalTransferListParams = {
  search?: string;
  limit?: number;
  before?: string;
};
