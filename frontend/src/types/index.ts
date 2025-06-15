// 用户相关类型
export interface User {
  id: string;
  username: string;
  email: string;
  nickname?: string;
  avatar?: string;
  phone?: string;
  targetUniversityId?: string;
  targetMajor?: string;
  examDate?: string;
  createdAt: string;
  updatedAt: string;
}

// 院校相关类型
export interface University {
  id?: string;
  name: string;
  shortName?: string;
  location?: string;
  level?: string;
  logoUrl?: string;
  description?: string;
  website?: string;
  country?: string;
  domains?: string[];
  'state-province'?: string;
  web_pages?: string[];
  _count?: {
    targetedBy: number;
  };
}

// 小组相关类型
export interface Group {
  id: string;
  name: string;
  description: string;
  maxMembers: number;
  isPublic: boolean;
  inviteCode: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  memberCount?: number;
  members?: GroupMember[];
  _count?: {
    members: number;
  };
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: 'admin' | 'member';
  joinedAt: string;
  user?: User;
}

// 打卡相关类型
export interface CheckIn {
  id: string;
  userId: string;
  type: 'start' | 'progress' | 'end';
  content?: string;
  mood?: string;
  studyHours?: number;
  location?: string;
  attachments?: string[];
  createdAt: string;
  updatedAt: string;
}

// 任务相关类型
export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  category: string;
  estimatedDuration: number;
  difficulty: 'easy' | 'medium' | 'hard';
  priority: number;
  status: 'pending' | 'in_progress' | 'completed';
  dueDate: string;
  completedAt?: string;
  isGenerated: boolean;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

// 消息相关类型
export interface Message {
  id: string;
  groupId: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'file';
  createdAt: string;
  sender?: User;
  group?: Group;
}

// 提醒相关类型
export interface Reminder {
  id: string;
  senderId: string;
  receiverId: string;
  groupId: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  sender?: User;
  receiver?: User;
}

// API响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface PaginationResponse<T = any> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// 统计数据类型
export interface UserStats {
  totalCheckIns: number;
  totalStudyHours: number;
  currentStreak: number;
  longestStreak: number;
  completedTasks: number;
  totalTasks: number;
  taskCompletionRate: number; // 任务加权平均完成率百分比 (0-100)
}

// 考研倒计时类型
export interface ExamCountdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  examDate: string;
  isExamPassed: boolean;
}

// 考研相关配置
export const EXAM_CONFIG = {
  EXAM_DATE: '2025-12-20T08:30:00', // 2025年考研时间
  EXAM_NAME: '2025年全国硕士研究生招生考试',
};