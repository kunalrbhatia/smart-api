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
  /**
   * Whether to use Telegram for notifications.
   */
  useTelegram: process.env.USE_TELEGRAM === 'true',
  /**
   * Whether to use Slack for notifications.
   */
  useSlack: process.env.USE_SLACK === 'true',
  /**
   * Slack Webhook URL for notifications.
   */
  slackWebhookUrl: process.env.SLACK_WEBHOOK_URL,
  /**
   * Slack Signing Secret for verifying slash commands.
   */
  slackSigningSecret: process.env.SLACK_SIGNING_SECRET,
  /**
   * Intraday algo exit time (HH:mm format). Default: 15:17.
   */
  exitTime: process.env.EXIT_TIME || '15:17',
};

// Diagnostic logging
const isTelegramConfigured = !!(
  config.telegramBotToken && config.telegramChatId
);
const isSlackConfigured = !!config.slackWebhookUrl;
const isSlackSigningSecretConfigured = !!config.slackSigningSecret;

if (config.useTelegram && !isTelegramConfigured) {
  console.warn(
    `[ENV] Telegram is enabled but configuration is missing. TOKEN: ${config.telegramBotToken ? 'Present' : 'Missing'}, CHAT_ID: ${config.telegramChatId ? 'Present' : 'Missing'}`,
  );
}

if (config.useSlack && !isSlackConfigured) {
  console.warn('[ENV] Slack is enabled but SLACK_WEBHOOK_URL is missing.');
}

if (!isSlackSigningSecretConfigured) {
  console.warn(
    '[ENV] SLACK_SIGNING_SECRET is missing. Slack slash commands will not be verified.',
  );
}

if (config.useTelegram) {
  console.log(
    `[ENV] Telegram notifications enabled. TOKEN: ${config.telegramBotToken?.substring(0, 5)}..., CHAT_ID: ${config.telegramChatId}`,
  );
} else if (config.useSlack) {
  console.log('[ENV] Slack notifications enabled.');
} else {
  console.log('[ENV] No notification channel enabled.');
}
