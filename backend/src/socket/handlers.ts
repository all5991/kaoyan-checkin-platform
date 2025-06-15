import { Server } from 'socket.io';
import { verifyToken } from '../utils/jwt';
import { prisma } from '../utils/database';

export const setupSocketHandlers = (io: Server) => {
  // 身份验证中间件
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = verifyToken(token);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, username: true, nickname: true, avatar: true },
      });

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.data.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User ${socket.data.user.username} connected`);

    // 加入小组
    socket.on('join-group', async (groupId: string) => {
      try {
        const member = await prisma.groupMember.findUnique({
          where: {
            groupId_userId: {
              userId: socket.data.user.id,
              groupId,
            },
          },
        });

        if (!member) {
          socket.emit('error', { message: '您不是该小组成员' });
          return;
        }

        socket.join(groupId);
        socket.to(groupId).emit('user-joined', socket.data.user, groupId);
        console.log(`User ${socket.data.user.username} joined group ${groupId}`);
      } catch (error) {
        socket.emit('error', { message: '加入小组失败' });
      }
    });

    // 离开小组
    socket.on('leave-group', (groupId: string) => {
      socket.leave(groupId);
      socket.to(groupId).emit('user-left', socket.data.user.id, groupId);
      console.log(`User ${socket.data.user.username} left group ${groupId}`);
    });

    // 发送消息
    socket.on('send-message', async (data) => {
      try {
        const { content, groupId, type = 'text' } = data;

        // 验证用户是否是小组成员
        const member = await prisma.groupMember.findUnique({
          where: {
            groupId_userId: {
              userId: socket.data.user.id,
              groupId,
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
            senderId: socket.data.user.id,
            groupId,
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
        io.to(groupId).emit('message-received', message);
      } catch (error) {
        socket.emit('error', { message: '发送消息失败' });
      }
    });

    // 正在输入
    socket.on('typing', (groupId: string) => {
      socket.to(groupId).emit('user-typing', socket.data.user, groupId);
    });

    // 停止输入
    socket.on('stop-typing', (groupId: string) => {
      socket.to(groupId).emit('user-stopped-typing', socket.data.user.id, groupId);
    });

    // 断开连接
    socket.on('disconnect', () => {
      console.log(`User ${socket.data.user.username} disconnected`);
    });
  });
}; 