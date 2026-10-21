import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Search,
  Edit2,
  Trash2,
  FolderTree,
  Tag,
  Hash,
  X,
  Check,
} from 'lucide-react-native';
import { adminService, ParameterItem, ParameterPayload } from '../../api/admin.service';

interface Props {
  navigation: any;
}

export const ParametersManagementScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  const [parameters, setParameters] = useState<ParameterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedParentFilter, setSelectedParentFilter] = useState<string>('ALL');

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<ParameterPayload>({
    id: '',
    parentId: null,
    mnemonic: '',
    name: '',
    value: '',
    description: '',
    numericValue: '',
    status: 'A',
  });

  const loadParameters = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminService.getParameters();
      setParameters(data);
    } catch (err: any) {
      Alert.alert('Error', 'No se pudieron cargar los parámetros: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadParameters();
  }, [loadParameters]);

  // Lista de parámetros raíz para asociar como padres
  const rootParameters = useMemo(() => {
    return parameters.filter((p) => !p.parentId || p.parentId === '0');
  }, [parameters]);

  // Parámetros filtrados
  const filteredParameters = useMemo(() => {
    return parameters.filter((p) => {
      const matchSearch =
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.mnemonic?.toLowerCase().includes(search.toLowerCase()) ||
        p.value?.toLowerCase().includes(search.toLowerCase());

      if (!matchSearch) return false;

      if (selectedParentFilter === 'ROOTS') {
        return !p.parentId || p.parentId === '0';
      }
      if (selectedParentFilter !== 'ALL') {
        return p.parentId === selectedParentFilter;
      }
      return true;
    });
  }, [parameters, search, selectedParentFilter]);

  const openCreateModal = (presetParentId?: string) => {
    setForm({
      id: '',
      parentId: presetParentId || null,
      mnemonic: '',
      name: '',
      value: '',
      description: '',
      numericValue: '',
      status: 'A',
    });
    setModalVisible(true);
  };

  const openEditModal = (item: ParameterItem) => {
    setForm({
      id: item.id,
      parentId: item.parentId || null,
      mnemonic: item.mnemonic || '',
      name: item.name || '',
      value: item.value || '',
      description: item.description || '',
      numericValue: item.numericValue !== null && item.numericValue !== undefined ? String(item.numericValue) : '',
      status: item.status || 'A',
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Campo requerido', 'El nombre del parámetro es obligatorio.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: ParameterPayload = {
        ...form,
        name: form.name.trim(),
        mnemonic: form.mnemonic?.trim() ? form.mnemonic.trim().toUpperCase() : undefined,
        value: form.value?.trim() || undefined,
        description: form.description?.trim() || undefined,
        numericValue: form.numericValue ? parseFloat(String(form.numericValue)) : undefined,
        parentId: form.parentId === '0' || !form.parentId ? null : form.parentId,
      };

      if (form.id) {
        await adminService.updateParameter(form.id, payload);
      } else {
        await adminService.createParameter(payload);
      }

      setModalVisible(false);
      loadParameters();
      Alert.alert('Éxito', form.id ? 'Parámetro actualizado' : 'Parámetro creado');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'No se pudo guardar el parámetro');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      '¿Eliminar Parámetro?',
      `¿Deseas eliminar "${name}" del sistema?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminService.deleteParameter(id);
              loadParameters();
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.error || 'No se pudo eliminar el parámetro');
            }
          },
        },
      ]
    );
  };

  const getParentName = (parentId?: string | null) => {
    if (!parentId || parentId === '0') return 'Raíz (Principal)';
    const parent = parameters.find((p) => p.id === parentId);
    return parent ? parent.name : 'Desconocido';
  };

  const renderItem = ({ item }: { item: ParameterItem }) => {
    const isRoot = !item.parentId || item.parentId === '0';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleWrap}>
            <Text style={styles.itemName}>{item.name}</Text>
            {item.mnemonic ? (
              <View style={styles.mnemonicBadge}>
                <Tag size={12} color="#2563EB" />
                <Text style={styles.mnemonicText}>{item.mnemonic}</Text>
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
              onPress={() => handleDelete(item.id, item.name)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Trash2 size={16} color="#DC2626" />
            </TouchableOpacity>
          </View>
        </View>

        {item.description ? (
          <Text style={styles.itemDesc}>{item.description}</Text>
        ) : null}

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <FolderTree size={13} color="#64748B" />
            <Text style={styles.metaText}>{getParentName(item.parentId)}</Text>
          </View>

          {item.value ? (
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Valor:</Text>
              <Text style={styles.metaValue}>{item.value}</Text>
            </View>
          ) : null}

          {item.numericValue !== null && item.numericValue !== undefined ? (
            <View style={styles.metaItem}>
              <Hash size={13} color="#64748B" />
              <Text style={styles.metaValue}>{item.numericValue}</Text>
            </View>
          ) : null}
        </View>

        {isRoot && (
          <TouchableOpacity
            style={styles.subItemBtn}
            onPress={() => openCreateModal(item.id)}
          >
            <Plus size={14} color="#059669" />
            <Text style={styles.subItemBtnText}>Agregar Hijo a {item.name}</Text>
          </TouchableOpacity>
        )}
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
        <Text style={styles.headerTitle}>Parámetros y Catálogos</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => openCreateModal()}>
          <Plus size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Buscador */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Search size={18} color="#64748B" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre, mnemónico o valor..."
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

        {/* Filtros de Padre */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <TouchableOpacity
            style={[styles.filterChip, selectedParentFilter === 'ALL' && styles.filterChipActive]}
            onPress={() => setSelectedParentFilter('ALL')}
          >
            <Text style={[styles.filterChipText, selectedParentFilter === 'ALL' && styles.filterChipTextActive]}>
              Todos ({parameters.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, selectedParentFilter === 'ROOTS' && styles.filterChipActive]}
            onPress={() => setSelectedParentFilter('ROOTS')}
          >
            <Text style={[styles.filterChipText, selectedParentFilter === 'ROOTS' && styles.filterChipTextActive]}>
              Solo Raíces ({rootParameters.length})
            </Text>
          </TouchableOpacity>

          {rootParameters.map((root) => (
            <TouchableOpacity
              key={root.id}
              style={[styles.filterChip, selectedParentFilter === root.id && styles.filterChipActive]}
              onPress={() => setSelectedParentFilter(root.id)}
            >
              <Text style={[styles.filterChipText, selectedParentFilter === root.id && styles.filterChipTextActive]}>
                {root.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Lista */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#075E54" />
          <Text style={styles.loadingText}>Cargando parámetros...</Text>
        </View>
      ) : (
        <View style={{ flex: 1, paddingHorizontal: 16 }}>
          <FlashList
            data={filteredParameters}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>No hay parámetros</Text>
                <Text style={styles.emptySubtitle}>No se encontraron parámetros con ese filtro.</Text>
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
                {form.id ? 'Editar Parámetro' : 'Nuevo Parámetro'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Parámetro Padre */}
              <Text style={styles.label}>Parámetro Padre</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.parentSelectScroll}>
                <TouchableOpacity
                  style={[styles.parentOption, (!form.parentId || form.parentId === '0') && styles.parentOptionActive]}
                  onPress={() => setForm({ ...form, parentId: null })}
                >
                  <Text style={[styles.parentOptionText, (!form.parentId || form.parentId === '0') && styles.parentOptionTextActive]}>
                    Raíz (Sin Padre)
                  </Text>
                </TouchableOpacity>
                {rootParameters
                  .filter((p) => p.id !== form.id)
                  .map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.parentOption, form.parentId === p.id && styles.parentOptionActive]}
                      onPress={() => setForm({ ...form, parentId: p.id })}
                    >
                      <Text style={[styles.parentOptionText, form.parentId === p.id && styles.parentOptionTextActive]}>
                        {p.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </ScrollView>

              {/* Nombre */}
              <Text style={styles.label}>Nombre *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Ej. Clientes SM, Reparación Pantalla..."
                placeholderTextColor="#94A3B8"
                value={form.name}
                onChangeText={(t) => setForm({ ...form, name: t })}
              />

              {/* Mnemónico */}
              <Text style={styles.label}>Mnemónico (Código único opcional)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Ej. CLIENTES_SM, SISTEMA_PANTALLAS"
                placeholderTextColor="#94A3B8"
                value={form.mnemonic || ''}
                onChangeText={(t) => setForm({ ...form, mnemonic: t.toUpperCase() })}
                autoCapitalize="characters"
              />

              {/* Valor */}
              <Text style={styles.label}>Valor (Texto o ID Técnico)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Ej. /admin/equipos o identificador"
                placeholderTextColor="#94A3B8"
                value={form.value || ''}
                onChangeText={(t) => setForm({ ...form, value: t })}
              />

              {/* Valor Numérico */}
              <Text style={styles.label}>Valor Numérico (Opcional)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Ej. 10.5"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={form.numericValue ? String(form.numericValue) : ''}
                onChangeText={(t) => setForm({ ...form, numericValue: t })}
              />

              {/* Descripción */}
              <Text style={styles.label}>Descripción</Text>
              <TextInput
                style={[styles.modalInput, { height: 70, textAlignVertical: 'top' }]}
                placeholder="Detalle o propósito de este parámetro..."
                placeholderTextColor="#94A3B8"
                multiline
                value={form.description || ''}
                onChangeText={(t) => setForm({ ...form, description: t })}
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
  filterScroll: {
    flexDirection: 'row',
    marginTop: 10,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#075E54',
  },
  filterChipText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
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
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
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
  itemName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  mnemonicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
    gap: 4,
  },
  mnemonicText: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtn: {
    padding: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
  },
  itemDesc: {
    fontSize: 13,
    color: '#475569',
    marginTop: 6,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  metaText: {
    fontSize: 12,
    color: '#64748B',
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  subItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingVertical: 6,
    backgroundColor: '#ECFDF5',
    borderRadius: 6,
    gap: 4,
  },
  subItemBtnText: {
    fontSize: 12,
    color: '#059669',
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
  parentSelectScroll: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  parentOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  parentOptionActive: {
    backgroundColor: '#075E54',
    borderColor: '#075E54',
  },
  parentOptionText: {
    fontSize: 12,
    color: '#64748B',
  },
  parentOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
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
