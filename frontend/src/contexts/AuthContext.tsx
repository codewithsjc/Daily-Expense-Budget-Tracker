import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, setAuthToken } from '../services/api';

// Platform-specific storage (AsyncStorage for native, localStorage for web)
const storage = {
  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        return localStorage.getItem(key);
      }
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(key, value);
      } else {
        await AsyncStorage.setItem(key, value);
      }
    } catch (e) {
      console.error('Storage setItem error:', e);
    }
  },
  async removeItem(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(key);
      } else {
        await AsyncStorage.removeItem(key);
      }
    } catch (e) {
      console.error('Storage removeItem error:', e);
    }
  },
};

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
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  // Set up 401 interceptor to auto-logout
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401 && token) {
          console.log('401 received, logging out...');
          await logout();
        }
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(interceptor);
    };
  }, [token]);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await storage.getItem('auth_token');
      const storedUser = await storage.getItem('user_data');
      
      if (storedToken && storedUser) {
        setToken(storedToken);
        setAuthToken(storedToken);
        
        try {
          // Parse stored user first
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          
          // Verify token is still valid with the server
          const response = await api.get('/auth/me');
          setUser(response.data);
          await storage.setItem('user_data', JSON.stringify(response.data));
        } catch (error: any) {
          console.log('Token validation failed:', error.message);
          // Token invalid or server error, clear auth
          await clearAuth();
        }
      }
    } catch (error) {
      console.error('Error loading auth:', error);
      await clearAuth();
    } finally {
      setIsLoading(false);
    }
  };

  const clearAuth = async () => {
    await storage.removeItem('auth_token');
    await storage.removeItem('user_data');
    setToken(null);
    setUser(null);
    setAuthToken(null);
  };

  const login = async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    const { access_token, user: userData } = response.data;
    
    await storage.setItem('auth_token', access_token);
    await storage.setItem('user_data', JSON.stringify(userData));
    
    setToken(access_token);
    setUser(userData);
    setAuthToken(access_token);
  };

  const register = async (email: string, password: string, name: string) => {
    const response = await api.post('/auth/register', { email, password, name });
    const { access_token, user: userData } = response.data;
    
    await storage.setItem('auth_token', access_token);
    await storage.setItem('user_data', JSON.stringify(userData));
    
    setToken(access_token);
    setUser(userData);
    setAuthToken(access_token);
  };

  const logout = async () => {
    await clearAuth();
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      storage.setItem('user_data', JSON.stringify(updatedUser));
    }
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
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
