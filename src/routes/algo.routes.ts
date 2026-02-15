import { Router, Request, Response } from 'express';
import {
  checkMarketConditionsAndExecuteTrade,
  checkMarketConditions,
  getNearestWeeklyExpiry,
} from '../helpers/apiService';
import { getAtmStrikePriceForIndex, setCred } from '../helpers/functions';
import _get from 'lodash/get';
import { ALGO } from '../helpers/constants';

const router = Router();

/**
 * @route   POST /api/algo/run-short-straddle
 * @desc    Run the short straddle algorithm and execute the trade
 * @access  Public
 */
router.post('/run-short-straddle', async (req: Request, res: Response) => {
  console.log(`\n${ALGO}: ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^`);
  try {
    const istTz = new Date().toLocaleString('default', { timeZone: 'Asia/Kolkata' });
    console.log(`${ALGO}: time, ${istTz}`);

    setCred(req);

    const lots: number = req.body.lots;
    const lossPerLot: number = req.body.loss_per_lot;

    console.log(`${ALGO}: lots: ${lots}`);

    const response = await checkMarketConditionsAndExecuteTrade(lots, lossPerLot);
    console.log(`${ALGO} response: ${response}`);

    res.json({ response });
  } catch (err) {
    console.error(err);
    res.status(500).json({ response: err });
  }
  console.log(`${ALGO}: -----------------------------------`);
});

/**
 * @route   POST /api/algo/check-market-conditions
 * @desc    Check market conditions without executing the trade
 * @access  Public
 */
router.post('/check-market-conditions', async (req: Request, res: Response) => {
  console.log(`\n${ALGO}: ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^`);
  try {
    const istTz = new Date().toLocaleString('default', { timeZone: 'Asia/Kolkata' });
    console.log(`${ALGO}: time, ${istTz}`);

    setCred(req);

    const response = await checkMarketConditions();
    console.log(`${ALGO} response:`);
    console.dir(response);
    res.json({ response });
  } catch (err) {
    console.error(err);
    res.status(500).json({ response: err });
  }
  console.log(`${ALGO}: -----------------------------------`);
});

/**
 * GET /atm-strike
 * Query params:
 *   - index: 'NIFTY' | 'BANKNIFTY' | 'FINNIFTY' etc. (default: 'NIFTY')
 *   - expiry: 'DDMMMYYYY' e.g. '20FEB2025' (optional — auto-detects nearest weekly if omitted)
 *
 * Headers (credentials — same as your other endpoints):
 *   - api_key, client_code, client_pin, client_totp_pin in body OR use existing session
 */
router.post('/atm-strike', async (req: Request, res: Response) => {
  try {
    // Set credentials if passed (makes endpoint usable standalone from n8n)
    if (req.body.api_key) {
      setCred(req);
    }

    const index: string = (req.query.index as string) || req.body.index || 'NIFTY';

    // Use provided expiry or auto-detect nearest weekly
    let expiry: string = (req.query.expiry as string) || req.body.expiry || '';
    if (!expiry) {
      expiry = await getNearestWeeklyExpiry(index as 'NIFTY' | 'BANKNIFTY');
    }

    const result = await getAtmStrikePriceForIndex(index, expiry);

    return res.status(200).json({
      success: true,
      data: {
        index: result.index,
        expiry: result.expiry,
        ltp: result.ltp,
        atmStrike: result.atmStrike,
      },
    });
  } catch (error) {
    console.error(`${ALGO}: /atm-strike endpoint error`, error);
    return res.status(500).json({
      success: false,
      error: _get(error, 'message', 'Failed to get ATM strike price') || 'Failed to get ATM strike price',
    });
  }
});

export default router;
