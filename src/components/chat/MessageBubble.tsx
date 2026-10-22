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
import { useTheme } from '../../context/ThemeContext';

interface MessageBubbleProps {
  message: Message;
  onImagePress?: (imageUrl: string) => void;
  onVideoPress?: (videoUrl: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onImagePress,
  onVideoPress,
}) => {
  const { isDark, colors } = useTheme();
  const senderTypeUpper = String(message.senderType || '').toUpperCase();
  const isAgent = senderTypeUpper === 'AGENT';
  const isInternalNote = message.isInternalNote || message.isInternal || senderTypeUpper === 'INTERNAL' || message.type === 'internal_note';
  const isEmojiSticker = message.type === 'sticker' && !message.mediaUrl;

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
            : isEmojiSticker
            ? [
                styles.emojiStickerBubble,
                isAgent ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' }
              ]
            : isAgent
            ? [styles.agentBubble, { backgroundColor: colors.bubbleAgent }]
            : [styles.clientBubble, { backgroundColor: colors.bubbleClient }],
        ]}
      >
        {/* Distintivo de Nota Interna */}
        {isInternalNote && (
          <View style={styles.internalBadge}>
            <Lock size={12} color="#854D0E" style={{ marginRight: 4 }} />
            <Text style={styles.internalBadgeText}>NOTA INTERNA DEL EQUIPO</Text>
          </View>
        )}

        {/* Contenido: Sticker / Emoji Gigante */}
        {message.type === 'sticker' && (
          <View style={styles.stickerContainer}>
            {message.mediaUrl ? (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => onImagePress?.(resolveMediaUrl(message.mediaUrl))}
              >
                <Image
                  source={{ uri: resolveMediaUrl(message.mediaUrl) }}
                  style={styles.stickerImage}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            ) : (
              <Text style={styles.stickerEmoji} allowFontScaling={false}>
                {message.content}
              </Text>
            )}
          </View>
        )}

        {/* Contenido: Imagen o GIF */}
        {(message.type === 'image' || message.type === 'gif') && message.mediaUrl && (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => onImagePress?.(resolveMediaUrl(message.mediaUrl))}
          >
            <Image
              source={{ uri: resolveMediaUrl(message.mediaUrl) }}
              style={styles.imageThumbnail}
              resizeMode="cover"
            />
            {message.type === 'gif' && (
              <View style={styles.gifBadge}>
                <Text style={styles.gifBadgeText}>GIF</Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* Contenido: Video */}
        {(message.type === 'video' || (!['audio', 'document', 'sticker', 'gif', 'image'].includes(message.type) && message.mediaUrl && message.mediaUrl.match(/\.(mp4|mov|avi|mkv|webm)$/i))) && message.mediaUrl && (
          <TouchableOpacity
            style={styles.videoContainer}
            activeOpacity={0.9}
            onPress={() => {
              const fullUrl = resolveMediaUrl(message.mediaUrl);
              if (onVideoPress) {
                onVideoPress(fullUrl);
              } else {
                handleOpenLink(fullUrl);
              }
            }}
          >
            <View style={styles.videoThumbnailPlaceholder}>
              <View style={styles.videoPlayBtn}>
                <Text style={{ color: '#FFFFFF', fontSize: 24, marginLeft: 3 }}>▶</Text>
              </View>
              <Text style={styles.videoPlayText}>Reproducir Video</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Contenido: Nota de Voz */}
        {(message.type === 'audio' || (!['video', 'document', 'sticker', 'gif', 'image'].includes(message.type) && message.mediaUrl && message.mediaUrl.match(/\.(m4a|aac|mp3|ogg|wav)$/i))) && message.mediaUrl && (
          <AudioPlayerBubble
            mediaUrl={message.mediaUrl}
            duration={message.mediaDuration}
            isSender={isAgent}
          />
        )}

        {/* Contenido: Documento */}
        {(message.type === 'document' || (!['video', 'audio', 'sticker', 'gif', 'image'].includes(message.type) && message.mediaUrl && message.mediaUrl.match(/\.(pdf|doc|docx|xls|xlsx|txt|csv|zip|rar)$/i))) && message.mediaUrl && (
          <TouchableOpacity
            style={[styles.documentContainer, isDark && { backgroundColor: 'rgba(255,255,255,0.06)' }]}
            onPress={() => handleOpenLink(resolveMediaUrl(message.mediaUrl))}
          >
            <FileText size={28} color={isDark ? '#00A884' : '#075E54'} />
            <View style={styles.documentInfo}>
              <Text style={[styles.documentName, { color: colors.textPrimary }]} numberOfLines={1}>
                {message.fileName || (message.mediaUrl ? message.mediaUrl.split('/').pop() : 'Documento adjunto')}
              </Text>
              <Text style={[styles.documentSub, { color: colors.textSecondary }]}>
                {message.fileSize ? `${Math.round(message.fileSize / 1024)} KB • ` : ''}Toca para abrir
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Contenido: Fallback para Imagen si mediaUrl no cayó en los anteriores */}
        {message.type !== 'image' && message.type !== 'gif' && message.type !== 'video' && message.type !== 'audio' && message.type !== 'document' && message.type !== 'sticker' && message.mediaUrl && (
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

        {/* Contenido: Texto o Caption (si no es sticker solo de emoji ni placeholder redundante) */}
        {message.content && 
         message.type !== 'sticker' && 
         !(message.mediaUrl && ['foto', 'video', 'nota de voz', 'documento', 'documento adjunto', 'archivo adjunto'].includes(message.content.trim().toLowerCase())) ? (
          <Text
            style={[
              styles.messageText,
              { color: colors.textPrimary },
              message.mediaUrl ? { marginTop: 6 } : undefined,
              isInternalNote && styles.internalNoteText,
            ]}
          >
            {message.content}
          </Text>
        ) : null}

        {/* Metadata de pie: Hora y Checks */}
        <View style={styles.metaRow}>
          <Text style={[styles.timeText, { color: colors.textMuted }]}>{formatTime(message.createdAt)}</Text>
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
  stickerContainer: {
    paddingVertical: 2,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  stickerImage: {
    width: 140,
    height: 140,
  },
  stickerEmoji: {
    fontSize: 48,
    lineHeight: 56,
    textAlign: 'center',
    includeFontPadding: false,
  },
  emojiStickerBubble: {
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
    borderWidth: 0,
    paddingHorizontal: 4,
    paddingTop: 4,
    paddingBottom: 2,
  },
  gifBadge: {
    position: 'absolute',
    bottom: 12,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  gifBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  videoContainer: {
    width: 240,
    height: 150,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#000000',
    marginBottom: 6,
  },
  videoThumbnailPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E293B',
  },
  videoPlayBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    marginBottom: 8,
  },
  videoPlayText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
  },
});
