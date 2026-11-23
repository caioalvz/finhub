import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

/*
 * Ponte entre o app e a Pluggy (Open Finance).
 * As credenciais ficam só aqui, nunca no app:
 *   firebase functions:secrets:set PLUGGY_CLIENT_ID
 *   firebase functions:secrets:set PLUGGY_CLIENT_SECRET
 */

initializeApp();
const db = getFirestore();

const PLUGGY_CLIENT_ID = defineSecret('PLUGGY_CLIENT_ID');
const PLUGGY_CLIENT_SECRET = defineSecret('PLUGGY_CLIENT_SECRET');
const opts = { region: 'southamerica-east1', secrets: [PLUGGY_CLIENT_ID, PLUGGY_CLIENT_SECRET] };

const API = 'https://api.pluggy.ai';
const SYNC_DAYS = 90;

async function pluggy<T>(path: string, apiKey: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', 'X-API-KEY': apiKey, ...(init.headers ?? {}) },
  });
  if (!res.ok) throw new HttpsError('internal', `Pluggy ${res.status} em ${path.split('?')[0]}`);
  return (await res.json()) as T;
}

async function apiKey(): Promise<string> {
  const res = await fetch(`${API}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId: PLUGGY_CLIENT_ID.value(), clientSecret: PLUGGY_CLIENT_SECRET.value() }),
  });
  if (!res.ok) throw new HttpsError('internal', `Pluggy auth falhou (${res.status})`);
  return ((await res.json()) as { apiKey: string }).apiKey;
}

async function householdOf(uid: string | undefined): Promise<string> {
  if (!uid) throw new HttpsError('unauthenticated', 'Faça login.');
  const u = await db.doc(`users/${uid}`).get();
  const hid = u.data()?.householdId as string | undefined;
  if (!hid) throw new HttpsError('failed-precondition', 'Crie ou entre em um grupo familiar primeiro.');
  const h = await db.doc(`households/${hid}`).get();
  if (!(h.data()?.members as string[] | undefined)?.includes(uid)) {
    throw new HttpsError('permission-denied', 'Você não faz parte deste grupo.');
  }
  return hid;
}

/** Token de curta duração para abrir o widget Pluggy Connect no app. */
export const pluggyConnectToken = onCall(opts, async (req) => {
  const hid = await householdOf(req.auth?.uid);
  const key = await apiKey();
  const r = await pluggy<{ accessToken: string }>('/connect_token', key, {
    method: 'POST',
    body: JSON.stringify({ options: { clientUserId: hid, avoidDuplicates: true } }),
  });
  return { accessToken: r.accessToken };
});

interface PAccount { id: string; name: string; marketingName?: string; type: 'BANK' | 'CREDIT' }
interface PTx { id: string; date: string; description: string; amount: number; type: 'DEBIT' | 'CREDIT' }
interface Page<T> { results: T[]; totalPages: number }

// Palavras-chave simples; a categoria pode ser corrigida no app e a correção é preservada.
const RULES: [RegExp, string][] = [
  [/ifood|rappi|uber ?eats|delivery/i, 'alimentacao'],
  [/mercado|supermerc|atacad|assa[ií]|carrefour|padaria|restaurante/i, 'alimentacao'],
  [/posto|shell|ipiranga|combust|uber|99 ?app|99pop|sem parar/i, 'transporte'],
  [/netflix|spotify|prime ?v|amazon prime|claude|anthropic|disney|hbo|youtube/i, 'assinaturas'],
  [/hapvida|drog|farm[aá]c|clinica|cl[ií]nica|odonto|laborat/i, 'saude'],
  [/energia|enel|cpfl|equatorial|claro|vivo|tim\b|internet|[aá]gua|sabesp/i, 'casa'],
  [/das[- ]?mei|simples nacional|mei\b/i, 'trabalho'],
  [/cinema|ingresso|bar |lazer/i, 'lazer'],
];
const categorize = (d: string) => RULES.find(([re]) => re.test(d))?.[1] ?? 'outros';

// Pagamento de fatura aparece no banco E no cartão; contar os dois duplicaria o gasto.
const isCardBillPayment = (d: string) => /pag(amento|to)?\.? ?(de |da )?fatura|fatura (do )?cart[aã]o/i.test(d);

async function syncItem(hid: string, itemId: string, key: string): Promise<number> {
  const from = new Date(Date.now() - SYNC_DAYS * 86400000).toISOString().slice(0, 10);
  const accounts = await pluggy<Page<PAccount>>(`/accounts?itemId=${itemId}`, key);

  const incoming: Record<string, unknown>[] = [];
  for (const acc of accounts.results) {
    for (let page = 1, pages = 1; page <= pages; page++) {
      const r = await pluggy<Page<PTx>>(
        `/transactions?accountId=${acc.id}&from=${from}&pageSize=500&page=${page}`,
        key,
      );
      pages = r.totalPages || 1;
      for (const t of r.results) {
        if (isCardBillPayment(t.description)) continue;
        const cents = Math.round(Math.abs(t.amount) * 100);
        incoming.push({
          id: `pluggy_${t.id}`,
          externalId: t.id,
          date: t.date.slice(0, 10),
          amount: t.type === 'CREDIT' ? cents : -cents,
          description: t.description,
          category: categorize(t.description),
          source: 'bank',
          accountName: acc.marketingName ?? acc.name,
        });
      }
    }
  }

  const col = db.collection(`households/${hid}/txs`);
  let written = 0;
  for (let i = 0; i < incoming.length; i += 400) {
    const chunk = incoming.slice(i, i + 400);
    const refs = chunk.map((t) => col.doc(t.id as string));
    const existing = await db.getAll(...refs);
    const batch = db.batch();
    chunk.forEach((t, n) => {
      const prev = existing[n].data();
      // Mantém categoria/vínculo que você ajustou no app.
      const data = prev ? { ...t, category: prev.category, itemId: prev.itemId ?? null } : t;
      if (data.itemId === null) delete data.itemId;
      batch.set(refs[n], data);
      written++;
    });
    await batch.commit();
  }
  return written;
}

/** Registra um item recém-conectado (opcional) e importa lançamentos de todos os bancos do grupo. */
export const pluggySync = onCall(opts, async (req) => {
  const hid = await householdOf(req.auth?.uid);
  const newItem = typeof req.data?.itemId === 'string' ? (req.data.itemId as string) : null;
  const hRef = db.doc(`households/${hid}`);
  if (newItem) await hRef.update({ pluggyItems: FieldValue.arrayUnion(newItem) });

  const items = ((await hRef.get()).data()?.pluggyItems ?? []) as string[];
  if (items.length === 0) return { imported: 0, items: 0 };

  const key = await apiKey();
  let imported = 0;
  for (const id of items) imported += await syncItem(hid, id, key);
  return { imported, items: items.length };
});
