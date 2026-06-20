import { Router } from 'express';
import { getImpactStats } from '../lib/impactStats';

const router = Router();

router.get('/impact', async (_req, res) => {
  try {
    const stats = await getImpactStats();
    res.json(stats);
  } catch (err) {
    console.error('[Impact] Failed to load stats:', err);
    res.status(500).json({
      error: 'Unable to load impact metrics',
      message: (err as Error).message,
    });
  }
});

export default router;
