import { useLocalSearchParams } from 'expo-router';
import { PlanDetailScreen } from '@/features/plans';

export default function Route() {
  return <PlanDetailScreen id={useLocalSearchParams<{ id: string }>().id} />;
}
