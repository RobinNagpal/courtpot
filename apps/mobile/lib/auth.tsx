import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { ApiError } from "@courtpot/api";
import { Member } from "@courtpot/schemas";
import type { LoginInputT, MemberT } from "@courtpot/schemas";
import { authApi } from "./storage";
import { tokenRef, unauthorizedHandler } from "./session";

const STORAGE_KEY = "courtpot.auth";
const StoredSession = z.object({ token: z.string().min(1), member: Member });

interface AuthContextValue {
  /** False until the stored session has been read from disk. */
  ready: boolean;
  member: MemberT | null;
  signedIn: boolean;
  /** Resolves to an error message, or null on success. */
  login: (input: LoginInputT) => Promise<string | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): ReactElement {
  const queryClient = useQueryClient();
  const [ready, setReady] = useState(authApi === null);
  const [member, setMember] = useState<MemberT | null>(null);
  const [signedIn, setSignedIn] = useState(false);

  const clearSession = useCallback((): void => {
    tokenRef.set(null);
    setMember(null);
    setSignedIn(false);
    queryClient.clear();
    void AsyncStorage.removeItem(STORAGE_KEY);
  }, [queryClient]);

  useEffect(() => {
    unauthorizedHandler.current = clearSession;
    return () => {
      unauthorizedHandler.current = null;
    };
  }, [clearSession]);

  useEffect(() => {
    if (authApi === null) {
      return;
    }
    void AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      const parsed = raw === null ? null : StoredSession.safeParse(JSON.parse(raw));
      if (parsed?.success === true) {
        tokenRef.set(parsed.data.token);
        setMember(parsed.data.member);
        setSignedIn(true);
      }
      setReady(true);
    });
  }, []);

  const login = useCallback(
    async (input: LoginInputT): Promise<string | null> => {
      if (authApi === null) {
        return "No API configured";
      }
      try {
        const result = await authApi.login(input);
        tokenRef.set(result.token);
        setMember(result.member);
        setSignedIn(true);
        queryClient.clear();
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(result));
        return null;
      } catch (error) {
        return error instanceof ApiError ? error.message : "Could not reach the server";
      }
    },
    [queryClient],
  );

  const logout = useCallback(async (): Promise<void> => {
    await authApi?.logout().catch(() => undefined);
    clearSession();
  }, [clearSession]);

  return (
    <AuthContext.Provider value={{ ready, member, signedIn, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (value === null) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }
  return value;
}
