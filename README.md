# 🚀 SmartAPI Intraday Trading Algorithm

[![CI Pipeline](https://github.com/kunalrbhatia/smart-api/actions/workflows/ci.yml/badge.svg)](https://github.com/kunalrbhatia/smart-api/actions/workflows/ci.yml)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D24.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-%5E5.4.5-blue)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Coverage](https://img.shields.io/badge/coverage-86.2%25-brightgreen)](https://github.com/kunalrbhatia/smart-api)

A robust, enterprise-grade intraday trading algorithm built with Node.js and TypeScript, specifically designed for automating **Short Straddle** strategies on BankNifty index options using the Angel One **SmartAPI**.

---

## 🌟 Key Features

- 🔐 **Automated Smart Login**: Hands-free authentication with automated 6-digit TOTP generation.
- 📡 **Compliance Ready**: Automatic resolution of Public IP, Local IP, and MAC addresses for secure API header requirements.
- 📊 **Short Straddle Strategy**: Precision execution for index options with dynamic strike selection.
- 📉 **Real-time Risk Management**: Active MTM (Mark-to-Market) tracking with customizable stop-loss and target criteria.
- 🏗️ **Modular Architecture**: Clean, domain-driven design for high maintainability and testability.
- 🛡️ **High Test Coverage**: Robust test suite with **86.2% branch coverage** ensuring reliable execution.
- 🐳 **Docker Ready**: Fully containerized for consistent deployment across environments.

---

## 🛠️ Tech Stack

- **Runtime**: Node.js v24+ (LTS)
- **Language**: TypeScript
- **Framework**: Express.js
- **API Client**: [SmartAPI](https://smartapi.angelbroking.com/) (via `krb-smart-api-module`)
- **Testing**: Jest
- **Formatting/Linting**: Prettier & ESLint
- **Package Manager**: pnpm

---

## 📥 Installation

### Prerequisites
- **Node.js v24+**
- **pnpm** (recommended) or npm
- **SmartAPI Credentials**: API Key and 16-character TOTP Secret.

### Setup
1. **Clone the repository**:
   ```bash
   git clone https://github.com/kunalrbhatia/smart-api.git
   cd smart-api
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Configure Environment**:
   ```bash
   cp .env.example .env
   ```
   *Edit `.env` and fill in your `API_KEY`, `CLIENT_ID`, `CLIENT_PASSWORD`, and `CLIENT_TOTP_PIN` (16-character secret).*

---

## 🚀 Usage

### Development Mode
Run with hot-reloading:
```bash
pnpm run dev
```

### Production Build
Compile and start:
```bash
pnpm run build
pnpm start
```

### Testing
Run the comprehensive test suite:
```bash
pnpm test
pnpm run test:coverage # Generate coverage report
```

---

## 📂 Project Structure

```
smart-api/
├── src/
│   ├── helpers/
│   │   ├── apiService/     # Domain-specific API logic (positions, orders, strategy)
│   │   └── ...             # Utility helpers (logger, notifier, etc.)
│   ├── store/              # In-memory state management
│   ├── routes/             # API Endpoints
│   └── app.ts              # Express application configuration
├── __tests__/              # High-coverage test suite
└── jest.config.js          # Testing configuration
```

---

## 📖 API Documentation

Detailed documentation for all endpoints (Algo control, Account info, Market data) can be found in [ENDPOINTS.md](ENDPOINTS.md).

---

## ⚠️ Disclaimer

Trading in the stock market involves significant risk. This algorithm is provided for educational and demonstration purposes. **Kunal** and the contributors are not responsible for any financial losses incurred through the use of this software. Always backtest thoroughly and trade responsibly.

---

## 🤝 Contributing

Contributions are welcome! Please ensure that any new features include corresponding unit tests and maintain the existing branch coverage standards (>= 80%).

---

**Developed with ❤️ by [Kunal](https://github.com/kunalrbhatia)**  
*Full-stack Developer | Stock Market Trader*
