import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function setAdminRole() {
  try {
    console.log('设置管理员角色...');

    // 查找第一个用户并设置为管理员
    const firstUser = await prisma.user.findFirst({
      orderBy: { createdAt: 'asc' }
    });

    if (!firstUser) {
      console.log('没有找到用户，创建默认管理员账户...');
      
      // 创建默认管理员账户
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      const adminUser = await prisma.user.create({
        data: {
          email: 'admin@example.com',
          username: 'admin',
          password: hashedPassword,
          nickname: '系统管理员',
          role: 'admin',
        }
      });

      console.log('✅ 默认管理员账户创建成功:');
      console.log(`   邮箱: admin@example.com`);
      console.log(`   用户名: admin`);
      console.log(`   密码: admin123`);
      console.log(`   ID: ${adminUser.id}`);
    } else {
      // 将第一个用户设置为管理员
      await prisma.user.update({
        where: { id: firstUser.id },
        data: { role: 'admin' }
      });

      console.log('✅ 用户设置为管理员成功:');
      console.log(`   邮箱: ${firstUser.email}`);
      console.log(`   用户名: ${firstUser.username}`);
      console.log(`   ID: ${firstUser.id}`);
    }

    console.log('\n🎉 管理员设置完成！');
  } catch (error) {
    console.error('❌ 设置管理员失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setAdminRole(); 