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

  // Real-time desktop/device notification checker
  useEffect(() => {
    if (!user) return;

    // Request desktop notification permission if supported
    if (typeof window !== "undefined" && "Notification" in window) {
      if (window.Notification.permission === "default") {
        window.Notification.requestPermission();
      }
    }

    const notifiedIds = new Set();
    let firstCheck = true;

    const checkNotifications = async () => {
      try {
        const { data } = await client.get("/notifications");
        const notifications = data.data || [];
        const unread = notifications.filter((n) => !n.isRead);

        if (firstCheck) {
          // On first load, cache historical unread notifications to avoid spamming
          unread.forEach((n) => notifiedIds.add(n._id));
          firstCheck = false;
          return;
        }

        // Trigger native notification for any newly discovered unread item
        unread.forEach((notif) => {
          if (!notifiedIds.has(notif._id)) {
            notifiedIds.add(notif._id);
            if (
              typeof window !== "undefined" &&
              "Notification" in window &&
              window.Notification.permission === "granted"
            ) {
              new window.Notification(notif.title, {
                body: notif.message,
                tag: notif._id, // avoid duplicate OS alerts
              });
            }
          }
        });
      } catch (err) {
        // fail silently
      }
    };

    checkNotifications();
    const timer = setInterval(checkNotifications, 5000); // poll every 5 seconds

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
