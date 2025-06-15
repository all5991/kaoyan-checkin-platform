import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Home, 
  Users, 
  User, 
  LogOut,
  Menu,
  X,
  Bell,
  Camera,
  Upload,
  Settings
} from 'lucide-react';
import { api } from '../services/api';
import toast from 'react-hot-toast';

const Layout: React.FC = () => {
  const { isAuthenticated, user, logout, isLoading, refreshUser } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [showAvatarUpload, setShowAvatarUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const avatarUploadRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭头像上传菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (avatarUploadRef.current && !avatarUploadRef.current.contains(event.target as Node)) {
        setShowAvatarUpload(false);
      }
    };

    if (showAvatarUpload) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAvatarUpload]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const navigation = [
    {
      name: '主页',
      href: '/dashboard',
      icon: Home,
    },
    {
      name: '学习小组',
      href: '/groups',
      icon: Users,
    },
    {
      name: '个人中心',
      href: '/profile',
      icon: User,
    },
  ];

  // 只为管理员用户添加管理员面板入口
  const ADMIN_EMAIL = process.env.REACT_APP_ADMIN_EMAIL || 'admin@example.com';
  const adminNavigation = user?.email === ADMIN_EMAIL ? [
    ...navigation,
    {
      name: '管理员面板',
      href: '/admin',
      icon: Settings,
    },
  ] : navigation;

  const handleLogout = () => {
    logout();
  };

  // 处理头像上传
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件');
      return;
    }

    // 验证文件大小 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('图片大小不能超过5MB');
      return;
    }

    setUploading(true);
    const uploadToast = toast.loading('正在上传头像...');

    try {
      // 1. 上传文件到服务器
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await api.post('/upload/file', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('头像上传响应:', uploadResponse.data);

      if (uploadResponse.data.success) {
        const avatarUrl = uploadResponse.data.data.url;
        console.log('头像URL:', avatarUrl);

        // 2. 更新用户头像
        const updateResponse = await api.put('/auth/profile', {
          avatar: avatarUrl
        });

        console.log('用户信息更新响应:', updateResponse.data);

        if (updateResponse.data.success) {
          // 3. 刷新用户信息
          await refreshUser();
          console.log('用户信息刷新后:', user);
          toast.success('头像更换成功', { id: uploadToast });
          setShowAvatarUpload(false);
        } else {
          throw new Error(updateResponse.data.message || '更新头像失败');
        }
      } else {
        throw new Error(uploadResponse.data.message || '上传文件失败');
      }
    } catch (error: any) {
      console.error('头像上传失败:', error);
      toast.error(error.response?.data?.message || error.message || '头像上传失败', { id: uploadToast });
    } finally {
      setUploading(false);
      // 清空文件输入框
      event.target.value = '';
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* 移动端菜单遮罩 */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 侧边栏 */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:relative lg:flex-shrink-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between h-16 px-6 border-b">
            <h1 className="text-xl font-bold text-gray-900">考研打卡</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-md hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex flex-col flex-1 min-h-0">
            <nav className="mt-6 px-4 flex-1">
              <div className="space-y-1">
                {adminNavigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <item.icon className={`mr-3 h-5 w-5 ${isActive ? 'text-blue-700' : 'text-gray-400'}`} />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </nav>

            {/* 用户信息 */}
            <div className="p-4 border-t mt-auto">
              <div className="flex items-center space-x-3 mb-3 py-1">
                <div className="relative">
                  <div className="h-12 w-12 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {user?.avatar ? (
                      <img 
                        src={user.avatar} 
                        alt="用户头像" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white text-lg font-medium">
                        {user?.nickname?.[0] || user?.username?.[0] || 'U'}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setShowAvatarUpload(!showAvatarUpload)}
                    disabled={uploading}
                    className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="更换头像"
                  >
                    <Camera className="h-3 w-3 text-gray-600" />
                  </button>
                  
                  {/* 头像上传选项 */}
                  {showAvatarUpload && (
                    <div className="absolute bottom-full mb-2 right-0 bg-white rounded-lg shadow-lg border p-2 z-50" ref={avatarUploadRef}>
                      <label className={`flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <Upload className="h-4 w-4 text-gray-600" />
                        <span className="text-sm text-gray-700">
                          {uploading ? '上传中...' : '上传头像'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarUpload}
                          disabled={uploading}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user?.nickname || user?.username}
                  </p>
                  <p className="text-xs text-gray-500 truncate w-32">
                    {user?.email}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors"
              >
                <LogOut className="mr-3 h-4 w-4" />
                退出登录
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col w-0">
        {/* 顶部导航栏 */}
        <div className="sticky top-0 z-40 bg-white shadow-sm border-b">
          <div className="flex items-center justify-between h-12 px-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-md hover:bg-gray-100"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex items-center space-x-2">
              {/* 通知 */}
              <button className="p-1 rounded-full hover:bg-gray-100 relative">
                <Bell className="h-4 w-4 text-gray-600" />
                <span className="absolute top-0.5 right-0.5 h-1.5 w-1.5 bg-red-500 rounded-full"></span>
              </button>
            </div>
          </div>
        </div>

        {/* 页面内容 */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout; 