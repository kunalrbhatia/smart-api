---
name: multi-channel-notifications
description: Implement and manage multi-channel notification systems (Telegram, Slack, etc.) with priority-based routing and configuration-driven toggles. Use when setting up alerts, bot notifications, or refactoring notification logic.
---

# Multi-Channel Notifications

This skill guides you through implementing a robust, decoupled notification system that supports multiple channels like Slack and Telegram.

## Core Principles

- **Decoupled Caller**: Business logic calls a generic `notify(message)` function.
- **Configuration-Driven**: Channel activation is managed via environment variables.
- **Priority Matrix**: Deterministically select a primary channel when multiple are enabled.

## Workflows

### 1. Setting Up Channels

- **Slack**: See [slack-setup.md](references/slack-setup.md) for Webhook setup.
- **Telegram**: See [telegram-setup.md](references/telegram-setup.md) for Bot setup.

### 2. Implementation Pattern

Use the priority-based routing pattern to ensure clean and predictable alerts.

- See [priority-pattern.md](references/priority-pattern.md) for code examples and architectural overview.

### 3. Environment Configuration

Always include toggles and necessary credentials in `.env`:

```bash
USE_TELEGRAM=true
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...

USE_SLACK=false
SLACK_WEBHOOK_URL=...
```
