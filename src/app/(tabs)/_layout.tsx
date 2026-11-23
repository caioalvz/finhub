import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useTheme } from '@/components/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const tab = (name: string, title: string, icon: IconName) => (
  <Tabs.Screen
    name={name}
    options={{
      title,
      tabBarIcon: ({ color, size }) => <Ionicons name={icon} color={color as string} size={size} />,
    }}
  />
);

export default function TabsLayout() {
  const t = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.accent,
        tabBarInactiveTintColor: t.muted,
        tabBarStyle: { backgroundColor: t.card, borderTopColor: t.line },
      }}
    >
      {tab('index', 'Painel', 'pie-chart')}
      {tab('expenses', 'Despesas', 'list')}
      {tab('transactions', 'Lançamentos', 'swap-vertical')}
      {tab('family', 'Família', 'people')}
    </Tabs>
  );
}
