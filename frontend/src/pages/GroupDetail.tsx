import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Send, Calendar, User, Clock, Crown, Paperclip, Image, Download, X, Upload, Maximize, Minimize } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  content: string;
  type: 'text' | 'image' | 'file';
  createdAt: string;
  senderId: string;
  userId?: string; // 向后兼容
  sender?: {
    id: string;
    username: string;
    nickname?: string;
    avatar?: string;
  };
  user?: {
    id: string;
    username: string;
    nickname?: string;
    avatar?: string;
  };
}

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
  members: GroupMember[];
  _count?: {
    members: number;
  };
}

interface FilePreview {
  url: string;
  name: string;
  type: 'image' | 'file';
}

interface FileInfo {
  url: string;
  name: string;
  size?: number;
  originalname?: string;
  type?: string;
  mimetype?: string;
}

const GroupDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'chat' | 'members'>('chat');
  const [uploading, setUploading] = useState(false);
  const [showFileMenu, setShowFileMenu] = useState(false);
  const [preview, setPreview] = useState<FilePreview | null>(null);
  const [dragActive, setDragActive] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchGroupDetails();
    fetchMessages();
    
    // 添加全局拖放事件监听器，防止浏览器默认行为
    const preventDefaults = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    
    document.addEventListener('dragover', preventDefaults);
    document.addEventListener('drop', preventDefaults);
    
    return () => {
      document.removeEventListener('dragover', preventDefaults);
      document.removeEventListener('drop', preventDefaults);
    };
  }, [id]);

  useEffect(() => {
    // 滚动到消息底部
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // 点击外部关闭文件菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showFileMenu) {
        setShowFileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFileMenu]);

  // 添加剪贴板粘贴处理
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      // 确保焦点在消息输入框时才处理粘贴事件
      if (document.activeElement !== messageInputRef.current) return;
      
      if (e.clipboardData) {
        // 检查是否粘贴图片
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            e.preventDefault();
            const file = items[i].getAsFile();
            if (file) {
              toast.success('检测到图片，正在上传...');
              uploadAndSendFile(file, 'image');
              return;
            }
          }
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, []);

  // 添加拖放处理
  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(true);
      console.log('文件进入拖放区域');
    };
    
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    
    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      // 检查是否真的离开了容器
      // 使用relatedTarget可能不可靠，因为事件冒泡的问题
      const rect = chatContainerRef.current?.getBoundingClientRect();
      if (rect) {
        const { left, top, right, bottom } = rect;
        const { clientX, clientY } = e;
        if (clientX < left || clientX > right || clientY < top || clientY > bottom) {
          setDragActive(false);
          console.log('文件离开拖放区域');
        }
      }
    };
    
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      
      console.log('文件被放入区域', e.dataTransfer?.files);
      
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        console.log('接收到文件:', file.name, file.type, file.size);
        
        // 替换为直接调用文件上传处理
        if (file.type.startsWith('image/')) {
          toast.success(`检测到图片: ${file.name}`);
          uploadAndSendFile(file, 'image');
        } else {
          toast.success(`检测到文件: ${file.name}`);
          uploadAndSendFile(file, 'file');
        }
      }
    };
    
    const chatContainer = chatContainerRef.current;
    if (chatContainer) {
      console.log('设置拖放事件监听');
      
      chatContainer.addEventListener('dragenter', handleDragEnter);
      chatContainer.addEventListener('dragover', handleDragOver);
      chatContainer.addEventListener('dragleave', handleDragLeave);
      chatContainer.addEventListener('drop', handleDrop);
      
      return () => {
        chatContainer.removeEventListener('dragenter', handleDragEnter);
        chatContainer.removeEventListener('dragover', handleDragOver);
        chatContainer.removeEventListener('dragleave', handleDragLeave);
        chatContainer.removeEventListener('drop', handleDrop);
      };
    }
  }, []);

  const fetchGroupDetails = async () => {
    try {
      const response = await api.get(`/groups/${id}`);
      if (response.data && response.data.data) {
        setGroup(response.data.data);
      } else {
        console.error('API返回的小组详情数据格式不正确:', response.data);
        toast.error('获取小组详情失败');
        navigate('/groups');
      }
    } catch (error: any) {
      console.error('获取小组详情失败:', error);
      toast.error(error.response?.data?.message || '获取小组详情失败');
      navigate('/groups');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await api.get(`/groups/${id}/messages`);
      if (response.data && response.data.data) {
        setMessages(response.data.data);
      } else {
        console.error('API返回的消息数据格式不正确:', response.data);
        setMessages([]);
      }
    } catch (error: any) {
      console.error('获取消息失败:', error);
      toast.error(error.response?.data?.message || '获取消息失败');
      setMessages([]);
    }
  };

  const handleSendMessage = async (e: React.FormEvent, messageType: 'text' | 'image' | 'file' = 'text', fileInfo?: any) => {
    e.preventDefault();
    if (!newMessage.trim() && messageType === 'text') return;

    try {
      let messageData: any = {};

      // 根据消息类型处理
      if (messageType === 'text') {
        messageData = {
          content: newMessage,
          type: 'text'
        };
      } else if (messageType === 'image' || messageType === 'file') {
        // 确保fileInfo有效
        if (!fileInfo || !fileInfo.url) {
          toast.error('文件信息无效，无法发送');
          return;
        }

        // 构建文件消息
        const fileData: FileInfo = {
          url: fileInfo.url,
          name: fileInfo.originalname || fileInfo.name || '文件',
          size: fileInfo.size || 0
        };

        console.log('发送文件消息:', messageType, fileData);

        messageData = {
          content: JSON.stringify(fileData),  // 将文件信息序列化为JSON字符串
          type: messageType,
        };
      }

      console.log('发送消息数据:', messageData);
      const response = await api.post(`/groups/${id}/messages`, messageData);
      
      if (response.data && response.data.data) {
        // 确保消息数据正确
        const newMessageData = response.data.data;
        if (!newMessageData.sender && !newMessageData.user && user) {
          // 如果返回的消息数据中没有用户信息，手动添加
          newMessageData.sender = {
            id: user.id,
            username: user.username,
            nickname: user.nickname
          };
        }
        console.log('消息发送成功:', newMessageData);
        
        // 确保正确解析刚发送的消息内容
        if (messageType === 'image' || messageType === 'file') {
          try {
            // 尝试解析消息内容
            const contentObj = JSON.parse(newMessageData.content);
            if (!contentObj.url) {
              // 如果格式不正确，修复消息内容
              newMessageData.content = JSON.stringify({
                url: fileInfo.url,
                name: fileInfo.originalname || fileInfo.name || '文件',
                size: fileInfo.size || 0
              });
            }
          } catch (err) {
            // 如果解析失败，确保消息内容是有效的JSON字符串
            newMessageData.content = JSON.stringify({
              url: fileInfo.url, 
              name: fileInfo.originalname || fileInfo.name || '文件',
              size: fileInfo.size || 0
            });
          }
        }
        
        setMessages(prevMessages => [...prevMessages, newMessageData]);
        setNewMessage('');
        setShowFileMenu(false);
      } else {
        console.error('发送消息响应格式不正确:', response.data);
        toast.error('发送消息失败，但已尝试发送');
      }
    } catch (error: any) {
      console.error('发送消息失败:', error);
      toast.error(error.response?.data?.message || '发送消息失败');
    }
  };

  const uploadAndSendFile = async (file: File, type: 'image' | 'file') => {
    if (!file) return;

    setUploading(true);
    try {
      console.log(`正在上传${type === 'image' ? '图片' : '文件'}:`, file.name);
      const formData = new FormData();
      formData.append('file', file);

      // 显示上传中提示
      toast.loading(`正在上传${file.name}...`, { id: 'upload' });

      const response = await api.post('/upload/file', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.dismiss('upload');
      
      if (response.data && response.data.data) {
        const fileInfo = response.data.data;
        console.log('文件上传成功:', fileInfo);
        
        const event = new Event('submit') as any;
        event.preventDefault = () => {};
        
        // 自动发送文件消息
        await handleSendMessage(event, type, fileInfo);
        toast.success(`${type === 'image' ? '图片' : '文件'}上传成功`);
      }
    } catch (error: any) {
      toast.dismiss('upload');
      console.error('文件上传失败:', error);
      toast.error(error.response?.data?.message || '文件上传失败');
    } finally {
      setUploading(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadAndSendFile(file, 'image');
    }
    e.target.value = '';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadAndSendFile(file, 'file');
    }
    e.target.value = '';
  };

  // 处理预览
  const handlePreview = (url: string, name: string, type: 'image' | 'file') => {
    setPreview({ url, name, type });
  };

  // 添加辅助函数用于安全解析文件信息
  const parseFileInfo = (content: string): FileInfo | null => {
    console.log('解析文件信息, 原始内容:', content);
    
    try {
      const fileInfo = JSON.parse(content);
      console.log('JSON解析成功:', fileInfo);
      
      // 检查是否是双重编码的情况（url字段包含JSON字符串）
      if (fileInfo && typeof fileInfo === 'object' && fileInfo.url) {
        let actualUrl = fileInfo.url;
        let actualName = fileInfo.name || fileInfo.originalname || '文件';
        let actualSize = fileInfo.size || 0;
        
        // 如果url字段本身是一个JSON字符串，尝试解析它
        if (typeof actualUrl === 'string' && actualUrl.startsWith('{')) {
          try {
            const nestedFileInfo = JSON.parse(actualUrl);
            console.log('检测到嵌套JSON，解析结果:', nestedFileInfo);
            if (nestedFileInfo.url) {
              actualUrl = nestedFileInfo.url;
              actualName = nestedFileInfo.name || actualName;
              actualSize = nestedFileInfo.size || actualSize;
            }
          } catch (nestedError) {
            console.warn('嵌套JSON解析失败，使用原始值:', nestedError);
          }
        }
        
        const result = {
          url: actualUrl,
          name: actualName,
          size: actualSize,
          type: fileInfo.type || fileInfo.mimetype,
          originalname: fileInfo.originalname
        };
        console.log('文件信息解析结果:', result);
        return result;
      }
      
      // 如果不是有效的文件信息对象但有url字符串，尝试构造一个
      if (typeof content === 'string' && content.startsWith('http')) {
        console.log('直接使用URL作为文件信息');
        return {
          url: content,
          name: '文件',
          size: 0
        };
      }
      
      console.error('无效的文件信息格式:', fileInfo);
      return null;
    } catch (error) {
      console.error('JSON解析失败:', error, '原始内容:', content);
      
      // 尝试检查内容是否直接是URL
      if (typeof content === 'string' && (content.startsWith('http') || content.startsWith('/'))) {
        console.log('作为URL直接使用');
        return {
          url: content,
          name: '文件',
          size: 0
        };
      }
      
      return null;
    }
  };

  // 渲染消息内容
  const renderMessageContent = (message: Message) => {
    if (message.type === 'text') {
      return <p className="break-words">{message.content}</p>;
    }

    // 处理图片和文件消息
    try {
      console.log('渲染消息:', message.type, '内容:', message.content);
      
      // 使用parseFileInfo解析消息内容
      const fileInfo = parseFileInfo(message.content);
      
      // 如果解析失败，显示错误消息
      if (!fileInfo) {
        console.error('无法解析文件信息:', message);
        return (
          <div className="p-2 bg-red-50 rounded border border-red-200">
            <p className="text-red-600 text-sm">文件信息无效</p>
            <p className="text-xs text-gray-500 mt-1">原始内容: {message.content}</p>
          </div>
        );
      }

      if (message.type === 'image') {
        console.log('显示图片:', fileInfo);
        
        // 确保图片URL是绝对路径
        let imageUrl = fileInfo.url;
        if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
          // 如果是相对路径，添加后端服务器地址
          const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
          imageUrl = `${baseUrl}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
        }
        
        console.log('最终图片URL:', imageUrl);
        
        return (
          <div className="max-w-xs">
            <img
              src={imageUrl}
              alt={fileInfo.name || '图片'}
              className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => handlePreview(imageUrl, fileInfo.name || '图片', 'image')}
              onError={(e) => {
                console.error('图片加载失败:', imageUrl);
                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/200x150?text=图片加载失败';
              }}
              onLoad={() => {
                console.log('图片加载成功:', imageUrl);
              }}
            />
            <p className="text-xs text-gray-500 mt-1">{fileInfo.name || '图片'}</p>
          </div>
        );
      }

      if (message.type === 'file') {
        const formatFileSize = (bytes: number) => {
          if (!bytes || bytes === 0) return '未知大小';
          const k = 1024;
          const sizes = ['Bytes', 'KB', 'MB', 'GB'];
          const i = Math.floor(Math.log(bytes) / Math.log(k));
          return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };

        return (
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg max-w-xs">
            <div className="flex-shrink-0">
              <Paperclip className="h-8 w-8 text-gray-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{fileInfo.name || '文件'}</p>
              <p className="text-xs text-gray-500">{formatFileSize(fileInfo.size || 0)}</p>
            </div>
            <div className="flex-shrink-0 flex space-x-2">
              <button
                onClick={() => handlePreview(fileInfo.url, fileInfo.name || '文件', 'file')}
                className="text-green-600 hover:text-green-800 transition-colors"
                title="预览"
              >
                <Maximize className="h-5 w-5" />
              </button>
              <button
                onClick={() => window.open(fileInfo.url, '_blank')}
                className="text-blue-600 hover:text-blue-800 transition-colors"
                title="下载"
              >
                <Download className="h-5 w-5" />
              </button>
            </div>
          </div>
        );
      }
    } catch (error) {
      console.error('渲染文件消息失败:', error, message);
      return <p className="text-red-500">文件信息错误</p>;
    }

    // 默认显示消息内容
    return <p className="break-words">{message.content}</p>;
  };

  // 安全地获取管理员信息
  const getAdminInfo = () => {
    const adminMember = group?.members?.find(m => m.role === 'admin');
    if (!adminMember || !adminMember.user) {
      return '未知';
    }
    return adminMember.user.nickname || adminMember.user.username || '未知';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-4xl mx-auto text-center py-12">
          <h1 className="text-2xl font-bold text-red-600 mb-4">小组不存在或您没有权限访问</h1>
          <button 
            onClick={() => navigate('/groups')}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            返回小组列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* 头部 */}
        <div className="mb-6">
          <button 
            onClick={() => navigate('/groups')}
            className="text-gray-600 hover:text-gray-900 flex items-center mb-4"
          >
            <ArrowLeft className="mr-1" size={16} />
            返回小组列表
          </button>
          
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">{group?.name}</h1>
            <p className="text-gray-600 mb-4">{group?.description}</p>
            
            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Users size={16} />
                <span>{group?._count?.members || group?.members?.length || 0}/{group?.maxMembers || 0} 成员</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar size={16} />
                <span>创建于 {group?.createdAt ? new Date(group.createdAt).toLocaleDateString() : '未知'}</span>
              </div>
              <div className="flex items-center gap-1">
                <User size={16} />
                <span>管理员: {getAdminInfo()}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* 标签切换 */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('chat')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'chat'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                聊天室
              </button>
              <button
                onClick={() => setActiveTab('members')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'members'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                成员列表 ({group?._count?.members || group?.members?.length || 0})
              </button>
            </nav>
          </div>
        </div>
        
        {/* 聊天内容 */}
        {activeTab === 'chat' && (
          <div 
            className="bg-white rounded-xl shadow-lg overflow-hidden relative" 
            ref={chatContainerRef}
            style={{ minHeight: '400px' }}
          >
            {/* 文件拖拽覆盖层 */}
            {dragActive && (
              <div className="absolute inset-0 bg-indigo-600 bg-opacity-30 backdrop-blur-sm z-50 rounded-xl flex items-center justify-center">
                <div className="bg-white p-6 rounded-lg shadow-lg text-center">
                  <Upload size={48} className="mx-auto mb-4 text-indigo-600" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">拖放文件以上传</h3>
                  <p className="text-gray-600">释放鼠标按钮上传文件</p>
                </div>
              </div>
            )}

            <div className="h-96 overflow-y-auto p-4" ref={messagesContainerRef}>
              {!messages || messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <Users size={48} className="mb-2" />
                  <p>还没有消息，开始聊天吧！</p>
                  <p className="text-sm mt-2">支持剪贴板粘贴图片和拖拽上传文件</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => {
                    // 兼容新旧字段格式
                    const messageUserId = message.senderId || message.userId;
                    const messageUser = message.sender || message.user;
                    
                    return (
                      <div key={message.id} className={`flex ${messageUserId === user?.id ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs lg:max-w-md rounded-lg p-3 ${
                          messageUserId === user?.id 
                            ? 'bg-indigo-100 text-indigo-900' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          <div className="flex items-center mb-1">
                            <span className="font-medium text-xs">
                              {messageUser?.nickname || messageUser?.username || '未知用户'}
                            </span>
                            <span className="text-xs text-gray-500 ml-2">
                              {message.createdAt ? new Date(message.createdAt).toLocaleTimeString() : ''}
                            </span>
                          </div>
                          {renderMessageContent(message)}
                        </div>
                      </div>
                                         );
                   })}
                  </div>
              )}
            </div>
            
            <div className="border-t p-4">
              <div className="relative">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      ref={messageInputRef}
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="输入消息... (支持粘贴图片和拖拽文件)"
                      className="w-full px-3 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      disabled={uploading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowFileMenu(!showFileMenu)}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      disabled={uploading}
                    >
                      <Paperclip size={20} />
                    </button>
                  </div>
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || uploading}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    {uploading ? (
                      <>
                        <Upload size={16} className="animate-spin" />
                        上传中
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        发送
                      </>
                    )}
                  </button>
                </form>

                {/* 文件上传菜单 */}
                {showFileMenu && (
                  <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-10">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          imageInputRef.current?.click();
                          setShowFileMenu(false);
                        }}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        disabled={uploading}
                      >
                        <Image size={16} className="text-green-600" />
                        图片
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          fileInputRef.current?.click();
                          setShowFileMenu(false);
                        }}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        disabled={uploading}
                      >
                        <Paperclip size={16} className="text-blue-600" />
                        文件
                      </button>
                    </div>
                  </div>
                )}

                {/* 隐藏的文件输入框 */}
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                  disabled={uploading}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={uploading}
                />
              </div>
            </div>
          </div>
        )}
        
        {/* 成员列表 */}
        {activeTab === 'members' && group?.members && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-4">
              <div className="grid gap-2">
                {group.members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="h-10 w-10 bg-indigo-600 rounded-full flex items-center justify-center text-white mr-3">
                        {member.user?.nickname?.[0] || member.user?.username?.[0] || '?'}
                      </div>
                      <div>
                        <p className="font-medium">{member.user?.nickname || member.user?.username || '未知用户'}</p>
                        <div className="flex items-center text-xs text-gray-500">
                          <Clock size={12} className="mr-1" />
                          <span>加入于 {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : '未知'}</span>
                        </div>
                      </div>
                    </div>
                    {member.role === 'admin' && (
                      <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full flex items-center">
                        <Crown size={12} className="mr-1" />
                        管理员
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 文件/图片预览模态框 */}
        {preview && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 truncate">{preview.name}</h3>
                <button 
                  onClick={() => setPreview(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
                {preview.type === 'image' ? (
                  <img 
                    src={preview.url} 
                    alt={preview.name}
                    className="max-w-full max-h-[70vh] object-contain" 
                    onError={(e) => {
                      console.error('预览图片加载失败:', preview.url);
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=图片加载失败';
                    }}
                  />
                ) : (
                  <div className="w-full h-full">
                    {/* 检查文件是否是PDF，如果是则直接嵌入 */}
                    {preview.url.toLowerCase().endsWith('.pdf') ? (
                      <iframe 
                        src={preview.url} 
                        className="w-full h-[70vh]"
                        title={preview.name}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full">
                        <Paperclip size={64} className="text-gray-400 mb-4" />
                        <p className="text-center text-gray-800 font-medium mb-2">{preview.name}</p>
                        <p className="text-gray-500 mb-4">此文件类型不支持预览</p>
                        <button
                          onClick={() => window.open(preview.url, '_blank')}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                          <Download size={16} />
                          下载文件
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="p-4 border-t flex justify-end space-x-4">
                <button
                  onClick={() => window.open(preview.url, '_blank')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Download size={16} />
                  {preview.type === 'image' ? '下载图片' : '下载文件'}
                </button>
                <button
                  onClick={() => setPreview(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupDetail; 