import { useState } from 'react';
import { formatClock, parseClock, parseDistance } from '@/shared/lib/format';
import { Button, Field, Row, Sheet, Txt } from '@/shared/ui/kit';
import type { SessionView } from '@/features/plans/plan';
import { logRun } from '@/features/plans/plan.repository';

/** Records what was actually run, prefilled with what was planned. */
export function LogRunSheet({ view, onClose }: { view: SessionView; onClose(): void }) {
  const { session, totals } = view;
  const [km, setKm] = useState(String(Math.round((session.doneMeters ?? totals.meters) / 10) / 100).replace('.', ','));
  const [time, setTime] = useState(formatClock(session.doneSeconds ?? totals.seconds));
  const meters = parseDistance(`${km} km`);
  const seconds = parseClock(time);

  return (
    <Sheet visible title={view.workout.name} onClose={onClose}>
      <Txt v="muted">Ajuster avec ce qui a été réellement couru.</Txt>
      <Row style={{ alignItems: 'flex-start' }}>
        <Field label="Distance (km)" value={km} onChangeText={setKm} keyboardType="decimal-pad" error={!meters && 'Ex. : 8,5'} />
        <Field label="Durée (min:s)" value={time} onChangeText={setTime} keyboardType="numbers-and-punctuation" error={!seconds && 'Ex. : 52:30'} />
      </Row>
      <Button title="Enregistrer" variant="primary" disabled={!meters || !seconds}
        onPress={() => { logRun(session.id, { meters: meters!, seconds: seconds! }); onClose(); }} />
    </Sheet>
  );
}
