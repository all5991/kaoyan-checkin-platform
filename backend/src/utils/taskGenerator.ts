import { prisma } from './database';

interface StudyPattern {
  subject: string;
  duration: number; // 分钟
  effectiveness: number; // 0-1
  timeOfDay: string; // 'morning', 'afternoon', 'evening'
  difficulty: string; // 'easy', 'medium', 'hard'
}

interface TaskSuggestion {
  title: string;
  description: string;
  category: string;
  estimatedDuration: number; // 分钟
  difficulty: string;
  priority: number; // 1-5
  dueDate: Date;
}

// 学科模板
const SUBJECT_TEMPLATES = {
  '数学': {
    tasks: [
      { title: '高等数学练习', description: '完成微积分相关题目', category: '数学', duration: 120 },
      { title: '线性代数复习', description: '矩阵运算和线性方程组', category: '数学', duration: 90 },
      { title: '概率论学习', description: '概率分布和统计推断', category: '数学', duration: 100 },
      { title: '数学真题练习', description: '历年考研数学真题', category: '数学', duration: 150 },
    ]
  },
  '英语': {
    tasks: [
      { title: '英语单词背诵', description: '背诵考研核心词汇', category: '英语', duration: 60 },
      { title: '英语阅读理解', description: '完成阅读理解练习', category: '英语', duration: 90 },
      { title: '英语作文练习', description: '写作技巧和模板练习', category: '英语', duration: 80 },
      { title: '英语听力训练', description: '提升听力理解能力', category: '英语', duration: 45 },
    ]
  },
  '政治': {
    tasks: [
      { title: '马原理论学习', description: '马克思主义基本原理', category: '政治', duration: 90 },
      { title: '毛概知识点', description: '毛泽东思想概论', category: '政治', duration: 80 },
      { title: '时事政治', description: '当前时事和政策解读', category: '政治', duration: 60 },
      { title: '政治选择题', description: '政治选择题专项训练', category: '政治', duration: 45 },
    ]
  },
  '专业课': {
    tasks: [
      { title: '专业课笔记整理', description: '整理专业课重点知识', category: '专业课', duration: 120 },
      { title: '专业课真题', description: '目标院校专业课真题', category: '专业课', duration: 180 },
      { title: '专业书籍阅读', description: '阅读专业相关书籍', category: '专业课', duration: 150 },
      { title: '专业课论文研读', description: '研读相关学术论文', category: '专业课', duration: 100 },
    ]
  }
};

// 分析用户学习模式
export const analyzeStudyPattern = async (userId: string, days: number = 7): Promise<StudyPattern[]> => {
  const checkIns = await prisma.checkIn.findMany({
    where: {
      userId,
      createdAt: {
        gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const patterns: StudyPattern[] = [];
  const subjectStats: Record<string, { totalDuration: number; count: number; effectiveness: number }> = {};

  checkIns.forEach((checkIn: any) => {
    if (checkIn.status === 'completed' && checkIn.content) {
      try {
        const content = JSON.parse(checkIn.content);
        const subject = content.subject || '其他';
        const duration = content.duration || 60;
        const mood = content.mood || 5; // 1-10
        const effectiveness = mood / 10; // 转换为0-1

        if (!subjectStats[subject]) {
          subjectStats[subject] = { totalDuration: 0, count: 0, effectiveness: 0 };
        }

        subjectStats[subject].totalDuration += duration;
        subjectStats[subject].count += 1;
        subjectStats[subject].effectiveness += effectiveness;
      } catch (error) {
        console.error('解析打卡内容失败:', error);
      }
    }
  });

  // 生成学习模式
  Object.entries(subjectStats).forEach(([subject, stats]) => {
    patterns.push({
      subject,
      duration: Math.round(stats.totalDuration / stats.count),
      effectiveness: stats.effectiveness / stats.count,
      timeOfDay: 'morning', // 可以根据时间分析
      difficulty: stats.effectiveness > 0.7 ? 'hard' : stats.effectiveness > 0.5 ? 'medium' : 'easy',
    });
  });

  return patterns;
};

// 生成智能任务建议
export const generateTaskSuggestions = async (userId: string): Promise<TaskSuggestion[]> => {
  const patterns = await analyzeStudyPattern(userId);
  const suggestions: TaskSuggestion[] = [];
  
  // 获取用户信息
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { examDate: true, targetMajor: true },
  });

  const examDate = user?.examDate || new Date('2025-12-20T08:30:00');
  const daysUntilExam = Math.ceil((examDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  // 如果是第一天（没有学习模式），生成基础任务
  if (patterns.length === 0) {
    const basicSubjects = ['数学', '英语', '政治'];
    basicSubjects.forEach((subject, index) => {
      const template = SUBJECT_TEMPLATES[subject as keyof typeof SUBJECT_TEMPLATES];
      if (template) {
        const task = template.tasks[0];
        suggestions.push({
          title: task.title,
          description: task.description,
          category: task.category,
          estimatedDuration: task.duration,
          difficulty: 'medium',
          priority: 3,
          dueDate: new Date(Date.now() + (index + 1) * 24 * 60 * 60 * 1000),
        });
      }
    });
    return suggestions;
  }

  // 基于学习模式生成任务
  patterns.forEach((pattern) => {
    const template = SUBJECT_TEMPLATES[pattern.subject as keyof typeof SUBJECT_TEMPLATES];
    if (template) {
      // 根据效果调整任务难度
      let taskIndex = 0;
      if (pattern.effectiveness > 0.8) {
        taskIndex = Math.min(template.tasks.length - 1, 2); // 较难任务
      } else if (pattern.effectiveness > 0.6) {
        taskIndex = 1; // 中等任务
      } else {
        taskIndex = 0; // 基础任务
      }

      const task = template.tasks[taskIndex];
      
      // 根据考试临近程度调整优先级
      const priority = daysUntilExam < 30 ? 5 : daysUntilExam < 90 ? 4 : 3;
      
      suggestions.push({
        title: task.title,
        description: task.description,
        category: task.category,
        estimatedDuration: Math.min(pattern.duration + 30, task.duration), // 逐步增加时长
        difficulty: pattern.difficulty,
        priority,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 明天
      });
    }
  });

  // 如果建议太少，添加一些通用任务
  if (suggestions.length < 3) {
    const additionalSubjects = Object.keys(SUBJECT_TEMPLATES).filter(
      subject => !patterns.some(p => p.subject === subject)
    );

    additionalSubjects.slice(0, 3 - suggestions.length).forEach((subject) => {
      const template = SUBJECT_TEMPLATES[subject as keyof typeof SUBJECT_TEMPLATES];
      const task = template.tasks[0];
      suggestions.push({
        title: task.title,
        description: task.description,
        category: task.category,
        estimatedDuration: task.duration,
        difficulty: 'medium',
        priority: 2,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
    });
  }

  // 按优先级排序
  return suggestions.sort((a, b) => b.priority - a.priority);
};

// 创建任务记录
export const createTasksForUser = async (userId: string): Promise<void> => {
  const suggestions = await generateTaskSuggestions(userId);
  
  for (const suggestion of suggestions) {
    await prisma.task.create({
      data: {
        userId,
        title: suggestion.title,
        description: suggestion.description,
        category: suggestion.category,
        estimatedDuration: suggestion.estimatedDuration,
        difficulty: suggestion.difficulty,
        priority: suggestion.priority,
        dueDate: suggestion.dueDate,
        status: 'pending',
        isGenerated: true,
      },
    });
  }
};

// 定时生成任务（每天凌晨执行）
export const scheduleTaskGeneration = (): void => {
  setInterval(async () => {
    const now = new Date();
    
    // 每天凌晨2点执行
    if (now.getHours() === 2 && now.getMinutes() === 0) {
      try {
        // 获取所有活跃用户
        const users = await prisma.user.findMany({
          where: {
            updatedAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7天内活跃
            },
          },
          select: { id: true },
        });

        // 为每个用户生成任务
        for (const user of users) {
          // 检查今天是否已经生成过任务
          const todayTasks = await prisma.task.count({
            where: {
              userId: user.id,
              isGenerated: true,
              createdAt: {
                gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
              },
            },
          });

          if (todayTasks === 0) {
            await createTasksForUser(user.id);
          }
        }

        console.log(`任务生成完成: ${users.length} 个用户`);
      } catch (error) {
        console.error('定时任务生成失败:', error);
      }
    }
  }, 60 * 1000); // 每分钟检查一次
};