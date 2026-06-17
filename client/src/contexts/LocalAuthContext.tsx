import React, { createContext, useContext, useState, useEffect } from "react";

interface LocalUser {
  username: string;
  timestamp: number;
}

interface LocalAuthContextType {
  user: LocalUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

const LocalAuthContext = createContext<LocalAuthContextType | undefined>(undefined);

export function LocalAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Carregar autenticação local do localStorage
  useEffect(() => {
    const stored = localStorage.getItem("localAuth");
    if (stored) {
      try {
        const parsedUser = JSON.parse(stored);
        setUser(parsedUser);
      } catch (error) {
        console.error("Erro ao carregar autenticação local:", error);
        setUser(null);
      }
    }
    setLoading(false);
  }, []);

  const login = (username: string, password: string): boolean => {
    // Validação simples - apenas para demonstração
    if (username === "admin" && password === "admin") {
      const newUser: LocalUser = {
        username,
        timestamp: Date.now(),
      };
      setUser(newUser);
      localStorage.setItem("localAuth", JSON.stringify(newUser));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("localAuth");
  };

  return (
    <LocalAuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </LocalAuthContext.Provider>
  );
}

export function useLocalAuth() {
  const context = useContext(LocalAuthContext);
  if (context === undefined) {
    throw new Error("useLocalAuth deve ser usado dentro de LocalAuthProvider");
  }
  return context;
}
