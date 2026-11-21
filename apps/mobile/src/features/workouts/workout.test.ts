import { describeWorkout, flatten, validateWorkout, workoutTotals, type Workout } from './workout';

const example: Workout = {
  id: 'w',
  name: '2 × 400',
  category: 'intervals',
  items: [{ kind: 'repeat', count: 2, steps: [{ kind: 'run', measure: { type: 'distance', meters: 400 }, pace: 240 }] }, { kind: 'cooldown', measure: { type: 'distance', meters: 2000 } }],
};

describe('structured workout', () => {
  it('describes « 2 × 400 m à 4:00/km + 2 km de retour au calme »', () => {
    expect(describeWorkout(example.items)).toBe('2 × 400 m à 4:00/km + 2 km de retour au calme');
  });

  it('unrolls repeats and totals distance and time', () => {
    expect(flatten(example.items)).toHaveLength(3);
    // 2 × 400 m at 4:00/km = 192 s; 2 km at the default cool-down pace (6:15/km) = 750 s
    expect(workoutTotals(example.items)).toEqual({ meters: 2800, seconds: 942, estimated: true });
  });

  it('converts a timed step to distance with its pace', () => {
    expect(workoutTotals([{ kind: 'run', measure: { type: 'time', seconds: 600 }, pace: 300 }])).toEqual({ meters: 2000, seconds: 600, estimated: false });
  });

  it('brackets a multi-step block', () => {
    const items: Workout['items'] = [{ kind: 'repeat', count: 6, steps: [{ kind: 'run', measure: { type: 'distance', meters: 400 }, pace: 230 }, { kind: 'recovery', measure: { type: 'time', seconds: 60 } }] }];
    expect(describeWorkout(items)).toBe('6 × (400 m à 3:50/km + 1 min de récupération)');
  });

  it('validates name, steps and sizes', () => {
    expect(validateWorkout(example)).toEqual([]);
    expect(validateWorkout({ ...example, name: ' ', items: [] })).toHaveLength(2);
    expect(validateWorkout({ ...example, items: [{ kind: 'run', measure: { type: 'distance', meters: 0 } }] })).toHaveLength(1);
  });
});
