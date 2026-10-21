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
  Shield,
  Edit2,
  Trash2,
  Check,
  X,
  Eye,
  Lock,
} from 'lucide-react-native';
import { adminService, RoleItem } from '../../api/admin.service';

interface Props {
  navigation: any;
}

const AVAILABLE_SCREENS = [
  { id: '/', name: 'Chats Principales' },
  { id: '/recordatorios', name: 'Recordatorios' },
  { id: '/kanban', name: 'Embudo (Kanban)' },
  { id: '/contacts', name: 'Contactos' },
  { id: '/tickets-sm', name: 'Mesa de Ayuda (SM)' },
  { id: '/tickets-3d', name: 'Soporte 3D' },
  { id: '/backorders', name: 'Órdenes de Compra' },
  { id: '/admin/dashboard', name: 'Dashboard' },
  { id: '/admin/roles', name: 'Roles y Permisos' },
  { id: '/admin/users', name: 'Usuarios' },
  { id: '/admin/lines', name: 'Líneas WhatsApp' },
  { id: '/admin/parameters', name: 'Parámetros y Catálogos' },
  { id: '/admin/snippets', name: 'Respuestas Rápidas' },
  { id: '/admin/kanban-settings', name: 'Etapas Kanban' },
];

export const RolesManagementScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<{
    id: string;
    name: string;
    canViewAllChats: boolean;
    screenAccess: string[];
  }>({
    id: '',
    name: '',
    canViewAllChats: false,
    screenAccess: [],
  });

  const loadRoles = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminService.getRoles();
      setRoles(data);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'No se pudieron cargar los roles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const openCreateModal = () => {
    setForm({
      id: '',
      name: '',
      canViewAllChats: false,
      screenAccess: ['/'],
    });
    setModalVisible(true);
  };

  const openEditModal = (item: RoleItem) => {
    const screens = Array.isArray(item.screenAccess)
      ? item.screenAccess
      : typeof item.screenAccess === 'string'
      ? JSON.parse(item.screenAccess)
      : [];

    setForm({
      id: item.id,
      name: item.name,
      canViewAllChats: !!item.canViewAllChats,
      screenAccess: screens,
    });
    setModalVisible(true);
  };

  const toggleScreenAccess = (screenId: string) => {
    setForm((prev) => {
      const exists = prev.screenAccess.includes(screenId);
      return {
        ...prev,
        screenAccess: exists
          ? prev.screenAccess.filter((s) => s !== screenId)
          : [...prev.screenAccess, screenId],
      };
    });
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Campo requerido', 'El nombre del rol es obligatorio.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        name: form.name.trim().toUpperCase(),
        canViewAllChats: form.canViewAllChats,
        screenAccess: form.screenAccess,
      };

      if (form.id) {
        await adminService.updateRole(form.id, payload);
      } else {
        await adminService.createRole(payload);
      }

      setModalVisible(false);
      loadRoles();
      Alert.alert('Éxito', form.id ? 'Rol actualizado' : 'Rol creado');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'No se pudo guardar el rol');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      '¿Eliminar Rol?',
      `¿Deseas eliminar el rol "${name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminService.deleteRole(id);
              loadRoles();
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.error || 'No se pudo eliminar el rol');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: RoleItem }) => {
    const screens = Array.isArray(item.screenAccess)
      ? item.screenAccess
      : typeof item.screenAccess === 'string'
      ? JSON.parse(item.screenAccess)
      : [];

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleWrap}>
            <Text style={styles.roleName}>{item.name}</Text>
            <Text style={styles.userCount}>
              {item._count?.users || 0} usuarios asignados
            </Text>
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

        <View style={styles.badgeRow}>
          <View style={[styles.badge, item.canViewAllChats ? styles.badgeGreen : styles.badgeGray]}>
            <Eye size={12} color={item.canViewAllChats ? '#059669' : '#64748B'} />
            <Text style={[styles.badgeText, item.canViewAllChats ? styles.badgeTextGreen : styles.badgeTextGray]}>
              {item.canViewAllChats ? 'Ver todos los chats' : 'Solo chats asignados'}
            </Text>
          </View>

          <View style={[styles.badge, styles.badgeBlue]}>
            <Lock size={12} color="#2563EB" />
            <Text style={[styles.badgeText, styles.badgeTextBlue]}>
              {screens.length} pantallas permitidas
            </Text>
          </View>
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
        <Text style={styles.headerTitle}>Roles y Permisos</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openCreateModal}>
          <Plus size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Lista */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#075E54" />
          <Text style={styles.loadingText}>Cargando roles...</Text>
        </View>
      ) : (
        <View style={{ flex: 1, paddingHorizontal: 16 }}>
          <FlashList
            data={roles}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingVertical: 14, paddingBottom: insets.bottom + 20 }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Shield size={48} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>Sin roles configurados</Text>
                <Text style={styles.emptySubtitle}>Crea roles para gestionar permisos de usuarios</Text>
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
                {form.id ? 'Editar Rol' : 'Nuevo Rol'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.label}>Nombre del Rol *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Ej. ASESOR_SENIOR, SUPERVISOR..."
                placeholderTextColor="#94A3B8"
                value={form.name}
                onChangeText={(t) => setForm({ ...form, name: t.toUpperCase() })}
                autoCapitalize="characters"
              />

              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchLabel}>Ver todos los chats</Text>
                  <Text style={styles.switchDesc}>Permite supervisar chats de otros asesores</Text>
                </View>
                <Switch
                  value={form.canViewAllChats}
                  onValueChange={(val) => setForm({ ...form, canViewAllChats: val })}
                  trackColor={{ false: '#CBD5E1', true: '#A7F3D0' }}
                  thumbColor={form.canViewAllChats ? '#059669' : '#F1F5F9'}
                />
              </View>

              <Text style={[styles.label, { marginTop: 14 }]}>Acceso a Pantallas</Text>
              <View style={styles.screensWrap}>
                {AVAILABLE_SCREENS.map((sc) => {
                  const isChecked = form.screenAccess.includes(sc.id);
                  return (
                    <TouchableOpacity
                      key={sc.id}
                      style={[styles.screenItem, isChecked && styles.screenItemChecked]}
                      onPress={() => toggleScreenAccess(sc.id)}
                    >
                      <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                        {isChecked && <Check size={12} color="#FFFFFF" />}
                      </View>
                      <Text style={[styles.screenItemText, isChecked && styles.screenItemTextChecked]}>
                        {sc.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
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
  roleName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  userCount: {
    fontSize: 12,
    color: '#64748B',
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
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  badgeGreen: {
    backgroundColor: '#ECFDF5',
  },
  badgeGray: {
    backgroundColor: '#F1F5F9',
  },
  badgeBlue: {
    backgroundColor: '#EFF6FF',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  badgeTextGreen: {
    color: '#059669',
  },
  badgeTextGray: {
    color: '#64748B',
  },
  badgeTextBlue: {
    color: '#2563EB',
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  switchDesc: {
    fontSize: 12,
    color: '#64748B',
  },
  screensWrap: {
    gap: 8,
    marginTop: 6,
  },
  screenItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  screenItemChecked: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  screenItemText: {
    fontSize: 13,
    color: '#334155',
  },
  screenItemTextChecked: {
    fontWeight: '600',
    color: '#1E40AF',
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
