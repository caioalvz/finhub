import { Text, View } from 'react-native';
import { MonthSwitcher } from '@/components/MonthSwitcher';
import { useTheme } from '@/components/theme';
import { Bar, Card, Donut, H, Icon, Muted, Screen } from '@/components/ui';
import { summarize } from '@/lib/calc';
import { CATEGORIES, RESERVE_COLOR, categoryOf } from '@/lib/categories';
import { formatBRL } from '@/lib/format';
import { useStore } from '@/lib/store';

export default function Dashboard() {
  const t = useTheme();
  const { state, month } = useStore();
  const s = summarize(state, month);
  const over = s.free < 0;

  const parts = [
    ...s.rows.filter((r) => r.planned > 0).map((r) => ({ value: r.planned, color: categoryOf(r.id).color })),
    ...(s.reserve > 0 ? [{ value: s.reserve, color: RESERVE_COLOR }] : []),
  ];

  return (
    <Screen>
      <MonthSwitcher />

      <Card style={{ backgroundColor: over ? t.warnBg : t.okBg }}>
        <Muted>{over ? 'Planejado passa da renda em' : 'Sobra prevista no mês'}</Muted>
        <Text style={{ color: over ? t.danger : t.accent, fontSize: 32, fontWeight: '800', marginTop: 2 }}>
          {formatBRL(Math.abs(s.free))}
        </Text>
        <Muted style={{ marginTop: 6 }}>
          Renda {formatBRL(s.income)} − despesas {formatBRL(s.essential + s.nonEssential)} − reserva{' '}
          {formatBRL(s.reserve)}
        </Muted>
      </Card>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Card style={{ flex: 1 }}>
          <Muted>Gasto real</Muted>
          <Text style={{ color: t.text, fontSize: 20, fontWeight: '800', marginTop: 2 }}>{formatBRL(s.spent)}</Text>
          <Muted style={{ marginTop: 4 }}>de {formatBRL(s.essential + s.nonEssential)} previstos</Muted>
        </Card>
        <Card style={{ flex: 1 }}>
          <Muted>Entradas reais</Muted>
          <Text style={{ color: t.text, fontSize: 20, fontWeight: '800', marginTop: 2 }}>
            {formatBRL(s.incomeActual)}
          </Text>
          <Muted style={{ marginTop: 4 }}>base {formatBRL(s.income)}</Muted>
        </Card>
      </View>

      <Card>
        <H>Essenciais x demais</H>
        <Row label="Essenciais ★" value={s.essential} max={s.income} color={t.danger} />
        <Row label="Não essenciais" value={s.nonEssential} max={s.income} color="#2E86AB" />
        <Row label={`Reserva (${state.settings.reservePct}%)`} value={s.reserve} max={s.income} color={RESERVE_COLOR} />
        <Muted style={{ marginTop: 4 }}>
          Só os essenciais já consomem {s.income > 0 ? Math.round((s.essential / s.income) * 100) : 0}% da renda.
        </Muted>
      </Card>

      <Card>
        <H>Por categoria</H>
        <View style={{ alignItems: 'center', marginBottom: 12 }}>
          <Donut parts={parts}>
            <Text style={{ color: t.muted, fontSize: 12 }}>planejado</Text>
            <Text style={{ color: t.text, fontSize: 17, fontWeight: '800' }}>{formatBRL(s.plannedTotal)}</Text>
          </Donut>
        </View>
        {s.rows.map((r) => {
          const c = categoryOf(r.id);
          const overBudget = r.actual > r.planned && r.planned > 0;
          return (
            <View key={r.id} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                <Icon name={c.icon as never} size={16} color={c.color} />
                <Text style={{ color: t.text, flex: 1, marginLeft: 8, fontWeight: '600' }}>{c.label}</Text>
                <Text style={{ color: overBudget ? t.danger : t.text, fontVariant: ['tabular-nums'] }}>
                  {formatBRL(r.actual)}
                  <Text style={{ color: t.muted }}> / {formatBRL(r.planned)}</Text>
                </Text>
              </View>
              <Bar value={r.actual} max={Math.max(r.planned, r.actual)} color={overBudget ? t.danger : c.color} />
            </View>
          );
        })}
        {CATEGORIES.length === 0 && <Muted>Sem dados.</Muted>}
      </Card>
    </Screen>
  );
}

function Row({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const t = useTheme();
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
        <Text style={{ color: t.text, fontWeight: '600' }}>{label}</Text>
        <Text style={{ color: t.text }}>{formatBRL(value)}</Text>
      </View>
      <Bar value={value} max={max} color={color} />
    </View>
  );
}
