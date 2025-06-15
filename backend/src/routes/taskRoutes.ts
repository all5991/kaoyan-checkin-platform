import { Router } from 'express';
import { prisma } from '../utils/database';
import { createTasksForUser } from '../utils/taskGenerator';
import { AuthRequest } from '../middleware/auth';
import { Response } from 'express';

const router = Router();

// 获取用户任务列表
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '未授权访问',
      });
    }

    const { status, date } = req.query;
    const where: any = { userId: req.user.id };

    if (status) {
      where.status = status;
    }

    if (date) {
      const targetDate = new Date(date as string);
      const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
      
      where.dueDate = {
        gte: startOfDay,
        lt: endOfDay,
      };
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' },
      ],
    });

    return res.json({
      success: true,
      data: tasks,
    });
  } catch (error) {
    console.error('获取任务列表失败:', error);
    return res.status(500).json({
      success: false,
      message: '获取任务列表失败',
    });
  }
});

// 创建任务
router.post('/', async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: '未授权访问',
    });
  }

  const {
    title,
    description,
    category,
    estimatedDuration,
    difficulty = 'medium',
    priority = 3,
    dueDate,
    taskType = 'count',
    taskCategory = 'vocabulary',
    weight = 5,
    // 计数型任务字段
    targetCount = 2000,
    currentCount = 0,
    dailyTarget = 50,
    unit = '个',
    // 时长型任务字段
    targetDuration = 1800,
    currentDuration = 0,
    dailyDuration = 60,
    // 进度型任务字段
    progress = 0,
    totalDays = 15
  } = req.body;

  try {
    const task = await prisma.task.create({
      data: {
        userId: req.user.id,
        title,
        description,
        category,
        estimatedDuration,
        difficulty,
        priority,
        dueDate: dueDate ? new Date(dueDate) : null,
        taskType,
        taskCategory,
        weight,
        // 计数型任务字段
        targetCount: taskType === 'count' ? targetCount : null,
        currentCount: taskType === 'count' ? currentCount : null,
        dailyTarget: taskType === 'count' ? dailyTarget : null,
        unit: taskType === 'count' ? unit : null,
        // 时长型任务字段
        targetDuration: taskType === 'duration' ? targetDuration : null,
        currentDuration: taskType === 'duration' ? currentDuration : null,
        dailyDuration: taskType === 'duration' ? dailyDuration : null,
        // 进度型任务字段
        progress: taskType === 'progress' ? progress : null,
        totalDays: taskType === 'progress' ? totalDays : null,
        
        status: 'pending',
        isGenerated: false,
        isCompleted: false,
      },
    });

    return res.status(201).json({
      success: true,
      message: '任务创建成功',
      data: task,
    });
  } catch (error) {
    console.error('创建任务失败:', error);
    return res.status(500).json({
      success: false,
      message: '创建任务失败',
    });
  }
});

// 更新任务状态
router.patch('/:taskId/status', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '未授权访问',
      });
    }

    const { taskId } = req.params;
    const { status } = req.body;

    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        userId: req.user.id,
      },
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: '任务不存在',
      });
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        status,
        completedAt: status === 'completed' ? new Date() : null,
      },
    });

    return res.json({
      success: true,
      message: '任务状态更新成功',
      data: updatedTask,
    });
  } catch (error) {
    console.error('更新任务状态失败:', error);
    return res.status(500).json({
      success: false,
      message: '更新任务状态失败',
    });
  }
});

// 生成智能任务
router.post('/generate', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '未授权访问',
      });
    }

    await createTasksForUser(req.user.id);

    return res.json({
      success: true,
      message: '智能任务生成成功',
    });
  } catch (error) {
    console.error('生成智能任务失败:', error);
    return res.status(500).json({
      success: false,
      message: '生成智能任务失败',
    });
  }
});

// 更新任务
router.put('/:taskId', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '未授权访问',
      });
    }

    const { taskId } = req.params;
    const {
      title,
      description,
      category,
      estimatedDuration,
      difficulty,
      priority,
      taskType,
      taskCategory,
      weight,
      // 计数型任务字段
      targetCount,
      currentCount,
      dailyTarget,
      unit,
      // 时长型任务字段
      targetDuration,
      currentDuration,
      dailyDuration,
      // 进度型任务字段
      progress,
      totalDays,
      isCompleted,
      dueDate
    } = req.body;

    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        userId: req.user.id,
      },
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: '任务不存在',
      });
    }

    const updateData: any = {};
    
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (estimatedDuration !== undefined) updateData.estimatedDuration = estimatedDuration;
    if (difficulty !== undefined) updateData.difficulty = difficulty;
    if (priority !== undefined) updateData.priority = priority;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;

    // 任务类型和基本字段
    if (taskType !== undefined) updateData.taskType = taskType;
    if (taskCategory !== undefined) updateData.taskCategory = taskCategory;
    if (weight !== undefined) updateData.weight = weight;

    // 计数型任务字段
    if (targetCount !== undefined) updateData.targetCount = targetCount;
    if (currentCount !== undefined) {
      updateData.currentCount = currentCount;
      // 自动计算完成状态
      if (task.targetCount && currentCount >= task.targetCount) {
        updateData.isCompleted = true;
        updateData.completedAt = new Date();
      }
    }
    if (dailyTarget !== undefined) updateData.dailyTarget = dailyTarget;
    if (unit !== undefined) updateData.unit = unit;

    // 时长型任务字段
    if (targetDuration !== undefined) updateData.targetDuration = targetDuration;
    if (currentDuration !== undefined) {
      updateData.currentDuration = currentDuration;
      // 自动计算完成状态
      if (task.targetDuration && currentDuration >= task.targetDuration) {
        updateData.isCompleted = true;
        updateData.completedAt = new Date();
      }
    }
    if (dailyDuration !== undefined) updateData.dailyDuration = dailyDuration;

    // 进度型任务字段
    if (progress !== undefined) {
      updateData.progress = Math.max(0, Math.min(100, progress));
      updateData.isCompleted = progress >= 100;
      if (progress >= 100 && !task.completedAt) {
        updateData.completedAt = new Date();
      } else if (progress < 100) {
        updateData.completedAt = null;
      }
    }
    if (totalDays !== undefined) updateData.totalDays = totalDays;
    
    if (isCompleted !== undefined) {
      updateData.isCompleted = isCompleted;
      updateData.completedAt = isCompleted ? new Date() : null;
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
    });

    return res.json({
      success: true,
      message: '任务更新成功',
      data: updatedTask,
    });
  } catch (error) {
    console.error('更新任务失败:', error);
    return res.status(500).json({
      success: false,
      message: '更新任务失败',
    });
  }
});

// 删除任务
router.delete('/:taskId', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '未授权访问',
      });
    }

    const { taskId } = req.params;

    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        userId: req.user.id,
      },
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: '任务不存在',
      });
    }

    await prisma.task.delete({
      where: { id: taskId },
    });

    return res.json({
      success: true,
      message: '任务删除成功',
    });
  } catch (error) {
    console.error('删除任务失败:', error);
    return res.status(500).json({
      success: false,
      message: '删除任务失败',
    });
  }
});

export default router; 