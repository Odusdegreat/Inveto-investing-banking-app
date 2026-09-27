import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  seedAccounts,
  seedBeneficiaries,
  seedCards,
  seedDevices,
  seedHoldings,
  seedNotifications,
  seedOrders,
  seedPreferences,
  seedProducts,
  seedSecurity,
  seedTransactions,
  seedUser,
} from "./seed";
import { currencySymbol } from "@/src/lib/currency";
import type {
  Account,
  AppNotification,
  Beneficiary,
  CardBrand,
  CurrencyCode,
  Device,
  Holding,
  Id,
  InvestmentOrder,
  InvestmentProduct,
  PaymentCard,
  Preferences,
  SecurityState,
  Transaction,
  User,
  WatchlistItem,
} from "@/src/types";

const DB_KEY = "inveto.db.v2";

export type Database = {
  user: User;
  accounts: Account[];
  transactions: Transaction[];
  cards: PaymentCard[];
  notifications: AppNotification[];
  products: InvestmentProduct[];
  holdings: Holding[];
  orders: InvestmentOrder[];
  watchlist: WatchlistItem[];
  beneficiaries: Beneficiary[];
  devices: Device[];
  security: SecurityState;
  preferences: Preferences;
  pinHash: string | null;
};

function createDatabase(): Database {
  return {
    user: { ...seedUser },
    accounts: seedAccounts.map((a) => ({ ...a })),
    transactions: seedTransactions.map((t) => ({ ...t })),
    cards: seedCards.map((c) => ({ ...c })),
    notifications: seedNotifications.map((n) => ({ ...n })),
    products: seedProducts.map((p) => ({ ...p })),
    holdings: seedHoldings.map((h) => ({ ...h })),
    orders: seedOrders.map((o) => ({ ...o })),
    watchlist: [],
    beneficiaries: seedBeneficiaries.map((b) => ({ ...b })),
    devices: seedDevices.map((d) => ({ ...d })),
    security: { ...seedSecurity },
    preferences: { ...seedPreferences },
    pinHash: simpleHash(DEMO_PIN),
  };
}

let db: Database | null = null;
let hydrated: Promise<Database> | null = null;
const listeners = new Set<() => void>();
export class ApiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}

async function persist() {
  if (!db) return;
  try {
    await AsyncStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch {
    // storage is best-effort; the in-memory db still works
  }
}

function emit() {
  listeners.forEach((fn) => fn());
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function hydrate(): Promise<Database> {
  if (hydrated) return hydrated;
  hydrated = (async () => {
    try {
      const raw = await AsyncStorage.getItem(DB_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Database;
        db = { ...createDatabase(), ...parsed };
      } else {
        db = createDatabase();
        await persist();
      }
    } catch {
      db = createDatabase();
    }
    return db!;
  })();
  return hydrated;
}

function requireDb(): Database {
  if (!db) {
    throw new ApiError("not_hydrated", "Database has not been hydrated yet");
  }
  return db;
}

export async function resetDatabase() {
  db = createDatabase();
  await persist();
  emit();
}

const delay = () =>
  new Promise<void>((resolve) => setTimeout(resolve, 180 + Math.random() * 220));

async function read<T>(fn: (database: Database) => T | Promise<T>): Promise<T> {
  await hydrate();
  await delay();
  return fn(requireDb());
}

async function write<T>(fn: (database: Database) => T | Promise<T>): Promise<T> {
  await hydrate();
  await delay();
  const result = await fn(requireDb());
  await persist();
  emit();
  return result;
}

function simpleHash(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return `h${Math.abs(hash).toString(36)}`;
}

export const DEMO_PIN = "1234";

/**
 * Step-up tokens are deliberately kept in memory only and never persisted:
 * they are short-lived proof that the user re-authenticated for one sensitive
 * action, so writing them to AsyncStorage would defeat the purpose.
 *
 * NOTE: `randomToken` is Math.random-based and is NOT cryptographically safe.
 * The real backend must issue these server-side and treat them as single-use,
 * short-expiry, action-scoped credentials.
 */
const stepUpTokens = new Map<string, { expiresAt: number }>();

const STEP_UP_TTL_MS = 2 * 60 * 1000;

function randomToken() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function issueStepUpToken() {
  const token = `su_${randomToken()}`;
  stepUpTokens.set(token, { expiresAt: Date.now() + STEP_UP_TTL_MS });
  return token;
}

/**
 * Validates a step-up token without consuming it, returning a `consume` handle.
 *
 * Validation is deliberately separate from consumption so a token is only
 * burned once the action has actually succeeded. A 2-minute window is short: a
 * user whose transfer bounced for insufficient funds, or whose new password
 * was rejected, should not have to re-enter their PIN over an unrelated
 * failure.
 */
function claimStepUp(token: string | undefined): { consume: () => void } {
  if (!token) {
    throw new ApiError(
      "step_up_required",
      "Confirm with your transaction PIN to continue",
    );
  }
  const record = stepUpTokens.get(token);
  if (!record) {
    throw new ApiError("invalid_step_up", "Your confirmation expired. Try again.");
  }
  if (record.expiresAt < Date.now()) {
    stepUpTokens.delete(token);
    throw new ApiError("invalid_step_up", "Your confirmation expired. Try again.");
  }
  return {
    consume: () => {
      stepUpTokens.delete(token);
    },
  };
}

/** Single-use: `claimStepUp` guarantees the token is deleted on success. */
function withStepUp<T>(token: string | undefined, action: () => T): T {
  const claim = claimStepUp(token);
  const result = action();
  claim.consume();
  return result;
}

export const api = {
  auth: {
    signIn: (email: string, password: string) =>
      read((database) => {
        const user = database.user;
        if (user.email.toLowerCase() !== email.trim().toLowerCase()) {
          throw new ApiError("invalid_credentials", "No account with that email");
        }
        if (password.length < 6) {
          throw new ApiError(
            "invalid_credentials",
            "Password must be at least 6 characters",
          );
        }
        return { user, token: simpleHash(`${user.id}:${email}`) };
      }),

    requestPasswordReset: (email: string) =>
      read(() => {
        void email;
        return { sent: true };
      }),

    changePassword: (current: string, next: string, stepUpToken?: string) =>
      write(() =>
        withStepUp(stepUpToken, () => {
          if (current.length < 6) {
            throw new ApiError(
              "weak_password",
              "Current password is incorrect",
            );
          }
          if (next.length < 6) {
            throw new ApiError(
              "weak_password",
              "New password must be at least 6 characters",
            );
          }
          return { ok: true as const };
        }),
      ),

    verifyPin: (pin: string) =>
      write((database) => {
        if (database.pinHash !== simpleHash(pin)) {
          throw new ApiError("invalid_pin", "That PIN is not correct");
        }
        // A step-up token, not a session. This does NOT sign the user in.
        return {
          ok: true,
          stepUpToken: issueStepUpToken(),
          expiresIn: STEP_UP_TTL_MS / 1000,
        };
      }),

    /**
     * Biometric step-up: the caller has already proven possession of the
     * enrolled biometric via `expo-local-authentication`, so this issues a
     * step-up token directly.
     *
     * It deliberately does NOT take a PIN. The obvious shortcut — re-sending
     * the user's PIN once the fingerprint check passes — is wrong: it means the
     * secret leaves the device on every biometric confirmation, so biometrics
     * stop being a way to avoid re-entering the secret and become a slower way
     * to type it. See docs/BACKEND_REQUIREMENTS.md §0.5 for the production
     * equivalent (a device-bound key assertion, not a PIN replay).
     */
    verifyBiometric: () =>
      write((database) => {
        if (!database.security.biometricsEnabled) {
          throw new ApiError(
            "biometrics_disabled",
            "Turn on biometric unlock in Security settings first",
          );
        }
        return {
          ok: true,
          stepUpToken: issueStepUpToken(),
          expiresIn: STEP_UP_TTL_MS / 1000,
        };
      }),

    setPin: (pin: string, stepUpToken?: string) =>
      write((database) =>
        withStepUp(stepUpToken, () => {
          if (!/^\d{4}$/.test(pin)) {
            throw new ApiError("weak_pin", "Your PIN must be 4 digits");
          }
          database.pinHash = simpleHash(pin);
          return { ok: true as const };
        }),
      ),
  },

  user: {
    get: () => read((database) => database.user),
    update: (patch: Partial<User>) =>
      write((database) => {
        database.user = { ...database.user, ...patch };
        return database.user;
      }),
  },

  accounts: {
    list: () => read((database) => database.accounts),
    get: (id: Id) =>
      read((database) => {
        const account = database.accounts.find((a) => a.id === id);
        if (!account) throw new ApiError("not_found", "Account not found");
        return account;
      }),
    setFrozen: (id: Id, frozen: boolean) =>
      write((database) => {
        const account = database.accounts.find((a) => a.id === id);
        if (!account) throw new ApiError("not_found", "Account not found");
        account.frozen = frozen;
        return account;
      }),
    totalBalance: () =>
      read((database) =>
        database.accounts.reduce((sum, a) => sum + a.balance, 0),
      ),
  },

  transactions: {
    list: (accountId?: Id) =>
      read((database) =>
        [...database.transactions]
          .filter((t) => !accountId || t.accountId === accountId)
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          ),
      ),
    get: (id: Id) =>
      read((database) => {
        const txn = database.transactions.find((t) => t.id === id);
        if (!txn) throw new ApiError("not_found", "Transaction not found");
        return txn;
      }),
    report: (id: Id, reason: string) =>
      write((database) => {
        const txn = database.transactions.find((t) => t.id === id);
        if (!txn) throw new ApiError("not_found", "Transaction not found");
        database.notifications.unshift({
          id: `ntf_${Date.now().toString(36)}`,
          kind: "security",
          title: "Dispute opened",
          body: `We are looking into "${txn.title}". Reference ${txn.reference}.`,
          createdAt: new Date().toISOString(),
          read: false,
          href: null,
        });
        return { reason, reference: txn.reference, openedAt: new Date().toISOString() };
      }),
  },

  cards: {
    list: () => read((database) => database.cards),
    add: (input: {
      brand: CardBrand;
      label: string;
      last4: string;
      expiry: string;
      holder: string;
    }) =>
      write((database) => {
        const card: PaymentCard = {
          id: `crd_${Date.now().toString(36)}`,
          ...input,
          isDefault: database.cards.length === 0,
          frozen: false,
          addedAt: new Date().toISOString(),
        };
        database.cards.push(card);
        return card;
      }),
    setDefault: (id: Id) =>
      write((database) => {
        database.cards.forEach((c) => {
          c.isDefault = c.id === id;
        });
        return database.cards;
      }),
    setFrozen: (id: Id, frozen: boolean) =>
      write((database) => {
        const card = database.cards.find((c) => c.id === id);
        if (!card) throw new ApiError("not_found", "Card not found");
        card.frozen = frozen;
        return card;
      }),
    freezeAll: (frozen: boolean) =>
      write((database) => {
        database.cards.forEach((card) => {
          card.frozen = frozen;
        });
        return database.cards;
      }),
    remove: (id: Id) =>
      write((database) => {
        const wasDefault = database.cards.find((c) => c.id === id)?.isDefault;
        database.cards = database.cards.filter((c) => c.id !== id);
        if (wasDefault && database.cards.length > 0) {
          database.cards[0].isDefault = true;
        }
        return database.cards;
      }),
  },

  transfers: {
    send: (input: {
      beneficiaryId: Id;
      fromAccountId: Id;
      amount: number;
      fee: number;
      note: string;
      stepUpToken?: string;
    }) => {
      const stepUp = claimStepUp(input.stepUpToken);
      const receipt = write((database) => {
        const beneficiary = database.beneficiaries.find(
          (b) => b.id === input.beneficiaryId,
        );
        if (!beneficiary) {
          throw new ApiError("not_found", "Beneficiary not found");
        }

        const account = database.accounts.find(
          (a) => a.id === input.fromAccountId,
        );
        if (!account) throw new ApiError("not_found", "Account not found");
        if (account.frozen) {
          throw new ApiError("account_frozen", "This account is frozen");
        }
        if (input.amount <= 0) {
          throw new ApiError("invalid_amount", "Enter an amount above zero");
        }
        const total = input.amount + input.fee;
        if (account.balance < total) {
          throw new ApiError(
            "insufficient_funds",
            "Your balance is too low for this transfer",
          );
        }

        account.balance = Number((account.balance - total).toFixed(2));

        const reference = `INV-${new Date().getFullYear()}-${Math.floor(
          Math.random() * 900000 + 100000,
        )}`;

        database.transactions.unshift({
          id: `txn_${Date.now().toString(36)}`,
          accountId: account.id,
          title: `Transfer to ${beneficiary.name}`,
          description: input.note || `To ${beneficiary.bank}`,
          amount: -input.amount,
          currency: account.currency,
          kind: "transfer",
          category: "transfer",
          status: "completed",
          createdAt: new Date().toISOString(),
          counterparty: beneficiary.name,
          reference,
          cardLast4: null,
        });

        if (input.fee > 0) {
          database.transactions.unshift({
            id: `txn_${Date.now().toString(36)}f`,
            accountId: account.id,
            title: "Transfer fee",
            description: "Instant transfer charge",
            amount: -input.fee,
            currency: account.currency,
            kind: "fee",
            category: "other",
            status: "completed",
            createdAt: new Date().toISOString(),
            counterparty: null,
            reference,
            cardLast4: null,
          });
        }

        database.notifications.unshift({
          id: `ntf_${Date.now().toString(36)}`,
          kind: "transaction",
          title: "Transfer sent",
          body: `${currencySymbol(account.currency)}${input.amount.toFixed(2)} to ${beneficiary.name} was successful.`,
          createdAt: new Date().toISOString(),
          read: false,
          href: "/transfer",
        });

        return {
          id: `rcp_${Date.now().toString(36)}`,
          reference,
          amount: input.amount,
          fee: input.fee,
          currency: account.currency,
          beneficiaryName: beneficiary.name,
          fromAccountId: account.id,
          createdAt: new Date().toISOString(),
          status: "completed" as const,
        };
      });
      stepUp.consume();
      return receipt;
    },
  },

  beneficiaries: {
    list: () => read((database) => database.beneficiaries),
    add: (input: { name: string; bank: string; accountNumber: string; stepUpToken?: string }) =>
      write((database) =>
        // Adding a payee is an account-takeover vector, so it is step-up gated.
        withStepUp(input.stepUpToken, () => {
          // Spreading `input` would persist `stepUpToken` alongside the payee.
          const { stepUpToken: _token, ...fields } = input;
          const beneficiary: Beneficiary = {
            id: `ben_${Date.now().toString(36)}`,
            ...fields,
            createdAt: new Date().toISOString(),
          };
          database.beneficiaries.push(beneficiary);
          return beneficiary;
        }),
      ),
    remove: (id: Id) =>
      write((database) => {
        database.beneficiaries = database.beneficiaries.filter(
          (b) => b.id !== id,
        );
        return database.beneficiaries;
      }),
  },

  investing: {
    products: () => read((database) => database.products),
    product: (id: Id) =>
      read((database) => {
        const product = database.products.find((p) => p.id === id);
        if (!product) throw new ApiError("not_found", "Product not found");
        return product;
      }),
    holdings: () => read((database) => database.holdings),
    orders: () => read((database) => database.orders),
    watchlist: () => read((database) => database.watchlist),
    toggleWatchlist: (productId: Id) =>
      write((database) => {
        const exists = database.watchlist.find(
          (w) => w.productId === productId,
        );
        if (exists) {
          database.watchlist = database.watchlist.filter(
            (w) => w.productId !== productId,
          );
          return { watching: false, watchlist: database.watchlist };
        }
        database.watchlist.push({
          productId,
          addedAt: new Date().toISOString(),
        });
        return { watching: true, watchlist: database.watchlist };
      }),
    placeOrder: (input: {
      productId: Id;
      side: "buy" | "sell";
      units: number;
      price: number;
      fee: number;
      stepUpToken?: string;
    }) => {
      const stepUp = claimStepUp(input.stepUpToken);
      const result = write((database) => {
        const product = database.products.find((p) => p.id === input.productId);
        if (!product) throw new ApiError("not_found", "Product not found");

        const order: InvestmentOrder = {
          id: `ord_${Date.now().toString(36)}`,
          productId: input.productId,
          side: input.side,
          units: input.units,
          price: input.price,
          total: Number((input.units * input.price).toFixed(2)),
          fee: input.fee,
          status: "filled",
          createdAt: new Date().toISOString(),
        };
        database.orders.unshift(order);

        const existing = database.holdings.find(
          (h) => h.productId === input.productId,
        );
        if (input.side === "buy") {
          if (existing) {
            const cost = existing.units * existing.averageCost;
            const added = input.units * input.price;
            existing.units = Number((existing.units + input.units).toFixed(6));
            existing.averageCost = Number(
              ((cost + added) / existing.units).toFixed(4),
            );
          } else {
            database.holdings.push({
              id: `hld_${Date.now().toString(36)}`,
              productId: input.productId,
              units: input.units,
              averageCost: input.price,
              addedAt: new Date().toISOString(),
            });
          }
        } else if (existing) {
          existing.units = Number((existing.units - input.units).toFixed(6));
          if (existing.units <= 0) {
            database.holdings = database.holdings.filter(
              (h) => h.id !== existing.id,
            );
          }
        }

        const wallet = database.accounts.find(
          (a) => a.id === "acc_investment",
        );
        if (wallet) {
          const delta =
            input.side === "buy"
              ? -(order.total + order.fee)
              : order.total - order.fee;
          wallet.balance = Number((wallet.balance + delta).toFixed(2));
        }

        return order;
      });
      stepUp.consume();
      return result;
    },
  },

  notifications: {
    list: () => read((database) => database.notifications),
    markRead: (id: Id) =>
      write((database) => {
        const notification = database.notifications.find((n) => n.id === id);
        if (notification) notification.read = true;
        return notification ?? null;
      }),
    markAllRead: () =>
      write((database) => {
        database.notifications.forEach((n) => {
          n.read = true;
        });
        return database.notifications;
      }),
    unreadCount: () =>
      read((database) =>
        database.notifications.filter((n) => !n.read).length,
      ),
  },

  security: {
    get: () => read((database) => database.security),
    update: (patch: Partial<SecurityState>, stepUpToken?: string) => {
      // Turning a control OFF is a security downgrade, so it needs step-up.
      // Turning one on does not, so no PIN prompt appears for it.
      const isDowngrade = (["twoFactorEnabled", "biometricsEnabled"] as const).some(
        (key) => key in patch && patch[key] === false,
      );

      if (isDowngrade) {
        return write((database) => {
          const alreadyOff = (
            ["twoFactorEnabled", "biometricsEnabled"] as const
          ).some((key) => patch[key] === false && !database.security[key]);
          if (alreadyOff) {
            // No real change, so do not spend the user's confirmation.
            database.security = { ...database.security, ...patch };
            return database.security;
          }
          return withStepUp(stepUpToken, () => {
            database.security = { ...database.security, ...patch };
            return database.security;
          });
        });
      }

      return write((database) => {
        database.security = { ...database.security, ...patch };
        return database.security;
      });
    },
    devices: () => read((database) => database.devices),
    revokeDevice: (id: Id) =>
      write((database) => {
        database.devices = database.devices.filter(
          (d) => d.id !== id || d.current,
        );
        return database.devices;
      }),
  },

  preferences: {
    get: () => read((database) => database.preferences),
    /**
     * Changing the display currency re-denominates the seeded balances so the
     * whole app keeps reading in one currency. A real backend would do this
     * with a live FX conversion and persist the user's chosen home currency.
     */
    updateCurrency: (currency: CurrencyCode) =>
      write((database) => {
        if (currency === database.preferences.currency) {
          return database.preferences;
        }
        database.preferences = { ...database.preferences, currency };
        database.accounts = database.accounts.map((account) => ({
          ...account,
          currency,
        }));
        database.transactions = database.transactions.map((transaction) => ({
          ...transaction,
          currency,
        }));
        database.products = database.products.map((product) => ({
          ...product,
          currency,
        }));
        return database.preferences;
      }),
  },
};
