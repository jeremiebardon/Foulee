import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { formatLongDate, formatMonth, fromISO, monthGrid, todayISO, toISO, type ISODate } from '@/shared/lib/dates';
import { formatClock, formatDistance, formatPace } from '@/shared/lib/format';
import { Button, Card, Empty, Row, Screen, Txt } from '@/shared/ui/kit';
import { color, space } from '@/shared/ui/theme';
import { logRun, planEnd, PlanPicker, useSelectedPlan, useSessionViews, type SessionView } from '@/features/plans';
import { CATEGORY_COLOR, WorkoutSummary } from '@/features/workouts';
import { LogRunSheet } from './LogRunSheet';

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export function CalendarScreen() {
  const plan = useSelectedPlan();
  const views = useSessionViews().filter((v) => v.plan.id === plan?.id);
  const today = todayISO();
  const [month, setMonth] = useState(() => today.slice(0, 7) + '-01');
  const [selected, setSelected] = useState(today);
  const [logging, setLogging] = useState<SessionView | null>(null);

  if (!plan) return <Screen testID="calendar"><Empty testID="calendar-empty" title="Aucun plan" text="Le calendrier affiche les séances du plan sélectionné. Créer un plan dans l’onglet Plans." /></Screen>;

  const m = fromISO(month);
  const shift = (n: number) => setMonth(toISO(new Date(m.getFullYear(), m.getMonth() + n, 1)));
  const inPlan = (d: ISODate) => d >= plan.startDate && d <= planEnd(plan);
  const ofDay = (d: ISODate) => views.filter((v) => v.date === d);

  return (
    <Screen testID="calendar">
      <PlanPicker />
      <Card style={{ paddingHorizontal: space.sm }}>
        <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
          <Button icon="chevron-back" label="Mois précédent" variant="ghost" onPress={() => shift(-1)} />
          <Txt v="h2" style={{ flex: 1, textAlign: 'center' }}>{formatMonth(month)}</Txt>
          <Button icon="chevron-forward" label="Mois suivant" variant="ghost" onPress={() => shift(1)} />
          <Button title="Auj." label="Aujourd’hui" onPress={() => { setMonth(today.slice(0, 7) + '-01'); setSelected(today); }} />
        </Row>
        <View style={s.grid}>
          {WEEKDAYS.map((d, i) => <Txt key={i} v="label" style={[s.cell, { textAlign: 'center' }]}>{d}</Txt>)}
          {monthGrid(m.getFullYear(), m.getMonth()).map((d) => (
            // E2E flows pick a day by what it holds, since the dates move with the day they run.
            <Pressable key={d} testID={ofDay(d).some((v) => !v.done) ? 'calendar-day-planned' : 'calendar-day'} accessibilityRole="button" accessibilityLabel={formatLongDate(d)} accessibilityState={{ selected: d === selected }}
              onPress={() => setSelected(d)} style={[s.cell, s.day, inPlan(d) && s.inPlan, d === selected && s.selected]}>
              <Txt style={[s.num, d === today && s.today, d.slice(0, 7) !== month.slice(0, 7) && { opacity: 0.35 }]}>{fromISO(d).getDate()}</Txt>
              <Row style={{ gap: 3, justifyContent: 'center' }}>
                {ofDay(d).map((v) => {
                  const c = CATEGORY_COLOR[v.workout.category];
                  return <View key={v.session.id} style={[s.dot, { borderColor: c, backgroundColor: v.done ? c : 'transparent' }]} />;
                })}
              </Row>
            </Pressable>
          ))}
        </View>
        <Txt v="muted" style={{ paddingHorizontal: space.sm }}>● faite · ○ prévue</Txt>
      </Card>

      <Txt v="h2">{formatLongDate(selected)}</Txt>
      {ofDay(selected).length === 0 && <Txt v="muted">{inPlan(selected) ? 'Repos : aucune séance prévue.' : 'En dehors du plan.'}</Txt>}
      {ofDay(selected).map((v) => (
        <Card key={v.session.id} testID="calendar-session">
          <WorkoutSummary workout={v.workout} link />
          {v.done ? (
            <>
              <Txt testID="calendar-session-done" style={{ color: color.ok, fontWeight: '700' }}>
                ✓ Faite : {formatDistance(v.session.doneMeters!)} en {formatClock(v.session.doneSeconds!)} · {formatPace(v.session.doneSeconds! / (v.session.doneMeters! / 1000))}
              </Txt>
              <Row>
                <Button testID="calendar-edit-run" title="Modifier" onPress={() => setLogging(v)} />
                <Button testID="calendar-unlog-run" title="Marquer non faite" variant="ghost" onPress={() => logRun(v.session.id, null)} />
              </Row>
            </>
          ) : (
            <Button testID="calendar-log-run" title="Marquer comme faite" icon="checkmark" variant="primary" onPress={() => setLogging(v)} />
          )}
        </Card>
      ))}

      {logging && <LogRunSheet view={logging} onClose={() => setLogging(null)} />}
    </Screen>
  );
}

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, paddingVertical: 4 },
  day: { minHeight: 52, alignItems: 'center', gap: 4, borderRadius: 8, borderWidth: 1.5, borderColor: 'transparent' },
  inPlan: { backgroundColor: color.surface2 },
  selected: { borderColor: color.accent },
  num: { width: 26, height: 26, lineHeight: 26, textAlign: 'center', borderRadius: 13, overflow: 'hidden', fontWeight: '600' },
  today: { backgroundColor: color.lane },
  dot: { width: 9, height: 9, borderRadius: 5, borderWidth: 2 },
});
