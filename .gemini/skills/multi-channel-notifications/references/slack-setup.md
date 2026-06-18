# Slack Setup Guide (Incoming Webhooks)

To connect an application to Slack, follow these steps to generate a Webhook URL:

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
