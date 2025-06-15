import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../utils/database';

// 扩展AuthRequest中的user类型以包含role字段
interface AdminAuthRequest extends AuthRequest {
  user?: {
    id: string;
    email: string;
    username: string;
    role?: string;
  };
}

// 中间件：验证管理员权限
export const requireAdmin = (req: AdminAuthRequest, res: Response, next: any): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: '未授权访问',
    });
    return;
  }

  // 只允许特定邮箱的用户访问管理员面板
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  if (req.user.email !== adminEmail) {
    res.status(403).json({
      success: false,
      message: '需要管理员权限',
    });
    return;
  }

  next();
};

// 获取所有用户列表
export const getAllUsers = async (req: AdminAuthRequest, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '20', search = '', role = '' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const where: any = {};
    
    if (search) {
      where.OR = [
        { username: { contains: search as string } },
        { email: { contains: search as string } },
        { nickname: { contains: search as string } },
      ];
    }

    // 暂时注释掉role查询，等Prisma更新后再启用
    // if (role) {
    //   where.role = role;
    // }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          username: true,
          nickname: true,
          avatar: true,
          phone: true,
          targetUniversityId: true,
          targetMajor: true,
          examDate: true,
          // role: true, // 暂时注释掉
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              checkIns: true,
              tasks: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limitNum,
        skip: offset,
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      message: '获取用户列表成功',
      data: {
        users,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户列表失败',
    });
  }
};

// 获取用户详细信息
export const getUserDetail = async (req: AdminAuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        nickname: true,
        avatar: true,
        phone: true,
        targetUniversityId: true,
        targetMajor: true,
        examDate: true,
        // role: true, // 暂时注释掉
        createdAt: true,
        updatedAt: true,
        checkIns: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        tasks: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        _count: {
          select: {
            checkIns: true,
            tasks: true,
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: '用户不存在',
      });
      return;
    }

    res.json({
      success: true,
      message: '获取用户详细信息成功',
      data: user,
    });
  } catch (error) {
    console.error('获取用户详细信息失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户详细信息失败',
    });
  }
};

// 更新用户信息
export const updateUser = async (req: AdminAuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const updateData = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...updateData,
        examDate: updateData.examDate ? new Date(updateData.examDate) : undefined,
      },
      select: {
        id: true,
        email: true,
        username: true,
        nickname: true,
        avatar: true,
        phone: true,
        targetUniversityId: true,
        targetMajor: true,
        examDate: true,
        // role: true, // 暂时注释掉
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({
      success: true,
      message: '更新用户信息成功',
      data: user,
    });
  } catch (error) {
    console.error('更新用户信息失败:', error);
    res.status(500).json({
      success: false,
      message: '更新用户信息失败',
    });
  }
};

// 删除用户
export const deleteUser = async (req: AdminAuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    await prisma.user.delete({
      where: { id: userId },
    });

    res.json({
      success: true,
      message: '删除用户成功',
    });
  } catch (error) {
    console.error('删除用户失败:', error);
    res.status(500).json({
      success: false,
      message: '删除用户失败',
    });
  }
};

// 获取所有打卡记录
export const getAllCheckIns = async (req: AdminAuthRequest, res: Response): Promise<void> => {
  try {
    const { 
      page = '1', 
      limit = '20', 
      userId = '', 
      type = '', 
      startDate = '', 
      endDate = '' 
    } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const where: any = {};
    
    if (userId) {
      where.userId = userId;
    }

    if (type) {
      where.type = type;
    }

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }

    const [checkIns, total] = await Promise.all([
      prisma.checkIn.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              nickname: true,
              avatar: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limitNum,
        skip: offset,
      }),
      prisma.checkIn.count({ where }),
    ]);

    res.json({
      success: true,
      message: '获取打卡记录成功',
      data: {
        checkIns,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error('获取打卡记录失败:', error);
    res.status(500).json({
      success: false,
      message: '获取打卡记录失败',
    });
  }
};

// 更新打卡记录
export const updateCheckIn = async (req: AdminAuthRequest, res: Response): Promise<void> => {
  try {
    const { checkInId } = req.params;
    const updateData = req.body;

    const checkIn = await prisma.checkIn.update({
      where: { id: checkInId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            nickname: true,
            avatar: true,
          },
        },
      },
    });

    res.json({
      success: true,
      message: '更新打卡记录成功',
      data: checkIn,
    });
  } catch (error) {
    console.error('更新打卡记录失败:', error);
    res.status(500).json({
      success: false,
      message: '更新打卡记录失败',
    });
  }
};

// 删除打卡记录
export const deleteCheckIn = async (req: AdminAuthRequest, res: Response): Promise<void> => {
  try {
    const { checkInId } = req.params;

    await prisma.checkIn.delete({
      where: { id: checkInId },
    });

    res.json({
      success: true,
      message: '删除打卡记录成功',
    });
  } catch (error) {
    console.error('删除打卡记录失败:', error);
    res.status(500).json({
      success: false,
      message: '删除打卡记录失败',
    });
  }
};

// 获取系统统计信息
export const getSystemStats = async (req: AdminAuthRequest, res: Response): Promise<void> => {
  try {
    const [
      totalUsers,
      totalCheckIns,
      todayCheckIns,
      recentUsers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.checkIn.count(),
      prisma.checkIn.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 最近7天
          },
        },
      }),
    ]);

    res.json({
      success: true,
      message: '获取系统统计信息成功',
      data: {
        totalUsers,
        totalCheckIns,
        todayCheckIns,
        recentUsers,
      },
    });
  } catch (error) {
    console.error('获取系统统计信息失败:', error);
    res.status(500).json({
      success: false,
      message: '获取系统统计信息失败',
    });
  }
};

// 获取所有学习小组
export const getAllGroups = async (req: AdminAuthRequest, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '20', search = '' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { description: { contains: search as string } },
      ];
    }

    const [groups, total] = await Promise.all([
      prisma.group.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              members: true,
              messages: true,
            },
          },
          members: {
            select: {
              id: true,
              role: true,
              user: {
                select: {
                  id: true,
                  username: true,
                  nickname: true,
                },
              },
            },
            take: 5, // 只取前5个成员用于显示
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limitNum,
        skip: offset,
      }),
      prisma.group.count({ where }),
    ]);

    res.json({
      success: true,
      message: '获取学习小组列表成功',
      data: {
        groups,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error('获取学习小组列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取学习小组列表失败',
    });
  }
};

// 获取小组详细信息（包括所有成员和最近消息）
export const getGroupDetail = async (req: AdminAuthRequest, res: Response): Promise<void> => {
  try {
    const { groupId } = req.params;

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                nickname: true,
                email: true,
              },
            },
          },
          orderBy: {
            joinedAt: 'asc',
          },
        },
        messages: {
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                nickname: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 50, // 最近50条消息
        },
        _count: {
          select: {
            members: true,
            messages: true,
          },
        },
      },
    });

    if (!group) {
      res.status(404).json({
        success: false,
        message: '学习小组不存在',
      });
      return;
    }

    res.json({
      success: true,
      message: '获取学习小组详细信息成功',
      data: group,
    });
  } catch (error) {
    console.error('获取学习小组详细信息失败:', error);
    res.status(500).json({
      success: false,
      message: '获取学习小组详细信息失败',
    });
  }
};

// 删除学习小组
export const deleteGroup = async (req: AdminAuthRequest, res: Response): Promise<void> => {
  try {
    const { groupId } = req.params;

    // 检查小组是否存在
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        _count: {
          select: {
            members: true,
            messages: true,
          },
        },
      },
    });

    if (!group) {
      res.status(404).json({
        success: false,
        message: '学习小组不存在',
      });
      return;
    }

    // 使用事务删除小组及相关数据
    await prisma.$transaction(async (tx) => {
      // 删除小组消息
      await tx.message.deleteMany({
        where: { groupId },
      });

      // 删除小组成员关系
      await tx.groupMember.deleteMany({
        where: { groupId },
      });

      // 删除小组
      await tx.group.delete({
        where: { id: groupId },
      });
    });

    res.json({
      success: true,
      message: `学习小组"${group.name}"删除成功`,
    });
  } catch (error) {
    console.error('删除学习小组失败:', error);
    res.status(500).json({
      success: false,
      message: '删除学习小组失败',
    });
  }
};

// 删除小组消息
export const deleteGroupMessage = async (req: AdminAuthRequest, res: Response): Promise<void> => {
  try {
    const { messageId } = req.params;

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        group: {
          select: {
            id: true,
            name: true,
          },
        },
        sender: {
          select: {
            id: true,
            username: true,
            nickname: true,
          },
        },
      },
    });

    if (!message) {
      res.status(404).json({
        success: false,
        message: '消息不存在',
      });
      return;
    }

    await prisma.message.delete({
      where: { id: messageId },
    });

    res.json({
      success: true,
      message: '消息删除成功',
    });
  } catch (error) {
    console.error('删除消息失败:', error);
    res.status(500).json({
      success: false,
      message: '删除消息失败',
    });
  }
};

// 批量删除小组消息
export const deleteGroupMessages = async (req: AdminAuthRequest, res: Response): Promise<void> => {
  try {
    const { groupId } = req.params;
    const { messageIds, deleteAll = false } = req.body;

    if (deleteAll) {
      // 删除该小组的所有消息
      const result = await prisma.message.deleteMany({
        where: { groupId },
      });

      res.json({
        success: true,
        message: `成功删除 ${result.count} 条消息`,
      });
    } else if (messageIds && Array.isArray(messageIds)) {
      // 删除指定的消息
      const result = await prisma.message.deleteMany({
        where: {
          id: { in: messageIds },
          groupId, // 确保消息属于指定小组
        },
      });

      res.json({
        success: true,
        message: `成功删除 ${result.count} 条消息`,
      });
    } else {
      res.status(400).json({
        success: false,
        message: '请提供要删除的消息ID列表或设置deleteAll为true',
      });
    }
  } catch (error) {
    console.error('批量删除消息失败:', error);
    res.status(500).json({
      success: false,
      message: '批量删除消息失败',
    });
  }
};

// 移除小组成员
export const removeGroupMember = async (req: AdminAuthRequest, res: Response): Promise<void> => {
  try {
    const { groupId, userId } = req.params;

    const member = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          userId,
          groupId,
        },
      },
      include: {
        user: {
          select: {
            username: true,
            nickname: true,
          },
        },
      },
    });

    if (!member) {
      res.status(404).json({
        success: false,
        message: '成员不存在或不在此小组中',
      });
      return;
    }

    // 获取小组信息
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { name: true },
    });

    await prisma.groupMember.delete({
      where: {
        groupId_userId: {
          userId,
          groupId,
        },
      },
    });

    res.json({
      success: true,
      message: `成功将用户"${member.user.nickname || member.user.username}"从小组"${group?.name || '未知小组'}"中移除`,
    });
  } catch (error) {
    console.error('移除小组成员失败:', error);
    res.status(500).json({
      success: false,
      message: '移除小组成员失败',
    });
  }
}; 