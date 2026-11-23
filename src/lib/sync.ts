import * as Crypto from 'expo-crypto';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth';
import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { firebase } from './firebase';
import type { AppState, Item, Settings, Tx } from './types';

/*
 * Estrutura no Firestore:
 *   users/{uid}                    { householdId }
 *   invites/{code}                 { householdId }
 *   households/{hid}               { members[], memberNames{}, inviteCode, settings }
 *   households/{hid}/items/{id}    Item
 *   households/{hid}/txs/{id}      Tx
 * As regras de segurança estão em firestore.rules.
 */

const clean = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

function need() {
  const f = firebase();
  if (!f) throw new Error('Firebase não configurado (veja .env.example).');
  return f;
}

function newInviteCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = Crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

export function watchAuth(cb: (user: User | null) => void): () => void {
  const f = firebase();
  if (!f) {
    cb(null);
    return () => {};
  }
  return onAuthStateChanged(f.auth, cb);
}

export const signUp = (email: string, password: string) =>
  createUserWithEmailAndPassword(need().auth, email, password);
export const signIn = (email: string, password: string) =>
  signInWithEmailAndPassword(need().auth, email, password);
export const signOut = () => fbSignOut(need().auth);

export async function householdOf(uid: string): Promise<string | null> {
  const snap = await getDoc(doc(need().db, 'users', uid));
  return snap.exists() ? (snap.data().householdId as string) : null;
}

/** Cria o grupo familiar enviando os dados locais atuais. */
export async function createHousehold(user: User, state: AppState) {
  const { db } = need();
  const hid = Crypto.randomUUID();
  const inviteCode = newInviteCode();
  const batch = writeBatch(db);
  batch.set(doc(db, 'households', hid), {
    members: [user.uid],
    memberNames: { [user.uid]: user.email ?? 'Eu' },
    inviteCode,
    settings: state.settings,
  });
  batch.set(doc(db, 'invites', inviteCode), { householdId: hid });
  batch.set(doc(db, 'users', user.uid), { householdId: hid });
  state.items.forEach((i) => batch.set(doc(db, 'households', hid, 'items', i.id), clean(i)));
  state.txs.forEach((t) => batch.set(doc(db, 'households', hid, 'txs', t.id), clean(t)));
  await batch.commit();
  return { hid, inviteCode };
}

/** Entra no grupo de outra pessoa usando o código de convite. */
export async function joinHousehold(user: User, code: string): Promise<string> {
  const { db } = need();
  const invite = await getDoc(doc(db, 'invites', code.trim().toUpperCase()));
  if (!invite.exists()) throw new Error('Código de convite inválido.');
  const hid = invite.data().householdId as string;
  await updateDoc(doc(db, 'households', hid), {
    members: arrayUnion(user.uid),
    [`memberNames.${user.uid}`]: user.email ?? 'Membro',
  });
  await setDoc(doc(db, 'users', user.uid), { householdId: hid });
  return hid;
}

export interface HouseholdInfo {
  inviteCode: string;
  memberNames: string[];
}

export function subscribe(
  hid: string,
  h: {
    onSettings: (s: Settings) => void;
    onInfo: (i: HouseholdInfo) => void;
    onItems: (items: Item[]) => void;
    onTxs: (txs: Tx[]) => void;
    onError: (e: Error) => void;
  },
): () => void {
  const { db } = need();
  const unsubs = [
    onSnapshot(
      doc(db, 'households', hid),
      (s) => {
        const d = s.data();
        if (!d) return;
        h.onSettings(d.settings as Settings);
        h.onInfo({
          inviteCode: d.inviteCode,
          memberNames: Object.values((d.memberNames ?? {}) as Record<string, string>),
        });
      },
      h.onError,
    ),
    onSnapshot(
      collection(db, 'households', hid, 'items'),
      (s) => h.onItems(s.docs.map((d) => d.data() as Item)),
      h.onError,
    ),
    onSnapshot(
      collection(db, 'households', hid, 'txs'),
      (s) => h.onTxs(s.docs.map((d) => d.data() as Tx)),
      h.onError,
    ),
  ];
  return () => unsubs.forEach((u) => u());
}

export const pushItem = (hid: string, i: Item) =>
  setDoc(doc(need().db, 'households', hid, 'items', i.id), clean(i));
export const dropItem = (hid: string, id: string) =>
  deleteDoc(doc(need().db, 'households', hid, 'items', id));
export const pushTx = (hid: string, t: Tx) =>
  setDoc(doc(need().db, 'households', hid, 'txs', t.id), clean(t));
export const dropTx = (hid: string, id: string) =>
  deleteDoc(doc(need().db, 'households', hid, 'txs', id));
export const pushSettings = (hid: string, s: Settings) =>
  updateDoc(doc(need().db, 'households', hid), { settings: s });
