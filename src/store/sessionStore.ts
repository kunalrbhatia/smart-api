import fs from 'fs';
import path from 'path';
import { logger } from '../helpers/logger';
import { ALGO } from '../helpers/constants';

const SESSION_FILE = path.join(process.cwd(), 'session.json');

export interface SessionState {
  tradingDate: string;
  straddleOpenedToday: boolean;
  stoplossFiredToday: boolean;
  mtmBaseline: number;
}

const DEFAULT_SESSION: SessionState = {
  tradingDate: '',
  straddleOpenedToday: false,
  stoplossFiredToday: false,
  mtmBaseline: 0,
};

export const getSessionState = (currentExpiry?: string): SessionState => {
  if (!fs.existsSync(SESSION_FILE)) return { ...DEFAULT_SESSION };
  try {
    const data = fs.readFileSync(SESSION_FILE, 'utf8');
    const parsed: SessionState = JSON.parse(data);
    if (currentExpiry && parsed.tradingDate) {
      if (parsed.tradingDate.toUpperCase() !== currentExpiry.toUpperCase()) {
        logger.log(
          `${ALGO}: Resetting session store for new expiry date: ${currentExpiry} (previous: ${parsed.tradingDate})`,
        );
        const resetState: SessionState = {
          tradingDate: currentExpiry,
          straddleOpenedToday: false,
          stoplossFiredToday: false,
          mtmBaseline: 0,
        };
        saveSessionState(resetState);
        return resetState;
      }
    } else if (currentExpiry && !parsed.tradingDate) {
      parsed.tradingDate = currentExpiry;
      saveSessionState(parsed);
    }
    return parsed;
  } catch (err) {
    logger.error('Failed to read session.json:', err);
    return { ...DEFAULT_SESSION };
  }
};

export const saveSessionState = (state: SessionState): void => {
  try {
    fs.writeFileSync(SESSION_FILE, JSON.stringify(state, null, 2));
  } catch (err) {
    logger.error('Failed to save session.json:', err);
  }
};

export const setStraddleOpenedToday = (expiryDate: string): void => {
  const currentState = getSessionState(expiryDate);
  saveSessionState({
    ...currentState,
    tradingDate: expiryDate,
    straddleOpenedToday: true,
  });
};

export const setStoplossFiredToday = (
  expiryDate: string,
  fired = true,
): void => {
  const currentState = getSessionState(expiryDate);
  saveSessionState({
    ...currentState,
    tradingDate: expiryDate,
    stoplossFiredToday: fired,
  });
};

export const setMtmBaseline = (expiryDate: string, baseline: number): void => {
  const currentState = getSessionState(expiryDate);
  saveSessionState({
    ...currentState,
    tradingDate: expiryDate,
    mtmBaseline: baseline,
  });
};
