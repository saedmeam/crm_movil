export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
  phone?: string;
}

export type MessageType = 'text' | 'image' | 'audio' | 'video' | 'document' | 'sticker' | 'gif' | 'internal_note';
export type MessageStatus = 'SENT' | 'DELIVERED' | 'READ';

export interface Message {
  id: string;
  conversationId: string;
  senderId?: string;
  senderType: 'client' | 'agent' | 'system' | 'internal' | 'CLIENT' | 'AGENT' | 'SYSTEM' | 'INTERNAL' | 'AI_BOT';
  content: string;
  type: MessageType;
  mediaUrl?: string;
  mediaType?: string;
  mediaDuration?: number; // en segundos para notas de voz
  fileName?: string;
  fileSize?: number;
  status: MessageStatus;
  createdAt: string;
  updatedAt?: string;
  isInternal?: boolean;
  isInternalNote?: boolean;
  senderName?: string;
}

export interface Conversation {
  id: string;
  contactName: string;
  contactPhone: string;
  contactAvatar?: string;
  companyName?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  lastMessageStatus?: MessageStatus;
  lastMessageSenderType?: 'client' | 'agent' | 'system' | 'internal';
  unreadCount: number;
  isAssignedToMe?: boolean;
  assignedAgentName?: string;
  assignedUserId?: string | null;
  status?: string; // 'OPEN' | 'PENDING' | 'CLOSED' etc.
  stage?: string;
  channel?: string;
  whatsappLineId?: string | null;
  whatsappLine?: {
    id: string;
    name: string;
    providerType?: 'QR_BAILEYS' | 'META_CLOUD';
    phoneNumberId?: string;
  };
  collaborators?: Array<{
    id: string;
    name: string;
    email?: string;
  }>;
  // Campos del backend sin procesar (para referencia o robustez)
  contact?: {
    id: string;
    name?: string;
    phone: string;
    avatarUrl?: string;
    institution?: string;
    email?: string;
  };
  messages?: any[];
  _count?: {
    messages?: number;
  };
}

export interface LoginResponse {
  token: string;
  user: User;
}
