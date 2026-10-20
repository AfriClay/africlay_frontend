import type { StyleProp, ViewStyle } from 'react-native';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { theme } from '../../theme';

type MarketplaceBrandProps = {
  compact?: boolean;
  showName?: boolean;
  accessible?: boolean;
  animatedNameStyle?: StyleProp<ViewStyle>;
};

export const MarketplaceBrand = ({
  compact = false,
  showName = true,
  accessible = true,
  animatedNameStyle,
}: MarketplaceBrandProps) => (
  <View
    accessible={accessible}
    accessibilityRole={accessible ? 'image' : undefined}
    accessibilityLabel={accessible ? 'AfriClay Market' : undefined}
    style={[styles.lockup, compact && styles.compactLockup]}
  >
    <View style={[styles.logoViewport, compact && styles.compactLogoViewport]}>
      <Image
        source={require('../../../assets/africlay-brand-v1.svg')}
        style={[styles.logo, compact && styles.compactLogo]}
        contentFit="contain"
        accessible={false}
      />
    </View>
    {showName ? (
      <Animated.View style={[styles.wordmark, compact && styles.compactWordmark, animatedNameStyle]}>
        <Text numberOfLines={1} style={[styles.name, compact && styles.compactName]}>AfriClay</Text>
        <Text numberOfLines={1} style={[styles.market, compact && styles.compactMarket]}>Market</Text>
      </Animated.View>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  lockup: {
    minWidth: 0,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactLockup: {
    height: 48,
  },
  logoViewport: {
    width: 48,
    height: 52,
    flexShrink: 0,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  compactLogoViewport: {
    width: 44,
    height: 48,
  },
  logo: {
    width: 112,
    height: 74,
    marginLeft: -4,
    marginTop: -10,
  },
  compactLogo: {
    width: 104,
    height: 69,
  },
  wordmark: {
    minWidth: 0,
    marginLeft: theme.spacing.xs,
    justifyContent: 'center',
  },
  compactWordmark: {
    width: 76,
  },
  name: {
    color: theme.colors.ink,
    fontSize: 18,
    lineHeight: 21,
    fontWeight: '800',
    letterSpacing: 0,
  },
  compactName: {
    fontSize: 15,
    lineHeight: 17,
  },
  market: {
    color: theme.colors.primary.dark,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '700',
    letterSpacing: 0,
  },
  compactMarket: {
    fontSize: 9,
    lineHeight: 11,
  },
});
