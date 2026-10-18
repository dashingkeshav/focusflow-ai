"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useAuth } from "@/lib/auth";
import {
  AppNotification,
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification as apiDeleteNotification,
  clearAllNotifications as apiClearAllNotifications,
  triggerTestNotification,
  getApiBaseUrl,
} from "@/lib/api";
import { io as socketIO, type Socket } from "socket.io-client";

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  browserPermission: NotificationPermission;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  sendTestNotification: () => Promise<AppNotification | null>;
  requestBrowserPermission: () => Promise<boolean>;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

// Gentle, modern web audio ping (synthesized, no audio files required)
function playNotificationChime() {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    // Soft two-tone chime (F#5 to B5)
    osc.frequency.setValueAtTime(739.99, now);
    osc.frequency.exponentialRampToValueAtTime(987.77, now + 0.08);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.36);
  } catch {
    // Audio autoplay or web audio restriction — ignore gracefully
  }
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuth();
  const userId = user?.id;

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>("default");

  const socketRef = useRef<Socket | null>(null);

  // Sync browser desktop notification permission status
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setBrowserPermission(Notification.permission);
    }
  }, []);

  const refreshNotifications = useCallback(async () => {
    if (!userId || !token) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetchNotifications();
      if (res.success) {
        setNotifications(res.notifications || []);
        setUnreadCount(res.unreadCount ?? 0);
      }
    } catch (err) {
      console.warn("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [userId, token]);

  // Initial load when user/token changes
  useEffect(() => {
    let ignore = false;
    if (userId && token) {
      refreshNotifications();
    } else {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
    }
    return () => {
      ignore = true;
    };
  }, [userId, token, refreshNotifications]);

  // Real-time Socket.io listener
  useEffect(() => {
    if (!userId || !token) return;

    const socket = socketIO(getApiBaseUrl(), {
      auth: { token },
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("notification", (incoming: AppNotification) => {
      setNotifications((prev) => {
        // Prevent duplicate entries
        const filtered = prev.filter((n) => n.id !== incoming.id);
        return [incoming, ...filtered];
      });

      if (!incoming.read) {
        setUnreadCount((prev) => prev + 1);
      }

      // Audio alert
      playNotificationChime();

      // Native browser notification if user permitted
      if (
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        try {
          new Notification(incoming.title, {
            body: incoming.message,
            icon: "/brand/icon-128.png",
            badge: "/brand/icon-32.png",
          });
        } catch {
          // Ignore desktop alert failure
        }
      }
    });

    socket.on("achievement_unlocked", () => {
      // Re-fetch to ensure synced state
      refreshNotifications();
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [userId, token, refreshNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: true } : item))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await markNotificationAsRead(id);
    } catch (err) {
      console.warn("markAsRead error:", err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
    setUnreadCount(0);

    try {
      await markAllNotificationsAsRead();
    } catch (err) {
      console.warn("markAllAsRead error:", err);
    }
  }, []);

  const deleteNotification = useCallback(
    async (id: string) => {
      const target = notifications.find((n) => n.id === id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (target && !target.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }

      try {
        await apiDeleteNotification(id);
      } catch (err) {
        console.warn("deleteNotification error:", err);
      }
    },
    [notifications]
  );

  const clearAll = useCallback(async () => {
    setNotifications([]);
    setUnreadCount(0);

    try {
      await apiClearAllNotifications();
    } catch (err) {
      console.warn("clearAll error:", err);
    }
  }, []);

  const sendTestNotification = useCallback(async () => {
    try {
      const res = await triggerTestNotification();
      if (res.success && res.notification) {
        // Optimistically ensure it's in list if socket hasn't caught it yet
        setNotifications((prev) => {
          if (prev.some((n) => n.id === res.notification.id)) return prev;
          return [res.notification, ...prev];
        });
        setUnreadCount((prev) => prev + 1);
        playNotificationChime();
        return res.notification;
      }
    } catch (err) {
      console.warn("sendTestNotification error:", err);
    }
    return null;
  }, []);

  const requestBrowserPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return false;
    }

    try {
      const perm = await Notification.requestPermission();
      setBrowserPermission(perm);
      return perm === "granted";
    } catch {
      return false;
    }
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        browserPermission,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAll,
        sendTestNotification,
        requestBrowserPermission,
        refreshNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
