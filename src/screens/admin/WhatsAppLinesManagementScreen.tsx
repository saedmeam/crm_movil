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
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import {
  ArrowLeft,
  Plus,
  PhoneCall,
  QrCode,
  Globe,
  Trash2,
  Edit2,
  Check,
  X,
  Power,
  RotateCcw,
} from 'lucide-react-native';
import { adminService, WhatsAppLine } from '../../api/admin.service';

interface Props {
  navigation: any;
}

export const WhatsAppLinesManagementScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  const [lines, setLines] = useState<WhatsAppLine[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Crear / Editar
  const [modalVisible, setModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<Partial<WhatsAppLine>>({
    id: '',
    name: '',
    providerType: 'QR_BAILEYS',
    phoneNumberId: '',
    wabaId: '',
    active: true,
  });

  const loadLines = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminService.getLines(true);
      setLines(data);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'No se pudieron cargar las líneas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLines();
  }, [loadLines]);

  const openCreateModal = () => {
    setForm({
      id: '',
      name: '',
      providerType: 'QR_BAILEYS',
      phoneNumberId: '',
      wabaId: '',
      active: true,
    });
    setModalVisible(true);
  };

  const openEditModal = (line: WhatsAppLine) => {
    setForm({
      id: line.id,
      name: line.name,
      providerType: line.providerType || 'QR_BAILEYS',
      phoneNumberId: line.phoneNumberId || '',
      wabaId: line.wabaId || '',
      active: line.active !== false,
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.name?.trim()) {
      Alert.alert('Campo requerido', 'El nombre de la línea es obligatorio.');
      return;
    }

    try {
      setIsSubmitting(true);
      if (form.id) {
        await adminService.updateLine(form.id, form);
      } else {
        await adminService.createLine(form);
      }
      setModalVisible(false);
      loadLines();
      Alert.alert('Éxito', form.id ? 'Línea actualizada' : 'Línea creada');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'No se pudo guardar la línea');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (line: WhatsAppLine) => {
    try {
      const nextActive = !line.active;
      await adminService.updateLine(line.id, { active: nextActive });
      setLines((prev) =>
        prev.map((l) => (l.id === line.id ? { ...l, active: nextActive } : l))
      );
    } catch (err: any) {
      Alert.alert('Error', 'No se pudo cambiar el estado de la línea');
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      '¿Eliminar Línea?',
      `¿Deseas eliminar la línea "${name}"? Esta acción desvinculará los chats de esta línea.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminService.deleteLine(id);
              loadLines();
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.error || 'No se pudo eliminar la línea');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: WhatsAppLine }) => {
    const isQr = item.providerType === 'QR_BAILEYS';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleWrap}>
            <Text style={styles.lineName}>{item.name}</Text>
            <View style={[styles.typeBadge, { backgroundColor: isQr ? '#FEF3C7' : '#DBEAFE' }]}>
              {isQr ? <QrCode size={12} color="#D97706" /> : <Globe size={12} color="#2563EB" />}
              <Text style={[styles.typeBadgeText, { color: isQr ? '#B45309' : '#1D4ED8' }]}>
                {isQr ? 'WhatsApp QR (Baileys)' : 'Meta Cloud API'}
              </Text>
            </View>
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
              onPress={() => handleDelete(item.id, item.name)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Trash2 size={16} color="#DC2626" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Detalles de la línea */}
        <View style={styles.detailsRow}>
          {item.phoneNumberId ? (
            <Text style={styles.detailText}>ID Teléfono: {item.phoneNumberId}</Text>
          ) : null}
          {item.status ? (
            <Text style={styles.detailText}>Estado: {item.status}</Text>
          ) : null}
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.activeRow}>
            <Power size={14} color={item.active ? '#059669' : '#94A3B8'} />
            <Text style={[styles.activeStatusText, { color: item.active ? '#059669' : '#64748B' }]}>
              {item.active ? 'Línea Activa' : 'Inactiva'}
            </Text>
          </View>

          <Switch
            value={item.active !== false}
            onValueChange={() => handleToggleActive(item)}
            trackColor={{ false: '#CBD5E1', true: '#A7F3D0' }}
            thumbColor={item.active ? '#059669' : '#F1F5F9'}
          />
        </View>
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
        <Text style={styles.headerTitle}>Líneas de WhatsApp</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openCreateModal}>
          <Plus size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Lista */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#075E54" />
          <Text style={styles.loadingText}>Cargando líneas de WhatsApp...</Text>
        </View>
      ) : (
        <View style={{ flex: 1, paddingHorizontal: 16 }}>
          <FlashList
            data={lines}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingVertical: 14, paddingBottom: insets.bottom + 20 }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <PhoneCall size={48} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>Sin líneas configuradas</Text>
                <Text style={styles.emptySubtitle}>Agrega una línea pulsando el botón +</Text>
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
                {form.id ? 'Editar Línea' : 'Nueva Línea de WhatsApp'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.label}>Nombre de la Línea *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Ej. Soporte Técnico, Ventas 1..."
                placeholderTextColor="#94A3B8"
                value={form.name}
                onChangeText={(t) => setForm({ ...form, name: t })}
              />

              <Text style={styles.label}>Tipo de Conexión</Text>
              <View style={styles.providerOptions}>
                <TouchableOpacity
                  style={[
                    styles.providerOption,
                    form.providerType === 'QR_BAILEYS' && styles.providerOptionActive,
                  ]}
                  onPress={() => setForm({ ...form, providerType: 'QR_BAILEYS' })}
                >
                  <QrCode size={18} color={form.providerType === 'QR_BAILEYS' ? '#FFFFFF' : '#64748B'} />
                  <Text
                    style={[
                      styles.providerOptionText,
                      form.providerType === 'QR_BAILEYS' && styles.providerOptionTextActive,
                    ]}
                  >
                    WhatsApp Web (QR)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.providerOption,
                    form.providerType === 'META_CLOUD' && styles.providerOptionActive,
                  ]}
                  onPress={() => setForm({ ...form, providerType: 'META_CLOUD' })}
                >
                  <Globe size={18} color={form.providerType === 'META_CLOUD' ? '#FFFFFF' : '#64748B'} />
                  <Text
                    style={[
                      styles.providerOptionText,
                      form.providerType === 'META_CLOUD' && styles.providerOptionTextActive,
                    ]}
                  >
                    Meta Cloud API
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Phone Number ID / Identificador</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Ej. 1092837465 o QR_LINE_1"
                placeholderTextColor="#94A3B8"
                value={form.phoneNumberId || ''}
                onChangeText={(t) => setForm({ ...form, phoneNumberId: t })}
              />

              {form.providerType === 'META_CLOUD' && (
                <>
                  <Text style={styles.label}>WABA ID (WhatsApp Business Account)</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Ej. 1406360574269503"
                    placeholderTextColor="#94A3B8"
                    value={form.wabaId || ''}
                    onChangeText={(t) => setForm({ ...form, wabaId: t })}
                  />
                </>
              )}
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
  lineName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
    gap: 4,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
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
  detailsRow: {
    marginTop: 10,
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#64748B',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeStatusText: {
    fontSize: 13,
    fontWeight: '600',
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
  providerOptions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 6,
  },
  providerOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  providerOptionActive: {
    backgroundColor: '#075E54',
    borderColor: '#075E54',
  },
  providerOptionText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  providerOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
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
