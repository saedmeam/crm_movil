import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store';
import { apiClient, TOKEN_STORAGE_KEY } from './axios.instance';
import { ENV } from '../config/env';

export interface UploadResponse {
  url: string;
  filename: string;
}

export const uploadService = {
  /**
   * Sube un archivo binario (imagen, audio o documento) mediante multipart/form-data.
   * En dispositivos móviles (Android/iOS) utiliza FileSystem.uploadAsync para evitar
   * los problemas de serialización binaria y Network Error de React Native / Axios.
   */
  async uploadFile(fileUri: string, fileName: string, mimeType: string): Promise<UploadResponse> {
    let normalizedUri = fileUri;
    if (Platform.OS === 'android' && !normalizedUri.startsWith('file://') && !normalizedUri.startsWith('content://')) {
      normalizedUri = `file://${normalizedUri}`;
    }

    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      try {
        const token = await SecureStore.getItemAsync(TOKEN_STORAGE_KEY);
        const headers: Record<string, string> = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const cleanBase = ENV.API_URL.replace(/\/+$/, '');
        const uploadUrl = `${cleanBase}/api/upload`;

        const result = await FileSystem.uploadAsync(uploadUrl, normalizedUri, {
          fieldName: 'file',
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          mimeType: mimeType,
          headers: headers,
        });

        if (result.status >= 200 && result.status < 300) {
          const parsed = JSON.parse(result.body);
          return {
            url: parsed.url,
            filename: parsed.filename || fileName,
          };
        } else {
          console.error('[UploadService] Error en uploadAsync status:', result.status, result.body);
          throw new Error(`Error en el servidor al subir archivo (${result.status})`);
        }
      } catch (nativeErr: any) {
        console.error('[UploadService] Error nativo con uploadAsync:', nativeErr);
        throw nativeErr;
      }
    }

    // Fallback para Web
    const formData = new FormData();
    formData.append('file', {
      uri: normalizedUri,
      name: fileName,
      type: mimeType,
    } as any);

    const response = await apiClient.post<UploadResponse>('/api/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },
};
