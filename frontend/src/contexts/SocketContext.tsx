import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinGroup: (groupId: string) => void;
  leaveGroup: (groupId: string) => void;
  sendMessage: (groupId: string, content: string) => void;
  onlineUsers: string[];
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const { token, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && token) {
      // 创建Socket连接
      const socketUrl = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';
      const newSocket = io(socketUrl, {
        auth: {
          token,
        },
        autoConnect: true,
      });

      newSocket.on('connect', () => {
        console.log('Socket已连接');
        setIsConnected(true);
      });

      newSocket.on('disconnect', () => {
        console.log('Socket已断开');
        setIsConnected(false);
      });

      newSocket.on('user:online', (data) => {
        setOnlineUsers(prev => [...prev, data.userId]);
      });

      newSocket.on('user:offline', (data) => {
        setOnlineUsers(prev => prev.filter(id => id !== data.userId));
      });

      newSocket.on('error', (error) => {
        console.error('Socket错误:', error);
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    } else {
      // 未认证时断开连接
      if (socket) {
        socket.close();
        setSocket(null);
        setIsConnected(false);
      }
    }
  }, [isAuthenticated, token]);

  const joinGroup = (groupId: string) => {
    if (socket) {
      socket.emit('group:join', { groupId });
    }
  };

  const leaveGroup = (groupId: string) => {
    if (socket) {
      socket.emit('group:leave', { groupId });
    }
  };

  const sendMessage = (groupId: string, content: string) => {
    if (socket) {
      socket.emit('group:message', { groupId, content });
    }
  };

  const value: SocketContextType = {
    socket,
    isConnected,
    joinGroup,
    leaveGroup,
    sendMessage,
    onlineUsers,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}; 