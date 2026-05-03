import { config } from '../config/env';
import { get } from './api';
import { clearKillSwitch, isKillSwitchActive, setKillSwitch } from './killSwitch';

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
<<<<<<< HEAD
=======

>>>>>>> cf7c3c5 (feat: 🛑 add remote kill via Telegram and revert 5min cron)
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

  // Initialize lastUpdateId to the latest update to avoid processing old messages on startup
  try {
    const response: any = await get(`https://api.telegram.org/bot${telegramBotToken}/getUpdates?offset=-1`, {});
    if (response && response.ok && response.result && response.result.length > 0) {
      lastUpdateId = response.result[0].update_id;
      console.log(`🤖 Telegram: Starting from update ID ${lastUpdateId + 1}`);
    }
  } catch (error) {
    console.error('🤖 Telegram: Error initializing listener:', error);
  }

  const poll = async () => {
    try {
      const url = `https://api.telegram.org/bot${telegramBotToken}/getUpdates?offset=${lastUpdateId + 1}&timeout=30`;
      const response: any = await get(url, {});

      if (response && response.ok && response.result && response.result.length > 0) {
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
            setKillSwitch();
            await sendTelegramMessage('🛑 *Kill Signal Received.* Initiating abrupt shutdown...');
            console.log('🛑 Telegram: Received /kill command. Shutting down...');

            // Confirm this update with Telegram to prevent loops on restart
            try {
              await get(`https://api.telegram.org/bot${telegramBotToken}/getUpdates?offset=${lastUpdateId + 1}`, {});
            } catch (e) {
              // Ignore confirmation errors
            }

            // Trigger the server's kill route locally
            const port = config.port || 8080;
            await get(`http://localhost:${port}/kill`, {});
            return; // Stop polling
          } else if (text === '/resume' || text === '/start') {
            clearKillSwitch();
            await sendTelegramMessage('🚀 *Kill Switch Cleared.* Algo is now allowed to run.');
          } else if (text === '/status') {
            const status = isKillSwitchActive() ? '🛑 *Stopped (Kill Switch Active)*' : '✅ *Running*';
            await sendTelegramMessage(`${status}. Monitoring active.`);
          }
        }
      }
    } catch (error) {
      // Quietly ignore errors to prevent log spamming during polling
    }
    setTimeout(poll, 5000);
  };

  poll();
};
