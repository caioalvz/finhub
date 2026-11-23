# FinHub

App Android (Expo / React Native) de finanças da família: despesas mensais por categoria, essenciais (★),
reserva, lançamentos reais, sincronização em tempo real entre vocês dois e importação de bancos via Open Finance.

Os dados iniciais vêm do caderno "Despesa Fixa" ([src/lib/seed.ts](src/lib/seed.ts)).
Revise: "Claude" (R$ 113,50), "Todos" (R$ 34,50) e "Plano TIM" foram lidos de letra manuscrita.

## Rodar no computador

```bash
npm install
npm run web      # pré-visualização no navegador
```

Sem Firebase configurado o app funciona 100% local (um aparelho só).

## 1. Sincronizar com sua esposa (Firebase)

1. https://console.firebase.google.com → criar projeto → adicionar app **Web** → copiar a config.
2. Ativar **Authentication → E-mail/senha** e **Firestore Database** (região `southamerica-east1`).
3. `copy .env.example .env` e preencher os `EXPO_PUBLIC_FIREBASE_*`.
4. Colar [firestore.rules](firestore.rules) em Firestore → Regras → Publicar.
5. No app: aba **Família** → criar conta → **Criar grupo familiar** → passar o código de convite para ela.
   No aparelho dela: criar conta → **Entrar no grupo** com o código.

## 2. Bancos (Pluggy / Open Finance)

Requer o plano **Blaze** do Firebase (Cloud Functions) e uma conta em https://dashboard.pluggy.ai.

```bash
npm install -g firebase-tools
firebase login
firebase use --add
cd functions && npm install
firebase functions:secrets:set PLUGGY_CLIENT_ID
firebase functions:secrets:set PLUGGY_CLIENT_SECRET
npm run deploy
```

As credenciais da Pluggy ficam só no servidor. No app: **Família → Conectar banco**.
Pagamentos de fatura de cartão são ignorados na importação para não contar o gasto duas vezes.

## 3. Gerar o APK

```bash
npx eas-cli@latest login
npx eas-cli@latest build -p android --profile preview
```

O link do APK aparece no fim; baixe no celular e instale (permitir "fontes desconhecidas").
Variáveis do `.env` precisam estar no EAS: `npx eas-cli@latest env:push --environment preview` (ou `eas env:create`).
