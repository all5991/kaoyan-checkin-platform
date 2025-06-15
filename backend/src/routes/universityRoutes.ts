import { Router } from 'express';
import {
  getAllUniversities,
  getUniversityDetail,
  setTargetUniversity,
  getPopularUniversities,
  getUniversitiesByLevel,
  createUniversity,
  updateUniversity,
  deleteUniversity,
} from '../controllers/universityController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// 公开路由
router.get('/', getAllUniversities);
router.get('/popular', getPopularUniversities);
router.get('/level/:level', getUniversitiesByLevel);
router.get('/:id', getUniversityDetail);

// 需要认证的路由
router.post('/set-target', authenticateToken, setTargetUniversity);

// 管理员路由（暂时开放，生产环境需要管理员权限验证）
router.post('/', createUniversity);
router.put('/:id', updateUniversity);
router.delete('/:id', deleteUniversity);

export default router; 