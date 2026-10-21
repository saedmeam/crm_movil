import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import {
  ArrowLeft,
  Plus,
  MessageSquareQuote,
  Edit2,
  Trash2,
  Check,
  X,
  Search,
  Zap,
} from 'lucide-react-native';
import { adminService, Snippet } from '../../api/admin.service';

interface Props {
  navigation: any;
}

export const SnippetsManagementScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [fullSettings, setFullSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<Snippet>({
    id: '',
    title: '',
    content: '',
    shortcut: '',
  });

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminService.getSettings();
      setFullSettings(data || {});
      setSnippets(data?.snippets || []);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'No se pudieron cargar las respuestas rápidas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const filteredSnippets = snippets.filter((s) => {
    return (
      s.title?.toLowerCase().includes(search.toLowerCase()) ||
      s.content?.toLowerCase().includes(search.toLowerCase()) ||
      s.shortcut?.toLowerCase().includes(search.toLowerCase())
    );
  });

  const openCreateModal = () => {
    setForm({
      id: '',
      title: '',
      content: '',
      shortcut: '',
    });
    setModalVisible(true);
  };

  const openEditModal = (item: Snippet) => {
    setForm({ ...item });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      Alert.alert('Campos requeridos', 'Título y Contenido son obligatorios.');
      return;
    }

    try {
      setIsSubmitting(true);
      let updatedSnippets: Snippet[] = [];

      if (form.id) {
        updatedSnippets = snippets.map((s) => (s.id === form.id ? form : s));
      } else {
        const newSnippet: Snippet = {
          ...form,
          id: `snippet_${Date.now()}`,
          shortcut: form.shortcut?.trim() ? form.shortcut.trim().toLowerCase() : undefined,
        };
        updatedSnippets = [...snippets, newSnippet];
      }

      await adminService.updateSettings({
        ...fullSettings,
        snippets: updatedSnippets,
      });

      setSnippets(updatedSnippets);
      setModalVisible(false);
      Alert.alert('Éxito', form.id ? 'Respuesta rápida actualizada' : 'Respuesta rápida creada');
    } catch (err: any) {
      Alert.alert('Error', 'No se pudo guardar la respuesta rápida');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string, title: string) => {
    Alert.alert(
      '¿Eliminar Respuesta Rápida?',
      `¿Deseas eliminar "${title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedSnippets = snippets.filter((s) => s.id !== id);
              await adminService.updateSettings({
                ...fullSettings,
                snippets: updatedSnippets,
              });
              setSnippets(updatedSnippets);
            } catch (err: any) {
              Alert.alert('Error', 'No se pudo eliminar la respuesta rápida');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: Snippet }) => {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleWrap}>
            <Text style={styles.snippetTitle}>{item.title}</Text>
            {item.shortcut ? (
              <View style={styles.shortcutBadge}>
                <Zap size={12} color="#D97706" />
                <Text style={styles.shortcutText}>/{item.shortcut}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => openEditModal(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Edit2 size={16} color="#0284C7" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => handleDelete(item.id, item.title)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Trash2 size={16} color="#DC2626" />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.snippetContent} numberOfLines={3}>
          {item.content}
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Respuestas Rápidas</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openCreateModal}>
          <Plus size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Buscador */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Search size={18} color="#64748B" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar atajo o texto..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <X size={18} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Lista */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#075E54" />
          <Text style={styles.loadingText}>Cargando respuestas rápidas...</Text>
        </View>
      ) : (
        <View style={{ flex: 1, paddingHorizontal: 16 }}>
          <FlashList
            data={filteredSnippets}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingVertical: 14, paddingBottom: insets.bottom + 20 }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MessageSquareQuote size={48} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>Sin respuestas rápidas</Text>
                <Text style={styles.emptySubtitle}>Agrega plantillas predefinidas para responder más rápido</Text>
              </View>
            }
          />
        </View>
      )}

      {/* Modal Crear / Editar */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {form.id ? 'Editar Respuesta Rápida' : 'Nueva Respuesta Rápida'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.label}>Título / Asunto *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Ej. Saludo Inicial, Datos de Pago..."
                placeholderTextColor="#94A3B8"
                value={form.title}
                onChangeText={(t) => setForm({ ...form, title: t })}
              />

              <Text style={styles.label}>Atajo (ej. hola para usar /hola)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Ej. saludo"
                placeholderTextColor="#94A3B8"
                value={form.shortcut || ''}
                onChangeText={(t) => setForm({ ...form, shortcut: t })}
                autoCapitalize="none"
              />

              <Text style={styles.label}>Contenido del Mensaje *</Text>
              <TextInput
                style={[styles.modalInput, { height: 110, textAlignVertical: 'top' }]}
                placeholder="Escribe el mensaje completo que se enviará al cliente..."
                placeholderTextColor="#94A3B8"
                multiline
                value={form.content}
                onChangeText={(t) => setForm({ ...form, content: t })}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSave}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Check size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.saveBtnText}>Guardar</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#075E54',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    marginLeft: 8,
  },
  addBtn: {
    backgroundColor: '#128C7E',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1E293B',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#64748B',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitleWrap: {
    flex: 1,
    marginRight: 8,
  },
  snippetTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  shortcutBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
    gap: 4,
  },
  shortcutText: {
    fontSize: 11,
    color: '#B45309',
    fontWeight: '700',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 6,
  },
  actionBtn: {
    padding: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
  },
  snippetContent: {
    fontSize: 13,
    color: '#475569',
    marginTop: 8,
    lineHeight: 18,
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
    maxHeight: '90%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalBody: {
    maxHeight: 400,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
    marginTop: 10,
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#0F172A',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#475569',
    fontWeight: '600',
    fontSize: 14,
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#075E54',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
