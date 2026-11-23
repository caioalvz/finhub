import { Pressable, Text, View } from 'react-native';
import { monthLabel, shiftMonth } from '@/lib/format';
import { useStore } from '@/lib/store';
import { useTheme } from './theme';
import { Icon } from './ui';

export function MonthSwitcher() {
  const t = useTheme();
  const { month, setMonth } = useStore();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <Pressable onPress={() => setMonth(shiftMonth(month, -1))} hitSlop={12}>
        <Icon name="chevron-back" size={24} color={t.text} />
      </Pressable>
      <Text style={{ color: t.text, fontSize: 20, fontWeight: '800' }}>{monthLabel(month)}</Text>
      <Pressable onPress={() => setMonth(shiftMonth(month, 1))} hitSlop={12}>
        <Icon name="chevron-forward" size={24} color={t.text} />
      </Pressable>
    </View>
  );
}
