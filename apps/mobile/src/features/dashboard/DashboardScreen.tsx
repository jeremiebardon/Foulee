import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { appConfig } from '@/shared/config/appConfig';
import { diffDays, formatLongDate, formatShortDate, todayISO } from '@/shared/lib/dates';
import { formatDuration, formatKm, formatPaceValue } from '@/shared/lib/format';
import { Button, Card, Empty, Row, Screen, Txt } from '@/shared/ui/kit';
import { color, space } from '@/shared/ui/theme';
import { seedDemo } from '@/db/seed';
import { createPlan, PlanPicker, useSelectedPlan, useSessionViews } from '@/features/plans';
import { WorkoutSummary } from '@/features/workouts';
import { computeStats, niceCeil, type WeekVolume } from './stats';

export function DashboardScreen() {
  const plan = useSelectedPlan();
  const today = todayISO();
  const { week, last28, adherence, weekly, next } = computeStats(useSessionViews(), plan?.id ?? null, today);

  if (!plan) {
    const demo = appConfig().devFeatures;
    return (
      <Screen>
        <Empty
          title="Aucun plan"
          text={demo ? 'Créer un plan, ou charger un exemple pour découvrir l’app.' : 'Créer un plan pour commencer.'}
          action={
            <Row>
              {/* Dev shortcut: the demo plan exists only in the development variant. */}
              {demo && <Button title="Charger un exemple" variant="primary" onPress={() => seedDemo()} />}
              <Button title="Créer un plan" variant={demo ? 'secondary' : 'primary'} onPress={() => router.push(`/plans/${createPlan()}/edit`)} />
            </Row>
          }
        />
      </Screen>
    );
  }

  const nextIn = next ? diffDays(next.date, today) : null;
  return (
    <Screen>
      <PlanPicker />
      <View style={s.tiles}>
        <Tile label="Cette semaine" value={formatKm(week.done)} unit={`/ ${formatKm(week.planned, 0)} km`} note={`${week.sessionsDone} séance(s) sur ${week.sessionsPlanned}`} ratio={week.planned ? week.done / week.planned : 0} />
        <Tile label="28 derniers jours" value={formatKm(last28.meters, 0)} unit="km" note={`${last28.runs} sorties · ${formatDuration(last28.seconds)}`} />
        <Tile label="Allure moyenne" value={last28.pace ? formatPaceValue(last28.pace) : '—'} unit="/km" note="Sur 28 jours" />
        <Tile label="Assiduité" value={adherence.due ? String(Math.round((adherence.done / adherence.due) * 100)) : '—'} unit="%" note={`${adherence.done} faites sur ${adherence.due} prévues`} />
      </View>

      <Card>
        <Txt v="h2">Volume par semaine</Txt>
        <Txt v="muted">Barre pleine : couru · contour : prévu</Txt>
        <WeeklyChart weeks={weekly} />
      </Card>

      <Card>
        <Txt v="h2">Prochaine séance</Txt>
        {next ? (
          <>
            <Txt v="label" style={{ color: color.accent }}>{nextIn === 0 ? 'Aujourd’hui' : nextIn === 1 ? 'Demain' : formatLongDate(next.date)}</Txt>
            <WorkoutSummary workout={next.workout} link />
            <Button title="Ouvrir le calendrier" onPress={() => router.push('/calendar')} />
          </>
        ) : (
          <Txt v="muted">Plus aucune séance à venir dans ce plan.</Txt>
        )}
      </Card>
    </Screen>
  );
}

const Tile = ({ label, value, unit, note, ratio }: { label: string; value: string; unit: string; note: string; ratio?: number }) => (
  <Card style={s.tile}>
    <Txt v="label">{label}</Txt>
    <Txt v="big">{value}<Txt v="muted"> {unit}</Txt></Txt>
    {ratio !== undefined && <View style={s.meter}><View style={[s.meterFill, { width: `${Math.min(1, ratio) * 100}%` }]} /></View>}
    <Txt v="muted">{note}</Txt>
  </Card>
);

function WeeklyChart({ weeks }: { weeks: WeekVolume[] }) {
  const max = niceCeil(Math.max(...weeks.map((w) => Math.max(w.planned, w.done))) / 1000);
  const pct = (m: number) => `${Math.min(100, (m / 1000 / max) * 100)}%` as const;
  return (
    <View style={{ gap: space.xs }}>
      <Txt v="label">{max} km</Txt>
      <View style={s.chart}>
        {weeks.map((w) => (
          <View key={w.start} style={s.col}>
            {w.planned > 0 && <View style={[s.planned, { height: pct(w.planned) }]} />}
            <View style={[s.done, { height: pct(w.done), backgroundColor: w.current ? color.accent : '#8ea3ea' }]} />
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row' }}>
        {weeks.map((w) => (
          <Txt key={w.start} v="label" numberOfLines={1} style={[{ flex: 1, textAlign: 'center', fontSize: 10 }, w.current && { color: color.ink }]}>
            {formatShortDate(w.start).replace('.', '')}
          </Txt>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  tile: { flexGrow: 1, flexBasis: 150, gap: space.xs, padding: space.md },
  meter: { height: 6, borderRadius: 3, backgroundColor: color.surface2, overflow: 'hidden' },
  meterFill: { height: '100%', backgroundColor: color.accent },
  chart: { height: 160, flexDirection: 'row', gap: 6, borderBottomWidth: 1, borderColor: color.line },
  col: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  planned: { position: 'absolute', bottom: 0, left: 0, right: 0, borderWidth: 1.5, borderStyle: 'dashed', borderColor: color.muted, borderBottomWidth: 0, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  done: { width: '60%', borderTopLeftRadius: 4, borderTopRightRadius: 4 },
});
