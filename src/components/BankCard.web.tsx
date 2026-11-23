import { Card, H, Muted } from './ui';

// A Pluggy Connect usa WebView + polyfills nativos; no web só mostramos o aviso.
export function BankCard() {
  return (
    <Card>
      <H>Contas bancárias</H>
      <Muted>A conexão bancária só funciona no app Android.</Muted>
    </Card>
  );
}
