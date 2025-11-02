import { Router, Request, Response } from 'express';

import { fetchData, getIndexScrip, getLtpWithRetry, getLtpData, searchScrip, doOrder } from '../helpers/apiService';
import { setCred } from '../helpers/functions';
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
            maxRetries: 10,
            delayMs: 500,
          });

          return { index: key, data: ltpData };
        } catch (err) {
          console.error(`${ALGO}: error fetching ${key}`, err);
          return { index: key, error: 'Failed to fetch data' };
        }
      })
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

export default router;
