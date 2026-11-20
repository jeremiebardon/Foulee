import { useLocalSearchParams } from 'expo-router';
import { WorkoutDetailScreen } from '@/features/workouts/WorkoutDetailScreen';

export default function Route() {
  return <WorkoutDetailScreen id={useLocalSearchParams<{ id: string }>().id} />;
}
