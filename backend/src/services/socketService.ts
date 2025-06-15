import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/database';

interface SocketUser {
  id: string;
  username: string;
  nickname?: string;
  avatar?: string;
}

interface AuthenticatedSocket extends Socket {
  user?: SocketUser;
}

let io: SocketIOServer;

export const initializeSocket = (server: HTTPServer): SocketIOServer => {
  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // 身份验证中间件
  io.use(async (socket: any, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
      
      // 获取用户信息
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          username: true,
          nickname: true,
          avatar: true,
        },
      });

      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`用户 ${socket.user?.username} 已连接: ${socket.id}`);

    // 加入用户到自己的房间（用于私聊等功能）
    socket.join(`user:${socket.user?.id}`);

    // 用户上线通知
    socket.broadcast.emit('user:online', {
      userId: socket.user?.id,
      username: socket.user?.username,
      nickname: socket.user?.nickname,
    });

    // 加入小组房间
    socket.on('group:join', async (data: { groupId: string }) => {
      try {
        const { groupId } = data;

        // 验证用户是否是小组成员
        const member = await prisma.groupMember.findUnique({
          where: {
            groupId_userId: {
              groupId,
              userId: socket.user!.id,
            },
          },
        });

        if (member) {
          socket.join(`group:${groupId}`);
          socket.emit('group:joined', { groupId });
          
          // 通知小组其他成员
          socket.to(`group:${groupId}`).emit('group:member_online', {
            userId: socket.user?.id,
            username: socket.user?.username,
            nickname: socket.user?.nickname,
          });
        } else {
          socket.emit('error', { message: '您不是该小组成员' });
        }
      } catch (error) {
        socket.emit('error', { message: '加入小组失败' });
      }
    });

    // 离开小组房间
    socket.on('group:leave', (data: { groupId: string }) => {
      const { groupId } = data;
      socket.leave(`group:${groupId}`);
      socket.emit('group:left', { groupId });
      
      // 通知小组其他成员
      socket.to(`group:${groupId}`).emit('group:member_offline', {
        userId: socket.user?.id,
        username: socket.user?.username,
      });
    });

    // 发送小组消息
    socket.on('group:message', async (data: {
      groupId: string;
      content: string;
      type?: string;
    }) => {
      try {
        const { groupId, content, type = 'text' } = data;

        // 验证用户是否是小组成员
        const member = await prisma.groupMember.findUnique({
          where: {
            groupId_userId: {
              groupId,
              userId: socket.user!.id,
            },
          },
        });

        if (!member) {
          socket.emit('error', { message: '您不是该小组成员' });
          return;
        }

        // 保存消息到数据库
        const message = await prisma.message.create({
          data: {
            groupId,
            senderId: socket.user!.id,
            content,
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

        // 广播消息给小组所有成员
        io.to(`group:${groupId}`).emit('group:new_message', message);

      } catch (error) {
        console.error('发送消息失败:', error);
        socket.emit('error', { message: '发送消息失败' });
      }
    });

    // 打卡状态更新
    socket.on('checkin:update', async (data: {
      groupId?: string;
      status: string;
      content?: any;
    }) => {
      try {
        const { groupId, status, content } = data;

        // 如果指定了小组，通知小组成员
        if (groupId) {
          const member = await prisma.groupMember.findUnique({
            where: {
              groupId_userId: {
                groupId,
                userId: socket.user!.id,
              },
            },
          });

          if (member) {
            socket.to(`group:${groupId}`).emit('checkin:member_update', {
              userId: socket.user?.id,
              username: socket.user?.username,
              nickname: socket.user?.nickname,
              status,
              content,
              timestamp: new Date(),
            });
          }
        }
      } catch (error) {
        console.error('打卡状态更新失败:', error);
      }
    });

    // 学习提醒
    socket.on('reminder:send', async (data: {
      targetUserId: string;
      groupId: string;
      message: string;
    }) => {
      try {
        const { targetUserId, groupId, message } = data;

        // 验证发送者和接收者都是小组成员
        const [senderMember, targetMember] = await Promise.all([
          prisma.groupMember.findUnique({
            where: {
              groupId_userId: {
                groupId,
                userId: socket.user!.id,
              },
            },
          }),
          prisma.groupMember.findUnique({
            where: {
              groupId_userId: {
                groupId,
                userId: targetUserId,
              },
            },
          }),
        ]);

        if (senderMember && targetMember) {
          // 发送提醒给目标用户
          io.to(`user:${targetUserId}`).emit('reminder:received', {
            fromUserId: socket.user?.id,
            fromUsername: socket.user?.username,
            fromNickname: socket.user?.nickname,
            groupId,
            message,
            timestamp: new Date(),
          });

          socket.emit('reminder:sent', { success: true });
        } else {
          socket.emit('error', { message: '提醒发送失败' });
        }
      } catch (error) {
        console.error('发送提醒失败:', error);
        socket.emit('error', { message: '提醒发送失败' });
      }
    });

    // 正在输入状态
    socket.on('typing:start', (data: { groupId: string }) => {
      const { groupId } = data;
      socket.to(`group:${groupId}`).emit('typing:user_start', {
        userId: socket.user?.id,
        username: socket.user?.username,
      });
    });

    socket.on('typing:stop', (data: { groupId: string }) => {
      const { groupId } = data;
      socket.to(`group:${groupId}`).emit('typing:user_stop', {
        userId: socket.user?.id,
        username: socket.user?.username,
      });
    });

    // 连接断开
    socket.on('disconnect', () => {
      console.log(`用户 ${socket.user?.username} 已断开连接: ${socket.id}`);
      
      // 通知其他用户
      socket.broadcast.emit('user:offline', {
        userId: socket.user?.id,
        username: socket.user?.username,
      });
    });

    // 错误处理
    socket.on('error', (error) => {
      console.error('Socket错误:', error);
    });
  });

  return io;
};

// 发送系统通知
export const sendSystemNotification = (userId: string, notification: any): void => {
  if (io) {
    io.to(`user:${userId}`).emit('system:notification', notification);
  }
};

// 发送小组通知
export const sendGroupNotification = (groupId: string, notification: any): void => {
  if (io) {
    io.to(`group:${groupId}`).emit('group:notification', notification);
  }
};

// 获取在线用户数量
export const getOnlineUsersCount = (): number => {
  return io ? io.sockets.sockets.size : 0;
};

// 获取小组在线成员
export const getGroupOnlineMembers = async (groupId: string): Promise<string[]> => {
  if (!io) return [];
  
  const room = io.sockets.adapter.rooms.get(`group:${groupId}`);
  return room ? Array.from(room) : [];
};

export { io }; 