import { sendTelegramMessage } from './telegram';
import { ALGO } from './constants';

/**
 * Notifies via all configured channels (currently only Telegram).
 * @param {string} message - The message to notify.
 */
export const notify = async (message: string): Promise<void> => {
  const formattedMessage = `*${ALGO} Notification*\n\n${message}`;

  // Log to console as well
  console.log(`${ALGO}: ${message}`);

  // Send to Telegram
  await sendTelegramMessage(formattedMessage);
};
