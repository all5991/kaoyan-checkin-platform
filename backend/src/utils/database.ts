import { PrismaClient } from '@prisma/client';

declare global {
  var __prisma: PrismaClient | undefined;
}

// 防止在开发环境中因热重载创建多个数据库连接
export const prisma = globalThis.__prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  errorFormat: 'pretty',
});

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}

// 连接数据库
export async function connectDatabase() {
  try {
    await prisma.$connect();
    console.log('✅ 数据库连接成功');
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
    process.exit(1);
  }
}

// 断开数据库连接
export async function disconnectDatabase() {
  try {
    await prisma.$disconnect();
    console.log('✅ 数据库连接已断开');
  } catch (error) {
    console.error('❌ 断开数据库连接失败:', error);
  }
}

export default prisma;