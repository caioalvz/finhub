import { getFunctions, httpsCallable } from 'firebase/functions';
import { firebase } from './firebase';

function fn<I, O>(name: string) {
  const f = firebase();
  if (!f) throw new Error('Firebase não configurado.');
  return httpsCallable<I, O>(getFunctions(f.app, 'southamerica-east1'), name);
}

/** Pede ao servidor um token para abrir o widget de conexão bancária. */
export async function getConnectToken(): Promise<string> {
  const r = await fn<void, { accessToken: string }>('pluggyConnectToken')();
  return r.data.accessToken;
}

/** Importa lançamentos dos bancos conectados. Passe itemId logo após conectar um banco novo. */
export async function syncBanks(itemId?: string): Promise<{ imported: number; items: number }> {
  const r = await fn<{ itemId?: string }, { imported: number; items: number }>('pluggySync')({ itemId });
  return r.data;
}
