import { apiClient } from './axios.instance';

export interface ParameterItem {
  id: string;
  parentId?: string | null;
  mnemonic?: string | null;
  name: string;
  value?: string | null;
  description?: string | null;
  numericValue?: number | null;
  status?: string;
  active?: boolean;
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
  children?: ParameterItem[];
}

export interface ParameterPayload {
  id?: string;
  parentId?: string | null;
  mnemonic?: string;
  name: string;
  value?: string;
  description?: string;
  numericValue?: string | number;
  status?: string;
  metadata?: any;
}

export interface PipelineStage {
  id: string;
  name: string;
  color: string;
}

export interface Snippet {
  id: string;
  title: string;
  content: string;
  shortcut?: string;
  mediaUrl?: string;
}

export interface WhatsAppLine {
  id: string;
  name: string;
  phoneNumberId?: string;
  wabaId?: string;
  providerType?: 'QR_BAILEYS' | 'META_CLOUD';
  status?: string;
  active?: boolean;
  isDisconnected?: boolean;
}

export interface RoleItem {
  id: string;
  name: string;
  canViewAllChats: boolean;
  screenAccess: string[];
  _count?: {
    users: number;
  };
}

export const adminService = {
  // --- Parámetros y Catálogos ---
  async getParameters(params?: { parentId?: string; mnemonic?: string }): Promise<ParameterItem[]> {
    const res = await apiClient.get<ParameterItem[]>('/api/parameters', { params });
    return res.data;
  },

  async createParameter(data: ParameterPayload): Promise<ParameterItem> {
    const res = await apiClient.post<ParameterItem>('/api/parameters', data);
    return res.data;
  },

  async updateParameter(id: string, data: ParameterPayload): Promise<ParameterItem> {
    const res = await apiClient.put<ParameterItem>(`/api/parameters/${id}`, data);
    return res.data;
  },

  async deleteParameter(id: string): Promise<{ success: boolean }> {
    const res = await apiClient.delete<{ success: boolean }>(`/api/parameters/${id}`);
    return res.data;
  },

  // --- Líneas de WhatsApp ---
  async getLines(all?: boolean): Promise<WhatsAppLine[]> {
    const res = await apiClient.get<WhatsAppLine[]>('/api/lines', {
      params: all ? { all: 'true' } : undefined,
    });
    return res.data;
  },

  async createLine(data: Partial<WhatsAppLine>): Promise<WhatsAppLine> {
    const res = await apiClient.post<WhatsAppLine>('/api/lines', data);
    return res.data;
  },

  async updateLine(id: string, data: Partial<WhatsAppLine>): Promise<WhatsAppLine> {
    const res = await apiClient.put<WhatsAppLine>(`/api/lines/${id}`, data);
    return res.data;
  },

  async deleteLine(id: string): Promise<{ success: boolean }> {
    const res = await apiClient.delete<{ success: boolean }>(`/api/lines/${id}`);
    return res.data;
  },

  // --- Configuración Global (Snippets y Etapas Kanban) ---
  async getSettings(): Promise<{ pipelineStages: PipelineStage[]; snippets: Snippet[]; [key: string]: any }> {
    const res = await apiClient.get<any>('/api/settings');
    return res.data;
  },

  async updateSettings(data: any): Promise<any> {
    const res = await apiClient.put<any>('/api/settings', data);
    return res.data;
  },

  // --- Roles y Permisos ---
  async getRoles(): Promise<RoleItem[]> {
    const res = await apiClient.get<RoleItem[]>('/api/roles');
    return res.data;
  },

  async createRole(data: { name: string; canViewAllChats: boolean; screenAccess: string[] }): Promise<RoleItem> {
    const res = await apiClient.post<RoleItem>('/api/roles', data);
    return res.data;
  },

  async updateRole(id: string, data: { name: string; canViewAllChats: boolean; screenAccess: string[] }): Promise<RoleItem> {
    const res = await apiClient.put<RoleItem>(`/api/roles/${id}`, data);
    return res.data;
  },

  async deleteRole(id: string): Promise<{ success: boolean }> {
    const res = await apiClient.delete<{ success: boolean }>(`/api/roles/${id}`);
    return res.data;
  },
};
