import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../utils/database';

// 获取所有院校列表
export const getAllUniversities = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { search, page = 1, limit = 20 } = req.query;

    const where = search ? {
      OR: [
        { name: { contains: search as string } },
        { shortName: { contains: search as string } },
        { location: { contains: search as string } },
      ],
    } : {};

    const [universities, total] = await Promise.all([
      prisma.university.findMany({
        where,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: [
          { level: 'asc' }, // 985, 211, 普通本科
          { name: 'asc' },
        ],
      }),
      prisma.university.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        universities,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    console.error('获取院校列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取院校列表失败',
    });
  }
};

// 获取院校详情
export const getUniversityDetail = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const university = await prisma.university.findUnique({
      where: { id },
    });
    
    // 手动计算选择该院校的用户数量（因为已移除外键关联）
    const userCount = await prisma.user.count({
      where: { targetUniversityId: id },
    });

    if (!university) {
      res.status(404).json({
        success: false,
        message: '院校不存在',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        ...university,
        _count: {
          targetedBy: userCount,
        },
      },
    });
  } catch (error) {
    console.error('获取院校详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取院校详情失败',
    });
  }
};

// 设置用户目标院校
export const setTargetUniversity = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: '未授权访问',
      });
      return;
    }

    const { universityId, targetMajor, examDate } = req.body;

    if (!universityId) {
      res.status(400).json({
        success: false,
        message: '请选择目标院校',
      });
      return;
    }

    // 验证院校是否存在
    const university = await prisma.university.findUnique({
      where: { id: universityId },
    });

    if (!university) {
      res.status(404).json({
        success: false,
        message: '目标院校不存在',
      });
      return;
    }

    // 更新用户目标院校
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        targetUniversityId: universityId,
        targetMajor,
        examDate: examDate ? new Date(examDate) : undefined,
      },
    });

    res.json({
      success: true,
      message: '目标院校设置成功',
      data: {
        targetUniversity: university,
        targetMajor: updatedUser.targetMajor,
        examDate: updatedUser.examDate,
      },
    });
  } catch (error) {
    console.error('设置目标院校失败:', error);
    res.status(500).json({
      success: false,
      message: '设置目标院校失败',
    });
  }
};

// 获取热门院校
export const getPopularUniversities = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // 先获取所有院校
    const universities = await prisma.university.findMany();
    
    // 为每个院校计算用户数量并排序
    const universitiesWithCount = await Promise.all(
      universities.map(async (university) => {
        const userCount = await prisma.user.count({
          where: { targetUniversityId: university.id },
        });
        return {
          ...university,
          _count: {
            targetedBy: userCount,
          },
        };
      })
    );

    // 按用户数量排序并取前10个
    const sortedUniversities = universitiesWithCount
      .sort((a, b) => b._count.targetedBy - a._count.targetedBy)
      .slice(0, 10);

    res.json({
      success: true,
      data: sortedUniversities,
    });
  } catch (error) {
    console.error('获取热门院校失败:', error);
    res.status(500).json({
      success: false,
      message: '获取热门院校失败',
    });
  }
};

// 根据级别获取院校
export const getUniversitiesByLevel = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { level } = req.params; // '985', '211', 'regular'

    const universities = await prisma.university.findMany({
      where: { level },
      orderBy: { name: 'asc' },
    });

    res.json({
      success: true,
      data: universities,
    });
  } catch (error) {
    console.error('获取院校列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取院校列表失败',
    });
  }
};

// 添加院校（管理员功能）
export const createUniversity = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      name,
      shortName,
      location,
      level,
      logoUrl,
      description,
      website,
    } = req.body;

    if (!name || !location || !level) {
      res.status(400).json({
        success: false,
        message: '院校名称、地理位置和级别不能为空',
      });
      return;
    }

    // 检查是否已存在
    const existingUniversity = await prisma.university.findFirst({
      where: {
        OR: [
          { name },
          { shortName: shortName || name },
        ],
      },
    });

    if (existingUniversity) {
      res.status(400).json({
        success: false,
        message: '该院校已存在',
      });
      return;
    }

    const university = await prisma.university.create({
      data: {
        name,
        shortName: shortName || name,
        location,
        level,
        logoUrl,
        description,
        website,
      },
    });

    res.status(201).json({
      success: true,
      message: '院校添加成功',
      data: university,
    });
  } catch (error) {
    console.error('添加院校失败:', error);
    res.status(500).json({
      success: false,
      message: '添加院校失败',
    });
  }
};

// 更新院校信息（管理员功能）
export const updateUniversity = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const university = await prisma.university.update({
      where: { id },
      data: updateData,
    });

    res.json({
      success: true,
      message: '院校信息更新成功',
      data: university,
    });
  } catch (error) {
    console.error('更新院校信息失败:', error);
    res.status(500).json({
      success: false,
      message: '更新院校信息失败',
    });
  }
};

// 删除院校（管理员功能）
export const deleteUniversity = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // 检查是否有用户选择了该院校
    const usersCount = await prisma.user.count({
      where: { targetUniversityId: id },
    });

    if (usersCount > 0) {
      res.status(400).json({
        success: false,
        message: `该院校已被 ${usersCount} 位用户选择，无法删除`,
      });
      return;
    }

    await prisma.university.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: '院校删除成功',
    });
  } catch (error) {
    console.error('删除院校失败:', error);
    res.status(500).json({
      success: false,
      message: '删除院校失败',
    });
  }
}; 