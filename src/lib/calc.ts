import { CATEGORIES } from './categories';
import type { AppState, CategoryId } from './types';

export interface CategoryRow {
  id: CategoryId;
  planned: number;
  actual: number;
}

export interface Summary {
  income: number; // salário base
  incomeActual: number; // entradas reais no mês
  reserve: number;
  essential: number;
  nonEssential: number;
  plannedTotal: number; // despesas + reserva
  free: number; // renda - planejado (negativo = estourou)
  spent: number; // saídas reais no mês
  rows: CategoryRow[];
}

export function txsOfMonth(state: AppState, month: string) {
  return state.txs.filter((t) => t.date.startsWith(month));
}

export function summarize(state: AppState, month: string): Summary {
  const { settings, items } = state;
  const txs = txsOfMonth(state, month);
  const reserve = Math.round((settings.salary * settings.reservePct) / 100);

  const essential = items.filter((i) => i.essential).reduce((s, i) => s + i.amount, 0);
  const nonEssential = items.filter((i) => !i.essential).reduce((s, i) => s + i.amount, 0);
  const plannedTotal = essential + nonEssential + reserve;

  const rows: CategoryRow[] = CATEGORIES.map((c) => ({
    id: c.id,
    planned: items.filter((i) => i.category === c.id).reduce((s, i) => s + i.amount, 0),
    actual: txs.filter((t) => t.amount < 0 && t.category === c.id).reduce((s, t) => s - t.amount, 0),
  }))
    .filter((r) => r.planned > 0 || r.actual > 0)
    .sort((a, b) => Math.max(b.planned, b.actual) - Math.max(a.planned, a.actual));

  return {
    income: settings.salary,
    incomeActual: txs.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0),
    reserve,
    essential,
    nonEssential,
    plannedTotal,
    free: settings.salary - plannedTotal,
    spent: txs.filter((t) => t.amount < 0).reduce((s, t) => s - t.amount, 0),
    rows,
  };
}
