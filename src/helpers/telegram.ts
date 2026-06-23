import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import moment from 'moment-timezone';
import { config } from '../config/env';
import { get } from './api';
import {
  clearKillSwitch,
  isKillSwitchActive,
  setKillSwitch,
} from './killSwitch';
import { logger } from './logger';
import { isPaperMode, setPaperMode } from './paperTrade';
import { shutdownEmitter } from './shutdownEmitter';

const execAsync = promisify(exec);
const MAX_TELEGRAM_MESSAGE_LENGTH = 4000;

/**
 * Checks if Telegram services should be paused due to regional outage.
 * Telegram is down in India until 22 June, restored back on 23 June 2026.
 */
const isTelegramPaused = (): boolean => {
  const restorationDate = moment.tz('2026-06-23', 'Asia/Kolkata');
  const now = moment().tz('Asia/Kolkata');
  return now.isBefore(restorationDate);
};

/**
 * Fetches the last 20 lines of logs.
 * Tries PM2 first, then falls back to the local log file.
 */
export const fetchLogs = async (): Promise<string> => {
  let logOutput = '';
  try {
    const { stdout } = await execAsync(
      'pm2 logs smart-api --lines 20 --nostream',
    );
    logOutput = stdout;
  } catch (error) {
    // Fallback to local log file
    const dateStr = moment().tz('Asia/Kolkata').format('YYYY-MM-DD');
    const logFilePath = path.join(process.cwd(), 'logs', `app-${dateStr}.log`);
    if (fs.existsSync(logFilePath)) {
      try {
        const logs = fs.readFileSync(logFilePath, 'utf8');
        const lines = logs.trim().split('\n');
        logOutput = lines.slice(-20).join('\n');
      } catch (readError) {
        logOutput = 'Error reading local log file.';
      }
    } else {
      logOutput = 'PM2 logs failed and local log file not found.';
    }
  }

  if (!logOutput || logOutput.trim() === '') return 'No logs found.';

  if (logOutput.length > MAX_TELEGRAM_MESSAGE_LENGTH) {
    logOutput = '...' + logOutput.slice(-MAX_TELEGRAM_MESSAGE_LENGTH);
  }

  return `\`\`\`\n${logOutput}\n\`\`\``;
};

/**
 * Sends a message to a Telegram chat.
 * @param {string} message - The message to send.
 * @returns {Promise<void>}
 */
export const sendTelegramMessage = async (message: string): Promise<void> => {
  if (!config.useTelegram) {
    return;
  }

  if (isTelegramPaused()) {
    logger.log(
      'Telegram: Message suppressed as services are paused until June 23, 2026.',
    );
    return;
  }

  const { telegramBotToken, telegramChatId } = config;

  if (!telegramBotToken || !telegramChatId) {
    logger.warn(
      'Telegram notifications are disabled: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is missing.',
    );
    return;
  }

  const url = `https://api.telegram.org/bot${telegramBotToken}/sendMessage?chat_id=${telegramChatId}&text=${encodeURIComponent(
    message,
  )}&parse_mode=Markdown`;

  try {
    const response = await get(url, {});
    if (response && response.ok === false) {
      logger.error('Failed to send Telegram message:', response.description);
    }
  } catch (error) {
    logger.error('Error sending Telegram message:', error);
  }
};

/**
 * Polls for new Telegram messages to handle remote commands.
 */
export const startTelegramBotListener = async () => {
  if (!config.useTelegram) {
    logger.log(
      '🤖 Telegram: Bot listener disabled as Telegram is not the active notification channel.',
    );
    return;
  }

  if (isTelegramPaused()) {
    logger.log(
      '🤖 Telegram: Bot listener disabled as services are paused until June 23, 2026.',
    );
    setTimeout(startTelegramBotListener, 60000);
    return;
  }

  const { telegramBotToken, telegramChatId } = config;

  if (!telegramBotToken || !telegramChatId) {
    logger.warn(
      'Telegram command listener disabled: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is missing.',
    );
    return;
  }

  logger.log('🤖 Telegram Remote Control Listener started...');
  let lastUpdateId = 0;

  // Initialize lastUpdateId to the latest update to avoid processing old messages on startup
  try {
    const response: any = await get(
      `https://api.telegram.org/bot${telegramBotToken}/getUpdates?offset=-1`,
      {},
    );
    if (
      response &&
      response.ok &&
      response.result &&
      response.result.length > 0
    ) {
      lastUpdateId = response.result[0].update_id;
      logger.log(`🤖 Telegram: Starting from update ID ${lastUpdateId + 1}`);
    }
  } catch (error) {
    logger.error('🤖 Telegram: Error initializing listener:', error);
  }

  const poll = async () => {
    try {
      const url = `https://api.telegram.org/bot${telegramBotToken}/getUpdates?offset=${lastUpdateId + 1}&timeout=30`;
      const response: any = await get(url, {});

      if (
        response &&
        response.ok &&
        response.result &&
        response.result.length > 0
      ) {
        for (const update of response.result) {
          lastUpdateId = update.update_id;

          const message = update.message;
          if (!message || !message.text) continue;

          // Security check: Only respond to the authorized Chat ID
          if (message.chat.id.toString() !== telegramChatId.toString()) {
            logger.warn(
              `Unauthorized command attempt from Chat ID: ${message.chat.id}`,
            );
            continue;
          }

          const rawText = message.text.trim();
          if (!rawText.startsWith('/')) continue;

          // Extract the command (e.g. /kill from /kill@bot_name or /kill args)
          const firstWord = rawText.split(/\s+/)[0];
          const cmd = firstWord.split('@')[0].toLowerCase();

          if (cmd === '/kill') {
            setKillSwitch();
            await sendTelegramMessage(
              '🛑 *Kill Signal Received.* Initiating abrupt shutdown...',
            );
            logger.log('🛑 Telegram: Received /kill command. Shutting down...');

            // Confirm this update with Telegram to prevent loops on restart
            try {
              await get(
                `https://api.telegram.org/bot${telegramBotToken}/getUpdates?offset=${lastUpdateId + 1}`,
                {},
              );
            } catch (e) {
              // Ignore confirmation errors
            }

            // Trigger the server's kill route locally
            const port = config.port || 8080;
            try {
              await get(`http://localhost:${port}/kill`, {});
            } catch (e) {
              logger.error(
                'Failed to call kill route via HTTP in Telegram listener, trying direct closure:',
                e,
              );
              try {
                const { closeTrade } = await import('./apiService/positions');
                await closeTrade(true);
              } catch (closeErr) {
                logger.error(
                  'Failed to close trades directly in Telegram listener:',
                  closeErr,
                );
              }
              shutdownEmitter.emit('trigger');
            }
            return; // Stop polling
          } else if (cmd === '/resume' || cmd === '/start') {
            clearKillSwitch();
            await sendTelegramMessage(
              '🚀 *Kill Switch Cleared.* Algo is now allowed to run.',
            );
          } else if (cmd === '/status') {
            const status = isKillSwitchActive()
              ? '🛑 *Stopped (Kill Switch Active)*'
              : '✅ *Running*';
            const mode = isPaperMode() ? '📝 *PAPER MODE*' : '💰 *LIVE MODE*';
            await sendTelegramMessage(
              `${status}. Monitoring active.\nMode: ${mode}`,
            );
          } else if (cmd === '/paperon') {
            setPaperMode(true);
            await sendTelegramMessage('📝 *Paper Trading Mode ENABLED.*');
          } else if (cmd === '/paperoff') {
            setPaperMode(false);
            await sendTelegramMessage('💰 *Live Trading Mode ENABLED.*');
          } else if (cmd === '/logs') {
            const logs = await fetchLogs();
            await sendTelegramMessage(logs);
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
