import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { theme } from '../../theme';
import { RatingBadge } from '../ui/RatingBadge';
import { Service } from '../../types/product';

interface ServiceCardProps {
  service: Service;
  onPress: () => void;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({ service, onPress }) => (
  <Pressable style={styles.root} onPress={onPress} accessibilityRole="button" accessibilityLabel={`Book ${service.title}`}>
    <Image source={{ uri: service.images[0] }} style={styles.image} contentFit="cover" />
    <View style={styles.content}>
      <Text style={styles.name}>{service.title}</Text>
      <Text style={styles.price}>{`From KSh ${service.priceFrom.toLocaleString()}`}</Text>
      <RatingBadge rating={service.rating} reviewCount={service.reviewCount} />
    </View>
  </Pressable>
);

const styles = StyleSheet.create({
  root: {
    width: 220,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.white,
    overflow: 'hidden',
    ...theme.shadows.sm,
    marginRight: theme.spacing.md,
  },
  image: {
    width: '100%',
    height: 120,
  },
  content: {
    padding: theme.spacing.md,
  },
  name: {
    color: theme.colors.ink,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
  },
  price: {
    color: theme.colors.secondary.DEFAULT,
    marginBottom: theme.spacing.xs,
  },
});
