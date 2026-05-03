import dotenv from 'dotenv';

dotenv.config();

/**
 * Application configuration.
 */
export const config = {
  /**
   * The port the application will listen on.
   * @type {string | number}
   */
  port: process.env.PORT || 8080,
  /**
   * The application's environment.
   * @type {string}
   */
  nodeEnv: process.env.NODE_ENV || 'development',
  /**
   * Telegram Bot Token for notifications.
   */
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
  /**
   * Telegram Chat ID to send notifications to.
   */
  telegramChatId: process.env.TELEGRAM_CHAT_ID,
};
