import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { api } from "../api/http";
import { clearSession, getAccessToken, getStoredRole, saveSession } from "./storage";
import type { LoginPayload, Principal, Role, TokenResponse } from "./types";

type AuthContextValue = {
  principal: Principal | null;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function buildInitialPrincipal(): Principal | null {
  const token = getAccessToken();
  const role = getStoredRole() as Role | null;
  if (!token || !role) {
    return null;
  }
  const nome = role === "ADMIN" ? "Admin" : role === "PROFESSOR" ? "Professor" : "Atleta";
  return { sub: "session", role, nome };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [principal, setPrincipal] = useState<Principal | null>(buildInitialPrincipal());

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      return;
    }

    api
      .get<Principal>("/auth/me")
      .then((me) => setPrincipal(me.data))
      .catch(() => {
        clearSession();
        setPrincipal(null);
      });
  }, []);

  const login = async (payload: LoginPayload): Promise<void> => {
    const response = await api.post<TokenResponse>("/auth/login", payload);
    const data = response.data;
    saveSession(data.access_token, data.refresh_token, data.role);

    const me = await api.get<Principal>("/auth/me");
    setPrincipal(me.data);
  };

  const logout = () => {
    clearSession();
    setPrincipal(null);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      principal,
      isAuthenticated: Boolean(principal),
      login,
      logout,
    }),
    [principal]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
