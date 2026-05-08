import fs from 'fs';
import path from 'path';

const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'app.log');

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

  return `[${timestamp}] [${level}] ${text}\n`;
};

/**
 * Writes the message to the log file.
 */
const writeToFile = (formattedMessage: string) => {
  try {
    fs.appendFileSync(LOG_FILE, formattedMessage);
  } catch (err) {
    // Fallback to console if file write fails
    console.error('Failed to write to log file:', err);
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
    writeToFile(formatted);
  },
  info: (...messages: any[]) => {
    const combinedMessage = messages.map(safeStringify).join(' ');
    const formatted = formatMessage('INFO', combinedMessage);
    console.info(...messages);
    writeToFile(formatted);
  },
  error: (message: any, error?: any) => {
    const msg = error ? `${message} - ${error.message || error}` : message;
    const formatted = formatMessage('ERROR', msg);
    console.error(message, error || '');
    writeToFile(formatted);
  },
  warn: (...messages: any[]) => {
    const combinedMessage = messages.map(safeStringify).join(' ');
    const formatted = formatMessage('WARN', combinedMessage);
    console.warn(...messages);
    writeToFile(formatted);
  },
};
