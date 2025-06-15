import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Users, Search, MessageCircle, Calendar, User, Crown, LogOut, Copy, Share2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface GroupMember {
  id: string;
  userId: string;
  role: string;
  joinedAt: string;
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
  inviteCode: string;
  maxMembers: number;
  isPublic: boolean;
  createdAt: string;
  createdBy: string;
  _count?: {
    members: number;
  };
  members?: GroupMember[];
}

interface CreateGroupData {
  name: string;
  description: string;
  maxMembers: number;
  isPublic: boolean;
}

const Groups: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [publicGroups, setPublicGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [activeTab, setActiveTab] = useState<'my' | 'public'>('my');
  const [inviteCode, setInviteCode] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [hasLoadedGroups, setHasLoadedGroups] = useState(false);

  const [createForm, setCreateForm] = useState<CreateGroupData>({
    name: '',
    description: '',
    maxMembers: 20,
    isPublic: true
  });

  useEffect(() => {
    if (!hasLoadedGroups) {
      fetchGroups();
      fetchPublicGroups();
    }
  }, [hasLoadedGroups]);

  const fetchGroups = async () => {
    try {
      const response = await api.get('/groups/my-groups');
      if (response.data && response.data.data && Array.isArray(response.data.data)) {
        setGroups(response.data.data);
      } else {
        console.error('API返回的我的小组数据格式不正确:', response.data);
        setGroups([]);
      }
    } catch (error: any) {
      console.error('获取我的小组失败:', error);
      toast.error(error.response?.data?.message || '获取我的小组失败');
      setGroups([]);
    }
  };

  const fetchPublicGroups = async () => {
    try {
      const response = await api.get('/groups/public');
      if (response.data && response.data.data && Array.isArray(response.data.data)) {
        setPublicGroups(response.data.data);
      } else {
        console.error('API返回的公开小组数据格式不正确:', response.data);
        setPublicGroups([]);
      }
    } catch (error: any) {
      console.error('获取公开小组失败:', error);
      toast.error(error.response?.data?.message || '获取公开小组失败');
      setPublicGroups([]);
    } finally {
      setLoading(false);
      setHasLoadedGroups(true); // 标记已加载
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.post('/groups', createForm);
      if (response.data && response.data.data) {
        setGroups([...groups, response.data.data]);
      setShowCreateModal(false);
      setCreateForm({ name: '', description: '', maxMembers: 20, isPublic: true });
      toast.success('小组创建成功！');
      }
    } catch (error: any) {
      console.error('创建小组失败:', error);
      toast.error(error.response?.data?.message || '创建小组失败');
    }
  };

  const handleJoinGroup = async (groupId?: string) => {
    try {
      const joinData = groupId 
        ? { groupId } 
        : { inviteCode };
      
      const response = await api.post('/groups/join', joinData);
      if (response.data && response.data.data) {
        setGroups([...groups, response.data.data]);
      setShowJoinModal(false);
      setInviteCode('');
      toast.success('加入小组成功！');
      }
    } catch (error: any) {
      console.error('加入小组失败:', error);
      toast.error(error.response?.data?.message || '加入小组失败');
    }
  };

  const handleLeaveGroup = async (groupId: string) => {
    if (!window.confirm('确定要离开这个小组吗？')) return;
    
    try {
      await api.post(`/groups/${groupId}/leave`);
      setGroups(groups.filter(g => g.id !== groupId));
      toast.success('已离开小组');
    } catch (error: any) {
      console.error('离开小组失败:', error);
      toast.error(error.response?.data?.message || '离开小组失败');
    }
  };

  const handleEnterGroup = (group: Group) => {
    setSelectedGroup(group);
    navigate(`/group/${group.id}`);
  };

  const handleShareInviteCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(`邀请码已复制: ${code}`);
    } catch (error) {
      // 如果复制失败，显示邀请码供用户手动复制
      const message = `邀请码: ${code}`;
      prompt('请手动复制邀请码:', code);
      console.log('复制邀请码失败:', error);
    }
  };

  // 过滤公开小组
  const filteredPublicGroups = publicGroups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (group.description && group.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 页面头部 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">学习小组</h1>
          <p className="text-gray-600">与志同道合的考研伙伴一起学习成长</p>
        </div>

        {/* 操作按钮 */}
        <div className="flex flex-wrap gap-4 mb-6">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowCreateModal(true)}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 hover:bg-indigo-700 transition-colors"
          >
            <Plus size={20} />
            创建小组
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowJoinModal(true)}
            className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 hover:bg-green-700 transition-colors"
          >
            <Users size={20} />
            加入小组
          </motion.button>
        </div>

        {/* 标签切换 */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('my')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'my'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                我的小组 ({groups.length})
              </button>
              <button
                onClick={() => setActiveTab('public')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'public'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                公开小组 ({publicGroups.length})
              </button>
            </nav>
          </div>
        </div>

        {/* 搜索框 (仅在公开小组tab显示) */}
        {activeTab === 'public' && (
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="搜索小组..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>
        )}

        {/* 小组列表 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(activeTab === 'my' ? groups : filteredPublicGroups).map((group) => (
            <motion.div
              key={group.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">{group.name}</h3>
                  {group.description && (
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">{group.description}</p>
                  )}
                </div>
                {group.isPublic && (
                  <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                    公开
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                <div className="flex items-center gap-1">
                  <Users size={16} />
                  <span>{group._count?.members || 0}/{group.maxMembers}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar size={16} />
                  <span>{new Date(group.createdAt).toLocaleDateString()}</span>
                </div>
                {activeTab === 'my' && (
                  <div className="flex items-center gap-1 text-blue-600">
                    <Copy size={16} />
                    <span className="font-mono text-xs">{group.inviteCode}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {activeTab === 'my' ? (
                  <>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleEnterGroup(group)}
                      className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors"
                    >
                      <MessageCircle size={16} />
                      进入
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleShareInviteCode(group.inviteCode)}
                      className="bg-green-600 text-white py-2 px-4 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-green-700 transition-colors"
                      title="分享邀请码"
                    >
                      <Share2 size={16} />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleLeaveGroup(group.id)}
                      className="bg-red-600 text-white py-2 px-4 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-red-700 transition-colors"
                    >
                      <LogOut size={16} />
                    </motion.button>
                  </>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleJoinGroup(group.id)}
                    className="w-full bg-green-600 text-white py-2 px-4 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-green-700 transition-colors"
                  >
                    <Plus size={16} />
                    加入小组
                  </motion.button>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* 空状态 */}
        {(activeTab === 'my' ? groups : filteredPublicGroups).length === 0 && (
          <div className="text-center py-12">
            <Users size={64} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              {activeTab === 'my' ? '还没有加入任何小组' : '没有找到相关小组'}
            </h3>
            <p className="text-gray-500 mb-6">
              {activeTab === 'my' 
                ? '创建或加入一个小组，开始与其他考研伙伴交流学习经验吧！'
                : '尝试搜索其他关键词或创建一个新的小组'
              }
            </p>
            {activeTab === 'my' && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowCreateModal(true)}
                className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
              >
                创建第一个小组
              </motion.button>
            )}
          </div>
        )}
      </div>

      {/* 创建小组模态框 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl p-6 w-full max-w-md"
          >
            <h2 className="text-xl font-bold text-gray-800 mb-4">创建新小组</h2>
            <form onSubmit={handleCreateGroup}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  小组名称
                </label>
                <input
                  type="text"
                  required
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="输入小组名称"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  小组描述
                </label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  rows={3}
                  placeholder="描述一下这个小组的目标和特色"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  最大成员数
                </label>
                <input
                  type="number"
                  min={2}
                  max={100}
                  value={createForm.maxMembers}
                  onChange={(e) => setCreateForm({ ...createForm, maxMembers: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div className="mb-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={createForm.isPublic}
                    onChange={(e) => setCreateForm({ ...createForm, isPublic: e.target.checked })}
                    className="mr-2 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">公开小组（其他用户可以搜索并加入）</span>
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  创建
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* 加入小组模态框 */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl p-6 w-full max-w-md"
          >
            <h2 className="text-xl font-bold text-gray-800 mb-4">加入小组</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                邀请码
              </label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="输入小组邀请码"
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowJoinModal(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => handleJoinGroup()}
                disabled={!inviteCode.trim()}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                加入
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Groups;