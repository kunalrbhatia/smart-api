# Telegram Setup Guide

To set up a Telegram bot for notifications:

1. **Create a Bot**:
   - Message [@BotFather](https://t.me/botfather) on Telegram.
   - Send `/newbot` and follow instructions.
   - Save the **API Token** provided.
2. **Get your Chat ID**:
   - Message your new bot.
   - Send a message to [@userinfobot](https://t.me/userinfobot) or use an API call: `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates`.
   - Find the `chat.id` in the response.
3. **Configure Environment**:
   - Add `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` to your `.env` file.
