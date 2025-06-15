// 用户相关类型
export interface User {
  id: string;
  email: string;
  username: string;
  nickname?: string;
  avatar?: string;
  phone?: string;
  targetUniversityId?: string;
  targetMajor?: string;
  examDate?: Date;
  role?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserRequest {
  email: string;
  username: string;
  password: string;
  nickname?: string;
  phone?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UpdateUserRequest {
  nickname?: string;
  avatar?: string;
  phone?: string;
  targetUniversityId?: string;
  targetMajor?: string;
  examDate?: string;
}

// 院校相关类型
export interface University {
  id: string;
  name: string;
  logoUrl?: string;
  location?: string;
  type?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 小组相关类型
export interface Group {
  id: string;
  name: string;
  description?: string;
  inviteCode: string;
  maxMembers: number;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  memberCount?: number;
}

export interface CreateGroupRequest {
  name: string;
  description?: string;
  isPublic?: boolean;
}

export interface GroupMember {
  id: string;
  userId: string;
  groupId: string;
  role: string;
  joinedAt: Date;
  user?: User;
}

// 打卡相关类型
export interface CheckIn {
  id: string;
  userId: string;
  groupId?: string;
  type: 'start' | 'progress' | 'end';
  content?: string;
  mood?: string;
  studyHours?: number;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  user?: User;
}

export interface CreateCheckInRequest {
  type: 'start' | 'progress' | 'end';
  content?: string;
  mood?: string;
  studyHours?: number;
  location?: string;
  groupId?: string;
}

// 任务相关类型
export interface Task {
  id: string;
  userId: string;
  groupId?: string;
  title: string;
  description?: string;
  isCompleted: boolean;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  dueDate?: string;
  groupId?: string;
}

// 消息相关类型
export interface Message {
  id: string;
  userId: string;
  groupId: string;
  content: string;
  type: 'text' | 'image' | 'file';
  createdAt: Date;
  user?: User;
}

export interface CreateMessageRequest {
  content: string;
  type?: 'text' | 'image' | 'file';
  groupId: string;
}

// 提醒相关类型
export interface Reminder {
  id: string;
  senderId: string;
  receiverId: string;
  groupId: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  sender?: User;
  receiver?: User;
}

export interface CreateReminderRequest {
  receiverId: string;
  groupId: string;
  message: string;
}

// API响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Socket.io事件类型
export interface SocketEvents {
  // 客户端发送的事件
  'join-group': (groupId: string) => void;
  'leave-group': (groupId: string) => void;
  'send-message': (data: CreateMessageRequest) => void;
  'typing': (groupId: string) => void;
  'stop-typing': (groupId: string) => void;

  // 服务器发送的事件
  'message-received': (message: Message) => void;
  'user-joined': (user: User, groupId: string) => void;
  'user-left': (userId: string, groupId: string) => void;
  'user-typing': (user: User, groupId: string) => void;
  'user-stopped-typing': (userId: string, groupId: string) => void;
  'checkin-reminder': (data: { groupId: string; message: string }) => void;
}

// JWT载荷类型
export interface JwtPayload {
  userId: string;
  email: string;
  username: string;
  iat?: number;
  exp?: number;
}

// 文件上传类型
export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
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
  daysTotal: number;
}

// 考研配置
export const EXAM_CONFIG = {
  EXAM_DATE: new Date('2025-12-20T08:30:00'),
  EXAM_NAME: '2025年全国硕士研究生招生考试',
};