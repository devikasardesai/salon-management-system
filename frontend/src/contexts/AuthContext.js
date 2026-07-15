import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import api, { getToken, setToken, clearToken } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(false);
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch (err) {
      logger.warn("Auth check failed:", err?.response?.status);
      clearToken();
      setUser(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    if (data.token) {
      setToken(data.token);
    }
    setUser(data);
    return data;
  }, []);

  const register = useCallback(async (name, email, password, businessName) => {
    const { data } = await api.post("/auth/register", { name, email, password, business_name: businessName });
    if (data.token) {
      setToken(data.token);
    }
    setUser(data);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try { await api.post("/auth/logout"); } catch (err) {
      logger.warn("Logout API failed:", err?.message);
    }
    clearToken();
    setUser(false);
  }, []);

  const value = useMemo(() => ({
    user, loading, login, register, logout, checkAuth
  }), [user, loading, login, register, logout, checkAuth]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Simple logger that doesn't expose to window
const logger = {
  warn: (...args) => { if (process.env.NODE_ENV === "development") console.warn(...args); }
};

export function useAuth() {
  return useContext(AuthContext);
}
