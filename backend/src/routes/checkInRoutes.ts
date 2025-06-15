import { Router } from 'express';
import {
  createCheckIn,
  getCheckIns,
  getTodayCheckIns,
  getCheckInStats,
} from '../controllers/checkInController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// 所有路由都需要认证
router.use(authenticateToken);

router.post('/', createCheckIn);
router.get('/', getCheckIns);
router.get('/today', getTodayCheckIns);
router.get('/stats', getCheckInStats);

export default router; 