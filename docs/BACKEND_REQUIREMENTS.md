# INVETO — Mobile App Requirements from the Backend's Point of View

**Source of truth:** this document is generated from the app codebase, not from
design intent. Every endpoint listed exists today in `src/api/client.ts` as a
mock. Field names and enum values are copied verbatim from `src/types/index.ts`
so the backend can match them exactly.

**App stack:** Expo SDK 57 / React Native 0.86, Expo Router, TypeScript.
**Data today:** a single in-memory object hydrated from AsyncStorage under the
key `inveto.db.v2`. No network calls exist yet.

---

## 0. Read this first — five things that will bite you

These are correctness and security issues in the current mock. They are not
bugs to copy; they are things the real backend must do differently.

### 0.1 The mock is not a ledger. Do not port it.

`api.transfers.send` and `api.investing.placeOrder` **mutate `account.balance`
directly**:

```ts
account.balance = Number((account.balance - total).toFixed(2));
```

There is no double-entry, no immutable posting, and no reconciliation. A
transfer debits one account and credits… nothing. Money is created and destroyed
freely.

**The backend needs a real ledger:** an append-only `postings` / `journal_entries`
table where every movement is a balanced set of debits and credits, with
`accounts.balance` maintained as a derived or cached total. If you mirror the
mock's approach you will have no auditable history, which is the entire product.

### 0.2 The client sends the fee. The server must recompute it.

The app computes fees locally and submits them as trusted input:

| Flow | Rate | Floor | Where |
| --- | --- | --- | --- |
| Transfer | 0.75% | min 1, max 18 | `app/transfer.tsx` |
| Buy order | 0.75% | min 1 | `app/invest/[id].tsx` |
| Sell order | 0.5% | min 1 | `app/invest/[id].tsx` |

`api.transfers.send({ ..., fee })` and `api.investing.placeOrder({ ..., fee })`
both accept a client-supplied fee. **Never trust it.** The server must own fee
calculation and reject or overwrite the client value. Also note the transfer cap
is a flat `18` with no currency qualifier, which is already a latent bug once
currencies differ.

### 0.3 The client generates IDs and references

`Date.now().toString(36)`, `Math.random()`:

```ts
id: `txn_${Date.now().toString(36)}`
reference: `INV-${year}-${Math.floor(Math.random() * 900000 + 100000)}`
```

Both are guessable and collide under load. **Server-generated IDs only.** Use
UUIDv7 or ULID so IDs sort by creation time, which the app's date-descending
transaction lists will benefit from.

### 0.4 Password and PIN handling is a mock and must be replaced wholesale

Current behaviour, all local:

- `api.auth.signIn` accepts **any password of 6+ characters** for a known email.
- PIN is stored as `simpleHash(pin)` — a 31-multiplier rolling int hash. It is
  not a password hash and is trivially reversible by brute force over 10,000
  possibilities.
- `api.auth.changePassword` never checks the *current* password, only that it is
  6+ characters.
- `api.auth.verifyPin` compares against a local hash with **no rate limit, no
  attempt counter, and no lockout**.
- `pinHash` lives in the same database blob as the balances.

**Backend must own:** Argon2id (or bcrypt) for passwords, a separate
rate-limited PIN verification store, and a device-bound token scheme.

### 0.5 The PIN is step-up confirmation, NOT a sign-in credential

**Decided: the PIN never authenticates a session.** It re-confirms identity for
one already-authenticated sensitive action. A correct PIN must never return a
session token, and there must be no PIN sign-in path.

The flow is a **single-use, short-expiry, action-scoped token**:

```
Client                          Backend
  |  POST /pin/verify { pin }     |
  |------------------------------>|
  |  { stepUpToken, expiresIn }   |   token bound to user + action, TTL ~2 min
  |                               |
  |  POST /transfers { ..., stepUpToken }
  |------------------------------>|
  |                               |   validates + CONSUMES token, then acts
```

**The backend must consume the token on first use.** A reusable step-up token is
just a second session token, and reusing it across two transfers means one PIN
entry authorises two payments. Delete on use, reject on replay.

**Actions that require step-up** (enforced in the mock, mirror this exactly):

| Action | Endpoint | Notes |
| --- | --- | --- |
| Send money | `POST /transfers` | always |
| Buy / sell investments | `POST /investments/orders` | always |
| Change PIN | `POST /auth/pin` | confirm screen collects the *current* PIN |
| Change password | `POST /auth/password/change` | |
| Add a payee | `POST /beneficiaries` | account-takeover vector |
| Turn **off** 2FA | `PATCH /security` | downgrade only |
| Turn **off** biometric unlock | `PATCH /security` | downgrade only |

Turning a security control **on** does not require step-up — only downgrades do.
`PATCH /security` should therefore require the token conditionally: only when
the patch flips `twoFactorEnabled` or `biometricsEnabled` from `true` to `false`.

Biometrics are a **second, equivalent way to satisfy the same step-up**, not a
shortcut around the PIN. The mock exposes `POST /auth/step-up/biometric`, which
issues a step-up token directly once the device has proven the enrolled
biometric.

**Do not implement biometrics by re-sending the PIN.** The tempting shortcut is
to call `LocalAuthentication.authenticateAsync()` and then POST the user's PIN
to `/auth/pin/verify`. That is wrong: it pushes the secret to the server on
every biometric confirmation, so biometrics stop being a way to avoid re-entering
the secret and become a slower way to type it. The production equivalent is a
device-bound key assertion — WebAuthn/passkey, or an iOS
SecureEnclave key registered against the user — where the backend verifies a
signature and never sees a PIN. The `expo-local-authentication` check itself is
device-local and is not a server-verifiable proof of anything.

Error codes for this flow: `step_up_required` (no token supplied),
`invalid_step_up` (unknown, expired, or already-used token), `invalid_pin`,
`biometrics_disabled` (biometric step-up attempted before enrolment).

### 0.6 `href` on notifications is a client route — do not send routes

`AppNotification.href` currently holds a client route string
(`/transaction/txn_1`, `/securitysettings`). The backend should **not** emit
routing. Send a typed discriminator and let the client own the mapping:

```json
{ "kind": "transaction", "targetType": "transaction", "targetId": "txn_1" }
```

This keeps deep-link paths out of your database and lets the app change routes
without a backend migration.

---

## 1. Complete list of screens and features

20 screens. Routes are Expo Router file paths.

### 1.1 Authentication (unauthenticated)

| Route | Screen | Purpose |
| --- | --- | --- |
| `/(auth)/signin` | Sign in | Email + password, link to PIN |
| `/(auth)/signup` | Create account | Registration |
| `/(auth)/forgot` | Reset password | Email → reset link, resend |
| `/(auth)/pin` | Transaction PIN | 4-digit keypad, biometric unlock |

### 1.2 Main tabs (authenticated)

| Route | Screen | Purpose |
| --- | --- | --- |
| `/(main)/home` | Home | Balances, quick actions, recent activity, unread alerts |
| `/(main)/investing` | Investing | Product catalogue, filters, watchlist, portfolio value |
| `/(main)/dashboard` | Dashboard | Net worth, 7-day net-flow chart, monthly summary |
| `/(main)/notification` | Alerts | Notification summary by category |
| `/(main)/user` | Profile | Identity, account metrics, navigation, sign out |

### 1.3 Detail and settings

| Route | Screen | Purpose |
| --- | --- | --- |
| `/accounts` | Accounts | All accounts, total, freeze |
| `/transactions` | Transactions | Full history, category filters, in/out totals |
| `/transaction/[id]` | Transaction detail | Receipt, share, dispute |
| `/transfer` | Send money | Beneficiary, amount, fee, note, receipt |
| `/invest/[id]` | Product detail | Buy/sell ticket, owned units |
| `/notifications` | Notification inbox | Full list, mark read |
| `/paymentmethods` | Cards | Add, freeze, set default, remove |
| `/securitysettings` | Security | PIN, password, 2FA, biometrics, devices |
| `/editprofile` | Edit profile | Name, email, phone |
| `/settings` | Settings | Theme, display currency, security, support, sign out |
| `/helpsupport` | Help | FAQ search, contact links |
| `/privacy` | Privacy | Static policy text |

**Not implemented, but referenced by the UI — see §11.**

---

## 2. User types and roles

**There are no roles in the app today.** Do not build a permissions system yet.

The only user-level attribute that varies is `User.tier: "standard" | "premium"`.
It is **display-only** — it appears in the Profile screen and changes nothing
about what the user can do. There is no admin surface, no staff role, no
merchant role, and no authorization checks anywhere in the codebase.

Every user in the current mock is the same seeded person (`odue@inveto.app`).
The database holds exactly one `User`.

**What the backend needs now:** single-role consumer banking customer, plus an
internal notion of "support agent" for dispute handling. Do not model roles
until the product has a reason to.

**Future roles worth leaving room for** (do not build now): investment adviser
who manages client portfolios, and back-office reconciliation.

---

## 3. Data each screen needs from the backend

### 3.1 Home

Needs: total cash balance across accounts, unread notification count, most
recent ~5 transactions, portfolio value, and the signed-in user's display name.
Single aggregated call preferred — currently four separate fetches.

### 3.2 Accounts

Needs: all accounts with balance, currency, kind, masked number, interest rate,
frozen state. Client computes the total by summing, which will drift from a true
ledger total — consider returning a server-computed total.

### 3.3 Transactions

Needs: paginated, date-descending, filterable by account, category, and kind.
Client currently receives the **entire** history and filters in memory. This
must become server-side filtering and pagination.

Client needs two aggregate figures the mock computes locally: money-in and
money-out totals.

### 3.4 Transaction detail

Needs the full transaction plus enough to build a shareable receipt:
`reference`, `createdAt`, `amount`, `currency`, `counterparty`, `cardLast4`,
`kind`, `status`. The client builds the receipt text itself, so the fields must
stay human-readable rather than pre-formatted.

### 3.5 Transfer

Needs: source accounts with balances, saved beneficiaries, a fee quote, and
sufficient-funds validation.

**A fee-quote endpoint is worth having.** The app currently hardcodes the fee
schedule; if the backend owns fees, the client needs
`POST /transfers/quote` returning the fee for a given amount and currency.

### 3.6 Investing

Needs: product catalogue with live price, previous close, yield, risk band,
provider; the user's holdings with units and average cost; portfolio market
value; all-time gain; watchlist.

**Prices are currently static seed data.** `previousClose` exists only so the UI
can show a day change. The backend needs a pricing source.

### 3.7 Dashboard

Needs: daily net flow for the last 7 days, month-to-date inflow/outflow/net, and
spending grouped by category for the month. Currently derived client-side from
the full transaction list — this should be a server aggregate.

### 3.8 Cards

Needs: brand, last four, expiry, nickname, holder, default flag, frozen state.
**The app never stores a full card number** — by design, only `last4` is
persisted. Adding a card currently accepts a number typed in the app and throws
everything away but the last four. There is **no tokenization**, so this is not
a real card-linking flow.

### 3.9 Security

Needs: PIN set state, 2FA state, biometric preference, auto-lock timeout,
transaction/login alert toggles, and a device list with revocation.

Device records carry `current: boolean` and `trusted: boolean`. The client
refuses to revoke the current device.

### 3.10 Profile / Settings / Support / Privacy

Profile needs the user record. Settings needs theme preference (**device-local,
not backend**) and display currency (**backend**). Support and Privacy are
static content with no backend dependency.

---

## 4. Forms and all submitted fields

### 4.1 Sign up — `POST /auth/register`

| Field | Type | Validation |
| --- | --- | --- |
| `fullName` | string | required, non-empty |
| `email` | string | required, email format, must be unique |
| `phone` | string | required, E.164-ish (`+1 555 010 2288`) |
| `password` | string | required, UI hints 8+ characters |

The UI shows **no** password confirmation field, no terms acceptance, and no
email verification step. See §11 for what this implies.

### 4.2 Sign in — `POST /auth/login`

| Field | Type |
| --- | --- |
| `email` | string |
| `password` | string |

### 4.3 Forgot password — `POST /auth/password-reset/request`

| Field | Type |
| --- | --- |
| `email` | string |

Resend uses the same payload. The screen has a success state showing the
entered address, so the response need not echo it.

### 4.4 Transaction PIN (step-up) — `POST /auth/step-up/verify`

| Field | Type |
| --- | --- |
| `pin` | string, exactly 4 digits, numeric keypad |

Returns `{ ok, stepUpToken, expiresIn }`. The token is then passed to whichever
sensitive endpoint is being confirmed. See §0.5.

There is **no PIN sign-in** and no `password` field on this endpoint.

### 4.4b Biometric step-up — `POST /auth/step-up/biometric`

No PIN field. Verifies a device-bound key assertion and returns the same
`{ ok, stepUpToken, expiresIn }` shape. Rejects with `biometrics_disabled` if the
user has no credential registered.

### 4.5 Edit profile — `PATCH /users/me`

| Field | Type | Notes |
| --- | --- | --- |
| `fullName` | string | |
| `email` | string | validated |
| `phone` | string | validated |

The screen uses one `Controller` wrapping all three fields, so treat them as a
single partial update.

### 4.6 Transfer — `POST /transfers`

| Field | Type | Notes |
| --- | --- | --- |
| `beneficiaryId` | string | required |
| `fromAccountId` | string | required |
| `amount` | number | > 0 |
| `fee` | number | **client-supplied — recompute server-side** |
| `note` | string | optional, free text, becomes the transaction description |
| `stepUpToken` | string | **required** — single-use, see §0.5 |

### 4.7 Add beneficiary — `POST /beneficiaries`

| Field | Type |
| --- | --- |
| `name` | string |
| `bank` | string |
| `accountNumber` | string |
| `stepUpToken` | string | **required** — account-takeover vector |

No beneficiary name verification. **There is no add-payee UI yet**, so this
endpoint is unused today — but the token requirement is already enforced in the
mock so the contract is correct when the screen lands.

### 4.8 Add card — `POST /cards`

| Field | Type | Notes |
| --- | --- | --- |
| `brand` | enum | `visa \| mastercard \| amex \| paystack \| bank` |
| `label` | string | user nickname |
| `last4` | string | derived from the entered number |
| `expiry` | string | `MM/YY` |
| `holder` | string | **currently hardcoded server-side to `"ODUE ASARE"` — see §11** |

### 4.9 Place investment order — `POST /investments/orders`

| Field | Type | Notes |
| --- | --- | --- |
| `productId` | string | required |
| `side` | enum | `buy \| sell` |
| `units` | number | for sells, must not exceed owned units |
| `price` | number | client-quoted; **server must re-price** |
| `fee` | number | client-supplied — recompute |
| `stepUpToken` | string | **required** — see §0.5 |

### 4.10 Report a transaction problem — `POST /transactions/:id/disputes`

| Field | Type | Notes |
| --- | --- | --- |
| `reason` | enum | `not_recognised \| wrong_amount` |

Currently fires an `Alert` with two hardcoded options and stores no record.
A dispute needs a real table with a status and resolution workflow.

### 4.11 Change password — `POST /auth/password/change`

| Field | Type |
| --- | --- |
| `current` | string |
| `next` | string |
| `stepUpToken` | string | **required** |

### 4.12 Set/change PIN — `POST /auth/pin`

| Field | Type |
| --- | --- |
| `pin` | string, 4 digits |
| `stepUpToken` | string | **required** — the confirm screen collects the *current* PIN |

The UI has a new-PIN and confirm-PIN step, so the client may submit two calls.
Prefer a single `pin` + `confirmPin` payload.

The app blocks setting the PIN to `1234` (the demo value) with a client-side
check. That is a mock affordance and should not exist in production.

---

## 5. Actions by resource

| Resource | Actions the app performs |
| --- | --- |
| **Auth** | register, login, request password reset, verify PIN, set PIN, change password, sign out (client-side token delete) |
| **User** | read self, update self |
| **Accounts** | list, get one, freeze/unfreeze, read total balance |
| **Transactions** | list (filter by account), get one, report/dispute |
| **Transfers** | create (send money), get receipt |
| **Beneficiaries** | list, create, delete |
| **Cards** | list, create, set default, freeze/unfreeze one, freeze/unfreeze all, delete |
| **Investments** | list products, get product, list holdings, list orders, list/toggle watchlist, place order |
| **Notifications** | list, mark one read, mark all read, unread count |
| **Security** | read state, update state, list devices, revoke device |
| **Preferences** | read, update display currency |

**No delete anywhere except** beneficiary and card removal. Accounts,
transactions, orders, and devices are never deleted by the app — devices are
revoked, accounts are frozen. Model that as state, not deletion.

**No approve/pending workflow exists** in the app despite
`InvestmentOrder.status: "filled" | "pending" | "cancelled"` and
`TransactionStatus: "completed" | "pending" | "failed" | "reversed"`. Every
order is created already `filled`. The enums anticipate a pending state the
client cannot yet represent.

---

## 6. Existing endpoints — the integration contract

These exist today as mock functions. The backend should implement equivalents
with these names and shapes, and the mobile swap is a single-file change in
`src/api/client.ts` (see §12).

### Auth
| Mock | Purpose |
| --- | --- |
| `auth.signIn(email, password)` | → `{ user, token }` |
| `auth.requestPasswordReset(email)` | → `{ sent: true }` |
| `auth.changePassword(current, next, stepUpToken)` | → `{ ok: true }` |
| `auth.verifyPin(pin)` | → `{ ok, stepUpToken, expiresIn }` — **step-up only** |
| `auth.verifyBiometric()` | → `{ ok, stepUpToken, expiresIn }` — **step-up only** |
| `auth.setPin(pin, stepUpToken)` | → `{ ok: true }` |

### User
`user.get()` → `User` · `user.update(patch)` → `User`

### Accounts
`accounts.list()` · `accounts.get(id)` · `accounts.setFrozen(id, frozen)` · `accounts.totalBalance()`

### Transactions
`transactions.list(accountId?)` · `transactions.get(id)` · `transactions.report(id, reason)`

### Transfers
`transfers.send(input)` → `TransferReceipt` — requires `stepUpToken`

### Beneficiaries
`beneficiaries.list()` · `beneficiaries.add(input)` — requires `stepUpToken` · `beneficiaries.remove(id)`

### Cards
`cards.list()` · `cards.add(input)` · `cards.setDefault(id)` · `cards.setFrozen(id, frozen)` · `cards.freezeAll(frozen)` · `cards.remove(id)`

### Investments
`investing.products()` · `investing.product(id)` · `investing.holdings()` · `investing.orders()` · `investing.watchlist()` · `investing.toggleWatchlist(productId)` · `investing.placeOrder(input)` — requires `stepUpToken`

### Notifications
`notifications.list()` · `notifications.markRead(id)` · `notifications.markAllRead()` · `notifications.unreadCount()`

### Security
`security.get()` · `security.update(patch, stepUpToken?)` — token required only for downgrades · `security.devices()` · `security.revokeDevice(id)`

### Preferences
`preferences.get()` · `preferences.updateCurrency(currency)`

### Error contract

`ApiError` carries a machine-readable `code` and a human-readable `message`:

```ts
class ApiError extends Error { code: string; message: string }
```

Codes currently thrown: `invalid_credentials`, `weak_password`, `weak_pin`,
`invalid_pin`, `biometrics_disabled`, `not_found`, `account_frozen`,
`invalid_amount`, `insufficient_funds`, `step_up_required`, `invalid_step_up`.

**The backend should return these codes verbatim** — the app surfaces `message`
directly to the user, so messages must be user-safe and free of internals.

---

## 7. Authentication flow

### Current implementation

Token in `expo-secure-store` under `inveto.session.token`. Zustand store with
`status: "loading" | "signed-out" | "signed-in"`, hydrated once at app launch in
`app/_layout.tsx`. Sign-out deletes the token locally; **the server is never
told**, so tokens cannot be revoked server-side.

Sign-in returns `{ user, token }` and the token is a hash of `user.id:email`.
It is not a real session token.

### What the backend needs

1. `POST /auth/register` → create user, send verification email, return
   `{ user, token }` or a pending-verification state.
2. `POST /auth/login` → `{ accessToken, refreshToken, user }`.
   **Refresh tokens are essential** — banking sessions outlive app restarts.
3. `POST /auth/password-reset/request` → always 200, never leak whether the
   email exists.
4. `POST /auth/password-reset/confirm` → `{ token, newPassword }`.
5. **`POST /auth/step-up/verify` → `{ stepUpToken, expiresIn }`.** Step-up only —
   never returns a session. Rate-limited, attempt-counted, lockout after N. See
   §0.5 for the full contract.
6. **`POST /auth/step-up/biometric` → `{ stepUpToken, expiresIn }`.** Issues the
   same step-up token without a PIN. Production implementation must verify a
   device-bound key assertion, never a PIN replay — see §0.5.
7. `POST /auth/pin` → requires a step-up token; the confirm screen supplies the
   user's *current* PIN.
8. `POST /auth/logout` → revoke the refresh token server-side. **The app must be
   changed to call this**; today it only deletes locally.
9. `POST /auth/refresh` → rotate tokens.

**There is deliberately no `POST /auth/pin/login`.** If a PIN sign-in endpoint
is ever added, it will be a security regression, not a feature.

### Not implemented anywhere — decide before building

- **Email verification.** Sign-up shows a "check your inbox" state but nothing
  verifies anything.
- **OTP / 2FA codes.** The 2FA toggle flips a boolean. No code is ever sent,
  entered, or validated. `POST /auth/otp/verify` does not exist.
- **Google / Apple sign-in.** No OAuth dependency, no `expo-auth-session`, no
  social buttons in the UI.
- **Biometrics are one of two step-up paths.** `expo-local-authentication`
  checks the fingerprint/face, then the client calls `auth.verifyBiometric` to
  get a step-up token. The server is not involved in proving the fingerprint —
  the local check is not a server-verifiable proof. Production must verify a
  device-bound key assertion instead. See §0.5.

---

## 8. What to store per user

`User` as the app defines it — this is the minimum:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | server-generated |
| `fullName` | string | |
| `email` | string | unique, indexed |
| `phone` | string | |
| `avatarUri` | string \| null | **always `null`** — no upload UI exists |
| `memberSince` | ISO 8601 | set at registration |
| `tier` | enum | `standard \| premium`, cosmetic |
| `kycVerified` | boolean | **always `true`** in seed — no KYC flow exists |
| `currency` | ISO 4217 | via `preferences`; display only |

**The backend needs far more than the app displays:**

- password hash (never returned to client)
- email verified state + verification token + expiry
- PIN hash, attempt counter, lockout-until
- refresh token(s) with device binding
- failed-login counter, last-login IP/timestamp
- KYC status — the app shows a verified badge, so a real flow needs a status
  enum, document type, submitted-at, reviewed-at. Do not ship `kycVerified: true`
  as a constant.

**Never return to the client:** password hash, PIN hash, token internals,
failed-attempt counters.

---

## 9. Product / inventory fields

Not a retail inventory — this is an **investment product catalogue**. There is no
SKU, quantity, or image on products.

`InvestmentProduct`:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | |
| `ticker` | string | display symbol, e.g. `T-BILL-91`, `BTC` |
| `name` | string | |
| `assetClass` | enum | `treasury \| equity \| etf \| crypto \| fixed-deposit` |
| `currency` | ISO 4217 | pricing currency |
| `price` | number | current |
| `previousClose` | number | drives day-change % |
| `yieldPercent` | number | annualised |
| `risk` | enum | `low \| medium \| high` |
| `provider` | string | issuer / venue / custodian |
| `description` | string | long-form, shown on detail screen |

`Holding` — `id`, `productId`, `units`, `averageCost`, `addedAt`

`InvestmentOrder` — `id`, `productId`, `side` (`buy|sell`), `units`, `price`,
`total`, `fee`, `status` (`filled|pending|cancelled`), `createdAt`

**Backend additions the app will need:** a price history / time-series table
(the chart and day-change need it), a market-calendar or pricing-timestamp
field so stale prices are visible, and product availability/tradable-hours.

**The `yieldPercent` on a treasury bill is quoted as an annual rate but priced
per 100 face value** — the app shows both, which is confusing without
denominating clearly. Worth a `faceValue` or `priceUnit` field.

---

## 10. Notifications, payments, reports

### Notifications

`AppNotification`: `id`, `kind` (`transaction|security|investment|system|promo`),
`title`, `body`, `createdAt`, `read`, `href`.

Needed from the backend:
- per-user notification list, paginated
- unread count
- mark one / mark all read
- **push delivery** (FCM/APNs). The app has **no push setup at all** — no
  `expo-notifications`, no device-token registration. Alerts are in-app only.
  This is a gap, not a feature.
- `href` should become typed targeting — see §0.5.

### Payments

**There is no payment integration.** No Stripe, no Paystack, no mobile-money SDK.
`CardBrand` includes `"paystack"` as a literal string but nothing calls it.

"Payments" today means: a `POST /transfers` that moves a number between two
mock accounts. There is no:
- external bank transfer / rails integration
- card authorization or tokenization
- mobile money (MoMo) collection or payout
- bill payment, despite `category: "utilities"`
- direct debit or standing order
- payee account verification

A real transfer needs a payment-rail abstraction, async status transitions, and
webhooks. The `pending` status in `TransactionStatus` exists for this.

### Reports

No report generation exists. The app can **share a transaction receipt** as
plain text via the OS share sheet. If you want downloadable PDF statements,
that is net-new work on both sides.

### Aggregates the client computes today (move server-side)

- 7-day daily net flow
- month-to-date inflow / outflow / net
- spending by category
- portfolio market value and all-time gain
- account total balance
- money-in / money-out totals

---

## 11. What works on mock data vs. what is not built

**Everything works on mock data.** There are zero network calls. What follows is
what the mock *fakes* versus what a backend must genuinely implement.

### Fully functional against mock data (replace wholesale)

Sign in · sign up · forgot password · transaction-PIN step-up confirmation ·
biometric unlock · profile read/update · account list and totals · freeze account ·
transaction list, filter, detail · transfer with fee and balance validation ·
receipt and share · beneficiary add/list/remove · card add/list/freeze/default/
remove · product catalogue and detail · watchlist · buy and sell orders ·
holdings and gain · notification list, read state, unread count · security
preferences · device list and revoke · display currency · theme (device-local).

### Simulated — UI exists, no real behaviour

| Feature | Reality |
| --- | --- |
| Email verification | Sign-up shows "check your inbox"; nothing sends or verifies |
| Password reset | Always returns success; no email, no token, no confirm screen |
| 2FA | Boolean toggle only; no code sent, entered, or checked |
| Biometrics | Device-local only; server never participates |
| Change password | Never validates the current password; no hash is updated |
| Sign-up | Calls `user.update` on the seeded user — **does not create a new account** |
| PIN unlock | Verifies locally, then hydrates; **cannot establish a session when signed out** |
| Card adding | Accepts a number, discards all but last 4; **no tokenization** |
| Card holder | Hardcoded to `"ODUE ASARE"` on add, ignoring user input |
| Transaction disputes | Fires an `Alert`, stores no record, no status |
| KYC badge | `kycVerified` is a constant `true` |
| Avatar | `avatarUri` is always `null`; no upload |
| Tier | Cosmetic; changes no permissions or pricing |
| Push notifications | Not implemented at all |
| "Request" money | Quick action exists but routes to `/transfer`; **no request flow** |
| Market prices | Static seed values, never updated |

### Known gaps to close before or during backend integration

1. **`app/index.tsx` always redirects to `/home`.** The root layout gates route
   groups on session state but performs no explicit redirect. Deep links and
   back-stack entries into protected routes need a real guard.
2. **Sign-up does not create a user.** Must be rebuilt against
   `POST /auth/register`.
3. **PIN cannot sign a user in.** Decide whether PIN is an auth credential or
   only a transaction-confirmation step, then implement accordingly.
4. **One seeded user only.** No multi-user data isolation exists.
5. **Client-side routing in notifications** — see §0.5.
6. **No pagination anywhere.** The app loads entire collections into memory.
7. **Request/receive money is unimplemented.**

---

## 12. How the mobile swap works

`src/api/client.ts` is the only module that touches data. It exposes:

- `read(fn)` — resolve a value from the hydrated object
- `write(fn)` — mutate, persist, then notify subscribers
- `subscribe(fn)` — screens refetch on change
- `api` — the grouped endpoint surface
- Mock calls add a **180–400 ms artificial delay**, so loading and error states
  are already exercised throughout the UI.

`src/hooks/useApi.ts` gives every screen `{ data, loading, error, refreshing,
reload }` and auto-refetches on `subscribe`.

**To integrate:** keep every signature in §6 identical and replace the bodies of
`read`/`write` with HTTP calls. No screen or hook should need to change. Return
the same shapes, use the same `code`/`message` errors, and the app works against
a real backend.

---

## 13. Design and API documentation

- **Figma:** none shared with the codebase. The app is the only design artefact.
- **OpenAPI / API docs:** do not exist. This document plus `src/types/index.ts`
  is the contract.
- **Design tokens:** `src/theme/tokens.ts` — colour palette, radii, spacing, and
  both light and dark `ThemeColors` maps. Useful if a web dashboard or
  marketing site is built later.
- **Currency handling:** `src/lib/currency.ts` — 11 ISO 4217 codes with symbol
  and locale. `preferences.currency` is a **display preference only**; it does
  not convert. Balances are per-account currency. If real multi-currency is
  wanted, FX conversion and a persisted home currency are backend work.
