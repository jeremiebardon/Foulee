import { useLocalSearchParams } from 'expo-router';
import { WorkoutEditorScreen } from '@/features/workouts/WorkoutEditorScreen';

export default function Route() {
  return <WorkoutEditorScreen id={useLocalSearchParams<{ id: string }>().id} />;
}
