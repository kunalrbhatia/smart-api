// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
require('dotenv').config();

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

// Diagnostic logging
if (!config.telegramBotToken || !config.telegramChatId) {
  console.warn(
    `[ENV] Telegram configuration missing in process.env. TOKEN: ${config.telegramBotToken ? 'Present' : 'Missing'}, CHAT_ID: ${config.telegramChatId ? 'Present' : 'Missing'}`,
  );
} else {
  console.log(
    `[ENV] Telegram configuration loaded. TOKEN: ${config.telegramBotToken.substring(0, 5)}..., CHAT_ID: ${config.telegramChatId}`,
  );
}
