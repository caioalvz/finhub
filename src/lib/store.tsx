import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import type { User } from 'firebase/auth';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { firebaseConfigured } from './firebase';
import { monthKey } from './format';
import { makeSeed } from './seed';
import * as sync from './sync';
import type { AppState, Item, Settings, Tx } from './types';

const KEY = 'finhub:state:v1';
const HID_KEY = 'finhub:hid:v1';

export const newId = () => Crypto.randomUUID();

interface Store {
  ready: boolean;
  state: AppState;
  month: string;
  setMonth: (m: string) => void;

  saveItem: (i: Item) => void;
  removeItem: (id: string) => void;
  saveTx: (t: Tx) => void;
  removeTx: (id: string) => void;
  saveSettings: (s: Settings) => void;

  // família / nuvem
  cloudAvailable: boolean;
  user: User | null;
  householdId: string | null;
  info: sync.HouseholdInfo | null;
  syncError: string | null;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  createFamily: () => Promise<void>;
  joinFamily: (code: string) => Promise<void>;
}

const Ctx = createContext<Store | null>(null);

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore fora do StoreProvider');
  return s;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<AppState>(() => makeSeed(newId));
  const [month, setMonth] = useState(monthKey());
  const [user, setUser] = useState<User | null>(null);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [info, setInfo] = useState<sync.HouseholdInfo | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const hidRef = useRef<string | null>(null);
  hidRef.current = householdId;

  // Carrega cache local
  useEffect(() => {
    (async () => {
      try {
        const [raw, hid] = await Promise.all([AsyncStorage.getItem(KEY), AsyncStorage.getItem(HID_KEY)]);
        if (raw) setState(JSON.parse(raw));
        if (hid) setHouseholdId(hid);
      } catch {}
      setReady(true);
    })();
  }, []);

  // Persiste cache local
  useEffect(() => {
    if (ready) AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {});
  }, [ready, state]);

  // Sessão
  useEffect(() => {
    return sync.watchAuth(async (u) => {
      setUser(u);
      if (!u) {
        setHouseholdId(null);
        setInfo(null);
        AsyncStorage.removeItem(HID_KEY).catch(() => {});
        return;
      }
      try {
        const hid = await sync.householdOf(u.uid);
        setHouseholdId(hid);
        if (hid) AsyncStorage.setItem(HID_KEY, hid).catch(() => {});
      } catch (e) {
        setSyncError((e as Error).message);
      }
    });
  }, []);

  // Tempo real: tudo que o outro membro fizer chega aqui
  useEffect(() => {
    if (!householdId || !user) return;
    return sync.subscribe(householdId, {
      onSettings: (settings) => setState((s) => ({ ...s, settings })),
      onInfo: setInfo,
      onItems: (items) => setState((s) => ({ ...s, items })),
      onTxs: (txs) => setState((s) => ({ ...s, txs })),
      onError: (e) => setSyncError(e.message),
    });
  }, [householdId, user]);

  const cloud = useCallback((job: (hid: string) => Promise<unknown>) => {
    const hid = hidRef.current;
    if (hid) job(hid).catch((e) => setSyncError((e as Error).message));
  }, []);

  const value = useMemo<Store>(
    () => ({
      ready,
      state,
      month,
      setMonth,

      saveItem: (i) => {
        setState((s) => ({
          ...s,
          items: s.items.some((x) => x.id === i.id) ? s.items.map((x) => (x.id === i.id ? i : x)) : [...s.items, i],
        }));
        cloud((hid) => sync.pushItem(hid, i));
      },
      removeItem: (id) => {
        setState((s) => ({ ...s, items: s.items.filter((x) => x.id !== id) }));
        cloud((hid) => sync.dropItem(hid, id));
      },
      saveTx: (t) => {
        setState((s) => ({
          ...s,
          txs: s.txs.some((x) => x.id === t.id) ? s.txs.map((x) => (x.id === t.id ? t : x)) : [...s.txs, t],
        }));
        cloud((hid) => sync.pushTx(hid, t));
      },
      removeTx: (id) => {
        setState((s) => ({ ...s, txs: s.txs.filter((x) => x.id !== id) }));
        cloud((hid) => sync.dropTx(hid, id));
      },
      saveSettings: (settings) => {
        setState((s) => ({ ...s, settings }));
        cloud((hid) => sync.pushSettings(hid, settings));
      },

      cloudAvailable: firebaseConfigured,
      user,
      householdId,
      info,
      syncError,
      signUp: async (e, p) => {
        setSyncError(null);
        await sync.signUp(e, p);
      },
      signIn: async (e, p) => {
        setSyncError(null);
        await sync.signIn(e, p);
      },
      signOut: () => sync.signOut(),
      createFamily: async () => {
        if (!user) return;
        const { hid } = await sync.createHousehold(user, state);
        AsyncStorage.setItem(HID_KEY, hid).catch(() => {});
        setHouseholdId(hid);
      },
      joinFamily: async (code) => {
        if (!user) return;
        const hid = await sync.joinHousehold(user, code);
        AsyncStorage.setItem(HID_KEY, hid).catch(() => {});
        setHouseholdId(hid);
      },
    }),
    [ready, state, month, user, householdId, info, syncError, cloud],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
