import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type User = {
  id: number;
  email: string;
  name: string;
  role: string;
  phone: string | null;
  address: string | null;
};

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (user: User) => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('aspiiro_user');
    const savedToken = localStorage.getItem('aspiiro_token');
    if (savedUser && savedToken) {
      try {
        const payload = JSON.parse(atob(savedToken.split('.')[1]));
        const isExpired = payload.exp && payload.exp * 1000 < Date.now();
        
        if (isExpired) {
          logout();
        } else {
          setUser(JSON.parse(savedUser));
          setToken(savedToken);
        }
      } catch (e) {
        logout();
      }
    }
  }, []);

  const login = (userData: User, userToken: string) => {
    setUser(userData);
    setToken(userToken);
    localStorage.setItem('aspiiro_user', JSON.stringify(userData));
    localStorage.setItem('aspiiro_token', userToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('aspiiro_user');
    localStorage.removeItem('aspiiro_token');
  };

  const updateUser = (userData: User) => {
    setUser(userData);
    localStorage.setItem('aspiiro_user', JSON.stringify(userData));
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      login,
      logout,
      updateUser,
      isAuthenticated: !!token && !!user,
      isAdmin: !!token && user?.role === 'admin'
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
