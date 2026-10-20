import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  email: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  login: (username: string, pass: string) => boolean;
  register: (fullName: string, email: string, username: string, pass: string) => boolean;
  updateCurrentUser: (updates: { fullName?: string; email?: string }) => void;
  getRegisteredAccounts: () => StoredAccount[];
  logout: () => void;
}

const AUTH_STORAGE_KEY = "taskflow:auth_user";
const REGISTERED_USERS_KEY = "taskflow:users_db";
const LAST_USER_KEY = "taskflow:last_username";

export interface StoredAccount {
  id: string;
  username: string;
  fullName: string;
  email: string;
  passwordHash: string;
}

const DEFAULT_ACCOUNTS: StoredAccount[] = [];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if (raw) {
        setUser(JSON.parse(raw));
      }
    } catch (e) {
      console.error("Failed to parse stored auth user", e);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  const getAccounts = (): StoredAccount[] => {
    if (typeof window === "undefined") return DEFAULT_ACCOUNTS;
    try {
      const raw = localStorage.getItem(REGISTERED_USERS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // Filter out legacy hardcoded default credentials
          const cleaned = parsed.filter(
            (a) => !(a.username === "omthakkar" && a.passwordHash === "thakkar2912")
          );
          if (cleaned.length !== parsed.length) {
            localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(cleaned));
          }
          return cleaned;
        }
      }
    } catch {}
    return DEFAULT_ACCOUNTS;
  };

  const login = (usernameInput: string, passInput: string): boolean => {
    const trimmedUser = usernameInput.trim().toLowerCase();
    const accounts = getAccounts();
    const found = accounts.find(
      (a) => a.username.toLowerCase() === trimmedUser && a.passwordHash === passInput
    );

    if (found) {
      const activeUser: AuthUser = {
        id: found.id,
        username: found.username,
        fullName: found.fullName,
        email: found.email,
      };
      setUser(activeUser);
      if (typeof window !== "undefined") {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(activeUser));
        localStorage.setItem(LAST_USER_KEY, activeUser.username);
      }
      return true;
    }
    return false;
  };

  const register = (fullName: string, email: string, username: string, pass: string): boolean => {
    const accounts = getAccounts();
    const trimmedUser = username.trim().toLowerCase();

    if (accounts.some((a) => a.username.toLowerCase() === trimmedUser)) {
      return false; // username already taken
    }

    const newAccount: StoredAccount = {
      id: `user-${Date.now()}`,
      username: trimmedUser,
      fullName: fullName.trim(),
      email: email.trim(),
      passwordHash: pass,
    };

    const updated = [...accounts, newAccount];
    if (typeof window !== "undefined") {
      localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(updated));
    }

    const activeUser: AuthUser = {
      id: newAccount.id,
      username: newAccount.username,
      fullName: newAccount.fullName,
      email: newAccount.email,
    };
    setUser(activeUser);
    if (typeof window !== "undefined") {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(activeUser));
      localStorage.setItem(LAST_USER_KEY, activeUser.username);
    }
    return true;
  };

  const updateCurrentUser = (updates: { fullName?: string; email?: string }) => {
    if (!user) return;
    const nextFullName = updates.fullName?.trim() || user.fullName;
    const nextEmail = updates.email?.trim() || user.email;

    const updatedUser: AuthUser = {
      ...user,
      fullName: nextFullName,
      email: nextEmail,
    };
    setUser(updatedUser);

    if (typeof window !== "undefined") {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
      const accounts = getAccounts();
      const updatedAccounts = accounts.map((a) =>
        a.id === user.id
          ? {
              ...a,
              fullName: nextFullName,
              email: nextEmail,
            }
          : a
      );
      localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(updatedAccounts));
    }
  };

  const logout = () => {
    setUser(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isInitialized,
        login,
        register,
        updateCurrentUser,
        getRegisteredAccounts: getAccounts,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
