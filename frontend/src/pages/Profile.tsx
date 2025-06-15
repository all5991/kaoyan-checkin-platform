import React, { useState, useEffect } from 'react';
import { User as UserIcon, Mail, Phone, MapPin, Target, Save, School, BookOpen, Clock, ChevronDown, Search, Calendar } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { UserStats, University } from '../types';

const Profile: React.FC = () => {
  const { user, login } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [universities, setUniversities] = useState<University[]>([]);
  const [isUniversityDropdownOpen, setIsUniversityDropdownOpen] = useState(false);
  const [universitySearch, setUniversitySearch] = useState('');
  const [currentUniversity, setCurrentUniversity] = useState<University | null>(null);
  const [stats, setStats] = useState<UserStats>({
    totalCheckIns: 0,
    totalStudyHours: 0,
    currentStreak: 0,
    longestStreak: 0,
    completedTasks: 0,
    totalTasks: 0,
    taskCompletionRate: 0
  });
  
  const [formData, setFormData] = useState({
    nickname: user?.nickname || '',
    phone: (user as any)?.phone || '',
    targetMajor: user?.targetMajor || '',
    targetUniversityId: user?.targetUniversityId || '',
  });

  useEffect(() => {
    fetchUserStats();
    fetchUniversities();
    fetchCurrentUniversity();
  }, []);

  // 添加缓存标记，避免重复请求
  const [hasLoadedStats, setHasLoadedStats] = useState(false);

  // 当搜索词改变时，动态搜索院校
  useEffect(() => {
    if (universitySearch.length >= 2) {
      const timeoutId = setTimeout(() => {
        fetchUniversities(universitySearch);
      }, 300); // 防抖，300ms后执行搜索
      
      return () => clearTimeout(timeoutId);
    } else if (universitySearch.length === 0) {
      fetchUniversities(); // 重置为默认列表
    }
  }, [universitySearch]);

  // 获取用户统计数据
  const fetchUserStats = async () => {
    if (hasLoadedStats) return; // 避免重复请求
    
    try {
      const response = await api.get('/auth/stats');
      if (response.data && response.data.data) {
        setStats(response.data.data);
        setHasLoadedStats(true);
      }
    } catch (error) {
      console.error('获取统计数据失败:', error);
    }
  };

  // 获取院校列表
  const fetchUniversities = async (searchTerm: string = '') => {
    try {
      // 使用第三方大学API，优先搜索中国的大学
      const searchQuery = searchTerm || 'university';
      const response = await fetch(`http://universities.hipolabs.com/search?name=${searchQuery}&country=China`);
      
      if (!response.ok) {
        // 如果中国大学搜索失败，尝试全球搜索
        const globalResponse = await fetch(`http://universities.hipolabs.com/search?name=${searchQuery}&limit=50`);
        if (globalResponse.ok) {
          const globalData = await globalResponse.json();
          setUniversities(globalData.map((uni: any) => ({
            ...uni,
            id: uni.domain || `${uni.name}-${uni.country}`,
            location: uni.country
          })));
        }
        return;
      }
      
      const data = await response.json();
      
      if (data && Array.isArray(data)) {
        // 转换API响应格式以匹配我们的接口
        const transformedData = data.map((uni: any) => ({
          ...uni,
          id: uni.domains?.[0] || `${uni.name}-${uni.country}`,
          location: uni['state-province'] || uni.country
        }));
        setUniversities(transformedData);
      }
    } catch (error) {
      console.error('获取院校列表失败:', error);
      // 如果API调用失败，设置一些默认的中国大学
      setUniversities([
        { id: '1', name: '清华大学', location: '北京', country: 'China' },
        { id: '2', name: '北京大学', location: '北京', country: 'China' },
        { id: '3', name: '复旦大学', location: '上海', country: 'China' },
        { id: '4', name: '上海交通大学', location: '上海', country: 'China' },
        { id: '5', name: '浙江大学', location: '浙江', country: 'China' },
        { id: '6', name: '南京大学', location: '江苏', country: 'China' },
        { id: '7', name: '中国科学技术大学', location: '安徽', country: 'China' },
        { id: '8', name: '华中科技大学', location: '湖北', country: 'China' },
        { id: '9', name: '中山大学', location: '广东', country: 'China' },
        { id: '10', name: '西安交通大学', location: '陕西', country: 'China' }
      ]);
    }
  };

    // 获取当前选择的院校信息
  const fetchCurrentUniversity = async () => {
    if (user?.targetUniversityId) {
      // 先尝试从localStorage获取缓存的院校信息
      try {
        const cachedUniversity = localStorage.getItem(`university_${user.targetUniversityId}`);
        if (cachedUniversity) {
          const universityData = JSON.parse(cachedUniversity);
          setCurrentUniversity(universityData);
          return;
        }
      } catch (error) {
        console.log('从localStorage获取院校信息失败');
      }
      
      // 其次尝试从本地API获取
      try {
        const response = await api.get(`/universities/${user.targetUniversityId}`);
        if (response.data && response.data.data) {
          setCurrentUniversity(response.data.data);
          return;
        }
      } catch (error) {
        console.log('本地API获取院校信息失败，尝试从目标院校ID推断信息');
      }
      
      // 最后，如果都失败了，尝试构造院校信息（适用于第三方API选择的院校）
      const universityId = user.targetUniversityId;
      if (universityId) {
        // 如果ID包含域名信息，可以推断一些信息
        setCurrentUniversity({
          id: universityId,
          name: universityId.includes('.') ? universityId.split('.')[0] : universityId,
          domains: universityId.includes('.') ? [universityId] : undefined,
          location: 'Unknown'
        });
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleUniversitySelect = (university: University) => {
    setCurrentUniversity(university);
    setFormData(prev => ({ ...prev, targetUniversityId: university.id || university.domains?.[0] || university.name }));
    setIsUniversityDropdownOpen(false);
    setUniversitySearch('');
    
    // 将选择的院校信息缓存到localStorage，以便后续获取
    const universityCache = {
      id: university.id || university.domains?.[0] || university.name,
      name: university.name,
      location: university.location,
      country: university.country,
      domains: university.domains,
      'state-province': university['state-province'],
      web_pages: university.web_pages
    };
    localStorage.setItem(`university_${universityCache.id}`, JSON.stringify(universityCache));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const response = await api.put('/auth/profile', formData);
      
      if (response.data && response.data.success) {
        // 更新本地存储的用户信息
        const updatedUser = response.data.data;
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        const token = localStorage.getItem('token') || '';
        
        // 合并更新后的用户信息
        const mergedUser = { ...currentUser, ...updatedUser };
        
        // 更新本地存储和认证上下文
        login(token, mergedUser);
        
        toast.success('个人信息更新成功');
        setIsEditing(false);
        
        // 重新获取院校信息
        fetchCurrentUniversity();
      } else {
        toast.error(response.data?.message || '更新失败');
      }
    } catch (error: any) {
      console.error('更新个人信息失败:', error);
      toast.error(error.response?.data?.message || '更新个人信息失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 显示院校列表（已通过API搜索过滤）
  const filteredUniversities = universities;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">个人中心</h1>
        <p className="text-gray-600">管理您的个人信息和学习目标</p>
      </div>

      {/* 基本信息 */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">基本信息</h2>
          <button
            onClick={() => setIsEditing(!isEditing)}
            disabled={isLoading}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              isEditing 
                ? 'bg-gray-200 text-gray-800 hover:bg-gray-300' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoading ? '处理中...' : isEditing ? '取消' : '编辑'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 头像 */}
          <div className="col-span-1 md:col-span-2 flex flex-col md:flex-row md:items-center gap-4">
            <div className="h-20 w-20 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-2xl font-medium">
                {user?.nickname?.[0] || user?.username?.[0] || 'U'}
              </span>
            </div>
            <div>
              <h3 className="text-xl font-medium text-gray-900 mb-1">
                {user?.nickname || user?.username}
              </h3>
              <p className="text-gray-500 flex items-center">
                <Mail className="h-4 w-4 mr-1" /> {user?.email}
              </p>
            </div>
          </div>

          {/* 用户名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <UserIcon className="inline h-4 w-4 mr-1" />
              用户名
            </label>
            <input
              type="text"
              value={user?.username || ''}
              disabled
              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
            />
          </div>

          {/* 邮箱 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Mail className="inline h-4 w-4 mr-1" />
              邮箱
            </label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
            />
          </div>

          {/* 昵称 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              昵称
            </label>
            <input
              type="text"
              name="nickname"
              value={formData.nickname}
              onChange={handleInputChange}
              disabled={!isEditing || isLoading}
              className={`w-full px-3 py-2 border border-gray-200 rounded-lg ${
                isEditing ? 'focus:ring-2 focus:ring-blue-500' : 'bg-gray-50 text-gray-500'
              }`}
              placeholder="请输入昵称"
            />
          </div>

          {/* 手机号 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Phone className="inline h-4 w-4 mr-1" />
              手机号
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              disabled={!isEditing || isLoading}
              className={`w-full px-3 py-2 border border-gray-200 rounded-lg ${
                isEditing ? 'focus:ring-2 focus:ring-blue-500' : 'bg-gray-50 text-gray-500'
              }`}
              placeholder="请输入手机号"
            />
          </div>
        </div>

        {isEditing && (
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? '保存中...' : '保存更改'}
            </button>
          </div>
        )}
      </div>

      {/* 学习目标 */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">学习目标</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 目标专业 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Target className="inline h-4 w-4 mr-1" />
              目标专业
            </label>
            <input
              type="text"
              name="targetMajor"
              value={formData.targetMajor}
              onChange={handleInputChange}
              disabled={!isEditing || isLoading}
              className={`w-full px-3 py-2 border border-gray-200 rounded-lg ${
                isEditing ? 'focus:ring-2 focus:ring-blue-500' : 'bg-gray-50 text-gray-500'
              }`}
              placeholder="请输入目标专业"
            />
          </div>

          {/* 目标院校 */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <School className="inline h-4 w-4 mr-1" />
              目标院校
            </label>
            
            {!isEditing ? (
              <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500">
                {currentUniversity ? (
                  <div className="flex items-center space-x-2">
                    <span>{currentUniversity.name}</span>
                    {currentUniversity.location && (
                      <span className="text-xs text-gray-400">({currentUniversity.location})</span>
                    )}
                  </div>
                ) : (
                  '未选择院校'
                )}
              </div>
            ) : (
              <div>
                <button
                  type="button"
                  onClick={() => setIsUniversityDropdownOpen(!isUniversityDropdownOpen)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-left flex items-center justify-between hover:border-blue-400 focus:ring-2 focus:ring-blue-500"
                >
                  <span className={currentUniversity ? 'text-gray-900' : 'text-gray-500'}>
                    {currentUniversity ? (
                      <div className="flex items-center space-x-2">
                        <span>{currentUniversity.name}</span>
                        {currentUniversity.location && (
                          <span className="text-xs text-gray-400">({currentUniversity.location})</span>
                        )}
                      </div>
                    ) : (
                      '请选择目标院校'
                    )}
                  </span>
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </button>

                {isUniversityDropdownOpen && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-hidden">
                    <div className="p-2 border-b border-gray-200">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="搜索院校..."
                          value={universitySearch}
                          onChange={(e) => setUniversitySearch(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {filteredUniversities.length === 0 ? (
                        <div className="p-3 text-gray-500 text-center">
                          没有找到匹配的院校
                        </div>
                      ) : (
                        filteredUniversities.map((university) => (
                          <button
                            key={university.id}
                            type="button"
                            onClick={() => handleUniversitySelect(university)}
                            className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-gray-900">{university.name}</div>
                                {university.location && (
                                  <div className="text-xs text-gray-500 flex items-center mt-1">
                                    <MapPin className="h-3 w-3 mr-1" />
                                    {university.location}
                                  </div>
                                )}
                              </div>
                              {university.country && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                  {university.country}
                                </span>
                              )}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 学习统计 */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">学习统计</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div className="text-center p-5 bg-blue-50 rounded-lg border border-blue-100">
            <div className="flex items-center justify-center mb-2">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-600">{stats.totalCheckIns}</div>
            <div className="text-sm text-gray-600 mt-1">总打卡天数</div>
          </div>

          <div className="text-center p-5 bg-green-50 rounded-lg border border-green-100">
            <div className="flex items-center justify-center mb-2">
              <Clock className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-600">{stats.currentStreak}</div>
            <div className="text-sm text-gray-600 mt-1">连续打卡天数</div>
          </div>

          <div className="text-center p-5 bg-purple-50 rounded-lg border border-purple-100">
            <div className="flex items-center justify-center mb-2">
              <BookOpen className="h-5 w-5 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-purple-600">{stats.totalStudyHours}</div>
            <div className="text-sm text-gray-600 mt-1">总学习小时</div>
          </div>
          
          <div className="text-center p-5 bg-amber-50 rounded-lg border border-amber-100 sm:col-span-2 md:col-span-1">
            <div className="flex items-center justify-center mb-2">
              <Target className="h-5 w-5 text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-amber-600">
              {stats.taskCompletionRate !== undefined ? `${stats.taskCompletionRate}%` : `${stats.completedTasks} / ${stats.totalTasks}`}
            </div>
            <div className="text-sm text-gray-600 mt-1">任务完成率</div>
            {stats.taskCompletionRate !== undefined && stats.totalTasks > 0 && (
              <div className="text-xs text-gray-500 mt-1">
                基于 {stats.totalTasks} 个任务的加权平均
              </div>
            )}
          </div>
          
          <div className="text-center p-5 bg-indigo-50 rounded-lg border border-indigo-100 md:col-span-2">
            <div className="flex items-center justify-center mb-2">
              <School className="h-5 w-5 text-indigo-600" />
            </div>
            <div className="text-xl font-bold text-indigo-600">
              {currentUniversity ? `目标院校: ${currentUniversity.name}` : '未设置目标院校'}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {currentUniversity && currentUniversity.location ? `${currentUniversity.location}${currentUniversity.country ? ` • ${currentUniversity.country}` : ''}` : '在学习目标中设置您的目标院校'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile; 