import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../utils/database';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { emailService } from '../utils/email';
import { sendVerificationCode, verifyCode } from '../utils/emailCode';
import { createTasksForUser, generateTaskSuggestions } from '../utils/taskGenerator';
import { createError } from '../middleware/errorHandler';
import { CreateUserRequest, LoginRequest, UpdateUserRequest, User, UserStats, ExamCountdown, EXAM_CONFIG } from '../types';

// 发送验证码
export const sendEmailCode = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, type = 'register' } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        message: '邮箱不能为空',
      });
      return;
    }

    // 如果是注册，检查邮箱是否已存在
    if (type === 'register') {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        res.status(400).json({
          success: false,
          message: '邮箱已被注册',
        });
        return;
      }
    }

    await sendVerificationCode(email, type);

    res.json({
      success: true,
      message: '验证码已发送到您的邮箱，请注意查收',
    });
  } catch (error: any) {
    console.error('发送验证码失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '发送验证码失败',
    });
  }
};

export const register = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, username, password, nickname, phone, verificationCode }: CreateUserRequest & { verificationCode: string } = req.body;

    // 验证邮件验证码
    if (!verificationCode) {
      res.status(400).json({
        success: false,
        message: '请输入邮箱验证码',
      });
      return;
    }

    if (!verifyCode(email, verificationCode)) {
      res.status(400).json({
        success: false,
        message: '验证码错误或已过期',
      });
      return;
    }

    // 检查邮箱是否已存在
    const existingEmail = await prisma.user.findUnique({
      where: { email },
    });

    if (existingEmail) {
      res.status(400).json({
        success: false,
        message: '邮箱已被注册',
      });
      return;
    }

    // 检查用户名是否已存在
    const existingUsername = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUsername) {
      res.status(400).json({
        success: false,
        message: '用户名已被使用',
      });
      return;
    }

    // 加密密码
    const hashedPassword = await hashPassword(password);

    // 创建用户
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        nickname: nickname || username,
        phone,
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
        createdAt: true,
        updatedAt: true,
      },
    });

    // 生成JWT令牌
    const token = generateToken({
      userId: user.id,
      email: user.email,
      username: user.username,
    });

    // 发送欢迎邮件
    try {
      await emailService.sendWelcomeEmail(user.email, user.nickname || user.username);
    } catch (emailError) {
      console.error('发送欢迎邮件失败:', emailError);
    }

    res.status(201).json({
      success: true,
      message: '注册成功',
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    console.error('注册失败:', error);
    res.status(500).json({
      success: false,
      message: '注册失败',
    });
  }
};

export const login = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, password }: LoginRequest = req.body;

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        username: true,
        nickname: true,
        avatar: true,
        phone: true,
        password: true,
        targetUniversityId: true,
        targetMajor: true,
        examDate: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: '邮箱或密码错误',
      });
      return;
    }

    // 验证密码
    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: '邮箱或密码错误',
      });
      return;
    }

    // 生成JWT令牌
    const token = generateToken({
      userId: user.id,
      email: user.email,
      username: user.username,
    });

    // 移除密码字段
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      message: '登录成功',
      data: {
        user: userWithoutPassword,
        token,
      },
    });
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({
      success: false,
      message: '登录失败',
    });
  }
};

export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: '未授权访问',
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
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
        createdAt: true,
        updatedAt: true,
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
      message: '获取用户信息成功',
      data: user,
    });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户信息失败',
    });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: '未授权访问',
      });
      return;
    }

    const updateData: UpdateUserRequest = req.body;

    // 注意：由于使用第三方API获取院校数据，跳过本地数据库验证
    // 验证目标院校是否存在（已禁用，使用第三方API）
    // if (updateData.targetUniversityId) {
    //   const university = await prisma.university.findUnique({
    //     where: { id: updateData.targetUniversityId },
    //   });

    //   if (!university) {
    //     res.status(400).json({
    //       success: false,
    //       message: '目标院校不存在',
    //     });
    //     return;
    //   }
    // }

    const user = await prisma.user.update({
      where: { id: req.user.id },
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

export const getUserStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: '未授权访问',
      });
      return;
    }

    const userId = req.user.id;

    // 获取打卡统计
    const checkIns = await prisma.checkIn.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // 获取任务统计
    const tasks = await prisma.task.findMany({
      where: { userId },
    });

    // 计算总打卡天数（按天去重）
    const checkInDates = new Set<string>();
    checkIns.forEach(checkIn => {
      const dateStr = new Date(checkIn.createdAt).toISOString().split('T')[0];
      checkInDates.add(dateStr);
    });
    const totalCheckInDays = checkInDates.size;

    // 计算连续打卡天数
    let currentStreak = 0;
    let longestStreak = 0;
    
    if (checkInDates.size > 0) {
      // 将日期转换为数组并排序
      const sortedDates = Array.from(checkInDates).sort().reverse(); // 最新日期在前
      const today = new Date().toISOString().split('T')[0];
      
      // 计算当前连续打卡天数
      let streakCount = 0;
      let expectedDate = today;
      
      for (const date of sortedDates) {
        if (date === expectedDate) {
          streakCount++;
          // 计算前一天的日期
          const currentDate = new Date(date);
          currentDate.setDate(currentDate.getDate() - 1);
          expectedDate = currentDate.toISOString().split('T')[0];
        } else {
          break;
        }
      }
      
      currentStreak = streakCount;
      
      // 计算最长连续打卡天数
      let maxStreak = 0;
      let tempStreak = 1;
      
      for (let i = 1; i < sortedDates.length; i++) {
        const currentDate = new Date(sortedDates[i]);
        const prevDate = new Date(sortedDates[i - 1]);
        const diffDays = Math.floor((prevDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          tempStreak++;
        } else {
          maxStreak = Math.max(maxStreak, tempStreak);
          tempStreak = 1;
        }
      }
      
      longestStreak = Math.max(maxStreak, tempStreak);
    }

    // 计算基于不同任务类型的加权平均完成率
    let totalWeightedProgress = 0;
    let totalWeight = 0;
    
    tasks.forEach(task => {
      const weight = (task as any).weight || 5; // 默认权重5
      let completionRate = 0;
      
      if ((task as any).taskType === 'count') {
        const currentCount = (task as any).currentCount || 0;
        const targetCount = (task as any).targetCount || 1;
        completionRate = Math.min(100, Math.round((currentCount / targetCount) * 100));
      } else if ((task as any).taskType === 'duration') {
        const currentDuration = (task as any).currentDuration || 0;
        const targetDuration = (task as any).targetDuration || 1;
        completionRate = Math.min(100, Math.round((currentDuration / targetDuration) * 100));
      } else if ((task as any).taskType === 'progress') {
        completionRate = (task as any).progress || 0;
      } else {
        // 兼容旧数据
        completionRate = (task as any).progress || 0;
      }
      
      totalWeightedProgress += completionRate * weight;
      totalWeight += weight;
    });
    
    const averageProgress = totalWeight > 0 ? totalWeightedProgress / totalWeight : 0;
    const completedTasksCount = Math.round((averageProgress / 100) * tasks.length);

    const stats: UserStats = {
      totalCheckIns: totalCheckInDays, // 修改为按天计算
      totalStudyHours: checkIns.reduce((sum, checkIn) => sum + (checkIn.studyHours || 0), 0),
      currentStreak,
      longestStreak,
      completedTasks: completedTasksCount, // 基于进度百分比计算
      totalTasks: tasks.length,
      taskCompletionRate: Math.round(averageProgress), // 加权平均完成率百分比
    };

    res.json({
      success: true,
      message: '获取用户统计成功',
      data: stats,
    });
  } catch (error) {
    console.error('获取用户统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户统计失败',
    });
  }
};

// 获取考研倒计时
export const getExamCountdown = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const examDate = EXAM_CONFIG.EXAM_DATE;
    const timeDiff = examDate.getTime() - now.getTime();

    let countdown: ExamCountdown;
    
    if (timeDiff > 0) {
      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

      countdown = {
        days,
        hours,
        minutes,
        seconds,
        examDate: EXAM_CONFIG.EXAM_DATE.toISOString(),
        isExamPassed: false,
        daysTotal: days
      };
    } else {
      countdown = {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        examDate: EXAM_CONFIG.EXAM_DATE.toISOString(),
        isExamPassed: true,
        daysTotal: 0
      };
    }

    res.json({
      success: true,
      message: '获取考研倒计时成功',
      data: countdown,
    });
  } catch (error) {
    console.error('获取考研倒计时失败:', error);
    res.status(500).json({
      success: false,
      message: '获取考研倒计时失败',
    });
  }
};