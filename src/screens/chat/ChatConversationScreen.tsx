import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FlashList } from '@shopify/flash-list';
import { ArrowLeft, Phone, MoreVertical } from 'lucide-react-native';
import { AppStackParamList } from '../../navigation/types';
import { Message } from '../../types';
import { chatService } from '../../api/chat.service';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { resolveMediaUrl } from '../../config/env';
import { MessageBubble } from '../../components/chat/MessageBubble';
import { ChatInputBar } from '../../components/chat/ChatInputBar';

type Props = NativeStackScreenProps<AppStackParamList, 'ChatConversation'>;

export const ChatConversationScreen: React.FC<Props> = ({ route, navigation }) => {
  const { conversation } = route.params;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { socket, joinConversation, leaveConversation } = useSocket();

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar historial de mensajes y marcar como leídos
  const loadMessages = useCallback(async () => {
    try {
      const history = await chatService.getMessages(conversation.id, 1, 50);
      setMessages(history);
      await chatService.markAsRead(conversation.id);
    } catch (err) {
      console.warn('[ChatConversation] Error cargando mensajes:', err);
    } finally {
      setIsLoading(false);
    }
  }, [conversation.id]);

  useEffect(() => {
    loadMessages();
    joinConversation(conversation.id);

    return () => {
      leaveConversation(conversation.id);
    };
  }, [conversation.id, loadMessages]);

  // Escuchar eventos en tiempo real para este chat
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (payload: any) => {
      const convId = payload.conversationId || payload.conversation?.id;
      if (convId === conversation.id) {
        let type: 'text' | 'image' | 'audio' | 'document' | 'internal_note' = 'text';
        const mType = (payload.mediaType || '').toUpperCase();
        const mUrl = payload.mediaUrl || '';

        if (payload.isInternal || payload.senderType === 'INTERNAL' || payload.type === 'internal_note') {
          type = 'internal_note';
        } else if (mType === 'AUDIO' || mUrl.match(/\.(m4a|aac|mp3|ogg|wav)$/i)) {
          type = 'audio';
        } else if (mType === 'IMAGE' || mUrl.match(/\.(jpg|jpeg|png|webp|gif)$/i)) {
          type = 'image';
        } else if (mType === 'DOCUMENT_PDF' || mUrl.match(/\.(pdf|doc|docx|xls|xlsx|txt)$/i)) {
          type = 'document';
        }

        const formattedMsg: Message = {
          id: payload.id || `temp_${Date.now()}`,
          conversationId: convId,
          senderId: payload.senderId || payload.authorId,
          senderType: payload.senderType || 'CLIENT',
          content: payload.content || '',
          type,
          mediaUrl: payload.mediaUrl,
          mediaType: payload.mediaType,
          mediaDuration: payload.mediaDuration,
          fileName: payload.fileName,
          status: payload.status || 'SENT',
          createdAt: payload.createdAt || new Date().toISOString(),
          isInternal: !!payload.isInternal,
          isInternalNote: payload.isInternal || payload.senderType === 'INTERNAL',
          senderName: payload.senderName || payload.author?.name,
        };

        setMessages((prev) => {
          // Evitar duplicados si ya fue agregado optimísticamente
          if (prev.some((m) => m.id === formattedMsg.id)) return prev;
          return [formattedMsg, ...prev];
        });

        chatService.markAsRead(conversation.id).catch(() => {});
      }
    };

    const handleStatusUpdate = (payload: { messageId?: string; id?: string; status: any }) => {
      const targetId = payload.messageId || payload.id;
      if (targetId) {
        setMessages((prev) =>
          prev.map((m) => (m.id === targetId ? { ...m, status: payload.status } : m))
        );
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('message_status_update', handleStatusUpdate);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('message_status_update', handleStatusUpdate);
    };
  }, [socket, conversation.id]);

  // Enviar mensaje de texto, foto o nota de voz
  const handleSendMessage = async (payload: {
    content: string;
    type: 'text' | 'image' | 'audio' | 'internal_note';
    mediaUrl?: string;
    mediaDuration?: number;
    fileName?: string;
    isInternalNote?: boolean;
  }) => {
    try {
      const newMsg = await chatService.sendMessage({
        conversationId: conversation.id,
        content: payload.content,
        type: payload.type,
        mediaUrl: payload.mediaUrl,
        mediaDuration: payload.mediaDuration,
        fileName: payload.fileName,
        isInternalNote: payload.isInternalNote,
      });

      // Añadir inmediatamente a la lista local
      setMessages((prev) => [newMsg, ...prev]);
    } catch (err: any) {
      console.error('[ChatConversation] Error enviando mensaje:', err);
    }
  };

  const avatarUrl = resolveMediaUrl(conversation.contactAvatar);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Cabecera del Chat */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerAvatarContainer}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.headerAvatar} />
          ) : (
            <View style={styles.headerAvatarPlaceholder}>
              <Text style={styles.headerAvatarText}>
                {conversation.contactName?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {conversation.contactName || conversation.contactPhone}
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {conversation.companyName || conversation.contactPhone}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.actionIcon}>
            <Phone size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionIcon}>
            <MoreVertical size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Lista de Mensajes Invertida */}
      <View style={styles.chatArea}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#075E54" />
          </View>
        ) : (
          <FlashList
            data={messages}
            renderItem={({ item }) => (
              <MessageBubble
                message={item}
                onImagePress={(imgUrl) =>
                  navigation.navigate('ImageViewer', {
                    imageUrl: imgUrl,
                    senderName: conversation.contactName,
                  })
                }
              />
            )}
            inverted
            keyExtractor={(item) => item.id}
          />
        )}
      </View>

      {/* Barra de Entrada de Mensaje */}
      <View style={{ paddingBottom: insets.bottom }}>
        <ChatInputBar onSendMessage={handleSendMessage} />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EFEAE2', // Fondo clásico tipo chat de WhatsApp
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#075E54',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  backButton: {
    padding: 4,
    marginRight: 6,
  },
  headerAvatarContainer: {
    marginRight: 10,
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  headerAvatarPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#128C7E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#E2E8F0',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionIcon: {
    padding: 6,
  },
  chatArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
