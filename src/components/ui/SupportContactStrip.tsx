import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Phone } from 'lucide-react-native';
import { SUPPORT_PHONE_DISPLAY, SUPPORT_PHONE_URL } from '../../constants/support';
import { theme } from '../../theme';

export const SupportContactStrip = () => (
  <Pressable
    accessibilityRole="link"
    accessibilityLabel={`Call AfriClay support on ${SUPPORT_PHONE_DISPLAY}`}
    onPress={() => void Linking.openURL(SUPPORT_PHONE_URL)}
    style={({ pressed }) => [styles.strip, pressed && styles.pressed]}
  >
    <View style={styles.content}>
      <Phone size={16} color={theme.colors.white} />
      <Text style={styles.copy}>Need help? Call AfriClay support <Text style={styles.number}>{SUPPORT_PHONE_DISPLAY}</Text></Text>
    </View>
  </Pressable>
);

const styles = StyleSheet.create({
  strip: { minHeight: 42, paddingHorizontal: theme.spacing.md, justifyContent: 'center', backgroundColor: theme.colors.ink },
  pressed: { opacity: 0.85 },
  content: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: theme.spacing.xs },
  copy: { color: theme.colors.white, fontSize: 13, textAlign: 'center' },
  number: { color: theme.colors.white, fontSize: 15, fontWeight: '800' },
});
