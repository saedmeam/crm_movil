import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { X, Share2 } from 'lucide-react-native';
import { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'ImageViewer'>;

export const ImageViewerModal: React.FC<Props> = ({ route, navigation }) => {
  const { imageUrl, senderName } = route.params;
  const insets = useSafeAreaInsets();

  const handleShare = async () => {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('No soportado', 'La opción de compartir no está disponible en este dispositivo.');
        return;
      }

      // Descargar a cache temporal para compartir archivo
      const filename = imageUrl.split('/').pop() || `foto_${Date.now()}.jpg`;
      const localUri = `${FileSystem.cacheDirectory}${filename}`;
      await FileSystem.downloadAsync(imageUrl, localUri);
      await Sharing.shareAsync(localUri);
    } catch (err: any) {
      Alert.alert('Error', 'No se pudo compartir la imagen.');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header flotante */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={24} color="#FFFFFF" />
        </TouchableOpacity>

        {senderName && <Text style={styles.senderTitle}>{senderName}</Text>}

        <TouchableOpacity style={styles.headerBtn} onPress={handleShare}>
          <Share2 size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Visor de Imagen */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          resizeMode="contain"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  headerBtn: {
    padding: 8,
  },
  senderTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
