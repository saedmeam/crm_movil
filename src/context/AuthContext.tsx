import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { User } from '../types';
import { authService } from '../api/auth.service';
import { setOnUnauthorizedCallback, TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from '../api/axios.instance';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const logout = async () => {
    try {
      await SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY).catch(() => {});
      await SecureStore.deleteItemAsync(USER_STORAGE_KEY).catch(() => {});
    } finally {
      setToken(null);
      setUser(null);
    }
  };

  useEffect(() => {
    // Si Axios recibe un 401, cerramos sesión de forma limpia
    setOnUnauthorizedCallback(() => {
      logout();
    });

    const restoreSession = async () => {
      try {
        const storedToken = await SecureStore.getItemAsync(TOKEN_STORAGE_KEY);
        const storedUser = await SecureStore.getItemAsync(USER_STORAGE_KEY);
        console.log('[AuthContext] restoreSession -> token presente:', !!storedToken, 'user presente:', !!storedUser);

        if (storedToken && storedUser) {
          const parsedUser = JSON.parse(storedUser);
          console.log('[AuthContext] Sesión restaurada para:', parsedUser.email || parsedUser.username, 'Rol:', parsedUser.role, 'ID:', parsedUser.id);
          setToken(storedToken);
          setUser(parsedUser);
        }
      } catch (e) {
        console.warn('[AuthContext] Error recuperando sesión:', e);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (identifier: string, password: string) => {
    const data = await authService.login(identifier, password);
    await SecureStore.setItemAsync(TOKEN_STORAGE_KEY, data.token);
    await SecureStore.setItemAsync(USER_STORAGE_KEY, JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
};
