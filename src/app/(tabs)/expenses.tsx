import { useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import { useTheme } from '@/components/theme';
import { Button, Card, Chip, Fab, Field, H, Icon, Muted, Screen, Segmented, Sheet } from '@/components/ui';
import { CATEGORIES, categoryOf } from '@/lib/categories';
import { centsToInput, formatBRL, parseBRL } from '@/lib/format';
import { newId, useStore } from '@/lib/store';
import type { CategoryId, Item, Kind } from '@/lib/types';

const blank = (): Item => ({ id: newId(), name: '', kind: 'fixed', category: 'outros', amount: 0, essential: false });

export default function Expenses() {
  const t = useTheme();
  const { state, saveItem, removeItem } = useStore();
  const [editing, setEditing] = useState<Item | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [amountText, setAmountText] = useState('');
  const [onlyEssential, setOnlyEssential] = useState(false);

  const open = (i: Item, fresh = false) => {
    setEditing(i);
    setIsNew(fresh);
    setAmountText(i.amount ? centsToInput(i.amount) : '');
  };

  const shown = state.items.filter((i) => !onlyEssential || i.essential);
  const sum = (list: Item[]) => list.reduce((s, i) => s + i.amount, 0);

  const groups: { kind: Kind; title: string }[] = [
    { kind: 'fixed', title: 'Despesas fixas' },
    { kind: 'variable', title: 'Despesas variáveis' },
  ];

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ color: t.text, fontSize: 24, fontWeight: '800' }}>Despesas do mês</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Muted style={{ marginRight: 6 }}>★ só essenciais</Muted>
            <Switch value={onlyEssential} onValueChange={setOnlyEssential} />
          </View>
        </View>

        {groups.map((g) => {
          const list = shown.filter((i) => i.kind === g.kind);
          return (
            <Card key={g.kind}>
              <H right={<Text style={{ color: t.text, fontWeight: '700' }}>{formatBRL(sum(list))}</Text>}>{g.title}</H>
              {list.length === 0 && <Muted>Nada aqui.</Muted>}
              {list.map((i, idx) => {
                const c = categoryOf(i.category);
                return (
                  <Pressable
                    key={i.id}
                    onPress={() => open(i)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 11,
                      borderTopWidth: idx === 0 ? 0 : 1,
                      borderTopColor: t.line,
                    }}
                  >
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.color, marginRight: 10 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: t.text, fontSize: 15, fontWeight: '600' }}>
                        {i.name} {i.essential && <Text style={{ color: t.danger }}>★</Text>}
                      </Text>
                      <Muted>{c.label}</Muted>
                    </View>
                    <Text style={{ color: t.text, fontWeight: '600' }}>{formatBRL(i.amount)}</Text>
                  </Pressable>
                );
              })}
            </Card>
          );
        })}

        <Muted>Toque em uma despesa para editar. ★ = essencial.</Muted>
      </Screen>

      <Fab onPress={() => open(blank(), true)} />

      <Sheet visible={!!editing} title={isNew ? 'Nova despesa' : 'Editar despesa'} onClose={() => setEditing(null)}>
        {editing && (
          <>
            <Field label="Nome" value={editing.name} onChangeText={(name) => setEditing({ ...editing, name })} />
            <Field
              label="Valor mensal (R$)"
              value={amountText}
              keyboardType="decimal-pad"
              onChangeText={setAmountText}
              placeholder="0,00"
            />
            <Segmented
              options={[
                { value: 'fixed', label: 'Fixa' },
                { value: 'variable', label: 'Variável' },
              ]}
              value={editing.kind}
              onChange={(kind) => setEditing({ ...editing, kind })}
            />
            <Muted style={{ marginBottom: 6 }}>Categoria</Muted>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
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
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={{ color: t.text, fontSize: 15 }}>Essencial ★</Text>
              <Switch value={editing.essential} onValueChange={(essential) => setEditing({ ...editing, essential })} />
            </View>
            <View style={{ gap: 8 }}>
              <Button
                label="Salvar"
                disabled={!editing.name.trim()}
                onPress={() => {
                  saveItem({ ...editing, name: editing.name.trim(), amount: parseBRL(amountText) });
                  setEditing(null);
                }}
              />
              {!isNew && (
                <Button
                  label="Excluir"
                  kind="danger"
                  onPress={() => {
                    removeItem(editing.id);
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
