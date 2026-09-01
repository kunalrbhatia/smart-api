import { WebSocketV2 } from 'smartapi-javascript';
import { getSmartSession } from './session';
import DataStore from '../../store/dataStore';
import { logger } from '../logger';
import { ALGO } from '../constants';

export interface TokenSpec {
  token: string;
  exchangeType: number; // 1: NSE Spot (nse_cm), 2: NFO (nse_fo), 3: BSE Spot (bse_cm), 4: BFO (bse_fo)
}

export interface MarketTick {
  token: string;
  ltp: number;
}

type TickCallback = (tick: MarketTick) => void;

/**
 * Normalizes raw token inputs by removing non-digits and leading zeros.
 * Vector examples: "41000" -> "41000", 41000 -> "41000", "41000\u0000" -> "41000", "000041000" -> "41000", undefined -> ""
 */
export const normalizeToken = (raw: any): string => {
  if (raw === null || raw === undefined) return '';
  const cleaned = String(raw).replace(/[^0-9]/g, '');
  if (!cleaned) return '';
  const stripped = cleaned.replace(/^0+/, '');
  return stripped || (cleaned.includes('0') ? '0' : '');
};

let wsClient: any = null;
let isConnected = false;
let isIntentionallyClosed = false;
let reconnectTimer: NodeJS.Timeout | null = null;
let reconnectAttempts = 0;
let subscribedTokenSpecs: TokenSpec[] = [];

const tickListeners: TickCallback[] = [];

export const addMarketTickListener = (cb: TickCallback): void => {
  tickListeners.push(cb);
};

export const removeMarketTickListener = (cb: TickCallback): void => {
  const index = tickListeners.indexOf(cb);
  if (index >= 0) {
    tickListeners.splice(index, 1);
  }
};

const notifyTickListeners = (tick: MarketTick): void => {
  for (const cb of tickListeners) {
    try {
      cb(tick);
    } catch (err) {
      logger.error(`${ALGO}: Error in tick listener callback:`, err);
    }
  }
};

/**
 * Connects to Angel SmartStream WebSocketV2 for real-time LTP updates.
 */
export const connectMarketFeed = async (
  tokenSpecs: TokenSpec[],
): Promise<void> => {
  subscribedTokenSpecs = tokenSpecs;
  isIntentionallyClosed = false;

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  try {
    const creds = DataStore.getInstance().getPostData();
    const session = await getSmartSession();

    if (!session || !session.jwtToken || !session.feedToken) {
      throw new Error('SmartAPI session missing jwtToken or feedToken');
    }

    logger.log(`${ALGO}: [WS] Initializing WebSocketV2 connection...`);

    wsClient = new WebSocketV2({
      jwttoken: session.jwtToken,
      apikey: creds.APIKEY,
      clientcode: creds.CLIENT_CODE,
      feedtype: session.feedToken,
    });

    // Custom error handler option if supported
    if (typeof wsClient.customError === 'function') {
      wsClient.customError();
    }

    wsClient.on('tick', (data: any) => {
      if (!data) return;

      const rawToken = data.token || data.symboltoken;
      const normalized = normalizeToken(rawToken);
      const rawPrice =
        data.last_traded_price || data.ltp || data.lastTradedPrice || '0';
      const ltp = Number.parseFloat(String(rawPrice)) / 100;

      if (!normalized || Number.isNaN(ltp)) {
        return;
      }

      notifyTickListeners({ token: normalized, ltp });
    });

    await wsClient.connect();
    isConnected = true;
    reconnectAttempts = 0;
    logger.log(`${ALGO}: [WS] WebSocketV2 connected successfully.`);

    // Group tokenSpecs by exchangeType for batch subscription
    const exchangeGroups: Map<number, string[]> = new Map();
    for (const spec of tokenSpecs) {
      const norm = normalizeToken(spec.token);
      if (!norm) continue;
      const existing = exchangeGroups.get(spec.exchangeType) || [];
      existing.push(norm);
      exchangeGroups.set(spec.exchangeType, existing);
    }

    for (const [exchangeType, tokens] of exchangeGroups.entries()) {
      if (tokens.length === 0) continue;
      const req = {
        correlationID: `sub_${exchangeType}_${Date.now()}`,
        action: 1, // Subscribe
        mode: 1, // LTP
        exchangeType,
        tokens,
      };
      logger.log(
        `${ALGO}: [WS] Subscribing exchangeType ${exchangeType} for ${tokens.length} token(s): ${tokens.join(',')}`,
      );
      wsClient.fetchData(req);
    }
  } catch (err: any) {
    isConnected = false;
    logger.error(
      `${ALGO}: [WS] Failed to connect WebSocketV2: ${err?.message || err}`,
    );
    scheduleReconnect();
  }
};

const scheduleReconnect = (): void => {
  if (isIntentionallyClosed) return;
  if (reconnectTimer) return;

  reconnectAttempts++;
  // Exponential backoff: 2s, 4s, 8s, 16s, 32s, capped at 60s
  const backoffMs = Math.min(60000, 2000 * Math.pow(2, reconnectAttempts - 1));
  logger.warn(
    `${ALGO}: [WS] Scheduling reconnect attempt #${reconnectAttempts} in ${backoffMs}ms...`,
  );

  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    if (isIntentionallyClosed) return;
    try {
      logger.log(
        `${ALGO}: [WS] Attempting auto-reconnect #${reconnectAttempts}...`,
      );
      // Re-login to ensure token freshness
      await connectMarketFeed(subscribedTokenSpecs);
    } catch (err) {
      logger.error(`${ALGO}: [WS] Reconnect attempt failed:`, err);
    }
  }, backoffMs);
};

export const disconnectMarketFeed = (): void => {
  isIntentionallyClosed = true;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (wsClient) {
    try {
      if (typeof wsClient.close === 'function') {
        wsClient.close();
      }
    } catch (err) {
      logger.error(`${ALGO}: Error closing WebSocket:`, err);
    }
    wsClient = null;
  }
  isConnected = false;
  logger.log(`${ALGO}: [WS] Market feed disconnected.`);
};

export const isMarketFeedConnected = (): boolean => isConnected;
