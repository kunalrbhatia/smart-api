# BLUEPRINT: Generic Multi-Channel Notification System

This blueprint can be applied to any project requiring robust, configurable notifications.

## Core Concepts

- **Decoupled Caller**: Business logic should call a generic `notify(message)` function, unaware of the underlying channel (Slack, Discord, Email, etc.).
- **Configuration-Driven**: Channel activation should be managed via environment variables to allow seamless transitions without code deployments.
- **Priority Matrix**: When multiple channels might be enabled erroneously, the system must deterministically select a primary channel.

## Architecture

### 1. `config.js` (The Source of Truth)

Define your toggles and resolve conflicts here.

```javascript
const useTelegram = process.env.USE_TELEGRAM === 'true';
const useSlack = process.env.USE_SLACK === 'true';

module.exports = {
  notifications: {
    telegram: {
      enabled: useTelegram,
      token: process.env.TELEGRAM_BOT_TOKEN,
      chatId: process.env.TELEGRAM_CHAT_ID,
    },
    slack: {
      // Priority enforcement: Disable Slack if Telegram is enabled
      enabled: useTelegram ? false : useSlack,
      webhookUrl: process.env.SLACK_WEBHOOK_URL,
    },
  },
};
```

### 2. `notifier.js` (The Implementation)

Implement specific sender functions and a facade.

```javascript
const axios = require('axios');
const config = require('./config');

async function sendSlack(msg) {
  if (!config.notifications.slack.webhookUrl) return;
  try {
    await axios.post(config.notifications.slack.webhookUrl, { text: msg });
  } catch (err) {
    console.error('Slack error:', err.message);
  }
}

async function sendTelegram(msg) {
  // Telegram API logic using config.notifications.telegram.token/chatId
}

async function notify(msg) {
  if (config.notifications.telegram.enabled) return sendTelegram(msg);
  if (config.notifications.slack.enabled) return sendSlack(msg);
  console.log('No notification channel enabled.');
}
```

### 3. Setup (Webhook vs API)

- **Slack/Discord**: Prefer Webhooks for simple one-way alerts. They only require a URL and no authentication headers.
- **Telegram/WhatsApp**: Usually require Bot Tokens/API Keys. Ensure payload size/formatting limits are handled in the specific sender functions.

---

## Slack Setup Guide (Incoming Webhooks)

To connect your Algo to Slack, follow these steps to generate a Webhook URL:

1. **Create a Slack Workspace**: If you don't have one, create a free workspace at [slack.com](https://slack.com).
2. **Create a Slack App**:
   - Go to [api.slack.com/apps](https://api.slack.com/apps).
   - Click **"Create New App"**.
   - Choose **"From scratch"**.
   - Name your app (e.g., "Trading-Bot") and select your workspace.
3. **Enable Incoming Webhooks**:
   - In the app settings sidebar, click on **"Incoming Webhooks"**.
   - Toggle the switch to **"On"**.
4. **Create a Webhook**:
   - Click **"Add New Webhook to Workspace"** at the bottom.
   - Select the channel (or yourself for DMs) where the bot should post.
   - Click **"Allow"**.
5. **Copy the URL**:
   - You will now see a **Webhook URL** (starts with `https://hooks.slack.com/services/...`).
   - Copy this URL and paste it into your `.env` file as `SLACK_WEBHOOK_URL`.

_Note: Slack Webhooks are the simplest way to send messages. For interactive features (buttons, slash commands), you would need to use the Slack Bolt SDK or Web API, but for notifications, Webhooks are optimal._
