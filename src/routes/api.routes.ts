import { Router, Request, Response } from 'express';

import {
  fetchData,
  getIndexScrip,
  getLtpWithRetry,
  getLtpData,
  searchScrip,
  doOrder,
  getNearestWeeklyExpiry,
  fetchOpenPositionsByExpiry,
  executeSellAtmBuyHedge,
  placeStoplossForAllSells,
  getCandleData,
} from '../helpers/apiService';
import {
  countSellPairs,
  generateTradingSignal,
  getAtmStrikePriceForIndex,
  hasHedgePositions,
  hasOpenPositionForStrike,
  setCred,
} from '../helpers/functions';
import { ALGO } from '../helpers/constants';
import { delay, INDICES } from 'krb-smart-api-module';
import moment from 'moment-timezone';
import {
  isKillSwitchActive,
  setKillSwitch,
  clearKillSwitch,
} from '../helpers/killSwitch';
import { isPaperMode, setPaperMode } from '../helpers/paperTrade';
import { verifySlackSignature } from '../middlewares/slackVerify';
import { fetchLogs } from '../helpers/telegram';
import { get } from '../helpers/api';
import { config } from '../config/env';

interface IndexData {
  exchange: string;
  tradingsymbol: string;
  symboltoken: string;
  open: number;
  high: number;
  low: number;
  close: number;
  ltp: number;
}

interface IndexResponse {
  [key: string]: IndexData | { error: string };
}

const router = Router();

/**
 * @route   POST /api/api/warmup
 * @desc    Warm up the application by fetching scrip master data
 * @access  Public
 */
router.post('/warmup', async (req: Request, res: Response) => {
  console.log(`\n${ALGO}: ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^`);
  try {
    const istTz = new Date().toLocaleString('default', {
      timeZone: 'Asia/Kolkata',
    });
    console.log(`${ALGO}: time, ${istTz}`);
    setCred(req);
    await fetchData();
    res.json({ response: 'success' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ response: err });
  }
  console.log(`${ALGO}: -----------------------------------`);
});

/**
 * @route   POST /api/api/getAllIndices
 * @desc    Get LTP data for all major indices
 * @access  Public
 */
router.post('/getAllIndices', async (req: Request, res: Response) => {
  console.log(`\n${ALGO}: ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^`);
  try {
    const istTz = new Date().toLocaleString('default', {
      timeZone: 'Asia/Kolkata',
    });
    console.log(`${ALGO}: time, ${istTz}`);
    setCred(req);
    const indexMap: Record<string, string> = {
      VIX: 'INDIA VIX',
      NIFTY: INDICES.NIFTY,
      BANKNIFTY: INDICES.BANKNIFTY,
      SENSEX: INDICES.SENSEX,
    };

    // Run all fetches in parallel
    const results = await Promise.all(
      Object.entries(indexMap).map(async ([key, scriptName]) => {
        try {
          const data = await getIndexScrip({ scriptName });
          if (!data || data.length === 0) {
            return { index: key, error: 'No data found' };
          }

          await delay({ milliSeconds: 1000 });

          const ltpData = await getLtpWithRetry({
            exchange: data[0].exch_seg,
            symboltoken: data[0].token,
            tradingsymbol: data[0].symbol,
            maxRetries: 5,
            delayMs: 1000,
          });

          return { index: key, data: ltpData };
        } catch (err) {
          console.error(`${ALGO}: error fetching ${key}`, err);
          return { index: key, error: 'Failed to fetch data' };
        }
      }),
    );

    // Convert to object for easier frontend usage
    const responseData = results.reduce((acc, curr) => {
      acc[curr.index] = curr.data || { error: curr.error };
      return acc;
    }, {} as IndexResponse);

    res.status(200).json({ data: responseData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ response: err });
  }
  console.log(`${ALGO}: -----------------------------------`);
});

/**
 * @route   POST /api/api/placeOrder
 * @desc    Place an order for a stock or option
 * @access  Public
 */
router.post('/placeOrder', async (req: Request, res: Response) => {
  console.log(`\n${ALGO}: ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^`);
  try {
    const istTz = new Date().toLocaleString('default', {
      timeZone: 'Asia/Kolkata',
    });
    console.log(`${ALGO}: time, ${istTz}`);
    setCred(req);

    const {
      tradingsymbol,
      symboltoken,
      transactionType,
      exchange = 'NFO',
      quantity,
      lotSize,
      lots,
      productType = 'CARRYFORWARD',
      variety = 'NORMAL',
      ordertype = 'MARKET',
      price,
      triggerprice,
      isHedge = false,
    } = req.body;

    // Validate required fields
    if (!tradingsymbol || !symboltoken || !transactionType) {
      return res.status(400).json({
        error:
          'Missing required fields: tradingsymbol, symboltoken, and transactionType are required',
      });
    }

    if (!quantity && (!lotSize || lotSize <= 0)) {
      return res.status(400).json({
        error:
          'Either quantity or lotSize (and optionally lots) must be provided',
      });
    }

    const orderResponse = await doOrder({
      tradingsymbol,
      symboltoken,
      transactionType,
      exchange,
      quantity,
      lotSize,
      lots,
      productType,
      variety,
      ordertype,
      price,
      triggerprice,
      isHedge,
    });

    res.status(200).json({ data: orderResponse });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Failed to place order',
    });
  }
  console.log(`${ALGO}: -----------------------------------`);
});

/**
 * @route   POST /api/api/getLtp
 * @desc    Get LTP (Last Traded Price) for a stock or option
 * @access  Public
 */
router.post('/getLtp', async (req: Request, res: Response) => {
  console.log(`\n${ALGO}: ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^`);
  try {
    const istTz = new Date().toLocaleString('default', {
      timeZone: 'Asia/Kolkata',
    });
    console.log(`${ALGO}: time, ${istTz}`);
    setCred(req);

    const { exchange, tradingsymbol, symboltoken } = req.body;

    // Validate required fields
    if (!exchange || !tradingsymbol || !symboltoken) {
      return res.status(400).json({
        error:
          'Missing required fields: exchange, tradingsymbol, and symboltoken are required',
      });
    }

    const ltpData = await getLtpData({
      exchange,
      tradingsymbol,
      symboltoken,
    });

    res.status(200).json({ data: ltpData });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Failed to fetch LTP data',
    });
  }
  console.log(`${ALGO}: -----------------------------------`);
});

/**
 * @route   POST /api/api/searchScrip
 * @desc    Search for a stock or option by name
 * @access  Public
 */
router.post('/searchScrip', async (req: Request, res: Response) => {
  console.log(`\n${ALGO}: ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^`);
  try {
    const istTz = new Date().toLocaleString('default', {
      timeZone: 'Asia/Kolkata',
    });
    console.log(`${ALGO}: time, ${istTz}`);
    setCred(req);

    const { scripName, exchange = 'NFO' } = req.body;

    // Validate required fields
    if (!scripName) {
      return res.status(400).json({
        error: 'Missing required field: scripName is required',
      });
    }

    const searchResults = await searchScrip(scripName, exchange);

    res.status(200).json({ data: searchResults });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Failed to search scrip',
    });
  }
  console.log(`${ALGO}: -----------------------------------`);
});

/**
 * @route   POST /api/api/getAtmStrike
 * @desc    Get ATM strike price for a given index and expiry
 * @access  Public
 */
router.post('/getAtmStrike', async (req: Request, res: Response) => {
  console.log(`\n${ALGO}: ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^`);
  try {
    const istTz = new Date().toLocaleString('default', {
      timeZone: 'Asia/Kolkata',
    });
    console.log(`${ALGO}: time, ${istTz}`);
    setCred(req);

    const index: string = req.body.index || 'NIFTY';

    // Auto-detect nearest weekly expiry if not provided
    let expiry: string = req.body.expiry || '';
    if (!expiry) {
      expiry = await getNearestWeeklyExpiry(index as 'NIFTY' | 'BANKNIFTY');
    }

    const result = await getAtmStrikePriceForIndex(index, expiry);

    res.status(200).json({
      data: {
        index: result.index,
        expiry: result.expiry,
        ltp: result.ltp,
        atmStrike: result.atmStrike,
      },
    });
  } catch (err) {
    console.error(`${ALGO}: /getAtmStrike error`, err);
    res.status(500).json({
      error:
        err instanceof Error ? err.message : 'Failed to get ATM strike price',
    });
  }
  console.log(`${ALGO}: -----------------------------------`);
});

/**
 * @route   POST /api/api/checkAtmPosition
 * @desc    Check if an open position exists for the ATM strike
 * @access  Public
 */
router.post('/checkAtmPosition', async (req: Request, res: Response) => {
  console.log(`\n${ALGO}: ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^`);
  try {
    const istTz = new Date().toLocaleString('default', {
      timeZone: 'Asia/Kolkata',
    });
    console.log(`${ALGO}: time, ${istTz}`);
    setCred(req);

    const index: string = req.body.index || 'NIFTY';
    const type = (req.body.type || 'ALL') as 'ALL' | 'SELL' | 'BUY';

    // Require atmStrike explicitly — must come from /getAtmStrike response
    const atmStrike: number = Number(req.body.atmStrike);
    if (!atmStrike || Number.isNaN(atmStrike)) {
      return res.status(400).json({
        error: 'Missing or invalid required field: atmStrike',
      });
    }

    // Auto-detect expiry if not provided
    let expiry: string = req.body.expiry || '';
    if (!expiry) {
      expiry = await getNearestWeeklyExpiry(index as 'NIFTY' | 'BANKNIFTY');
    }

    const positions = await fetchOpenPositionsByExpiry(index, expiry, type);
    const hasPosition = hasOpenPositionForStrike(positions, atmStrike);

    console.log(
      `${ALGO}: checkAtmPosition — index: ${index}, expiry: ${expiry}, atmStrike: ${atmStrike}, hasPosition: ${hasPosition}`,
    );

    res.status(200).json({
      data: {
        index,
        expiry,
        atmStrike,
        hasOpenPosition: hasPosition,
        // Also return the matching positions for visibility
        matchingPositions: positions
          .filter(p => Number.parseInt(p.strikeprice) === atmStrike)
          .map(p => ({
            tradingsymbol: p.tradingsymbol,
            optiontype: p.optiontype,
            strikeprice: p.strikeprice,
            netqty: p.netqty,
            ltp: p.ltp,
            unrealised: p.unrealised,
            realised: p.realised,
          })),
      },
    });
  } catch (err) {
    console.error(`${ALGO}: /checkAtmPosition error`, err);
    res.status(500).json({
      error:
        err instanceof Error ? err.message : 'Failed to check ATM position',
    });
  }
  console.log(`${ALGO}: -----------------------------------`);
});

/**
 * @route   POST /api/api/getOpenPositions
 * @desc    Get open positions filtered by index and expiry
 * @access  Public
 */
router.post('/getOpenPositions', async (req: Request, res: Response) => {
  console.log(`\n${ALGO}: ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^`);
  try {
    const istTz = new Date().toLocaleString('default', {
      timeZone: 'Asia/Kolkata',
    });
    console.log(`${ALGO}: time, ${istTz}`);
    setCred(req);

    const index: string = req.body.index || 'NIFTY';
    const type = (req.body.type || 'ALL') as 'ALL' | 'SELL' | 'BUY';

    // Validate type
    if (!['ALL', 'SELL', 'BUY'].includes(type)) {
      return res.status(400).json({
        error: 'Invalid type. Must be one of: ALL, SELL, BUY',
      });
    }

    // Auto-detect nearest weekly expiry if not provided
    let expiry: string = req.body.expiry || '';
    if (!expiry) {
      expiry = await getNearestWeeklyExpiry(index as 'NIFTY' | 'BANKNIFTY');
    }

    const positions = await fetchOpenPositionsByExpiry(index, expiry, type);

    res.status(200).json({
      data: {
        index,
        expiry,
        type,
        count: positions.length,
        positions,
      },
    });
  } catch (err) {
    console.error(`${ALGO}: /getOpenPositions error`, err);
    res.status(500).json({
      error:
        err instanceof Error ? err.message : 'Failed to fetch open positions',
    });
  }
  console.log(`${ALGO}: -----------------------------------`);
});

/**
 * @route   POST /api/api/slack/commands
 * @desc    Handle Slack slash commands
 * @access  Public (Verified by Slack Signature)
 */
router.post(
  '/slack/commands',
  verifySlackSignature,
  async (req: Request, res: Response) => {
    const { command } = req.body;
    const cmd = command ? command.toLowerCase() : '';

    if (cmd === '/check' || cmd === '/status') {
      const status = isKillSwitchActive()
        ? '🛑 *Stopped (Kill Switch Active)*'
        : '✅ *Running*';
      const mode = isPaperMode() ? '📝 *PAPER MODE*' : '💰 *LIVE MODE*';

      return res.json({
        response_type: 'ephemeral',
        text: `${status}. Monitoring active.\nMode: ${mode}`,
      });
    }

    if (cmd === '/kill') {
      setKillSwitch();
      const port = config.port || 8080;
      // Trigger the server's kill route locally without waiting
      get(`http://localhost:${port}/kill`, {}).catch(() => {});

      return res.json({
        response_type: 'in_channel', // Broadcast the kill signal to the channel
        text: '🛑 *Kill Signal Received.* Initiating abrupt shutdown...',
      });
    }

    if (cmd === '/resume' || cmd === '/start') {
      clearKillSwitch();
      return res.json({
        response_type: 'in_channel',
        text: '🚀 *Kill Switch Cleared.* Algo is now allowed to run.',
      });
    }

    if (cmd === '/paperon') {
      setPaperMode(true);
      return res.json({
        response_type: 'in_channel',
        text: '📝 *Paper Trading Mode ENABLED.*',
      });
    }

    if (cmd === '/paperoff') {
      setPaperMode(false);
      return res.json({
        response_type: 'in_channel',
        text: '💰 *Live Trading Mode ENABLED.*',
      });
    }

    if (cmd === '/logs') {
      const logs = await fetchLogs();
      return res.json({
        response_type: 'ephemeral',
        text: `\`\`\`${logs}\`\`\``,
      });
    }

    return res.json({
      response_type: 'ephemeral',
      text: `Unknown command: ${command}`,
    });
  },
);

/**
 * @route   POST /api/api/executeTrade
 * @desc    Pure execution — places orders only. No decision logic.
 *          Always call /shouldExecuteTrade before this.
 * @access  Public
 */
router.post('/executeTrade', async (req: Request, res: Response) => {
  console.log(`\n${ALGO}: ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^`);
  try {
    const istTz = new Date().toLocaleString('default', {
      timeZone: 'Asia/Kolkata',
    });
    console.log(`${ALGO}: time, ${istTz}`);
    setCred(req);

    // Required fields
    const atmStrike = Number(req.body.atmStrike);
    const isFirstTrade =
      req.body.isFirstTrade === true || req.body.isFirstTrade === 'true';

    if (!atmStrike || Number.isNaN(atmStrike)) {
      return res.status(400).json({ error: 'Missing or invalid: atmStrike' });
    }
    if (req.body.isFirstTrade === undefined) {
      return res
        .status(400)
        .json({ error: 'Missing required field: isFirstTrade' });
    }

    const index: string = req.body.index || 'NIFTY';
    const sellLots: number = Number(req.body.sellLots) || 1;
    const buyLots: number = Number(req.body.buyLots) || 3;
    const hedgeDistance: number = Number(req.body.hedgeDistance) || 500;

    let expiry: string = req.body.expiry || '';
    if (!expiry) {
      expiry = await getNearestWeeklyExpiry(index as 'NIFTY' | 'BANKNIFTY');
    }

    const result = await executeSellAtmBuyHedge({
      index,
      expiry,
      atmStrike,
      isFirstTrade,
      sellLots,
      buyLots,
      hedgeDistance,
    });

    res.status(200).json({ data: result });
  } catch (err) {
    console.error(`${ALGO}: /executeTrade error`, err);
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Failed to execute trade',
    });
  }
  console.log(`${ALGO}: -----------------------------------`);
});
/**
 * @route   POST /api/api/shouldExecuteTrade
 * @desc    Decides whether to execute a trade and what kind
 * @access  Public
 */
router.post('/shouldExecuteTrade', async (req: Request, res: Response) => {
  console.log(`\n${ALGO}: ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^`);
  try {
    const istTz = new Date().toLocaleString('default', {
      timeZone: 'Asia/Kolkata',
    });
    console.log(`${ALGO}: time, ${istTz}`);
    setCred(req);

    const atmStrike = Number(req.body.atmStrike);
    if (!atmStrike || Number.isNaN(atmStrike)) {
      return res.status(400).json({
        error: 'Missing or invalid required field: atmStrike',
      });
    }

    const index: string = req.body.index || 'NIFTY';
    const maxSellPairs: number = Number(req.body.maxSellPairs) || 3;
    const buyLots: number = Number(req.body.buyLots) || 3;
    const sellLots: number = Number(req.body.sellLots) || 1;
    const hedgeDistance: number = Number(req.body.hedgeDistance) || 500;

    // Auto-detect expiry if not provided
    let expiry: string = req.body.expiry || '';
    if (!expiry) {
      expiry = await getNearestWeeklyExpiry(index as 'NIFTY' | 'BANKNIFTY');
    }

    // Fetch all open positions once — used for all checks below
    const allPositions = await fetchOpenPositionsByExpiry(index, expiry, 'ALL');

    const isFirstTrade = !hasHedgePositions(allPositions);
    const sellPairCount = countSellPairs(allPositions);
    const strikeAlreadySold = hasOpenPositionForStrike(
      allPositions.filter(p => Number.parseInt(p.netqty) < 0),
      atmStrike,
    );

    console.log(
      `${ALGO}: shouldExecuteTrade — isFirstTrade: ${isFirstTrade}, sellPairCount: ${sellPairCount}/${maxSellPairs}, strikeAlreadySold: ${strikeAlreadySold}`,
    );

    // ── Decision logic ────────────────────────────────────────────

    // Block: max pairs reached
    if (sellPairCount >= maxSellPairs) {
      return res.status(200).json({
        data: {
          shouldTrade: false,
          reason: `Max sell pairs (${maxSellPairs}) already reached`,
          isFirstTrade,
          sellPairCount,
          atmStrike,
          index,
          expiry,
        },
      });
    }

    // Block: this strike already sold
    if (strikeAlreadySold) {
      return res.status(200).json({
        data: {
          shouldTrade: false,
          reason: `Strike ${atmStrike} already has open sell positions`,
          isFirstTrade,
          sellPairCount,
          atmStrike,
          index,
          expiry,
        },
      });
    }

    // All clear — return what executeTrade needs directly
    return res.status(200).json({
      data: {
        shouldTrade: true,
        isFirstTrade,
        sellPairCount,
        reason: isFirstTrade
          ? 'First trade — buy hedges + sell ATM'
          : `Repeat trade ${sellPairCount + 1}/${maxSellPairs} — sell ATM only`,
        // Pass-through params for executeTrade
        index,
        expiry,
        atmStrike,
        sellLots,
        buyLots,
        hedgeDistance,
      },
    });
  } catch (err) {
    console.error(`${ALGO}: /shouldExecuteTrade error`, err);
    res.status(500).json({
      error:
        err instanceof Error
          ? err.message
          : 'Failed to evaluate trade conditions',
    });
  }
  console.log(`${ALGO}: -----------------------------------`);
});
/**
 * @route   POST /api/api/placeStoploss
 * @desc    Places stoploss orders for all sell positions at 150% of entry price
 * @access  Public
 */
router.post('/placeStoploss', async (req: Request, res: Response) => {
  console.log(`\n${ALGO}: ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^`);
  try {
    const istTz = new Date().toLocaleString('default', {
      timeZone: 'Asia/Kolkata',
    });
    console.log(`${ALGO}: time, ${istTz}`);
    setCred(req);

    const index: string = req.body.index || 'NIFTY';
    const stoplossFactor: number = Number(req.body.stoplossFactor) || 1.5;

    // Auto-detect expiry if not provided
    let expiry: string = req.body.expiry || '';
    if (!expiry) {
      expiry = await getNearestWeeklyExpiry(index as 'NIFTY' | 'BANKNIFTY');
    }

    const result = await placeStoplossForAllSells({
      index,
      expiry,
      stoplossFactor,
    });

    res.status(200).json({ data: result });
  } catch (err) {
    console.error(`${ALGO}: /placeStoploss error`, err);
    res.status(500).json({
      error:
        err instanceof Error ? err.message : 'Failed to place stoploss orders',
    });
  }
  console.log(`${ALGO}: -----------------------------------`);
});
/**
 * @route   POST /api/api/getTechnicalSignal
 * @desc    Get technical indicators and trading signal for a given index/stock
 * @access  Public
 */
router.post('/getTechnicalSignal', async (req: Request, res: Response) => {
  console.log(`\n${ALGO}: ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^`);
  try {
    const istTz = new Date().toLocaleString('default', {
      timeZone: 'Asia/Kolkata',
    });
    console.log(`${ALGO}: time, ${istTz}`);
    setCred(req);

    const scriptName: string = req.body.scriptName || 'NIFTY';
    const interval: string = req.body.interval || 'FIVE_MINUTE';
    const candleCount: number = Number(req.body.candleCount) || 50;

    // Get the index scrip to fetch symboltoken
    const indexScrip = await getIndexScrip({ scriptName });
    if (!indexScrip || indexScrip.length === 0) {
      return res.status(404).json({ error: `Index ${scriptName} not found` });
    }

    const symboltoken = indexScrip[0].token;
    const exchange = indexScrip[0].exch_seg;

    // Calculate date range based on interval and candle count
    const todate = moment().tz('Asia/Kolkata');
    const fromdate = moment().tz('Asia/Kolkata');

    // Estimate how far back we need to go
    switch (interval) {
      case 'ONE_MINUTE':
        fromdate.subtract(candleCount, 'minutes');
        break;
      case 'FIVE_MINUTE':
        fromdate.subtract(candleCount * 5, 'minutes');
        break;
      case 'FIFTEEN_MINUTE':
        fromdate.subtract(candleCount * 15, 'minutes');
        break;
      case 'ONE_HOUR':
        fromdate.subtract(candleCount, 'hours');
        break;
      case 'ONE_DAY':
        fromdate.subtract(candleCount, 'days');
        break;
      default:
        fromdate.subtract(candleCount * 5, 'minutes');
    }

    // Validate interval parameter
    const validIntervals = [
      'ONE_MINUTE',
      'THREE_MINUTE',
      'FIVE_MINUTE',
      'TEN_MINUTE',
      'FIFTEEN_MINUTE',
      'THIRTY_MINUTE',
      'ONE_HOUR',
      'ONE_DAY',
    ] as const;
    type ValidInterval = (typeof validIntervals)[number];

    if (!validIntervals.includes(interval as ValidInterval)) {
      return res.status(400).json({
        error: `Invalid interval. Must be one of: ${validIntervals.join(', ')}`,
      });
    }

    // Fetch candle data
    const candles = await getCandleData({
      exchange,
      symboltoken,
      interval: interval as (typeof validIntervals)[number],
      fromdate: fromdate.format('YYYY-MM-DD HH:mm'),
      todate: todate.format('YYYY-MM-DD HH:mm'),
    });

    if (!candles || candles.length < 30) {
      return res.status(400).json({
        error: `Not enough candle data. Got ${candles?.length || 0} candles, need at least 50`,
      });
    }

    // Extract close prices: candle format is [timestamp, open, high, low, close, volume]
    const closes = candles.map(candle => candle[4]);

    // Generate signal
    const technicalData = generateTradingSignal(closes);

    res.status(200).json({
      data: {
        scriptName,
        interval,
        candleCount: candles.length,
        lastPrice: closes.at(-1),
        ...technicalData,
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error(`${ALGO}: /getTechnicalSignal error`, err);
    res.status(500).json({
      error:
        err instanceof Error ? err.message : 'Failed to get technical signal',
    });
  }
  console.log(`${ALGO}: -----------------------------------`);
});
/**
 * @route   POST /api/api/debugCandles
 * @desc    Debug endpoint to see raw candle data from SmartAPI
 * @access  Public
 */
router.post('/debugCandles', async (req: Request, res: Response) => {
  console.log(`\n${ALGO}: ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^`);
  try {
    setCred(req);

    const scriptName: string = req.body.scriptName || 'NIFTY';
    const interval: string = req.body.interval || 'FIVE_MINUTE';

    // Validate interval parameter
    const validIntervals = [
      'ONE_MINUTE',
      'THREE_MINUTE',
      'FIVE_MINUTE',
      'TEN_MINUTE',
      'FIFTEEN_MINUTE',
      'THIRTY_MINUTE',
      'ONE_HOUR',
      'ONE_DAY',
    ] as const;
    type ValidInterval = (typeof validIntervals)[number];

    const indexScrip = await getIndexScrip({ scriptName });
    const symboltoken = indexScrip[0].token;
    const exchange = indexScrip[0].exch_seg;

    // Go back 5 days from now
    const todate = moment().tz('Asia/Kolkata');
    const fromdate = todate.clone().subtract(5, 'days');

    console.log(
      `${ALGO}: Debug request — from: ${fromdate.format('YYYY-MM-DD HH:mm')}, to: ${todate.format('YYYY-MM-DD HH:mm')}`,
    );

    const candles = await getCandleData({
      exchange,
      symboltoken,
      interval: interval as ValidInterval,
      fromdate: fromdate.format('YYYY-MM-DD HH:mm'),
      todate: todate.format('YYYY-MM-DD HH:mm'),
    });

    res.status(200).json({
      data: {
        scriptName,
        symboltoken,
        exchange,
        interval,
        fromdate: fromdate.format('YYYY-MM-DD HH:mm'),
        todate: todate.format('YYYY-MM-DD HH:mm'),
        candleCount: candles.length,
        firstCandle: candles[0],
        lastCandle: candles.at(-1),
        sample: candles.slice(0, 5), // First 5 candles
      },
    });
  } catch (err) {
    console.error(`${ALGO}: /debugCandles error`, err);
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Failed',
      details: err,
    });
  }
  console.log(`${ALGO}: -----------------------------------`);
});
export default router;
