import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { authApi, institutionsApi } from '../api';
import { institutionStore, tokenStore } from '../api/client';
import type { AuthUser, Institution } from '../api/types';

type AuthContextValue = {
  user: AuthUser | null;
  institution: Institution | null;
  institutions: Institution[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthUser>;
  signOut: () => void;
  selectInstitution: (id: string) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [loading, setLoading] = useState(true);

  const hydrate = useCallback(async () => {
    if (!tokenStore.get()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await authApi.me();
      setUser(me);
      const list = await institutionsApi.list();
      setInstitutions(list);
      const stored = institutionStore.get();
      const chosen =
        list.find((i) => i.id === stored) ??
        list.find((i) => i.id === me.institutionId) ??
        list[0] ??
        null;
      setInstitution(chosen);
      if (chosen) institutionStore.set(chosen.id);
    } catch {
      tokenStore.clear();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const signIn = useCallback(async (email: string, password: string) => {
    const response = await authApi.login(email, password);
    tokenStore.set(response.accessToken);
    setUser(response.user);
    const list = await institutionsApi.list();
    setInstitutions(list);
    const chosen =
      list.find((i) => i.id === response.user.institutionId) ?? list[0] ?? null;
    setInstitution(chosen);
    if (chosen) institutionStore.set(chosen.id);
    return response.user;
  }, []);

  const signOut = useCallback(() => {
    tokenStore.clear();
    institutionStore.clear();
    setUser(null);
    setInstitution(null);
    setInstitutions([]);
  }, []);

  const selectInstitution = useCallback(
    (id: string) => {
      const found = institutions.find((i) => i.id === id);
      if (!found) return;
      institutionStore.set(id);
      setInstitution(found);
    },
    [institutions],
  );

  const value = useMemo(
    () => ({ user, institution, institutions, loading, signIn, signOut, selectInstitution }),
    [user, institution, institutions, loading, signIn, signOut, selectInstitution],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de AuthProvider');
  return ctx;
}