import { usePerformanceMonitorDevTools } from '@rozenite/performance-monitor-plugin';
import { useReactNavigationDevTools } from '@rozenite/react-navigation-plugin';
import { useRequireProfilerDevTools } from '@rozenite/require-profiler-plugin';
import { useDrizzleStudio } from 'expo-drizzle-studio-plugin';
import { useNavigationContainerRef } from 'expo-router';
import { db } from '@/db/client';

/**
 * Development-only debugging tools, wired by the root layout once the database is open:
 * the Rozenite plugins that need app code (Expo Atlas is Metro-only, see metro.config.js),
 * and Drizzle Studio on the device database. Open them from the dev server: `j` opens
 * React Native DevTools with the Rozenite panels, Shift+M lists Drizzle Studio.
 * Never import this module statically: the root layout requires it behind `__DEV__` so
 * production bundles leave it, and the packages above, out.
 */
export function useDevTools() {
  usePerformanceMonitorDevTools();
  useRequireProfilerDevTools();
  useReactNavigationDevTools({ ref: useNavigationContainerRef() });
  useDrizzleStudio(db.$client);
}
