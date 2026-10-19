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
  login: (username: string, pass: string) => boolean;
  register: (fullName: string, email: string, username: string, pass: string) => boolean;
  logout: () => void;
}

const AUTH_STORAGE_KEY = "taskflow:auth_user";
const REGISTERED_USERS_KEY = "taskflow:users_db";

interface StoredAccount {
  id: string;
  username: string;
  fullName: string;
  email: string;
  passwordHash: string;
}

const DEFAULT_ACCOUNTS: StoredAccount[] = [
  {
    id: "user-om",
    username: "omthakkar",
    fullName: "Om Thakkar",
    email: "omthakkar@example.com",
    passwordHash: "thakkar2912",
  },
];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(AUTH_STORAGE_KEY);
        if (raw) return JSON.parse(raw);
      } catch {}
    }
    return null;
  });

  const getAccounts = (): StoredAccount[] => {
    if (typeof window === "undefined") return DEFAULT_ACCOUNTS;
    try {
      const raw = localStorage.getItem(REGISTERED_USERS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(DEFAULT_ACCOUNTS));
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
    }
    return true;
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
        login,
        register,
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
