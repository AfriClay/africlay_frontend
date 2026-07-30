import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';

interface AvatarProps {
  name: string;
  imageUrl?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ name, imageUrl }) => {
  const initials = name
    .split(' ')
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <View style={styles.root}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.image} />
      ) : (
        <View style={styles.fallback}>
          <Text style={styles.initials}>{initials}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: theme.colors.primary.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: theme.colors.primary.dark,
    fontWeight: '700',
  },
});
