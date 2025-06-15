import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Navigate } from 'react-router-dom';
import { 
  Users, 
  CheckCircle, 
  Calendar,
  Activity,
  Search,
  Edit,
  Trash2,
  Eye,
  UserX,
  Filter,
  Download,
  BarChart,
  TrendingUp,
  MessageSquare,
  UsersIcon,
  Settings
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface User {
  id: string;
  email: string;
  username: string;
  nickname?: string;
  avatar?: string;
  phone?: string;
  targetUniversityId?: string;
  targetMajor?: string;
  examDate?: string;
  role?: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    checkIns: number;
    tasks: number;
  };
}

interface CheckIn {
  id: string;
  userId: string;
  type: string;
  content?: string;
  mood?: string;
  studyHours?: number;
  imageUrl?: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    nickname?: string;
    avatar?: string;
  };
}

interface Group {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    members: number;
    messages: number;
  };
  members: Array<{
    id: string;
    role: string;
    user: {
      id: string;
      username: string;
      nickname?: string;
    };
  }>;
}

interface GroupMessage {
  id: string;
  content: string;
  type: string;
  createdAt: string;
  sender: {
    id: string;
    username: string;
    nickname?: string;
  };
}

interface GroupDetail extends Group {
  members: Array<{
    id: string;
    role: string;
    joinedAt: string;
    user: {
      id: string;
      username: string;
      nickname?: string;
      email: string;
    };
  }>;
  messages: GroupMessage[];
}

interface SystemStats {
  totalUsers: number;
  totalCheckIns: number;
  todayCheckIns: number;
  recentUsers: number;
}

const Admin: React.FC = () => {
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'checkins' | 'groups'>('dashboard');
  const [users, setUsers] = useState<User[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedCheckIn, setSelectedCheckIn] = useState<CheckIn | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<GroupDetail | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showGroupDetailModal, setShowGroupDetailModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab, currentPage, searchTerm]);

  // 权限检查：只允许特定邮箱用户访问
  const ADMIN_EMAIL = process.env.REACT_APP_ADMIN_EMAIL || 'admin@example.com';
  if (!user || user.email !== ADMIN_EMAIL) {
    return <Navigate to="/dashboard" replace />;
  }

  const fetchData = async () => {
    try {
      setLoading(true);
      
      if (activeTab === 'dashboard') {
        const response = await api.get('/admin/stats');
        if (response.data.success) {
          setStats(response.data.data);
        }
      } else if (activeTab === 'users') {
        const response = await api.get('/admin/users', {
          params: {
            page: currentPage,
            limit: 20,
            search: searchTerm,
          },
        });
        if (response.data.success) {
          setUsers(response.data.data.users);
          setTotalPages(response.data.data.pagination.pages);
        }
      } else if (activeTab === 'checkins') {
        const response = await api.get('/admin/checkins', {
          params: {
            page: currentPage,
            limit: 20,
          },
        });
        if (response.data.success) {
          setCheckIns(response.data.data.checkIns);
          setTotalPages(response.data.data.pagination.pages);
        }
      } else if (activeTab === 'groups') {
        const response = await api.get('/admin/groups', {
          params: {
            page: currentPage,
            limit: 20,
            search: searchTerm,
          },
        });
        if (response.data.success) {
          setGroups(response.data.data.groups);
          setTotalPages(response.data.data.pagination.pages);
        }
      }
    } catch (error: any) {
      console.error('获取数据失败:', error);
      toast.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('确定要删除此用户吗？此操作不可恢复。')) {
      return;
    }

    try {
      const response = await api.delete(`/admin/users/${userId}`);
      if (response.data.success) {
        toast.success('用户删除成功');
        fetchData();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || '删除用户失败');
    }
  };

  const handleUpdateUser = async (userData: any) => {
    try {
      const response = await api.put(`/admin/users/${selectedUser?.id}`, userData);
      if (response.data.success) {
        toast.success('用户信息更新成功');
        setShowEditModal(false);
        setSelectedUser(null);
        fetchData();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || '更新用户信息失败');
    }
  };

  const handleDeleteCheckIn = async (checkInId: string) => {
    if (!window.confirm('确定要删除此打卡记录吗？')) {
      return;
    }

    try {
      const response = await api.delete(`/admin/checkins/${checkInId}`);
      if (response.data.success) {
        toast.success('打卡记录删除成功');
        fetchData();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || '删除打卡记录失败');
    }
  };

  const handleUpdateCheckIn = async (checkInData: any) => {
    try {
      const response = await api.put(`/admin/checkins/${selectedCheckIn?.id}`, checkInData);
      if (response.data.success) {
        toast.success('打卡记录更新成功');
        setShowCheckInModal(false);
        setSelectedCheckIn(null);
        fetchData();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || '更新打卡记录失败');
    }
  };

  // 小组管理函数
  const handleDeleteGroup = async (groupId: string) => {
    if (!window.confirm('确定要删除此学习小组吗？此操作将删除小组内所有数据，包括成员关系和聊天记录，且不可恢复。')) {
      return;
    }

    try {
      const response = await api.delete(`/admin/groups/${groupId}`);
      if (response.data.success) {
        toast.success('学习小组删除成功');
        fetchData();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || '删除学习小组失败');
    }
  };

  const handleViewGroupDetail = async (groupId: string) => {
    try {
      const response = await api.get(`/admin/groups/${groupId}`);
      if (response.data.success) {
        setSelectedGroup(response.data.data);
        setShowGroupDetailModal(true);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || '获取小组详情失败');
    }
  };

  const handleDeleteGroupMessage = async (messageId: string) => {
    if (!window.confirm('确定要删除此消息吗？')) {
      return;
    }

    try {
      const response = await api.delete(`/admin/messages/${messageId}`);
      if (response.data.success) {
        toast.success('消息删除成功');
        // 重新获取小组详情
        if (selectedGroup) {
          handleViewGroupDetail(selectedGroup.id);
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || '删除消息失败');
    }
  };

  const handleClearGroupMessages = async (groupId: string) => {
    if (!window.confirm('确定要清空此小组的所有聊天记录吗？此操作不可恢复。')) {
      return;
    }

    try {
      const response = await api.delete(`/admin/groups/${groupId}/messages`, {
        data: { deleteAll: true }
      });
      if (response.data.success) {
        toast.success('聊天记录清空成功');
        // 重新获取小组详情
        if (selectedGroup) {
          handleViewGroupDetail(selectedGroup.id);
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || '清空聊天记录失败');
    }
  };

  const handleRemoveGroupMember = async (groupId: string, userId: string) => {
    if (!window.confirm('确定要将此用户从小组中移除吗？')) {
      return;
    }

    try {
      const response = await api.delete(`/admin/groups/${groupId}/members/${userId}`);
      if (response.data.success) {
        toast.success('成员移除成功');
        // 重新获取小组详情
        if (selectedGroup) {
          handleViewGroupDetail(selectedGroup.id);
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || '移除成员失败');
    }
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl p-6 shadow-sm border"
        >
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">总用户数</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.totalUsers || 0}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl p-6 shadow-sm border"
        >
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">总打卡数</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.totalCheckIns || 0}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl p-6 shadow-sm border"
        >
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Calendar className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">今日打卡</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.todayCheckIns || 0}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl p-6 shadow-sm border"
        >
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">近7天新用户</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.recentUsers || 0}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* 快捷操作 */}
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">快捷操作</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setActiveTab('users')}
            className="flex items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Users className="h-6 w-6 text-blue-600 mr-3" />
            <span className="font-medium text-blue-900">管理用户</span>
          </button>
          <button
            onClick={() => setActiveTab('checkins')}
            className="flex items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
          >
            <CheckCircle className="h-6 w-6 text-green-600 mr-3" />
            <span className="font-medium text-green-900">管理打卡</span>
          </button>
          <button
            className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Download className="h-6 w-6 text-gray-600 mr-3" />
            <span className="font-medium text-gray-900">导出数据</span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderUsers = () => (
    <div className="space-y-6">
      {/* 搜索和过滤 */}
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索用户名、邮箱或昵称..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
            <Filter className="h-4 w-4 mr-2" />
            筛选
          </button>
        </div>
      </div>

      {/* 用户列表 */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">用户列表</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  用户信息
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  联系方式
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  统计信息
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  注册时间
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                        {user.avatar ? (
                          <img src={user.avatar} alt="头像" className="w-full h-full object-cover rounded-full" />
                        ) : (
                          <span className="text-white text-sm font-medium">
                            {user.nickname?.[0] || user.username[0]}
                          </span>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.nickname || user.username}
                        </div>
                        <div className="text-sm text-gray-500">@{user.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.email}</div>
                    <div className="text-sm text-gray-500">{user.phone || '未设置'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">打卡: {user._count.checkIns}次</div>
                    <div className="text-sm text-gray-500">任务: {user._count.tasks}个</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setShowEditModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                        title="编辑"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-red-600 hover:text-red-900"
                        title="删除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex justify-center space-x-2">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              className={`px-3 py-2 rounded-lg ${
                currentPage === i + 1
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const renderCheckIns = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold text-gray-900">打卡记录管理</h3>
      </div>

      {/* 打卡记录列表 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  用户
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  类型
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  内容
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  心情
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  学习时长
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  时间
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {checkIns.map((checkIn) => (
                <tr key={checkIn.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8">
                        {checkIn.user.avatar ? (
                          <img className="h-8 w-8 rounded-full" src={checkIn.user.avatar} alt="" />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                            <Users className="h-4 w-4 text-gray-600" />
                          </div>
                        )}
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {checkIn.user.nickname || checkIn.user.username}
                        </div>
                        <div className="text-sm text-gray-500">
                          {checkIn.user.username}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      checkIn.type === 'start' ? 'bg-green-100 text-green-800' :
                      checkIn.type === 'progress' ? 'bg-blue-100 text-blue-800' :
                      checkIn.type === 'end' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {checkIn.type === 'start' ? '开始学习' :
                       checkIn.type === 'progress' ? '学习进展' :
                       checkIn.type === 'end' ? '结束学习' : checkIn.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-xs truncate">
                      {checkIn.content || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {checkIn.mood || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {checkIn.studyHours ? `${checkIn.studyHours}小时` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(checkIn.createdAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setSelectedCheckIn(checkIn);
                          setShowCheckInModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCheckIn(checkIn.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex justify-center space-x-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`px-3 py-1 rounded ${
                currentPage === page
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {page}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const renderGroups = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold text-gray-900">学习小组管理</h3>
        <div className="flex space-x-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="搜索小组..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* 小组列表 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  小组信息
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  成员数量
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  消息数量
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  管理员
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  创建时间
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {groups.map((group) => (
                <tr key={group.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {group.name}
                      </div>
                      <div className="text-sm text-gray-500 max-w-xs truncate">
                        {group.description || '无描述'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <UsersIcon className="h-4 w-4 text-gray-400 mr-1" />
                      <span className="text-sm text-gray-900">{group._count.members}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <MessageSquare className="h-4 w-4 text-gray-400 mr-1" />
                      <span className="text-sm text-gray-900">{group._count.messages}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex -space-x-1">
                      {group.members
                        .filter(member => member.role === 'admin')
                        .slice(0, 3)
                        .map((member, index) => (
                        <div
                          key={member.id}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-800 bg-blue-100 rounded-full"
                          style={{ zIndex: 10 - index }}
                          title={member.user.nickname || member.user.username}
                        >
                          {(member.user.nickname || member.user.username).charAt(0)}
                        </div>
                      ))}
                      {group.members.filter(m => m.role === 'admin').length > 3 && (
                        <span className="text-xs text-gray-500">
                          +{group.members.filter(m => m.role === 'admin').length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(group.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewGroupDetail(group.id)}
                        className="text-blue-600 hover:text-blue-900"
                        title="查看详情"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteGroup(group.id)}
                        className="text-red-600 hover:text-red-900"
                        title="删除小组"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex justify-center space-x-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`px-3 py-1 rounded ${
                currentPage === page
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {page}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">管理员面板</h1>
          <p className="mt-2 text-gray-600">管理用户、打卡记录和系统设置</p>
        </div>

        {/* 标签导航 */}
        <div className="mb-6">
          <nav className="flex space-x-8">
            {[
              { id: 'dashboard', name: '概览', icon: BarChart },
              { id: 'users', name: '用户管理', icon: Users },
              { id: 'checkins', name: '打卡管理', icon: CheckCircle },
              { id: 'groups', name: '学习小组', icon: MessageSquare },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setCurrentPage(1);
                }}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <tab.icon className="h-5 w-5 mr-2" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* 内容区域 */}
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'users' && renderUsers()}
        {activeTab === 'checkins' && renderCheckIns()}
        {activeTab === 'groups' && renderGroups()}
      </div>

      {/* 编辑用户模态框 */}
      {showEditModal && selectedUser && (
        <EditUserModal
          user={selectedUser}
          onClose={() => {
            setShowEditModal(false);
            setSelectedUser(null);
          }}
          onSave={handleUpdateUser}
        />
      )}

      {/* 编辑打卡记录模态框 */}
      {showCheckInModal && selectedCheckIn && (
        <EditCheckInModal
          checkIn={selectedCheckIn}
          onClose={() => {
            setShowCheckInModal(false);
            setSelectedCheckIn(null);
          }}
          onSave={handleUpdateCheckIn}
        />
      )}

      {/* 小组详情模态框 */}
      {showGroupDetailModal && selectedGroup && (
        <GroupDetailModal
          group={selectedGroup}
          onClose={() => {
            setShowGroupDetailModal(false);
            setSelectedGroup(null);
          }}
          onDeleteMessage={handleDeleteGroupMessage}
          onClearMessages={handleClearGroupMessages}
          onRemoveMember={handleRemoveGroupMember}
        />
      )}
    </div>
  );
};

// 编辑用户模态框组件
const EditUserModal: React.FC<{
  user: User;
  onClose: () => void;
  onSave: (data: any) => void;
}> = ({ user, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    nickname: user.nickname || '',
    phone: user.phone || '',
    targetMajor: user.targetMajor || '',
    examDate: user.examDate ? user.examDate.split('T')[0] : '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">编辑用户信息</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">昵称</label>
            <input
              type="text"
              value={formData.nickname}
              onChange={(e) => setFormData(prev => ({ ...prev, nickname: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">手机号</label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">目标专业</label>
            <input
              type="text"
              value={formData.targetMajor}
              onChange={(e) => setFormData(prev => ({ ...prev, targetMajor: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">考试日期</label>
            <input
              type="date"
              value={formData.examDate}
              onChange={(e) => setFormData(prev => ({ ...prev, examDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 编辑打卡记录模态框组件
const EditCheckInModal: React.FC<{
  checkIn: CheckIn;
  onClose: () => void;
  onSave: (data: any) => void;
}> = ({ checkIn, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    type: checkIn.type,
    content: checkIn.content || '',
    mood: checkIn.mood || '',
    studyHours: checkIn.studyHours || 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">编辑打卡记录</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="start">开始学习</option>
              <option value="progress">学习进度</option>
              <option value="end">结束学习</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">内容</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">心情</label>
            <input
              type="text"
              value={formData.mood}
              onChange={(e) => setFormData(prev => ({ ...prev, mood: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">学习时长（小时）</label>
            <input
              type="number"
              step="0.5"
              value={formData.studyHours}
              onChange={(e) => setFormData(prev => ({ ...prev, studyHours: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const GroupDetailModal: React.FC<{
  group: GroupDetail;
  onClose: () => void;
  onDeleteMessage: (messageId: string) => void;
  onClearMessages: (groupId: string) => void;
  onRemoveMember: (groupId: string, userId: string) => void;
}> = ({ group, onClose, onDeleteMessage, onClearMessages, onRemoveMember }) => {
  const [activeDetailTab, setActiveDetailTab] = useState<'members' | 'messages'>('members');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
      >
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{group.name}</h3>
            <p className="text-sm text-gray-500">{group.description || '无描述'}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="p-6">
          {/* 统计信息 */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-blue-600">总成员</div>
              <div className="text-2xl font-bold text-blue-900">{group._count.members}</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-green-600">总消息</div>
              <div className="text-2xl font-bold text-green-900">{group._count.messages}</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-sm text-purple-600">创建时间</div>
              <div className="text-sm font-medium text-purple-900">
                {new Date(group.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* 标签页 */}
          <div className="flex border-b mb-6">
            <button
              onClick={() => setActiveDetailTab('members')}
              className={`px-4 py-2 font-medium text-sm ${
                activeDetailTab === 'members'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              成员管理 ({group.members.length})
            </button>
            <button
              onClick={() => setActiveDetailTab('messages')}
              className={`px-4 py-2 font-medium text-sm ${
                activeDetailTab === 'messages'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              消息管理 ({group.messages.length})
            </button>
          </div>

          {/* 内容区域 */}
          <div className="max-h-96 overflow-y-auto">
            {activeDetailTab === 'members' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium text-gray-900">小组成员</h4>
                </div>
                <div className="space-y-2">
                  {group.members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-medium">
                            {(member.user.nickname || member.user.username).charAt(0)}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {member.user.nickname || member.user.username}
                          </div>
                          <div className="text-xs text-gray-500">
                            {member.user.email} • {member.role === 'admin' ? '管理员' : '成员'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">
                          {new Date(member.joinedAt).toLocaleDateString()}
                        </span>
                        <button
                          onClick={() => onRemoveMember(group.id, member.user.id)}
                          className="text-red-600 hover:text-red-900"
                          title="移除成员"
                        >
                          <UserX className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeDetailTab === 'messages' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium text-gray-900">聊天记录</h4>
                  <button
                    onClick={() => onClearMessages(group.id)}
                    className="px-3 py-1 text-sm text-red-600 hover:text-red-900 border border-red-300 rounded"
                  >
                    清空所有消息
                  </button>
                </div>
                <div className="space-y-2">
                  {group.messages.map((message) => (
                    <div
                      key={message.id}
                      className="flex items-start justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-sm font-medium text-gray-900">
                            {message.sender.nickname || message.sender.username}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(message.createdAt).toLocaleString()}
                          </span>
                          <span className={`px-2 py-1 text-xs rounded ${
                            message.type === 'text' ? 'bg-blue-100 text-blue-800' :
                            message.type === 'image' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {message.type === 'text' ? '文本' :
                             message.type === 'image' ? '图片' : message.type}
                          </span>
                        </div>
                        <div className="text-sm text-gray-700 max-w-md truncate">
                          {message.content}
                        </div>
                      </div>
                      <button
                        onClick={() => onDeleteMessage(message.id)}
                        className="text-red-600 hover:text-red-900 ml-2"
                        title="删除消息"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {group.messages.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      暂无聊天记录
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Admin; 