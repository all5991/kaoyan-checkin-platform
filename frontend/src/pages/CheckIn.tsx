import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Clock, 
  Heart, 
  MapPin, 
  Send,
  BookOpen,
  Target,
  CheckCircle,
  Plus,
  Edit,
  Save,
  X,
  Trash2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { checkInAPI, api } from '../services/api';
import { CheckIn as CheckInType } from '../types';
import toast from 'react-hot-toast';

interface Task {
  id: string;
  title: string;
  description?: string;
  taskType?: 'count' | 'duration' | 'progress';
  targetCount?: number;
  currentCount?: number;
  dailyTarget?: number;
  unit?: string;
  targetDuration?: number;
  currentDuration?: number;
  dailyDuration?: number;
  progress?: number;
  totalDays?: number;
  weight?: number;
  priority: number;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

// 任务管理组件接口
interface TaskManagementProps {
  tasks: Task[];
  loading: boolean;
  onCreateTask: () => void;
  onUpdateTask: () => void;
}

// 日历组件接口
interface CalendarViewProps {
  calendarData: {[key: string]: CheckInType[]};
  isLoading: boolean;
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  selectedDate: string | null;
  onDateSelect: (date: string | null) => void;
  showDateDetail: boolean;
  onShowDetailChange: (show: boolean) => void;
}

const CheckIn: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'checkin' | 'study'>('checkin');
  const [studySubTab, setStudySubTab] = useState<'tasks' | 'calendar'>('tasks');
  const [checkInType, setCheckInType] = useState<'start' | 'progress' | 'end'>('start');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState('');
  const [studyHours, setStudyHours] = useState<number | undefined>();
  const [location, setLocation] = useState('');
  const [todayCheckIns, setTodayCheckIns] = useState<CheckInType[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 日历相关状态
  const [calendarData, setCalendarData] = useState<{[key: string]: CheckInType[]}>({});
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showDateDetail, setShowDateDetail] = useState(false);
  
  // 任务管理状态
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // 新任务表单状态
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    taskType: 'count' as 'count' | 'duration' | 'progress',
    taskCategory: 'vocabulary',
    weight: 5,
    targetCount: 2000,
    dailyTarget: 50,
    unit: '个',
    targetDuration: 1800,
    dailyDuration: 60,
    totalDays: 15,
    priority: 3
  });

  const moods = [
    { value: 'excited', label: '兴奋', emoji: '😄' },
    { value: 'happy', label: '开心', emoji: '😊' },
    { value: 'calm', label: '平静', emoji: '😌' },
    { value: 'focused', label: '专注', emoji: '🤔' },
    { value: 'tired', label: '疲惫', emoji: '😴' },
    { value: 'stressed', label: '焦虑', emoji: '😰' },
  ];

  useEffect(() => {
    fetchTodayCheckIns();
  }, []);

  useEffect(() => {
    if (activeTab === 'study' && studySubTab === 'tasks') {
      fetchTasks();
    } else if (activeTab === 'study' && studySubTab === 'calendar') {
      fetchCalendarData();
    }
  }, [activeTab, studySubTab, currentMonth]);

  const fetchTodayCheckIns = async () => {
    try {
      const response = await checkInAPI.getToday();
      if (response.data?.data) {
        setTodayCheckIns(response.data.data);
        
        const checkIns = response.data.data;
        const hasStart = checkIns.some((c: CheckInType) => c.type === 'start');
        const hasProgress = checkIns.some((c: CheckInType) => c.type === 'progress');
        const hasEnd = checkIns.some((c: CheckInType) => c.type === 'end');
        
        if (!hasStart) {
          setCheckInType('start');
        } else if (!hasEnd) {
          setCheckInType(hasProgress ? 'end' : 'progress');
        } else {
          setCheckInType('end');
        }
      }
    } catch (error) {
      console.error('获取今日打卡记录失败:', error);
    }
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await api.get('/tasks');
      if (response.data?.data) {
        setTasks(response.data.data);
      }
    } catch (error) {
      console.error('获取任务列表失败:', error);
      toast.error('获取任务列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchCalendarData = async () => {
    setIsLoadingCalendar(true);
    try {
      // 获取日历网格的实际显示范围（包括前后月的日期）
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      
      // 调整到周一开始的完整日历网格
      const startDate = new Date(firstDay);
      startDate.setDate(startDate.getDate() - ((startDate.getDay() + 6) % 7));
      
      const endDate = new Date(lastDay);
      endDate.setDate(endDate.getDate() + (6 - ((endDate.getDay() + 6) % 7)));
      
      console.log('获取日历数据范围:', startDate.toISOString(), '到', endDate.toISOString());
      
      const response = await api.get('/checkins', {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          limit: 1000
        }
      });
      
      if (response.data?.data) {
        const checkIns = response.data.data;
        const groupedData: {[key: string]: CheckInType[]} = {};
        
        checkIns.forEach((checkIn: CheckInType) => {
          // 直接使用UTC日期的年月日部分，避免时区转换
          const utcDate = checkIn.createdAt.split('T')[0]; // 直接取YYYY-MM-DD部分
          console.log('打卡记录:', checkIn.createdAt, '-> UTC日期:', utcDate);
          if (!groupedData[utcDate]) {
            groupedData[utcDate] = [];
          }
          groupedData[utcDate].push(checkIn);
        });
        
        console.log('日历数据分组结果:', groupedData);
        setCalendarData(groupedData);
      }
    } catch (error) {
      console.error('获取日历数据失败:', error);
      toast.error('获取学习记录失败');
    } finally {
      setIsLoadingCalendar(false);
    }
  };

  const createTask = async () => {
    if (!newTask.title.trim()) {
      toast.error('请输入任务标题');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/tasks', newTask);
      
      if (response.data?.success) {
        toast.success('任务创建成功！');
        setShowCreateModal(false);
        setNewTask({
          title: '',
          description: '',
          taskType: 'count',
          taskCategory: 'vocabulary',
          weight: 5,
          targetCount: 2000,
          dailyTarget: 50,
          unit: '个',
          targetDuration: 1800,
          dailyDuration: 60,
          totalDays: 15,
          priority: 3
        });
        fetchTasks();
      }
    } catch (error: any) {
      toast.error('创建失败：' + (error.response?.data?.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      toast.error('请填写打卡内容');
      return;
    }

    if (checkInType === 'end' && !studyHours) {
      toast.error('请填写学习时长');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const checkInData = {
        type: checkInType,
        content: content.trim(),
        mood,
        studyHours: checkInType === 'end' ? studyHours : undefined,
        location: location.trim() || undefined,
      };

      const response = await checkInAPI.create(checkInData);
      
      if (response.data?.success) {
        toast.success('打卡成功！');
        setContent('');
        setMood('');
        setStudyHours(undefined);
        setLocation('');
        fetchTodayCheckIns();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || '打卡失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCheckInTitle = () => {
    switch (checkInType) {
      case 'start': return '开始学习打卡';
      case 'progress': return '学习进度打卡';
      case 'end': return '结束学习打卡';
      default: return '打卡';
    }
  };

  const getCheckInDescription = () => {
    switch (checkInType) {
      case 'start': return '记录今天的学习计划和心情状态';
      case 'progress': return '分享学习进度和当前状态';
      case 'end': return '总结今天的学习成果和收获';
      default: return '';
    }
  };

  // 检查是否已完成所有打卡
  const isCompleted = todayCheckIns.some(c => c.type === 'start') && 
                     todayCheckIns.some(c => c.type === 'end');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* 页面标题和导航 */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">学习管理</h1>
          
          <div className="flex justify-center mb-6">
            <div className="bg-white rounded-lg p-1 shadow-sm">
              <button
                onClick={() => setActiveTab('checkin')}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'checkin' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                今日打卡
              </button>
              <button
                onClick={() => setActiveTab('study')}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'study' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                学习管理
              </button>
            </div>
          </div>
        </div>

        {/* 打卡内容 */}
        {activeTab === 'checkin' ? (
          <div className="space-y-6">
        {/* 打卡进度 */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">今日打卡进度</h2>
          
          <div className="flex items-center justify-between">
            {['start', 'progress', 'end'].map((type, index) => {
              const isCompleted = todayCheckIns.some(c => c.type === type);
              const isCurrent = checkInType === type;
              
              return (
                <div key={type} className="flex items-center">
                  <div className={`
                    w-12 h-12 rounded-full flex items-center justify-center border-2 transition-colors
                    ${isCompleted 
                      ? 'bg-green-500 border-green-500 text-white' 
                      : isCurrent 
                        ? 'bg-blue-500 border-blue-500 text-white'
                        : 'bg-gray-100 border-gray-300 text-gray-400'
                    }
                  `}>
                    {isCompleted ? (
                      <CheckCircle className="h-6 w-6" />
                    ) : (
                      <span className="text-sm font-medium">{index + 1}</span>
                    )}
                  </div>
                  
                  <div className="ml-3">
                    <p className={`text-sm font-medium ${
                      isCompleted ? 'text-green-600' : isCurrent ? 'text-blue-600' : 'text-gray-400'
                    }`}>
                      {type === 'start' ? '开始学习' : type === 'progress' ? '学习进度' : '结束学习'}
                    </p>
                    {isCompleted && (
                      <p className="text-xs text-gray-500">
                        {new Date(todayCheckIns.find(c => c.type === type)?.createdAt || '').toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                  
                  {index < 2 && (
                    <div className={`ml-6 w-16 h-0.5 ${
                      todayCheckIns.some(c => c.type === ['start', 'progress', 'end'][index + 1]) 
                        ? 'bg-green-500' 
                        : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

          {/* 打卡表单 */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center mb-6">
                <BookOpen className="h-6 w-6 text-blue-600 mr-2" />
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">{getCheckInTitle()}</h2>
                  <p className="text-gray-600 text-sm">{getCheckInDescription()}</p>
                </div>
              </div>

              {isCompleted ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">今日打卡已完成！</h3>
                  <p className="text-gray-600">您已完成今天的所有打卡，明天继续加油！</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      打卡内容 *
                    </label>
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder={
                        checkInType === 'start' 
                          ? '今天准备学习什么内容？心情如何？'
                          : checkInType === 'progress'
                            ? '分享一下学习进度和收获...'
                            : '总结一下今天的学习成果...'
                      }
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Heart className="inline h-4 w-4 mr-1" />
                      当前心情
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {moods.map((moodOption) => (
                        <button
                          key={moodOption.value}
                          type="button"
                          onClick={() => setMood(moodOption.value)}
                          className={`
                            p-2 rounded-lg border text-sm transition-colors
                            ${mood === moodOption.value 
                              ? 'border-blue-500 bg-blue-50 text-blue-700' 
                              : 'border-gray-200 hover:border-blue-300'
                            }
                          `}
                        >
                          <div className="text-lg mb-1">{moodOption.emoji}</div>
                          <div>{moodOption.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {checkInType === 'end' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Clock className="inline h-4 w-4 mr-1" />
                        学习时长 (小时) *
                      </label>
                      <input
                        type="number"
                        value={studyHours || ''}
                        onChange={(e) => setStudyHours(Number(e.target.value))}
                        min="0"
                        step="0.5"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="例如：2.5"
                        required
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <MapPin className="inline h-4 w-4 mr-1" />
                      学习地点
                    </label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="例如：图书馆、宿舍、咖啡厅"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {isSubmitting ? '提交中...' : '提交打卡'}
                  </button>
                </form>
              )}
            </div>
          </div>
        ) : (
          /* 学习管理内容 */
            <div className="bg-white rounded-xl shadow-sm p-6">
            {/* 子标签页导航 */}
            <div className="flex justify-center mb-6">
              <div className="bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setStudySubTab('tasks')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    studySubTab === 'tasks' 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  任务管理
                </button>
                <button
                  onClick={() => setStudySubTab('calendar')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    studySubTab === 'calendar' 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  学习记录
                </button>
              </div>
            </div>

            {studySubTab === 'tasks' ? (
              <TaskManagement
                tasks={tasks}
                loading={loading}
                onCreateTask={() => setShowCreateModal(true)}
                onUpdateTask={fetchTasks}
              />
            ) : (
              <CalendarView
                calendarData={calendarData}
                isLoading={isLoadingCalendar}
                currentMonth={currentMonth}
                onMonthChange={setCurrentMonth}
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
                showDateDetail={showDateDetail}
                onShowDetailChange={setShowDateDetail}
              />
            )}
          </div>
        )}

        {/* 创建任务模态框 */}
        {showCreateModal && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">创建新任务</h3>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">任务标题 *</label>
                    <input
                      type="text"
                      value={newTask.title}
                      onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="例如：背诵英语单词"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">任务描述</label>
                    <textarea
                      value={newTask.description}
                      onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="详细描述任务内容..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">任务类型</label>
                    <select
                      value={newTask.taskType}
                      onChange={(e) => setNewTask(prev => ({ ...prev, taskType: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="count">计数任务（如背单词、做题）</option>
                      <option value="duration">时长任务（如看视频、复习）</option>
                      <option value="progress">进度任务（如完成章节）</option>
                    </select>
                  </div>
                  
                  {newTask.taskType === 'count' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">目标总数</label>
                        <input
                          type="number"
                          value={newTask.targetCount}
                          onChange={(e) => setNewTask(prev => ({ ...prev, targetCount: Number(e.target.value) }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">每日目标</label>
                        <input
                          type="number"
                          value={newTask.dailyTarget}
                          onChange={(e) => setNewTask(prev => ({ ...prev, dailyTarget: Number(e.target.value) }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  )}
                  
                  {newTask.taskType === 'duration' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">目标时长(分钟)</label>
                        <input
                          type="number"
                          value={newTask.targetDuration}
                          onChange={(e) => setNewTask(prev => ({ ...prev, targetDuration: Number(e.target.value) }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">每日时长(分钟)</label>
                        <input
                          type="number"
                          value={newTask.dailyDuration}
                          onChange={(e) => setNewTask(prev => ({ ...prev, dailyDuration: Number(e.target.value) }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  )}
                  
                  {newTask.taskType === 'progress' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">计划天数</label>
                      <input
                        type="number"
                        value={newTask.totalDays}
                        onChange={(e) => setNewTask(prev => ({ ...prev, totalDays: Number(e.target.value) }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  )}
                </div>
                
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={createTask}
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? '创建中...' : '创建任务'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

// 任务管理组件

const TaskManagement: React.FC<TaskManagementProps> = ({ tasks, loading, onCreateTask, onUpdateTask }) => {
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);

  const getTaskCompletionRate = (task: Task): number => {
    if (task.taskType === 'count' && task.targetCount && task.currentCount !== undefined) {
      return Math.min((task.currentCount / task.targetCount) * 100, 100);
    } else if (task.taskType === 'duration' && task.targetDuration && task.currentDuration !== undefined) {
      return Math.min((task.currentDuration / task.targetDuration) * 100, 100);
    } else if (task.taskType === 'progress' && task.progress !== undefined) {
      return task.progress;
    }
    return 0;
  };

  const formatTaskProgress = (task: Task): string => {
    if (task.taskType === 'count' && task.currentCount !== undefined && task.targetCount) {
      return `${task.currentCount}/${task.targetCount} ${task.unit || '个'}`;
    } else if (task.taskType === 'duration' && task.currentDuration !== undefined && task.targetDuration) {
      const current = Math.floor(task.currentDuration / 60);
      const target = Math.floor(task.targetDuration / 60);
      return `${current}/${target} 小时`;
    } else if (task.taskType === 'progress' && task.progress !== undefined) {
      return `${task.progress}%`;
    }
    return '0%';
  };

  const updateTaskValue = async (taskId: string, newValue: number, taskType: string) => {
    try {
      const updateData: any = {};
      
      if (taskType === 'count') {
        updateData.currentCount = newValue;
      } else if (taskType === 'duration') {
        updateData.currentDuration = newValue;
      } else if (taskType === 'progress') {
        updateData.progress = Math.min(Math.max(newValue, 0), 100);
      }

      const response = await api.put(`/tasks/${taskId}`, updateData);
      
      if (response.data?.success) {
        toast.success('任务进度已更新');
        onUpdateTask();
      }
    } catch (error: any) {
      toast.error('更新失败：' + (error.response?.data?.message || '未知错误'));
    }
    setEditingTask(null);
  };

  const deleteTask = async (taskId: string) => {
    if (!window.confirm('确定要删除这个任务吗？')) return;
    
    try {
      const response = await api.delete(`/tasks/${taskId}`);
      if (response.data?.success) {
        toast.success('任务已删除');
        onUpdateTask();
      }
    } catch (error: any) {
      toast.error('删除失败：' + (error.response?.data?.message || '未知错误'));
    }
  };

  const toggleTaskCompletion = async (taskId: string, currentStatus: boolean) => {
    try {
      const response = await api.put(`/tasks/${taskId}`, {
        isCompleted: !currentStatus
      });
      
      if (response.data?.success) {
        toast.success(currentStatus ? '任务已标记为未完成' : '任务已完成！');
        onUpdateTask();
      }
    } catch (error: any) {
      toast.error('更新失败：' + (error.response?.data?.message || '未知错误'));
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8">
        <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">暂无学习计划</h3>
        <p className="text-gray-500 mb-6">开始创建您的第一个学习计划吧</p>
        <button
          onClick={onCreateTask}
          className="flex items-center mx-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          创建计划
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800">任务管理</h2>
        <button
          onClick={onCreateTask}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          创建任务
        </button>
      </div>

      <div className="space-y-4">
        {tasks.map((task) => {
          const completionRate = getTaskCompletionRate(task);
          const progressText = formatTaskProgress(task);
          
          return (
            <motion.div
              key={task.id}
              className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
              whileHover={{ y: -2 }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <button
                      onClick={() => toggleTaskCompletion(task.id, task.isCompleted)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        task.isCompleted
                          ? 'bg-green-500 border-green-500 text-white'
                          : 'border-gray-300 hover:border-green-400'
                      }`}
                    >
                      {task.isCompleted && <CheckCircle className="w-3 h-3" />}
                    </button>
                    
                    <h3 className={`font-medium ${task.isCompleted ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                      {task.title}
                    </h3>
                    
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      task.taskType === 'count' ? 'bg-blue-100 text-blue-700' :
                      task.taskType === 'duration' ? 'bg-green-100 text-green-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {task.taskType === 'count' ? '计数任务' :
                       task.taskType === 'duration' ? '时长任务' : '进度任务'}
                    </span>
                  </div>
                  
                  {task.description && (
                    <p className="text-gray-600 text-sm mb-3">{task.description}</p>
                  )}
                  
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">进度</span>
                        <span className="font-medium">{progressText}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${completionRate}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 可编辑的进度值 */}
                  <div className="flex items-center gap-2 mb-2">
                    {editingTask === task.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(Number(e.target.value))}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                          min="0"
                          max={task.taskType === 'progress' ? 100 : undefined}
                        />
                        <button
                          onClick={() => updateTaskValue(task.id, editValue, task.taskType || 'count')}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingTask(null)}
                          className="p-1 text-gray-400 hover:bg-gray-50 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingTask(task.id);
                          if (task.taskType === 'count') {
                            setEditValue(task.currentCount || 0);
                          } else if (task.taskType === 'duration') {
                            setEditValue(task.currentDuration || 0);
                          } else {
                            setEditValue(task.progress || 0);
                          }
                        }}
                        className="flex items-center gap-1 px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Edit className="w-3 h-3" />
                        更新进度
                      </button>
              )}
            </div>
          </div>

                <button
                  onClick={() => deleteTask(task.id)}
                  className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
        </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

// 日历组件

const CalendarView: React.FC<CalendarViewProps> = ({
  calendarData,
  isLoading,
  currentMonth,
  onMonthChange,
  selectedDate,
  onDateSelect,
  showDateDetail,
  onShowDetailChange
}) => {
  const getCheckInStatus = (date: string) => {
    const checkIns = calendarData[date] || [];
    const hasStart = checkIns.some(c => c.type === 'start');
    const hasEnd = checkIns.some(c => c.type === 'end');
    const hasProgress = checkIns.some(c => c.type === 'progress');
    
    // 有开始和结束就是完整打卡
    if (hasStart && hasEnd) return 'complete';
    // 只要有任何打卡记录就是部分打卡
    if (hasStart || hasEnd || hasProgress) return 'partial';
    return 'none';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete': return 'bg-green-500';
      case 'partial': return 'bg-yellow-400';
      default: return 'bg-white hover:bg-gray-50';
    }
  };

  const getTextColor = (status: string, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return 'text-gray-400';
    switch (status) {
      case 'complete': return 'text-white font-semibold';
      case 'partial': return 'text-white font-semibold';
      default: return 'text-gray-700';
    }
  };

  const handleDateClick = (date: string) => {
    console.log('点击日期:', date);
    console.log('该日期的打卡记录:', calendarData[date]);
    onDateSelect(date);
    onShowDetailChange(true);
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    const endDate = new Date(lastDay);
    
    // 调整到周一开始
    startDate.setDate(startDate.getDate() - ((startDate.getDay() + 6) % 7));
    endDate.setDate(endDate.getDate() + (6 - ((endDate.getDay() + 6) % 7)));
    
    const days = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      // 使用标准的YYYY-MM-DD格式，与后端数据保持一致
      const dateString = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
      days.push({
        date: new Date(current),
        dateString: dateString,
        isCurrentMonth: current.getMonth() === month,
        isToday: current.toDateString() === new Date().toDateString()
      });
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  const nextMonth = () => {
    onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToToday = () => {
    onMonthChange(new Date());
  };

  const getMonthStats = () => {
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    
    let completeCount = 0;
    let partialCount = 0;
    let totalCheckIns = 0;
    
    Object.entries(calendarData).forEach(([dateStr, checkIns]) => {
      const date = new Date(dateStr);
      if (date >= monthStart && date <= monthEnd) {
        const status = getCheckInStatus(dateStr);
        if (status === 'complete') completeCount++;
        else if (status === 'partial') partialCount++;
        totalCheckIns += checkIns.length;
      }
    });
    
    return { completeCount, partialCount, totalCheckIns };
  };

  const days = getDaysInMonth(currentMonth);
  const monthStats = getMonthStats();
  const weekDays = ['一', '二', '三', '四', '五', '六', '日'];

  return (
          <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800">学习记录日历</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
          >
            今天
          </button>
        </div>
      </div>

      {/* 月份统计 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{monthStats.completeCount}</div>
          <div className="text-sm text-green-700">完整打卡天数</div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">{monthStats.partialCount}</div>
          <div className="text-sm text-yellow-700">部分打卡天数</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{monthStats.totalCheckIns}</div>
          <div className="text-sm text-blue-700">总打卡次数</div>
        </div>
      </div>

      {/* 月份导航 */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h3 className="text-lg font-semibold">
          {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
        </h3>
        <button
          onClick={nextMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : (
        <>
          {/* 日历网格 */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="grid grid-cols-7 gap-px bg-gray-200">
              {/* 星期标题 */}
              {weekDays.map((day) => (
                <div key={day} className="bg-gray-50 p-3 text-center text-sm font-medium text-gray-700">
                  {day}
                </div>
              ))}
              
              {/* 日期格子 */}
              {days.map(({ date, dateString, isCurrentMonth, isToday }) => {
                const checkIns = calendarData[dateString] || [];
                const status = getCheckInStatus(dateString);
                
                // 调试信息：只显示有打卡记录的日期
                if (checkIns.length > 0) {
                  console.log(`日期 ${dateString}(${date.getDate()}号) 有 ${checkIns.length} 条打卡记录`, 
                    '类型:', checkIns.map(c => c.type).join(','), 
                    '状态:', status);
                }
                
                return (
                  <motion.div
                    key={dateString}
                    className={`
                      calendar-day relative h-16 p-2 cursor-pointer border border-transparent
                      ${isCurrentMonth ? '' : 'bg-gray-50'}
                      ${isToday ? 'ring-2 ring-blue-500' : ''}
                      ${getStatusColor(status)}
                      transition-all duration-200
                    `}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleDateClick(dateString)}
                  >
                    <div className={`text-sm font-medium ${getTextColor(status, isCurrentMonth)}`}>
                      {date.getDate()}
                    </div>
                    
                    {checkIns.length > 0 && (
                      <div className={`
                        check-in-indicator absolute bottom-1 right-1 w-2 h-2 rounded-full
                        ${status === 'complete' ? 'bg-white' : 
                          status === 'partial' ? 'bg-white' : 'bg-blue-500'}
                      `} />
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* 图例 */}
          <div className="flex items-center justify-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span>完整打卡</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-400 rounded"></div>
              <span>部分打卡</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-white border border-gray-300 rounded"></div>
              <span>未打卡</span>
            </div>
          </div>
        </>
      )}

      {/* 日期详情模态框 */}
      {showDateDetail && selectedDate && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => onShowDetailChange(false)}
        >
          <motion.div
            className="bg-white rounded-lg max-w-md w-full max-h-96 overflow-y-auto"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  {new Date(selectedDate).toLocaleDateString('zh-CN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </h3>
                <button
                  onClick={() => onShowDetailChange(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-3">
                {(calendarData[selectedDate] || []).length > 0 ? (
                  (calendarData[selectedDate] || []).map((checkIn, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          checkIn.type === 'start' ? 'bg-green-100 text-green-700' :
                          checkIn.type === 'progress' ? 'bg-blue-100 text-blue-700' :
                          'bg-purple-100 text-purple-700'
                        }`}>
                          {checkIn.type === 'start' ? '开始学习' : 
                           checkIn.type === 'progress' ? '学习进度' : '结束学习'}
                        </span>
                        <span className="text-sm text-gray-500">
                          {new Date(checkIn.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-sm text-gray-700">{checkIn.content}</p>
                        
                        <div className="flex flex-wrap gap-3 text-xs">
                          {checkIn.mood && (
                            <div className="flex items-center gap-1 text-gray-500">
                              <Heart className="w-3 h-3" />
                              <span>心情：{checkIn.mood}</span>
                            </div>
                          )}
                          
                          {checkIn.location && (
                            <div className="flex items-center gap-1 text-gray-500">
                              <MapPin className="w-3 h-3" />
                              <span>地点：{checkIn.location}</span>
                            </div>
                          )}
                          
                          {checkIn.studyHours && (
                            <div className="flex items-center gap-1 text-gray-500">
                              <Clock className="w-3 h-3" />
                              <span>时长：{checkIn.studyHours}小时</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
              ) : (
                  <div className="text-center py-4 text-gray-500">
                    这一天没有打卡记录
                </div>
              )}
            </div>
          </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default CheckIn;