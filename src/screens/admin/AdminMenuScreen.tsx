import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  Sliders,
  PhoneCall,
  MessageSquareQuote,
  Kanban,
  ShieldAlert,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react-native';
import { AppStackParamList } from '../../navigation/types';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

type AdminMenuNavProp = NativeStackNavigationProp<AppStackParamList, 'AdminMenu'>;

interface Props {
  navigation: AdminMenuNavProp;
}

export const AdminMenuScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { isDark, colors } = useTheme();

  const userRole = String(user?.role || '').toUpperCase();
  const isAdmin = userRole === 'ADMIN' || userRole === 'ADMINISTRADOR' || userRole === 'SUPERADMIN';

  const menuSections = [
    {
      title: 'Parametrización del Sistema',
      subtitle: 'Configuración de catálogos y datos maestros',
      items: [
        {
          title: 'Parámetros y Catálogos',
          desc: 'Clientes, Equipos, Tareas, Incidencias, Proveedores y Mnemónicos',
          icon: Sliders,
          color: '#2563EB',
          screen: 'ParametersManagement' as const,
        },
      ],
    },
    {
      title: 'Control Operativo del CRM',
      subtitle: 'Ajustes operativos de mensajería y flujo de ventas',
      items: [
        {
          title: 'Líneas de WhatsApp',
          desc: 'Estado, proveedores (QR Baileys / Meta Cloud API) y activación',
          icon: PhoneCall,
          color: '#059669',
          screen: 'WhatsAppLinesManagement' as const,
        },
        {
          title: 'Respuestas Rápidas (Snippets)',
          desc: 'Plantillas de respuestas pregrabadas con atajos /',
          icon: MessageSquareQuote,
          color: '#D97706',
          screen: 'SnippetsManagement' as const,
        },
        {
          title: 'Etapas de Embudo (Kanban)',
          desc: 'Personalizar las etapas del pipeline de ventas y colores',
          icon: Kanban,
          color: '#7C3AED',
          screen: 'KanbanSettingsManagement' as const,
        },
        {
          title: 'Roles y Permisos',
          desc: 'Control de accesos a pantallas y visibilidad de chats',
          icon: ShieldAlert,
          color: '#DC2626',
          screen: 'RolesManagement' as const,
        },
      ],
    },
  ];

  if (!isAdmin) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Acceso Restringido</Text>
          </View>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <ShieldAlert size={64} color="#EF4444" style={{ marginBottom: 16 }} />
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 8, textAlign: 'center' }}>
            Permiso Insuficiente
          </Text>
          <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 }}>
            Solo los usuarios con rol de Administrador pueden acceder a la configuración del sistema.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Panel de Administración</Text>
          <Text style={styles.headerSubtitle}>
            Usuario: {user?.name} ({user?.role || 'ADMINISTRADOR'})
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {menuSections.map((section, sIdx) => (
          <View key={sIdx} style={styles.sectionWrap}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{section.title}</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>{section.subtitle}</Text>
            </View>

            <View style={[styles.cardsWrap, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
              {section.items.map((item, iIdx) => {
                const Icon = item.icon;
                return (
                  <TouchableOpacity
                    key={iIdx}
                    style={[styles.menuCard, { borderBottomColor: colors.borderSubtle }]}
                    activeOpacity={0.7}
                    onPress={() => navigation.navigate(item.screen)}
                  >
                    <View style={[styles.iconWrap, { backgroundColor: `${item.color}15` }]}>
                      <Icon size={24} color={item.color} />
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{item.title}</Text>
                      <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>{item.desc}</Text>
                    </View>
                    <ChevronRight size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        <View style={styles.footerNote}>
          <ShieldCheck size={16} color={colors.textMuted} />
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            Todos los cambios se reflejan instantáneamente en el backend y la web.
          </Text>
        </View>
      </ScrollView>
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
  },
  backBtn: {
    padding: 6,
    marginRight: 8,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#D1FAE5',
    marginTop: 2,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionWrap: {
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  cardsWrap: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardInfo: {
    flex: 1,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  cardDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
    lineHeight: 16,
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 6,
  },
  footerText: {
    fontSize: 12,
    color: '#64748B',
  },
});
