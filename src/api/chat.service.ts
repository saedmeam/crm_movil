import { apiClient } from './axios.instance';
import { Conversation, Message } from '../types';

export interface SendMessagePayload {
  conversationId: string;
  content: string;
  type?: 'text' | 'image' | 'audio' | 'document' | 'internal_note';
  mediaUrl?: string;
  mediaDuration?: number;
  fileName?: string;
  fileSize?: number;
  isInternalNote?: boolean;
}

export const chatService = {
  // Lista de conversaciones del usuario (transformada a modelo plano para UI)
  async getConversations(currentUserId?: string): Promise<Conversation[]> {
    const response = await apiClient.get<any[]>('/api/conversations');
    const rawList = response.data || [];

    return rawList.map((item: any): Conversation => {
      const contact = item.contact || {};
      const lastMsg = item.messages?.[0] || null;

      let lastMessageContent = '';
      if (lastMsg) {
        if (lastMsg.content) {
          lastMessageContent = lastMsg.content;
        } else if (lastMsg.mediaType === 'AUDIO' || lastMsg.mediaUrl?.match(/\.(m4a|aac|mp3|ogg|wav)$/i)) {
          lastMessageContent = 'Nota de voz';
        } else if (lastMsg.mediaType === 'IMAGE' || lastMsg.mediaUrl?.match(/\.(jpg|jpeg|png|webp|gif)$/i)) {
          lastMessageContent = 'Foto';
        } else if (lastMsg.mediaUrl) {
          lastMessageContent = 'Archivo multimedia';
        }
      }

      let senderTypeNormalized: 'client' | 'agent' | 'system' | 'internal' = 'client';
      if (lastMsg?.senderType) {
        const st = String(lastMsg.senderType).toUpperCase();
        if (st === 'AGENT') senderTypeNormalized = 'agent';
        else if (st === 'INTERNAL') senderTypeNormalized = 'internal';
        else if (st === 'SYSTEM') senderTypeNormalized = 'system';
        else senderTypeNormalized = 'client';
      }

      const unreadCount = item._count?.messages ?? 0;
      const isAssignedToMe = currentUserId ? item.assignedUserId === currentUserId : false;

      return {
        id: item.id,
        contactName: contact.name || contact.phone || 'Sin nombre',
        contactPhone: contact.phone || '',
        contactAvatar: contact.avatarUrl || undefined,
        companyName: contact.institution || undefined,
        lastMessage: lastMessageContent,
        lastMessageTime: lastMsg?.createdAt || item.updatedAt,
        lastMessageStatus: lastMsg?.status || 'SENT',
        lastMessageSenderType: senderTypeNormalized,
        unreadCount,
        isAssignedToMe,
        assignedUserId: item.assignedUserId,
        assignedAgentName: item.assignedUser?.name || undefined,
        stage: item.stage,
        channel: item.channel,
        whatsappLineId: item.whatsappLineId,
        whatsappLine: item.whatsappLine,
        collaborators: item.collaborators || [],
        contact,
        messages: item.messages,
        _count: item._count,
      };
    });
  },

  // Historial de mensajes paginados de una conversación
  async getMessages(conversationId: string, page = 1, limit = 50): Promise<Message[]> {
    const response = await apiClient.get<any[]>(`/api/conversations/${conversationId}/messages`, {
      params: { page, limit },
    });
    const rawList = response.data || [];

    return rawList.map((item: any): Message => {
      let type: 'text' | 'image' | 'audio' | 'document' | 'internal_note' = 'text';
      const mType = (item.mediaType || '').toUpperCase();
      const mUrl = item.mediaUrl || '';

      if (item.isInternal || item.senderType === 'INTERNAL' || item.type === 'internal_note') {
        type = 'internal_note';
      } else if (mType === 'AUDIO' || mUrl.match(/\.(m4a|aac|mp3|ogg|wav)$/i)) {
        type = 'audio';
      } else if (mType === 'IMAGE' || mUrl.match(/\.(jpg|jpeg|png|webp|gif)$/i)) {
        type = 'image';
      } else if (mType === 'DOCUMENT_PDF' || mUrl.match(/\.(pdf|doc|docx|xls|xlsx|txt)$/i)) {
        type = 'document';
      }

      let senderType = item.senderType;
      if (typeof senderType === 'string') {
        senderType = senderType.toUpperCase();
      }

      return {
        id: item.id,
        conversationId: item.conversationId,
        senderId: item.senderId || item.authorId,
        senderType: senderType || 'CLIENT',
        content: item.content || '',
        type,
        mediaUrl: item.mediaUrl,
        mediaType: item.mediaType,
        mediaDuration: item.mediaDuration,
        fileName: item.fileName,
        fileSize: item.fileSize,
        status: item.status || 'SENT',
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        isInternal: !!item.isInternal,
        isInternalNote: item.isInternal || item.senderType === 'INTERNAL',
        senderName: item.senderName || item.author?.name,
      };
    });
  },

  // Enviar un mensaje de texto, multimedia o nota interna
  async sendMessage(payload: SendMessagePayload): Promise<Message> {
    if (payload.isInternalNote || payload.type === 'internal_note') {
      const response = await apiClient.post<any>(`/api/conversations/${payload.conversationId}/comments`, {
        content: payload.content,
      });
      const data = response.data;
      return {
        id: data.id,
        conversationId: payload.conversationId,
        senderType: 'INTERNAL',
        content: data.content,
        type: 'internal_note',
        status: 'SENT',
        createdAt: data.createdAt,
        isInternal: true,
        isInternalNote: true,
        senderName: data.author?.name || 'Tú',
      };
    }

    let mediaType = 'TEXT';
    if (payload.type === 'image') mediaType = 'IMAGE';
    else if (payload.type === 'audio') mediaType = 'AUDIO';
    else if (payload.type === 'document') mediaType = 'DOCUMENT_PDF';

    const response = await apiClient.post<any>(`/api/conversations/${payload.conversationId}/messages`, {
      content: payload.content,
      mediaUrl: payload.mediaUrl,
      mediaType,
    });
    const msg = response.data;

    return {
      id: msg.id,
      conversationId: msg.conversationId,
      senderType: msg.senderType || 'AGENT',
      content: msg.content || '',
      type: payload.type || 'text',
      mediaUrl: msg.mediaUrl,
      mediaType: msg.mediaType,
      mediaDuration: payload.mediaDuration,
      fileName: payload.fileName,
      status: msg.status || 'SENT',
      createdAt: msg.createdAt,
      isInternal: false,
      isInternalNote: false,
    };
  },

  // Marcar mensajes como leídos
  async markAsRead(conversationId: string): Promise<{ success: boolean }> {
    const response = await apiClient.put<{ success: boolean }>(`/api/conversations/${conversationId}/read`);
    return response.data;
  },

  // Asignar o liberar conversación
  async assignConversation(conversationId: string, assignedUserId: string | null): Promise<any> {
    const response = await apiClient.put(`/api/conversations/${conversationId}/assign`, {
      assignedUserId,
    });
    return response.data;
  },

  // Actualizar colaboradores del chat
  async updateCollaborators(conversationId: string, collaboratorIds: string[]): Promise<any> {
    const response = await apiClient.put(`/api/conversations/${conversationId}/collaborators`, {
      collaboratorIds,
    });
    return response.data;
  },

  // Obtener lista de agentes para asignar o colaborar
  async getAgents(): Promise<Array<{ id: string; name: string; username?: string }>> {
    const response = await apiClient.get<Array<{ id: string; name: string; username?: string }>>('/api/users/agents');
    return response.data || [];
  },
};
