import React, { createContext, useContext, useState, useEffect } from 'react';
import type { UserSession, UserProfile } from '../types/index.ts';

interface AuthContextType {
  currentUser: UserSession | null;
  isLoading: boolean;
  userList: UserProfile[];
  login: (credentials: { username: string; password: string }) => Promise<{ success: boolean; error?: string }>;
  pinLogin: (pinCode: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  hasPermission: (permCode: string) => boolean;
  hasAnyPermission: (permCodes: string[]) => boolean;
  refreshUserList: () => Promise<void>;
  refreshUsers: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userList, setUserList] = useState<UserProfile[]>([]);

  const refreshUserList = async () => {
    if (window.electronAPI?.auth?.listUsers) {
      const res = await window.electronAPI.auth.listUsers();
      if (res.success && res.data) {
        setUserList(res.data);
      }
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (window.electronAPI?.auth?.getCurrentUser) {
          const res = await window.electronAPI.auth.getCurrentUser();
          if (res.success && res.data) {
            setCurrentUser(res.data);
          }
        }
        await refreshUserList();
      } catch (err) {
        console.error('Failed to initialize auth:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  // Standard POS/ERP Inactivity Auto-Lock (30 minutes of zero user input)
  useEffect(() => {
    if (!currentUser) return;

    const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
    let timeoutId: NodeJS.Timeout;

    const resetInactivityTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        console.log('[Auth] Inactivity timeout reached (30 min idle). Locking terminal.');
        logout();
      }, INACTIVITY_TIMEOUT_MS);
    };

    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    activityEvents.forEach((evt) => window.addEventListener(evt, resetInactivityTimer, { passive: true }));

    // Start initial timer
    resetInactivityTimer();

    return () => {
      clearTimeout(timeoutId);
      activityEvents.forEach((evt) => window.removeEventListener(evt, resetInactivityTimer));
    };
  }, [currentUser]);

  const login = async (credentials: { username: string; password: string }) => {
    if (!window.electronAPI?.auth?.login) {
      return { success: false, error: 'Electron API unavailable' };
    }
    const res = await window.electronAPI.auth.login(credentials);
    if (res.success && res.data) {
      setCurrentUser(res.data);
      return { success: true };
    }
    return { success: false, error: res.error || 'Invalid credentials' };
  };

  const pinLogin = async (pinCode: string) => {
    if (!window.electronAPI?.auth?.pinLogin) {
      return { success: false, error: 'Electron API unavailable' };
    }
    const res = await window.electronAPI.auth.pinLogin({ pinCode });
    if (res.success && res.data) {
      setCurrentUser(res.data);
      return { success: true };
    }
    return { success: false, error: res.error || 'Invalid PIN' };
  };

  const logout = async () => {
    if (window.electronAPI?.auth?.logout) {
      await window.electronAPI.auth.logout();
    }
    setCurrentUser(null);
  };

  const hasPermission = (permCode: string): boolean => {
    if (!currentUser) return false;
    if (currentUser.roleId === 'ROLE_OWNER') return true; // Owner has wildcard access
    return currentUser.permissions.includes(permCode);
  };

  const hasAnyPermission = (permCodes: string[]): boolean => {
    if (!currentUser) return false;
    if (currentUser.roleId === 'ROLE_OWNER') return true;
    return permCodes.some((code) => currentUser.permissions.includes(code));
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isLoading,
        userList,
        login,
        pinLogin,
        logout,
        hasPermission,
        hasAnyPermission,
        refreshUserList,
        refreshUsers: refreshUserList,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
