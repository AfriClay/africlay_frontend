import { ActivityIndicator, Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { Heart } from 'lucide-react-native';
import { useWishlist } from '../../hooks/useWishlist';
import { useAuth } from '../../hooks/useAuth';
import { theme } from '../../theme';

export function WishlistToggle({ productId, onGuest, style }: { productId: string; onGuest: () => void; style?: StyleProp<ViewStyle> }) {
  const wishlist = useWishlist();
  const auth = useAuth();
  const saved = wishlist.has(productId);
  const loading = !auth.isGuest && wishlist.loading;
  return <Pressable style={style} accessibilityRole="button"
    accessibilityLabel={saved ? 'Remove from wishlist' : 'Add to wishlist'}
    accessibilityState={{ selected: saved, disabled: loading, busy: loading }} disabled={loading}
    onPress={() => { if (auth.isGuest) onGuest(); else void wishlist.toggle(productId); }}>
    {loading ? <ActivityIndicator size="small" color={theme.colors.white} /> :
      <Heart size={22} color={saved ? theme.colors.secondary.DEFAULT : theme.colors.white}
        fill={saved ? theme.colors.secondary.DEFAULT : 'transparent'} />}
  </Pressable>;
}
