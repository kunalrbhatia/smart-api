import { Router, Request, Response } from 'express';
import algoRoutes from './algo.routes';
import apiRouter from './api.routes';
import { shutdown } from '../server';
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
  setTimeout(shutdown, 1000);
  res.send("Execution of the 'Kill Algo' command has been initiated.");
});
router.use('/api', apiRouter);
router.use('/algo', algoRoutes);

export default router;
