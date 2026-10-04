import { forwardRef, useState } from 'react';
import {
  Pressable,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type StyleProp,
  type TextInputKeyPressEventData,
  type ViewStyle,
} from 'react-native';
import { Search, X } from 'lucide-react-native';
import { useAppTheme } from '../../contexts/ThemeContext';
import { theme } from '../../theme';
import { Button } from './Button';

type Props = {
  value: string;
  onChangeText: (value: string) => void;
  onSubmit?: () => void;
  onCancel?: () => void;
  placeholder?: string;
  accessibilityLabel?: string;
  autoFocus?: boolean;
  showCancel?: boolean;
  cancelAsIcon?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  onKeyPress?: (event: NativeSyntheticEvent<TextInputKeyPressEventData>) => void;
};

export const SearchField = forwardRef<TextInput, Props>(({ value, onChangeText, onSubmit, onCancel,
  placeholder = 'Search products and sellers', accessibilityLabel = 'Search products and sellers', autoFocus,
  showCancel = false, cancelAsIcon = false, containerStyle, onKeyPress }, ref) => {
  const { colors } = useAppTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.row, containerStyle]}>
      <View style={[styles.field, { backgroundColor: colors.surface, borderColor: focused ? colors.focusRing : colors.border }]}>
        <Search color={focused ? colors.accent : colors.textMuted} size={20} strokeWidth={1.9} />
        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmit}
          onKeyPress={onKeyPress}
          returnKeyType="search"
          enterKeyHint="search"
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          accessibilityLabel={accessibilityLabel}
          accessibilityRole="search"
          autoFocus={autoFocus}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="never"
          style={[styles.input, { color: colors.text }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null]}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {value.length > 0 ? <Button variant="icon" size="sm" icon={<X size={19} color={colors.textMuted} />} onPress={() => onChangeText('')} accessibilityLabel="Clear search" /> : null}
      </View>
      {showCancel && onCancel ? cancelAsIcon
        ? <Button variant="icon" size="sm" icon={<X size={20} color={colors.text} />} onPress={onCancel} accessibilityLabel="Close search" />
        : <Button variant="tertiary" size="sm" onPress={onCancel}>Cancel</Button> : null}
    </View>
  );
});

SearchField.displayName = 'SearchField';

export const SearchTrigger = ({ onPress, placeholder = 'Search products and sellers', style }: {
  onPress: () => void;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
}) => {
  const { colors } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="search"
      accessibilityLabel={placeholder}
      style={({ pressed }) => [styles.trigger, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && { backgroundColor: colors.accentSoft }, style]}
    >
      <Search color={colors.accentPressed} size={21} strokeWidth={1.9} />
      <Text numberOfLines={1} style={[styles.placeholder, { color: colors.textMuted }]}>{placeholder}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, minWidth: 0 },
  field: {
    minWidth: 0,
    flex: 1,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingLeft: theme.spacing.md,
    paddingRight: theme.spacing.xs,
    borderWidth: 2,
    borderRadius: theme.radii.control,
  },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    paddingVertical: theme.spacing.smd,
    fontFamily: 'Inter_400Regular',
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
  },
  trigger: {
    minHeight: 52,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.smd,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderRadius: theme.radii.control,
  },
  placeholder: { flex: 1, minWidth: 0, fontFamily: 'Inter_400Regular', fontSize: theme.typography.body.fontSize },
});
