import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  Clock, 
  Users, 
  CheckCircle, 
  TrendingUp,
  Calendar,
  Plus,
  Activity,
  GraduationCap,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { authAPI, checkInAPI, api } from '../services/api';
import { UserStats, CheckIn, Group, EXAM_CONFIG } from '../types';
import toast from 'react-hot-toast';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [todayCheckIns, setTodayCheckIns] = useState<CheckIn[]>([]);
  const [recentCheckIns, setRecentCheckIns] = useState<CheckIn[]>([]);
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [dailyQuote, setDailyQuote] = useState<string>('');
  const [quoteLoading, setQuoteLoading] = useState(false);

  // 考研倒计时相关状态
  const [examCountdown, setExamCountdown] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    fetchDashboardData();
    fetchDailyQuote();
    startCountdown();
    
    // 设置倒计时定时器
    const timer = setInterval(() => {
      startCountdown();
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const startCountdown = () => {
    // 使用正确的考研时间：2025年12月20日上午8:30
    const examDate = new Date(EXAM_CONFIG.EXAM_DATE);
    const now = new Date();
    const timeDiff = examDate.getTime() - now.getTime();

    if (timeDiff > 0) {
      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

      setExamCountdown({ days, hours, minutes, seconds });
    } else {
      setExamCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // 并行获取各种数据
      const [statsRes, todayRes, recentRes, groupsRes] = await Promise.all([
        authAPI.getUserStats().catch(() => ({ data: { data: null } })),
        checkInAPI.getToday().catch(() => ({ data: { data: [] } })),
        checkInAPI.getList({ limit: 5 }).catch(() => ({ data: { data: [] } })),
        api.get('/groups/my-groups').catch(() => ({ data: { data: [] } }))
      ]);

      if (statsRes.data?.data) {
        setUserStats(statsRes.data.data);
      }
      
      if (todayRes.data?.data) {
        setTodayCheckIns(Array.isArray(todayRes.data.data) ? todayRes.data.data : []);
      }
      
      if (recentRes.data?.data) {
        setRecentCheckIns(Array.isArray(recentRes.data.data) ? recentRes.data.data : []);
      }
      
      if (groupsRes.data?.data) {
        setMyGroups(Array.isArray(groupsRes.data.data) ? groupsRes.data.data : []);
      }
    } catch (error: any) {
      console.error('获取仪表板数据失败:', error);
      toast.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchDailyQuote = async () => {
    try {
      setQuoteLoading(true);
      const response = await fetch('https://apis.tianapi.com/mnpara/index?key=fbf60428d58ccd4e9bd71d2235019325');
      const data = await response.json();
      
      if (data.code === 200 && data.result && data.result.content) {
        setDailyQuote(data.result.content);
      } else {
        // 备用小段子
        const fallbackQuotes = [
          "努力不一定成功，但不努力一定不会成功。",
          "今天的努力，是为了明天更好的自己。",
          "学习如逆水行舟，不进则退。",
          "成功的秘诀在于坚持不懈的努力。",
          "每一次的学习都是对未来的投资。"
        ];
        const randomQuote = fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
        setDailyQuote(randomQuote);
      }
    } catch (error) {
      console.error('获取每日小段子失败:', error);
      // 使用备用小段子
      const fallbackQuotes = [
        "努力不一定成功，但不努力一定不会成功。",
        "今天的努力，是为了明天更好的自己。",
        "学习如逆水行舟，不进则退。",
        "成功的秘诀在于坚持不懈的努力。",
        "每一次的学习都是对未来的投资。"
      ];
      const randomQuote = fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
      setDailyQuote(randomQuote);
    } finally {
      setQuoteLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 欢迎区域和考研倒计时 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              欢迎回来，{user?.nickname || user?.username}！
            </h1>
            <p className="text-gray-600 mb-4">
              今天是 {new Date().toLocaleDateString('zh-CN', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                weekday: 'long'
              })}，继续保持学习的好习惯吧！
            </p>
            
            {/* 每日小段子 */}
            <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-l-4 border-blue-500">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-blue-800 mb-2 flex items-center">
                    <BookOpen className="h-4 w-4 mr-1" />
                    每日一句
                  </h3>
                  {quoteLoading ? (
                    <div className="flex items-center text-gray-500">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                      加载中...
                    </div>
                  ) : (
                    <p className="text-gray-700 text-sm leading-relaxed">
                      {dailyQuote || "今天也要加油哦！"}
                    </p>
                  )}
                </div>
                <button
                  onClick={fetchDailyQuote}
                  disabled={quoteLoading}
                  className="ml-3 p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-full transition-colors disabled:opacity-50"
                  title="刷新小段子"
                >
                  <RefreshCw className={`h-4 w-4 ${quoteLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>

          {/* 考研倒计时 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-r from-red-500 to-pink-600 rounded-xl shadow-lg p-6 text-white"
          >
            <div className="flex items-center mb-4">
              <GraduationCap className="h-6 w-6 mr-2" />
              <h2 className="text-lg font-semibold">考研倒计时</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-white bg-opacity-20 rounded-lg p-3">
                <div className="text-2xl font-bold">{examCountdown.days}</div>
                <div className="text-sm">天</div>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-3">
                <div className="text-2xl font-bold">{examCountdown.hours}</div>
                <div className="text-sm">时</div>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-3">
                <div className="text-2xl font-bold">{examCountdown.minutes}</div>
                <div className="text-sm">分</div>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-3">
                <div className="text-2xl font-bold">{examCountdown.seconds}</div>
                <div className="text-sm">秒</div>
              </div>
            </div>
            
            <div className="mt-4 text-center">
              <p className="text-sm opacity-90">距离2025年考研还有</p>
              <p className="text-xs opacity-75 mt-1">2025年12月20日 08:30</p>
            </div>
          </motion.div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">总打卡次数</p>
                <p className="text-2xl font-bold text-gray-800">
                  {userStats?.totalCheckIns || 0}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">学习时长</p>
                <p className="text-2xl font-bold text-gray-800">
                  {userStats?.totalStudyHours || 0}h
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Clock className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">连续打卡</p>
                <p className="text-2xl font-bold text-gray-800">
                  {userStats?.currentStreak || 0}天
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">参与小组</p>
                <p className="text-2xl font-bold text-gray-800">
                  {myGroups.length}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* 主要内容区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 今日打卡 */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                今日打卡
              </h2>
              <button
                onClick={() => navigate('/checkin')}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4 mr-1" />
                打卡
              </button>
            </div>

            {todayCheckIns.length > 0 ? (
              <div className="space-y-4">
                {todayCheckIns.map((checkIn) => (
                  <div key={checkIn.id} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0">
                      <div className={`w-3 h-3 rounded-full ${
                        checkIn.type === 'start' ? 'bg-green-500' : 
                        checkIn.type === 'progress' ? 'bg-blue-500' : 'bg-red-500'
                      }`}></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-800">
                          {checkIn.type === 'start' ? '开始学习' : 
                           checkIn.type === 'progress' ? '学习进度' : '结束学习'}
                        </p>
                        <span className="text-xs text-gray-500">
                          {formatTime(checkIn.createdAt)}
                        </span>
                      </div>
                      {checkIn.content && (
                        <p className="text-sm text-gray-600 mt-1">{checkIn.content}</p>
                      )}
                      {checkIn.studyHours && (
                        <p className="text-xs text-blue-600 mt-1">
                          学习时长: {checkIn.studyHours}小时
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">今天还没有打卡记录</p>
                <p className="text-sm text-gray-400 mt-1">开始您的第一次打卡吧！</p>
              </div>
            )}
          </motion.div>

          {/* 我的小组 */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                <Users className="h-5 w-5 mr-2 text-purple-600" />
                我的小组
              </h2>
              <button
                onClick={() => navigate('/groups')}
                className="text-purple-600 hover:text-purple-800 text-sm font-medium"
              >
                查看全部
              </button>
            </div>

            {myGroups.length > 0 ? (
              <div className="space-y-3">
                {myGroups.slice(0, 4).map((group) => (
                  <div 
                    key={group.id} 
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => navigate(`/group/${group.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {group.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {group.memberCount || 0} 名成员
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Users className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">还没有加入任何小组</p>
                <button
                  onClick={() => navigate('/groups')}
                  className="text-purple-600 hover:text-purple-800 text-sm font-medium mt-2"
                >
                  去加入小组
                </button>
              </div>
            )}
          </motion.div>
        </div>

        {/* 最近活动 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white rounded-xl shadow-sm p-6"
        >
          <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center">
            <Activity className="h-5 w-5 mr-2 text-green-600" />
            最近活动
          </h2>

          {recentCheckIns.length > 0 ? (
            <div className="space-y-4">
              {recentCheckIns.map((checkIn, index) => (
                <div key={checkIn.id} className="flex items-start space-x-4">
                  <div className="flex-shrink-0 mt-1">
                    <div className={`w-2 h-2 rounded-full ${
                      checkIn.type === 'start' ? 'bg-green-500' : 
                      checkIn.type === 'progress' ? 'bg-blue-500' : 'bg-red-500'
                    }`}></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-800">
                        {checkIn.type === 'start' ? '开始了学习' : 
                         checkIn.type === 'progress' ? '更新了学习进度' : '结束了学习'}
                      </p>
                      <span className="text-xs text-gray-500">
                        {formatDate(checkIn.createdAt)}
                      </span>
                    </div>
                    {checkIn.content && (
                      <p className="text-sm text-gray-600 mt-1">{checkIn.content}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <Activity className="h-8 w-8 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">暂无最近活动</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;