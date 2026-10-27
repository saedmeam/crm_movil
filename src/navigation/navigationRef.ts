import { createNavigationContainerRef } from '@react-navigation/native';
import { RootStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/**
 * Navega de forma segura a cualquier pantalla desde fuera de componentes React
 * (por ejemplo desde servicios de notificaciones o listeners en segundo plano).
 */
export function navigate<RouteName extends keyof RootStackParamList>(
  name: RouteName,
  params?: RootStackParamList[RouteName]
) {
  if (navigationRef.isReady()) {
    (navigationRef.navigate as any)(name, params);
  } else {
    console.warn('[NavigationRef] NavigationContainer aún no está listo para navegar a:', name);
  }
}
