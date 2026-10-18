import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Check } from 'lucide-react-native';
import { useAppTheme } from '../../contexts/ThemeContext';
import { theme } from '../../theme';
import { FormField } from './FormField';

export type ChoiceOption<T extends string> = {
  value: T;
  label: string;
  description?: string;
  disabled?: boolean;
};

export function ChoiceGroup<T extends string>({ label, value, options, onChange, disabled = false, required, helperText, style }: {
  label?: string;
  value: T;
  options: readonly ChoiceOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  required?: boolean;
  helperText?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useAppTheme();
  return <FormField label={label} required={required} helperText={helperText} style={style}>
    <View style={styles.options} accessibilityRole="radiogroup">
      {options.map(option => {
        const selected = option.value === value;
        const blocked = disabled || option.disabled;
        return <Pressable
          key={option.value}
          onPress={() => !blocked && onChange(option.value)}
          disabled={blocked}
          accessibilityRole="radio"
          accessibilityLabel={option.description ? `${option.label}: ${option.description}` : option.label}
          accessibilityState={{ selected, disabled: blocked }}
          style={({ pressed }) => [
            styles.option,
            { backgroundColor: selected ? colors.accentSoft : colors.surface, borderColor: selected ? colors.accent : colors.border },
            pressed && !blocked ? { backgroundColor: colors.accentSoft } : null,
            blocked ? styles.disabled : null,
          ]}
        >
          <View style={[styles.radio, { borderColor: selected ? colors.accent : colors.border, backgroundColor: selected ? colors.accent : colors.surface }]}>
            {selected ? <Check size={13} strokeWidth={3} color={colors.surface} /> : null}
          </View>
          <View style={styles.copy}>
            <Text style={[styles.optionLabel, { color: selected ? colors.accentPressed : colors.text }]}>{option.label}</Text>
            {option.description ? <Text style={[styles.description, { color: colors.textMuted }]}>{option.description}</Text> : null}
          </View>
        </Pressable>;
      })}
    </View>
  </FormField>;
}

const styles = StyleSheet.create({
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  option: { flex: 1, minWidth: 128, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingHorizontal: theme.spacing.smd, paddingVertical: theme.spacing.sm, borderWidth: 1, borderRadius: theme.radii.control },
  radio: { width: 20, height: 20, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: theme.radii.pill },
  copy: { flex: 1, minWidth: 0 },
  optionLabel: { fontFamily: 'Inter_600SemiBold', fontSize: theme.typography.small.fontSize, lineHeight: theme.typography.small.lineHeight },
  description: { marginTop: 2, fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17 },
  disabled: { opacity: 0.5 },
});
