export type CategoryId =
  | 'casa'
  | 'saude'
  | 'assinaturas'
  | 'trabalho'
  | 'cartoes'
  | 'transporte'
  | 'alimentacao'
  | 'lazer'
  | 'outros';

export type Kind = 'fixed' | 'variable';

/** Despesa planejada que se repete todo mês. Valores em centavos. */
export interface Item {
  id: string;
  name: string;
  kind: Kind;
  category: CategoryId;
  amount: number;
  essential: boolean;
  note?: string;
}

/** Lançamento real. amount > 0 entrada, amount < 0 saída (centavos). */
export interface Tx {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  description: string;
  category: CategoryId;
  itemId?: string;
  source: 'manual' | 'bank';
  externalId?: string;
  accountName?: string;
}

export interface Settings {
  salary: number; // centavos
  reservePct: number; // 0-100
}

export interface AppState {
  settings: Settings;
  items: Item[];
  txs: Tx[];
}
