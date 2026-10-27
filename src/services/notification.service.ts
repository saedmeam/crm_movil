import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

// Configurar cómo se comportan las notificaciones cuando la app está en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

let isConfigured = false;
let activeConversationId: string | null = null;
let responseListenerSubscription: Notifications.EventSubscription | null = null;
const recentlyNotifiedMessages = new Map<string, number>();

export const notificationService = {
  /**
   * Registra y configura el canal de Android y solicita permisos
   */
  async setupNotifications(): Promise<boolean> {
    if (isConfigured) return true;

    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('chat-messages-v2', {
          name: 'Mensajes de Clientes',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#075E54',
          sound: 'message',
          enableVibrate: true,
          showBadge: true,
        });
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      isConfigured = finalStatus === 'granted';

      // Registrar listener global para cuando el usuario presiona la notificación
      if (!responseListenerSubscription) {
        responseListenerSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
          try {
            console.log('[NotificationService] Notificación presionada por el usuario');
            const data = response.notification.request.content.data as any;
            if (data?.conversationId) {
              const convPayload = data.conversation || {
                id: data.conversationId,
                contactName: data.contactName || data.phoneNumber || 'Cliente',
                contactPhone: data.phoneNumber || '',
                unreadCount: 0,
              };

              const { navigationRef } = require('../navigation/navigationRef');
              const executeNavigation = () => {
                if (navigationRef.isReady()) {
                  console.log('[NotificationService] Navegando a conversación:', convPayload.id);
                  navigationRef.navigate('App', {
                    screen: 'ChatConversation',
                    params: { conversation: convPayload },
                  });
                  return true;
                }
                return false;
              };

              if (!executeNavigation()) {
                // Reintentar secuencialmente si la app se está levantando desde estado frío
                let attempts = 0;
                const interval = setInterval(() => {
                  attempts++;
                  if (executeNavigation() || attempts >= 8) {
                    clearInterval(interval);
                  }
                }, 350);
              }
            }
          } catch (err) {
            console.warn('[NotificationService] Error manejando toque en notificación:', err);
          }
        });
      }

      return isConfigured;
    } catch (error) {
      console.warn('[NotificationService] Error configurando notificaciones:', error);
      return false;
    }
  },

  /**
   * Establece qué conversación está abierta en pantalla para no disparar notificación de ese chat
   */
  setActiveConversation(conversationId: string | null) {
    activeConversationId = conversationId;
  },

  /**
   * Presenta una notificación local para un mensaje entrante
   */
  async notifyIncomingMessage(payload: {
    messageId?: string;
    conversationId: string;
    contactName?: string;
    phoneNumber?: string;
    content?: string;
    mediaType?: string;
    mediaUrl?: string;
    senderType?: string;
    conversation?: any;
  }) {
    // Si la conversación ya está abierta en primer plano por el agente, no spammear con notificación
    if (activeConversationId && activeConversationId === payload.conversationId) {
      return;
    }

    // Solo notificar si el remitente es el CLIENTE o si es una nota interna dirigida
    const sType = String(payload.senderType || '').toUpperCase();
    if (sType === 'AGENT') {
      return;
    }

    // Evitar notificaciones duplicadas (por ejemplo si el backend emite múltiples eventos para el mismo mensaje)
    const now = Date.now();
    const dedupKey = payload.messageId || `${payload.conversationId}_${payload.content || payload.mediaUrl || ''}`;
    const lastNotified = recentlyNotifiedMessages.get(dedupKey);
    if (lastNotified && now - lastNotified < 10000) {
      return;
    }
    recentlyNotifiedMessages.set(dedupKey, now);

    // Limpiar periódicamente entradas antiguas del mapa (mayores a 30 segundos)
    if (recentlyNotifiedMessages.size > 100) {
      for (const [key, timestamp] of recentlyNotifiedMessages.entries()) {
        if (now - timestamp > 30000) {
          recentlyNotifiedMessages.delete(key);
        }
      }
    }

    const title = payload.contactName || payload.phoneNumber || 'Nuevo Mensaje';
    let body = payload.content;

    if (!body || body.trim().length === 0) {
      const mType = String(payload.mediaType || '').toUpperCase();
      const mUrl = payload.mediaUrl || '';
      if (mType === 'AUDIO' || mUrl.match(/\.(m4a|aac|mp3|ogg|wav)$/i)) {
        body = '🎤 Nota de voz';
      } else if (mType === 'IMAGE' || mUrl.match(/\.(jpg|jpeg|png|webp)$/i)) {
        body = '📷 Foto adjunta';
      } else if (mType === 'VIDEO' || mUrl.match(/\.(mp4|mov|avi)$/i)) {
        body = '🎥 Video adjunto';
      } else if (mType === 'DOCUMENT_PDF' || mType === 'DOCUMENT' || mUrl.match(/\.(pdf|doc|docx|xls|xlsx)$/i)) {
        body = '📄 Documento adjunto';
      } else if (mUrl.match(/\.gif$/i)) {
        body = '👾 GIF adjunto';
      } else {
        body = '📩 Nuevo archivo adjunto';
      }
    }

    const conversationData = payload.conversation || {
      id: payload.conversationId,
      contactName: title,
      contactPhone: payload.phoneNumber || '',
      unreadCount: 0,
    };

    try {
      await Notifications.scheduleNotificationAsync({
        identifier: payload.messageId || undefined,
        content: {
          title,
          body,
          data: {
            conversationId: payload.conversationId,
            contactName: title,
            phoneNumber: payload.phoneNumber || '',
            conversation: conversationData,
          },
          sound: 'message',
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: Platform.OS === 'android' ? { channelId: 'chat-messages-v2' } as any : null,
      });
    } catch (error) {
      console.warn('[NotificationService] Error al disparar notificación local:', error);
    }
  },
};

