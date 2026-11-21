import { router } from 'expo-router';
import { Button, Card, Empty, Screen } from '@/shared/ui/kit';
import { useWorkouts } from './workout.repository';
import { WorkoutSummary } from './WorkoutSummary';

export function WorkoutListScreen() {
  const workouts = useWorkouts();
  return (
    <Screen testID="workout-list">
      <Button testID="workout-new" title="Nouvel entraînement" icon="add" variant="primary" onPress={() => router.push('/workouts/new')} />
      {workouts.length === 0 && (
        <Empty title="Aucun entraînement" text="Un entraînement se compose d’étapes : échauffement, répétitions, récupération, retour au calme." />
      )}
      {workouts.map((w) => (
        <Card key={w.id}>
          <WorkoutSummary workout={w} link />
        </Card>
      ))}
    </Screen>
  );
}
