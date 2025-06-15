import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../utils/database';

// 创建小组
export const createGroup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: '未授权访问',
      });
      return;
    }

    const { name, description, maxMembers = 20, isPublic = true } = req.body;

    if (!name || !description) {
      res.status(400).json({
        success: false,
        message: '小组名称和描述不能为空',
      });
      return;
    }

    // 生成邀请码
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const group = await prisma.group.create({
      data: {
        name,
        description,
        maxMembers,
        isPublic,
        inviteCode,
        createdBy: req.user.id,
        members: {
          create: {
            userId: req.user.id,
            role: 'admin',
            joinedAt: new Date(),
          },
        },
      },
      include: {
        members: {
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
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: '小组创建成功',
      data: {
        ...group,
        memberCount: group._count.members,
      },
    });
  } catch (error) {
    console.error('创建小组失败:', error);
    res.status(500).json({
      success: false,
      message: '创建小组失败',
    });
  }
};

// 加入小组
export const joinGroup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: '未授权访问',
      });
      return;
    }

    const { inviteCode, groupId } = req.body;

    if (!inviteCode && !groupId) {
      res.status(400).json({
        success: false,
        message: '邀请码或小组ID不能为空',
      });
      return;
    }

    let group;

    // 如果提供了groupId，通过ID查找小组
    if (groupId) {
      group = await prisma.group.findUnique({
        where: { id: groupId },
        include: {
          _count: {
            select: {
              members: true,
            },
          },
        },
      });

      if (!group) {
        res.status(404).json({
          success: false,
          message: '小组不存在',
        });
        return;
      }

      // 检查小组是否为公开小组
      if (!group.isPublic) {
        res.status(400).json({
          success: false,
          message: '非公开小组需要邀请码才能加入',
        });
        return;
      }
    } else {
      // 通过邀请码查找小组
      group = await prisma.group.findUnique({
        where: { inviteCode },
        include: {
          _count: {
            select: {
              members: true,
            },
          },
        },
      });

      if (!group) {
        res.status(404).json({
          success: false,
          message: '邀请码无效',
        });
        return;
      }
    }

    // 检查是否已经是成员
    const existingMember = await prisma.groupMember.findFirst({
      where: {
        groupId: group.id,
        userId: req.user.id,
      },
    });

    if (existingMember) {
      res.status(400).json({
        success: false,
        message: '您已经是该小组成员',
      });
      return;
    }

    // 检查小组是否已满
    if (group._count.members >= group.maxMembers) {
      res.status(400).json({
        success: false,
        message: '小组人数已满',
      });
      return;
    }

    // 加入小组
    await prisma.groupMember.create({
      data: {
        groupId: group.id,
        userId: req.user.id,
        role: 'member',
        joinedAt: new Date(),
      },
    });

    // 获取完整的小组信息并返回
    const fullGroup = await prisma.group.findUnique({
      where: { id: group.id },
      include: {
        members: {
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
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    res.json({
      success: true,
      message: '成功加入小组',
      data: {
        ...fullGroup,
        memberCount: fullGroup?._count.members || 0,
      },
    });
  } catch (error) {
    console.error('加入小组失败:', error);
    res.status(500).json({
      success: false,
      message: '加入小组失败',
    });
  }
};

// 获取用户小组列表
export const getUserGroups = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: '未授权访问',
      });
      return;
    }

    const groups = await prisma.group.findMany({
      where: {
        members: {
          some: {
            userId: req.user.id,
          },
        },
      },
      include: {
        members: {
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
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 转换日期为ISO字符串格式，确保前端可以正确解析
    const formattedGroups = groups.map(group => ({
      ...group,
      memberCount: group._count.members, // 添加memberCount字段
      createdAt: group.createdAt.toISOString(),
      updatedAt: group.updatedAt.toISOString(),
      members: group.members.map(member => ({
        ...member,
        joinedAt: member.joinedAt.toISOString()
      }))
    }));

    res.json({
      success: true,
      data: formattedGroups,
    });
  } catch (error) {
    console.error('获取小组列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取小组列表失败',
    });
  }
};

// 获取小组详情
export const getGroupDetail = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: '未授权访问',
      });
      return;
    }

    const { groupId } = req.params;

    // 检查是否是小组成员
    const member = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId: req.user.id,
      },
    });

    if (!member) {
      res.status(403).json({
        success: false,
        message: '您不是该小组成员',
      });
      return;
    }

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
                avatar: true,
                targetUniversityId: true,
                targetMajor: true,
              },
            },
          },
          orderBy: {
            joinedAt: 'asc',
          },
        },
      },
    });

    if (!group) {
      res.status(404).json({
        success: false,
        message: '小组不存在',
      });
      return;
    }

    res.json({
      success: true,
      data: group,
    });
  } catch (error) {
    console.error('获取小组详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取小组详情失败',
    });
  }
};

// 获取小组消息
export const getGroupMessages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: '未授权访问',
      });
      return;
    }

    const { groupId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // 检查是否是小组成员
    const member = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId: req.user.id,
      },
    });

    if (!member) {
      res.status(403).json({
        success: false,
        message: '您不是该小组成员',
      });
      return;
    }

    const messages = await prisma.message.findMany({
      where: { groupId },
      include: {
        sender: {
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
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });

    res.json({
      success: true,
      data: messages.reverse(), // 按时间正序返回
    });
  } catch (error) {
    console.error('获取小组消息失败:', error);
    res.status(500).json({
      success: false,
      message: '获取小组消息失败',
    });
  }
};

// 发送消息
export const sendMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: '未授权访问',
      });
      return;
    }

    const { groupId } = req.params;
    const { content, type = 'text', fileUrl, fileName, fileSize } = req.body;

    if (!content) {
      res.status(400).json({
        success: false,
        message: '消息内容不能为空',
      });
      return;
    }

    // 检查是否是小组成员
    const member = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId: req.user.id,
      },
    });

    if (!member) {
      res.status(403).json({
        success: false,
        message: '您不是该小组成员',
      });
      return;
    }

    // 根据消息类型处理内容
    let messageContent = content;
    if (type === 'image' || type === 'file') {
      // 如果前端传来的是独立的文件信息字段，则构建JSON
      if (fileUrl || fileName || fileSize) {
        const fileInfo = {
          url: fileUrl || content,
          name: fileName || '文件',
          size: fileSize || 0
        };
        messageContent = JSON.stringify(fileInfo);
      }
      // 如果content已经是JSON字符串（前端已经处理好），直接使用
      else {
        messageContent = content;
      }
    }

    const message = await prisma.message.create({
      data: {
        groupId,
        senderId: req.user.id,
        content: messageContent,
        type,
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
      },
    });

    res.status(201).json({
      success: true,
      message: '消息发送成功',
      data: message,
    });
  } catch (error) {
    console.error('发送消息失败:', error);
    res.status(500).json({
      success: false,
      message: '发送消息失败',
    });
  }
};

// 获取小组成员打卡状态
export const getGroupCheckInStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: '未授权访问',
      });
      return;
    }

    const { groupId } = req.params;

    // 检查是否是小组成员
    const member = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId: req.user.id,
      },
    });

    if (!member) {
      res.status(403).json({
        success: false,
        message: '您不是该小组成员',
      });
      return;
    }

    // 获取今天的日期
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    // 获取小组成员及其今日打卡状态
    const members = await prisma.groupMember.findMany({
      where: { groupId },
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

    const memberStatus = await Promise.all(
      members.map(async (member: any) => {
        const todayCheckIns = await prisma.checkIn.findMany({
          where: {
            userId: member.userId,
            createdAt: {
              gte: startOfDay,
              lt: endOfDay,
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        });

        const status = {
          start: todayCheckIns.some((c: any) => c.type === 'start'),
          progress: todayCheckIns.some((c: any) => c.type === 'progress'),
          end: todayCheckIns.some((c: any) => c.type === 'end'),
        };

        return {
          user: member.user,
          checkInStatus: status,
          lastCheckIn: todayCheckIns[todayCheckIns.length - 1] || null,
        };
      })
    );

    res.json({
      success: true,
      data: memberStatus,
    });
  } catch (error) {
    console.error('获取小组打卡状态失败:', error);
    res.status(500).json({
      success: false,
      message: '获取小组打卡状态失败',
    });
  }
}; 

// 获取公开小组列表
export const getPublicGroups = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: '未授权访问',
      });
      return;
    }

    const groups = await prisma.group.findMany({
      where: {
        isPublic: true,
        // 排除用户已加入的小组
        NOT: {
          members: {
            some: {
              userId: req.user.id,
            },
          },
        },
      },
      include: {
        _count: {
          select: {
            members: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 添加memberCount字段
    const formattedGroups = groups.map(group => ({
      ...group,
      memberCount: group._count.members,
    }));

    res.json({
      success: true,
      data: formattedGroups,
    });
  } catch (error) {
    console.error('获取公开小组列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取公开小组列表失败',
    });
  }
};

// 离开小组
export const leaveGroup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: '未授权访问',
      });
      return;
    }

    const { groupId } = req.params;

    // 检查小组是否存在
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: true,
      },
    });

    if (!group) {
      res.status(404).json({
        success: false,
        message: '小组不存在',
      });
      return;
    }

    // 检查用户是否是小组成员
    const member = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId: req.user.id,
      },
    });

    if (!member) {
      res.status(400).json({
        success: false,
        message: '您不是该小组成员',
      });
      return;
    }

    // 检查是否是管理员，如果是管理员且不是唯一成员，则不允许离开
    if (member.role === 'admin' && group.members.length > 1) {
      const otherAdmins = group.members.filter(m => m.role === 'admin' && m.userId !== req.user!.id);
      
      if (otherAdmins.length === 0) {
        res.status(400).json({
          success: false,
          message: '您是小组唯一管理员，请先指定其他管理员',
        });
        return;
      }
    }

    // 离开小组
    await prisma.groupMember.delete({
      where: {
        id: member.id,
      },
    });

    // 如果是唯一成员，则删除小组
    if (group.members.length === 1) {
      await prisma.group.delete({
        where: {
          id: groupId,
        },
      });
    }

    res.json({
      success: true,
      message: '已成功离开小组',
    });
  } catch (error) {
    console.error('离开小组失败:', error);
    res.status(500).json({
      success: false,
      message: '离开小组失败',
    });
  }
};