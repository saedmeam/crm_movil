import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Play, Pause, Mic } from 'lucide-react-native';
import { resolveMediaUrl } from '../../config/env';

interface AudioPlayerBubbleProps {
  mediaUrl: string;
  duration?: number;
  isSender: boolean;
}

export const AudioPlayerBubble: React.FC<AudioPlayerBubbleProps> = ({
  mediaUrl,
  duration = 0,
  isSender,
}) => {
  const audioUri = resolveMediaUrl(mediaUrl);
  const player = useAudioPlayer(audioUri);
  const status = useAudioPlayerStatus(player);

  const formatSeconds = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.floor(totalSeconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handlePlayPause = () => {
    if (status.playing) {
      player.pause();
    } else {
      player.play();
    }
  };

  const totalDuration = status.duration || duration || 0;
  const currentSeconds = status.currentTime || 0;
  const progress = totalDuration > 0 ? (currentSeconds / totalDuration) * 100 : 0;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.playButton,
          { backgroundColor: isSender ? '#075E54' : '#128C7E' },
        ]}
        onPress={handlePlayPause}
      >
        {status.playing ? (
          <Pause size={18} color="#FFFFFF" />
        ) : (
          <Play size={18} color="#FFFFFF" style={{ marginLeft: 2 }} />
        )}
      </TouchableOpacity>

      <View style={styles.waveformContainer}>
        {/* Barra de progreso */}
        <View style={styles.progressBarBackground}>
          <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
        </View>

        <View style={styles.timeRow}>
          <Text style={styles.timeText}>
            {formatSeconds(status.playing ? currentSeconds : totalDuration)}
          </Text>
          <Mic size={12} color="#64748B" />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    minWidth: 200,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  waveformContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#075E54',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
});
