import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Tabs } from 'expo-router';
import { useAuth } from '@/features/auth';
import { Button, headerOptions, Row, type IconName } from '@/shared/ui/kit';
import { color } from '@/shared/ui/theme';

function icon(name: IconName) {
  return function TabIcon({ color, size }: { color: unknown; size: number }) {
    return <Ionicons name={name} color={color as string} size={size} />;
  };
}

export default function TabsLayout() {
  const { signOut } = useAuth();
  return (
    <Tabs screenOptions={{ ...headerOptions, tabBarActiveTintColor: color.accent }}>
      <Tabs.Screen name="index" options={{ title: 'Tableau de bord', tabBarLabel: 'Accueil', tabBarIcon: icon('stats-chart'), tabBarButtonTestID: 'tab-dashboard',
        headerRight: () => (
          <Row>
            <Button testID="open-settings" icon="settings-outline" label="Réglages" variant="ghost" onPress={() => router.push('/settings')} />
            <Button testID="sign-out" icon="log-out-outline" label="Se déconnecter" variant="ghost" onPress={signOut} />
          </Row>
        ) }} />
      <Tabs.Screen name="calendar" options={{ title: 'Calendrier', tabBarIcon: icon('calendar-outline'), tabBarButtonTestID: 'tab-calendar' }} />
      <Tabs.Screen name="plans" options={{ title: 'Plans', headerShown: false, tabBarIcon: icon('list'), tabBarButtonTestID: 'tab-plans' }} />
      <Tabs.Screen name="workouts" options={{ title: 'Séances', headerShown: false, tabBarIcon: icon('stopwatch-outline'), tabBarButtonTestID: 'tab-workouts' }} />
    </Tabs>
  );
}
