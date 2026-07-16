import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import client from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  });

  // Real-time heartbeat interval for active users tracking
  useEffect(() => {
    if (!user) return;

    const sendHeartbeat = async () => {
      try {
        await client.post("/auth/heartbeat");
      } catch (err) {
        // Fail silently to avoid interrupting user workflow
      }
    };

    sendHeartbeat();
    const timer = setInterval(sendHeartbeat, 10000);
    return () => clearInterval(timer);
  }, [user]);

  const login = useCallback(async (email, password) => {
    const { data } = await client.post("/auth/login", { email, password });
    const { user, accessToken, refreshToken } = data.data;
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    localStorage.setItem("user", JSON.stringify(user));
    setUser(user);
    return user;
  }, []);

  const register = useCallback(async (payload) => {
    const { data } = await client.post("/auth/register", payload);
    const { user, accessToken, refreshToken } = data.data;
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    localStorage.setItem("user", JSON.stringify(user));
    setUser(user);
    return user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await client.post("/auth/logout");
    } catch {
      // ignore network errors on logout
    }
    localStorage.clear();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
