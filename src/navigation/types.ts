import { NavigatorScreenParams } from '@react-navigation/native';
import { Conversation } from '../types';

export type RootStackParamList = {
  Auth: undefined;
  App: undefined;
};

export type AppStackParamList = {
  ChatList: undefined;
  ChatConversation: {
    conversation: Conversation;
  };
  ImageViewer: {
    imageUrl: string;
    senderName?: string;
    timestamp?: string;
  };
  VideoViewer: {
    videoUrl: string;
    senderName?: string;
    timestamp?: string;
  };
  AdminMenu: undefined;
  ParametersManagement: undefined;
  WhatsAppLinesManagement: undefined;
  SnippetsManagement: undefined;
  KanbanSettingsManagement: undefined;
  RolesManagement: undefined;
};
