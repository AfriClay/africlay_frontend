import { useState } from 'react';
import { ActivityIndicator, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Heart } from 'lucide-react-native';
import { useAuth } from '../../hooks/useAuth';
import { useWishlist } from '../../hooks/useWishlist';
import { theme } from '../../theme';
import { Button } from '../ui/Button';

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
  return <Button
    variant="icon"
    size="sm"
    onPress={() => void toggle()}
    disabled={loading}
    accessibilityLabel={label}
    accessibilityState={{ busy: loading, selected: saved }}
    style={[styles.root, failed && styles.failed, style]}
    icon={loading ? <ActivityIndicator size="small" color={theme.colors.primary.DEFAULT} /> :
      <Heart size={22} color={failed ? theme.colors.error : theme.colors.primary.DEFAULT} fill={saved ? theme.colors.primary.DEFAULT : 'transparent'} />}
  />;
}

const styles = StyleSheet.create({
  root: { backgroundColor: theme.colors.white, borderColor: theme.colors.border },
  failed: { borderColor: theme.colors.error },
});
