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
  number: string;
  balance: number;
  currency: CurrencyCode;
  interestRate: number;
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
