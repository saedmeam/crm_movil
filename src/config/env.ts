export const ENV = {
  API_URL: process.env.EXPO_PUBLIC_API_URL || 'http://192.168.100.188:4001',
};

/**
 * Resuelve URLs relativas (/media/...) usando la URL base del backend
 */
export const resolveMediaUrl = (url?: string | null): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('file://')) {
    return url;
  }
  const cleanBase = ENV.API_URL.replace(/\/+$/, '');
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return `${cleanBase}${cleanPath}`;
};
