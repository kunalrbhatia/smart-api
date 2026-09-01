import fs from 'fs';
import path from 'path';
import moment from 'moment-timezone';
import { logger } from './helpers/logger';
import { notify } from './helpers/notifier';
import { ALGO } from './helpers/constants';
import { INDICES } from './app.interface';
import {
  getAlgoPositions,
  closeBreachedLegs,
  getMtm,
} from './helpers/apiService/positions';
import {
  shouldExitDueToStoploss,
  getAlgoExitTime,
} from './helpers/apiService/strategy';
import {
  connectMarketFeed,
  disconnectMarketFeed,
  addMarketTickListener,
  normalizeToken,
  TokenSpec,
} from './helpers/apiService/marketFeed';
import { isKillSwitchActive } from './helpers/killSwitch';
import { setStoplossFiredToday } from './store/sessionStore';
import OrderStore from './store/orderStore';
import {
  isMarketClosed,
  isTradingHoliday,
  getAlgoIndex,
} from './helpers/functions';
import {
  getNearestWeeklyExpiry,
  getIndexScrip,
} from './helpers/apiService/marketData';

const KILL_FILE = path.join(process.cwd(), '.kill');
const latestPrices = new Map<string, number>();

let isProcessingTick = false;
let lastCheckTime = 0;

export const startFeedDaemon = async (): Promise<void> => {
  logger.log(`${ALGO}: [DAEMON] Starting Real-Time Market Feed Daemon...`);

  // Check kill switch
  if (fs.existsSync(KILL_FILE) || isKillSwitchActive()) {
    logger.log(
      `${ALGO}: [DAEMON] Kill switch active or .kill file present. Exiting.`,
    );
    process.exit(0);
  }

  // Check weekend / market hours / holiday
  const now = moment();
  if (now.day() === 0 || now.day() === 6) {
    logger.log(
      `${ALGO}: [DAEMON] Weekend detected. Market feed daemon exiting.`,
    );
    process.exit(0);
  }

  const isHoliday = await isTradingHoliday();
  if (isHoliday) {
    logger.log(
      `${ALGO}: [DAEMON] Trading holiday detected. Market feed daemon exiting.`,
    );
    process.exit(0);
  }

  const index = getAlgoIndex();
  const expiryDate = await getNearestWeeklyExpiry(index as 'NIFTY' | 'SENSEX');
  const isExpiryDay = now.format('DDMMMYYYY').toUpperCase() === expiryDate;

  if (!isExpiryDay) {
    logger.log(
      `${ALGO}: [DAEMON] Today is not expiry day (${expiryDate}). Daemon sleeping until next session.`,
    );
    process.exit(0);
  }

  if (isMarketClosed()) {
    logger.log(`${ALGO}: [DAEMON] Market is currently closed. Daemon exiting.`);
    process.exit(0);
  }

  // Collect tokens to subscribe
  const positions = getAlgoPositions();
  const tokenSpecs: TokenSpec[] = [];

  // Determine Exchange Type for Index Spot
  let spotToken = '99926000'; // Default NIFTY spot token
  let spotExchangeType = 1; // NSE Spot

  if (index === INDICES.SENSEX) {
    try {
      const sensexScrip = await getIndexScrip({ scriptName: 'SENSEX' });
      if (sensexScrip && sensexScrip[0]) {
        spotToken = normalizeToken(sensexScrip[0].token);
        spotExchangeType = sensexScrip[0].exch_seg === 'BSE' ? 3 : 1;
      }
    } catch (err) {
      logger.warn(
        `${ALGO}: [DAEMON] Could not fetch SENSEX spot token, defaulting to NIFTY spot.`,
        err,
      );
    }
  }

  tokenSpecs.push({ token: spotToken, exchangeType: spotExchangeType });

  for (const pos of positions) {
    if (!pos.symboltoken) continue;
    const token = normalizeToken(pos.symboltoken);
    const exch = (pos.exchange || '').toUpperCase();
    const exchangeType = exch.includes('BSE') || exch.includes('BFO') ? 4 : 2; // 2: NFO, 4: BFO
    tokenSpecs.push({ token, exchangeType });
  }

  logger.log(
    `${ALGO}: [DAEMON] Subscribing to ${tokenSpecs.length} token(s)...`,
  );

  addMarketTickListener(async tick => {
    latestPrices.set(tick.token, tick.ltp);

    const nowMs = Date.now();
    // Throttle exit checks to at most once per 1000ms unless urgent
    if (nowMs - lastCheckTime < 1000 || isProcessingTick) {
      return;
    }
    isProcessingTick = true;
    lastCheckTime = nowMs;

    try {
      // Check kill file periodically
      if (fs.existsSync(KILL_FILE) || isKillSwitchActive()) {
        logger.log(
          `${ALGO}: [DAEMON] Kill signal received during tick processing. Shutting down.`,
        );
        disconnectMarketFeed();
        process.exit(0);
      }

      // Check market exit time (15:10 / 15:40)
      const { hours, minutes } = getAlgoExitTime();
      if (moment().isAfter(moment().hours(hours).minutes(minutes))) {
        logger.log(
          `${ALGO}: [DAEMON] Reached exit time (${hours}:${minutes}). Shutting down feed daemon.`,
        );
        disconnectMarketFeed();
        process.exit(0);
      }

      const activePositions = getAlgoPositions();
      const openPositions = activePositions.filter(
        p => Number.parseInt(p.netqty, 10) !== 0,
      );

      if (openPositions.length === 0) {
        return;
      }

      // Update positions ltp from latestPrices map for per-leg check
      const updatedPositions = openPositions.map(pos => {
        const norm = normalizeToken(pos.symboltoken);
        const wsLtp = latestPrices.get(norm);
        if (wsLtp !== undefined && wsLtp > 0) {
          return { ...pos, ltp: wsLtp.toString() };
        }
        return pos;
      });

      const currentMtm = await getMtm(updatedPositions, latestPrices);
      const postData = OrderStore.getInstance().getPostData();
      const adjustedMtm = currentMtm - (postData.MTM_BASELINE || 0);

      const { shouldExit, reasons, breaches } = shouldExitDueToStoploss(
        updatedPositions,
        adjustedMtm,
      );

      if (shouldExit && breaches.length > 0) {
        logger.log(
          `${ALGO}: [WS-EXIT] Tick-based stoploss triggered — ${reasons.join('; ')}`,
        );
        await notify(
          `⚠️ [WS-EXIT] Tick-based stoploss triggered: ${reasons.join('; ')}`,
        );

        if (process.env.DRY_RUN === '1') {
          logger.log(
            `${ALGO}: [WS-EXIT] DRY_RUN=1 active. Skipping order placement for breached legs.`,
          );
        } else {
          const closedCount = await closeBreachedLegs(breaches);
          logger.log(
            `${ALGO}: [WS-EXIT] Closed ${closedCount} breached leg(s) via WebSocket tick trigger.`,
          );
          await setStoplossFiredToday(expiryDate, true);
        }
      }
    } catch (err) {
      logger.error(`${ALGO}: [DAEMON] Error during tick processing:`, err);
    } finally {
      isProcessingTick = false;
    }
  });

  await connectMarketFeed(tokenSpecs);

  // Periodic kill check loop (every 5s) in case no ticks arrive
  setInterval(() => {
    if (fs.existsSync(KILL_FILE) || isKillSwitchActive()) {
      logger.log(
        `${ALGO}: [DAEMON] Kill file detected in periodic check. Disconnecting...`,
      );
      disconnectMarketFeed();
      process.exit(0);
    }
  }, 5000);
};

if (process.argv[1] && process.argv[1].endsWith('marketFeedDaemon.js')) {
  startFeedDaemon().catch(err => {
    logger.error(`${ALGO}: [DAEMON] Daemon fatal error:`, err);
    process.exit(1);
  });
}
