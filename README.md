# INVETO

A mobile banking and investing app, built with Expo and Expo Router.

The backend is not connected yet. Every screen runs against a local mock API
that persists to device storage, so the full product can be explored end to end
before any server exists.

## What works today

**Auth** — sign in, sign up, forgot password, with the session token held in the
device keystore and the root layout gating the app on session state.

**Step-up confirmation** — a 4-digit transaction PIN that re-confirms identity
for one sensitive action. It is **not** a sign-in credential. The app has no PIN
sign-in; a wrong PIN can never produce a session.

**Banking** — multi-account balances, full transaction history with filters,
transaction detail with shareable receipts, and transfers to saved beneficiaries
with live fee calculation, balance validation, and haptics.

**Investing** — product catalogue with asset-class filters, watchlist, portfolio
value and all-time gain, and a buy/sell ticket that settles against the seeded
price and updates holdings and wallet balance.

**Cards** — add, freeze, and remove cards. Brands render as local SVG marks, so
nothing depends on a remote image host.

**Security** — change PIN, change password, biometric unlock, 2FA toggle, and
per-device session revocation. Turning a control off requires the transaction
PIN; turning one on does not.

**Everything else** — notification inbox with read state, profile editing,
light/dark/system theming, and a searchable help centre.

## Demo credentials

| Field    | Value              |
| -------- | ------------------ |
| Email    | `odue@inveto.app`  |
| Password | any 6+ characters  |

The transaction PIN is `1234`. It confirms sensitive actions, not sign-in.

## Stack

| Technology | Purpose |
| --- | --- |
| Expo SDK 57 / React Native 0.86 | App runtime |
| Expo Router | File-based routing and auth gating |
| TypeScript | Type safety |
| Zustand | Session and theme state |
| React Hook Form + Zod | Auth and profile forms |
| Expo Secure Store | Session token storage |
| Expo Local Authentication | Biometric unlock |
| AsyncStorage | Mock API persistence |
| Reanimated | Tab and chart animation |

Styling is plain `StyleSheet` against design tokens in `src/theme`, so tokens
and light/dark themes apply consistently across every screen. There is no CSS
or utility-class layer: `babel.config.js` and `metro.config.js` only handle
`babel-preset-expo` and `react-native-svg-transformer`.

## Layout

```
app/                    routes (thin wrappers, no business logic)
  (auth)/               sign in, sign up, forgot
  (main)/               the five tab screens
pin.tsx                 step-up PIN confirmation (modal, signed-in only)
src/
  api/                  mock API and seed data
  components/           shared UI primitives
  hooks/                data-fetching hook
  lib/                  formatting
  screens/              screen implementations
  store/                session store
  theme/                tokens and theme provider
  types/                shared types
components/BottomNav.tsx custom tab bar
babel.config.js         babel-preset-expo only
metro.config.js         expo default config + SVG transformer
```

## Running it

```sh
npm install
npm run start
```

Other commands:

```sh
npm run typecheck   # tsc --noEmit
npm run lint        # expo lint
```

After changing dependencies, restart Metro with the cache cleared:

```sh
npx expo start --clear
```

## Swapping in a real backend

`src/api/client.ts` is the only module that touches data. Its read and write
helpers resolve against an in-memory object hydrated from AsyncStorage, and
`subscribe` notifies screens to refetch. Replace those two helpers with real
requests; the signature of every endpoint in `api` stays the same, so screens
and hooks need no changes. The mock delays 180–400ms per call, so loading and
error states are already exercised.

## Currency

Amounts are not hardcoded to a single country. Each account, transaction, and
product carries its own `CurrencyCode`, and the whole app falls back to
`DEFAULT_CURRENCY` (USD) before the database hydrates. Users can switch the
display currency in Settings, which re-denominates the seeded balances so the
UI stays internally consistent.

The symbol map lives in `src/lib/currency.ts`. Adding a currency is one entry
there plus one line in the `CurrencyCode` union in `src/types/index.ts`. This is
a display setting, not FX conversion — a real backend would do the conversion
and persist a home currency per user.

## Notes

- The floating blue gear is an Expo development-client control, not app UI.
- Card numbers are never stored: only brand, last four digits, expiry, and a
  nickname are kept.
- Mock data lives under the `inveto.db.v2` key. Bump `DB_KEY` in
  `src/api/client.ts` whenever the seed shape changes, so existing installs
  discard stale data instead of merging it.
- `npm audit` still reports transitive advisories from the Expo toolchain. They
  are not reachable from app code but are worth clearing before release.
