import { Router, Request, Response } from 'express';
import { checkMarketConditionsAndExecuteTrade, checkMarketConditions } from '../helpers/apiService';
import { ALGO } from '../helpers/constants';
import { setCred } from '../helpers/functions';
import { isKillSwitchActive } from '../helpers/killSwitch';
import { logger } from '../helpers/logger';

const router = Router();

/**
 * @route   POST /api/algo/run-short-straddle
 * @desc    Run the short straddle algorithm and execute the trade
 * @access  Public
 */
router.post('/run-short-straddle', async (req: Request, res: Response) => {
  if (isKillSwitchActive()) {
    return res.status(403).json({ response: 'Algo is disabled by kill switch. Send /resume via Telegram to enable.' });
  }

  logger.log(`${ALGO}: ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^`);
  try {
    const istTz = new Date().toLocaleString('default', { timeZone: 'Asia/Kolkata' });
    logger.log(`${ALGO}: time, ${istTz}`);

    setCred(req);

    const lots: number = req.body.lots;
    const lossPerLot: number = req.body.loss_per_lot;

    logger.log(`${ALGO}: lots: ${lots}`);

    const response = await checkMarketConditionsAndExecuteTrade(lots, lossPerLot);
    logger.log(`${ALGO} response: ${response}`);

    res.json({ response });
  } catch (err) {
    logger.error(`${ALGO} Error:`, err);
    res.status(500).json({ response: err });
  }
  logger.log(`${ALGO}: -----------------------------------`);
});

/**
 * @route   POST /api/algo/check-market-conditions
 * @desc    Check market conditions without executing the trade
 * @access  Public
 */
router.post('/check-market-conditions', async (req: Request, res: Response) => {
  if (isKillSwitchActive()) {
    return res.status(403).json({ response: 'Algo is disabled by kill switch. Send /resume via Telegram to enable.' });
  }

  logger.log(`${ALGO}: ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^`);
  try {
    const istTz = new Date().toLocaleString('default', { timeZone: 'Asia/Kolkata' });
    logger.log(`${ALGO}: time, ${istTz}`);

    setCred(req);

    const response = await checkMarketConditions();
    logger.log(`${ALGO} response: ${JSON.stringify(response)}`);
    res.json({ response });
  } catch (err) {
    logger.error(`${ALGO} Error:`, err);
    res.status(500).json({ response: err });
  }
  logger.log(`${ALGO}: -----------------------------------`);
});

export default router;
