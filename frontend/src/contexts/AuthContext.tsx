import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { api } from "../services/api";
import { storage } from "../utils/storage";

interface User {
  id: string;
  email: string;
  name: string;
  currency: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearAuth = useCallback(async () => {
    await storage.removeItem("access_token");
    await storage.removeItem("user_data");
    setToken(null);
    setUser(null);
    delete api.defaults.headers.common.Authorization;
  }, []);

  const loadStoredAuth = useCallback(async () => {
    try {
      const storedToken = await storage.getItem("access_token");
      const storedUser = await storage.getItem("user_data");

      if (!storedToken || !storedUser) {
        return;
      }

      api.defaults.headers.common.Authorization = `Bearer ${storedToken}`;
      setToken(storedToken);
      setUser(JSON.parse(storedUser));

      // Validate token with backend
      const response = await api.get("/auth/me");
      setUser(response.data);
      await storage.setItem("user_data", JSON.stringify(response.data));
    } catch {
      await clearAuth();
    } finally {
      setIsLoading(false);
    }
  }, [clearAuth]);

  useEffect(() => {
    loadStoredAuth();
  }, [loadStoredAuth]);

  // Auto logout on 401
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401 && token) {
          await clearAuth();
        }
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(interceptor);
    };
  }, [token, clearAuth]);

  const login = async (email: string, password: string) => {
    const response = await api.post("/auth/login", { email, password });
    const { access_token, user: userData } = response.data;

    await storage.setItem("access_token", access_token);
    await storage.setItem("user_data", JSON.stringify(userData));

    api.defaults.headers.common.Authorization = `Bearer ${access_token}`;
    setToken(access_token);
    setUser(userData);
  };

  const register = async (email: string, password: string, name: string) => {
    const response = await api.post("/auth/register", {
      email,
      password,
      name,
    });

    const { access_token, user: userData } = response.data;

    await storage.setItem("access_token", access_token);
    await storage.setItem("user_data", JSON.stringify(userData));

    api.defaults.headers.common.Authorization = `Bearer ${access_token}`;
    setToken(access_token);
    setUser(userData);
  };

  const logout = async () => {
    await clearAuth();
  };

  const updateUser = async (updates: Partial<User>) => {
    if (!user) return;
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    await storage.setItem("user_data", JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token && !!user,
        login,
        register,
        logout,
        updateUser,
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
