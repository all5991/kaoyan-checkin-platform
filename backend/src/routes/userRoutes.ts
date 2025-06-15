import { Router } from 'express';
import {
  register,
  login,
  getProfile,
  updateProfile,
  getUserStats,
  sendEmailCode,
  getExamCountdown
} from '../controllers/userController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// 公开路由
router.post('/register', register);
router.post('/login', login);
router.post('/send-code', sendEmailCode);

// 需要认证的路由
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, updateProfile);
router.get('/stats', authenticateToken, getUserStats);
router.get('/exam-countdown', getExamCountdown); // 考研倒计时不需要认证

export default router;