import { usePlans } from '../data/plan.repository';

/** The plan the calendar and the dashboard show, or `null` while none is selected. */
export const useSelectedPlan = () => usePlans().find((p) => p.selected) ?? null;
