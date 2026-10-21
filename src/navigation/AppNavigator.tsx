import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppStackParamList } from './types';
import { ChatListScreen } from '../screens/chat/ChatListScreen';
import { ChatConversationScreen } from '../screens/chat/ChatConversationScreen';
import { ImageViewerModal } from '../screens/chat/ImageViewerModal';

import { AdminMenuScreen } from '../screens/admin/AdminMenuScreen';
import { ParametersManagementScreen } from '../screens/admin/ParametersManagementScreen';
import { WhatsAppLinesManagementScreen } from '../screens/admin/WhatsAppLinesManagementScreen';
import { SnippetsManagementScreen } from '../screens/admin/SnippetsManagementScreen';
import { KanbanSettingsManagementScreen } from '../screens/admin/KanbanSettingsManagementScreen';
import { RolesManagementScreen } from '../screens/admin/RolesManagementScreen';

const Stack = createNativeStackNavigator<AppStackParamList>();

export const AppNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="ChatList" component={ChatListScreen} />
      <Stack.Screen name="ChatConversation" component={ChatConversationScreen} />
      <Stack.Screen
        name="ImageViewer"
        component={ImageViewerModal}
        options={{
          presentation: 'fullScreenModal',
          animation: 'fade',
        }}
      />
      <Stack.Screen name="AdminMenu" component={AdminMenuScreen} />
      <Stack.Screen name="ParametersManagement" component={ParametersManagementScreen} />
      <Stack.Screen name="WhatsAppLinesManagement" component={WhatsAppLinesManagementScreen} />
      <Stack.Screen name="SnippetsManagement" component={SnippetsManagementScreen} />
      <Stack.Screen name="KanbanSettingsManagement" component={KanbanSettingsManagementScreen} />
      <Stack.Screen name="RolesManagement" component={RolesManagementScreen} />
    </Stack.Navigator>
  );
};
