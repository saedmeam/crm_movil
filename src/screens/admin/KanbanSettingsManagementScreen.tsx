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
  Kanban,
  Edit2,
  Trash2,
  Check,
  X,
  Palette,
} from 'lucide-react-native';
import { adminService, PipelineStage } from '../../api/admin.service';

interface Props {
  navigation: any;
}

const PRESET_COLORS = [
  '#3b82f6', // Azul
  '#eab308', // Amarillo
  '#22c55e', // Verde
  '#ef4444', // Rojo
  '#8b5cf6', // Morado
  '#ec4899', // Rosa
  '#f97316', // Naranja
  '#06b6d4', // Cyan
];

export const KanbanSettingsManagementScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [fullSettings, setFullSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);

  // Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<PipelineStage>({
    id: '',
    name: '',
    color: '#3b82f6',
  });

  const loadStages = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminService.getSettings();
      setFullSettings(data || {});
      setStages(data?.pipelineStages || []);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'No se pudieron cargar las etapas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStages();
  }, [loadStages]);

  const openCreateModal = () => {
    setForm({
      id: '',
      name: '',
      color: '#3b82f6',
    });
    setModalVisible(true);
  };

  const openEditModal = (item: PipelineStage) => {
    setForm({ ...item });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Campo requerido', 'El nombre de la etapa es obligatorio.');
      return;
    }

    try {
      setIsSubmitting(true);
      let updatedStages: PipelineStage[] = [];

      if (form.id) {
        updatedStages = stages.map((s) => (s.id === form.id ? form : s));
      } else {
        const idGenerated = form.name.trim().toUpperCase().replace(/\s+/g, '_') + '_' + Date.now();
        const newStage: PipelineStage = {
          ...form,
          id: idGenerated,
        };
        updatedStages = [...stages, newStage];
      }

      await adminService.updateSettings({
        ...fullSettings,
        pipelineStages: updatedStages,
      });

      setStages(updatedStages);
      setModalVisible(false);
      Alert.alert('Éxito', form.id ? 'Etapa actualizada' : 'Etapa creada');
    } catch (err: any) {
      Alert.alert('Error', 'No se pudo guardar la etapa');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      '¿Eliminar Etapa?',
      `¿Deseas eliminar la etapa "${name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedStages = stages.filter((s) => s.id !== id);
              await adminService.updateSettings({
                ...fullSettings,
                pipelineStages: updatedStages,
              });
              setStages(updatedStages);
            } catch (err: any) {
              Alert.alert('Error', 'No se pudo eliminar la etapa');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: PipelineStage }) => {
    return (
      <View style={styles.card}>
        <View style={styles.cardLeft}>
          <View style={[styles.colorIndicator, { backgroundColor: item.color }]} />
          <View>
            <Text style={styles.stageName}>{item.name}</Text>
            <Text style={styles.stageId}>{item.id}</Text>
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
        <Text style={styles.headerTitle}>Etapas de Embudo (Kanban)</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openCreateModal}>
          <Plus size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Lista */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#075E54" />
          <Text style={styles.loadingText}>Cargando etapas...</Text>
        </View>
      ) : (
        <View style={{ flex: 1, paddingHorizontal: 16 }}>
          <FlashList
            data={stages}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingVertical: 14, paddingBottom: insets.bottom + 20 }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Kanban size={48} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>Sin etapas configuradas</Text>
                <Text style={styles.emptySubtitle}>Agrega etapas del pipeline comercial</Text>
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
                {form.id ? 'Editar Etapa' : 'Nueva Etapa'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.label}>Nombre de la Etapa *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Ej. Propuesta Enviada, Cierre..."
                placeholderTextColor="#94A3B8"
                value={form.name}
                onChangeText={(t) => setForm({ ...form, name: t })}
              />

              <Text style={styles.label}>Color Identificador</Text>
              <View style={styles.colorPalette}>
                {PRESET_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.colorCircle,
                      { backgroundColor: c },
                      form.color === c && styles.colorCircleSelected,
                    ]}
                    onPress={() => setForm({ ...form, color: c })}
                  >
                    {form.color === c && <Check size={16} color="#FFFFFF" />}
                  </TouchableOpacity>
                ))}
              </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  colorIndicator: {
    width: 14,
    height: 36,
    borderRadius: 7,
  },
  stageName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  stageId: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
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
  colorPalette: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
    marginBottom: 12,
  },
  colorCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorCircleSelected: {
    borderWidth: 3,
    borderColor: '#0F172A',
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
