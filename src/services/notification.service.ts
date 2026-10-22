import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

// Configurar cómo se comportan las notificaciones cuando la app está en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

let isConfigured = false;
let activeConversationId: string | null = null;

export const notificationService = {
  /**
   * Registra y configura el canal de Android y solicita permisos
   */
  async setupNotifications(): Promise<boolean> {
    if (isConfigured) return true;

    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('chat-messages', {
          name: 'Mensajes de Clientes',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#075E54',
          sound: 'default',
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
    conversationId: string;
    contactName?: string;
    phoneNumber?: string;
    content?: string;
    mediaType?: string;
    mediaUrl?: string;
    senderType?: string;
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

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: {
            conversationId: payload.conversationId,
          },
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: Platform.OS === 'android' ? { channelId: 'chat-messages' } as any : null,
      });
    } catch (error) {
      console.warn('[NotificationService] Error al disparar notificación local:', error);
    }
  },
};
