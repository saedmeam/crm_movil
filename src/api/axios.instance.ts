import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';
import { ENV } from '../config/env';

export const TOKEN_STORAGE_KEY = 'horustech_crm_token';
export const USER_STORAGE_KEY = 'horustech_crm_user';

export const apiClient = axios.create({
  baseURL: ENV.API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let onUnauthorizedCallback: (() => void) | null = null;

export const setOnUnauthorizedCallback = (callback: () => void) => {
  onUnauthorizedCallback = callback;
};

// Interceptor de Solicitud: Incluye el Bearer Token en cada llamada
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_STORAGE_KEY);
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('[API] Error al leer token de SecureStore:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de Respuesta: 401 (Logout) y 403 (Alerta sin logout)
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ message?: string }>) => {
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || 'Acceso restringido en el servidor.';

      if (status === 401) {
        // Token expirado o inválido: Cerrar sesión limpiamente (excepto si es el endpoint de login)
        const isLoginRequest = error.config?.url?.includes('/api/auth/login');
        if (!isLoginRequest) {
          await SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY).catch(() => {});
          if (onUnauthorizedCallback) {
            onUnauthorizedCallback();
          }
        }
      } else if (status === 403) {
        // Permiso denegado: Mostrar alerta al usuario sin cerrar la sesión
        Alert.alert('Permiso Denegado', message);
      }
    }
    return Promise.reject(error);
  }
);
