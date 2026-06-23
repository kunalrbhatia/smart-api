import { Router, Request, Response } from 'express';
import algoRoutes from './algo.routes';
import apiRouter from './api.routes';
import { shutdownEmitter } from '../helpers/shutdownEmitter';
import { setKillSwitch } from '../helpers/killSwitch';
import { closeTrade } from '../helpers/apiService/positions';
import { logger } from '../helpers/logger';

const router = Router();

/**
 * @route   GET /
 * @desc    Health check route
 * @access  Public
 */
router.get('/', (req: Request, res: Response) => {
  res.json({ status: 'ok', lastUpdated: '2026-02-05, 13:59:00' });
});

router.get('/kill', async (req: Request, res: Response) => {
  logger.log(
    "Execution of 'Kill Algo' command received. Engaging kill switch and closing all trades...",
  );

  // 1. Engage the kill switch to prevent any new trades
  setKillSwitch();

  // 2. Close all active positions
  try {
    await closeTrade(true);
    logger.log("All trades closed successfully during 'Kill Algo'.");
  } catch (error) {
    logger.error('Failed to close trades during /kill route:', error);
  }

  // 3. Send response back to the client
  res.send(
    "Execution of the 'Kill Algo' command has been initiated and completed.",
  );

  // 4. Trigger server shutdown after a short delay
  setTimeout(() => shutdownEmitter.emit('trigger'), 1000);
});

router.use('/api', apiRouter);
router.use('/algo', algoRoutes);

export default router;
