import { useState } from 'react';
import { Modal, Platform, Text, View } from 'react-native';
import { PluggyConnect } from 'react-native-pluggy-connect';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getConnectToken, syncBanks } from '@/lib/bank';
import { useTheme } from './theme';
import { Button, Card, H, Muted } from './ui';

export function BankCard() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);

  const run = async (job: () => Promise<string>) => {
    setBusy(true);
    setMsg(null);
    try {
      setMsg({ text: await job() });
    } catch (e) {
      setMsg({ text: (e as Error).message, error: true });
    } finally {
      setBusy(false);
    }
  };

  const importNow = (itemId?: string) =>
    run(async () => {
      const r = await syncBanks(itemId);
      return r.items === 0 ? 'Nenhum banco conectado ainda.' : `${r.imported} lançamentos atualizados.`;
    });

  return (
    <Card>
      <H>Contas bancárias</H>
      <Muted style={{ marginBottom: 12 }}>
        Conexão via Open Finance (Pluggy): somente leitura. As entradas e saídas reais aparecem em Lançamentos para vocês dois.
      </Muted>
      {Platform.OS === 'web' ? (
        <Muted>A conexão bancária só funciona no app Android.</Muted>
      ) : (
        <View style={{ gap: 8 }}>
          <Button
            label="Conectar banco"
            disabled={busy}
            onPress={() => run(async () => { setToken(await getConnectToken()); return ''; })}
          />
          <Button label="Atualizar lançamentos" kind="ghost" disabled={busy} onPress={() => importNow()} />
        </View>
      )}
      {msg?.text ? <Text style={{ color: msg.error ? t.danger : t.accent, marginTop: 10 }}>{msg.text}</Text> : null}

      <Modal visible={!!token} animationType="slide" onRequestClose={() => setToken(null)}>
        <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: t.card }}>
          {token && (
            <PluggyConnect
              connectToken={token}
              language="pt"
              theme={t.bg === '#101412' ? 'dark' : 'light'}
              onClose={() => setToken(null)}
              onError={(e) => {
                setToken(null);
                setMsg({ text: e.message, error: true });
              }}
              onSuccess={({ item }) => {
                setToken(null);
                importNow(item.id);
              }}
            />
          )}
        </View>
      </Modal>
    </Card>
  );
}
