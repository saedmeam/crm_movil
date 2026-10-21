import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import {
  useAudioRecorder,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';
import {
  Send,
  Mic,
  Paperclip,
  Camera,
  Image as ImageIcon,
  Square,
  Lock,
} from 'lucide-react-native';
import { uploadService } from '../../api/upload.service';

interface ChatInputBarProps {
  onSendMessage: (payload: {
    content: string;
    type: 'text' | 'image' | 'audio' | 'internal_note';
    mediaUrl?: string;
    mediaDuration?: number;
    fileName?: string;
    isInternalNote?: boolean;
  }) => Promise<void>;
  disabled?: boolean;
}

export const ChatInputBar: React.FC<ChatInputBarProps> = ({
  onSendMessage,
  disabled = false,
}) => {
  const [text, setText] = useState('');
  const [isInternalNoteMode, setIsInternalNoteMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY, (status) => {
    // Escucha de estado de grabación
  });

  // Manejador de Texto / Nota Interna
  const handleSendText = async () => {
    if (!text.trim() || disabled) return;
    const contentToSend = text.trim();
    const isNote = isInternalNoteMode;
    setText('');
    setIsInternalNoteMode(false);

    await onSendMessage({
      content: contentToSend,
      type: isNote ? 'internal_note' : 'text',
      isInternalNote: isNote,
    });
  };

  // Adjuntar Foto desde Galería
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
        allowsEditing: true,
        quality: 0.7, // Compresión previa al envío
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setIsUploading(true);
        const uploadRes = await uploadService.uploadFile(
          asset.uri,
          asset.fileName || `foto_${Date.now()}.jpg`,
          asset.mimeType || 'image/jpeg'
        );

        await onSendMessage({
          content: '',
          type: 'image',
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
          content: '',
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

  // Iniciar Grabación de Voz con expo-audio
  const startRecording = async () => {
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permiso Denegado', 'Se requiere acceso al micrófono.');
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsRecording(true);
    } catch (err) {
      console.warn('Error iniciando grabación:', err);
    }
  };

  // Detener y Enviar Grabación
  const stopRecordingAndSend = async () => {
    try {
      setIsRecording(false);
      await recorder.stop();
      const uri = recorder.uri;

      if (uri) {
        setIsUploading(true);
        const uploadRes = await uploadService.uploadFile(
          uri,
          `nota_voz_${Date.now()}.m4a`,
          'audio/m4a'
        );

        await onSendMessage({
          content: '',
          type: 'audio',
          mediaUrl: uploadRes.url,
          mediaDuration: 0,
        });
      }
    } catch (err) {
      Alert.alert('Error', 'No se pudo enviar la nota de voz.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      {/* Menú Flotante de Adjuntos */}
      {showAttachMenu && (
        <View style={styles.attachMenu}>
          <TouchableOpacity style={styles.attachItem} onPress={handleTakePhoto}>
            <View style={[styles.attachCircle, { backgroundColor: '#E91E63' }]}>
              <Camera size={22} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.attachItem} onPress={handlePickImage}>
            <View style={[styles.attachCircle, { backgroundColor: '#9C27B0' }]}>
              <ImageIcon size={22} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Barra de Entrada */}
      <View
        style={[
          styles.container,
          isInternalNoteMode && styles.containerInternalNote,
        ]}
      >
        {/* Botón de Adjuntar */}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => setShowAttachMenu(!showAttachMenu)}
          disabled={disabled || isRecording || isUploading}
        >
          <Paperclip size={22} color="#54656F" />
        </TouchableOpacity>

        {/* Alternador Nota Interna */}
        <TouchableOpacity
          style={[
            styles.internalToggle,
            isInternalNoteMode && styles.internalToggleActive,
          ]}
          onPress={() => setIsInternalNoteMode(!isInternalNoteMode)}
          disabled={disabled || isRecording}
        >
          <Lock size={16} color={isInternalNoteMode ? '#854D0E' : '#64748B'} />
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
            style={styles.textInput}
            placeholder={
              isInternalNoteMode
                ? 'Escribe una nota interna para el equipo...'
                : 'Mensaje'
            }
            placeholderTextColor="#8696A0"
            value={text}
            onChangeText={setText}
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
});
