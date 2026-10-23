import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AppState } from 'react-native';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { ENV } from '../config/env';
import { Message, MessageStatus } from '../types';
import { notificationService } from '../services/notification.service';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  // Inicializar permisos y canal de notificaciones
  useEffect(() => {
    notificationService.setupNotifications();
  }, []);

  useEffect(() => {
    if (!token || !user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Inicializar conexión con autenticación por token y soporte de transportes
    const socketInstance = io(ENV.API_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    socketInstance.on('connect', () => {
      console.log(`[Socket] Conectado exitosamente. ID: ${socketInstance.id}`);
      setIsConnected(true);

      // Unirse a la sala personal del usuario
      socketInstance.emit('join', `user:${user.id}`);
    });

    // Escuchar mensajes entrantes a nivel global de la app para notificaciones push locales
    const handleIncomingMessageNotification = (payload: any) => {
      if (!payload) return;
      const targetConvId =
        payload.conversationId ||
        payload.conversation?.id ||
        payload.conversationContext?.id;
      if (!targetConvId) return;

      notificationService.notifyIncomingMessage({
        messageId: payload.id,
        conversationId: targetConvId,
        contactName:
          payload.contactName ||
          payload.conversationContext?.contact?.name ||
          payload.contact?.name,
        phoneNumber:
          payload.phoneNumber ||
          payload.conversationContext?.contact?.phone ||
          payload.contact?.phone,
        content: payload.content,
        mediaType: payload.mediaType,
        mediaUrl: payload.mediaUrl,
        senderType: payload.senderType,
      });
    };

    socketInstance.on('new_message', handleIncomingMessageNotification);

    socketInstance.on('disconnect', (reason) => {
      console.log(`[Socket] Desconectado: ${reason}`);
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.warn('[Socket] Error de conexión:', error.message);
      setIsConnected(false);
    });

    setSocket(socketInstance);

    // Mantener la conexión viva y reconectar inmediatamente al volver al primer plano
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        if (!socketInstance.connected) {
          console.log('[Socket] App volvió a primer plano, reconectando socket...');
          socketInstance.connect();
        }
      }
    });

    return () => {
      subscription.remove();
      socketInstance.off('new_message', handleIncomingMessageNotification);
      socketInstance.disconnect();
    };
  }, [token, user?.id]);

  const joinConversation = (conversationId: string) => {
    if (socket && isConnected) {
      socket.emit('join', `conversation:${conversationId}`);
    }
  };

  const leaveConversation = (conversationId: string) => {
    if (socket && isConnected) {
      socket.emit('leave', `conversation:${conversationId}`);
    }
  };

  return (
    <SocketContext.Provider value={{ socket, isConnected, joinConversation, leaveConversation }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket debe ser usado dentro de un SocketProvider');
  }
  return context;
};
