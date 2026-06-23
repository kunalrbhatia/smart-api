import { Router, Request, Response } from 'express';
import algoRoutes from './algo.routes';
import apiRouter from './api.routes';
import { shutdownEmitter } from '../helpers/shutdownEmitter';
import { setKillSwitch } from '../helpers/killSwitch';
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

router.get('/kill', (req: Request, res: Response) => {
  logger.log(
    "Execution of 'Kill Algo' command received. Engaging kill switch and shutting down server...",
  );

  // Engage the kill switch to prevent any new trades/actions
  setKillSwitch();

  // Send response back to the client
  res.send(
    "Execution of the 'Kill Algo' command has been initiated and completed. Server is shutting down.",
  );

  // Trigger server shutdown after a short delay
  setTimeout(() => shutdownEmitter.emit('trigger'), 1000);
});

router.use('/api', apiRouter);
router.use('/algo', algoRoutes);

export default router;
