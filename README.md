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
- 📊 **Local Positions Tracking**: Uses a local `positions.json` database as the sole source of truth for the algorithm's active positions, eliminating MTM leakage from carried-forward legacy broker positions and ensuring precise hedge executions.
- 🧪 **Paper Trading Mode**: High-fidelity simulation mode to test strategies against live market data without financial risk.
- 💬 **Multi-Channel Remote Control**: Dual support for Telegram and Slack interactive commands to monitor and control the algorithm remotely.
- 📅 **Datewise Logging & Retention**: Dynamically logs application status and MTM metrics daily, with automated script-based log retention cleanup.
- 📊 **Weekly Expiry Reports**: Track and analyze performance with detailed P&L and straddle breakdowns under [expiry-reports/](file:///C:/Users/Kunal/Desktop/hobby-projects/smart-api/expiry-reports/).
- 🧩 **Developer Agent Customizations**: Integrated workspace agent skills (`.agents/skills`) to automate PR creation, git cleanup, and description validation.
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
   _Edit `.env` and fill in your `API_KEY`, `CLIENT_CODE`, `CLIENT_PIN`, and `CLIENT_TOTP_PIN` (16-character secret)._

   #### Strategy Parameters (`.env`)

   | Variable | Default | Description |
   | -------- | ------- | ----------- |
   | `ENTRY_TIME` | `09:15` | Session entry start time (`HH:mm` format) for market open checks and initial trade timing. |
   | `NO_ENTRY_AFTER` | `15:10` | Session entry cutoff time (`HH:mm` format); no new straddles or rolls are entered after this time. |
   | `EXIT_TIME` | `15:17` | Session exit time (`HH:mm` format) when open sell positions are force-closed. |
   | `INDEX` | Auto (`day of week`) | Optional index override (`NIFTY` or `SENSEX` only). BANKNIFTY is ignored and falls back to day-of-week selection. |

### ⏰ Dual-Index Cron Setup (NIFTY & SENSEX)

The algorithm automatically selects the index based on the day of the week (`getAlgoIndex()`):
- **Tuesdays (`* * 2`)**: **NIFTY** weekly option expiry (NSE / `NFO`)
- **Fridays (`* * 5`)**: **SENSEX** weekly option expiry (BSE / `BFO`)
- *Note:* BANKNIFTY is strictly excluded (monthly expiry, out of scope).

Crontab slices for single-machine VPS execution:

```bash
# NIFTY expiry Tuesdays
16 09 * * 2 cd /home/ubuntu/smart-api && node dist/run-algo.js >> logs/algo_run.log 2>&1
20-55/5 09 * * 2 cd /home/ubuntu/smart-api && node dist/run-algo.js >> logs/algo_run.log 2>&1
*/5 10-14 * * 2 cd /home/ubuntu/smart-api && node dist/run-algo.js >> logs/algo_run.log 2>&1
0-40/5 15 * * 2 cd /home/ubuntu/smart-api && node dist/run-algo.js >> logs/algo_run.log 2>&1

# SENSEX expiry Fridays
16 09 * * 5 cd /home/ubuntu/smart-api && node dist/run-algo.js >> logs/algo_run.log 2>&1
20-55/5 09 * * 5 cd /home/ubuntu/smart-api && node dist/run-algo.js >> logs/algo_run.log 2>&1
*/5 10-14 * * 5 cd /home/ubuntu/smart-api && node dist/run-algo.js >> logs/algo_run.log 2>&1
0-40/5 15 * * 5 cd /home/ubuntu/smart-api && node dist/run-algo.js >> logs/algo_run.log 2>&1
```

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

### Log Clean-up

The algorithm generates daily date-wise log files (`app-YYYY-MM-DD.log` and `mtm-YYYY-MM-DD.log`). To delete logs older than 30 days, run:

```bash
node scripts/clean-logs.js
```

### 📊 Expiry Reports

Performance analyses and P&L breakdowns for each weekly expiry date are documented in the [expiry-reports/](file:///C:/Users/Kunal/Desktop/hobby-projects/smart-api/expiry-reports/) directory (e.g. [expiry-2026-07-07.md](file:///C:/Users/Kunal/Desktop/hobby-projects/smart-api/expiry-reports/expiry-2026-07-07.md)).

Each report highlights:
- **P&L Summary**: Net Premium, Realised vs Unrealised P&L, and winner/loser counts.
- **Position Breakdown**: Status (LONG/SHORT/CLOSED) and individual P&L for each traded contract.
- **Straddle Pair Analysis**: Grouped CE/PE strike performance.

---

## 📈 Backtesting the Short Straddle

The repository includes an offline backtester for the **Short Straddle at ATM** strategy. It reads the unified option-chain snapshots produced by the [nifty-optionchain-data](https://github.com/kunalrbhatia/nifty-optionchain-data) pipeline (`data/chains/YYYY-MM-DD/EXPIRY_HHmm.json`) and replays each trading session.

### How it works

For every `(trading day, expiry)` session, the backtester:

1. **Enters**: at `>= 09:15` IST, buys 5-lot hedges at `ATM+500` CE & `ATM-500` PE, and sells 1-lot ATM straddle.
2. **Rolls**: on subsequent ticks, if `|ATM - nearestTradedSellStrike| >= strikeDiff` (50 when India VIX < 14, 100 otherwise), sells a new ATM straddle (or missing leg if LTP > 5).
3. **Exits**:
   - **Per-leg 125% Stop Loss**: trigger = `entry * 2.25`. Checked per leg on every snapshot.
   - **Close rule (15:17+)**: sell legs with `LTP > 5` are bought back at market; sell legs with `LTP <= 5` and all long hedges expire worthless.

By default only the nearest expiry is traded per day (`--expiries all` to trade every expiry present in the data).

### Running

```bash
# Point at the option-chain data lake
pnpm backtest -- --data-dir ../nifty-optionchain-data/data/chains

# Or set it once via environment
export OPTIONCHAIN_DATA_DIR=../nifty-optionchain-data/data/chains
pnpm backtest
```

### Options

| Flag | Default | Description |
|------|---------|-------------|
| `--data-dir <path>` | auto-detected | Path to the `data/chains` directory. |
| `--from YYYY-MM-DD` / `--to YYYY-MM-DD` | all | Restrict the backtest date range. |
| `--entry HHMM` | `0915` | Session entry time (IST). |
| `--close HHMM` | `1517` | Session close time (IST) when sell legs > 5 LTP are bought back. |
| `--strike-diff N` / `--vix <14|>=14` | `50` | Strike step for rolling ATM entries (default 50 maps to VIX < 14). |
| `--entry-slippage N` | `0` | Premium points deducted from sell entries / added to buy hedges for open execution slippage. |
| `--sl-slippage N` | `0` | Additional premium points added to SL limit fill price on stop loss triggers. |
| `--lot-size 65` | `65` | NIFTY lot size used for P&L in rupees. |
| `--expiries nearest` | `nearest` | `nearest` (one per day) or `all` (every expiry present). |
| `--json <file>` | — | Also write full per-session + position details to a JSON file. |

### Fidelity Notes

1. **Stop Loss Fills**: SL trigger is `entry * 2.25`; limit order is placed at `entry * 2.25 * 1.05`. On trigger, fills occur at `max(slLimitPrice, currentLtp) + slSlippage` to model limit execution and gap-through slippage.
2. **Expiry Settlement**: At `15:17+` (Phase A), sell legs with `LTP > 5` are bought back at market price. Any legs remaining open are settled at the **final snapshot LTP of the day** (`~15:30`) in Phase B (`SETTLED_ITM` if `LTP > 5`, else `EXPIRED_WORTHLESS`).
3. **Entry Execution**: Initial entries use the `09:15` chain LTP. Live market fills at `09:16` can differ during volatile opens; `--entry-slippage` allows configuring realistic entry slippage.

### Example output

```text
 Date       Expiry     ATM strike  Traded Strikes      Positions  P&L (₹)
 2026-05-04  2026-05-05      24150  24150,24200,24250,24300         10     -₹2,223.00
 2026-07-01  2026-07-07      23950  23950                       4         +₹0.00
```

The summary block reports total P&L, win rate, average per session, profit factor, and maximum drawdown. Trades are simulated in index points — no live brokerage fees are modeled.

---

## 🤖 Remote Control (Telegram & Slack)

The application supports remote monitoring and control via both **Telegram** and **Slack**. 

### Configuration

In your `.env` file, configure the following:
* **Telegram:** Set `USE_TELEGRAM=true`, `TELEGRAM_BOT_TOKEN`, and `TELEGRAM_CHAT_ID`.
* **Slack:** Set `USE_SLACK=true`, `SLACK_WEBHOOK_URL` (for outbound notifications), and `SLACK_SIGNING_SECRET` (to verify slash commands).

Point your Slack App's Slash Commands endpoint to: `https://<your-domain>/api/api/slack/commands`.

### Supported Commands

These commands can be sent as messages on Telegram or run as slash commands in Slack (e.g., `/status`):

| Command / Slack Slash | Description                                                                       |
| --------------------- | --------------------------------------------------------------------------------- |
| `/status` or `/check` | Get current algo status (Running/Stopped) and trading mode.                       |
| `/paperon`            | Enable **Paper Trading Mode** (trades are mocked locally).                        |
| `/paperoff`           | Enable **Live Trading Mode** (trades execute on your broker account).              |
| `/logs`               | Retrieve the last 20 lines of application logs (via PM2 or local log file).       |
| `/kill`               | Emergency shutdown of the server.                                                 |
| `/resume` / `/start`  | Clear the kill switch to allow the algo to resume operations.                     |

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
| `USE_TELEGRAM` | Set to `true` to enable Telegram notifications. |
| `TELEGRAM_BOT_TOKEN` | Your Telegram Bot Token. |
| `TELEGRAM_CHAT_ID` | Your Telegram Chat ID. |
| `USE_SLACK` | Set to `true` to enable Slack notifications. |
| `SLACK_WEBHOOK_URL` | Your Slack Webhook URL. |
| `SLACK_SIGNING_SECRET` | Your Slack App Signing Secret. |

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

## 🧩 Developer Agent Skills

For AI developers using AI agents (like Antigravity), workspace customization skills are configured under `.agents/skills/`:

* **[gh-pr-workflow](file:///.agents/skills/gh-pr-workflow/SKILL.md)**: Automates branching, staging, committing (Conventional Commits), pushing, and opening GitHub Pull Requests.
* **[git-cleanup-sync](file:///.agents/skills/git-cleanup-sync/SKILL.md)**: Cleans up local feature branches, switches back to `development`, and pulls the latest changes.
* **[pr-description-check](file:///.agents/skills/pr-description-check/SKILL.md)**: Validates PR descriptions to ensure paths, commands, and code snippets are wrapped in backticks (e.g., \`src/app.ts\`).
* **[readme-auto-update](file:///.agents/skills/readme-auto-update/SKILL.md)**: Automates and verifies updating the `README.md` file whenever core application changes are made.
* **[verify-pr-status](file:///.agents/skills/verify-pr-status/SKILL.md)**: Watches and verifies that all GitHub PR checks complete and pass successfully before concluding a PR lifecycle.

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
