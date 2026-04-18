# satim-node

> 🇩🇿 Node.js SDK for the **SATIM** Algerian payment gateway

[![npm version](https://img.shields.io/npm/v/satim-node.svg)](https://www.npmjs.com/package/satim-node)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A typed, promise-based Node.js client for SATIM (Société d'Automatisation des Transactions Interbancaires et de Monétiques), the Algerian interbank payment network.

---

## What's New in 1.1.0 🚀

- **Extended Status API**: Now uses `getOrderStatusExtended.do` for more reliable payment verification.
- **Multilingual Support**: Built-in translations for SATIM error codes in **English**, **Arabic**, and **French**.
- **Debug Mode**: Verbose logging of all API requests and raw responses.
- **Advanced Config**: Support for custom base URLs and SSL verification bypass (ideal for sandbox testing).

---

## Installation

```bash
npm install satim-node
```

---

## Quick Start

```ts
import { Satim, DZDToCentimes, getLocalizedMessage } from 'satim-node';

const satim = new Satim({
  username:   process.env.SATIM_USERNAME!,
  password:   process.env.SATIM_PASSWORD!,
  terminalId: process.env.SATIM_TERMINAL!,
  sandbox:    true,
  debug:      true, // Enable logging
});

// ... inside a route
const status = await satim.getOrderStatus({ orderId });

if (!satim.isPaymentSuccessful(status)) {
  // Get a human-readable message in Arabic
  const messageAr = getLocalizedMessage(status.actionCode, 'ar');
  console.log(`Error: ${messageAr}`);
}
```

---

## Configuration

| Option       | Type      | Required | Default    | Description                              |
|--------------|-----------|----------|------------|------------------------------------------|
| `username`   | `string`  | ✅        | —          | Merchant username from SATIM             |
| `password`   | `string`  | ✅        | —          | Merchant password from SATIM             |
| `terminalId` | `string`  | ✅        | —          | Terminal ID from SATIM                   |
| `sandbox`    | `boolean` | ❌        | `false`    | Use sandbox environment                  |
| `baseUrl`    | `string`  | ❌        | —          | Override default API URL                 |
| `verifySsl`  | `boolean` | ❌        | `true`     | Set to `false` to skip SSL checks        |
| `debug`      | `boolean` | ❌        | `false`    | Log traffic for debugging                |
| `timeout`    | `number`  | ❌        | `30000`    | HTTP timeout in ms                       |

---

## Internationalization (I18n)

The library provides a `getLocalizedMessage()` function to translate SATIM's technical `actionCode` into user-friendly messages.

```ts
import { getLocalizedMessage } from 'satim-node';

getLocalizedMessage(116, 'ar') // "رصيد البطاقة غير كافٍ"
getLocalizedMessage(116, 'en') // "Insufficient card balance"
getLocalizedMessage(116, 'fr') // "Solde insuffisant"
```

---

## Running Tests

```bash
npm test
```

---

## License

MIT
