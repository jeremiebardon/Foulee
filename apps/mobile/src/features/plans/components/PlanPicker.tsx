import { Chips } from '@/shared/ui/kit';
import { selectPlan, usePlans } from '../data/plan.repository';

/** Chooses the plan shown by the calendar and the dashboard. */
export function PlanPicker() {
  const plans = usePlans();
  const selected = plans.find((p) => p.selected);
  if (plans.length < 2 || !selected) return null;
  return <Chips testID="plan-picker" options={Object.fromEntries(plans.map((p) => [p.id, p.name]))} value={selected.id} onChange={selectPlan} />;
}
