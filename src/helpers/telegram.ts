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
