import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Heart } from 'lucide-react-native';
import { useAuth } from '../../hooks/useAuth';
import { useWishlist } from '../../hooks/useWishlist';
import { theme } from '../../theme';

export function WishlistToggle({ productId, onGuest, style }: { productId: string; onGuest: () => void; style?: StyleProp<ViewStyle> }) {
  const { user } = useAuth();
  const wishlist = useWishlist();
  const [failed, setFailed] = useState(false);
  const saved = wishlist.isSaved(productId);
  const loading = wishlist.pendingProductId === productId;

  const toggle = async () => {
    if (!user) { onGuest(); return; }
    if (loading) return;
    setFailed(false);
    try { await wishlist.toggle(productId); }
    catch { setFailed(true); }
  };

  const label = failed ? 'Retry wishlist update' : saved ? 'Remove from wishlist' : 'Add to wishlist';
  return <Pressable
    onPress={() => void toggle()}
    disabled={loading}
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityState={{ busy: loading, selected: saved }}
    style={({ pressed }) => [styles.root, failed && styles.failed, pressed && styles.pressed, style]}
  >
    {loading ? <ActivityIndicator size="small" color={theme.colors.primary.DEFAULT} /> :
      <Heart size={22} color={failed ? theme.colors.error : theme.colors.primary.DEFAULT} fill={saved ? theme.colors.primary.DEFAULT : 'transparent'} />}
  </Pressable>;
}

const styles = StyleSheet.create({
  root: { width: 44, height: 44, borderRadius: theme.radii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.white, borderWidth: 1, borderColor: theme.colors.border },
  failed: { borderColor: theme.colors.error },
  pressed: { opacity: 0.75 },
});
