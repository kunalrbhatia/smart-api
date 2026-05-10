import { sendTelegramMessage } from './telegram';
import { ALGO } from './constants';
import { isPaperMode } from './paperTrade';

/**
 * Notifies via all configured channels (currently only Telegram).
 * @param {string} message - The message to notify.
 */
export const notify = async (message: string): Promise<void> => {
  const paperPrefix = isPaperMode() ? '[PAPER] ' : '';
  const formattedMessage = `*${paperPrefix}${ALGO} Notification*\n\n${message}`;

  // Log to console as well
  console.log(`${ALGO}: ${paperPrefix}${message}`);

  // Send to Telegram
  await sendTelegramMessage(formattedMessage);
};
