import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { MonthSwitcher } from '@/components/MonthSwitcher';
import { useTheme } from '@/components/theme';
import { Button, Card, Chip, Fab, Field, Icon, Muted, Screen, Segmented, Sheet } from '@/components/ui';
import { txsOfMonth } from '@/lib/calc';
import { CATEGORIES, categoryOf } from '@/lib/categories';
import { centsToInput, dateLabel, formatBRL, parseBRL, todayISO } from '@/lib/format';
import { newId, useStore } from '@/lib/store';
import type { CategoryId, Tx } from '@/lib/types';

const blank = (): Tx => ({
  id: newId(),
  date: todayISO(),
  amount: 0,
  description: '',
  category: 'outros',
  source: 'manual',
});

export default function Transactions() {
  const t = useTheme();
  const { state, month, saveTx, removeTx } = useStore();
  const [editing, setEditing] = useState<Tx | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [amountText, setAmountText] = useState('');
  const [type, setType] = useState<'out' | 'in'>('out');

  const list = txsOfMonth(state, month).sort((a, b) => b.date.localeCompare(a.date));
  const inSum = list.filter((x) => x.amount > 0).reduce((s, x) => s + x.amount, 0);
  const outSum = list.filter((x) => x.amount < 0).reduce((s, x) => s - x.amount, 0);

  const open = (tx: Tx, fresh = false) => {
    setEditing(tx);
    setIsNew(fresh);
    setType(tx.amount > 0 ? 'in' : 'out');
    setAmountText(tx.amount ? centsToInput(tx.amount) : '');
  };

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <MonthSwitcher />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Card style={{ flex: 1 }}>
            <Muted>Entradas</Muted>
            <Text style={{ color: t.accent, fontSize: 20, fontWeight: '800' }}>{formatBRL(inSum)}</Text>
          </Card>
          <Card style={{ flex: 1 }}>
            <Muted>Saídas</Muted>
            <Text style={{ color: t.danger, fontSize: 20, fontWeight: '800' }}>{formatBRL(outSum)}</Text>
          </Card>
        </View>

        <Card>
          {list.length === 0 && (
            <Muted>
              Nenhum lançamento neste mês. Toque no + para registrar um gasto ou entrada. Quando o banco estiver
              conectado, os lançamentos reais aparecem aqui sozinhos.
            </Muted>
          )}
          {list.map((x, idx) => {
            const c = categoryOf(x.category);
            return (
              <Pressable
                key={x.id}
                onPress={() => open(x)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 11,
                  borderTopWidth: idx === 0 ? 0 : 1,
                  borderTopColor: t.line,
                }}
              >
                <Text style={{ color: t.muted, width: 46 }}>{dateLabel(x.date)}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: t.text, fontWeight: '600' }}>{x.description}</Text>
                  <Muted>
                    {c.label}
                    {x.source === 'bank' ? ` · ${x.accountName ?? 'banco'}` : ''}
                  </Muted>
                </View>
                {x.source === 'bank' && <Icon name="business" size={14} color={t.muted} style={{ marginRight: 6 }} />}
                <Text style={{ color: x.amount > 0 ? t.accent : t.text, fontWeight: '700' }}>
                  {formatBRL(x.amount, { sign: true })}
                </Text>
              </Pressable>
            );
          })}
        </Card>
      </Screen>

      <Fab onPress={() => open(blank(), true)} />

      <Sheet visible={!!editing} title={isNew ? 'Novo lançamento' : 'Editar lançamento'} onClose={() => setEditing(null)}>
        {editing && (
          <>
            <Segmented
              options={[
                { value: 'out', label: 'Saída' },
                { value: 'in', label: 'Entrada' },
              ]}
              value={type}
              onChange={setType}
            />
            <Field
              label="Valor (R$)"
              value={amountText}
              keyboardType="decimal-pad"
              onChangeText={setAmountText}
              placeholder="0,00"
            />
            <Field
              label="Descrição"
              value={editing.description}
              onChangeText={(description) => setEditing({ ...editing, description })}
            />
            <Field
              label="Data (AAAA-MM-DD)"
              value={editing.date}
              onChangeText={(date) => setEditing({ ...editing, date })}
              autoCapitalize="none"
            />
            <Muted style={{ marginBottom: 6 }}>Categoria</Muted>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>
              {CATEGORIES.map((c) => (
                <Chip
                  key={c.id}
                  label={c.label}
                  color={c.color}
                  on={editing.category === c.id}
                  onPress={() => setEditing({ ...editing, category: c.id as CategoryId })}
                />
              ))}
            </View>
            <View style={{ gap: 8 }}>
              <Button
                label="Salvar"
                disabled={!editing.description.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(editing.date) || !parseBRL(amountText)}
                onPress={() => {
                  const cents = parseBRL(amountText);
                  saveTx({ ...editing, description: editing.description.trim(), amount: type === 'in' ? cents : -cents });
                  setEditing(null);
                }}
              />
              {!isNew && (
                <Button
                  label="Excluir"
                  kind="danger"
                  onPress={() => {
                    removeTx(editing.id);
                    setEditing(null);
                  }}
                />
              )}
            </View>
          </>
        )}
      </Sheet>
    </View>
  );
}
