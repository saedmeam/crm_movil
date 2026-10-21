import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FlashList } from '@shopify/flash-list';
import {
  Search,
  CheckCheck,
  Check,
  Wifi,
  WifiOff,
  LogOut,
  Users,
  MessageSquare,
  Building,
  Sliders,
} from 'lucide-react-native';
import { AppStackParamList } from '../../navigation/types';
import { Conversation, MessageStatus } from '../../types';
import { chatService } from '../../api/chat.service';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { resolveMediaUrl } from '../../config/env';

type ChatListNavigationProp = NativeStackNavigationProp<AppStackParamList, 'ChatList'>;

interface Props {
  navigation: ChatListNavigationProp;
}

type TabFilter = 'all' | 'unread' | 'my_chats';

export const ChatListScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { socket, isConnected } = useSocket();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Cargar conversaciones desde la API
  const fetchConversations = useCallback(async () => {
    try {
      const data = await chatService.getConversations(user?.id);
      setConversations(data);
    } catch (error) {
      console.warn('[ChatList] Error cargando conversaciones:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Escuchar eventos Socket.IO para actualizar la lista de chats en vivo
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (payload: any) => {
      // El backend emite el mensaje plano con conversationId en payload.conversationId
      const targetConvId = payload.conversationId || payload.conversation?.id;
      if (!targetConvId) return;

      setConversations((prev) => {
        const index = prev.findIndex((c) => c.id === targetConvId);
        if (index === -1) {
          // Si no existía en el listado actual, recargamos
          fetchConversations();
          return prev;
        }

        const updated = [...prev];
        const conv = { ...updated[index] };
        
        let content = payload.content;
        if (!content) {
          if (payload.mediaType === 'AUDIO' || payload.mediaUrl?.match(/\.(m4a|aac|mp3|ogg|wav)$/i)) {
            content = 'Nota de voz';
          } else if (payload.mediaType === 'IMAGE' || payload.mediaUrl?.match(/\.(jpg|jpeg|png|webp|gif)$/i)) {
            content = 'Foto';
          } else if (payload.mediaUrl) {
            content = 'Archivo multimedia';
          } else {
            content = 'Nuevo mensaje';
          }
        }
        conv.lastMessage = content;
        conv.lastMessageTime = payload.createdAt || new Date().toISOString();
        conv.lastMessageStatus = payload.status || 'SENT';
        
        const sType = String(payload.senderType || '').toUpperCase();
        conv.lastMessageSenderType = sType === 'AGENT' ? 'agent' : sType === 'INTERNAL' ? 'internal' : 'client';

        if (sType === 'CLIENT') {
          conv.unreadCount = (conv.unreadCount || 0) + 1;
        }

        // Mover la conversación al inicio de la lista
        updated.splice(index, 1);
        return [conv, ...updated];
      });
    };

    const handleStatusUpdate = (payload: { conversationId: string; status: MessageStatus }) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === payload.conversationId ? { ...c, lastMessageStatus: payload.status } : c
        )
      );
    };

    const handleConversationRead = (payload: { conversationId: string; unreadCount: number }) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === payload.conversationId ? { ...c, unreadCount: payload.unreadCount ?? 0 } : c
        )
      );
    };

    socket.on('new_message', handleNewMessage);
    socket.on('message_status_update', handleStatusUpdate);
    socket.on('conversation_read', handleConversationRead);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('message_status_update', handleStatusUpdate);
      socket.off('conversation_read', handleConversationRead);
    };
  }, [socket, fetchConversations]);

  // Filtros de búsqueda y pestañas
  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      const matchesSearch =
        c.contactName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.contactPhone?.includes(searchQuery) ||
        c.companyName?.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (activeTab === 'unread') {
        return (c.unreadCount || 0) > 0;
      }
      if (activeTab === 'my_chats') {
        return c.isAssignedToMe === true;
      }
      return true;
    });
  }, [conversations, searchQuery, activeTab]);

  const renderStatusCheck = (status?: MessageStatus, senderType?: string) => {
    if (senderType !== 'agent') return null;
    if (status === 'READ') {
      return <CheckCheck size={16} color="#34B7F1" style={{ marginRight: 4 }} />;
    }
    if (status === 'DELIVERED') {
      return <CheckCheck size={16} color="#94A3B8" style={{ marginRight: 4 }} />;
    }
    return <Check size={16} color="#94A3B8" style={{ marginRight: 4 }} />;
  };

  const renderConversationItem = ({ item }: { item: Conversation }) => {
    const avatarUrl = resolveMediaUrl(item.contactAvatar);

    return (
      <TouchableOpacity
        style={styles.chatItem}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('ChatConversation', { conversation: item })}
      >
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>
                {item.contactName?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
          )}
        </View>

        {/* Información central */}
        <View style={styles.chatContent}>
          <View style={styles.chatHeaderRow}>
            <Text style={styles.contactName} numberOfLines={1}>
              {item.contactName || item.contactPhone}
            </Text>
            <Text style={styles.timestamp}>
              {item.lastMessageTime ? new Date(item.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
            </Text>
          </View>

          {item.companyName && (
            <View style={styles.companyRow}>
              <Building size={12} color="#64748B" style={{ marginRight: 4 }} />
              <Text style={styles.companyName} numberOfLines={1}>{item.companyName}</Text>
            </View>
          )}

          <View style={styles.lastMessageRow}>
            <View style={styles.lastMessageLeft}>
              {renderStatusCheck(item.lastMessageStatus, item.lastMessageSenderType)}
              <Text style={styles.lastMessageText} numberOfLines={1}>
                {item.lastMessage || 'Conversación iniciada'}
              </Text>
            </View>

            {/* Badge de No Leídos */}
            {item.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCountText}>{item.unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      
      {/* Barra Superior WhatsApp / CRM */}
      <View style={styles.topHeader}>
        <View style={styles.topHeaderLeft}>
          <Text style={styles.headerTitle}>Horustech CRM</Text>
          <View style={styles.connectionStatus}>
            {isConnected ? (
              <>
                <Wifi size={13} color="#25D366" />
                <Text style={[styles.connectionText, { color: '#25D366' }]}>En línea</Text>
              </>
            ) : (
              <>
                <WifiOff size={13} color="#F59E0B" />
                <Text style={[styles.connectionText, { color: '#F59E0B' }]}>Conectando...</Text>
              </>
            )}
          </View>
        </View>

        {/* Botones de Cabecera: Admin y Logout */}
        <View style={styles.topHeaderActions}>
          <TouchableOpacity
            style={styles.headerActionBtn}
            onPress={() => navigation.navigate('AdminMenu')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Sliders size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerActionBtn}
            onPress={logout}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <LogOut size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Barra de Búsqueda */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Search size={18} color="#64748B" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre, teléfono o empresa..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />
        </View>
      </View>

      {/* Tabs de Filtro */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'all' && styles.tabButtonActive]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>Todos</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'unread' && styles.tabButtonActive]}
          onPress={() => setActiveTab('unread')}
        >
          <Text style={[styles.tabText, activeTab === 'unread' && styles.tabTextActive]}>No leídos</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'my_chats' && styles.tabButtonActive]}
          onPress={() => setActiveTab('my_chats')}
        >
          <Text style={[styles.tabText, activeTab === 'my_chats' && styles.tabTextActive]}>Mis Chats</Text>
        </TouchableOpacity>
      </View>

      {/* Lista de Chats con FlashList */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#075E54" />
          <Text style={styles.loadingText}>Sincronizando chats...</Text>
        </View>
      ) : (
        <FlashList
          data={filteredConversations}
          renderItem={renderConversationItem}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => {
                setIsRefreshing(true);
                fetchConversations();
              }}
              colors={['#075E54']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MessageSquare size={48} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>Sin conversaciones</Text>
              <Text style={styles.emptySubtitle}>No hay mensajes en esta bandeja de entrada</Text>
            </View>
          }
        />
      )}

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topHeader: {
    backgroundColor: '#075E54',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topHeaderLeft: {
    flexDirection: 'column',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 4,
  },
  connectionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  topHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  logoutBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tabButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  tabButtonActive: {
    backgroundColor: '#E8F5E9',
  },
  tabText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#075E54',
    fontWeight: '700',
  },
  chatItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: '600',
    color: '#475569',
  },
  chatContent: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    flex: 1,
    marginRight: 8,
  },
  timestamp: {
    fontSize: 12,
    color: '#94A3B8',
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  companyName: {
    fontSize: 12,
    color: '#64748B',
  },
  lastMessageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessageLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  lastMessageText: {
    fontSize: 14,
    color: '#64748B',
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: '#25D366',
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadCountText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#64748B',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
  },
});
