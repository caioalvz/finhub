import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { BankCard } from '@/components/BankCard';
import { useTheme } from '@/components/theme';
import { Button, Card, Field, H, Muted, Screen, Segmented } from '@/components/ui';
import { centsToInput, parseBRL } from '@/lib/format';
import { useStore } from '@/lib/store';

export default function Family() {
  const t = useTheme();
  const store = useStore();
  const { state, saveSettings, user, householdId, info, cloudAvailable, syncError } = store;

  const [salary, setSalary] = useState(centsToInput(state.settings.salary));
  const [pct, setPct] = useState(String(state.settings.reservePct));
  useEffect(() => {
    setSalary(centsToInput(state.settings.salary));
    setPct(String(state.settings.reservePct));
  }, [state.settings.salary, state.settings.reservePct]);

  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const run = async (job: () => Promise<void>) => {
    setBusy(true);
    setErr(null);
    try {
      await job();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Text style={{ color: t.text, fontSize: 24, fontWeight: '800', marginBottom: 12 }}>Família e ajustes</Text>

      <Card>
        <H>Renda e reserva</H>
        <Field label="Salário base (R$)" value={salary} onChangeText={setSalary} keyboardType="decimal-pad" />
        <Field label="Reserva (% do salário)" value={pct} onChangeText={setPct} keyboardType="number-pad" />
        <Button
          label="Salvar"
          onPress={() =>
            saveSettings({
              salary: parseBRL(salary),
              reservePct: Math.min(100, Math.max(0, parseInt(pct, 10) || 0)),
            })
          }
        />
      </Card>

      <Card>
        <H>Grupo familiar</H>
        {!cloudAvailable ? (
          <Muted>
            Sincronização desligada: falta configurar o Firebase (arquivo .env, veja o README). Enquanto isso o app
            funciona normalmente, só neste aparelho.
          </Muted>
        ) : !user ? (
          <>
            <Segmented
              options={[
                { value: 'in', label: 'Entrar' },
                { value: 'up', label: 'Criar conta' },
              ]}
              value={mode}
              onChange={setMode}
            />
            <Field label="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
            <Field label="Senha" value={password} onChangeText={setPassword} secureTextEntry />
            <Button
              label={mode === 'in' ? 'Entrar' : 'Criar conta'}
              disabled={busy || !email || password.length < 6}
              onPress={() => run(() => (mode === 'in' ? store.signIn(email.trim(), password) : store.signUp(email.trim(), password)))}
            />
          </>
        ) : !householdId ? (
          <>
            <Muted style={{ marginBottom: 10 }}>Conectado como {user.email}.</Muted>
            <Button label="Criar grupo familiar (com os dados deste aparelho)" disabled={busy} onPress={() => run(store.createFamily)} />
            <Muted style={{ marginVertical: 12, textAlign: 'center' }}>ou entre no grupo de quem já criou</Muted>
            <Field label="Código de convite" value={code} onChangeText={setCode} autoCapitalize="characters" />
            <Button label="Entrar no grupo" kind="ghost" disabled={busy || code.trim().length < 6} onPress={() => run(() => store.joinFamily(code))} />
          </>
        ) : (
          <>
            <Muted>Conectado como {user.email}</Muted>
            <Text style={{ color: t.accent, fontWeight: '700', marginTop: 6 }}>✓ Sincronizando em tempo real</Text>
            <Muted style={{ marginTop: 12 }}>Membros</Muted>
            {info?.memberNames.map((n) => (
              <Text key={n} style={{ color: t.text, marginTop: 2 }}>• {n}</Text>
            ))}
            <Muted style={{ marginTop: 12 }}>Código de convite para sua esposa</Muted>
            <Text selectable style={{ color: t.text, fontSize: 26, fontWeight: '800', letterSpacing: 4 }}>
              {info?.inviteCode ?? '…'}
            </Text>
            <View style={{ marginTop: 12 }}>
              <Button label="Sair da conta" kind="ghost" onPress={() => run(store.signOut)} />
            </View>
          </>
        )}
        {(err || syncError) && <Text style={{ color: t.danger, marginTop: 10 }}>{err ?? syncError}</Text>}
      </Card>

      {householdId && <BankCard />}
    </Screen>
  );
}
