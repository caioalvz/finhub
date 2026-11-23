import type { AppState, Item } from './types';

// Transcrito do caderno "Despesa Fixa". Valores em centavos.
const raw: Omit<Item, 'id'>[] = [
  { name: 'Internet', kind: 'fixed', category: 'casa', amount: 17000, essential: true },
  { name: 'Energia elétrica', kind: 'fixed', category: 'casa', amount: 15000, essential: true },
  { name: 'MEI de Caio', kind: 'fixed', category: 'trabalho', amount: 8705, essential: false },
  { name: 'Manutenção do aparelho', kind: 'fixed', category: 'saude', amount: 15000, essential: false },
  { name: 'Plano TIM', kind: 'fixed', category: 'casa', amount: 3099, essential: false },
  { name: 'Hapvida Ana Lívia', kind: 'fixed', category: 'saude', amount: 31800, essential: true },
  { name: 'Netflix', kind: 'fixed', category: 'assinaturas', amount: 1050, essential: false },
  { name: 'Claude', kind: 'fixed', category: 'assinaturas', amount: 11350, essential: false },
  { name: 'Todos', kind: 'fixed', category: 'outros', amount: 3450, essential: false },
  { name: 'Spotify', kind: 'variable', category: 'assinaturas', amount: 1400, essential: false },
  { name: 'Prime Vídeo', kind: 'variable', category: 'assinaturas', amount: 400, essential: false },
  { name: 'Cartões', kind: 'variable', category: 'cartoes', amount: 123823, essential: true },
  { name: 'Gasolina', kind: 'variable', category: 'transporte', amount: 10000, essential: false },
  { name: 'Delivery', kind: 'variable', category: 'alimentacao', amount: 10000, essential: false },
  { name: 'Lazer', kind: 'variable', category: 'lazer', amount: 20000, essential: false },
  { name: 'Comida', kind: 'variable', category: 'alimentacao', amount: 100000, essential: true },
];

export function makeSeed(newId: () => string): AppState {
  return {
    settings: { salary: 350000, reservePct: 10 },
    items: raw.map((r) => ({ ...r, id: newId() })),
    txs: [],
  };
}
