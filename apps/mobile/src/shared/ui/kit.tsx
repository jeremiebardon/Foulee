import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack } from 'expo-router';
import { useState, type ComponentProps, type PropsWithChildren, type ReactNode } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type ScrollViewProps, type TextInputProps, type TextProps, type ViewStyle } from 'react-native';
import { color, radius, space } from './theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

// ---- Layout ----------------------------------------------------------------

export const headerOptions = { headerStyle: { backgroundColor: color.surface }, headerTitleStyle: { fontWeight: '800' }, headerShadowVisible: false } as const;

/** A tab that holds a list and its detail screens. */
export const ListStack = ({ title }: { title: string }) => (
  <Stack screenOptions={headerOptions}>
    <Stack.Screen name="index" options={{ title }} />
  </Stack>
);

// `testID` props are the Maestro seam: e2e flows select elements by test ID only, never by copy.

/** With `refreshControl`, pulling the screen down refreshes it. */
export const Screen = ({ children, testID, refreshControl }: PropsWithChildren<{ testID?: string; refreshControl?: ScrollViewProps['refreshControl'] }>) => (
  <ScrollView testID={testID} style={s.screen} contentContainerStyle={s.screenContent} keyboardShouldPersistTaps="handled" refreshControl={refreshControl}>
    {children}
  </ScrollView>
);

export const Card = ({ children, style, testID }: PropsWithChildren<{ style?: ViewStyle; testID?: string }>) => <View testID={testID} style={[s.card, style]}>{children}</View>;

export const Row = ({ children, style }: PropsWithChildren<{ style?: ViewStyle }>) => <View style={[s.row, style]}>{children}</View>;

// ---- Text ------------------------------------------------------------------

type Variant = keyof typeof txt;
export const Txt = ({ v = 'body', style, ...props }: TextProps & { v?: Variant }) => <Text style={[txt[v], style]} {...props} />;

// ---- Controls --------------------------------------------------------------

type ButtonProps = { title?: string; icon?: IconName; onPress(): void; variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; disabled?: boolean; label?: string; testID?: string };

export function Button({ title, icon, onPress, variant = 'secondary', disabled, label, testID }: ButtonProps) {
  const fg = variant === 'primary' ? '#fff' : variant === 'danger' ? color.danger : color.ink;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label ?? title}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [s.button, s[variant], !title && s.iconOnly, (pressed || disabled) && { opacity: 0.6 }]}
    >
      {icon && <Ionicons name={icon} size={18} color={fg} />}
      {title && <Text style={[s.buttonText, { color: fg }]}>{title}</Text>}
    </Pressable>
  );
}

export const Field = ({ label, error, style, ...input }: TextInputProps & { label: string; error?: string | false }) => (
  <View style={[s.field, style as ViewStyle]}>
    <Txt v="label">{label}</Txt>
    <TextInput accessibilityLabel={label} placeholderTextColor={color.muted} style={[s.input, !!error && { borderColor: color.danger }]} {...input} />
    {!!error && <Txt v="error">{error}</Txt>}
  </View>
);

/**
 * Text field bound to a parsed value (distance, pace, duration…). Keeps the raw
 * text while typing and only reports values that parse; reformats on blur.
 */
export function ParsedField<T>({ value, format, parse, onChange, invalidText, ...field }: Omit<ComponentProps<typeof Field>, 'value' | 'onChange'> & {
  value: T | undefined;
  format(v: T): string;
  parse(text: string): T | null;
  onChange(v: T | undefined): void;
  invalidText: string;
}) {
  const [text, setText] = useState(value === undefined ? '' : format(value));
  const invalid = text.trim() !== '' && parse(text) === null;
  return (
    <Field
      {...field}
      value={text}
      error={invalid && invalidText}
      onChangeText={(t) => {
        setText(t);
        const parsed = parse(t);
        if (parsed !== null) onChange(parsed);
        else if (!t.trim()) onChange(undefined);
      }}
      onBlur={() => !invalid && setText(value === undefined ? '' : format(value))}
    />
  );
}

/** Single choice among a few options, shown as chips. With `testID`, each chip is `<testID>-<option key>`. */
export function Chips<T extends string>({ options, value, onChange, testID }: { options: Record<T, string>; value: T; onChange(v: T): void; testID?: string }) {
  return (
    <View style={s.chips}>
      {(Object.keys(options) as T[]).map((key) => (
        <Pressable key={key} testID={testID && `${testID}-${key}`} accessibilityRole="radio" accessibilityState={{ selected: key === value }} onPress={() => onChange(key)} style={[s.chip, key === value && s.chipOn]}>
          <Text style={[s.chipText, key === value && { color: color.accent }]}>{options[key]}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/** With `testID`, the buttons are `<testID>-minus` and `<testID>-plus`, the value `<testID>-value`. */
export function Stepper({ label, value, onChange, min = 1, max = 99, step = 1, format = String, testID }: {
  label: string; value: number; onChange(v: number): void; min?: number; max?: number; step?: number; format?(v: number): string; testID?: string;
}) {
  return (
    <View style={s.field}>
      <Txt v="label">{label}</Txt>
      <Row style={s.stepper}>
        <Button testID={testID && `${testID}-minus`} icon="remove" label={`${label} : moins`} variant="ghost" disabled={value - step < min} onPress={() => onChange(value - step)} />
        <Txt testID={testID && `${testID}-value`} v="h3" style={{ flex: 1, textAlign: 'center' }}>{format(value)}</Txt>
        <Button testID={testID && `${testID}-plus`} icon="add" label={`${label} : plus`} variant="ghost" disabled={value + step > max} onPress={() => onChange(value + step)} />
      </Row>
    </View>
  );
}

// ---- Overlays & states -----------------------------------------------------

export const Sheet = ({ visible, title, onClose, children, testID }: PropsWithChildren<{ visible: boolean; title: string; onClose(): void; testID?: string }>) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <Pressable style={s.backdrop} onPress={onClose} accessibilityLabel="Fermer" />
    <View testID={testID} style={s.sheet}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt v="h2" style={{ flex: 1 }}>{title}</Txt>
        <Button icon="close" label="Fermer" variant="ghost" onPress={onClose} />
      </Row>
      <ScrollView contentContainerStyle={{ gap: space.md }} keyboardShouldPersistTaps="handled">{children}</ScrollView>
    </View>
  </Modal>
);

export const Empty = ({ title, text, action, testID }: { title: string; text: string; action?: ReactNode; testID?: string }) => (
  <View testID={testID} style={s.empty}>
    <Txt v="h2">{title}</Txt>
    <Txt v="muted">{text}</Txt>
    {action}
  </View>
);

/** Destructive confirmation. */
export function confirm(title: string, message: string, action: string, onConfirm: () => void) {
  Alert.alert(title, message, [{ text: 'Annuler', style: 'cancel' }, { text: action, style: 'destructive', onPress: onConfirm }]);
}

// ---- Styles ----------------------------------------------------------------

const display = { fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.3, color: color.ink } as const;
export const txt = StyleSheet.create({
  h1: { ...display, fontSize: 30 },
  h2: { ...display, fontSize: 20 },
  h3: { fontSize: 17, fontWeight: '700', color: color.ink },
  body: { fontSize: 15, color: color.ink, lineHeight: 21 },
  muted: { fontSize: 14, color: color.muted, lineHeight: 20 },
  label: { fontSize: 13, fontWeight: '600', color: color.muted },
  error: { fontSize: 13, fontWeight: '500', color: color.danger },
  big: { fontSize: 34, fontWeight: '800', color: color.ink, fontVariant: ['tabular-nums'] },
});

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  screenContent: { padding: space.lg, gap: space.lg, paddingBottom: space.xl * 2 },
  card: { backgroundColor: color.surface, borderRadius: radius, borderWidth: 1, borderColor: color.line, padding: space.lg, gap: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  button: { minHeight: 44, paddingHorizontal: space.lg, borderRadius: 10, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  iconOnly: { width: 44, paddingHorizontal: 0 },
  primary: { backgroundColor: color.accent, borderColor: color.accent },
  secondary: { backgroundColor: color.surface, borderColor: color.line },
  ghost: { backgroundColor: 'transparent', borderColor: 'transparent' },
  danger: { backgroundColor: color.surface, borderColor: color.line },
  buttonText: { fontSize: 15, fontWeight: '600' },
  field: { gap: 6, flexGrow: 1, minWidth: 140 },
  input: { height: 46, borderWidth: 1, borderColor: color.line, borderRadius: 10, paddingHorizontal: space.md, fontSize: 16, color: color.ink, backgroundColor: color.surface },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: { paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: 999, borderWidth: 1, borderColor: color.line, backgroundColor: color.surface },
  chipOn: { borderColor: color.accent, backgroundColor: color.accentSoft },
  chipText: { fontSize: 14, fontWeight: '600', color: color.muted },
  stepper: { borderWidth: 1, borderColor: color.line, borderRadius: 10, backgroundColor: color.surface, flexWrap: 'nowrap', gap: 0 },
  backdrop: { flex: 1, backgroundColor: 'rgba(8,13,24,0.5)' },
  sheet: { maxHeight: '80%', backgroundColor: color.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: space.lg, paddingBottom: space.xl * 1.5, gap: space.md },
  empty: { gap: space.md, padding: space.xl, borderWidth: 1, borderStyle: 'dashed', borderColor: color.line, borderRadius: radius, alignItems: 'flex-start' },
});
