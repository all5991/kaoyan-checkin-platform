import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import { Response } from 'express';
import fs from 'fs';

const router = Router();

// 确保上传目录存在
const uploadDir = './uploads';
const imagesDir = path.join(uploadDir, 'images');
const filesDir = path.join(uploadDir, 'files');

[uploadDir, imagesDir, filesDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// 配置multer存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // 根据文件类型选择存储目录
    if (file.mimetype.startsWith('image/')) {
      cb(null, imagesDir);
    } else {
      cb(null, filesDir);
    }
  },
  filename: function (req, file, cb) {
    // 生成唯一文件名
    const uniqueSuffix = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

// 文件过滤器
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // 允许的图片类型
  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  // 允许的文件类型
  const allowedFileTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'application/zip',
    'application/x-rar-compressed'
  ];

  if (allowedImageTypes.includes(file.mimetype) || allowedFileTypes.includes(file.mimetype)) {
    return cb(null, true);
  } else {
    return cb(new Error('不支持的文件类型'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  }
});

// 上传单个文件
router.post('/file', authenticateToken, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '没有上传文件'
      });
    }

    const isImage = req.file.mimetype.startsWith('image/');
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const fileUrl = `${baseUrl}/uploads/${isImage ? 'images' : 'files'}/${req.file.filename}`;

    return res.json({
      success: true,
      data: {
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        url: fileUrl,
        type: isImage ? 'image' : 'file'
      }
    });
  } catch (error) {
    console.error('文件上传失败:', error);
    return res.status(500).json({
      success: false,
      message: '文件上传失败'
    });
  }
});

// 上传多个文件
router.post('/files', authenticateToken, upload.array('files', 5), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有上传文件'
      });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const uploadedFiles = req.files.map((file: Express.Multer.File) => {
      const isImage = file.mimetype.startsWith('image/');
      const fileUrl = `${baseUrl}/uploads/${isImage ? 'images' : 'files'}/${file.filename}`;

      return {
        filename: file.filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        url: fileUrl,
        type: isImage ? 'image' : 'file'
      };
    });

    return res.json({
      success: true,
      data: uploadedFiles
    });
  } catch (error) {
    console.error('文件上传失败:', error);
    return res.status(500).json({
      success: false,
      message: '文件上传失败'
    });
  }
});

export default router; 