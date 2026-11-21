import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Txt } from '@/shared/ui/kit';
import { color, space } from '@/shared/ui/theme';
import { CATEGORY_COLOR, formatTotals } from '@/features/workouts';
import type { SessionView } from './plan';

/** One session in a plan: workout name, totals, done mark, and an optional trailing action. */
export const SessionRow = ({ view, prefix, onPress, action }: { view: SessionView; prefix?: string; onPress?(): void; action?: ReactNode }) => (
  <Pressable disabled={!onPress} onPress={onPress} accessibilityRole={onPress ? 'button' : undefined}
    style={[s.row, { borderLeftColor: CATEGORY_COLOR[view.workout.category] }]}>
    <View style={{ flex: 1, paddingVertical: space.sm }}>
      {prefix && <Txt v="label">{prefix}</Txt>}
      <Txt style={{ fontWeight: '600' }}>{view.workout.name}</Txt>
      <Txt v="muted" style={view.done && { color: color.ok, fontWeight: '600' }}>{view.done ? `✓ ${formatTotals({ meters: view.session.doneMeters!, seconds: view.session.doneSeconds!, estimated: false })}` : formatTotals(view.totals)}</Txt>
    </View>
    {action}
  </Pressable>
);

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingLeft: space.md, borderRadius: 8, borderWidth: 1, borderLeftWidth: 4, borderColor: color.line, backgroundColor: color.surface },
});
