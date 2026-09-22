import { useState } from 'react';
import { Image, type ImageProps } from 'expo-image';
import { ImageOff } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { theme } from '../../theme';
import { useReducedMotionSafe } from '../../hooks/useReducedMotionSafe';

type Props = { uri?: string; label: string; style?: ImageProps['style']; contentFit?: ImageProps['contentFit'] };

export const CatalogImage = ({ uri, label, style, contentFit = 'cover' }: Props) => {
  const [failedUri, setFailedUri] = useState<string>();
  const reducedMotion = useReducedMotionSafe();
  const available = Boolean(uri && uri !== failedUri);
  return <View style={[styles.frame, style]} accessibilityRole="image" accessibilityLabel={available ? label : `Image unavailable: ${label}`}>
    {available ? <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit={contentFit}
      transition={reducedMotion ? 0 : 150} onError={() => setFailedUri(uri)} />
      : <ImageOff size={28} color={theme.colors.muted} />}
  </View>;
};

const styles = StyleSheet.create({
  frame: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary.tint },
});
