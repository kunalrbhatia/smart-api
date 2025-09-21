import { Router, Request, Response } from 'express';
import { checkMarketConditionsAndExecuteTrade } from '../helpers/apiService';
import { setCred } from '../helpers/functions';
import { ALGO } from '../helpers/constants';

const router = Router();

/**
 * @route   POST /api/algo/run-short-straddle
 * @desc    Run the short straddle algorithm
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

export default router;
