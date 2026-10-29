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
  Modal,
  Alert,
  Linking,
  ScrollView,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FlashList } from '@shopify/flash-list';
import {
  ArrowLeft,
  Phone,
  MoreVertical,
  Users,
  UserPlus,
  Check,
  X,
  Building,
  Info,
  Calendar,
  CheckSquare,
  Moon,
  Sun,
} from 'lucide-react-native';
import { AppStackParamList } from '../../navigation/types';
import { Conversation, Message } from '../../types';
import { chatService } from '../../api/chat.service';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { resolveMediaUrl } from '../../config/env';
import { notificationService } from '../../services/notification.service';
import { MessageBubble } from '../../components/chat/MessageBubble';
import { ChatInputBar } from '../../components/chat/ChatInputBar';
import { NewChatModal } from '../../components/chat/NewChatModal';

type Props = NativeStackScreenProps<AppStackParamList, 'ChatConversation'>;

export const ChatConversationScreen: React.FC<Props> = ({ route, navigation }) => {
  const { conversation: initialConversation } = route.params;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { isDark, colors, toggleTheme } = useTheme();
  const { socket, joinConversation, leaveConversation } = useSocket();

  const [currentConv, setCurrentConv] = useState<Conversation>(initialConversation);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const flashListRef = useRef<any>(null);

  // Sincronizar estado cuando se navega a otra conversación desde la misma pantalla
  useEffect(() => {
    if (route.params.conversation && route.params.conversation.id !== currentConv.id) {
      setCurrentConv(route.params.conversation);
      setMessages([]);
      setIsLoading(true);
    }
  }, [route.params.conversation]);

  // Modales
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showCollabModal, setShowCollabModal] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [targetContactData, setTargetContactData] = useState<{ name: string; phone: string }>({ name: '', phone: '' });

  // Estado de carga al buscar conversación de contacto
  const [searchingContactChat, setSearchingContactChat] = useState(false);

  // Manejar toque en "Mensaje" de una tarjeta de contacto
  const handleContactMessagePress = useCallback(async (contact: { name: string; phone: string }) => {
    try {
      console.log('[ChatConversation] Click en Mensaje para contacto:', contact);
      const cleanTargetPhone = (contact.phone || '').replace(/\D/g, '');
      if (!cleanTargetPhone) {
        Alert.alert('Teléfono no válido', 'El contacto no contiene un número telefónico válido para escribir.');
        return;
      }

      setSearchingContactChat(true);

      // Buscar si ya existe una conversación con este contacto en el CRM
      const allConvs = await chatService.getConversations(user?.id);
      
      // Normalizar número eliminando posibles ceros a la izquierda tras el código de país o prefijo
      const targetLast8 = cleanTargetPhone.slice(-8);

      const existingConv = allConvs.find((c) => {
        const cPhone = (c.contactPhone || c.contact?.phone || '').replace(/\D/g, '');
        if (!cPhone) return false;
        return (
          cPhone === cleanTargetPhone ||
          cPhone.endsWith(cleanTargetPhone) ||
          cleanTargetPhone.endsWith(cPhone) ||
          (targetLast8.length >= 8 && cPhone.endsWith(targetLast8))
        );
      });

      if (existingConv) {
        console.log('[ChatConversation] Conversación existente encontrada:', existingConv.id);
        if (existingConv.id === currentConv.id) {
          Alert.alert('Chat actual', 'Ya te encuentras en la conversación con este contacto.');
          return;
        }
        // Actualizar directamente la conversación activa en pantalla
        setCurrentConv(existingConv);
        setMessages([]);
        setIsLoading(true);
      } else {
        console.log('[ChatConversation] Conversación no existe aún. Abriendo Nuevo Chat para:', contact.name, cleanTargetPhone);
        setTargetContactData({
          name: contact.name || '',
          phone: contact.phone || cleanTargetPhone,
        });
        setShowNewChatModal(true);
      }
    } catch (e: any) {
      console.warn('[ChatConversation] Error buscando conversación para contacto:', e);
      setTargetContactData({
        name: contact.name || '',
        phone: contact.phone || '',
      });
      setShowNewChatModal(true);
    } finally {
      setSearchingContactChat(false);
    }
  }, [currentConv.id, user?.id]);

  // Lista de Agentes
  const [agents, setAgents] = useState<Array<{ id: string; name: string; username?: string }>>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [selectedCollabIds, setSelectedCollabIds] = useState<string[]>(
    (initialConversation.collaborators || []).map((c) => c.id)
  );

  // Listener para altura de teclado en Android/iOS para asegurar visibilidad total del input
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e: any) => {
      setKeyboardHeight(e.endCoordinates.height);
      setTimeout(() => {
        try {
          flashListRef.current?.scrollToOffset({ offset: 0, animated: true });
        } catch {}
      }, 50);
    };

    const onHide = () => {
      setKeyboardHeight(0);
    };

    const subShow = Keyboard.addListener(showEvent, onShow);
    const subHide = Keyboard.addListener(hideEvent, onHide);

    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, []);

  // Cargar historial de mensajes y marcar como leídos
  const loadMessages = useCallback(async () => {
    try {
      const history = await chatService.getMessages(currentConv.id, 1, 50);
      setMessages(history);
      await chatService.markAsRead(currentConv.id);
    } catch (err) {
      console.warn('[ChatConversation] Error cargando mensajes:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentConv.id]);

  useEffect(() => {
    loadMessages();
    joinConversation(currentConv.id);
    notificationService.setActiveConversation(currentConv.id);

    return () => {
      leaveConversation(currentConv.id);
      notificationService.setActiveConversation(null);
    };
  }, [currentConv.id, loadMessages]);

  // Cargar agentes para colaboradores y menciones predictivas
  const fetchAgents = useCallback(async () => {
    try {
      const data = await chatService.getAgents();
      setAgents(data);
    } catch (e) {
      console.warn('[ChatConversation] Error cargando agentes:', e);
    } finally {
      setLoadingAgents(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  // Agregar colaborador automáticamente al seleccionarlo desde mención @
  const handleAddCollaboratorFromMention = async (agentId: string) => {
    if (selectedCollabIds.includes(agentId)) return;
    const nextIds = [...selectedCollabIds, agentId];
    setSelectedCollabIds(nextIds);
    try {
      await chatService.updateCollaborators(currentConv.id, nextIds);
      const updatedCollabs = agents.filter((a) => nextIds.includes(a.id));
      setCurrentConv((prev) => ({
        ...prev,
        collaborators: updatedCollabs,
      }));
    } catch (e) {
      console.warn('[ChatConversation] Error al vincular colaborador desde mención:', e);
    }
  };

  // Escuchar eventos en tiempo real para este chat
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (payload: any) => {
      const convId = payload.conversationId || payload.conversation?.id || payload.conversationContext?.id;
      const payloadPhone = payload.phoneNumber || payload.conversationContext?.contact?.phone || payload.contact?.phone;
      const currentPhone = currentConv.contactPhone || currentConv.contact?.phone;
      const isMatch = (convId && convId === currentConv.id) ||
        (payloadPhone && currentPhone && payloadPhone.replace(/\D/g, '') === currentPhone.replace(/\D/g, ''));

      if (isMatch) {
        let type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'sticker' | 'gif' | 'internal_note' = 'text';
        const mType = (payload.mediaType || '').toUpperCase();
        const mUrl = payload.mediaUrl || '';

        if (payload.isInternal || payload.senderType === 'INTERNAL' || payload.type === 'internal_note') {
          type = 'internal_note';
        } else if (mType === 'AUDIO' || mUrl.match(/\.(m4a|aac|mp3|ogg|wav)$/i)) {
          type = 'audio';
        } else if (mType === 'VIDEO' || mUrl.match(/\.(mp4|mov|avi|mkv|webm)$/i)) {
          type = 'video';
        } else if (mUrl.match(/\.gif$/i) || payload.type === 'gif') {
          type = 'gif';
        } else if (mUrl.match(/\.webp$/i) || payload.type === 'sticker') {
          type = 'sticker';
        } else if (mType === 'IMAGE' || mUrl.match(/\.(jpg|jpeg|png)$/i)) {
          type = 'image';
        } else if (mType === 'DOCUMENT_PDF' || mType === 'DOCUMENT' || mUrl.match(/\.(pdf|doc|docx|xls|xlsx|txt|csv|zip|rar)$/i)) {
          type = 'document';
        } else if (payload.type === 'sticker' || (!mUrl && payload.content && payload.content.length <= 4 && /\p{Extended_Pictographic}/u.test(payload.content))) {
          type = 'sticker';
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
          if (prev.some((m) => m.id === formattedMsg.id)) return prev;
          return [formattedMsg, ...prev];
        });

        setTimeout(() => {
          try {
            flashListRef.current?.scrollToOffset({ offset: 0, animated: true });
          } catch {}
        }, 100);

        chatService.markAsRead(currentConv.id).catch(() => {});
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

    const handleReconnect = () => {
      console.log('[ChatConversation] Socket reconectado, recargando mensajes...');
      loadMessages();
      joinConversation(currentConv.id);
    };

    socket.on('new_message', handleNewMessage);
    socket.on('message_status_update', handleStatusUpdate);
    socket.on('connect', handleReconnect);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('message_status_update', handleStatusUpdate);
      socket.off('connect', handleReconnect);
    };
  }, [socket, currentConv.id, loadMessages, joinConversation]);

  // Enviar mensaje de texto, foto, audio, video, documento, sticker, gif o nota de voz
  const handleSendMessage = async (payload: {
    content: string;
    type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'sticker' | 'gif' | 'internal_note';
    mediaUrl?: string;
    mediaDuration?: number;
    fileName?: string;
    fileSize?: number;
    isInternalNote?: boolean;
  }) => {
    try {
      const newMsg = await chatService.sendMessage({
        conversationId: currentConv.id,
        content: payload.content,
        type: payload.type,
        mediaUrl: payload.mediaUrl,
        mediaDuration: payload.mediaDuration,
        fileName: payload.fileName,
        fileSize: payload.fileSize,
        isInternalNote: payload.isInternalNote,
      });

      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [newMsg, ...prev];
      });

      setTimeout(() => {
        try {
          flashListRef.current?.scrollToOffset({ offset: 0, animated: true });
        } catch {}
      }, 100);
    } catch (err: any) {
      console.error('[ChatConversation] Error enviando mensaje:', err);
    }
  };

  // Acción Llamada Telefónica / WhatsApp
  const handlePhoneCall = () => {
    const rawPhone = currentConv.contactPhone || currentConv.contact?.phone;
    if (!rawPhone || rawPhone.includes('@lid')) {
      Alert.alert('Sin Teléfono Válido', 'Este contacto no tiene un número telefónico asignado.');
      return;
    }

    const cleanPhone = rawPhone.replace(/\D/g, '');
    Alert.alert(
      'Opciones de Llamada',
      `¿Cómo deseas comunicarte con ${currentConv.contactName || cleanPhone}?`,
      [
        {
          text: 'Llamada Celular',
          onPress: () => Linking.openURL(`tel:${cleanPhone}`),
        },
        {
          text: 'WhatsApp',
          onPress: () => Linking.openURL(`https://wa.me/${cleanPhone}`),
        },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  // Asignar conversación
  const handleAssign = async (userId: string | null) => {
    try {
      await chatService.assignConversation(currentConv.id, userId);
      const assignedUser = agents.find((a) => a.id === userId);
      setCurrentConv((prev) => ({
        ...prev,
        assignedUserId: userId,
        assignedAgentName: assignedUser?.name,
        isAssignedToMe: userId === user?.id,
      }));
      setShowAssignModal(false);
      Alert.alert('Éxito', userId ? `Chat asignado a ${assignedUser?.name || 'agente'}` : 'Chat liberado (sin asignar)');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.error || 'No se pudo asignar el chat');
    }
  };

  // Guardar colaboradores
  const handleSaveCollaborators = async () => {
    try {
      await chatService.updateCollaborators(currentConv.id, selectedCollabIds);
      const updatedCollabs = agents.filter((a) => selectedCollabIds.includes(a.id));
      setCurrentConv((prev) => ({
        ...prev,
        collaborators: updatedCollabs,
      }));
      setShowCollabModal(false);
      Alert.alert('Éxito', 'Colaboradores actualizados correctamente');
    } catch (e: any) {
      Alert.alert('Error', 'No se pudieron actualizar los colaboradores');
    }
  };

  const toggleCollab = (id: string) => {
    setSelectedCollabIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const avatarUrl = resolveMediaUrl(currentConv.contactAvatar);
  const displayPhone = currentConv.contactPhone || currentConv.contact?.phone;
  const isLidPhone = displayPhone?.includes('@lid');
  const lineName = currentConv.whatsappLine?.name || currentConv.channel || 'Línea';
  const isQrLine = currentConv.whatsappLine?.providerType === 'QR_BAILEYS';

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.chatBg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Cabecera Principal */}
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('ChatList');
            }
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={24} color={colors.headerText} />
        </TouchableOpacity>

        <View style={styles.headerAvatarContainer}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.headerAvatar} />
          ) : (
            <View style={[styles.headerAvatarPlaceholder, { backgroundColor: isDark ? '#2A3942' : '#128C7E' }]}>
              <Text style={styles.headerAvatarText}>
                {currentConv.contactName?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.headerInfo}>
          <Text style={[styles.headerTitle, { color: colors.headerText }]} numberOfLines={1}>
            {currentConv.contactName || displayPhone || 'Contacto'}
          </Text>

          {/* Fila de Teléfono y Línea con diseño idéntico al web */}
          <View style={styles.headerSubRow}>
            {displayPhone && !isLidPhone ? (
              <View style={[styles.phoneChip, isDark && { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                <Text style={styles.phoneChipText}>📞 {displayPhone}</Text>
              </View>
            ) : null}

            <View style={[styles.lineChip, isDark && { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
              <View style={styles.onlineDot} />
              <Text style={styles.lineChipText} numberOfLines={1}>
                {lineName}
              </Text>
              <View style={[styles.qrBadge, { backgroundColor: isQrLine ? (isDark ? '#064E3B' : '#D1FAE5') : (isDark ? '#1E3A8A' : '#DBEAFE') }]}>
                <Text style={[styles.qrBadgeText, { color: isQrLine ? (isDark ? '#6EE7B7' : '#065F46') : (isDark ? '#93C5FD' : '#1E40AF') }]}>
                  {isQrLine ? '📱 QR' : '☁️ Meta'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Acciones Superiores */}
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.actionIcon}
            onPress={handlePhoneCall}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Phone size={20} color={colors.headerText} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionIcon}
            onPress={() => setShowOptionsModal(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MoreVertical size={20} color={colors.headerText} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Barra Rápida de Colaboradores y Asignación (Fila de Acciones Web) */}
      <View style={[styles.quickBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {/* Botón Colaboradores */}
        <TouchableOpacity
          style={[styles.quickBarBtn, isDark && { backgroundColor: '#1E1B4B', borderColor: '#3730A3' }]}
          onPress={() => {
            fetchAgents();
            setShowCollabModal(true);
          }}
        >
          <Users size={15} color={isDark ? '#A5B4FC' : '#4F46E5'} />
          <Text style={[styles.quickBarBtnText, isDark && { color: '#A5B4FC' }]}>Colaboradores</Text>
          {(currentConv.collaborators?.length || 0) > 0 && (
            <View style={[styles.counterBadge, isDark && { backgroundColor: '#312E81' }]}>
              <Text style={[styles.counterBadgeText, isDark && { color: '#E0E7FF' }]}>{currentConv.collaborators?.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Botón Asignar */}
        <TouchableOpacity
          style={[
            styles.quickBarBtn,
            currentConv.assignedUserId
              ? (isDark ? { backgroundColor: '#064E3B', borderColor: '#047857' } : styles.quickBarBtnAssigned)
              : (isDark ? { backgroundColor: '#1E3A8A', borderColor: '#1D4ED8' } : styles.quickBarBtnBlue),
          ]}
          onPress={() => {
            if (currentConv.assignedUserId) {
              Alert.alert(
                'Liberar Conversación',
                `¿Deseas desasignar este chat de ${currentConv.assignedAgentName || 'agente'} y dejarlo disponible para todos?`,
                [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Liberar', style: 'destructive', onPress: () => handleAssign(null) },
                ]
              );
            } else {
              fetchAgents();
              setShowAssignModal(true);
            }
          }}
        >
          <UserPlus size={15} color={currentConv.assignedUserId ? (isDark ? '#34D399' : '#065F46') : (isDark ? '#60A5FA' : '#2563EB')} />
          <Text
            style={[
              styles.quickBarBtnText,
              { color: currentConv.assignedUserId ? (isDark ? '#34D399' : '#065F46') : (isDark ? '#60A5FA' : '#2563EB') },
            ]}
            numberOfLines={1}
          >
            {currentConv.assignedUserId
              ? `${currentConv.assignedAgentName || 'Asignado'} (Liberar)`
              : 'Asignar'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Lista de Mensajes Invertida */}
      <View style={[styles.chatArea, { backgroundColor: colors.chatBg }]}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlashList
            ref={flashListRef}
            data={messages}
            renderItem={({ item }) => (
              <MessageBubble
                message={item}
                onImagePress={(imgUrl) =>
                  navigation.navigate('ImageViewer', {
                    imageUrl: imgUrl,
                    senderName: currentConv.contactName,
                  })
                }
                onVideoPress={(videoUrl) =>
                  navigation.navigate('VideoViewer', {
                    videoUrl,
                    senderName: currentConv.contactName,
                  })
                }
                onContactMessagePress={handleContactMessagePress}
              />
            )}
            inverted
            keyExtractor={(item) => item.id}
          />
        )}
      </View>

      {/* Barra de Entrada de Mensaje */}
      <View
        style={{
          paddingBottom: Platform.OS === 'android'
            ? (keyboardHeight > 0 ? keyboardHeight : insets.bottom)
            : (keyboardHeight > 0 ? 0 : insets.bottom),
        }}
      >
        <ChatInputBar
          onSendMessage={handleSendMessage}
          agents={agents}
          onAddCollaborator={handleAddCollaboratorFromMention}
        />
      </View>

      {/* Indicador de búsqueda de chat de contacto */}
      {searchingContactChat && (
        <View style={styles.searchingOverlay}>
          <View style={[styles.searchingCard, { backgroundColor: colors.surface }]}>
            <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 10 }} />
            <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '600' }}>
              Buscando conversación...
            </Text>
          </View>
        </View>
      )}

      {/* Modal 3 Puntos (Opciones del Chat) */}
      <Modal visible={showOptionsModal} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowOptionsModal(false)}
        >
          <View style={[styles.optionsDropdown, { top: insets.top + 50, backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.optionItem, { borderBottomColor: colors.borderSubtle }]}
              onPress={() => {
                setShowOptionsModal(false);
                fetchAgents();
                setShowAssignModal(true);
              }}
            >
              <UserPlus size={18} color={isDark ? '#60A5FA' : '#2563EB'} />
              <Text style={[styles.optionText, { color: colors.textPrimary }]}>
                {currentConv.assignedUserId ? 'Reasignar chat' : 'Asignar chat'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionItem, { borderBottomColor: colors.borderSubtle }]}
              onPress={() => {
                setShowOptionsModal(false);
                fetchAgents();
                setShowCollabModal(true);
              }}
            >
              <Users size={18} color={isDark ? '#A5B4FC' : '#4F46E5'} />
              <Text style={[styles.optionText, { color: colors.textPrimary }]}>Gestionar colaboradores</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionItem, { borderBottomColor: colors.borderSubtle }]}
              onPress={() => {
                setShowOptionsModal(false);
                handlePhoneCall();
              }}
            >
              <Phone size={18} color={isDark ? '#34D399' : '#059669'} />
              <Text style={[styles.optionText, { color: colors.textPrimary }]}>Llamar al cliente</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionItem, { borderBottomColor: colors.borderSubtle }]}
              onPress={() => {
                setShowOptionsModal(false);
                toggleTheme();
              }}
            >
              {isDark ? (
                <Sun size={18} color="#F59E0B" />
              ) : (
                <Moon size={18} color="#6366F1" />
              )}
              <Text style={[styles.optionText, { color: colors.textPrimary }]}>
                {isDark ? 'Modo Claro' : 'Modo Nocturno'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionItem, { borderBottomWidth: 0 }]}
              onPress={() => {
                setShowOptionsModal(false);
                Alert.alert(
                  'Detalles del Contacto',
                  `Nombre: ${currentConv.contactName || 'Sin registrar'}\nTeléfono: ${displayPhone || 'Sin registrar'}\nEmpresa: ${currentConv.companyName || 'N/A'}\nLínea: ${lineName}`
                );
              }}
            >
              <Info size={18} color={colors.textSecondary} />
              <Text style={[styles.optionText, { color: colors.textPrimary }]}>Ver información del contacto</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal Asignar Chat */}
      <Modal visible={showAssignModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { paddingBottom: insets.bottom + 20, backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Asignar Conversación</Text>
              <TouchableOpacity onPress={() => setShowAssignModal(false)}>
                <X size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              Selecciona el asesor responsable de atender este chat:
            </Text>

            {loadingAgents ? (
              <ActivityIndicator size="small" color="#075E54" style={{ marginVertical: 20 }} />
            ) : (
              <ScrollView style={{ maxHeight: 300 }}>
                {/* Opción Asignarme a mí */}
                {user && (
                  <TouchableOpacity
                    style={[
                      styles.agentItem,
                      currentConv.assignedUserId === user.id && styles.agentItemActive,
                    ]}
                    onPress={() => handleAssign(user.id)}
                  >
                    <View style={styles.agentAvatar}>
                      <Text style={styles.agentInitial}>{user.name?.charAt(0) || 'U'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.agentName}>{user.name} (Tú)</Text>
                      <Text style={styles.agentRole}>Asignarme a mí</Text>
                    </View>
                    {currentConv.assignedUserId === user.id && (
                      <Check size={18} color="#059669" />
                    )}
                  </TouchableOpacity>
                )}

                {/* Otros Agentes */}
                {agents
                  .filter((a) => a.id !== user?.id)
                  .map((agent) => (
                    <TouchableOpacity
                      key={agent.id}
                      style={[
                        styles.agentItem,
                        currentConv.assignedUserId === agent.id && styles.agentItemActive,
                      ]}
                      onPress={() => handleAssign(agent.id)}
                    >
                      <View style={styles.agentAvatar}>
                        <Text style={styles.agentInitial}>{agent.name?.charAt(0) || 'A'}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.agentName}>{agent.name}</Text>
                        <Text style={styles.agentRole}>@{agent.username || 'asesor'}</Text>
                      </View>
                      {currentConv.assignedUserId === agent.id && (
                        <Check size={18} color="#059669" />
                      )}
                    </TouchableOpacity>
                  ))}
              </ScrollView>
            )}

            <View style={styles.modalFooter}>
              {currentConv.assignedUserId && (
                <TouchableOpacity
                  style={styles.liberarBtn}
                  onPress={() => handleAssign(null)}
                >
                  <Text style={styles.liberarBtnText}>Liberar (Sin Asignar)</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setShowAssignModal(false)}
              >
                <Text style={styles.cancelModalBtnText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Colaboradores */}
      <Modal visible={showCollabModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { paddingBottom: insets.bottom + 20, backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Colaboradores del Chat</Text>
              <TouchableOpacity onPress={() => setShowCollabModal(false)}>
                <X size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalDesc, { color: colors.textSecondary }]}>
              Selecciona los usuarios que podrán ver y atender este chat sin cambiar la asignación principal:
            </Text>

            {loadingAgents ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 20 }} />
            ) : (
              <ScrollView style={{ maxHeight: 300 }}>
                {agents.map((agent) => {
                  const isChecked = selectedCollabIds.includes(agent.id);
                  return (
                    <TouchableOpacity
                      key={agent.id}
                      style={[
                        styles.agentItem,
                        isChecked && styles.agentItemActive,
                        isDark && { backgroundColor: isChecked ? 'rgba(0,168,132,0.15)' : '#202C33', borderColor: isDark ? colors.borderSubtle : '#E2E8F0' },
                      ]}
                      onPress={() => toggleCollab(agent.id)}
                    >
                      <View style={[styles.checkbox, isChecked && styles.checkboxActive]}>
                        {isChecked && <Check size={12} color="#FFFFFF" />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.agentName, { color: colors.textPrimary }]}>{agent.name}</Text>
                        <Text style={[styles.agentRole, { color: colors.textSecondary }]}>@{agent.username || 'asesor'}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setShowCollabModal(false)}
              >
                <Text style={styles.cancelModalBtnText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveCollabBtn}
                onPress={handleSaveCollaborators}
              >
                <Text style={styles.saveCollabBtnText}>Guardar Colaboradores</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Nuevo Chat (abierto desde mensaje de contacto compartido) */}
      <NewChatModal
        visible={showNewChatModal}
        initialPhone={targetContactData.phone}
        initialName={targetContactData.name}
        onClose={() => setShowNewChatModal(false)}
        onChatCreated={(newConv) => {
          navigation.navigate('ChatConversation', { conversation: newConv });
        }}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EFEAE2',
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
  headerSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  phoneChip: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  phoneChipText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  lineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },
  lineChipText: {
    fontSize: 11,
    color: '#E2E8F0',
    fontWeight: '600',
    maxWidth: 90,
  },
  qrBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  qrBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionIcon: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  quickBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  quickBarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
  },
  quickBarBtnBlue: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  quickBarBtnAssigned: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  quickBarBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4F46E5',
  },
  counterBadge: {
    backgroundColor: '#C7D2FE',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 10,
  },
  counterBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#312E81',
  },
  chatArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  optionsDropdown: {
    position: 'absolute',
    right: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 6,
    width: 220,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  optionText: {
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalDesc: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 14,
  },
  agentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  agentItemActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
  },
  agentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  agentInitial: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
  },
  agentName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  agentRole: {
    fontSize: 11,
    color: '#64748B',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  cancelModalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  cancelModalBtnText: {
    color: '#475569',
    fontWeight: '600',
    fontSize: 13,
  },
  liberarBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
  },
  liberarBtnText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 13,
  },
  saveCollabBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
  },
  saveCollabBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  searchingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  searchingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
});
