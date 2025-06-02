import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'wouter';

export type User = {
  id: number;
  username: string;
  role: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  groupId?: number;
  departmentId?: number;
};

interface RegisterData {
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  [key: string]: any; // дополнительные поля
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  register: (data: RegisterData) => Promise<User>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [_, setLocation] = useLocation();

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('Ошибка при парсинге пользователя из localStorage', e);
        localStorage.removeItem('currentUser');
      }
    }
    setIsLoading(false);
  }, []);

  const navigateByRole = (role: string) => {
    switch (role.toLowerCase()) {
      case 'student':
        setLocation('/student');
        break;
      case 'teacher':
        setLocation('/teacher');
        break;
      case 'admin':
        setLocation('/admin');
        break;
      default:
        setLocation('/');
    }
  };

  const login = async (username: string, password1: string): Promise<User> => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password1 }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Неверное имя пользователя или пароль');
      }

      const userData: User = await response.json();
      setUser(userData);
      localStorage.setItem('currentUser', JSON.stringify(userData));

      navigateByRole(userData.role);
      return userData;
    } catch (error) {
      console.error('Ошибка входа:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setUser(null);
    localStorage.removeItem('currentUser');
    setLocation('/login');
  };

  const register = async (data: RegisterData): Promise<User> => {
   
    setIsLoading(true);
   
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Ошибка при регистрации');
      }

      const userData: User = await response.json();
      setUser(userData);
      localStorage.setItem('currentUser', JSON.stringify(userData));

      navigateByRole(userData.role);
      return userData;
    } catch (error) {
      console.error('Ошибка регистрации:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext должен использоваться внутри AuthProvider');
  }
  return context;
};
