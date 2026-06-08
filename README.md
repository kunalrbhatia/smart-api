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
- 📉 **Real-time Risk Management**: Active MTM tracking with automated stop-loss placement (150% factor) for all sell positions.
- 🧪 **Paper Trading Mode**: High-fidelity simulation mode to test strategies against live market data without financial risk.
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
   _Edit `.env` and fill in your `API_KEY`, `CLIENT_ID`, `CLIENT_PASSWORD`, and `CLIENT_TOTP_PIN` (16-character secret)._

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

## 🤖 Telegram Remote Control

The bot includes a built-in Telegram listener for remote monitoring and control. Configure `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` in your `.env` file to use these commands:

| Command              | Description                                                                       |
| -------------------- | --------------------------------------------------------------------------------- |
| \`status\`           | Get current algo status (Running/Stopped) and trading mode.                       |
| \`paperon\`          | Enable **Paper Trading Mode** (trades are mocked locally).                        |
| \`paperoff\`         | Enable **Live Trading Mode** (trades execute on your broker account).              |
| \`logs\`             | Retrieve the last 20 lines of application logs (via PM2 or local log file).       |
| \`kill\`             | Emergency shutdown of the server.                                                 |
| \`resume\` / \`start\` | Clear the kill switch to allow the algo to resume operations.                     |

---

## 🚀 Deployment

The project is configured for automated deployment to **Oracle Cloud** via GitHub Actions.

### Automated Workflow
The [deploy.yml](.github/workflows/deploy.yml) workflow triggers on every push to the `development` branch. It performs the following on the target server:
1. Pulls the latest code.
2. Installs dependencies using `pnpm`.
3. Builds the project (`babel` transpilation).
4. Generates the `.env` file from GitHub Secrets.
5. Restarts the application using **PM2** via `ecosystem.config.cjs`.

### Required GitHub Secrets
To use the deployment workflow, add the following secrets in your repository settings (**Settings > Secrets and variables > Actions**):

| Secret Name | Description |
|-------------|-------------|
| `ORACLE_HOST` | Public IP of your Oracle Cloud instance. |
| `ORACLE_USER` | SSH username (e.g., `ubuntu`). |
| `ORACLE_SSH_KEY` | Your private SSH key (`.key` or `.pem` content). |
| `PORT` | The port the app should run on (default: `3000`). |
| `API_KEY` | Your SmartAPI Key. |
| `CLIENT_CODE` | Your SmartAPI Client Code. |
| `CLIENT_PIN` | Your SmartAPI Client Pin. |
| `CLIENT_TOTP_PIN` | Your 16-character TOTP Secret Key. |
| `TELEGRAM_BOT_TOKEN` | Your Telegram Bot Token. |
| `TELEGRAM_CHAT_ID` | Your Telegram Chat ID. |

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
_Full-stack Developer | Stock Market Trader_
