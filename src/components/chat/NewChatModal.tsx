import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MessageSquarePlus, X, Send, Smartphone, ChevronDown, Check } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { adminService, WhatsAppLine } from '../../api/admin.service';
import { chatService } from '../../api/chat.service';
import { Conversation } from '../../types';

interface NewChatModalProps {
  visible: boolean;
  onClose: () => void;
  onChatCreated: (conversation: Conversation) => void;
  initialPhone?: string;
  initialName?: string;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({
  visible,
  onClose,
  onChatCreated,
  initialPhone = '',
  initialName = '',
}) => {
  const { isDark, colors } = useTheme();

  const [lines, setLines] = useState<WhatsAppLine[]>([]);
  const [loadingLines, setLoadingLines] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedLineId, setSelectedLineId] = useState('');
  const [showLineDropdown, setShowLineDropdown] = useState(false);
  const [phone, setPhone] = useState(initialPhone);
  const [name, setName] = useState(initialName);
  const [initialMessage, setInitialMessage] = useState('');

  useEffect(() => {
    if (visible) {
      setPhone(initialPhone);
      setName(initialName);
      setInitialMessage('');
      setShowLineDropdown(false);
      loadLines();
    }
  }, [visible, initialPhone, initialName]);

  const loadLines = async () => {
    try {
      setLoadingLines(true);
      const data = await adminService.getLines();
      const activeLines = data.filter((l) => l.active !== false);
      setLines(activeLines);
      if (activeLines.length > 0) {
        setSelectedLineId((prev) => prev && activeLines.some((l) => l.id === prev) ? prev : activeLines[0].id);
      }
    } catch (err) {
      console.warn('[NewChatModal] Error cargando líneas:', err);
    } finally {
      setLoadingLines(false);
    }
  };

  const handleStartChat = async () => {
    if (!selectedLineId) {
      Alert.alert('Línea requerida', 'Por favor selecciona la línea de WhatsApp desde la cual deseas escribir.');
      return;
    }
    if (!phone.trim()) {
      Alert.alert('Teléfono requerido', 'Ingresa el número de WhatsApp del destinatario.');
      return;
    }
    if (!initialMessage.trim()) {
      Alert.alert('Mensaje requerido', 'Debes escribir un mensaje inicial para iniciar la conversación.');
      return;
    }

    let cleanPhone = phone.trim().replace(/[^\d+]/g, '');
    if (!cleanPhone.startsWith('+')) {
      cleanPhone = cleanPhone.replace(/\D/g, '');
      // Si empieza con 0 y tiene 10 dígitos (formato estándar móvil Ecuador 09xxxxxxxx), cambiar por 5939xxxxxxxx
      if (cleanPhone.startsWith('0') && cleanPhone.length === 10) {
        cleanPhone = '593' + cleanPhone.substring(1);
      }
    } else {
      cleanPhone = cleanPhone.replace(/\D/g, '');
    }

    try {
      setIsSubmitting(true);
      const res = await chatService.startConversation({
        whatsappLineId: selectedLineId,
        phone: cleanPhone,
        name: name.trim() || undefined,
        initialMessage: initialMessage.trim(),
      });

      onClose();
      onChatCreated(res.conversation);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'No se pudo iniciar el chat';
      Alert.alert('Error al iniciar chat', errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedLine = lines.find((l) => l.id === selectedLineId);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Cabecera */}
          <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.headerIconCircle, { backgroundColor: isDark ? 'rgba(0,168,132,0.15)' : '#D1FAE5' }]}>
                <MessageSquarePlus size={20} color={isDark ? '#00A884' : '#059669'} />
              </View>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Nuevo Chat</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            {/* 1. Selección de Línea con Combobox Dropdown */}
            <Text style={[styles.label, { color: colors.textPrimary }]}>1. Selecciona el número desde el que escribirás *</Text>
            {loadingLines ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 12 }} />
            ) : lines.length === 0 ? (
              <View style={styles.emptyLinesBox}>
                <Text style={styles.emptyLinesText}>No hay líneas activas disponibles.</Text>
              </View>
            ) : (
              <View style={styles.comboboxWrapper}>
                <TouchableOpacity
                  style={[
                    styles.comboboxTrigger,
                    {
                      backgroundColor: isDark ? '#202C33' : '#F8FAFC',
                      borderColor: showLineDropdown ? colors.primary : (isDark ? '#374248' : '#CBD5E1'),
                    },
                  ]}
                  onPress={() => setShowLineDropdown(!showLineDropdown)}
                  activeOpacity={0.7}
                >
                  <View style={styles.comboboxTriggerLeft}>
                    <Smartphone
                      size={18}
                      color={isDark ? '#34D399' : '#059669'}
                      style={{ marginRight: 8 }}
                    />
                    <Text style={[styles.comboboxSelectedText, { color: colors.textPrimary }]}>
                      {selectedLine
                        ? `${selectedLine.name} ${selectedLine.phoneNumberId ? `(${selectedLine.phoneNumberId})` : ''} - ${selectedLine.providerType === 'QR_BAILEYS' ? 'QR' : 'Cloud'}`
                        : 'Selecciona una línea'}
                    </Text>
                  </View>
                  <ChevronDown
                    size={18}
                    color={colors.textSecondary}
                    style={{ transform: [{ rotate: showLineDropdown ? '180deg' : '0deg' }] }}
                  />
                </TouchableOpacity>

                {showLineDropdown && (
                  <View
                    style={[
                      styles.dropdownMenu,
                      {
                        backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                        borderColor: isDark ? '#374151' : '#E2E8F0',
                      },
                    ]}
                  >
                    {lines.map((line) => {
                      const isSelected = selectedLineId === line.id;
                      return (
                        <TouchableOpacity
                          key={line.id}
                          style={[
                            styles.dropdownItem,
                            isSelected && {
                              backgroundColor: isDark ? 'rgba(0,168,132,0.15)' : '#ECFDF5',
                            },
                          ]}
                          onPress={() => {
                            setSelectedLineId(line.id);
                            setShowLineDropdown(false);
                          }}
                        >
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[
                                styles.dropdownItemTitle,
                                {
                                  color: isSelected
                                    ? (isDark ? '#34D399' : '#059669')
                                    : colors.textPrimary,
                                  fontWeight: isSelected ? '700' : '500',
                                },
                              ]}
                            >
                              {line.name}
                            </Text>
                            <Text style={[styles.dropdownItemSubtitle, { color: colors.textSecondary }]}>
                              {line.providerType === 'QR_BAILEYS' ? 'WhatsApp QR (Baileys)' : 'Meta Cloud API'}
                              {line.phoneNumberId ? ` • Tel: ${line.phoneNumberId}` : ''}
                            </Text>
                          </View>
                          {isSelected && (
                            <Check size={18} color={isDark ? '#34D399' : '#059669'} />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            )}

            {/* 2. Número de teléfono */}
            <Text style={[styles.label, { color: colors.textPrimary, marginTop: 14 }]}>
              2. Número de WhatsApp del destinatario *
            </Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: isDark ? '#202C33' : '#F8FAFC', color: colors.textPrimary, borderColor: colors.border },
              ]}
              placeholder="Ej: 0993995471 o +593993995471"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />

            {/* 3. Nombre del Contacto */}
            <Text style={[styles.label, { color: colors.textPrimary, marginTop: 14 }]}>
              3. Nombre del contacto (Opcional)
            </Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: isDark ? '#202C33' : '#F8FAFC', color: colors.textPrimary, borderColor: colors.border },
              ]}
              placeholder="Ej: Juan Pérez"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
            />

            {/* 4. Mensaje inicial */}
            <Text style={[styles.label, { color: colors.textPrimary, marginTop: 14 }]}>
              4. Mensaje inicial *
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                { backgroundColor: isDark ? '#202C33' : '#F8FAFC', color: colors.textPrimary, borderColor: colors.border },
              ]}
              placeholder="Escribe el mensaje con el que deseas iniciar la conversación..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              value={initialMessage}
              onChangeText={setInitialMessage}
            />
          </ScrollView>

          {/* Botones de Pie */}
          <View style={[styles.footer, { borderTopColor: colors.borderSubtle }]}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={isSubmitting}>
              <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.submitBtn,
                { backgroundColor: isDark ? '#00A884' : '#075E54' },
                isSubmitting && { opacity: 0.6 },
              ]}
              onPress={handleStartChat}
              disabled={isSubmitting || lines.length === 0}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Send size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.submitBtnText}>Iniciar Chat</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxHeight: '90%',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  body: {
    padding: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  comboboxWrapper: {
    marginBottom: 6,
    zIndex: 10,
  },
  comboboxTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  comboboxTriggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  comboboxSelectedText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  dropdownMenu: {
    marginTop: 6,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  dropdownItemTitle: {
    fontSize: 14,
  },
  dropdownItemSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyLinesBox: {
    padding: 10,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
  },
  emptyLinesText: {
    color: '#92400E',
    fontSize: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  textArea: {
    minHeight: 85,
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 10,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
