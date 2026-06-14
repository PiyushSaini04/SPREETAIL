import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext.jsx';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;

    const socket = io(import.meta.env.VITE_SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated]);

  const joinExpense = (expenseId) => {
    socketRef.current?.emit('joinExpense', { expenseId });
  };

  const leaveExpense = (expenseId) => {
    socketRef.current?.emit('leaveExpense', { expenseId });
  };

  const sendMessage = (expenseId, content, userId) => {
    socketRef.current?.emit('sendMessage', { expenseId, content, userId });
  };

  const onNewMessage = (cb) => {
    socketRef.current?.on('newMessage', cb);
    return () => socketRef.current?.off('newMessage', cb);
  };

  return (
    <SocketContext.Provider value={{ connected, joinExpense, leaveExpense, sendMessage, onNewMessage }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
