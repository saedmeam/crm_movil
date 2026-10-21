import { apiClient } from './axios.instance';
import { LoginResponse } from '../types';

export const authService = {
  async login(identifier: string, password: string): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/api/auth/login', {
      identifier,
      password,
    });
    return response.data;
  },
};
