# satim-node-sdk

> 🇩🇿 Node.js SDK for the **SATIM** Algerian payment gateway

[![npm version](https://img.shields.io/npm/v/satim-node-sdk.svg)](https://www.npmjs.com/package/satim-node-sdk)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A typed, promise-based Node.js client for SATIM (Société d'Automatisation des Transactions Interbancaires et de Monétiques), the Algerian interbank payment network. This SDK provides a seamless developer experience for handling CIB and Edahabia transactions.

---

## 🚀 Features

- **Type Safety**: Full TypeScript support with comprehensive interfaces for every request and response.
- **Extended Status API**: Uses `getOrderStatusExtended.do` for highly reliable payment verification.
- **Built-in I18n**: Native translations for SATIM error & action codes in **English**, **Arabic**, and **French**.
- **Intuitive Error Handling**: Catch and inspect typed `SatimError` classes.
- **Debug Mode**: Verbose logging of all API requests and raw responses.
- **Advanced Config**: Support for custom base URLs and SSL verification bypass (ideal for sandbox testing).

---

## 📦 Installation

Install the package via your favorite package manager:

```bash
npm install satim-node-sdk
```

*Note: This library requires **Node.js 16+** and works beautifully with both TypeScript and modern JavaScript projects.*

---

## ⚙️ Configuration

Initialize the `Satim` client with your merchant credentials. These are typically provided by your bank or directly by SATIM.

```ts
import { Satim } from 'satim-node-sdk';

const satim = new Satim({
  username:   process.env.SATIM_USERNAME!,
  password:   process.env.SATIM_PASSWORD!,
  terminalId: process.env.SATIM_TERMINAL!,
  sandbox:    true,
  debug:      true, // Enable logging
});
```

### Configuration Parameters

| Option       | Type      | Required | Default    | Description                              |
|--------------|-----------|----------|------------|------------------------------------------|
| `username`   | `string`  | ✅        | —          | Merchant username from SATIM             |
| `password`   | `string`  | ✅        | —          | Merchant password from SATIM             |
| `terminalId` | `string`  | ✅        | —          | Terminal ID from SATIM                   |
| `sandbox`    | `boolean` | ❌        | `false`    | Use the SATIM test environment           |
| `baseUrl`    | `string`  | ❌        | —          | Override default API URL                 |
| `verifySsl`  | `boolean` | ❌        | `true`     | Set to `false` if SATIM sandbox has cert issues |
| `debug`      | `boolean` | ❌        | `false`    | Log traffic to console for debugging     |
| `timeout`    | `number`  | ❌        | `30000`    | HTTP timeout in milliseconds             |

⚠️ **Security Best Practice:** Never hardcode credentials in your source code. We recommend using `.env` files or a dedicated secrets manager.

---

## 📚 API Reference

The core `Satim` class provides all the methods needed to interact with the gateway.

### `registerOrder(params)`
Initiates a payment by registering the order with SATIM and retrieving the `formUrl`.

```ts
const { orderId, formUrl } = await satim.registerOrder({
  orderNumber: "INV-001",
  amount: 150000, // 1500 DZD (must be in centimes)
  returnUrl: "https://your-site.dz/success",
  failUrl: "https://your-site.dz/fail"
});
// Redirect your user to `formUrl`.
```

*(You can use the helper `import { DZDToCentimes } from 'satim-node-sdk'` to safely convert DZD to centimes!)*

### `getOrderStatus(params)`
Retrieves the full status (including card info and action codes) of an existing order.

```ts
const status = await satim.getOrderStatus({
  orderId: "5f8a9e2b-1c4d..."
});

console.log(status.orderStatus); // e.g., 2 for AUTHORIZED
```

### `confirmOrder(params)`
Captures a pre-authorized payment. Used only for two-step terminals.

```ts
const result = await satim.confirmOrder({
  orderId: "5f8a9e2b-1c4d...",
  amount: 50000 // Ensure you capture the exact pre-authorized amount
});
```

### `refundOrder(params)`
Refunds a captured order (partial or full).

```ts
const result = await satim.refundOrder({
  orderId: "...",
  amount: 25000 // Amount to refund in centimes
});
```

### `reverseOrder(params)`
Voids an authorization before it has been captured.

```ts
const result = await satim.reverseOrder({
  orderId: "..."
});
```

### `isPaymentSuccessful(status)`
A convenient helper that checks if an order status is `AUTHORIZED` (2) or `PRE_AUTHORIZED` (1).

```ts
if (satim.isPaymentSuccessful(status)) {
  console.log('Payment verified successfully!');
}
```

---

## 🌍 Internationalization (I18n)

The library provides a `getLocalizedMessage()` function to translate SATIM's technical `actionCode` into human-readable messages. This is particularly useful for showing friendly errors to users.

```ts
import { getLocalizedMessage } from 'satim-node-sdk';

// Let's assume the user attempted a transaction and it failed.
// Code 116 = Insufficient funds

console.log(getLocalizedMessage(116, 'ar')); // "رصيد البطاقة غير كافٍ"
console.log(getLocalizedMessage(116, 'en')); // "Insufficient card balance"
console.log(getLocalizedMessage(116, 'fr')); // "Solde insuffisant"
```

*Note: The helper will fall back to French if a translation is missing or the language code is unrecognized.*

---

## ⚠️ Error Handling

All errors thrown by the SDK inherit from `SatimError`.

- **`SatimApiError`**: Business errors directly from SATIM (e.g. invalid credentials, duplicate order).
- **`SatimNetworkError`**: Connection, DNS, or timeout issues with SATIM servers.
- **`SatimValidationError`**: Invalid inputs (e.g. negative amount) before sending the request.

```ts
try {
  await satim.registerOrder(params);
} catch (err) {
  if (err instanceof SatimApiError) {
    console.log(err.errorCode); // Technical code from SATIM
    console.log(err.raw);       // Raw API response
  }
}
```

---

## 📋 Types & Enums

The SDK exports various useful enums for TypeScript users.

### `OrderStatus`
- `0` — REGISTERED
- `1` — PRE_AUTHORIZED
- `2` — AUTHORIZED ✅
- `6` — DECLINED ❌

### `SatimLanguage`
- `AR` — Arabic
- `FR` — French (Default)
- `EN` — English

---

## 👨‍⚖️ Legal Notice

**Disclaimer:** This package is an **unofficial** open-source SDK. It is NOT affiliated with, authorized, or endorsed by SATIM (Société d'Automatisation des Transactions Interbancaires et de Monétique).

To use this library in production, you MUST:
1. Have an official merchant account with an Algerian bank.
2. Have received your technical credentials (User, Password, Terminal ID) directly from SATIM or your bank.
3. Observe all Algerian financial regulations and SATIM's service agreements.

This library is a thin wrapper around APIs publicly documented by SATIM. Use of this library is at your own risk.

---

## 📄 License

[MIT](LICENSE)
