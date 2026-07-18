# satim-node-sdk

> Node.js SDK for the **SATIM** Algerian payment gateway

[![npm version](https://img.shields.io/npm/v/satim-node-sdk.svg)](https://www.npmjs.com/package/satim-node-sdk)
[![CI](https://github.com/khalilbnd/satim-node/actions/workflows/ci.yml/badge.svg)](https://github.com/khalilbnd/satim-node/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)

Typed, zero-dependency (runtime) client for SATIM — Société d'Automatisation des Transactions Interbancaires et de Monétique. Supports CIB and Edahabia payment flows.

---

## Installation

```bash
npm install satim-node-sdk
# or
yarn add satim-node-sdk
# or
pnpm add satim-node-sdk
```

**Requires Node.js 18+** (native `fetch` / `AbortController`).

---

## Quick start

```ts
import { Satim, DZDToCentimes } from 'satim-node-sdk';

const satim = new Satim({
  username: process.env.SATIM_USERNAME!,
  password: process.env.SATIM_PASSWORD!,
  terminalId: process.env.SATIM_TERMINAL!,
  sandbox: true,
});

const { orderId, formUrl } = await satim.registerOrder({
  orderNumber: 'INV-001',
  amount: DZDToCentimes(1500), // 1500.00 DZD → centimes
  returnUrl: 'https://your-site.dz/success',
  failUrl: 'https://your-site.dz/fail',
  description: 'Order INV-001',
});

// Redirect the customer to formUrl
```

---

## Authentication

SATIM authenticates each REST call with merchant `username`, `password`, and `terminalId` (form fields). The SDK injects these credentials on every request. **Never log or commit them.**

| Option              | Required | Default             | Description                          |
| ------------------- | -------- | ------------------- | ------------------------------------ |
| `username`          | yes      | —                   | Merchant username                    |
| `password`          | yes      | —                   | Merchant password                    |
| `terminalId`        | yes      | —                   | Terminal ID                          |
| `sandbox`           | no       | `false`             | Use test environment                 |
| `baseUrl`           | no       | prod/sandbox URL    | Custom API base (HTTPS required)     |
| `allowInsecureHttp` | no       | `false`             | Allow `http://` for local mocks only |
| `timeout`           | no       | `30000`             | Global timeout (ms)                  |
| `timeouts`          | no       | —                   | Per-operation timeouts               |
| `retries`           | no       | `{ maxRetries: 0 }` | Explicit retries only                |
| `logger`            | no       | —                   | Optional metadata logger             |
| `debug`             | no       | `false`             | **Deprecated** — no console output   |
| `verifySsl`         | no       | `true`              | **Deprecated** — bypass ignored      |

---

## API

### `registerOrder(params, options?)`

Registers a payment and returns `{ orderId, formUrl }`.

```ts
const { orderId, formUrl } = await satim.registerOrder({
  orderNumber: 'INV-001',
  amount: 150000,
  returnUrl: 'https://your-site.dz/success',
  failUrl: 'https://your-site.dz/fail',
  additionalParams: { force_terminal: 'ECOM' },
  idempotencyKey: 'inv-001-attempt-1', // optional
});
```

### `getOrderStatus(params, options?)`

Call from your return/fail URL handler to verify payment.

```ts
const status = await satim.getOrderStatus({ orderId });
if (satim.isPaymentSuccessful(status)) {
  // fulfill order
}
```

### `confirmOrder` / `refundOrder` / `reverseOrder`

Two-step capture, refunds, and pre-capture voids.

```ts
await satim.confirmOrder({ orderId, amount: 150000 });
await satim.refundOrder({ orderId, amount: 50000 });
await satim.reverseOrder({ orderId });
```

### Webhooks / return URLs

SATIM redirects the payer to your `returnUrl` / `failUrl`. There is no signed webhook payload in the classic REST flow — **always** confirm with `getOrderStatus` before fulfilling.

---

## Timeout configuration

```ts
const satim = new Satim({
  username,
  password,
  terminalId,
  timeout: 30_000,
  timeouts: {
    registerOrder: 15_000,
    confirmOrder: 20_000,
    refund: 20_000,
    status: 10_000,
  },
});

// Per-request override
await satim.getOrderStatus({ orderId }, { timeout: 5_000 });
```

Timeouts use `AbortController` under the hood.

---

## Logger injection

The SDK **never** calls `console.*`. Inject a logger for safe metadata only:

```ts
const satim = new Satim({
  username,
  password,
  terminalId,
  logger: {
    debug: (msg, meta) => myLogger.debug(msg, meta),
    info: (msg, meta) => myLogger.info(msg, meta),
    warn: (msg, meta) => myLogger.warn(msg, meta),
    error: (msg, meta) => myLogger.error(msg, meta),
  },
});
```

Logged metadata may include: `endpoint`, `status`, `durationMs`, `requestId`, `operation`.  
**Never** payloads, credentials, PANs, tokens, or signatures.

---

## Idempotency

SATIM rejects duplicate `orderNumber` values server-side.

This SDK also deduplicates **concurrent** `registerOrder` calls that share the same `idempotencyKey` (defaults to `orderNumber`):

```ts
// Double-submit safe while in-flight
await Promise.all([
  satim.registerOrder({ ...params, idempotencyKey: 'pay-42' }),
  satim.registerOrder({ ...params, idempotencyKey: 'pay-42' }),
]);
// → a single HTTP request
```

Completed calls are not cached. Re-using an `orderNumber` after success returns a SATIM API error.

---

## Retries

Retries are **disabled by default**. Enable only when you understand payment side effects:

```ts
new Satim({
  username,
  password,
  terminalId,
  retries: { maxRetries: 2, baseDelayMs: 200, retryOnNetworkError: true },
});
```

Retries apply to network/timeout/5xx/rate-limit failures only — never to successful registrations. Prefer idempotency keys over blind retries for `registerOrder`.

---

## SSL / TLS enforcement

- Default and production SATIM URLs use **HTTPS**.
- Custom `http://` base URLs throw `SDKErrorCode.SSL_REQUIRED` unless `allowInsecureHttp: true`.
- `verifySsl: false` is **deprecated and ignored** (certificate verification cannot be disabled).

```ts
// Local mock server only
new Satim({
  username,
  password,
  terminalId,
  baseUrl: 'http://127.0.0.1:8080/payment/rest',
  allowInsecureHttp: true,
});
```

---

## Error handling

All errors extend `SDKError` (and legacy `SatimError`):

```ts
import {
  SatimApiError,
  SatimNetworkError,
  SatimValidationError,
  SDKErrorCode,
} from 'satim-node-sdk';

try {
  await satim.registerOrder(params);
} catch (err) {
  if (err instanceof SatimApiError) {
    console.error(err.errorCode, err.code); // business + SDK code
  } else if (err instanceof SatimNetworkError) {
    if (err.code === SDKErrorCode.TIMEOUT) {
      /* … */
    }
  } else if (err instanceof SatimValidationError) {
    console.error(err.field);
  }
}
```

| Code                    | Meaning                       |
| ----------------------- | ----------------------------- |
| `NETWORK_ERROR`         | Transport failure             |
| `TIMEOUT`               | AbortController timeout       |
| `INVALID_CONFIGURATION` | Bad SDK config                |
| `SSL_REQUIRED`          | HTTP URL without opt-in       |
| `UNAUTHORIZED`          | HTTP 401/403 or access denied |
| `RATE_LIMIT`            | HTTP 429                      |
| `INVALID_RESPONSE`      | Malformed JSON                |
| `VALIDATION_ERROR`      | Bad input params              |
| `API_ERROR`             | SATIM business error          |
| `UNKNOWN`               | Fallback                      |

---

## Security recommendations

1. Store credentials in a secrets manager / env vars — never in source.
2. Keep `allowInsecureHttp` off in production.
3. Do not log `formUrl` query strings if they contain sensitive tokens.
4. Always verify payment with `getOrderStatus` before fulfillment.
5. Sanitize any merchant-defined `additionalParams` (the SDK already blocks prototype pollution).
6. See [SECURITY.md](./SECURITY.md) and [docs/SUPPLY_CHAIN.md](./docs/SUPPLY_CHAIN.md).

---

## Migration guide (1.1 → 1.2)

1. Upgrade to **Node.js 18+**.
2. Remove unused `axios` / `qs` if you only needed them for this SDK.
3. Replace `debug: true` with an injected `logger`.
4. If you used `verifySsl: false`, configure trusted CAs instead.
5. If you used an `http://` mock `baseUrl`, set `allowInsecureHttp: true`.
6. Prefer catching `SDKError` / checking `err.code` for programmatic handling.

Full details: [CHANGELOG.md](./CHANGELOG.md).

---

## Internationalization

```ts
import { getLocalizedMessage } from 'satim-node-sdk';

getLocalizedMessage(116, 'ar'); // رصيد البطاقة غير كافٍ
getLocalizedMessage(116, 'en'); // Insufficient card balance
getLocalizedMessage(116, 'fr'); // Solde insuffisant
```

---

## API documentation

Generate TypeDoc HTML:

```bash
npm run docs
```

Output: `docs/api/`.

---

## Examples

- [`examples/express-integration.ts`](./examples/express-integration.ts)
- [`examples/nestjs-service.ts`](./examples/nestjs-service.ts)

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). PRs require lint, typecheck, tests, and ≥90% coverage.

---

## Legal notice

This package is an **unofficial** open-source SDK. It is not affiliated with or endorsed by SATIM. You must hold a valid merchant agreement and credentials. Use at your own risk.

## License

[MIT](LICENSE)
