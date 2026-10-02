# INVETO

Mobile banking and investing frontend built with Expo and Expo Router.
The app now calls the HTTP backend; the old local mock database is not used.

## Run locally

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_URL`.
3. Start the backend, then run `npm run start` (or `npm run web`).

```env
EXPO_PUBLIC_API_URL=http://localhost:3000
```

Use your computer's reachable LAN IP instead of localhost on a physical phone.
For the Android emulator, use `http://10.0.2.2:3000`. Restart Metro after changing
configuration. Browser origins must be allowed in the backend's `CORS_ORIGINS`.
Public frontend environment variables must not contain server secrets.

## API integration

`src/api/http.ts` handles bearer tokens, timeouts, structured errors, and a single
shared refresh when concurrent requests receive 401. Native sessions use SecureStore;
web sessions use sessionStorage and survive reloads in the same tab. Old mock tokens
and mock data are ignored. `src/api/client.ts` maps screen operations to the unprefixed
backend routes and adapts watchlists, notification targets, and security preferences.

Registration, login, authenticator challenges, logout, password reset requests,
initial PIN setup, PIN changes, and password changes use server endpoints.
Two-factor enrollment/confirmation/removal use their dedicated endpoints.
Passkey registration and confirmation use WebAuthn on web and the native passkey
adapter on iOS/Android. The server verifies the signed attestation/assertion; a
local biometric check never creates approval tokens.

Transfers and investment orders request a server quote before PIN confirmation.
Displayed pre-confirmation fees are estimates. PIN tokens include the exact action.
The original body and idempotency key are retained for retries while the screen is
mounted; automatic token refresh also retains them. If an outcome is uncertain,
retry on that screen. Pending operations are not persisted across app restarts;
check server transaction/order history before recreating an interrupted operation.

Transactions and notifications follow cursor pagination. Successful mutations notify
mounted screens to reload. Currency preferences no longer relabel stored balances.

## Validation and remaining integration checks

```sh
npm run typecheck
npm run lint
npm run test:api
```

`docs/backend-openapi.json` is a snapshot from the local backend's `/api/docs-json`.
Its request schemas were checked against this integration, but it does not specify
response schemas. Resource responses currently use the existing frontend types;
quote responses expect numeric `fee` and, for investments, `price`. Two-factor setup
accepts `secret`, `otpauthUrl`, or `uri`. Verify these with authenticated backend data.

The backend health and OpenAPI endpoints were reachable during integration. No
account credentials were supplied, so authenticated live flows have not been tested.
The reset/email-verification, Paystack linking, passkey management, push settings,
beneficiary management, and order-history screens are connected. The browser
checks use intercepted API responses and a virtual WebAuthn authenticator; they
do not replace authenticated testing against the live backend. Native permissions
and credential providers still need testing on a physical device.

`docs/BACKEND_REQUIREMENTS.md` describes the earlier mock and is historical context,
not the current frontend implementation. `src/api/seed.ts` is unused fixture data.

## Connected screens

| Screen | Entry point | Backend operations |
| --- | --- | --- |
| Reset password | Forgot password or /reset-password?token=... | Reset confirmation |
| Verify email | Signup, Settings, profile or /verify-email?token=... | Request/resend and confirm |
| Link card | Payment methods | Paystack initialize and confirm |
| Passkeys | Security or Settings | Registration options/verify, list/revoke credentials |
| Confirm action | PIN modal, Use a passkey | Biometric challenge and signed assertion verification |
| Notifications | Inbox or Settings | Device push registration/removal and alert preferences |
| Beneficiaries | Transfer, Manage beneficiaries | List, PIN-confirmed add, remove |
| Investment orders | Invest, View order history | List latest 100 and fetch detail |

Success/error toasts are shared across routes, support dismissal, and announce
messages to assistive technology. Field validation remains inline. Account adapters
accept number/accountNumber, keep missing identifiers explicit, and convert decimal
balance strings before arithmetic; missing account numbers cannot crash the UI.

## Native setup and callbacks

Rebuild the development client after installing the new native dependencies:

```sh
npm run android
# On macOS:
npm run ios
```

- Set EXPO_PUBLIC_PASSKEY_RP_ID to the backend WebAuthn relying-party hostname.
  app.config.js adds the iOS webcredentials association. Host the matching
  apple-app-site-association and Android assetlinks.json files on that domain,
  using your real Apple team ID and Android signing certificate fingerprints.
  Allow the web/native origins in the backend's WebAuthn configuration. No domain
  or signing identity is invented by the app.
- Configure APNs/FCM credentials for the EAS project to obtain Expo push tokens.
  Push settings requests OS permission before registration and persists the
  returned registration ID per account so it can be removed. Backend
  deliveryEnabled=false is displayed as registered but not sending.
- Configure email links to the frontend /reset-password and /verify-email routes,
  with a token query parameter, or use inveto://reset-password and
  inveto://verify-email on mobile. Native aliases for the auth confirmation paths
  are handled in +native-intent.tsx. Tokens can also be pasted into those screens.
- Configure the Paystack return URL to /card-link (web) or inveto://card-link
  (mobile). The backend controls this URL; initialize accepts no client callback
  field. The checkout reference is saved per user. A callback is never treated as
  proof of payment: the user verifies it against /cards/link/confirm. A mismatched
  callback reference cannot confirm a different checkout. Only HTTPS Paystack
  checkout URLs are opened. The endpoint reference specifies Paystack test mode.

Expected response shapes for these flows: biometric options are
{ challengeToken, options }; push registration is { id, deliveryEnabled };
Paystack initialize is { reference, authorizationUrl } (authorization_url is also
accepted). The OpenAPI snapshot currently omits response schemas, so verify these
shapes against your backend deployment.

References: [Expo notifications](https://docs.expo.dev/versions/latest/sdk/notifications/),
[native passkey setup](https://github.com/f-23/react-native-passkey#configuration),
[Expo browser](https://docs.expo.dev/versions/latest/sdk/webbrowser/).
