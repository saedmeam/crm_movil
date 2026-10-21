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
  Moon,
  Sun,
} from 'lucide-react-native';
import { AppStackParamList } from '../../navigation/types';
import { Conversation, MessageStatus } from '../../types';
import { chatService } from '../../api/chat.service';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { resolveMediaUrl } from '../../config/env';

type ChatListNavigationProp = NativeStackNavigationProp<AppStackParamList, 'ChatList'>;

interface Props {
  navigation: ChatListNavigationProp;
}

type TabFilter = 'all' | 'unread' | 'my_chats';

export const ChatListScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { isDark, colors, toggleTheme } = useTheme();
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
        style={[
          styles.chatItem,
          { backgroundColor: colors.surface, borderBottomColor: colors.borderSubtle },
        ]}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('ChatConversation', { conversation: item })}
      >
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: isDark ? '#2A3942' : '#E2E8F0' }]}>
              <Text style={[styles.avatarInitial, { color: isDark ? '#E9EDEF' : '#475569' }]}>
                {item.contactName?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
          )}
        </View>

        {/* Información central */}
        <View style={styles.chatContent}>
            <View style={styles.chatHeaderRow}>
              <Text style={[styles.contactName, { color: colors.textPrimary }]} numberOfLines={1}>
                {item.contactName || item.contactPhone}
              </Text>
              <Text style={[styles.timestamp, { color: colors.textMuted }]}>
                {item.lastMessageTime ? new Date(item.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
              </Text>
            </View>

            {/* Fila de Teléfono y Línea de WhatsApp */}
            <View style={styles.contactMetaRow}>
              {item.contactPhone ? (
                <View style={[styles.phoneBadge, { backgroundColor: isDark ? '#202C33' : '#F1F5F9', borderColor: colors.borderSubtle }]}>
                  <Text style={[styles.phoneText, { color: isDark ? '#8696A0' : '#334155' }]}>📞 {item.contactPhone}</Text>
                </View>
              ) : null}

              {item.whatsappLine?.name ? (
                <View style={[styles.lineBadge, isDark && { backgroundColor: 'rgba(0,168,132,0.15)', borderColor: 'rgba(0,168,132,0.3)' }]}>
                  <Text style={[styles.lineBadgeText, isDark && { color: '#00A884' }]} numberOfLines={1}>
                    {item.whatsappLine.name}
                  </Text>
                </View>
              ) : null}
            </View>

            {item.companyName && (
              <View style={styles.companyRow}>
                <Building size={12} color={colors.textSecondary} style={{ marginRight: 4 }} />
                <Text style={[styles.companyName, { color: colors.textSecondary }]} numberOfLines={1}>{item.companyName}</Text>
              </View>
            )}

          <View style={styles.lastMessageRow}>
            <View style={styles.lastMessageLeft}>
              {renderStatusCheck(item.lastMessageStatus, item.lastMessageSenderType)}
              <Text style={[styles.lastMessageText, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.lastMessage || 'Conversación iniciada'}
              </Text>
            </View>

            {/* Badge de No Leídos */}
            {item.unreadCount > 0 && (
              <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.unreadCountText}>{item.unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const userRole = String(user?.role || '').toUpperCase();
  const isAdmin = userRole === 'ADMIN' || userRole === 'ADMINISTRADOR' || userRole === 'SUPERADMIN';

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      
      {/* Barra Superior WhatsApp / CRM */}
      <View style={[styles.topHeader, { backgroundColor: colors.headerBg }]}>
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

        {/* Botones de Cabecera: Modo Oscuro, Admin y Logout */}
        <View style={styles.topHeaderActions}>
          <TouchableOpacity
            style={styles.headerActionBtn}
            onPress={toggleTheme}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {isDark ? (
              <Sun size={20} color="#F59E0B" />
            ) : (
              <Moon size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>

          {isAdmin && (
            <TouchableOpacity
              style={styles.headerActionBtn}
              onPress={() => navigation.navigate('AdminMenu')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Sliders size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}

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
      <View style={[styles.searchSection, { backgroundColor: colors.surface, borderBottomColor: colors.borderSubtle }]}>
        <View style={[styles.searchBar, { backgroundColor: isDark ? '#202C33' : '#FFFFFF', borderColor: colors.borderSubtle }]}>
          <Search size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Buscar por nombre, teléfono o empresa..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />
        </View>
      </View>

      {/* Tabs de Filtro */}
      <View style={[styles.tabsContainer, { backgroundColor: colors.surface, borderBottomColor: colors.borderSubtle }]}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            { backgroundColor: isDark ? '#202C33' : '#F1F5F9' },
            activeTab === 'all' && (isDark ? { backgroundColor: 'rgba(0,168,132,0.2)' } : styles.tabButtonActive),
          ]}
          onPress={() => setActiveTab('all')}
        >
          <Text
            style={[
              styles.tabText,
              { color: colors.textSecondary },
              activeTab === 'all' && (isDark ? { color: '#00A884', fontWeight: '700' } : styles.tabTextActive),
            ]}
          >
            Todos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            { backgroundColor: isDark ? '#202C33' : '#F1F5F9' },
            activeTab === 'unread' && (isDark ? { backgroundColor: 'rgba(0,168,132,0.2)' } : styles.tabButtonActive),
          ]}
          onPress={() => setActiveTab('unread')}
        >
          <Text
            style={[
              styles.tabText,
              { color: colors.textSecondary },
              activeTab === 'unread' && (isDark ? { color: '#00A884', fontWeight: '700' } : styles.tabTextActive),
            ]}
          >
            No leídos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            { backgroundColor: isDark ? '#202C33' : '#F1F5F9' },
            activeTab === 'my_chats' && (isDark ? { backgroundColor: 'rgba(0,168,132,0.2)' } : styles.tabButtonActive),
          ]}
          onPress={() => setActiveTab('my_chats')}
        >
          <Text
            style={[
              styles.tabText,
              { color: colors.textSecondary },
              activeTab === 'my_chats' && (isDark ? { color: '#00A884', fontWeight: '700' } : styles.tabTextActive),
            ]}
          >
            Mis Chats
          </Text>
        </TouchableOpacity>
      </View>

      {/* Lista de Chats con FlashList */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Sincronizando chats...</Text>
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
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MessageSquare size={48} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Sin conversaciones</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>No hay mensajes en esta bandeja de entrada</Text>
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
  contactMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 3,
  },
  phoneBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  phoneText: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '600',
  },
  lineBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    maxWidth: 150,
  },
  lineBadgeText: {
    fontSize: 10,
    color: '#059669',
    fontWeight: '700',
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
