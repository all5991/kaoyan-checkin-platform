import { Router } from 'express';
import {
  createGroup,
  joinGroup,
  getUserGroups,
  getGroupDetail,
  getGroupMessages,
  sendMessage,
  getGroupCheckInStatus,
  getPublicGroups,
  leaveGroup
} from '../controllers/groupController';

const router = Router();

// 小组管理
router.post('/', createGroup);
router.get('/', getUserGroups); // 添加获取用户小组的路由
router.post('/join', joinGroup);
router.get('/my-groups', getUserGroups);
router.get('/my', getUserGroups); // 为了兼容前端旧版调用
router.get('/public', getPublicGroups);
router.post('/:groupId/leave', leaveGroup);
router.get('/:groupId', getGroupDetail);

// 小组消息
router.get('/:groupId/messages', getGroupMessages);
router.post('/:groupId/messages', sendMessage);

// 小组打卡状态
router.get('/:groupId/checkin-status', getGroupCheckInStatus);

export default router;