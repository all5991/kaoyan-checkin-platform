import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const statusCode = err.statusCode || 500;
  const message = err.message || '服务器内部错误';

  // 开发环境返回详细错误信息
  if (process.env.NODE_ENV === 'development') {
    res.status(statusCode).json({
      success: false,
      message,
      error: err.stack,
      statusCode,
    });
  } else {
    // 生产环境只返回基本错误信息
    res.status(statusCode).json({
      success: false,
      message: statusCode === 500 ? '服务器内部错误' : message,
      statusCode,
    });
  }
};

export const notFound = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: '请求的资源不存在',
    statusCode: 404,
  });
};

export const createError = (message: string, statusCode: number = 500): AppError => {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
}; 