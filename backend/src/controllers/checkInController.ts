import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../utils/database';
import { CreateCheckInRequest, CheckIn, Task } from '../types';

// 智能任务生成算法
const generateTasks = async (userId: string, lastCheckIn: any): Promise<Task[]> => {
  const tasks: Task[] = [];
  
  // 基于前一天的学习内容生成任务
  if (lastCheckIn.content) {
    const content = lastCheckIn.content.toLowerCase();
    
    // 根据学习内容关键词生成相关任务
    if (content.includes('数学') || content.includes('高数') || content.includes('线代')) {
      tasks.push({
        id: '',
        userId,
        title: '数学复习与练习',
        description: '复习昨天学习的数学知识点，完成相关练习题',
        isCompleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    
    if (content.includes('英语') || content.includes('阅读') || content.includes('单词')) {
      tasks.push({
        id: '',
        userId,
        title: '英语学习',
        description: '背诵单词，练习阅读理解，提高英语水平',
        isCompleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    
    if (content.includes('政治') || content.includes('马原') || content.includes('毛中特')) {
      tasks.push({
        id: '',
        userId,
        title: '政治理论学习',
        description: '复习政治理论，理解重要概念和原理',
        isCompleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    
    if (content.includes('专业课') || content.includes('专业')) {
      tasks.push({
        id: '',
        userId,
        title: '专业课学习',
        description: '深入学习专业课知识，做好笔记整理',
        isCompleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }
  
  // 如果没有特定内容，生成通用任务
  if (tasks.length === 0) {
    tasks.push(
      {
        id: '',
        userId,
        title: '制定今日学习计划',
        description: '根据考研大纲制定详细的学习计划',
        isCompleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '',
        userId,
        title: '复习昨日内容',
        description: '回顾昨天的学习内容，巩固知识点',
        isCompleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    );
  }
  
  return tasks;
};

// 创建打卡记录
export const createCheckIn = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: '未授权访问',
      });
      return;
    }

    const { type, content, mood, studyHours, location }: CreateCheckInRequest = req.body;
    const userId = req.user.id;

    if (!type || !content) {
      res.status(400).json({
        success: false,
        message: '打卡类型和内容不能为空',
      });
      return;
    }

    if (!['start', 'progress', 'end'].includes(type)) {
      res.status(400).json({
        success: false,
        message: '无效的打卡类型',
      });
      return;
    }

    // 获取今天已有的打卡记录
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const todayCheckIns = await prisma.checkIn.findMany({
      where: {
        userId: req.user.id,
        createdAt: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
    });

    // 验证打卡顺序逻辑
    const hasStart = todayCheckIns.some(c => c.type === 'start');
    const hasProgress = todayCheckIns.some(c => c.type === 'progress');
    const hasEnd = todayCheckIns.some(c => c.type === 'end');

    if (type === 'start' && hasStart) {
      res.status(400).json({
        success: false,
        message: '今天已经开始学习打卡了',
      });
      return;
    }

    if (type === 'progress' && !hasStart) {
      res.status(400).json({
        success: false,
        message: '请先完成开始学习打卡',
      });
      return;
    }

    if (type === 'end' && !hasStart) {
      res.status(400).json({
        success: false,
        message: '请先完成开始学习打卡',
      });
      return;
    }

    if (type === 'end' && hasEnd) {
      res.status(400).json({
        success: false,
        message: '今天已经结束学习打卡了',
      });
      return;
    }

    // 创建打卡记录
    const checkIn = await prisma.checkIn.create({
      data: {
        userId: req.user.id,
        type,
        content,
        mood,
        studyHours: type === 'end' ? studyHours : null,
        location: location || null,
      },
    });

    // 如果是结束打卡，可能需要生成明天的任务
    if (type === 'end') {
      try {
        const { createTasksForUser } = await import('../utils/taskGenerator');
        await createTasksForUser(req.user.id);
      } catch (error) {
        console.error('生成智能任务失败:', error);
        // 不影响打卡成功
      }
    }

    res.status(201).json({
      success: true,
      message: '打卡成功',
      data: checkIn,
    });
  } catch (error) {
    console.error('创建打卡记录失败:', error);
    res.status(500).json({
      success: false,
      message: '打卡失败',
    });
  }
};

// 获取打卡记录列表
export const getCheckIns = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: '未授权访问',
      });
      return;
    }

    const { page = 1, limit = 20, type, startDate, endDate } = req.query;

    const where: any = { userId: req.user.id };

    if (type) {
      where.type = type;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate as string);
      }
    }

    const [checkIns, total] = await Promise.all([
      prisma.checkIn.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.checkIn.count({ where }),
    ]);

    res.json({
      success: true,
      data: checkIns,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
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

// 获取今日打卡记录
export const getTodayCheckIns = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: '未授权访问',
      });
      return;
    }

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const checkIns = await prisma.checkIn.findMany({
      where: {
        userId: req.user.id,
        createdAt: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({
      success: true,
      data: checkIns,
    });
  } catch (error) {
    console.error('获取今日打卡记录失败:', error);
    res.status(500).json({
      success: false,
      message: '获取今日打卡记录失败',
    });
  }
};

// 获取打卡统计
export const getCheckInStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: '未授权访问',
      });
      return;
    }

    const { days = 30 } = req.query;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    const checkIns = await prisma.checkIn.findMany({
      where: {
        userId: req.user.id,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 按日期分组统计
    const statsByDate: { [key: string]: any } = {};
    
    checkIns.forEach(checkIn => {
      const date = checkIn.createdAt.toISOString().split('T')[0];
      if (!statsByDate[date]) {
        statsByDate[date] = {
          date,
          checkIns: [],
          totalStudyHours: 0,
          hasStart: false,
          hasProgress: false,
          hasEnd: false,
        };
      }
      
      statsByDate[date].checkIns.push(checkIn);
      if (checkIn.studyHours) {
        statsByDate[date].totalStudyHours += checkIn.studyHours;
      }
      
      statsByDate[date][`has${checkIn.type.charAt(0).toUpperCase() + checkIn.type.slice(1)}`] = true;
    });

    // 计算连续打卡天数
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    const dates = Object.keys(statsByDate).sort().reverse();
    const today = new Date().toISOString().split('T')[0];

    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];
      const dayStats = statsByDate[date];
      
      if (dayStats.hasStart && dayStats.hasEnd) {
        tempStreak++;
        if (date === today || (i === 0 && currentStreak === 0)) {
          currentStreak = tempStreak;
        }
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
        }
      } else {
        if (i === 0) currentStreak = 0;
        tempStreak = 0;
      }
    }

    const stats = {
      totalCheckIns: checkIns.length,
      totalStudyHours: checkIns.reduce((sum, c) => sum + (c.studyHours || 0), 0),
      currentStreak,
      longestStreak,
      dailyStats: Object.values(statsByDate).sort((a: any, b: any) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('获取打卡统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取打卡统计失败',
    });
  }
};