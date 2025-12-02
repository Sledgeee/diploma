import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAppSelector } from '@/store/hooks';
import { toast } from 'sonner';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:8000/api';

interface Notification {
  type: 'loan-reminder' | 'overdue' | 'fine' | 'reservation-ready' | 'reservation-expired' | 'system' | 'new-book';
  title: string;
  message: string;
  timestamp: Date;
  severity?: 'info' | 'success' | 'warning' | 'error';
  bookTitle?: string;
  amount?: number;
  dueDate?: Date;
  expiryDate?: Date;
  daysOverdue?: number;
  author?: string;
}

export function useNotifications() {
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      // Якщо не авторизовані, відключаємо сокет
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setConnected(false);
      }
      return;
    }

    // Створюємо підключення
    const newSocket = io(`${WS_URL}/notifications`, {
      auth: {
        userId: user.id,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    // Обробники подій
    newSocket.on('connect', () => {
      console.log('✅ WebSocket connected');
      setConnected(true);
      
      // Реєструємо користувача
      newSocket.emit('register', { userId: user.id });
    });

    newSocket.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
      setConnected(false);
    });

    newSocket.on('connected', (data) => {
      console.log('📡 Connected to notifications:', data);
    });

    newSocket.on('registered', (data) => {
      console.log('📝 Registered:', data);
    });

    // Обробники сповіщень
    newSocket.on('loan-reminder', (notification: Notification) => {
      console.log('📚 Loan reminder:', notification);
      setNotifications((prev) => [notification, ...prev]);
      
      toast.warning(notification.title, {
        description: notification.message,
        duration: 5000,
      });
    });

    newSocket.on('overdue-notification', (notification: Notification) => {
      console.log('⚠️ Overdue notification:', notification);
      setNotifications((prev) => [notification, ...prev]);
      
      toast.error(notification.title, {
        description: notification.message,
        duration: 7000,
      });
    });

    newSocket.on('fine-notification', (notification: Notification) => {
      console.log('💰 Fine notification:', notification);
      setNotifications((prev) => [notification, ...prev]);
      
      toast.error(notification.title, {
        description: notification.message,
        duration: 6000,
      });
    });

    newSocket.on('reservation-ready', (notification: Notification) => {
      console.log('✅ Reservation ready:', notification);
      setNotifications((prev) => [notification, ...prev]);
      
      toast.success(notification.title, {
        description: notification.message,
        duration: 5000,
      });
    });

    newSocket.on('reservation-expired', (notification: Notification) => {
      console.log('⏰ Reservation expired:', notification);
      setNotifications((prev) => [notification, ...prev]);
      
      toast.info(notification.title, {
        description: notification.message,
        duration: 4000,
      });
    });

    newSocket.on('system-message', (notification: Notification) => {
      console.log('🔔 System message:', notification);
      setNotifications((prev) => [notification, ...prev]);
      
      toast.info(notification.title, {
        description: notification.message,
        duration: 5000,
      });
    });

    newSocket.on('new-book', (notification: Notification) => {
      console.log('📖 New book:', notification);
      setNotifications((prev) => [notification, ...prev]);
      
      toast.success(notification.title, {
        description: notification.message,
        duration: 4000,
      });
    });

    // Обробка помилок
    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setConnected(false);
    });

    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    // Cleanup
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [isAuthenticated, user]);

  // Функція для очищення сповіщень
  const clearNotifications = () => {
    setNotifications([]);
  };

  // Функція для видалення конкретного сповіщення
  const removeNotification = (index: number) => {
    setNotifications((prev) => prev.filter((_, i) => i !== index));
  };

  return {
    socket,
    connected,
    notifications,
    unreadCount: notifications.length,
    clearNotifications,
    removeNotification,
  };
}