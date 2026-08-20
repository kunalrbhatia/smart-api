import fs from 'fs';
import path from 'path';
import moment from 'moment-timezone';
import { isPaperMode } from './paperTrade';

const LOG_DIR = path.join(process.cwd(), 'logs');

// Ensure logs directory exists
if (!fs.existsSync(LOG_DIR)) {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  } catch (err) {
    console.error('Failed to create logs directory:', err);
  }
}

/**
 * Formats the log message with a timestamp.
 */
const formatMessage = (level: string, message: any): string => {
  const timestamp = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
  });
  let text = '';

  if (typeof message === 'object') {
    try {
      text = JSON.stringify(message);
    } catch (e) {
      text = String(message);
    }
  } else {
    text = String(message);
  }

  const paperPrefix = isPaperMode() ? '[PAPER] ' : '';
  return `[${timestamp}] [${level}] ${paperPrefix}${text}\n`;
};

/**
 * Dynamically resolves the log file path based on the current date in Asia/Kolkata timezone.
 */
const getLogFilePath = (type: 'app' | 'mtm'): string => {
  const dateStr = moment().tz('Asia/Kolkata').format('YYYY-MM-DD');
  return path.join(LOG_DIR, `${type}-${dateStr}.log`);
};

/**
 * Writes the message to the dynamic datewise log file.
 */
const writeToFile = (type: 'app' | 'mtm', formattedMessage: string) => {
  if (process.env.NODE_ENV === 'test') return;
  try {
    fs.appendFileSync(getLogFilePath(type), formattedMessage);
  } catch (err) {
    // Fallback to console if file write fails
    console.error(`Failed to write to ${type} log file:`, err);
  }
};

const safeStringify = (obj: any): string => {
  if (typeof obj !== 'object' || obj === null) return String(obj);
  try {
    return JSON.stringify(obj);
  } catch (e) {
    return String(obj);
  }
};

export const logger = {
  log: (...messages: any[]) => {
    const combinedMessage = messages.map(safeStringify).join(' ');
    const formatted = formatMessage('INFO', combinedMessage);
    console.log(...messages);
    writeToFile('app', formatted);
  },
  info: (...messages: any[]) => {
    const combinedMessage = messages.map(safeStringify).join(' ');
    const formatted = formatMessage('INFO', combinedMessage);
    console.info(...messages);
    writeToFile('app', formatted);
  },
  error: (message: any, error?: any) => {
    const msg = error ? `${message} - ${error.message || error}` : message;
    const formatted = formatMessage('ERROR', msg);
    console.error(message, error || '');
    writeToFile('app', formatted);
  },
  warn: (...messages: any[]) => {
    const combinedMessage = messages.map(safeStringify).join(' ');
    const formatted = formatMessage('WARN', combinedMessage);
    console.warn(...messages);
    writeToFile('app', formatted);
  },
  mtm: (...messages: any[]) => {
    const combinedMessage = messages.map(safeStringify).join(' ');
    const formatted = formatMessage('INFO', combinedMessage);
    console.log('[MTM]', ...messages);
    writeToFile('mtm', formatted);
  },
};
