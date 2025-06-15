import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// 导入中间件
import { errorHandler, notFound } from './middleware/errorHandler';
import { authenticateToken } from './middleware/auth';

// 导入路由
import userRoutes from './routes/userRoutes';
import checkInRoutes from './routes/checkInRoutes';
import groupRoutes from './routes/groupRoutes';
import taskRoutes from './routes/taskRoutes';
import messageRoutes from './routes/messageRoutes';
import universityRoutes from './routes/universityRoutes';
import uploadRoutes from './routes/uploadRoutes';
import adminRoutes from './routes/adminRoutes';

// 导入Socket处理
import { setupSocketHandlers } from './socket/handlers';
// 导入智能任务生成
import { scheduleTaskGeneration } from './utils/taskGenerator';
// 导入数据库连接
import { connectDatabase, disconnectDatabase } from './utils/database';

// 获取允许的源
const getAllowedOrigins = () => {
  const origins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ];
  
  // 添加环境变量中的源（支持多个源，用逗号分隔）
  if (process.env.CORS_ORIGIN) {
    const corsOrigins = process.env.CORS_ORIGIN.split(',');
    origins.push(...corsOrigins);
  }
  
  return origins;
};

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: getAllowedOrigins(),
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

const PORT = process.env.PORT || 3001;

// 设置信任代理，修复X-Forwarded-For警告
app.set('trust proxy', 1);

// 安全中间件
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false
}));
app.use(compression());

// CORS配置
app.use(cors({
  origin: getAllowedOrigins(),
  credentials: true,
  optionsSuccessStatus: 200,
}));

// 请求限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 500, // 限制每个IP 15分钟内最多500个请求（提高限制）
  message: {
    success: false,
    message: '请求过于频繁，请稍后再试',
  },
  skip: (req) => {
    // 跳过对静态资源的限制
    return req.path.includes('/static/') || req.path.includes('/uploads/');
  },
});
app.use('/api/', limiter);

// 日志中间件
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// 解析请求体
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件服务 - 单独配置CORS
app.use('/uploads', cors({
  origin: getAllowedOrigins(),
  credentials: true,
}), express.static(path.join(__dirname, '../uploads'), {
  setHeaders: (res) => {
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

// API路由
app.use('/api/auth', userRoutes);
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/checkins', authenticateToken, checkInRoutes);
app.use('/api/groups', authenticateToken, groupRoutes);
app.use('/api/tasks', authenticateToken, taskRoutes);
app.use('/api/messages', authenticateToken, messageRoutes);
app.use('/api/universities', universityRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: '服务器运行正常',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// 404处理
app.use('*', notFound);

// 错误处理中间件
app.use(errorHandler);

// 设置Socket.io处理
setupSocketHandlers(io);

// 启动服务器
const startServer = async () => {
  try {
    // 连接数据库
    await connectDatabase();
    
    // 启动定时任务
    try {
      scheduleTaskGeneration();
      console.log('✅ 智能任务生成定时器已启动');
    } catch (error) {
      console.error('⚠️  智能任务生成定时器启动失败:', error);
    }

    // 启动HTTP服务器
    server.listen(PORT, () => {
      const apiBaseUrl = process.env.API_URL || `http://localhost:${PORT}/api`;
      console.log(`🚀 服务器运行在端口 ${PORT}`);
      console.log(`📱 API地址: ${apiBaseUrl}`);
      console.log(`🔧 环境: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📊 考研倒计时目标: 2025年12月20日`);
    });
  } catch (error) {
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
};

// 优雅关闭
const gracefulShutdown = async (signal: string) => {
  console.log(`收到${signal}信号，正在关闭服务器...`);
  
  // 关闭HTTP服务器
  server.close(async () => {
    console.log('HTTP服务器已关闭');
    
    // 断开数据库连接
    await disconnectDatabase();
    
    console.log('服务器已完全关闭');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 启动服务器
startServer();

export { app, io };