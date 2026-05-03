import { config } from '../config/env';
import { get } from './api';

/**
 * Sends a message to a Telegram chat.
 * @param {string} message - The message to send.
 * @returns {Promise<void>}
 */
export const sendTelegramMessage = async (message: string): Promise<void> => {
  const { telegramBotToken, telegramChatId } = config;

  if (!telegramBotToken || !telegramChatId) {
    console.warn('Telegram notifications are disabled: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is missing.');
    return;
  }

  const url = `https://api.telegram.org/bot${telegramBotToken}/sendMessage?chat_id=${telegramChatId}&text=${encodeURIComponent(
    message,
  )}&parse_mode=Markdown`;

  try {
    const response = await get(url, {});
    if (response && response.ok === false) {
      console.error('Failed to send Telegram message:', response.description);
    }
  } catch (error) {
    console.error('Error sending Telegram message:', error);
  }
};

/**
 * Polls for new Telegram messages to handle remote commands.
 */
export const startTelegramBotListener = async () => {
  const { telegramBotToken, telegramChatId } = config;

  if (!telegramBotToken || !telegramChatId) {
    console.warn('Telegram command listener disabled: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is missing.');
    return;
  }

  console.log('🤖 Telegram Remote Control Listener started...');
  let lastUpdateId = 0;

  setInterval(async () => {
    try {
      const url = `https://api.telegram.org/bot${telegramBotToken}/getUpdates?offset=${lastUpdateId + 1}&timeout=30`;
      const response: any = await get(url, {});

      if (response && response.ok && response.result.length > 0) {
        for (const update of response.result) {
          lastUpdateId = update.update_id;

          const message = update.message;
          if (!message || !message.text) continue;

          // Security check: Only respond to the authorized Chat ID
          if (message.chat.id.toString() !== telegramChatId.toString()) {
            console.warn(`Unauthorized command attempt from Chat ID: ${message.chat.id}`);
            continue;
          }

          const text = message.text.toLowerCase();
          if (text === '/kill') {
            await sendTelegramMessage('🛑 *Kill Signal Received.* Initiating abrupt shutdown...');
            console.log('🛑 Telegram: Received /kill command. Shutting down...');
            
            // Trigger the server's kill route locally
            const port = config.port || 8080;
            await get(`http://localhost:${port}/kill`, {});
          } else if (text === '/status') {
             await sendTelegramMessage('✅ *Algo is running.* Monitoring active.');
          }
        }
      }
    } catch (error) {
      // Quietly ignore errors to prevent log spamming during polling
    }
  }, 5000); // Poll every 5 seconds
};
