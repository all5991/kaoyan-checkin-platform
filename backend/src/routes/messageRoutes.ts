import { Router } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../utils/database';
import { Response } from 'express';

const router = Router();

// 获取用户的所有消息
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '未授权访问',
      });
    }

    // 获取用户所在的所有小组
    const userGroups = await prisma.groupMember.findMany({
      where: { userId: req.user.id },
      select: { groupId: true },
    });

    const groupIds = userGroups.map((g: { groupId: string }) => g.groupId);

    if (groupIds.length === 0) {
      return res.json({
        success: true,
        data: [],
      });
    }

    // 获取这些小组的消息
    const messages = await prisma.message.findMany({
      where: {
        groupId: {
          in: groupIds,
        },
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            nickname: true,
            avatar: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100, // 限制返回最近100条消息
    });

    return res.json({
      success: true,
      data: messages,
    });
  } catch (error) {
    console.error('获取消息失败:', error);
    return res.status(500).json({
      success: false,
      message: '获取消息失败',
    });
  }
});

// 标记消息为已读
router.patch('/:messageId/read', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '未授权访问',
      });
    }

    const { messageId } = req.params;

    // 验证消息是否存在且用户有权限访问
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        group: {
          include: {
            members: {
              where: { userId: req.user.id },
            },
          },
        },
      },
    });

    if (!message || message.group.members.length === 0) {
      return res.status(404).json({
        success: false,
        message: '消息不存在或无权限访问',
      });
    }

    // TODO: 实现消息已读状态的标记逻辑
    // 这里可以创建一个MessageRead表来跟踪每个用户对每条消息的阅读状态

    return res.json({
      success: true,
      message: '消息已标记为已读',
    });
  } catch (error) {
    console.error('标记消息已读失败:', error);
    return res.status(500).json({
      success: false,
      message: '标记消息已读失败',
    });
  }
});

export default router; 