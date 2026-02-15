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
} from '../helpers/apiService';
import { getAtmStrikePriceForIndex, hasOpenPositionForStrike, setCred } from '../helpers/functions';
import { ALGO } from '../helpers/constants';
import { delay, INDICES } from 'krb-smart-api-module';
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
        error: 'Missing required fields: tradingsymbol, symboltoken, and transactionType are required',
      });
    }

    if (!quantity && (!lotSize || lotSize <= 0)) {
      return res.status(400).json({
        error: 'Either quantity or lotSize (and optionally lots) must be provided',
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
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to place order' });
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
        error: 'Missing required fields: exchange, tradingsymbol, and symboltoken are required',
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
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch LTP data' });
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
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to search scrip' });
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
    const istTz = new Date().toLocaleString('default', { timeZone: 'Asia/Kolkata' });
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
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to get ATM strike price' });
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
    const istTz = new Date().toLocaleString('default', { timeZone: 'Asia/Kolkata' });
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
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to check ATM position' });
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
    const istTz = new Date().toLocaleString('default', { timeZone: 'Asia/Kolkata' });
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
        positions: positions.map(p => ({
          tradingsymbol: p.tradingsymbol,
          symboltoken: p.symboltoken,
          optiontype: p.optiontype,
          strikeprice: p.strikeprice,
          expirydate: p.expirydate,
          netqty: p.netqty,
          ltp: p.ltp,
          unrealised: p.unrealised,
          realised: p.realised,
          exchange: p.exchange,
          symbolname: p.symbolname,
        })),
      },
    });
  } catch (err) {
    console.error(`${ALGO}: /getOpenPositions error`, err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch open positions' });
  }
  console.log(`${ALGO}: -----------------------------------`);
});

export default router;
