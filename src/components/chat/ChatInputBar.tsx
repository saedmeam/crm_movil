import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import {
  useAudioRecorder,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import {
  Send,
  Mic,
  Paperclip,
  Camera,
  Image as ImageIcon,
  Video as VideoIcon,
  FileText,
  Smile,
  Square,
  Lock,
  X,
} from 'lucide-react-native';
import { uploadService } from '../../api/upload.service';
import { useTheme } from '../../context/ThemeContext';

interface AgentItem {
  id: string;
  name: string;
  username?: string;
}

interface ChatInputBarProps {
  onSendMessage: (payload: {
    content: string;
    type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'sticker' | 'gif' | 'internal_note';
    mediaUrl?: string;
    mediaDuration?: number;
    fileName?: string;
    fileSize?: number;
    isInternalNote?: boolean;
  }) => Promise<void>;
  disabled?: boolean;
  agents?: AgentItem[];
  onAddCollaborator?: (agentId: string) => Promise<void> | void;
}

export const ChatInputBar: React.FC<ChatInputBarProps> = ({
  onSendMessage,
  disabled = false,
  agents = [],
  onAddCollaborator,
}) => {
  const { isDark, colors } = useTheme();
  const [text, setText] = useState('');
  const [isInternalNoteMode, setIsInternalNoteMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showStickerMenu, setShowStickerMenu] = useState(false);

  // Menciones @ en Notas Internas
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');

  // Lista de emojis y stickers rápidos corporativos
  const quickStickers = [
    '👍', '👋', '🤝', '✅', '❤️', '🔥', '🎉', '🙏', 
    '💼', '📊', '📞', '⏳', '⭐', '🚀', '💯', '😊'
  ];

  // Configuración de grabación compatible con WhatsApp PTT (ADTS AAC / stream de audio puro)
  const voiceRecordingOptions = {
    ...RecordingPresets.HIGH_QUALITY,
    extension: '.aac',
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 32000,
    android: {
      extension: '.aac',
      outputFormat: 'aac_adts' as const,
      audioEncoder: 'aac' as const,
      sampleRate: 16000,
    },
    ios: {
      ...RecordingPresets.HIGH_QUALITY.ios,
      extension: '.m4a',
      sampleRate: 16000,
      bitRate: 32000,
    },
  };

  const recorder = useAudioRecorder(voiceRecordingOptions as any, (status) => {
    // Escucha de estado de grabación
  });

  // Detectar @ al escribir en modo Nota Interna
  const handleTextChange = (val: string) => {
    setText(val);

    if (isInternalNoteMode) {
      // Buscar si el cursor o el final de la palabra actual tiene un @
      const match = val.match(/@([a-zA-Z0-9._-]*)$/);
      if (match) {
        setMentionQuery(match[1].toLowerCase());
        setShowMentionMenu(true);
      } else {
        setShowMentionMenu(false);
      }
    } else {
      if (showMentionMenu) setShowMentionMenu(false);
    }
  };

  // Filtrar agentes según la consulta tras el @
  const filteredAgents = useMemo(() => {
    if (!showMentionMenu) return [];
    if (!mentionQuery) return agents;
    return agents.filter(
      (a) =>
        a.name.toLowerCase().includes(mentionQuery) ||
        (a.username && a.username.toLowerCase().includes(mentionQuery))
    );
  }, [showMentionMenu, mentionQuery, agents]);

  // Al seleccionar un agente del desplegable de menciones
  const handleSelectMention = (agent: AgentItem) => {
    const handleName = agent.username || agent.name.replace(/\s+/g, '').toLowerCase();
    const mentionTag = `@${handleName} `;

    // Reemplazar el @incompleto por la mención completa
    const replaced = text.replace(/@([a-zA-Z0-9._-]*)$/, mentionTag);
    setText(replaced);
    setShowMentionMenu(false);

    // Si se pasa callback para añadir como colaborador, llamarlo
    if (onAddCollaborator) {
      onAddCollaborator(agent.id);
    }
  };

  // Manejador de Texto / Nota Interna
  const handleSendText = async () => {
    if (!text.trim() || disabled) return;
    const contentToSend = text.trim();
    const isNote = isInternalNoteMode;
    setText('');
    setIsInternalNoteMode(false);
    setShowMentionMenu(false);

    await onSendMessage({
      content: contentToSend,
      type: isNote ? 'internal_note' : 'text',
      isInternalNote: isNote,
    });
  };

  // Adjuntar Foto desde Galería (Soporta JPG, PNG, GIF)
  const handlePickImage = async () => {
    setShowAttachMenu(false);
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permiso Denegado', 'Se requiere acceso a la galería.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const isGif = asset.mimeType === 'image/gif' || asset.fileName?.toLowerCase().endsWith('.gif');
        setIsUploading(true);
        const uploadRes = await uploadService.uploadFile(
          asset.uri,
          asset.fileName || (isGif ? `gif_${Date.now()}.gif` : `foto_${Date.now()}.jpg`),
          asset.mimeType || (isGif ? 'image/gif' : 'image/jpeg')
        );

        await onSendMessage({
          content: 'Foto',
          type: isGif ? 'gif' : 'image',
          mediaUrl: uploadRes.url,
          fileName: uploadRes.filename,
        });
      }
    } catch (err: any) {
      Alert.alert('Error', 'No se pudo subir la imagen.');
    } finally {
      setIsUploading(false);
    }
  };

  // Adjuntar Video desde Galería o Cámara
  const handlePickVideo = async () => {
    setShowAttachMenu(false);
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permiso Denegado', 'Se requiere acceso a los videos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setIsUploading(true);
        const uploadRes = await uploadService.uploadFile(
          asset.uri,
          asset.fileName || `video_${Date.now()}.mp4`,
          asset.mimeType || 'video/mp4'
        );

        await onSendMessage({
          content: 'Video',
          type: 'video',
          mediaUrl: uploadRes.url,
          fileName: uploadRes.filename,
        });
      }
    } catch (err: any) {
      Alert.alert('Error', 'No se pudo subir el video.');
    } finally {
      setIsUploading(false);
    }
  };

  // Adjuntar Documento o Archivo (.pdf, .doc, .docx, .xls, .xlsx, .zip, etc.)
  const handlePickDocument = async () => {
    setShowAttachMenu(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setIsUploading(true);
        const uploadRes = await uploadService.uploadFile(
          asset.uri,
          asset.name || `doc_${Date.now()}.pdf`,
          asset.mimeType || 'application/octet-stream'
        );

        await onSendMessage({
          content: asset.name || 'Documento adjunto',
          type: 'document',
          mediaUrl: uploadRes.url,
          fileName: asset.name || uploadRes.filename,
          fileSize: asset.size,
        });
      }
    } catch (err: any) {
      Alert.alert('Error', 'No se pudo seleccionar el documento.');
    } finally {
      setIsUploading(false);
    }
  };

  // Capturar Foto con Cámara
  const handleTakePhoto = async () => {
    setShowAttachMenu(false);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permiso Denegado', 'Se requiere acceso a la cámara.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setIsUploading(true);
        const uploadRes = await uploadService.uploadFile(
          asset.uri,
          `foto_cam_${Date.now()}.jpg`,
          'image/jpeg'
        );

        await onSendMessage({
          content: 'Foto',
          type: 'image',
          mediaUrl: uploadRes.url,
          fileName: uploadRes.filename,
        });
      }
    } catch (err) {
      Alert.alert('Error', 'No se pudo capturar la foto.');
    } finally {
      setIsUploading(false);
    }
  };

  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);

  // Iniciar Grabación de Voz con expo-audio
  const startRecording = async () => {
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permiso Denegado', 'Se requiere acceso al micrófono para grabar notas de voz.');
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await recorder.prepareToRecordAsync();
      recorder.record();
      setRecordingStartTime(Date.now());
      setIsRecording(true);
    } catch (err: any) {
      console.warn('Error iniciando grabación:', err);
      Alert.alert('Error al grabar', err?.message || 'No se pudo iniciar la grabación de voz.');
      setIsRecording(false);
      setRecordingStartTime(null);
    }
  };

  // Detener y Enviar Grabación
  const stopRecordingAndSend = async () => {
    try {
      setIsRecording(false);
      const startTime = recordingStartTime;
      setRecordingStartTime(null);

      await recorder.stop();
      const uri = recorder.uri;

      const calculatedDuration = startTime ? Math.round((Date.now() - startTime) / 1000) : 0;

      if (uri) {
        setIsUploading(true);
        console.log('[ChatInputBar] Subiendo nota de voz:', uri, 'duración calculada:', calculatedDuration);
        const uploadRes = await uploadService.uploadFile(
          uri,
          `voice_note_${Date.now()}.aac`,
          'audio/aac'
        );

        console.log('[ChatInputBar] Nota de voz subida con éxito:', uploadRes.url);
        await onSendMessage({
          content: 'Nota de voz',
          type: 'audio',
          mediaUrl: uploadRes.url,
          mediaDuration: calculatedDuration > 0 ? calculatedDuration : 1,
        });
      } else {
        Alert.alert('Aviso', 'No se grabó ningún contenido de audio.');
      }
    } catch (err: any) {
      console.error('Error enviando nota de voz:', err);
      Alert.alert('Error', err?.message || 'No se pudo enviar la nota de voz.');
    } finally {
      setIsUploading(false);
      setAudioModeAsync({ allowsRecording: false }).catch(() => {});
    }
  };

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.chatBg }]}>
      {/* Menú Flotante de Adjuntos */}
      {showAttachMenu && (
        <View style={[styles.attachMenu, { backgroundColor: colors.surface }]}>
          {/* Cámara */}
          <TouchableOpacity style={styles.attachItem} onPress={handleTakePhoto}>
            <View style={[styles.attachCircle, { backgroundColor: '#E91E63' }]}>
              <Camera size={22} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          {/* Fotos / GIFs */}
          <TouchableOpacity style={styles.attachItem} onPress={handlePickImage}>
            <View style={[styles.attachCircle, { backgroundColor: '#9C27B0' }]}>
              <ImageIcon size={22} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          {/* Videos */}
          <TouchableOpacity style={styles.attachItem} onPress={handlePickVideo}>
            <View style={[styles.attachCircle, { backgroundColor: '#0284C7' }]}>
              <VideoIcon size={22} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          {/* Documentos */}
          <TouchableOpacity style={styles.attachItem} onPress={handlePickDocument}>
            <View style={[styles.attachCircle, { backgroundColor: '#5B21B6' }]}>
              <FileText size={22} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          {/* Stickers / Emojis */}
          <TouchableOpacity
            style={styles.attachItem}
            onPress={() => {
              setShowAttachMenu(false);
              setShowStickerMenu(!showStickerMenu);
            }}
          >
            <View style={[styles.attachCircle, { backgroundColor: '#F59E0B' }]}>
              <Smile size={22} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Barra Rápida de Stickers / Emojis */}
      {showStickerMenu && (
        <View style={[styles.stickerBar, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <View style={styles.stickerHeader}>
            <Smile size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
            <TextInput
              style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, flex: 1 }}
              value="STICKERS Y REACCIONES RÁPIDAS"
              editable={false}
            />
            <TouchableOpacity onPress={() => setShowStickerMenu(false)}>
              <X size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <View style={styles.stickerRow}>
            {quickStickers.map((stk, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.stickerBtn}
                activeOpacity={0.7}
                onPress={async () => {
                  setShowStickerMenu(false);
                  await onSendMessage({
                    content: stk,
                    type: 'sticker',
                  });
                }}
              >
                <Text
                  style={{ fontSize: 28, textAlign: 'center', includeFontPadding: false }}
                  allowFontScaling={false}
                >
                  {stk}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Menú Flotante de Menciones (@) en Nota Interna */}
      {isInternalNoteMode && showMentionMenu && filteredAgents.length > 0 && (
        <View
          style={[
            styles.mentionMenu,
            {
              backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
              borderColor: isDark ? '#374151' : '#E2E8F0',
            },
          ]}
        >
          <View style={[styles.mentionMenuHeader, { borderBottomColor: colors.borderSubtle }]}>
            <Text style={[styles.mentionMenuHeaderText, { color: colors.textSecondary }]}>
              Mencionar agente (será colaborador)
            </Text>
            <TouchableOpacity onPress={() => setShowMentionMenu(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.mentionScroll}
            keyboardShouldPersistTaps="always"
            nestedScrollEnabled
          >
            {filteredAgents.map((agent) => (
              <TouchableOpacity
                key={agent.id}
                style={[
                  styles.mentionItem,
                  { borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9' },
                ]}
                onPress={() => handleSelectMention(agent)}
              >
                <View style={[styles.mentionAvatar, { backgroundColor: isDark ? '#00A884' : '#075E54' }]}>
                  <Text style={styles.mentionAvatarText}>
                    {agent.name?.charAt(0)?.toUpperCase() || 'A'}
                  </Text>
                </View>
                <View style={styles.mentionInfo}>
                  <Text style={[styles.mentionName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {agent.name}
                  </Text>
                  <Text style={[styles.mentionUsername, { color: isDark ? '#34D399' : '#059669' }]}>
                    @{agent.username || agent.name.replace(/\s+/g, '').toLowerCase()}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Barra de Entrada */}
      <View
        style={[
          styles.container,
          { backgroundColor: colors.inputBg },
          isInternalNoteMode && styles.containerInternalNote,
        ]}
      >
        {/* Botón de Adjuntar */}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => {
            setShowStickerMenu(false);
            setShowAttachMenu(!showAttachMenu);
          }}
          disabled={disabled || isRecording || isUploading}
        >
          <Paperclip size={22} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Botón de Stickers directo */}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => {
            setShowAttachMenu(false);
            setShowStickerMenu(!showStickerMenu);
          }}
          disabled={disabled || isRecording || isUploading}
        >
          <Smile size={22} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Alternador Nota Interna */}
        <TouchableOpacity
          style={[
            styles.internalToggle,
            isDark && { backgroundColor: '#202C33' },
            isInternalNoteMode && styles.internalToggleActive,
          ]}
          onPress={() => {
            const nextMode = !isInternalNoteMode;
            setIsInternalNoteMode(nextMode);
            if (!nextMode) setShowMentionMenu(false);
          }}
          disabled={disabled || isRecording}
        >
          <Lock size={16} color={isInternalNoteMode ? '#854D0E' : colors.textSecondary} />
        </TouchableOpacity>

        {/* Input o Estado de Grabación */}
        {isRecording ? (
          <View style={styles.recordingIndicator}>
            <View style={styles.recordingDot} />
            <TextInput
              style={styles.recordingText}
              value="Grabando nota de voz..."
              editable={false}
            />
          </View>
        ) : (
          <TextInput
            style={[styles.textInput, { color: colors.inputText }]}
            placeholder={
              isInternalNoteMode
                ? 'Nota interna (usa @ para mencionar y añadir colaborador)...'
                : 'Mensaje'
            }
            placeholderTextColor={colors.textMuted}
            value={text}
            onChangeText={handleTextChange}
            multiline
            editable={!disabled && !isUploading}
          />
        )}

        {/* Botón de Acción Principal (Enviar texto / Parar grabación / Grabar voz) */}
        {isUploading ? (
          <View style={styles.actionButton}>
            <ActivityIndicator size="small" color="#FFFFFF" />
          </View>
        ) : isRecording ? (
          <TouchableOpacity
            style={[styles.actionButton, styles.stopRecordBtn]}
            onPress={stopRecordingAndSend}
          >
            <Square size={18} color="#FFFFFF" />
          </TouchableOpacity>
        ) : text.trim().length > 0 ? (
          <TouchableOpacity
            style={[
              styles.actionButton,
              isInternalNoteMode && styles.internalSendBtn,
            ]}
            onPress={handleSendText}
          >
            <Send size={18} color="#FFFFFF" style={{ marginLeft: 2 }} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={startRecording}
            disabled={disabled}
          >
            <Mic size={20} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#F0F2F5',
  },
  attachMenu: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 10,
    marginBottom: 8,
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    gap: 12,
  },
  attachItem: {
    padding: 4,
  },
  attachCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minHeight: 48,
  },
  containerInternalNote: {
    backgroundColor: '#FEF9C3',
    borderColor: '#FACC15',
    borderWidth: 1.5,
  },
  iconButton: {
    padding: 8,
  },
  internalToggle: {
    padding: 6,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    marginRight: 4,
  },
  internalToggleActive: {
    backgroundColor: '#FEF08A',
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#111B21',
    maxHeight: 120,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  recordingIndicator: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    marginRight: 8,
  },
  recordingText: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '600',
  },
  actionButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#075E54',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  stopRecordBtn: {
    backgroundColor: '#EF4444',
  },
  internalSendBtn: {
    backgroundColor: '#854D0E',
  },
  stickerBar: {
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  stickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-around',
    paddingVertical: 4,
  },
  stickerBtn: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  mentionMenu: {
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: 1,
    maxHeight: 180,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    overflow: 'hidden',
  },
  mentionMenuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  mentionMenuHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  mentionScroll: {
    maxHeight: 140,
  },
  mentionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  mentionAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  mentionAvatarText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  mentionInfo: {
    flex: 1,
  },
  mentionName: {
    fontSize: 13,
    fontWeight: '600',
  },
  mentionUsername: {
    fontSize: 11,
    fontWeight: '500',
  },
});
