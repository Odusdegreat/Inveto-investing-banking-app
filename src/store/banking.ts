import { create } from "zustand";

import { toast } from "@/src/components/Toast";
import type { CurrencyCode, Id, TransactionCategory } from "@/src/types";

/**
 * Local domain state for product areas the backend does not expose yet.
 *
 * `docs/backend-openapi.json` has no paths for goals, budgets, bills, payees,
 * loans, KYC, referral, tickets, statements, recurring transfers, search or
 * account opening, so these screens read and write here instead. The shape of
 * every field mirrors what a real endpoint would return, so swapping a screen
 * over to `api.*` is a change of source, not a rewrite of the view.
 */

const DAY = 86_400_000;

/** ISO timestamp `days` in the past. Keeps the seed relative to the clock. */
function ago(days: number, hours = 0) {
  return new Date(Date.now() - days * DAY - hours * 3_600_000).toISOString();
}

/** ISO timestamp `days` in the future. */
function ahead(days: number) {
  return new Date(Date.now() + days * DAY).toISOString();
}

let seq = 0;
function ref(prefix: string) {
  seq += 1;
  return `${prefix}-${Date.now().toString(36)}${seq.toString(36)}`;
}

export type Cadence = "weekly" | "monthly" | "quarterly" | "yearly";

export const CADENCE_LABEL: Record<Cadence, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

export type AccountProduct = {
  id: Id;
  name: string;
  tagline: string;
  kind: "current" | "savings" | "fixed-deposit" | "junior";
  icon: string;
  minimumOpening: number;
  monthlyFee: number;
  interestRate: number;
  features: string[];
  popular?: boolean;
  requiresVerification: boolean;
};

export type ExternalTransfer = {
  id: Id;
  reference: string;
  direction: "inbound" | "outbound";
  counterparty: string;
  bank: string;
  accountNumber: string;
  amount: number;
  currency: CurrencyCode;
  fee: number;
  status: "completed" | "pending" | "failed";
  createdAt: string;
  estimatedArrival: string;
};

export type RecurringTransfer = {
  id: Id;
  name: string;
  to: string;
  toAccount: string;
  amount: number;
  currency: CurrencyCode;
  cadence: Cadence;
  nextRunAt: string;
  endAt: string | null;
  active: boolean;
  createdAt: string;
  runsCompleted: number;
};

export type Payee = {
  id: Id;
  name: string;
  category: "utilities" | "housing" | "lifestyle" | "insurance" | "education" | "other";
  accountNumber: string;
  autopayEnabled: boolean;
  lastPaidAt: string | null;
  icon: string;
};

export type Bill = {
  id: Id;
  payeeId: Id;
  title: string;
  amount: number;
  currency: CurrencyCode;
  dueAt: string;
  paidAt: string | null;
  status: "due" | "scheduled" | "paid" | "overdue";
  reference: string;
  category: TransactionCategory;
};

export type Budget = {
  id: Id;
  category: TransactionCategory;
  label: string;
  limit: number;
  currency: CurrencyCode;
  period: "weekly" | "monthly";
  spent: number;
  icon: string;
};

export type SavingsGoal = {
  id: Id;
  name: string;
  target: number;
  saved: number;
  currency: CurrencyCode;
  targetDate: string;
  monthlyContribution: number;
  icon: string;
  color: "accent" | "info" | "warning" | "danger";
  completed: boolean;
};

export type KycCheck = {
  id: Id;
  title: string;
  description: string;
  status: "verified" | "in-review" | "action-required" | "not-started";
  updatedAt: string | null;
  required: boolean;
  icon: string;
};

export type KycProfile = {
  tier: "tier-1" | "tier-2" | "tier-3";
  verifiedAt: string | null;
  monthlyLimit: number;
  checks: KycCheck[];
};

export type LoanProduct = {
  id: Id;
  name: string;
  tagline: string;
  apr: number;
  minAmount: number;
  maxAmount: number;
  maxTermMonths: number;
  icon: string;
  collateralRequired: boolean;
  requiresVerification: boolean;
  popular?: boolean;
};

export type LoanApplication = {
  id: Id;
  productId: Id;
  amount: number;
  termMonths: number;
  monthlyPayment: number;
  apr: number;
  purpose?: string;
  status: "draft" | "submitted" | "under-review" | "approved" | "rejected" | "disbursed";
  createdAt: string;
  reference: string;
};

export type Referral = {
  code: string;
  link: string;
  invited: { id: Id; name: string; joinedAt: string; status: "joined" | "funded" | "rewarded" }[];
  rewardPerReferral: number;
  balance: number;
  paidOut: number;
  tier: "bronze" | "silver" | "gold";
};

export type Ticket = {
  id: Id;
  reference: string;
  subject: string;
  category: "account" | "transfers" | "cards" | "investing" | "kyc" | "other";
  status: "open" | "awaiting-you" | "resolved";
  priority: "low" | "normal" | "high";
  createdAt: string;
  updatedAt: string;
  messages: { id: Id; from: "you" | "support"; body: string; sentAt: string }[];
};

export type StatementPeriod = {
  id: Id;
  label: string;
  from: string;
  to: string;
  format: "pdf" | "csv" | "ofx";
  accountName: string;
  transactions: number;
  openingBalance: number;
  closingBalance: number;
};

export type CardControls = {
  contactless: boolean;
  onlineTransactions: boolean;
  atmWithdrawal: boolean;
  international: boolean;
  merchantLock: string[];
};

export type SpendingLimit = {
  id: Id;
  label: string;
  limit: number;
  spent: number;
  currency: CurrencyCode;
  period: "daily" | "weekly" | "monthly";
};

export type AdvancedSettings = {
  hideBalances: boolean;
  roundUpSavings: boolean;
  roundUpSavingsAccount: string;
  biometricQuickTransfer: boolean;
  requirePinForTransfers: boolean;
  transferConfirmation: boolean;
  lowBalanceAlerts: boolean;
  lowBalanceThreshold: number;
  marketingPush: boolean;
  dataSaverMode: boolean;
  reduceMotion: boolean;
  autoLockOnBackground: boolean;
  quietHours: boolean;
  quietFrom: string;
  quietTo: string;
};

export type OnboardingStep = {
  id: Id;
  title: string;
  body: string;
  icon: string;
};

export type BankingState = {
  accountProducts: AccountProduct[];
  openedProductId: Id | null;
  externalTransfers: ExternalTransfer[];
  loanProducts: LoanProduct[];
  loanApplications: LoanApplication[];
  recurring: RecurringTransfer[];
  payees: Payee[];
  bills: Bill[];
  budgets: Budget[];
  goals: SavingsGoal[];
  kyc: KycProfile;
  referral: Referral;
  tickets: Ticket[];
  statements: StatementPeriod[];
  cardControls: CardControls;
  spendingLimits: SpendingLimit[];
  settings: AdvancedSettings;
  onboarding: { completed: string[]; dismissed: boolean };

  openAccount: (productId: Id) => void;
  addExternalTransfer: (input: Omit<ExternalTransfer, "id" | "reference" | "createdAt">) => void;
  addRecurring: (input: Omit<RecurringTransfer, "id" | "createdAt" | "runsCompleted">) => void;
  setRecurringActive: (id: Id, active: boolean) => void;
  removeRecurring: (id: Id) => void;
  addPayee: (input: Omit<Payee, "id" | "lastPaidAt">) => void;
  setAutopay: (id: Id, enabled: boolean) => void;
  payBill: (id: Id) => void;
  setBudgetLimit: (id: Id, limit: number) => void;
  addGoal: (input: Omit<SavingsGoal, "id" | "saved" | "completed">) => void;
  contributeToGoal: (id: Id, amount: number) => void;
  applyForLoan: (input: {
    productId: Id;
    amount: number;
    termMonths: number;
    apr: number;
    purpose?: string;
  }) => void;
  submitKyc: (id: Id) => void;
  copyReferral: () => string;
  addTicket: (subject: string, category: Ticket["category"]) => void;
  replyToTicket: (id: Id, body: string) => void;
  setCardControl: <K extends keyof CardControls>(key: K, value: CardControls[K]) => void;
  addSpendingLimit: (input: Omit<SpendingLimit, "id" | "spent">) => void;
  removeSpendingLimit: (id: Id) => void;
  setSetting: <K extends keyof AdvancedSettings>(key: K, value: AdvancedSettings[K]) => void;
  completeOnboardingStep: (id: Id) => void;
  setOnboardingDismissed: (dismissed: boolean) => void;
  resetDemoData: () => void;
};

const ACCOUNT_PRODUCTS: AccountProduct[] = [
  {
    id: "prod-current",
    name: "Current account",
    tagline: "Everyday spending with a debit card",
    kind: "current",
    icon: "wallet-outline",
    minimumOpening: 0,
    monthlyFee: 0,
    interestRate: 0,
    requiresVerification: false,
    features: ["No monthly fee", "Virtual card instantly", "Real-time spending alerts", "Free INVETO to INVETO transfers"],
  },
  {
    id: "prod-savings",
    name: "High-yield savings",
    tagline: "4.20% AER, paid monthly",
    kind: "savings",
    icon: "trending-up-outline",
    minimumOpening: 100,
    monthlyFee: 0,
    interestRate: 4.2,
    requiresVerification: true,
    popular: true,
    features: ["4.20% AER paid monthly", "No withdrawal fees", "Goal-linked saving", "Up to 6 instant withdrawals a month"],
  },
  {
    id: "prod-deposit",
    name: "Fixed-term deposit",
    tagline: "Lock in 5.10% for 12 months",
    kind: "fixed-deposit",
    icon: "lock-closed-outline",
    minimumOpening: 500,
    monthlyFee: 0,
    interestRate: 5.1,
    requiresVerification: true,
    features: ["5.10% AER fixed", "Matures in 12 months", "Early exit at no penalty after 90 days", "Deposit protection up to the statutory limit"],
  },
  {
    id: "prod-junior",
    name: "Junior account",
    tagline: "A first account for under-18s",
    kind: "junior",
    icon: "happy-outline",
    minimumOpening: 0,
    monthlyFee: 0,
    interestRate: 3.1,
    requiresVerification: true,
    features: ["3.10% AER", "Parental spending controls", "No fees at all", "Transfers to INVETO accounts are free"],
  },
];

const EXTERNAL_TRANSFERS: ExternalTransfer[] = [
  {
    id: "ext-1",
    reference: "EXT-9F2K41",
    direction: "inbound",
    counterparty: "Northwind Trading Ltd",
    bank: "Barclays",
    accountNumber: "•••• 8821",
    amount: 4250,
    currency: "USD",
    fee: 0,
    status: "completed",
    createdAt: ago(1, 3),
    estimatedArrival: ago(1, 2),
  },
  {
    id: "ext-2",
    reference: "EXT-3M8T07",
    direction: "outbound",
    counterparty: "Rent — Ferndale Property",
    bank: "Revolut",
    accountNumber: "•••• 4471",
    amount: 1850,
    currency: "USD",
    fee: 4.63,
    status: "completed",
    createdAt: ago(4),
    estimatedArrival: ago(3),
  },
  {
    id: "ext-3",
    reference: "EXT-7P1Q55",
    direction: "inbound",
    counterparty: "Adaeze Okonkwo",
    bank: "Monzo",
    accountNumber: "•••• 2093",
    amount: 320,
    currency: "USD",
    fee: 0,
    status: "pending",
    createdAt: ago(0, 5),
    estimatedArrival: ahead(1),
  },
];

const RECURRING: RecurringTransfer[] = [
  {
    id: "rec-1",
    name: "Salary",
    to: "Meridian Analytics",
    toAccount: "•••• 7742",
    amount: 4200,
    currency: "USD",
    cadence: "monthly",
    nextRunAt: ahead(4),
    endAt: null,
    active: true,
    createdAt: ago(210),
    runsCompleted: 7,
  },
  {
    id: "rec-2",
    name: "Rent",
    to: "Ferndale Property",
    toAccount: "•••• 4471",
    amount: 1850,
    currency: "USD",
    cadence: "monthly",
    nextRunAt: ahead(9),
    endAt: null,
    active: true,
    createdAt: ago(190),
    runsCompleted: 6,
  },
  {
    id: "rec-3",
    name: "Streaming bundle",
    to: "Volt Media",
    toAccount: "•••• 6612",
    amount: 34.99,
    currency: "USD",
    cadence: "monthly",
    nextRunAt: ahead(12),
    endAt: null,
    active: true,
    createdAt: ago(96),
    runsCompleted: 3,
  },
  {
    id: "rec-4",
    name: "Gym membership",
    to: "Ironwood Fitness",
    toAccount: "•••• 3390",
    amount: 52,
    currency: "USD",
    cadence: "monthly",
    nextRunAt: ago(2),
    endAt: ahead(80),
    active: false,
    createdAt: ago(140),
    runsCompleted: 5,
  },
  {
    id: "rec-5",
    name: "Emergency top-up",
    to: "Savings goal: Emergency fund",
    toAccount: "Goal",
    amount: 250,
    currency: "USD",
    cadence: "weekly",
    nextRunAt: ahead(3),
    endAt: null,
    active: true,
    createdAt: ago(60),
    runsCompleted: 8,
  },
];

const PAYEES: Payee[] = [
  { id: "pay-1", name: "Ferndale Property", category: "housing", accountNumber: "•••• 4471", autopayEnabled: true, lastPaidAt: ago(4), icon: "home-outline" },
  { id: "pay-2", name: "Volt Energy", category: "utilities", accountNumber: "•••• 1180", autopayEnabled: true, lastPaidAt: ago(11), icon: "flash-outline" },
  { id: "pay-3", name: "Aqua Utilities", category: "utilities", accountNumber: "•••• 9925", autopayEnabled: false, lastPaidAt: ago(18), icon: "water-outline" },
  { id: "pay-4", name: "Beacon Mobile", category: "utilities", accountNumber: "•••• 5547", autopayEnabled: true, lastPaidAt: ago(6), icon: "phone-portrait-outline" },
  { id: "pay-5", name: "Ironwood Fitness", category: "lifestyle", accountNumber: "•••• 3390", autopayEnabled: false, lastPaidAt: ago(33), icon: "barbell-outline" },
  { id: "pay-6", name: "Sentinel Insurance", category: "insurance", accountNumber: "•••• 7310", autopayEnabled: true, lastPaidAt: ago(21), icon: "shield-checkmark-outline" },
];

const BILLS: Bill[] = [
  { id: "bill-1", payeeId: "pay-1", title: "Monthly rent", amount: 1850, currency: "USD", dueAt: ahead(9), paidAt: null, status: "scheduled", reference: "RNT-2411", category: "utilities" },
  { id: "bill-2", payeeId: "pay-2", title: "Electricity", amount: 142.6, currency: "USD", dueAt: ahead(2), paidAt: null, status: "due", reference: "ELE-88214", category: "utilities" },
  { id: "bill-3", payeeId: "pay-3", title: "Water", amount: 38.4, currency: "USD", dueAt: ago(3), paidAt: null, status: "overdue", reference: "AQU-10422", category: "utilities" },
  { id: "bill-4", payeeId: "pay-4", title: "Mobile plan", amount: 28, currency: "USD", dueAt: ahead(5), paidAt: null, status: "scheduled", reference: "MOB-44910", category: "utilities" },
  { id: "bill-5", payeeId: "pay-6", title: "Contents cover", amount: 21.5, currency: "USD", dueAt: ago(24), paidAt: ago(24), status: "paid", reference: "INS-77310", category: "other" },
  { id: "bill-6", payeeId: "pay-2", title: "Electricity", amount: 156.2, currency: "USD", dueAt: ago(41), paidAt: ago(42), status: "paid", reference: "ELE-86119", category: "utilities" },
];

const BUDGETS: Budget[] = [
  { id: "bud-1", category: "food", label: "Food & Drink", limit: 520, currency: "USD", period: "monthly", spent: 386.4, icon: "restaurant-outline" },
  { id: "bud-2", category: "transport", label: "Transport", limit: 240, currency: "USD", period: "monthly", spent: 168.9, icon: "car-outline" },
  { id: "bud-3", category: "shopping", label: "Shopping", limit: 300, currency: "USD", period: "monthly", spent: 291.15, icon: "bag-handle-outline" },
  { id: "bud-4", category: "entertainment", label: "Entertainment", limit: 180, currency: "USD", period: "monthly", spent: 94.99, icon: "film-outline" },
  { id: "bud-5", category: "health", label: "Health", limit: 150, currency: "USD", period: "monthly", spent: 42, icon: "medkit-outline" },
  { id: "bud-6", category: "utilities", label: "Utilities", limit: 400, currency: "USD", period: "monthly", spent: 372.6, icon: "flash-outline" },
];

const GOALS: SavingsGoal[] = [
  { id: "goal-1", name: "Emergency fund", target: 10000, saved: 6240, currency: "USD", targetDate: ahead(280), monthlyContribution: 350, icon: "umbrella-outline", color: "accent", completed: false },
  { id: "goal-2", name: "Japan trip", target: 4500, saved: 3120, currency: "USD", targetDate: ahead(190), monthlyContribution: 420, icon: "airplane-outline", color: "info", completed: false },
  { id: "goal-3", name: "New laptop", target: 1800, saved: 1800, currency: "USD", targetDate: ahead(-12), monthlyContribution: 150, icon: "laptop-outline", color: "warning", completed: true },
  { id: "goal-4", name: "Course fees", target: 1200, saved: 310, currency: "USD", targetDate: ahead(75), monthlyContribution: 200, icon: "school-outline", color: "danger", completed: false },
];

const KYC: KycProfile = {
  tier: "tier-1",
  verifiedAt: ago(280),
  monthlyLimit: 5000,
  checks: [
    { id: "kyc-1", title: "Identity document", description: "Passport or driving licence, checked against registry data.", status: "verified", updatedAt: ago(280), required: true, icon: "card-outline" },
    { id: "kyc-2", title: "Proof of address", description: "Utility bill or bank statement from the last 3 months.", status: "verified", updatedAt: ago(280), required: true, icon: "home-outline" },
    { id: "kyc-3", title: "Selfie check", description: "A quick liveness check that the ID matches your face.", status: "verified", updatedAt: ago(280), required: true, icon: "scan-outline" },
    { id: "kyc-4", title: "Source of funds", description: "Needed to lift your monthly transfer limit above $5,000.", status: "not-started", updatedAt: null, required: false, icon: "cash-outline" },
    { id: "kyc-5", title: "Tax residency", description: "Confirms which tax rules apply to your interest and investment income.", status: "in-review", updatedAt: ago(2), required: false, icon: "receipt-outline" },
  ],
};

const REFERRAL: Referral = {
  code: "INV-YUSUF24",
  link: "https://inveto.app/join/INV-YUSUF24",
  invited: [
    { id: "ref-1", name: "Adaeze Okonkwo", joinedAt: ago(45), status: "rewarded" },
    { id: "ref-2", name: "Tomás Ferreira", joinedAt: ago(20), status: "funded" },
    { id: "ref-3", name: "Priya Raman", joinedAt: ago(6), status: "joined" },
  ],
  rewardPerReferral: 25,
  balance: 50,
  paidOut: 25,
  tier: "silver",
};

const TICKETS: Ticket[] = [
  {
    id: "tkt-1",
    reference: "INV-40219",
    subject: "Card payment declined at a restaurant",
    category: "cards",
    status: "awaiting-you",
    priority: "normal",
    createdAt: ago(5),
    updatedAt: ago(2),
    messages: [
      { id: "m-1", from: "you", body: "My card was declined twice at a restaurant last night. It worked fine the day before.", sentAt: ago(5) },
      { id: "m-2", from: "support", body: "Thanks for flagging this. I can see two declines on card ending 4417, both for online authorisation. Can you confirm the last four digits on the physical card?", sentAt: ago(2) },
    ],
  },
  {
    id: "tkt-2",
    reference: "INV-39884",
    subject: "Savings interest rate increase",
    category: "account",
    status: "resolved",
    priority: "low",
    createdAt: ago(38),
    updatedAt: ago(36),
    messages: [
      { id: "m-3", from: "you", body: "Will my savings rate go up when the base rate changes?", sentAt: ago(38) },
      { id: "m-4", from: "support", body: "Good news — your rate tracks the base rate with a two-week lag, so the last change is already reflected. No action needed.", sentAt: ago(36) },
    ],
  },
  {
    id: "tkt-3",
    reference: "INV-41002",
    subject: "Beneficiary name not matching",
    category: "transfers",
    status: "open",
    priority: "high",
    createdAt: ago(1, 4),
    updatedAt: ago(1, 4),
    messages: [
      { id: "m-5", from: "you", body: "A transfer to Ade Okonkwo was returned with 'name mismatch'. The bank shows the name as 'A. Okonkwo'.", sentAt: ago(1, 4) },
    ],
  },
];

const STATEMENTS: StatementPeriod[] = [
  { id: "stm-1", label: "October 2026", from: ago(30), to: ago(0), format: "pdf", accountName: "Everyday current", transactions: 84, openingBalance: 5120.4, closingBalance: 6348.2 },
  { id: "stm-2", label: "September 2026", from: ago(61), to: ago(31), format: "pdf", accountName: "Everyday current", transactions: 71, openingBalance: 4890.15, closingBalance: 5120.4 },
  { id: "stm-3", label: "August 2026", from: ago(92), to: ago(62), format: "pdf", accountName: "Everyday current", transactions: 96, openingBalance: 4210, closingBalance: 4890.15 },
  { id: "stm-4", label: "October 2026", from: ago(30), to: ago(0), format: "pdf", accountName: "High-yield savings", transactions: 3, openingBalance: 5812.6, closingBalance: 6240 },
  { id: "stm-5", label: "Q3 2026", from: ago(190), to: ago(92), format: "csv", accountName: "Everyday current", transactions: 251, openingBalance: 3680.2, closingBalance: 4210 },
];

const CARD_CONTROLS: CardControls = {
  contactless: true,
  onlineTransactions: true,
  atmWithdrawal: true,
  international: false,
  merchantLock: ["Casino and gaming", "Adult entertainment"],
};

const SPENDING_LIMITS: SpendingLimit[] = [
  { id: "lim-1", label: "Card · 4417", limit: 1200, spent: 412.3, currency: "USD", period: "monthly" },
  { id: "lim-2", label: "Card · 9002", limit: 250, spent: 41, currency: "USD", period: "weekly" },
];

const SETTINGS: AdvancedSettings = {
  hideBalances: false,
  roundUpSavings: true,
  roundUpSavingsAccount: "Everyday current",
  biometricQuickTransfer: true,
  requirePinForTransfers: true,
  transferConfirmation: true,
  lowBalanceAlerts: true,
  lowBalanceThreshold: 100,
  marketingPush: false,
  dataSaverMode: false,
  reduceMotion: false,
  autoLockOnBackground: true,
  quietHours: false,
  quietFrom: "22:00",
  quietTo: "07:00",
};

const ONBOARDING_STEPS: OnboardingStep[] = [
  { id: "ob-1", title: "Add money to get started", body: "Top up by bank transfer, card or from another INVETO account. Your first deposit clears instantly from an INVETO account.", icon: "download-outline" },
  { id: "ob-2", title: "Order your free debit card", body: "Virtual cards are ready straight away, and a physical card ships in 3 working days with no fee.", icon: "card-outline" },
  { id: "ob-3", title: "Set up a standing order", body: "Automate rent, subscriptions or a weekly saving habit. You can pause or cancel any time without a fee.", icon: "repeat-outline" },
  { id: "ob-4", title: "Create a savings goal", body: "Name a goal, set a target date, and we will work out what you need to save each month to get there.", icon: "flag-outline" },
  { id: "ob-5", title: "Check your verification", body: "Tier 1 verification lifts you to $5,000 a month. Adding a source of funds unlocks higher limits and our savings rates.", icon: "shield-checkmark-outline" },
];

const LOAN_PRODUCTS: LoanProduct[] = [
  {
    id: "loan-1",
    name: "Personal loan",
    tagline: "Unsecured, fixed rate for 3 years",
    apr: 11.9,
    minAmount: 1000,
    maxAmount: 25000,
    maxTermMonths: 36,
    icon: "cash-outline",
    collateralRequired: false,
    requiresVerification: false,
    popular: true,
  },
  {
    id: "loan-2",
    name: "Salary advance",
    tagline: "Up to 60% of your next paycheque",
    apr: 0,
    minAmount: 200,
    maxAmount: 5000,
    maxTermMonths: 1,
    icon: "flash-outline",
    collateralRequired: false,
    requiresVerification: true,
  },
  {
    id: "loan-3",
    name: "Secured loan",
    tagline: "Borrow against your savings balance",
    apr: 6.4,
    minAmount: 5000,
    maxAmount: 60000,
    maxTermMonths: 60,
    icon: "lock-closed-outline",
    collateralRequired: true,
    requiresVerification: true,
  },
];

const LOAN_APPLICATIONS: LoanApplication[] = [
  {
    id: "app-seed-1",
    productId: "loan-1",
    amount: 5000,
    termMonths: 24,
    monthlyPayment: 235.4,
    apr: 11.9,
    status: "under-review",
    createdAt: ago(3),
    reference: "LN-7KD2P1",
  },
];

const INITIAL: Omit<BankingState, keyof Actions> = {
  accountProducts: ACCOUNT_PRODUCTS,
  openedProductId: null,
  externalTransfers: EXTERNAL_TRANSFERS,
  loanProducts: LOAN_PRODUCTS,
  loanApplications: LOAN_APPLICATIONS,
  recurring: RECURRING,
  payees: PAYEES,
  bills: BILLS,
  budgets: BUDGETS,
  goals: GOALS,
  kyc: KYC,
  referral: REFERRAL,
  tickets: TICKETS,
  statements: STATEMENTS,
  cardControls: CARD_CONTROLS,
  spendingLimits: SPENDING_LIMITS,
  settings: SETTINGS,
  onboarding: { completed: ["ob-1"], dismissed: false },
};

type Actions = Pick<
  BankingState,
  | "openAccount"
  | "addExternalTransfer"
  | "addRecurring"
  | "setRecurringActive"
  | "removeRecurring"
  | "addPayee"
  | "setAutopay"
  | "payBill"
  | "setBudgetLimit"
  | "addGoal"
  | "contributeToGoal"
  | "applyForLoan"
  | "submitKyc"
  | "copyReferral"
  | "addTicket"
  | "replyToTicket"
  | "setCardControl"
  | "addSpendingLimit"
  | "removeSpendingLimit"
  | "setSetting"
  | "completeOnboardingStep"
  | "setOnboardingDismissed"
  | "resetDemoData"
>;

export const useBanking = create<BankingState>((set, get) => ({
  ...INITIAL,

  openAccount: (productId) => {
    set({ openedProductId: productId });
    const product = get().accountProducts.find((item) => item.id === productId);
    toast.success(`${product?.name ?? "Account"} application started.`);
  },

  addExternalTransfer: (input) => {
    const transfer: ExternalTransfer = {
      ...input,
      id: `ext-${Date.now().toString(36)}`,
      reference: ref("EXT").toUpperCase(),
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ externalTransfers: [transfer, ...state.externalTransfers] }));
    toast.success(
      input.direction === "outbound"
        ? `Transfer sent. ${transfer.reference} is on its way.`
        : "Bank details submitted for verification.",
    );
  },

  addRecurring: (input) => {
    set((state) => ({
      recurring: [
        {
          ...input,
          id: `rec-${Date.now().toString(36)}`,
          createdAt: new Date().toISOString(),
          runsCompleted: 0,
        },
        ...state.recurring,
      ],
    }));
    toast.success("Standing order created.");
  },

  setRecurringActive: (id, active) =>
    set((state) => ({
      recurring: state.recurring.map((item) => (item.id === id ? { ...item, active } : item)),
    })),

  removeRecurring: (id) => {
    set((state) => ({ recurring: state.recurring.filter((item) => item.id !== id) }));
    toast.info("Standing order cancelled.");
  },

  addPayee: (input) => {
    set((state) => ({
      payees: [
        {
          ...input,
          id: `pay-${Date.now().toString(36)}`,
          lastPaidAt: null,
        },
        ...state.payees,
      ],
    }));
    toast.success(`${input.name} added as a payee.`);
  },

  setAutopay: (id, enabled) =>
    set((state) => ({
      payees: state.payees.map((item) => (item.id === id ? { ...item, autopayEnabled: enabled } : item)),
    })),

  payBill: (id) => {
    const bill = get().bills.find((item) => item.id === id);
    set((state) => ({
      bills: state.bills.map((item) =>
        item.id === id ? { ...item, status: "paid", paidAt: new Date().toISOString() } : item,
      ),
    }));
    toast.success(`${bill?.title ?? "Bill"} paid.`);
  },

  setBudgetLimit: (id, limit) =>
    set((state) => ({
      budgets: state.budgets.map((item) => (item.id === id ? { ...item, limit } : item)),
    })),

  addGoal: (input) => {
    set((state) => ({
      goals: [{ ...input, id: `goal-${Date.now().toString(36)}`, saved: 0, completed: false }, ...state.goals],
    }));
    toast.success(`Goal “${input.name}” created.`);
  },

  contributeToGoal: (id, amount) => {
    const goal = get().goals.find((item) => item.id === id);
    if (!goal) return;
    const saved = Math.min(goal.target, goal.saved + amount);
    set((state) => ({
      goals: state.goals.map((item) =>
        item.id === id ? { ...item, saved, completed: saved >= item.target } : item,
      ),
    }));
    toast.success(
      saved >= goal.target ? `“${goal.name}” reached. Nice work.` : `Added to “${goal.name}”.`,
    );
  },

  applyForLoan: ({ productId, amount, termMonths, apr, purpose }) => {
    const application: LoanApplication = {
      id: `app-${Date.now().toString(36)}`,
      productId,
      amount,
      termMonths,
      monthlyPayment: monthlyPayment(amount, apr, termMonths),
      apr,
      purpose: purpose?.trim() || undefined,
      status: "submitted",
      createdAt: new Date().toISOString(),
      reference: ref("LN").toUpperCase(),
    };
    set((state) => ({ loanApplications: [application, ...state.loanApplications] }));
    toast.success(`Application ${application.reference} submitted.`);
  },

  submitKyc: (id) => {
    set((state) => ({
      kyc: {
        ...state.kyc,
        checks: state.kyc.checks.map((check) =>
          check.id === id ? { ...check, status: "in-review", updatedAt: new Date().toISOString() } : check,
        ),
      },
    }));
    toast.success("Check submitted. Most checks clear within one business day.");
  },

  copyReferral: () => get().referral.link,

  addTicket: (subject, category) => {
    const ticket: Ticket = {
      id: `tkt-${Date.now().toString(36)}`,
      reference: ref("INV").toUpperCase(),
      subject,
      category,
      status: "open",
      priority: "normal",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [
        { id: `m-${Date.now().toString(36)}`, from: "you", body: subject, sentAt: new Date().toISOString() },
      ],
    };
    set((state) => ({ tickets: [ticket, ...state.tickets] }));
    toast.success(`Ticket ${ticket.reference} created.`);
  },

  replyToTicket: (id, body) => {
    set((state) => ({
      tickets: state.tickets.map((ticket) =>
        ticket.id === id
          ? {
              ...ticket,
              status: "open",
              updatedAt: new Date().toISOString(),
              messages: [
                ...ticket.messages,
                { id: `m-${Date.now().toString(36)}`, from: "you", body, sentAt: new Date().toISOString() },
              ],
            }
          : ticket,
      ),
    }));
  },

  setCardControl: (key, value) =>
    set((state) => ({ cardControls: { ...state.cardControls, [key]: value } })),

  addSpendingLimit: (input) => {
    set((state) => ({
      spendingLimits: [
        ...state.spendingLimits,
        { ...input, id: `lim-${Date.now().toString(36)}`, spent: 0 },
      ],
    }));
    toast.success("Spending limit added.");
  },

  removeSpendingLimit: (id) =>
    set((state) => ({ spendingLimits: state.spendingLimits.filter((item) => item.id !== id) })),

  setSetting: (key, value) => {
    set((state) => ({ settings: { ...state.settings, [key]: value } }));
  },

  completeOnboardingStep: (id) =>
    set((state) => ({
      onboarding: {
        ...state.onboarding,
        completed: state.onboarding.completed.includes(id)
          ? state.onboarding.completed
          : [...state.onboarding.completed, id],
      },
    })),

  setOnboardingDismissed: (dismissed) =>
    set((state) => ({ onboarding: { ...state.onboarding, dismissed } })),

  resetDemoData: () => {
    set(INITIAL);
    toast.info("Demo data reset.");
  },
}));

export { ONBOARDING_STEPS };

/** Standard amortising instalment, matching what a quote endpoint would return. */
export function monthlyPayment(amount: number, apr: number, termMonths: number) {
  if (termMonths <= 0 || amount <= 0) return 0;
  const r = apr / 100 / 12;
  if (r === 0) return Math.round((amount / termMonths) * 100) / 100;
  const value = (amount * r) / (1 - Math.pow(1 + r, -termMonths));
  return Math.round(value * 100) / 100;
}

/** Total repaid over the whole term, so a screen can show the cost of credit. */
export function totalRepayable(payment: number, termMonths: number) {
  return Math.round(payment * termMonths * 100) / 100;
}
