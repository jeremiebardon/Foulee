import { useLocalSearchParams } from 'expo-router';
import { PlanEditorScreen } from '@/features/plans';

export default function Route() {
  return <PlanEditorScreen id={useLocalSearchParams<{ id: string }>().id} />;
}
