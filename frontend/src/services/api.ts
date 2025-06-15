import axios from 'axios';
import toast from 'react-hot-toast';

// 根据环境获取API基础URL
const getApiBaseUrl = () => {
  // 生产环境或自定义环境变量
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // 开发环境默认配置
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3001/api';
  }
  
  // 如果在同一域名下部署，使用相对路径
  return '/api';
};

// 创建axios实例
export const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          // 未授权，清除本地存储并跳转到登录页
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
          toast.error('登录已过期，请重新登录');
          break;
        case 403:
          toast.error('没有权限执行此操作');
          break;
        case 404:
          toast.error('请求的资源不存在');
          break;
        case 422:
          toast.error(data.message || '输入数据有误');
          break;
        case 500:
          toast.error('服务器内部错误');
          break;
        default:
          toast.error(data.message || '请求失败');
      }
    } else if (error.request) {
      toast.error('网络连接失败，请检查网络');
    } else {
      toast.error('请求配置错误');
    }
    
    return Promise.reject(error);
  }
);

// API函数
export const authAPI = {
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  
  register: (data: any) =>
    api.post('/auth/register', data),
  
  getProfile: () =>
    api.get('/auth/profile'),
  
  updateProfile: (data: any) =>
    api.put('/auth/profile', data),
  
  getUserStats: () =>
    api.get('/auth/stats'),
  
  getExamCountdown: () =>
    api.get('/auth/exam-countdown'),
};

export const checkInAPI = {
  create: (data: any) =>
    api.post('/checkins', data),
  
  getList: (params?: any) =>
    api.get('/checkins', { params }),
  
  getToday: (params?: any) =>
    api.get('/checkins/today', { params }),
  
  getStats: (params?: any) =>
    api.get('/checkins/stats', { params }),
};

export const groupAPI = {
  getList: () =>
    api.get('/groups'),
  
  create: (data: any) =>
    api.post('/groups', data),
  
  getById: (id: string) =>
    api.get(`/groups/${id}`),
  
  join: (inviteCode: string) =>
    api.post('/groups/join', { inviteCode }),
  
  leave: (groupId: string) =>
    api.delete(`/groups/${groupId}/leave`),
  
  getMembers: (groupId: string) =>
    api.get(`/groups/${groupId}/members`),
  
  getStats: (groupId: string) =>
    api.get(`/groups/${groupId}/stats`),
};

export const taskAPI = {
  getList: (params?: any) =>
    api.get('/tasks', { params }),
  
  create: (data: any) =>
    api.post('/tasks', data),
  
  update: (id: string, data: any) =>
    api.put(`/tasks/${id}`, data),
  
  delete: (id: string) =>
    api.delete(`/tasks/${id}`),
  
  toggleComplete: (id: string) =>
    api.patch(`/tasks/${id}/toggle`),
};

export const messageAPI = {
  getList: (groupId: string, params?: any) =>
    api.get(`/messages/${groupId}`, { params }),
  
  create: (data: any) =>
    api.post('/messages', data),
};

export const universityAPI = {
  getList: (params?: any) =>
    api.get('/universities', { params }),
  
  getById: (id: string) =>
    api.get(`/universities/${id}`),
  
  search: (query: string) =>
    api.get('/universities/search', { params: { q: query } }),
};

export const reminderAPI = {
  getList: () =>
    api.get('/reminders'),
  
  create: (data: any) =>
    api.post('/reminders', data),
  
  markAsRead: (id: string) =>
    api.patch(`/reminders/${id}/read`),
  
  delete: (id: string) =>
    api.delete(`/reminders/${id}`),
};

export default api;