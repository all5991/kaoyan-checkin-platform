import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import * as adminController from '../controllers/adminController';

const router = Router();

// 所有管理员路由都需要身份验证和管理员权限
router.use(authenticateToken);
router.use(adminController.requireAdmin);

// 用户管理
router.get('/users', adminController.getAllUsers);
router.get('/users/:userId', adminController.getUserDetail);
router.put('/users/:userId', adminController.updateUser);
router.delete('/users/:userId', adminController.deleteUser);

// 打卡记录管理
router.get('/checkins', adminController.getAllCheckIns);
router.put('/checkins/:checkInId', adminController.updateCheckIn);
router.delete('/checkins/:checkInId', adminController.deleteCheckIn);

// 学习小组管理
router.get('/groups', adminController.getAllGroups);
router.get('/groups/:groupId', adminController.getGroupDetail);
router.delete('/groups/:groupId', adminController.deleteGroup);
router.delete('/groups/:groupId/messages', adminController.deleteGroupMessages);
router.delete('/messages/:messageId', adminController.deleteGroupMessage);
router.delete('/groups/:groupId/members/:userId', adminController.removeGroupMember);

// 系统统计
router.get('/stats', adminController.getSystemStats);

export default router; 