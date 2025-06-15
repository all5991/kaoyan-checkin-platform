import { api } from './api';
import { User } from '../types';

interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    user: User;
  };
}

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  nickname?: string;
  phone?: string;
}

export const authService = {
  login: (data: LoginRequest) => {
    return api.post<AuthResponse>('/auth/login', data);
  },
  
  register: (data: RegisterRequest) => {
    return api.post<AuthResponse>('/auth/register', data);
  },
  
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
  
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      return JSON.parse(userStr) as User;
    }
    return null;
  },
  
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },
  
  getToken: () => {
    return localStorage.getItem('token');
  },
}; 