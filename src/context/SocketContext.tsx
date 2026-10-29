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
    console.log('[Socket] Evaluando sesión. Token:', !!token, 'User:', !!user ? user.id : 'null');
    if (!token || !user) {
      if (socket) {
        console.log('[Socket] Sesión cerrada o inexistente, desconectando socket activo...');
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    console.log('[Socket] Conectando a', ENV.API_URL, 'para el usuario:', user.id);
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

      // Unirse a la sala personal del usuario y de rol
      socketInstance.emit('join', `user:${user.id}`);
      if (user.role) {
        socketInstance.emit('join', `role:${user.role.toLowerCase()}`);
      }
    });

    // Diagnóstico: registrar cualquier evento recibido por el socket
    socketInstance.onAny((event, ...args) => {
      console.log(`[Socket-onAny] Evento detectado: '${event}'`, JSON.stringify(args?.[0])?.slice(0, 150));
    });

    // Escuchar mensajes entrantes a nivel global de la app para notificaciones push locales
    const handleIncomingMessageNotification = (payload: any) => {
      console.log('[Socket] Mensaje recibido vía socket:', payload?.id, payload?.conversationId, payload?.contactName);
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
        conversation: payload.conversation || payload.conversationContext,
      });
    };

    // Solo escuchar new_message para evitar doble notificación (new_message_alert es emitido por el backend simultáneamente para sonido web)
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
      socketInstance.off('new_message_alert', handleIncomingMessageNotification);
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
