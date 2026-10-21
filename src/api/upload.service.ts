import { apiClient } from './axios.instance';

export interface UploadResponse {
  url: string;
  filename: string;
}

export const uploadService = {
  /**
   * Sube un archivo binario (imagen, audio o documento) mediante multipart/form-data
   */
  async uploadFile(fileUri: string, fileName: string, mimeType: string): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
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
