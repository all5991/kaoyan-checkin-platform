import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('开始初始化数据库...');

  // 创建院校数据
  const universities = [
    {
      name: '清华大学',
      logoUrl: 'https://example.com/tsinghua.png',
      location: '北京',
      type: '985,211,双一流'
    },
    {
      name: '北京大学',
      logoUrl: 'https://example.com/pku.png',
      location: '北京',
      type: '985,211,双一流'
    },
    {
      name: '复旦大学',
      logoUrl: 'https://example.com/fudan.png',
      location: '上海',
      type: '985,211,双一流'
    },
    {
      name: '上海交通大学',
      logoUrl: 'https://example.com/sjtu.png',
      location: '上海',
      type: '985,211,双一流'
    },
    {
      name: '浙江大学',
      logoUrl: 'https://example.com/zju.png',
      location: '浙江',
      type: '985,211,双一流'
    },
    {
      name: '南京大学',
      logoUrl: 'https://example.com/nju.png',
      location: '江苏',
      type: '985,211,双一流'
    },
    {
      name: '中国科学技术大学',
      logoUrl: 'https://example.com/ustc.png',
      location: '安徽',
      type: '985,211,双一流'
    },
    {
      name: '华中科技大学',
      logoUrl: 'https://example.com/hust.png',
      location: '湖北',
      type: '985,211,双一流'
    },
    {
      name: '中山大学',
      logoUrl: 'https://example.com/sysu.png',
      location: '广东',
      type: '985,211,双一流'
    },
    {
      name: '哈尔滨工业大学',
      logoUrl: 'https://example.com/hit.png',
      location: '黑龙江',
      type: '985,211,双一流'
    }
  ];

  for (const university of universities) {
    await prisma.university.upsert({
      where: { name: university.name },
      update: {},
      create: university
    });
  }

  console.log('院校数据初始化完成');

  // 创建系统配置
  const systemConfigs = [
    {
      key: 'max_group_members',
      value: '20',
      description: '小组最大成员数'
    },
    {
      key: 'checkin_reminder_hours',
      value: '9,18,22',
      description: '打卡提醒时间（小时）'
    },
    {
      key: 'task_generation_enabled',
      value: 'true',
      description: '是否启用智能任务生成'
    }
  ];

  for (const config of systemConfigs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: {},
      create: config
    });
  }

  console.log('系统配置初始化完成');

  // 创建测试用户
  const testUser = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      username: 'testuser',
      password: '$2b$10$rQZ8K9mX2nY1pL3qR5sT7uV9wX0zA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6', // 密码: 123456
      nickname: '测试用户',
      targetUniversityId: (await prisma.university.findFirst())?.id,
      targetMajor: '计算机科学与技术',
      examDate: new Date('2024-12-23')
    }
  });

  console.log('测试用户创建完成:', testUser.username);

  // 创建测试小组
  const testGroup = await prisma.group.create({
    data: {
      name: '考研学习小组',
      description: '一起努力，共同进步！',
      inviteCode: 'TEST123',
      createdBy: testUser.id,
      members: {
        create: {
          userId: testUser.id,
          role: 'admin'
        }
      }
    }
  });

  console.log('测试小组创建完成:', testGroup.name);

  console.log('数据库初始化完成！');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 