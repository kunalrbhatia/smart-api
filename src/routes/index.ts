import { Router, Request, Response } from 'express';
import algoRoutes from './algo.routes';
import apiRouter from './api.routes';
const router = Router();

router.get('/', (req: Request, res: Response) => {
  res.json({ status: 'ok', lastUpdated: '2023-08-18, 00:33:00' });
});
router.use('/api', apiRouter);
router.use('/algo', algoRoutes);

export default router;
