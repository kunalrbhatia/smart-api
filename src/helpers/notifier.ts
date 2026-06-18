import { sendTelegramMessage } from './telegram';
import { sendSlackMessage } from './slack';
import { ALGO } from './constants';
import { isPaperMode } from './paperTrade';
import { config } from '../config/env';

/**
 * Notifies via the primary configured channel.
 * Priority: Telegram > Slack
 * @param {string} message - The message to notify.
 */
export const notify = async (message: string): Promise<void> => {
  const paperPrefix = isPaperMode() ? '[PAPER] ' : '';
  const formattedMessage = `*${paperPrefix}${ALGO} Notification*\n\n${message}`;

  // Log to console as well
  console.log(`${ALGO}: ${paperPrefix}${message}`);

  if (config.useTelegram) {
    await sendTelegramMessage(formattedMessage);
  } else if (config.useSlack) {
    await sendSlackMessage(formattedMessage);
  }
};
