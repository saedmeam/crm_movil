import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';
import { Check, CheckCheck, FileText, Lock } from 'lucide-react-native';
import { Message } from '../../types';
import { AudioPlayerBubble } from './AudioPlayerBubble';
import { resolveMediaUrl } from '../../config/env';

interface MessageBubbleProps {
  message: Message;
  onImagePress?: (imageUrl: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onImagePress,
}) => {
  const senderTypeUpper = String(message.senderType || '').toUpperCase();
  const isAgent = senderTypeUpper === 'AGENT';
  const isInternalNote = message.isInternalNote || message.isInternal || senderTypeUpper === 'INTERNAL' || message.type === 'internal_note';

  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const renderChecks = () => {
    if (!isAgent || isInternalNote) return null;
    if (message.status === 'READ') {
      return <CheckCheck size={15} color="#34B7F1" style={styles.checkIcon} />;
    }
    if (message.status === 'DELIVERED') {
      return <CheckCheck size={15} color="#8696A0" style={styles.checkIcon} />;
    }
    return <Check size={15} color="#8696A0" style={styles.checkIcon} />;
  };

  const handleOpenLink = (url: string) => {
    Linking.openURL(url).catch((err) => console.warn('No se pudo abrir el enlace:', err));
  };

  return (
    <View
      style={[
        styles.container,
        isInternalNote
          ? styles.internalNoteWrapper
          : isAgent
          ? styles.agentWrapper
          : styles.clientWrapper,
      ]}
    >
      <View
        style={[
          styles.bubble,
          isInternalNote
            ? styles.internalNoteBubble
            : isAgent
            ? styles.agentBubble
            : styles.clientBubble,
        ]}
      >
        {/* Distintivo de Nota Interna */}
        {isInternalNote && (
          <View style={styles.internalBadge}>
            <Lock size={12} color="#854D0E" style={{ marginRight: 4 }} />
            <Text style={styles.internalBadgeText}>NOTA INTERNA DEL EQUIPO</Text>
          </View>
        )}

        {/* Contenido: Imagen */}
        {message.type === 'image' && message.mediaUrl && (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => onImagePress?.(resolveMediaUrl(message.mediaUrl))}
          >
            <Image
              source={{ uri: resolveMediaUrl(message.mediaUrl) }}
              style={styles.imageThumbnail}
              resizeMode="cover"
            />
          </TouchableOpacity>
        )}

        {/* Contenido: Nota de Voz */}
        {message.type === 'audio' && message.mediaUrl && (
          <AudioPlayerBubble
            mediaUrl={message.mediaUrl}
            duration={message.mediaDuration}
            isSender={isAgent}
          />
        )}

        {/* Contenido: Documento */}
        {message.type === 'document' && message.mediaUrl && (
          <TouchableOpacity
            style={styles.documentContainer}
            onPress={() => handleOpenLink(resolveMediaUrl(message.mediaUrl))}
          >
            <FileText size={24} color="#075E54" />
            <View style={styles.documentInfo}>
              <Text style={styles.documentName} numberOfLines={1}>
                {message.fileName || 'Documento adjunto'}
              </Text>
              <Text style={styles.documentSub}>Toca para abrir</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Contenido: Texto */}
        {message.content ? (
          <Text
            style={[
              styles.messageText,
              isInternalNote && styles.internalNoteText,
            ]}
          >
            {message.content}
          </Text>
        ) : null}

        {/* Metadata de pie: Hora y Checks */}
        <View style={styles.metaRow}>
          <Text style={styles.timeText}>{formatTime(message.createdAt)}</Text>
          {renderChecks()}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    marginVertical: 3,
    flexDirection: 'row',
  },
  clientWrapper: {
    justifyContent: 'flex-start',
  },
  agentWrapper: {
    justifyContent: 'flex-end',
  },
  internalNoteWrapper: {
    justifyContent: 'center',
    marginVertical: 6,
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  clientBubble: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 2,
  },
  agentBubble: {
    backgroundColor: '#D9FDD3', // Verde clásico de WhatsApp para mensajes enviados
    borderTopRightRadius: 2,
  },
  internalNoteBubble: {
    backgroundColor: '#FEF9C3', // Amarillo pastel corporativo
    borderColor: '#FDE047',
    borderWidth: 1,
    maxWidth: '90%',
  },
  internalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#FEF08A',
    paddingBottom: 2,
  },
  internalBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#854D0E',
    letterSpacing: 0.5,
  },
  messageText: {
    fontSize: 15,
    color: '#111B21',
    lineHeight: 20,
  },
  internalNoteText: {
    color: '#713F12',
    fontStyle: 'italic',
  },
  imageThumbnail: {
    width: 240,
    height: 180,
    borderRadius: 8,
    marginBottom: 6,
  },
  documentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.04)',
    padding: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  documentInfo: {
    marginLeft: 8,
    flex: 1,
  },
  documentName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  documentSub: {
    fontSize: 11,
    color: '#64748B',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 2,
  },
  timeText: {
    fontSize: 11,
    color: '#667781',
  },
  checkIcon: {
    marginLeft: 3,
  },
});
